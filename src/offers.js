"use_strict"
/**
 * Account offers
 */

const cosmicLib = require("cosmic-lib")
const loopcall = require("@cosmic-plus/loopcall")
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")
const hiddenKey = require("@cosmic-plus/jsutils/es5/misc").setHiddenProperty
const { day } = require("@cosmic-plus/jsutils/es5/misc")

const Asset = require("./asset")
const Balance = require("./balance")

/**
 * Class
 */

class Offers extends Mirrorable {
  static forPortfolio (portfolio) {
    const offers = Offers.forAccount(portfolio.accountId)
    hiddenKey(offers, "portfolio", portfolio)
    return offers
  }

  static forAccount (accountId) {
    const offers = new Offers()
    hiddenKey(offers, "accountId", accountId)
    hiddenKey(offers, "callBuilder", Offers.callBuilder(accountId))
    return offers
  }

  static callBuilder (accountId) {
    const server = cosmicLib.resolve.server()
    return server.offers("accounts", accountId)
  }

  async stream (delay = 15000) {
    // Resolves after first get().
    return this.get().then(() => setTimeout(() => this.stream(), delay))
  }

  async get () {
    try {
      const records = await loopcall(this.callBuilder, { limit: 200 })
      this.ingest(records)
    } catch (error) {
      console.error(error)
    }
  }

  ingest (records) {
    this.forEach(offer => offer.alive = false)
    const offers = records.map(record => Offer.ingest(record)).filter(x => x)
    this.splice(0, 0, ...offers)
    this.clean()
  }

  clean () {
    for (let index = this.length - 1; index > -1; index--) {
      const offer = this[index]
      if (!offer.alive) {
        this.splice(index, 1)
        offer.destroy()
      }
    }
  }
}

class Offer extends Projectable {
  static resolve (record) {
    return Offer.table[recordToId(record)]
  }

  static ingest (record) {
    const offer = Offer.resolve(record)
    if (offer) offer.update(record)
    else return new Offer(record)
  }

  constructor (record) {
    super()

    this.intern = recordToId(record)
    Offer.table[this.intern] = this

    const quote = Asset.resolve("XLM")
    const asset = record.buying.asset_code ? record.buying : record.selling
    this.balance = Balance.resolve(asset.asset_code, asset.asset_issuer)
    this.asset = this.balance.asset
    this.side = record.buying.asset_code ? "buy" : "sell"

    this.define(
      "price",
      "rawPrice",
      this.side === "sell"
        ? () => quote.price * this.rawPrice
        : () => quote.price / this.rawPrice
    )
    this.watch(quote, "price", () => this.compute("price"))

    this.update(record)

    this.balance.offers.push(this)
    this.asset.offers.push(this)

    this.listen("destroy", () => {
      delete Offer.table[this.intern]
      this.balance.offers.splice(this.balance.offers.indexOf(this), 1)
      this.asset.offers.splice(this.asset.offers.indexOf(this), 1)
    })
  }

  update (record) {
    Object.assign(this, record)
    this.alive = true

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
  return `${record.id}-${record.last_modified_ledger}`
}

/**
 * Export
 */

module.exports = Offers
