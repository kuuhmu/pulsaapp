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
    <form onsubmit=%rebalance hidden=%hideRebalance>
      <button type="submit" disabled=%invalid>${__("Rebalance")}</button>
    </form>

    <form onsubmit=%apply hidden=%hideApply>
      <button type="submit" disabled=%invalid>${__("Apply")}</button>
      <button onclick=%cancel>${__("Cancel")}</button>
    </form>

    %formatError:error
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

    this.define("hideRebalance", ["selected", "modified"], () => {
      return this.selected || this.modified
    })
    this.define("hideApply", ["selected", "modified"], () => {
      return this.selected || !this.modified
    })
    this.define("hideSection", ["hideRebalance", "hideApply"], () => {
      return this.hideRebalance && this.hideApply
    })

    this.target.project(["error", "modified"], this)
    this.define("invalid", "error", () => !!this.error)

    this.define("setupGui", "selected", () => {
      if (this.setupGui) this.setupGui.destroy()
      return this.selected && new TargetGui.Setup(this.selected, this)
    })
  }

  formatError (error) {
    if (error) return html.create("p", ".error", error)
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
      ] = this.target.json = this.target.toJson()
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
    return array.sort((a, b) => b.value - a.value)
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
  <td align="right">%share%</td>
  <td align="right">%valueDiffP</td>
  <td align="right">%description...</td>
</tr>
    `)

    this.target = target

    this.name = target.name || target.asset && target.asset.code
    target.asset.project("image", this)
    target.project("share", this, x => nice(x * 100, 2))
    target.project("valueDiffP", this, x => {
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
      <input class="half" type="number" step="any" min="0" %max
        value=%size placeholder=%share oninput=%maybeSwitchMode>
      <select class="half" onchange=%setMode value=%mode>
        <option value="weight">${__("Weight")}</option>
        <option value="percentage">${__("Percentage")}</option>
        <option value="amount">${__("Amount")}</option>
        <option value="ignore">${__("Ignore")}</option>
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

    target.project("share", this, x => nice(100 * x, 2))

    target.project("size", this)
    this.project("size", target, x => x != null ? Number(x) : null)

    target.project("mode", this)
    this.project("mode", target)
  }

  maybeSwitchMode () {
    if (this.mode === "ignore") {
      this.mode = "percentage"
      this.target.update()
    }
  }

  setMode () {
    switch (this.mode) {
    case "weight":
      this.size = 1
      this.max = null
      break
    case "percentage":
      this.size = +nice(this.target.asset.share, 2)
      this.max = 100
      break
    case "amount":
      this.size = this.target.asset.amount
      this.max = null
      break
    case "ignore":
      this.size = null
      break
    }
  }

  close () {
    if (this.size != null) this.maybeSwitchMode()
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
