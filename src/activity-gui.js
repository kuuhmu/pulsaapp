"use_strict"
/**
 * Activity Gui
 */

const Gui = require("@cosmic-plus/jsutils/gui")
const nice = require("@cosmic-plus/jsutils/nice")
const Tabs = require("@cosmic-plus/jsutils/tabs")
const { __ } = require("@cosmic-plus/i18n")
const { CosmicLink } = require("cosmic-lib")

const SideFrame = require("./side-frame")
const global = require("./global")

/**
 * Class
 */

class ActivityGui extends Gui {
  constructor (portfolio) {
    super(`
<section>
  <h2>${__("Activity")}</h2>
  %selector
  %view
</section>
    `)

    this.portfolio = portfolio

    const tabs = new Tabs()
    // tabs.project(["selector", "view"], this)
    tabs.project("view", this)

    tabs.add(
      "offers",
      __("Open Orders"),
      new ActivityGui.Offers(portfolio),
      "select"
    )
    // tabs.add("orders", __("Orders"), new ActivityGui.Orders(portfolio))
    // tabs.add("transfers", __("Transfers"), new ActivityGui.Transfers(portfolio))
    // tabs.select(__("Orders"))
  }
}

ActivityGui.Offers = class ActivityOffers extends Gui {
  constructor (portfolio) {
    super(`
<section>
  <table>
    <tr>
      <th>${__("Date")}</th>
      <th>${__("Asset")}</th>
      <th>${__("Direction")}</th>
      <th>${__("Amount")}</th>
      <th>${__("Price")} (${global.currency})</th>
    </tr>
    %formatOffer:offers...
    <tr><td colspan="5" align="center" onclick=%cancelOffers>
      <h3>${__("Cancel All")}</h3>
    </td></tr>
  </table>
</section>

<p class="note">
  ${__("All orders are passed against Stellar Lumens (XLM).")}
  ${__(
    "For your comfort, prices are displayed in their %%globalCurrency equivalent."
  )}
  ${__(
    "However, those converted values will change according to XLM price movement."
  )}
</p>
    `)

    this.portfolio = portfolio
    this.offers = portfolio.offers
    this.globalCurrency = global.currency
  }

  formatOffer (offer) {
    return new ActivityGui.Offer(offer)
  }

  cancelOffers () {
    if (!this.offers.length) return

    const memo = "Equilibre.io"
    const network = "public"
    const source = this.portfolio.accountId
    const operations = this.offers.map(offer => {
      return { type: "manageOffer", offerId: offer.id, amount: 0 }
    })

    const cosmicLink = new CosmicLink({ memo, network, source, operations })
    new SideFrame(cosmicLink.uri)
  }
}

ActivityGui.Offer = class ActivityOffer extends Gui {
  constructor (offer) {
    super(
      `
<tr>
  <td>%formatDate:last_modified_time</td>
  <td>
    <img src=%image alt="">
    <span>%name / %anchor</span>
  </td>
  <td>%side</td>
  <td align="right">%nice:amount</td>
  <td align="right">%nice:price</td>
</tr>
    `,
      offer
    )

    this.offer = offer

    this.name = offer.asset.code
    this.side = offer.side === "buy" ? __("Buy") : __("Sell")
    this.anchor = offer.balance.anchor.name
    this.date = new Date(offer.last_modified_time).toLocaleDateString()
    offer.asset.link("image", this)
  }

  nice (number) {
    return nice(number)
  }

  formatDate (value) {
    const date = value ? new Date(value) : new Date()
    return date.toLocaleDateString()
  }
}

ActivityGui.Orders = class ActivityOrders extends Gui {
  constructor (portfolio) {
    super(`
<table>
  <tr>
    <th>${__("Date")}</th>
    <th>${__("Asset")}</th>
    <th>${__("Direction")}</th>
    <th>${__("Amount")}</th>
    <th>${__("Price")}</th>
  </tr>
  <tr>
    <td colspan="6"><h3><i18n>${__("Open Orders")}</i18n></h3></td>
  </tr>
  %openOrders...
  <tr>
    <td colspan="6"><h3><i18n>${__("Completed Orders")}</i18n></h3></td>
  </tr>
  %completedOrders...
</table>
    `)
    this.portfolio = portfolio
  }
}

ActivityGui.Transfers = class ActivityTransfers extends Gui {
  constructor (portfolio) {
    super(`
<table>
  <tr>
    <th>${__("Date")}</th>
    <th>${__("Asset")}</th>
    <th>${__("With")}</th>
    <th>${__("Amount")}</th>
  </tr>
  %transfers...
</table>
    `)
    this.portfolio = portfolio
  }
}

/**
 * Export
 */

module.exports = ActivityGui
