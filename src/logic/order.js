"use strict"
/**
 * Order class
 */

const cosmicLib = require("cosmic-lib")
const CosmicLink = cosmicLib.CosmicLink
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./global")
const {
  positive,
  negative,
  fixed7,
  clamp,
  absoluteMin,
  arraySum,
  arrayScale
} = require("../helpers/misc")

/**
 * Class
 */

const Order = module.exports = class Order extends Projectable {
  static rebalance (target) {
    if (target.asset.code === "XLM") return

    const order = new Order("balance", target.asset.orderbook, target)
    order.watch(target, "amount", () => order.refresh())
    order.watch(target.asset.orderbook, ["bids", "asks"], () => order.refresh())
    target.asset.offers.listen("change", () => order.refresh(), order)

    return order
  }

  constructor (type, orderbook, ...parameters) {
    super()
    this.type = type
    this.method = Order.type[this.type]
    this.operations = new Mirrorable()
    this.orderbook = orderbook
    this.parameters = parameters

    this.operations.listen("update", () => {
      this.compute(["cosmicLink", "description"])
    })

    this.refresh()
  }

  refresh () {
    this.operations.splice(0, this.operations.length)
    this.operations.trigger("update")
    this.method(this, ...this.parameters)
    this.trigger("refresh")
  }

  /**
   * Operations Management
   */

  getOperation (offer, make) {
    const id = `${offer.balance.anchor.name}:${make ? offer.price : "take"}`
    const operation = this.operations.find(x => x.id === id)
    if (operation) {
      return operation
    } else {
      const newOperation = { id }
      this.operations.push(newOperation)
      return newOperation
    }
  }

  addOperation (offer, amount) {
    const operation = this.getOperation(offer, amount > 0)
    this.setOperation(operation, offer, Number(amount) || operation.amount)
  }

  setOperation (operation, offer, amount) {
    operation.amount = fixed7(amount)
    operation.cost = amount * offer.price
    operation.offer = offer
    this.operations.trigger("update")
  }
}

Order.define("description", "operations", function () {
  return Order.operationsToDescription(this.operations)
})

/**
 * Utilities
 */

Order.operationsToCosmicLink = function (operations = []) {
  // Create CosmicLink.
  const cosmicLink = new CosmicLink({
    network: "public",
    memo: "Equilibre.io",
    maxTime: "+5",
    source: global.portfolio.accountId
  })

  // Set operations.
  operations.forEach(operation => {
    cosmicLink.addOperation("manageOffer", operationToOdesc(operation))
  })

  return cosmicLink
}

Order.operationsToDescription = function (operations = []) {
  const desc = []
  operations.forEach(op => {
    if (operationDirection(op) === "buy") {
      desc.push(`
${__("Buy")} ${nice(op.amount)} ${op.offer.balance.code} ${__("at")} \
${nice(op.offer.price)} ${global.currency}
      `)
    } else {
      desc.push(`
${__("Sell")} ${nice(op.amount)} ${op.offer.balance.code} ${__("at")} \
${nice(op.offer.price)} ${global.currency}
      `)
    }
  })
  return desc
}

/**
 * Helpers
 */

function operationDirection (op) {
  if (
    op.amount > 0 && op.offer.side === "bids"
    || op.amount < 0 && op.offer.side === "asks"
  ) {
    return "buy"
  } else {
    return "sell"
  }
}

function operationToOdesc (operation) {
  const offer = operation.offer
  const base = offer.balance.code + ":" + offer.balance.anchor.pubkey
  const quote = "XLM"

  let odesc
  if (operationDirection(operation) === "buy") {
    odesc = {
      buying: base,
      selling: quote,
      amount: fixed7(operation.amount * offer.price_r.n / offer.price_r.d),
      price: { n: offer.price_r.d, d: offer.price_r.n }
    }
  } else {
    odesc = {
      buying: quote,
      selling: base,
      amount: operation.amount,
      price: offer.price_r
    }
  }
  odesc.offerId = operation.offer.id

  return odesc
}

/**
 * Orders types
 */

Order.type = {}

Order.type.market = function (order, size) {
  if (!size) return

  const side = size > 0 ? "asks" : "bids"
  const amount = Math.abs(size)
  const offer = order.orderbook.findOffer(side, offer => {
    return offer.baseVolume > amount
  })
  order.addOperation(offer, amount)
}

