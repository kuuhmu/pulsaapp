"use_strict"
/**
 * Portfolio Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const Tabs = require("@cosmic-plus/domutils/es5/tabs")
const { __ } = require("@cosmic-plus/i18n")

const AssetGui = require("./asset-gui")
const AssetPriceChart = require("./widgets/asset-price-chart")
const PortfolioPieChart = require("./widgets/portfolio-pie-chart")

const global = require("./logic/global")

/**
 * Class
 */

class PortfolioGui extends Gui {
  constructor (portfolio) {
    super(`
<section><h2>${__("Portfolio")}: %total %currency</h2>

  %nav
  <section>%view</section>

  %priceChart

  <p class="note">
    ${__("Anchor prices are from Stellar DEX")} /
    ${__("Global prices are from %%coingecko when available.")}
  </p>

</section>`)

    this.portfolio = portfolio

    // Init.
    portfolio.project("total", this, x => nice(x, 2))
    this.currency = global.currency
    this.coingecko = new Gui(
      `<a target="_blank" rel="noopener" href="https://coingecko.com">coingecko</a>`
    )

    // Bind components together.
    this.table = new PortfolioGui.Table(this)
    this.project("selected", this.table)
    this.table.project("selected", this)

    this.pieChart = new PortfolioPieChart(this.portfolio)
    this.project("selected", this.pieChart)
    this.pieChart.project("selected", this)

    this.trap("selected", () => this.maybeDrawPriceChart())

    // Create overview.
    const overview = new Tabs()
    overview.add("table", __("Table"), this.table)
    overview.add("chart", __("Chart"), this.pieChart)

    overview.project(["nav", "view"], this)

    // Save & load last selected tab.
    overview.listen("select", id => localStorage["PortfolioSummary.tab"] = id)
    overview.select(localStorage["PortfolioSummary.tab"])
    if (!overview.selected) overview.select("table")
  }

  maybeDrawPriceChart () {
    if (this.priceChart) this.priceChart.destroy()

    const asset = this.selected
    const assetHasChart = asset && (asset.isTether || asset.apiId)

    if (assetHasChart && asset.code !== global.currency) {
      this.priceChart = new AssetPriceChart(asset)
    } else {
      this.priceChart = null
    }
  }
}

PortfolioGui.Table = class PortfolioTable extends Gui {
  constructor (parent) {
    super(`
<table>
  <tr>
    <th>${__("Name")}</th>
    <th>${__("Anchor")}</th>
    <th>${__("Amount")}</th>
    <th>${__("Price")}</th>
    <th>${__("Value")}</th>
  </tr>
  %assetsGui...
</table>
`)

    this.parent = parent

    this.assetsGui = parent.portfolio.assets.mirror(asset => {
      const assetGui = new AssetGui(asset)
      assetGui.domNode.onclick = () => this.select(assetGui)
      return assetGui
    })

    this.watch(parent.portfolio, "total", () => this.sort())
  }

  sort () {
    this.assetsGui.sort((a, b) => b.asset.value - a.asset.value)
  }

  select (assetGui) {
    if (this.selected) {
      this.selected.domNode.className = ""
      this.selected.simpleView()
    }

    if (this.selected === assetGui) {
      this.parent.select()
      this.selected = null
    } else {
      this.parent.select(assetGui.asset)
      assetGui.domNode.className = "selected"
      this.selected = assetGui
      assetGui.detailledView()
    }
  }
}

/**
 * Export
 */

module.exports = PortfolioGui
