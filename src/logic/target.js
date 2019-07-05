"use strict"
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
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Asset = require("./asset")
const Balance = require("./balance")
const Order = require("./order")

const strategy = require("./strategy")
const {
  arrayContains,
  arrayRemove,
  arraySum,
  fixed7,
  positive
} = require("../helpers/misc")

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

      // Asset with 0 amount won't trigger recompute by moving portfolio total
      // value.
      this.watch(asset, "price", () => {
        if (!this.asset.amount && this.size) this.computeAll()
      })

      // Operations on trustlines.
      this.opening = []
      this.closing = []

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
        this.size = positive(this.size)
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
Target.define("modified", ["json"], function () {
  return this.hasChanged()
})
Target.define("valueDiff", ["value", "asset"], function () {
  return this.asset && this.asset.value - this.value
})
Target.define("valueDiffP", "valueDiff", function () {
  return this.value ? this.valueDiff / this.value : null
})
Target.define("amountDiff", ["amount"], function () {
  return fixed7(this.amount - this.asset.amount)
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
      this.compute("modified")
      strategy.apply(this)
    } catch (error) {
      this.error = error.message
      console.error(error)
    }
    this.trigger("update")
  }
}

/**
 * Add a target for **asset** into portfolio.
 */
Target.prototype.addAsset = function (asset) {
  if (!this.childs) throw new Error("Target is not a group: ", target)
  if (asset.target) throw new Error("Asset already has a target: ", asset)

  // Add asset & target to current portfolio.
  const target = new Target(asset)
  target.parent = this
  asset.anchors.forEach(anchor => target.addAnchor(anchor))
  this.childs.push(target)

  // Default setup.
  target.mode = "weight"
  target.size = 1

  return target
}

/**
 * Open a new trustline then fund the new position.
 */
Target.prototype.addAnchor = function (anchor) {
  const code = anchor.tetherCode(this.asset.code)
  const issuer = anchor.pubkey
  const balance = Balance.resolve(code, issuer)

  if (balance.action === "closing") {
    arrayRemove(this.closing, issuer)
    balance.action = null
  } else {
    this.root.portfolio.maybeAddBalance(balance)
    this.opening.push(issuer)
    balance.action = "opening"
  }

  this.root.compute("modified")
  this.order.refresh()
}

/**
 * Begin anchor liquidation process, remove the trustline once done.
 */
Target.prototype.removeAnchor = function (anchor) {
  const code = anchor.tetherCode(this.asset.code)
  const issuer = anchor.pubkey
  const balance = Balance.resolve(code, issuer)

  if (balance.action === "opening") {
    this.root.portfolio.maybeRemoveBalance(balance)
    arrayRemove(this.opening, issuer)
    balance.action = null
  } else {
    this.closing.push(issuer)
    balance.action = "closing"
  }

  this.root.compute("modified")
  this.order.refresh()
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

  const XLM = Asset.resolve("XLM")
  portfolio.trap("minimumBalance", () => {
    XLM.target.min = portfolio.minimumBalance
  })

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

  // Group Target: Parse childs.
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
      && arraySum(percentChilds, "size") !== 100
    ) {
      percentChilds.forEach(child => child.mode = "weight")
    }

    target.childs.push(...childs)
  } else {
    // Asset Target: Deal with trustline opening/closing.
    const balances = target.asset.balances
    if (object.opening) target.opening = object.opening
    if (object.closing) target.closing = object.closing

    balances.forEach(balance => {
      const issuer = balance.anchor.pubkey
      if (arrayContains(target.closing, issuer)) {
        // Trustline is still not closed.
        balance.action = "closing"
      } else {
        // Trustline has been opened.
        arrayRemove(target.opening, issuer)
      }
    })

    // Trustline has been closed.
    target.closing.forEach(issuer => {
      if (!balances.find(balance => balance.anchor.pubkey === issuer)) {
        arrayRemove(target.closing, issuer)
      }
    })

    // No balance for asset.
    if (!balances.length) asset.target = null
  }

  return target
}

Target.prototype.toObject = function () {
  if (this.mode === "ignore") return

  // Parameters reduction.
  let object = { mode: this.mode, size: this.size }
  if (object.mode === "weight") {
    delete object.mode
    if (object.size === 1) delete object.size
  }

  // Asset target.
  if (this.asset) {
    object.asset = this.name
    if (this.opening.length) object.opening = this.opening
    if (this.closing.length) object.closing = this.closing
    if (Object.keys(object).length === 1) object = object.asset

    // Group target.
  } else if (this.childs) {
    object.group = this.group
    const childs = Target.sortChilds(this)
    object.childs = childs.map(target => target.toObject()).filter(x => x)
  }

  return object
}

/**
 * Format: CosmicLink
 */

Target.prototype.toCosmicLink = function () {
  if (this !== this.root) {
    throw new Error("Only root target can be converted to CosmicLink")
  }

  // Generate CosmicLink.
  const operations = this.toOperations()
  const cosmicLink = Order.operationsToCosmicLink(operations)

  // Set outdated offers to be replaced.
  const outdated = this.portfolio.offers.listOutdated()
  cosmicLink.tdesc.operations.forEach(odesc => {
    if (outdated.length) odesc.offerId = outdated.pop().id
  })
  outdated.forEach(remains => {
    cosmicLink.addOperation("manageOffer", { offerId: remains.id, amount: 0 })
  })

  // Open/close trustlines.
  this.portfolio.balances
    .filter(b => b.asset.target)
    .forEach(balance => {
      if (shouldOpenTrustline(balance)) {
        cosmicLink.tdesc.operations.unshift({})
        cosmicLink.setOperation(0, "changeTrust", { asset: balance.id })
      }
      if (shouldCloseTrustline(balance)) {
        cosmicLink.tdesc.operations.unshift({})
        cosmicLink.setOperation(0, "changeTrust", {
          asset: balance.id,
          limit: 0
        })
      }
    })

  return cosmicLink.tdesc.operations.length ? cosmicLink : null
}

function shouldOpenTrustline (balance) {
  if (balance.asset.target.mode === "remove") return false
  else return balance.action === "opening"
}

function shouldCloseTrustline (balance) {
  if (!balance.hasTrustline) return false
  else
    return (
      balance.amount === 0 && balance.action === "closing"
      || balance.asset.target.mode === "remove" && balance.asset.amount === 0
    )
}

/**
 * Format: Operations
 */
Target.prototype.toOperations = function () {
  if (this.childs) {
    return [].concat(...this.childs.map(child => child.toOperations()))
  } else if (this.order) {
    return this.order.operations
  } else {
    return []
  }
}

/**
 * Export
 */

module.exports = Target