Order.type.limit = function (order, size, { orderbook, filter }) {
  if (!size) return

  const side = size > 0 ? "bids" : "asks"
  const offer = (orderbook || order.orderbook).findOffer(side, filter)
  if (offer) order.addOperation(tightenSpread(offer), Math.abs(size))
}

/**
 * Rebalancing
 */

Order.type.balance = function (order, target) {
  const asset = target.asset
  const orderbook = asset.orderbook

  // Requirements

  if (target.amount == null || target.amountDelta === 0) return

  if (!orderbook.isFetched()) {
    order.description = [__("Fetching orderbook...")]
    return
  }

  if (asset.liabilities) {
    const currentOffers = asset.offers.filter(offer => !offer.outdated)
    if (currentOffers.length) {
      order.description = [__("Rebalancing...")]
      return
    }
  }

  // Rebalancing

  setBalancesTargets(target)
  if (!areTargetAnchorsBalanced(target)) {
    balanceTargetAnchors(target, target.amountDiff)
  } else if (isOneOperationEnough(target, target.amountDiff)) {
    addOneOperation(target, target.amountDiff)
  } else {
    addMultipleOperations(target, target.amountDiff)
  }
}

/**
 * Set the `targetAmount` property of **target** balances according to
 * `target.amount`.
 */
function setBalancesTargets (target) {
  // Empty orderbooks cannot be traded.
  const balances = []
  target.asset.balances.forEach(balance => {
    if (balance.orderbook.price == null || !balance.isActive) {
      balance.targetAmount = null
    } else {
      balances.push(balance)
    }
  })

  // Special cases.
  if (!balances.length) {
    return
  } else if (balances.length === 1) {
    return balances[0].targetAmount = target.amount
  }

  // Set each balance tradable amount.
  const targetAmount = fixed7(target.amount / balances.length)
  balances.forEach(balance => balance.targetAmount = targetAmount)
}

/**
 * Returns whether or not **target** asset anchors current funds are risk
 * balanced.
 */
function areTargetAnchorsBalanced (target) {
  const balances = target.asset.balances
  return !(arraySum(balances, "underMin") && arraySum(balances, "overMax"))
}

/**
 * Create a set of operations that even out anchor amounts of `target.asset`.
 */
function balanceTargetAnchors (
  target,
  size = target.amountDiff,
  riskMax = global.anchorsRebalanceRiskMax
) {
  const balances = target.asset.balances

  // Compute the amount to transfer between anchors.
  const under = -arraySum(balances, "underMin")
  const over = arraySum(balances, "overMax")
  const misallocated = Math.max(under - positive(size), over + negative(size))

  // Eventually limit risk by capping that amount.
  const currentRisk = Math.abs(target.valueDiffP)
  const amountCap = target.amount * positive(riskMax - currentRisk)
  const transferAmount = Math.min(misallocated, amountCap)

  // Factor in the amount of asset to buy/sell to balance portfolio.
  const buy = fixed7(transferAmount + positive(size))
  const sell = fixed7(transferAmount - negative(size))

  // Generate operations accordingly.
  addMultipleOperations(target, buy)
  addMultipleOperations(target, -sell)
}

/**
 * Returns whether or not it is possible meet **target** rebalancing target in
 * one operation.
 */
function isOneOperationEnough (target, size) {
  const balances = target.asset.balances
  return !!balances.filter(b => b.sizeMin <= size && size <= b.sizeMax).length
}

/**
 * Adds an operation to `target.order` that trades **size** `target.asset` on
 * **orderbook**.
 */
function addOneOperation (target, size, orderbook = target.asset.orderbook) {
  const noMinValue = target.mode === "quantity" || target.amount === 0
  const baseAsk = orderbook.asks[0].basePrice
  if (!noMinValue && Math.abs(size * baseAsk) < global.minOfferValue) return

  const filter = makeOfferFilter(target, size)
  Order.type.limit(target.order, size, { orderbook, filter })
}

/**
 * Split a trade over multiple anchors.
 */
