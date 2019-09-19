"use strict"
/**
 * Targets Controls
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const { __ } = require("@cosmic-plus/i18n")

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
  }

  rebalance () {
    const cosmicLink = this.target.toCosmicLink()

    if (cosmicLink) {
      const sideFrame = cosmicLink.open()
      sideFrame.listen("destroy", () => {
        this.target.portfolio.getAccount()
        this.target.portfolio.offers.get()
      })
    }
  }
}
