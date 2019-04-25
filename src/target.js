"use_strict"
/**
 * Target class.
 *
 * A (portfolio) Target object represents a statically or dynamically allocated
 * target slice of the user portfolio. It is a theoric goal that the rebalancing
 * process aims to reach as much as possible.
 *
 * A Target may be composed by several Target subentries, in such a way that the
 * complete portfolio balancing target ends up being a tree made of Targets.
 */
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Asset = require("./asset")
const Order = require("./order")
const strategy = require("./strategy")

/**
 * Definition
 */

class Target extends Projectable {
  constructor (asset) {
    super()

    if (asset) {
      this.asset = asset
      this.mode = "amount"
      this.size = asset.amount
      this.order = Order.rebalance(this)
      asset.targets.push(this)
      this.watch(asset, "value", () => this.compute("valueDiff"))
    } else {
      this.childs = new Mirrorable()
      this.childs.listen("add", child => {
        child.parent = this
        this.compute()
      })
    }

    // Normalize & compute
    this.trap("size", () => {
      if (this.size) {
        this.size = Math.max(0, this.size)
        if (this.mode === "percentage") this.size = Math.min(100, this.size)
      }
      this.compute()
    })
  }

  get root () {
    if (this.parent) return this.parent.root
    else return this
  }
}

Target.define("valueDiff", ["value", "asset"], function () {
  return this.asset.value - this.value
})
Target.define("valueDiffP", "valueDiff", function () {
  return this.value ? this.valueDiff / this.value : null
})
Target.define("amount", ["value"], function () {
  return +nice(this.value / this.asset.price, 7)
})
Target.define("amountDiff", ["amount"], function () {
  return +nice(this.amount - this.asset.amount, 7)
})
Target.define("amountDelta", ["amountDiff"], function () {
  return Math.abs(this.amountDiff)
})

/**
 * Actions
 */

Target.prototype.compute = function () {
  if (this.parent) {
    this.root.compute()
  } else if (this.portfolio && this.portfolio.total) {
    this.errors.splice(0, this.errors.length)
    this.modified = this.hasChanged()
    strategy.apply(this, this.portfolio.total)
  }
}

/**
 * Source: Portfolio
 */

Target.forPortfolio = function (portfolio, json) {
  const target = json ? Target.fromJson(json) : new Target()
  target.portfolio = portfolio
  target.errors = new Mirrorable()
  target.goal = 100

  portfolio.target = target
  target.watch(portfolio, "total", () => target.compute(portfolio.total))

  // Add/Remove assets after trustline change.
  portfolio.assets.forEach(asset => {
    if (
      !target.childs.find(child => asset === child.asset)
      && asset.isSupported
    )
      target.childs.push(new Target(asset))
  })
  target.childs.forEach((child, index) => {
    if (
      !portfolio.assets.find(asset => asset === child.asset)
      || !child.asset.isSupported
    )
      target.childs.splice(index, 1)
  })
  portfolio.assets.listen("add", asset => {
    if (asset.isValid) target.childs.push(new Target(asset))
  })
  portfolio.assets.listen("remove", asset => {
    const index = target.childs.findIndex(child => child.asset === asset)
    target.childs.splice(index, 1)
  })

  return target
}

/**
 * Format: JSON
 */

Target.fromJson = function (json) {
  const object = JSON.parse(json)
  const target = Target.fromObject(object)
  target.json = json
  return target
}

Target.prototype.toJson = function (beautifyFlag) {
  const object = this.toObject()
  return JSON.stringify(object, null, beautifyFlag && 2)
}

Target.prototype.hasChanged = function () {
  return this.json && this.json !== this.toJson()
}

/**
 * Format: Object
 */

Target.fromObject = function (object) {
  if (typeof object === "string") object = { asset: object }

  const target = new Target(object.asset && Asset.resolve(object.asset))
  target.size = object.size
  target.mode = object.mode

  if (!object.asset) {
    target.group = object.group
    object.childs.forEach(entry => {
      return target.childs.push(Target.fromObject(entry))
    })
  }

  return target
}

Target.prototype.toObject = function () {
  let object = {}

  if (this.size != null) object.size = this.size
  if (this.mode != null && this.mode !== "equal") object.mode = this.mode

  if (this.asset) {
    if (this.asset.type === "unknown") object.asset = this.asset.id
    else object.asset = this.asset.code
    if (Object.keys(object).length === 1) object = object.asset
  } else if (this.childs) {
    if (this.group) object.group = this.group
    object.childs = this.childs.map(target => target.toObject())
  }

  return object
}

/**
 * Export
 */

module.exports = Target

/**
 * Example
 */

/*
[
  {
    "group": "Fiats"
    "size": "50",
    "childs": [
      { "asset": "USD", "size": "30", "min": { "amount": "2000" }},
      { "asset": "EUR", "size": "20", "min": { "amount": "500" }},
      { "asset": "CNY", "size": "20" },
      { "asset": "GBP", "size": "20" }
  },
  {
    //"group": "Native"
    "size": "25",
    "strategy": "marketCap",
    "childs": ["XLM", "SLT", "MOBI"]
  },
  {
    //"group": "Tether",
    "size": "25",
    "strategy": [["marketCap", 25], ["equal", 25], ["change7D", 25], ["inertia", 25]],
    "childs": [{ "asset": "BTC", "min": { "amount": "0.05", "size": "20" }}, "ETH", [10, "byMarketCap"]]
  }
]

[
  {
    "group": "Fiat",
    "size": 50,
    "strategy": "equal",
    "childs": ["USD", "EUR", "GBP", "CNY"]
  },
  {
    "group": "Native",
    "size": 20,
    "strategy": [["marketCap", 25], ["equal", 25], ["inertia", 50]]
  }
  { "asset": "BTC", "size": 10 },
  { "asset": "ETH", "size": 5 },
  { "asset": "XRP", "size": 3 }
]

*/
