"use strict"
/**
 * Targets Controls
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const { __ } = require("@cosmic-plus/i18n")

const SideFrame = require("../helpers/side-frame")

const Order = require("../logic/order")

/**
 * Class
 */

module.exports = class TargetsControls extends Gui {
  constructor (target) {
    super(`
<section class="TargetControls">
  <form onsubmit="return false" hidden=%hideRebalance>
    <button onclick=%rebalance disabled=%invalid>${__("Rebalance")}</button>
  </form>

  <form onsubmit="return false" hidden=%hideSave>
    <button onclick=%save disabled=%invalid>${__("Save")}</button>
    <button onclick=%cancel>${__("Cancel")}</button>
  </form>

  %toParagraph:error
</section>
    `)

    this.target = target
    target.project(["error", "modified"], this)

    this.define("hideRebalance", ["modified"], () => this.modified)
    this.define("hideSave", ["modified"], () => !this.modified)
    this.define("invalid", ["error"], () => !!this.error)
  }

  toParagraph (error) {
    if (error) return html.create("p", ".error", error)
  }

  cancel () {
    location.reload()
  }

  save () {
    this.target.json = this.target.toJson()
    this.target.modified = false
  }

  rebalance () {
    // TODO: Move this logic to Order & Offers models.
    const operations = listOperations(this.target)
    const portfolio = this.target.portfolio
    const outdated = portfolio.offers.filter(offer => offer.outdated)
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
        portfolio.getAccount()
        portfolio.offers.get()
      })
    }
  }
}

function listOperations (target) {
  let operations = []
  target.childs.forEach(child => {
    if (child.order) operations = operations.concat(child.order.operations)
  })
  return operations
}
