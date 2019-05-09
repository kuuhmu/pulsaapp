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
      this.mode = "ignore"
      this.order = Order.rebalance(this)

      asset.target = this
      this.watch(asset, "value", () => this.compute("valueDiff"))

      // XLM is never ignored.
      if (asset.id === "XLM") {
        this.mode = "weight"
        this.size = 1
      }
    } else {
      this.childs = new Mirrorable()
      this.childs.listen("add", child => child.parent = this)
      this.childs.listen("change", () => this.computeAll())
    }

    // Normalize & compute
    this.trap("size", () => {
      if (this.size) {
        this.size = Math.max(0, this.size)
        if (this.mode === "percentage") this.size = Math.min(100, this.size)
      }
      this.computeAll()
    })
  }

  get root () {
    if (this.parent) return this.parent.root
    else return this
  }
}

Target.define("name", ["group", "asset"], function () {
  return this.group || this.asset.id
})
Target.define("valueDiff", ["value", "asset"], function () {
  return this.asset && this.asset.value - this.value
})
Target.define("valueDiffP", "valueDiff", function () {
  return this.value ? this.valueDiff / this.value : null
})
Target.define("amountDiff", ["amount"], function () {
  return +nice(this.amount - this.asset.amount, 7)
})
Target.define("amountDelta", ["amountDiff"], function () {
  return Math.abs(this.amountDiff)
})
// Gets computed by "strategy.js".
Target.define("share", null, function () {
  return this.value / this.root.portfolio.total
})
Target.define("shareDiff", ["share"], function () {
  return this.asset.share - this.share
})

/**
 * Actions
 */

Target.prototype.computeAll = function () {
  if (this.parent) {
    this.root.computeAll()
  } else if (this.portfolio && this.portfolio.total) {
    try {
      this.error = null
      this.value = this.portfolio.total
      this.modified = this.hasChanged()
      strategy.apply(this)
    } catch (error) {
      this.error = error.message
      console.error(error)
    }
    this.trigger("update")
  }
}

/**
 * Utilities
 */

/**
 * Return deterministically sorted **target** childs without mutating source
 * object.
 */
Target.sortChilds = function (target) {
  const childs = target.childs.slice()
  return childs.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Source: Portfolio
 */

Target.forPortfolio = function (portfolio, json) {
  const target = json ? Target.fromJson(json) : new Target()
  target.portfolio = portfolio

  portfolio.target = target
  target.watch(portfolio, "total", () => target.computeAll())

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
  return this.toJson() !== (this.json || "{\"childs\":[]}")
}

/**
 * Format: Object
 */

Target.fromObject = function (object) {
  if (typeof object === "string") object = { asset: object }

  // Create Target instance.
  const asset = object.asset && Asset.resolve(object.asset)
  const target = new Target(asset)
  target.size = object.size
  target.mode = object.mode

  // Conversion from versions <= 0.5 − REMOVAL: 2020-05 (one year).
  if (target.mode === "equal") target.mode = "weight"
  if (target.mode === "skip") target.mode = "ignore"

  // Fix for versions <= 0.6.1 - REMOVAL: 2020-06 (one year).
  if (target.asset && target.asset.id === "XLM" && target.mode === "ignore") {
    target.mode = "weight"
    target.size = 1
  }

  // Set defaults.
  if (!target.mode) target.mode = "weight"
  if (target.size == null && target.mode === "weight") target.size = 1

  // Parse childs.
  if (object.childs) {
    target.group = object.group
    const childs = object.childs.map(entry => Target.fromObject(entry))

    // Conversion from versions <= 0.5 − REMOVAL: 2020-05 (one year).
    //
    // When there was no "equal" target, percentage targets whose sum is under
    // 100 would act like "weight".
    const percentChilds = childs.filter(child => child.mode === "percentage")
    if (
      percentChilds.length
      && !childs.find(child => child.mode === "weight")
      && 100 !== percentChilds.reduce((child, sum) => child.size + sum, 0)
    ) {
      percentChilds.forEach(child => child.mode = "weight")
    }

    target.childs.push(...childs)
  }

  return target
}

Target.prototype.toObject = function () {
  if (this.mode === "ignore") return
  let object = { mode: this.mode, size: this.size }
  if (object.mode === "weight") {
    delete object.mode
    if (object.size === 1) delete object.size
  }

  if (this.asset) {
    object.asset = this.name
    if (Object.keys(object).length === 1) object = object.asset
  } else if (this.childs) {
    object.group = this.group
    const childs = Target.sortChilds(this)
    object.childs = childs.map(target => target.toObject()).filter(x => x)
  }

  return object
}

/**
 * Export
 */

module.exports = Target
