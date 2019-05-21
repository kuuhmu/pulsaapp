"use_strict"
/**
 * Portfolio Graphical User Interface
 */
const Highcharts = require("highcharts")
require("./highcharts-theme")

const Gui = require("@cosmic-plus/domutils/es5/gui")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const Tabs = require("@cosmic-plus/domutils/es5/tabs")
const { __ } = require("@cosmic-plus/i18n")

const AssetGui = require("./asset-gui")
const AssetPriceChart = require("./widgets/asset-price-chart")
const global = require("./logic/global")

/**
 * Class
 */

class PortfolioGui extends Gui {
  constructor (portfolio) {
    super(`
<section><h2>${__("Portfolio")}: %total %currency</h2>
  %summary
  %chart

  <p class="note" align="center">
    ${__("Anchor prices are from Stellar DEX")} /
    ${__("Global prices are from %%coingecko when available.")}
    </p>

</section>`)

    this.portfolio = portfolio

    portfolio.project("total", this, x => nice(x, 2))
    this.currency = global.currency
    this.summary = new PortfolioGui.Summary(this)
    this.coingecko = new Gui(
      `<a target="_blank" rel="noopener" href="https://coingecko.com">coingecko</a>`
    )
  }

  select (asset) {
    if (this.chart) this.chart.destroy()
    const assetHasChart = asset && (asset.isTether || asset.apiId)
    if (assetHasChart && asset.code !== global.currency) {
      this.chart = new AssetPriceChart(asset)
    } else {
      this.chart = null
    }
  }
}

PortfolioGui.Summary = class PortfolioSummary extends Gui {
  constructor (parent) {
    const tabs = new Tabs()
    super(`%nav <section>%view</section>`, tabs)

    tabs.add("table", __("Table"), new PortfolioGui.Table(parent))
    tabs.add("graph", __("Graph"), () => new PortfolioGui.Graph(parent))
    tabs.listen("select", id => localStorage["PortfolioSummary.tab"] = id)
    tabs.select(localStorage["PortfolioSummary.tab"] || "table")
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

PortfolioGui.Graph = class PortfolioGraph extends Gui {
  constructor (parent) {
    super(`<div -ref=%container align="center"></div>`)
    this.parent = parent

    this.listen("destroy", () => this.chart && this.chart.destroy())
    this.watch(parent.portfolio, "total", () => {
      // For some unknow reason the timeout makes the chart draw better.
      setTimeout(() => this.makePie(), 1)
    })
  }

  makePie () {
    if (this.chart) this.chart.destroy()

    this.chart = Highcharts.chart(this.container, {
      title: "",
      legend: { enabled: false },
      chart: { type: "pie" },
      tooltip: {
        pointFormat: `
${__("Amount")}: {point.amount} {point.code}<br>
${__("Price")}: {point.price} ${global.currency}<br>
<b>${__("Value")}: {point.y} ${global.currency}</b>
`
      },

      plotOptions: {
        pie: {
          dataLabels: {
            format: "{point.amount} {point.code}<br>({point.percentage:.0f}%)"
          },
          point: {
            events: {
              select: x => this.parent.select(x.target.options.asset),
              legendItemClick: () => false
            }
          }
        }
      },

      series: [
        {
          name: __("Amount"),
          colorByPoint: true,
          ignoreHiddenPoint: true,
          data: this.parent.portfolio.assets
            .filter(asset => asset.value)
            .map(makeAssetPoint)
            .sort((a, b) => b.y - a.y)
        }
      ]
    })
  }
}

function makeAssetPoint (asset) {
  return {
    name: asset.name,
    code: asset.code,
    asset: asset,
    y: +nice(asset.value, 2),
    amount: nice(asset.amount),
    price: nice(asset.price),
    percentage: asset.percentage
  }
}

/**
 * Export
 */

module.exports = PortfolioGui
