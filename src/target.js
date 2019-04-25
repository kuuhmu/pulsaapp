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
 * Target sizing attributes:
 * size, sizeMin, sizeMax, sizeLock
 * amountMin, amountMax, amountLock
 *
 * Strategies: equal, marketCap,... (inertia, change7D, RSI)
 * Filters: change30d, RSI
 */

const Target = module.exports = class Target extends Projectable {
  static forPortfolio (portfolio, template) {
    const target = template ? Target.fromString(template) : new Target()
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

  compute () {
    if (this.parent) {
      this.parent.compute()
    } else if (this.portfolio && this.portfolio.total) {
      this.errors.splice(0, this.errors.length)
      this.modified = this.hasChanged()
      strategy.apply(this, this.portfolio.total)
    }
  }

  hasChanged () {
    return this.template !== this.toString()
  }

  static fromString (string) {
    const template = JSON.parse(string)
    const target = Target.fromTemplate(template)
    target.template = string
    return target
  }

  static fromTemplate (template) {
    if (typeof template === "string") template = { asset: template }

    const target = template.asset
      ? new Target(Asset.resolve(template.asset))
      : new Target()

    target.size = template.size
    target.mode = template.mode

    if (!template.asset) {
      target.name = template.group
      template.childs.forEach(entry =>
        target.childs.push(Target.fromTemplate(entry))
      )
    }

    return target
  }

  toString (beautify) {
    const template = this.toTemplate()
    return JSON.stringify(template, null, beautify && 2)
  }

  toTemplate () {
    let template = {}

    if (this.size != null) template.size = this.size
    if (this.mode != null && this.mode !== "equal") template.mode = this.mode

    if (this.asset) {
      if (this.asset.type === "unknown") template.asset = this.asset.id
      else template.asset = this.asset.code
      if (Object.keys(template).length === 1) template = template.asset
    } else if (this.childs) {
      if (this.name) template.group = this.name
      template.childs = this.childs.map(target => target.toTemplate())
    }

    return template
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
