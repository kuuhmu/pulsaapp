"use_strict"
/**
 * Asset GUI
 */
const Gui = require("@cosmic-plus/jsutils/gui")
const html = require("@cosmic-plus/jsutils/html")
const nice = require("@cosmic-plus/jsutils/nice")
const msg = require("@cosmic-plus/i18n").__

/**
 * Class
 */

class AssetGui extends Gui {
  constructor (asset) {
    super(`
<tr %style>
  <td align="left">
    <img src=%image alt="">
    <span>%name</span>
  </td>
  <td align="left">
    <div hidden=%simple>%anchors...</div>
    <div %class>%anchorTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%amounts...</div>
    <div %class>%amountTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%prices...</div>
    <div %class title=%priceDetails>%priceTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%values...</div>
    <div %class>%valueTotal</div>
  </td>
</tr>
    `)

    this.asset = asset

    this.image = asset.image
    this.name = asset.code
    this.anchors = asset.balances.mirror(x => cell(x.anchor, "name"))
    this.amounts = asset.balances.mirror(x => cell(x, "amount", nice))
    this.prices = asset.balances.mirror(x => priceCell(x, "price", nice))
    this.values = asset.balances.mirror(x => cell(x, "value", x => nice(x, 2)))
    asset.link("amount", this, "amountTotal", nice)
    asset.link("price", this, "priceTotal", nice)
    asset.link("value", this, "valueTotal", x => nice(x, 2))
    asset.anchors.feed(this, "anchorHeader", anchorName)

    this.priceDetails = ""
    const orderbook = this.asset.orderbook
    if (orderbook) {
      orderbook.trap(
        ["bestAsk", "bestBid", "spread%"],
        () => this.priceDetails = priceDetails(orderbook)
      )
    }

    this.simpleView()
  }

  simpleView () {
    this.simple = true
    this.class = ""
    this.anchorTotal = this.anchorHeader
  }

  detailledView () {
    this.simple = false
    this.class = "footer"
    this.anchorTotal = "Total"
  }
}

/**
 * Export
 */

module.exports = AssetGui

/**
 * Helpers
 */

function anchorName (anchors) {
  if (anchors.length === 1) return anchors[0].name
  else return `${msg("Multiple")} (${anchors.length})`
}

function cell (object, key, func) {
  const node = html.create("div", null, object[key])
  object.link(key, node, "textContent", func)
  return node
}

function priceCell (object, key, func) {
  const node = cell(object, "price", func)
  object.trap("orderbook", () => {
    if (object.orderbook)
      object.orderbook.trap(
        ["bestAsk", "bestBid", "spread%"],
        () => node.title = priceDetails(object.orderbook)
      )
  })
  return node
}

function priceDetails (orderbook) {
  if (orderbook.base.code === "XLM") return ""
  return `
Buy: ${nice(orderbook.bestBid)} \
- Sell: ${nice(orderbook.bestAsk)} \
- Spread: ${nice(orderbook["spread%"], 2)}%
  `
}
