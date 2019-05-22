"use_strict"
/**
 * Balance
 */
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Anchor = require("./anchor")
const Asset = require("./asset")
const Orderbook = require("./orderbook")

const global = require("./global")
const { fixed7, positive, negative } = require("../helpers/misc")

/**
 * Definition
 */
class Balance extends Projectable {
  static resolve (code, issuer) {
    const id = code ? `${code}:${issuer}` : "XLM"
    return Balance.table[id]
  }

  static ingest (record) {
    const id = Balance.recordToId(record)
    const balance = Balance.table[id]
    if (!balance) return new Balance(record)

    balance.amount = +record.balance
    balance.buying = +record.buying_liabilities
    balance.selling = +record.selling_liabilities
    return balance
  }

  constructor (record) {
    super()

    this.id = Balance.recordToId(record)
    Balance.table[this.id] = this

    this.code = record.asset_code || "XLM"
    this.anchor = Anchor.resolve(record.asset_issuer || "stellar.org")

    if (this.id === "XLM" || this.id in Anchor.known) {
      this.asset = Asset.resolve(Anchor.known[this.id] || this.code)
      this.known = true
    } else {
      this.asset = Asset.resolve(this.id)
      this.known = false
    }
    this.amount = +record.balance
    this.buying = +record.buying_liabilities
    this.selling = +record.selling_liabilities
    this.offers = new Mirrorable()

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

// targetAmount is set by "./order.js"
Balance.define("targetMin", ["targetAmount"], function () {
  return fixed7(this.targetAmount * (1 - global.balanceTargetDeviation))
})
Balance.define("targetMax", ["targetAmount"], function () {
  return fixed7(this.targetAmount * (1 + global.balanceTargetDeviation))
})
Balance.define("targetMinDiff", ["amount", "targetMin"], function () {
  return fixed7(this.targetMin - this.amount)
})
Balance.define("targetMaxDiff", ["amount", "targetMax"], function () {
  return fixed7(this.targetMax - this.amount)
})
Balance.define("sizeMin", ["targetMinDiff"], function () {
  return negative(this.targetMinDiff)
})
Balance.define("sizeMax", ["targetMaxDiff"], function () {
  return positive(this.targetMaxDiff)
})
Balance.define("underMin", ["targetMinDiff"], function () {
  return negative(-this.targetMinDiff)
})
Balance.define("overMax", ["targetMaxDiff"], function () {
  return positive(-this.targetMaxDiff)
})

/**
 * Utilities
 */

Balance.recordToId = function (record) {
  return record.asset_code
    ? `${record.asset_code}:${record.asset_issuer}`
    : "XLM"
}

/**
 * Export
 */
module.exports = Balance
