"use_strict"
/**
 * Target Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const Target = require("./logic/target")
const TargetSetup = require("./widgets/target-setup")
const TargetsControls = require("./widgets/targets-controls")
const TargetsTable = require("./widgets/targets-table")

/**
 * Class
 */

module.exports = class RebalanceGui extends Gui {
  constructor (portfolio) {
    super(`
<section class="RebalanceGui">
  <h2>${__("Rebalance")}</h2>

  %table

  %controls

</section>
    `)

    this.portfolio = portfolio

    // Load & bind template from localStorage.
    const targetKey = `target:${portfolio.account.id}`
    const template = localStorage[targetKey]
    this.target = Target.forPortfolio(portfolio, template)
    this.target.link("json", localStorage, targetKey, null, { init: false })

    // Targets table.
    this.table = new TargetsTable(this.target)
    this.table.project("selected", this)
    this.project("selected", this.table)

    // Controls.
    this.trap("selected", () => {
      if (this.controls) this.controls.destroy()
      if (this.selected) {
        this.controls = new TargetSetup(this.selected)
        this.controls.listen("close", () => this.selected = null)
      } else {
        this.controls = new TargetsControls(this.target)
      }
    })
  }
}
