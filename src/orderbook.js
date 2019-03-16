"use_strict"
/**
 * Orderbook class
 */

const cosmicLib = require("cosmic-lib")
const nice = require("@cosmic-plus/jsutils/nice")
const Projectable = require("@cosmic-plus/jsutils/projectable")
const StellarSdk = require("@cosmic-plus/base/stellar-sdk")
const { __ } = require("@cosmic-plus/i18n")

const Orderbook = module.exports = class Orderbook extends Projectable {
  static forBalance (balance, quote) {
    if (balance.asset === quote) return
    const orderbook = new Orderbook(balance.asset, quote)
    balance.orderbook = orderbook
    balance.asset.addOrderbook(orderbook)
    orderbook.balance = balance

    const baseAsset = new StellarSdk.Asset(balance.code, balance.anchor.address)
    const quoteAsset = StellarSdk.Asset.native()

    const server = cosmicLib.resolve.server()
    const callBuilder = server.orderbook(baseAsset, quoteAsset)
    const streamOptions = { onmessage: offers => orderbook.ingest(offers) }
    this.close = callBuilder.stream(streamOptions)

    return orderbook
  }

  static forAsset (asset) {
    return new Orderbook(asset)
  }

  constructor (base, quote) {
    super()

    this.base = base
    this.quote = quote

    if (quote) {
      this.type = "native"
      this.name = `${base.code}/${quote.code}`
      this.quote.trap("price", () => this.updateOffersPrices())
    } else {
      this.type = "agregated"
      this.name = `${base.code} (${__("Agregated")})`
      this.childs = []
    }
  }

  ingest (offers) {
    if (!areOffersEquals(this.bids, offers.bids)) {
      this.bids = normalizeOffers(offers.bids, this.quote, this.balance, "bids")
    }
    if (!areOffersEquals(this.asks, offers.asks)) {
      this.asks = normalizeOffers(offers.asks, this.quote, this.balance, "asks")
    }
  }

  updateOffersPrices () {
    if (this.bids) {
      this.set("bids", updateOffersPrices(this.bids, this.quote))
    }
    if (this.asks) {
      this.set("asks", updateOffersPrices(this.asks, this.quote))
    }
  }

  mergeOffers (type) {
    if (this.childs.length < 2) {
      this.set(type, this.childs[0] && this.childs[0][type])
      return
    }

    /// Merge order books
    const merged = this.childs.reduce((arr, x) => {
      return x[type] ? arr.concat(x[type]) : arr
    }, [])
    if (!merged.length) {
      this[type] = null
      return
    }

    const sortOffers =
      type === "bids"
        ? (a, b) => b.price - a.price
        : (a, b) => a.price - b.price

    /// Update cumulative properties
    let cumul = 0,
      volume = 0
    this.set(
      type,
      merged.sort(sortOffers).map(row => {
        const mergedRow = Object.assign({}, row)
        mergedRow.cumul = cumul += +row.amount
        mergedRow.volume = volume += +row.amount * row.price
        return mergedRow
      })
    )
  }

  addChild (orderbook) {
    this.childs.push(orderbook)
    orderbook.trap("bids", () => this.mergeOffers("bids"))
    orderbook.trap("asks", () => this.mergeOffers("asks"))
  }
}

Orderbook.define("bestBid", "bids", function () {
  return this.bids && this.bids[0] && this.bids[0].price
})
Orderbook.define("bestAsk", "asks", function () {
  return this.asks && this.asks[0] && this.asks[0].price
})
Orderbook.define("price", ["bestBid", "bestAsk"], function () {
  if (this.base.globalPrice) return (this.bestBid + this.bestAsk) / 2
  else return this.marketPrice()
})
Orderbook.define("spread", ["bestBid", "bestAsk"], function () {
  return this.bestAsk - this.bestBid
})
Orderbook.define("spread%", ["spread", "bestAsk"], function () {
  return 100 * this.spread / this.bestAsk
})

/**
 * Utilities
 */

/**
 * Look for the best first offer in **orderbook** **side** that match **filter**
 * (if provided) among child orderbooks.
 *
 * @param  {Orderbook} orderbook [description]
 * @param  {String}    side      `bids` or `asks`
 * @param  {Function}  [filter]  A filter that is passed by the returned offer
 * @return {Object}    An orderbook offer
 */
Orderbook.prototype.findOffer = function (side, filter) {
  const offers = this[side]
  const childsNum = this.childs ? this.childs.length : 1
  const anchors = {}

  let last
  for (let index in offers) {
    const offer = offers[index]
    if (filter && !filter(offer)) continue
    const anchor = offer.balance.anchor.address
    if (!anchors[anchor]) {
      anchors[anchor] = true
      last = offer
    }
    if (Object.keys(anchors).length === childsNum) break
  }
  return last
}

Orderbook.prototype.findAsk = function (filter) {
  return this.findOffer("asks", filter)
}
Orderbook.prototype.findBid = function (filter) {
  return this.findOffer("bids", filter)
}

/**
 * Returns the price of asset at **depth** of orderbook's **side**. If **depth**
 * is not provided, return the price of asset at a depth of 10% of the user
 * holdings.
 *
 * @param  {String} [side="bids"] Either "bids" or "asks"
 * @param  {Number} [depth] The depth to look at, in term of `global.currency`
 * @return {Number} Offer price at requested depth
 */
Orderbook.prototype.marketPrice = function (side = "bids", depth) {
  const offer = this.findOffer(side, offer => {
    if (depth) return offer.volume > depth
    else return offer.volume > this.base.amount * offer.price / 10
  })
  return offer ? offer.price : 0
}

/**
 * Helpers
 */

function areOffersEquals (array1, array2) {
  if (!array1) return false
  if (array1.length !== array2.length) return false
  for (let index in array1.length) {
    if (array1[index].amount !== array2[index].amount) return false
    if (array1[index].price !== array2[index].price) return false
  }
  return true
}

function normalizeOffers (offers, quote, balance, side) {
  offers.forEach(row => {
    row.volume = undefined
    row.cumul = undefined
    row.baseAmount = +row.amount
    row.basePrice = +row.price
    row.balance = balance
    row.side = side
  })
  return updateOffersPrices(offers, quote)
}

function updateOffersPrices (offers, quote) {
  let cumul = 0,
    volume = 0
  offers.forEach(row => {
    if (row.side === "asks") row.amount = row.baseAmount
    else row.amount = +nice(row.baseAmount / row.basePrice, 7)
    row.cumul = cumul += +row.amount
    row.price = +nice(row.basePrice * quote.price, 7)
    row.volume = volume += +nice(row.amount * row.price, 7)
  })
  return offers
}
