"use strict"
/**
 * Active Offers Table
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { CosmicLink } = require("cosmic-lib")
const { __ } = require("@cosmic-plus/i18n")

const SideFrame = require("../helpers/side-frame")

const global = require("../logic/global")

module.exports = class ActiveOffersTable extends Gui {
  constructor (portfolio) {
    super(`
<section class="ActiveOffersTable">
  <table>
    <tr>
      <th>${__("Date")}</th>
      <th>${__("Asset")}</th>
      <th>${__("Direction")}</th>
      <th>${__("Amount")}</th>
      <th>${__("Price")} (%globalCurrency)</th>
    </tr>
    %toOfferRow:offers...
    <tr><td colspan="5" align="center" onclick=%cancelOffers>
      <h3>${__("Cancel All")}</h3>
    </td></tr>
  </table>
</section>
    `)

    this.portfolio = portfolio
    this.offers = portfolio.offers
    this.globalCurrency = global.currency
  }

  toOfferRow (offer) {
    return new OfferRow(offer)
  }

  cancelOffers () {
    if (!this.offers.length) return

    const txParams = {
      memo: "Equilibre.io",
      network: "public",
      maxTime: "+5",
      source: this.portfolio.accountId
    }

    const cosmicLink = new CosmicLink(txParams)
    this.offers.forEach(offer => {
      cosmicLink.addOperation("manageOffer", { offerId: offer.id, amount: 0 })
    })

    const sideFrame = new SideFrame(cosmicLink.uri)
    sideFrame.listen("destroy", () => {
      this.portfolio.getAccount()
      this.portfolio.offers.get()
    })
  }
}

class OfferRow extends Gui {
  constructor (offer) {
    super(`
<tr>
  <td>%toDate:last_modified_time</td>
  <td>
    <img src=%image alt="">
    <span>%name / %anchor</span>
  </td>
  <td>%side</td>
  <td align="right">%nice:amount</td>
  <td align="right">%nice:price</td>
</tr>
    `)

    this.offer = offer
    offer.project(["last_modified_time", "amount", "price"], this)

    this.name = offer.asset.code
    this.side = offer.side === "buy" ? __("Buy") : __("Sell")
    this.anchor = offer.balance.anchor.name
    offer.asset.link("image", this)
  }

  nice (number) {
    return nice(number)
  }

  toDate (value) {
    const date = value ? new Date(value) : new Date()
    return date.toLocaleDateString()
  }
}
