"use strict"
/**
 * Portfolio Table
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = require("@cosmic-plus/i18n")

/**
 * Class
 */
module.exports = class PortfolioTable extends Gui {
  constructor (portfolio) {
    super(`
<table class="PortfolioTable">
  <tr>
    <th class="name">${__("Name")}</th>
    <th align="left">${__("Anchor")}</th>
    <th align="right">${__("Amount")}</th>
    <th align="right">${__("Price")}</th>
    <th align="right">${__("Value")}</th>
  </tr>
  %rows...
</table>
`)

    this.portfolio = portfolio
    this.rows = portfolio.assets.mirror((asset) => this.toAssetRow(asset))
    this.watch(portfolio, "total", () => this.sort())
    this.trap("selected", () => this.onselect(this.selected))
  }

  toAssetRow (asset) {
    const row = new AssetRow(asset)
    row.domNode.onclick = () => {
      if (this.selected === row.asset) this.selected = null
      else this.selected = row.asset
    }
    return row
  }

  sort () {
    this.rows.sort((a, b) => b.asset.value - a.asset.value)
  }

  onselect (asset) {
    if (this.selectedRow) this.selectedRow.simpleView()
    this.selectedRow = this.rows.find((row) => row.asset === asset)
    if (this.selectedRow) this.selectedRow.detailledView()
  }
}

class AssetRow extends Gui {
  constructor (asset) {
    super(`
<tr %class>
  <td align="left">
    <img src=%image alt="">
    <span>%name</span>
  </td>
  <td align="left">
    <div hidden=%simple>%anchors...</div>
    <div class=%mode>%anchorTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%amounts...</div>
    <div class=%mode>%amountTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%prices...</div>
    <div class=%mode title=%priceDetails>%priceTotal</div>
  </td>
  <td align="right">
    <div hidden=%simple>%values...</div>
    <div class=%mode>%valueTotal</div>
  </td>
</tr>
    `)

    this.asset = asset

    this.name = asset.code
    this.anchors = asset.balances.mirror((x) => cell(x.anchor, "name"))
    this.amounts = asset.balances.mirror((x) => cell(x, "amount", nice))
    this.prices = asset.balances.mirror((x) => priceCell(x, "price", nice))
    this.values = asset.balances.mirror((x) =>
      cell(x, "value", (x) => nice(x, 2))
    )
    asset.link("image", this)
    asset.link("amount", this, "amountTotal", nice)
    asset.link("price", this, "priceTotal", nice)
    asset.link("value", this, "valueTotal", (x) => nice(x, 2))
    asset.balances.feed(this, "anchorHeader", anchorName)

    const orderbook = this.asset.orderbook
    this.define("priceDetails", "orderbook", () => priceDetails(orderbook))
    this.watch(orderbook, ["bestAsk", "bestBid", "spread%"], () => {
      this.compute("priceDetails")
    })

    this.simpleView()
  }

  simpleView () {
    this.simple = true
    this.class = ""
    this.mode = ""
    this.anchorTotal = this.anchorHeader
  }

  detailledView () {
    this.simple = false
    this.class = "selected"
    this.mode = "footer"
    this.anchorTotal = "Total"
  }
}

/**
 * Helpers
 */

function anchorName (balances) {
  if (balances.length === 1) return balances[0].anchor.name
  else return `${__("multiple")} (${balances.length})`
}

function cell (object, key, func) {
  const node = html.create("div", null, object[key])
  object.link(key, node, "textContent", func)
  return node
}

function priceCell (object, key, func) {
  const node = cell(object, "price", func)
  object.trap("orderbook", () => {
    if (object.orderbook) {
      object.orderbook.trap(["bestAsk", "bestBid", "spread%"], () => {
        node.title = priceDetails(object.orderbook)
      })
    }
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
