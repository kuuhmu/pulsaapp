"use strict"
/**
 * Target Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const Dialog = require("./helpers/dialog")
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
    this.target.json = this.target.toJson()

    // Targets table.
    this.table = new TargetsTable(this.target)
    this.table.project("selected", this)
    this.project("selected", this.table)

    // Controls.
    this.controls = new TargetsControls(this.target)

    this.trap("selected", () => {
      if (this.selected) this.showTargetSetup(this.selected)
    })
  }

  async showTargetSetup (target) {
    const setup = new TargetSetup(target)
    const dialog = Dialog.confirm({ content: setup })

    if (await dialog) setup.confirm()
    else setup.cancel()

    this.selected = null
    target.computeAll()
  }
}