function addMultipleOperations (target, size) {
  const balances = target.asset.balances
  let tradeSize = 0,
    trade = balances.map(() => 0)

  // 1. Sell balances being closed.
  if (negative(size)) {
    const liquidate = balances.map(balance => {
      return balance.action === "closing" ? -balance.amount : 0
    })
    tradeSize = _addToTrade(trade, liquidate, size)
  }

  // 2. If this was not enough, trade imbalanced anchors.
  const misallocatedKey = positive(size) ? "underMin" : "overMax"
  if (tradeSize !== size) {
    const misallocated = balances.map(balance => {
      return balance.action === "closing" ? 0 : -balance[misallocatedKey]
    })
    tradeSize = _addToTrade(trade, misallocated, size - tradeSize)
  }

  // 3. If this was not enough, trade balanced anchors.
  if (tradeSize !== size) {
    const sizeKey = positive(size) ? "sizeMax" : "sizeMin"
    const tradable = balances.map(balance => {
      if (balance.action === "closing") return 0
      else return balance[sizeKey] - balance[misallocatedKey]
    })
    _addToTrade(trade, tradable, size - tradeSize)
  }

  // Create operations according to **trade**.
  balances.forEach((balance, index) => {
    const size = fixed7(trade[index])
    addOneOperation(target, size, balance.orderbook)
  })
}

/**
 * Adds **amounts** to **trade**, which is an array of trade sizes. Caps summed
 * **trade** sizes to **sizeMax**. Returns the summed **trade** size.
 */
function _addToTrade (trade, amounts, sizeMax) {
  const amountsSum = arraySum(amounts)
  const tradeSize = absoluteMin(sizeMax, amountsSum)
  const toBeAdded = arrayScale(amounts, tradeSize)
  toBeAdded.forEach((value, index) => trade[index] += value)
  return +nice(arraySum(trade), 7)
}

/**
 * Returns a balancing offer filter for **tradedAmount** to be used with
 * `Orderbook.findOffer()`.
 */
function makeOfferFilter (target, size) {
  return offer => {
    return (
      size >= offer.balance.sizeMin
      && size <= offer.balance.sizeMax
      && offer.baseVolume > Math.abs(size) * global.skipMarginalOffers
    )
  }
}

/**
 * Create a copy of **offer** with a delta to global market price reduced by
 * **percentage**.
 */
function tightenSpread (offer, percentage = global.spreadTightening) {
  const clone = Object.assign({}, offer)
  const diff = percentage * offer.balance.asset.orderbook["spread%"] / 100

  if (offer.side === "bids") clone.price = offer.price * (1 + diff)
  else clone.price = offer.price * (1 - diff)

  if (offer.balance.asset.globalPrice) clampOfferPrice(clone)
  updateOfferPriceR(clone)

  return clone
}

/**
 * Floor/ceil **offer**'s price between global market price and a **premium**.
 * **premium** soft cap is given in argument; hard cap is the average anchor
 * price.
 */
function clampOfferPrice (offer, premium = global.maxSpread / 2) {
  const globalPrice = offer.balance.asset.price
  const anchorPrice = offer.balance.orderbook.price

  if (offer.side === "bids") {
    const minPrice = Math.min(anchorPrice, globalPrice * (1 - premium))
    offer.price = clamp(offer.price, minPrice, globalPrice)
  } else {
    const maxPrice = Math.max(anchorPrice, globalPrice * (1 + premium))
    offer.price = clamp(offer.price, globalPrice, maxPrice)
  }
}

/**
 * Set `offer.price_r` according to `offer.price`.
 *
 * @param  {Object} offer
 */
function updateOfferPriceR (offer) {
  const quote = offer.balance.orderbook.quote

  offer.price_r = {
    n: nice(offer.price * 10000000000, 0),
    d: nice(quote.price * 10000000000, 0)
  }

  // Ten characters maximum
  while (offer.price_r.n > 999999999 || offer.price_r.d > 999999999) {
    offer.price_r.n = nice(offer.price_r.n / 10, 0)
    offer.price_r.d = nice(offer.price_r.d / 10, 0)
  }
}

/**
 * Append Order.type to Order class
 */

for (let key in Order.type) {
  if (!Order[key]) Order[key] = (...parameters) => new Order(key, ...parameters)
}
