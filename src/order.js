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

function floorPrice (offer, price) {
  const refPrice = offer.balance.asset.price
  const side = offer.side
  if (side === "bids") return minMax(price, refPrice * 0.975, refPrice)
  else return minMax(price, refPrice, refPrice * 1.025)
}

function minMax (value, min, max) {
  return nice(Math.min(Math.max(value, min), max), 7)
}

/**
 * Create a copy of **offer** with a delta to global price reduced by
 * **percentage**.
 */
function tightenSpread (offer, percentage = 1) {
  const quote = offer.balance.orderbook.quote
  const clone = Object.assign({}, offer)
  const diff = (offer.balance.asset.price - offer.price) / 100 * percentage
  clone.price = floorPrice(offer, nice(offer.price + diff, { significant: 9 }))
  clone.price_r = {
    n: nice(clone.price * 1000000000, 0),
    d: nice(quote.price * 1000000000, 0)
  }
  // Ten characters maximum
  while (clone.price_r.n > 999999999 || clone.price_r.d > 999999999) {
    clone.price_r.n = nice(clone.price_r.n / 10, 0)
    clone.price_r.d = nice(clone.price_r.d / 10, 0)
  }
  return clone
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
