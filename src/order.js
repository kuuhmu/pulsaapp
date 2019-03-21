"use_strict"
/**
 * Order class
 */

const cosmicLib = require("cosmic-lib")
const CosmicLink = cosmicLib.CosmicLink
const Mirrorable = require("@cosmic-plus/jsutils/mirrorable")
const nice = require("@cosmic-plus/jsutils/nice")
const Projectable = require("@cosmic-plus/jsutils/projectable")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./global")

const Order = module.exports = class Order extends Projectable {
  static rebalance (share) {
    if (share.asset.code === "XLM") return

    const order = new Order(
      global.rebalancingStrategy,
      share.asset.orderbook,
      share
    )
    share.trap(["value", "target"], () => order.refresh())
    share.asset.trap("liabilities", () => order.refresh())
    return order
  }

  constructor (method, orderbook, ...parameters) {
    super()
    this.algorithm = algorithm[method]
    this.operations = new Mirrorable()
    this.orderbook = orderbook
    this.parameters = parameters

    this.orderbook.listen("update", () => this.refresh())
    this.operations.listen("update", () =>
      this.compute(["cosmicLink", "description"])
    )

    this.refresh()
  }

  refresh () {
    this.operations.splice(0, this.operations.length)
    this.operations.trigger("update")
    this.type = ""
    this.compute("offers")
    this.algorithm(this, ...this.parameters)
    this.trigger("refresh")
  }

  /**
   * Operations Management
   */

  getOperation (offer, make) {
    const id = `${offer.balance.anchor.id}:${make ? offer.price : "take"}`
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
    operation.amount = amount
    operation.cost = amount * offer.price
    operation.offer = offer
    this.operations.trigger("update")
  }
}

Order.define("cosmicLink", "operations", function () {
  return Order.operationsToCosmicLink(this.operations)
})
Order.define("description", "operations", function () {
  return Order.operationsToDescription(this.operations)
})

/**
 * Utilities
 */

Order.operationsToCosmicLink = function (operations = []) {
  const cosmicLink = new CosmicLink({
    memo: "Equilibre.io",
    source: global.portfolio.accountId
  })
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
  const base = offer.balance.code + ":" + offer.balance.anchor.address
  const quote = "XLM"

  let odesc
  if (operationDirection(operation) === "buy") {
    odesc = {
      buying: base,
      selling: quote,
      amount: operation.amount * offer.price_r.n / offer.price_r.d,
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
  odesc.amount = Math.abs(odesc.amount).toFixed(7)
  odesc.offerId = operation.offer.id

  return odesc
}

/**
 * Create a copy of **offer** with a delta to global market price reduced by
 * **percentage**.
 */
function tightenSpread (offer, percentage = 0.01) {
  const clone = Object.assign({}, offer)
  const diff = percentage * offer.balance.asset.orderbook["spread%"] / 100

  if (offer.side === "bids") clone.price = offer.price * (1 + diff)
  else clone.price = offer.price * (1 - diff)

  if (offer.balance.asset.globalPrice) clampOfferPrice(clone)
  updateOfferPriceR(clone)

  return clone
}

/**
 * Floor/ceil **offer**'s price to maintain a maximum spread of **spread**
 * from its price.
 *
 * @param {Object} offer offer to price-cap
 * @param {Number} [spread=0.025] Maximum spread from asset price (in percent)
 */
function clampOfferPrice (offer, spread = 0.025) {
  const refPrice = offer.balance.asset.price
  if (offer.side === "bids") {
    offer.price = clamp(offer.price, refPrice * (1 - spread), refPrice)
  } else {
    offer.price = clamp(offer.price, refPrice, refPrice * (1 + spread))
  }
}

/**
 * Returns a number whose value is limited to the given range.
 *
 * @param  {Number} value An arbitrary number
 * @param  {Number} min Lower boundary
 * @param  {[type]} max Upper boundary
 * @return {Number}
 */
function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
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
 * Orders types
 */

const algorithm = {}

algorithm.balance = function (order, share) {
  const asset = share.asset
  const orderbook = asset.orderbook

  if (asset.liabilities) {
    const currentOffers = asset.offers.filter(offer => !offer.outdated)
    if (currentOffers.length) {
      order.description = [__("Rebalancing...")]
      return
    }
  }

  if (!orderbook.bestBid || !orderbook.bestAsk || share.target == null) return

  if (share.mode === "amount" || share.target === 0) {
    algorithm.limit(order, share.size - asset.amount)
    return
  } else if (share.delta > 0) {
    rebalanceSide("asks", order, share)
  } else if (share.delta < 0) {
    rebalanceSide("bids", order, share)
  }
}

function rebalanceSide (side, order, share) {
  const orderbook = share.asset.orderbook
  const direction = side === "asks" ? "selling" : "buying"
  const targetAmount = nice(Math.abs(share.delta) / share.asset.price, 7)

  const offer = orderbook.findOffer(side, offer => {
    return (
      offer.volume > targetAmount / 10
      && (side === "bids" || offer.balance.amount > targetAmount)
    )
  })

  if (offer) {
    const prev = share.asset.offers.find(offer => offer[direction].asset_code)
    offer.id = prev && prev.id
    if (targetAmount * offer.basePrice > 1) {
      order.addOperation(tightenSpread(offer), targetAmount)
    }
  }
}

algorithm.limit = function (order, size) {
  if (!size) return

  const side = size > 0 ? "bids" : "asks"
  const offer = order.orderbook.findOffer(side)
  order.addOperation(tightenSpread(offer), Math.abs(size))
}

// Outdated code
//
// algorithm.market = function (order, size = order.asset.size) {
//   order.type = "taker"
//   if (!order.offers) return
//   const orderbook = order.orderbook
//   const offer = orderbook.findOffer(this.side, offer => offer.cumul > size)
//   order.addOperation(offer, size)
// }

// algorithm.deepLimit = function (order, size = order.asset.size) {
//   order.type = "maker"
//   if (!order.offers) return
//   const orderbook = order.orderbook
//   const offer = orderbook.findOffer(this.side, offer => offer.cumul > size)
//   order.addOperation(offer, size)
// }

/**
 * Append algorithms to Order class
 */

for (let key in algorithm) {
  if (!Order[key]) Order[key] = (...parameters) => new Order(key, ...parameters)
}
