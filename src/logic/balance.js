"use strict"
/**
 * Balance
 */
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Anchor = require("./anchor")
const Asset = require("./asset")
const Orderbook = require("./orderbook")

const global = require("./global")
const { fixed7, positive, negative, arrayRemove } = require("../helpers/misc")

/**
 * Definition
 */
class Balance extends Projectable {
  static resolve (code, issuer) {
    const id = Balance.makeId(code, issuer)
    return Balance.table[id] || new Balance({ code, issuer })
  }

  static ingest (record) {
    const params = Balance.recordToParams(record)
    const balance = Balance.resolve(params.code, params.issuer)
    balance.update(params)
    balance.hasTrustline = true
    return balance
  }

  constructor (params) {
    const { code, issuer } = params

    super()

    // Identification
    this.code = code
    this.anchor = Anchor.resolve(issuer || "stellar.org")
    this.id = Balance.makeId(code, issuer)
    Balance.table[this.id] = this

    // Link with an asset object.
    if (this.code in this.anchor.assets) {
      this.asset = this.anchor.assets[this.code]
      this.known = true
    } else {
      this.asset = Asset.resolve(this.id)
      this.known = false
    }
    this.asset.balances.push(this)

    // Set updatable properties.
    this.update(params)
    this.offers = new Mirrorable()

    // Dynamic price definition.
    if (this.code === "XLM") {
      this.asset.project("price", this)
    } else {
      this.orderbook = Orderbook.forBalance(this, Asset.resolve("XLM"))
      this.orderbook.project("price", this)
    }
  }

  update (params) {
    const { amount, buying, selling } = params
    this.amount = amount || 0
    this.buying = buying || 0
    this.selling = selling || 0
  }
}

Balance.table = {}

Balance.trap("hasTrustline", () => {
  if (this.hasTrustline) {
    arrayRemove(this.asset.target.opening, this.anchor.pubkey)
  }
})

Balance.define("isActive", ["action", "hasTrustline"], function () {
  if (this.hasTrustline) return this.action !== "closing"
  else return this.action === "opening"
})

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

Balance.makeId = function (code, issuer) {
  if (issuer) return `${code}:${issuer}`
  else if (code === "XLM") return "XLM"
  else throw new Error(`Missing issuer for ${code}.`)
}

/**
 * API-Specific Format: Record
 **/

Balance.fromRecord = function (record) {
  const params = Balance.recordToParams(record)
  return new Balance(params)
}

Balance.recordToParams = function (record) {
  const params = Object.create(record)
  params.code = record.asset_type === "native" ? "XLM" : record.asset_code
  params.issuer = record.asset_issuer
  params.amount = +record.balance
  params.buying = +record.buying_liabilities
  params.selling = +record.selling_liabilities
  return params
}

/**
 * Export
 */
module.exports = Balance
