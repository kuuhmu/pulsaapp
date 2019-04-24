"use_strict"
/**
 * Share Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const i18n = require("@cosmic-plus/i18n")
const html = require("@cosmic-plus/domutils/es5/html")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = i18n

const SideFrame = require("./side-frame")
const global = require("./global")
const Order = require("./order")
const Share = require("./share")

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
    this.share = Share.forPortfolio(portfolio, template)

    this.table = new RebalanceGui.Table(this)
    this.table.project("selected", this)
    this.project("selected", this.table)

    this.errors = this.share.errors
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

    this.share.project("modified", this)

    this.define("setupGui", "selected", () => {
      if (this.setupGui) this.setupGui.destroy()
      return this.selected && new ShareGui.Setup(this.selected, this)
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
      ] = this.share.template = this.share.toString()
      this.share.modified = false
    } catch (error) {
      console.error(error)
    }
    return false
  }

  rebalance () {
    try {
      const operations = listOperations(this.share)
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

function listOperations (share) {
  let operations = []
  share.childs.forEach(child => {
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
    %formatShare:shares...
    <tr hidden=true>
      <td align="center" colspan="4"><h3>${__("Add Asset")}</h3></td>
    </tr>
  </table>
</section>
    `)

    this.selected = undefined
    this.shares = parent.share.childs
    this.sortShares(this.shares)
    parent.share.listen("update", () => this.sortShares(this.shares))
  }

  formatShare (share) {
    const shareGui = new ShareGui(share)
    shareGui.domNode.onclick = () => this.selected = share
    return shareGui
  }

  sortShares (array) {
    return array.sort((a, b) => b.goal - a.goal || a.globalPrice)
  }
}

class ShareGui extends Gui {
  constructor (share) {
    super(`
<tr class="ShareGui">
  <td align="left">
    <img src=%image alt="">
    <span>%name</span>
  </td>
  <td align="right">%goal%</td>
  <td align="right">%divergence</td>
  <td align="right">%description...</td>
</tr>
    `)

    this.share = share

    this.name = share.name || share.asset && share.asset.code
    share.asset.project("image", this)
    share.project("goal", this, x => nice(x, 2))
    share.project("divergence", this, x => {
      return x == null ? "-" : nice(x * 100, 2) + "%"
    })

    this.watch(share, "order", () => {
      if (!share.order) {
        this.cosmicLink = this.description = null
      } else {
        share.order.project("cosmicLink", this)
        share.order.project("description", this, descriptionToList)
      }
    })
  }
}

ShareGui.Setup = class ShareSetup extends Gui {
  constructor (share, parent) {
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
    this.share = share

    this.assetName = share.asset.name

    share.project("goal", this, x => nice(x, 2))

    share.project("size", this)
    this.project("size", share, x => x != null ? Number(x) : null)

    share.project("mode", this, mode => mode || "equal")
    this.project("mode", share)
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
      this.size = +nice(100 * this.share.value / global.portfolio.total, 2)
      this.max = 100
      break
    case "amount":
      this.size = this.share.asset.amount
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
