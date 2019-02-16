"use_strict"
/**
 * Share class.
 *
 * A (portfolio) Share object represents a statically or dynamically allocated
 * share of the user portfolio. It is a theoric goal that the rebalancing
 * process aims to reach as much as possible.
 *
 * A Share may be composed by several Share subentries, in such a way that the
 * complete portfolio balancing target ends up being a tree made of Shares.
 */
const Mirrorable = require("@cosmic-plus/jsutils/mirrorable")
const nice = require("@cosmic-plus/jsutils/nice")
const Projectable = require("@cosmic-plus/jsutils/projectable")

const Asset = require("./asset")
const Order = require("./order")
const strategy = require("./strategy")

/**
 * Share sizing attributes:
 * size, sizeMin, sizeMax, sizeLock
 * amountMin, amountMax, amountLock
 *
 * Strategies: equal, marketCap,... (inertia, change7D, RSI)
 * Filters: change30d, RSI
 */

const Share = module.exports = class Share extends Projectable {
  static forPortfolio (portfolio, template) {
    const share = template ? Share.fromString(template) : new Share()
    share.portfolio = portfolio
    share.errors = new Mirrorable()
    share.goal = 100

    portfolio.share = share
    portfolio.trap("total", () => share.compute(portfolio.total))

    // Add/Remove assets after trustline change.
    portfolio.assets.forEach(asset => {
      if (
        !share.childs.find(child => asset === child.asset)
        && asset.isSupported
      )
        share.childs.push(new Share(asset))
    })
    share.childs.forEach((child, index) => {
      if (
        !portfolio.assets.find(asset => asset === child.asset)
        || !child.asset.isSupported
      )
        share.childs.splice(index, 1)
    })
    portfolio.assets.listen("add", asset => {
      if (asset.isValid) share.childs.push(new Share(asset))
    })
    portfolio.assets.listen("remove", asset => {
      const index = share.childs.findIndex(child => child.asset === asset)
      share.childs.splice(index, 1)
    })

    return share
  }

  constructor (asset) {
    super()

    if (asset) {
      this.asset = asset
      this.mode = "amount"
      this.size = asset.amount
      this.order = Order.rebalance(this)
      asset.shares.push(this)
      asset.project("value", this)
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
    return this.template && this.template !== this.toString()
  }

  static fromString (string) {
    const template = JSON.parse(string)
    const share = Share.fromTemplate(template)
    share.template = string
    return share
  }

  static fromTemplate (template) {
    if (typeof template === "string") template = { asset: template }

    const share = template.asset
      ? new Share(Asset.resolve(template.asset))
      : new Share()

    share.size = template.size
    share.mode = template.mode

    if (!template.asset) {
      share.name = template.group
      template.childs.forEach(entry =>
        share.childs.push(Share.fromTemplate(entry))
      )
    }

    return share
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
      template.asset = this.asset.code
      if (Object.keys(template).length === 1) template = template.asset
    } else if (this.childs) {
      if (this.name) template.group = this.name
      template.childs = this.childs.map(share => share.toTemplate())
    }

    return template
  }
}

Share.define("delta", ["value", "target"], function () {
  return +nice(this.value - this.target, 7)
})
Share.define("divergence", ["delta", "target"], function () {
  return this.target ? this.delta / this.target : null
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
