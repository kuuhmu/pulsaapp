"use_strict"
/**
 * Account offers
 */

const cosmicLib = require("cosmic-lib")
const loopcall = require("@cosmic-plus/loopcall")
const Mirrorable = require("@cosmic-plus/jsutils/mirrorable")
const nice = require("@cosmic-plus/jsutils/nice")
const Projectable = require("@cosmic-plus/jsutils/projectable")
const { day } = require("@cosmic-plus/jsutils/misc")

const Asset = require("./asset")
const Balance = require("./balance")

/**
 * Class
 */

class Offer extends Projectable {
  static async forPortfolio (portfolio) {
    const offers = new Mirrorable()
    const server = cosmicLib.resolve.server()
    const callBuilder = server.offers("accounts", portfolio.accountId)
    await Offer.update(callBuilder, offers)
    setInterval(() => Offer.update(callBuilder, offers), 5000)
    return offers
  }

  static async update (callBuilder, offers) {
    offers.forEach(offer => offer.opened = false)
    await loopcall(callBuilder).then(records => {
      records.forEach(record => Offer.ingest(record, offers))
    })
    offers.filter(offer => !offer.opened).forEach(offer => offer.destroy())
  }

  static async ingest (record, offers) {
    const offer = Offer.table[recordToId(record)]
    if (offer) offer.update(record)
    else new Offer(record, offers)
  }

  constructor (record, offers) {
    super()

    const quote = Asset.resolve("XLM")
    const asset = record.buying.asset_code ? record.buying : record.selling
    this.balance = Balance.resolve(asset.asset_code, asset.asset_issuer)
    this.asset = this.balance.asset
    this.side = record.buying.asset_code ? "buy" : "sell"
    this.intern = recordToId(record)

    this.define(
      "price",
      "rawPrice",
      this.side === "sell"
        ? () => quote.price * this.rawPrice
        : () => quote.price / this.rawPrice
    )
    quote.trap("price", () => this.compute("price"))

    this.update(record)

    this.balance.offers.push(this)
    this.asset.offers.push(this)
    if (offers) offers.push(this)
    Offer.table[this.intern] = this

    this.listen("destroy", () => {
      this.balance.offers.splice(this.balance.offers.indexOf(this), 1)
      this.asset.offers.splice(this.asset.offers.indexOf(this), 1)
      if (offers) offers.splice(offers.indexOf(this), 1)
      delete Offer.table[this.intern]
    })
  }

  update (record) {
    this.opened = true
    Object.assign(this, record)
    this.rawPrice = record.price
    this.compute("price")
    this.rawAmount = record.amount
    if (this.side === "buy") {
      this.amount = nice(this.rawAmount * this.rawPrice, 7)
    }

    this.date = day(this.last_modified_time)
    this.outdated = this.date !== day()
  }
}

Offer.table = {}

/**
 * Helpers
 */

function recordToId (record) {
  return `${record.id}/${assetToId(record.buying)}/${assetToId(record.selling)}`
}

function assetToId (asset) {
  return asset.asset_issuer
    ? `${asset.asset_code}:${asset.asset_issuer}`
    : "XLM"
}

/**
 * Export
 */

module.exports = Offer
