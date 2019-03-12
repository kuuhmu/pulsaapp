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
  const diff = (offer.balance.asset.price - offer.price) * percentage

  if (offer.side === "bids") {
    clone.price = Math.min(offer.price * (1 + percentage), offer.price + diff)
  } else {
    clone.price = Math.max(offer.price * (1 - percentage), offer.price + diff)
  }

  clampOfferPrice(clone)
  updateOfferPriceR(clone)
  return clone
}

/**
 * Floor/ceil **offer**'s price to maintain a maximum spread of **spread**
 * against global market price. Offers for which the global market price is
 * unknown are left unchanged.
 *
 * @param {Object} offer offer to price-cap
 * @param {Number} [spread=0.025] Maximum spread against global market price (in
 *     percent)
 */
function clampOfferPrice (offer, spread = 0.025) {
  const refPrice = offer.balance.asset.globalPrice
  if (refPrice) {
    if (offer.side === "bids") {
      offer.price = clamp(offer.price, refPrice * (1 - spread), refPrice)
    } else {
      offer.price = clamp(offer.price, refPrice, refPrice * (1 + spread))
    }
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
  const offers = asset.offers

  if (asset.liabilities) {
    const currentOffers = offers.filter(offer => !offer.outdated)
    if (currentOffers.length) {
      order.description = [__("Rebalancing...")]
      return
    }
  }

  if (!orderbook.bids || !orderbook.asks || !share.target) return
  if (!orderbook.bids.length || !orderbook.asks.length) return

  const tmp1 = orderbook.findOffer("asks", offer => {
    const ask = tightenSpread(offer)
    const sellAmount = (ask.price * asset.amount - share.target) / ask.price
    return ask.balance.amount > sellAmount && offer.amount > sellAmount * 0.01
  })

  if (tmp1) {
    const ask = tightenSpread(tmp1)
    const sellAmount = (ask.price * asset.amount - share.target) / ask.price
    const replace = offers.find(offer => offer.selling.asset_code)
    ask.id = replace && replace.id
    if (sellAmount * ask.basePrice > 1) order.addOperation(ask, sellAmount)
  }

  const tmp2 = orderbook.findOffer("bids")
  const bid = tightenSpread(tmp2)
  if (bid.price * asset.amount < share.target) {
    // TODO: don't let buyAmount exceed its share of XLM
    const buyAmount = (share.target - bid.price * asset.amount) / bid.price
    const replace = offers.find(offer => offer.buying.asset_code)
    bid.id = replace && replace.id
    if (buyAmount * bid.basePrice > 1) order.addOperation(bid, buyAmount)
  }
}

algorithm.limit = function (order, size = order.asset.size) {
  order.type = "maker"
  if (!order.offers) return

  const offer = order.orderbook.findOffer(this.side)
  order.addOperation(offer, size)
}

algorithm.market = function (order, size = order.asset.size) {
  order.type = "taker"
  if (!order.offers) return
  const orderbook = order.orderbook
  const offer = orderbook.findOffer(this.side, offer => offer.cumul > size)
  order.addOperation(offer, size)
}

algorithm.deepLimit = function (order, size = order.asset.size) {
  order.type = "maker"
  if (!order.offers) return
  const orderbook = order.orderbook
  const offer = orderbook.findOffer(this.side, offer => offer.cumul > size)
  order.addOperation(offer, size)
}

/**
 * Append algorithms to Order class
 */

for (let key in algorithm) {
  if (!Order[key]) Order[key] = (...parameters) => new Order(key, ...parameters)
}
