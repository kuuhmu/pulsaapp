"use_strict"
/**
 * Target Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const i18n = require("@cosmic-plus/i18n")
const html = require("@cosmic-plus/domutils/es5/html")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = i18n

const SideFrame = require("./side-frame")
const global = require("./global")
const Order = require("./order")
const Target = require("./target")

/**
 * Class
 */

class RebalanceGui extends Gui {
  constructor (portfolio) {
    super(`
<section class="RebalanceGui">
  <h2>${__("Rebalance")}</h2>
  %table
  <section hidden=%hideSection>
    <div class="errors">%formatError:errors...</div>
    <form onsubmit=%rebalance hidden=%hideRebalance>
      <button type="submit" disabled=%block>${__("Rebalance")}</button>
    </form>
    <form onsubmit=%apply hidden=%hideApply>
      <button type="submit" disabled=%block>${__("Apply")}</button>
      <button onclick=%cancel>${__("Cancel")}</button>
    </form>
  </section>
  %setupGui
</section>
    `)

    this.portfolio = portfolio
    const template = localStorage[`target:${portfolio.account.id}`]
    this.target = Target.forPortfolio(portfolio, template)

    this.table = new RebalanceGui.Table(this)
    this.table.project("selected", this)
    this.project("selected", this.table)

    this.errors = this.target.errors
    this.errors.feed(this, "block", errors => !!errors.length)

    this.define("hideRebalance", ["selected", "modified"], () => {
      return this.selected || this.modified
    })
    this.define("hideApply", ["selected", "modified"], () => {
      return this.selected || !this.modified
    })
    this.define("hideSection", ["hideRebalance", "hideApply"], () => {
      return this.hideRebalance && this.hideApply
    })

    this.target.project("modified", this)

    this.define("setupGui", "selected", () => {
      if (this.setupGui) this.setupGui.destroy()
      return this.selected && new TargetGui.Setup(this.selected, this)
    })
  }

  formatError (error) {
    return new Gui(`<div class="error">%error</div>`, { error })
  }

  cancel () {
    location.reload()
    return false
  }

  apply () {
    try {
      const accountId = this.portfolio.account.id
      localStorage[
        `target:${accountId}`
      ] = this.target.template = this.target.toString()
      this.target.modified = false
    } catch (error) {
      console.error(error)
    }
    return false
  }

  rebalance () {
    try {
      const operations = listOperations(this.target)
      const outdated = this.portfolio.offers.filter(offer => offer.outdated)
      const remaining = outdated.filter(offer => {
        return !operations.find(op => op.offer.id === offer.id)
      })
      operations.forEach(op => {
        if (!op.offer.id && remaining.length) op.offer.id = remaining.pop().id
      })

      if (!operations.length) return false
      const cosmicLink = Order.operationsToCosmicLink(operations)
      remaining.forEach(offer => {
        cosmicLink.addOperation("manageOffer", { amount: 0, offerId: offer.id })
      })
      if (cosmicLink) {
        const sideFrame = new SideFrame(cosmicLink.uri)
        sideFrame.listen("destroy", () => {
          this.portfolio.getAccount()
          this.portfolio.offers.get()
        })
      }
    } catch (error) {
      console.error(error)
    }
    return false
  }
}

function listOperations (target) {
  let operations = []
  target.childs.forEach(child => {
    if (child.order) operations = operations.concat(child.order.operations)
  })
  return operations
}

RebalanceGui.Table = class RebalanceTable extends Gui {
  constructor (parent) {
    super(`
<section class="RebalanceTable">
  <table>
    <tr>
      <th>${__("Name")}</th>
      <th>${__("Goal")}</th>
      <th>${__("Divergence")}</th>
      <th>${__("Operation")}</th>
    </tr>
    %formatTarget:targets...
    <tr hidden=true>
      <td align="center" colspan="4"><h3>${__("Add Asset")}</h3></td>
    </tr>
  </table>
</section>
    `)

    this.selected = undefined
    this.targets = parent.target.childs
    this.sortTargets(this.targets)
    parent.target.listen("update", () => this.sortTargets(this.targets))
  }

  formatTarget (target) {
    const targetGui = new TargetGui(target)
    targetGui.domNode.onclick = () => this.selected = target
    return targetGui
  }

  sortTargets (array) {
    return array.sort((a, b) => b.goal - a.goal || a.globalPrice)
  }
}

class TargetGui extends Gui {
  constructor (target) {
    super(`
<tr class="TargetGui">
  <td align="left">
    <img src=%image alt="">
    <span>%name</span>
  </td>
  <td align="right">%goal%</td>
  <td align="right">%divergence</td>
  <td align="right">%description...</td>
</tr>
    `)

    this.target = target

    this.name = target.name || target.asset && target.asset.code
    target.asset.project("image", this)
    target.project("goal", this, x => nice(x, 2))
    target.project("divergence", this, x => {
      return x == null ? "-" : nice(x * 100, 2) + "%"
    })

    this.watch(target, "order", () => {
      if (!target.order) {
        this.cosmicLink = this.description = null
      } else {
        target.order.project("cosmicLink", this)
        target.order.project("description", this, descriptionToList)
      }
    })
  }
}

TargetGui.Setup = class TargetSetup extends Gui {
  constructor (target, parent) {
    super(`
<section>
  <form onsubmit=%close>
    <h3>%assetName</h3>
    <hr>
    <label><span>${__("Size")}:</span>
      <input class="half" type="number" step="any" min="0" %max value=%size
       placeholder=%goal onchange=%switchMode>
      <select class="half" onchange=%setMode value=%mode>
        <option value="equal">${__("Equal Share")}</option>
        <option value="percentage">${__("Percentage")}</option>
        <option value="amount">${__("Amount")}</option>
      </select>
    </label>

    <hr>

    <input type="submit" value="${__("Close")}">
  </form>
</section>
    `)

    this.parent = parent
    this.target = target

    this.assetName = target.asset.name

    target.project("goal", this, x => nice(x, 2))

    target.project("size", this)
    this.project("size", target, x => x != null ? Number(x) : null)

    target.project("mode", this, mode => mode || "equal")
    this.project("mode", target)
  }

  switchMode () {
    if (this.size && this.mode === "equal") this.mode = "percentage"
  }

  setMode () {
    switch (this.mode) {
    case "equal":
      this.size = null
      break
    case "percentage":
      this.size = +nice(100 * this.target.value / global.portfolio.total, 2)
      this.max = 100
      break
    case "amount":
      this.size = this.target.asset.amount
      this.max = null
      break
    }
  }

  close () {
    this.switchMode()
    this.parent.selected = null
    return false
  }
}

/**
 * Helpers
 */

function descriptionToList (description) {
  return description.map(e => html.create("div", null, e))
}

/**
 * Export
 */

module.exports = RebalanceGui
