"use_strict"
/**
 * Activity Gui
 */

const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const ActiveOffersTable = require("./widgets/active-offers-table")
const global = require("./logic/global")

/**
 * Class
 */

module.exports = class ActivityGui extends Gui {
  constructor (portfolio) {
    super(`
<section class="ActivityGui">
  <h2>${__("Activity")}</h2>

  %table

  <p class="note">
    ${__("All orders are passed against Stellar Lumens (XLM).")}
    ${__(
    "For your comfort, prices are displayed in their %%globalCurrency equivalent."
  )}
    ${__(
    "However, those converted values will change according to XLM price movement."
  )}
  </p>

</section>
    `)

    this.portfolio = portfolio
    this.table = new ActiveOffersTable(portfolio)
    this.globalCurrency = global.currency
  }
}
