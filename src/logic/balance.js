"use_strict"
/**
 * Balance entry
 */
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Anchor = require("./anchor")
const Asset = require("./asset")
const Orderbook = require("./orderbook")

const Balance = module.exports = class Balance extends Projectable {
  static resolve (code, issuer) {
    const id = code ? `${code}:${issuer}` : "XLM"
    return Balance.table[id]
  }

  static ingest (entry) {
    const id = entryId(entry)
    const balance = Balance.table[id]
    if (!balance) return new Balance(entry, id)

    balance.amount = +entry.balance
    balance.buying = +entry.buying_liabilities
    balance.selling = +entry.selling_liabilities
    return balance
  }

  constructor (entry) {
    super()

    this.id = entryId(entry)
    this.code = entry.asset_code || "XLM"
    this.anchor = Anchor.resolve(entry.asset_issuer || "stellar.org")
    Balance.table[this.id] = this

    if (this.id === "XLM" || this.id in Anchor.known) {
      this.asset = Asset.resolve(Anchor.known[this.id] || this.code)
      this.known = true
    } else {
      this.asset = Asset.resolve(this.id)
      this.known = false
    }
    this.amount = +entry.balance
    this.buying = +entry.buying_liabilities
    this.offers = new Mirrorable()
    this.selling = +entry.selling_liabilities

    this.asset.balances.push(this)

    if (this.code === "XLM") {
      this.asset.project("price", this)
    } else {
      this.orderbook = Orderbook.forBalance(this, Asset.resolve("XLM"))
      this.orderbook.project("price", this)
    }
  }
}

Balance.table = {}
Balance.define("value", ["amount", "price"], function () {
  return this.amount === 0 ? 0 : this.amount * this.price
})

/**
 * Helpers
 */

function entryId (entry) {
  return entry.asset_code ? `${entry.asset_code}:${entry.asset_issuer}` : "XLM"
}
