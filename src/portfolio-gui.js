"use_strict"
/**
 * Portfolio Graphical User Interface
 */
const Highcharts = require("highcharts/highstock")

const Gui = require("@cosmic-plus/jsutils/gui")
const nice = require("@cosmic-plus/jsutils/nice")
const Tabs = require("@cosmic-plus/jsutils/tabs")
const { __ } = require("@cosmic-plus/i18n")

const AssetGui = require("./asset-gui")
const global = require("./global")
const marketData = require("./market-data")

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
    if (asset && asset.globalPrice && asset.code !== global.currency) {
      this.chart = new PortfolioGui.Chart(asset)
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

    parent.portfolio.trap("total", () => this.sort())
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
    parent.portfolio.trap("total", () => {
      // For some unknow reason the timeout makes the chart draw better.
      setTimeout(() => this.makePie(), 1)
    })
  }

  makePie () {
    if (this.chart) this.chart.destroy()
    this.chart = Highcharts.chart(this.container, {
      title: "",
      chart: {
        type: "pie",
        backgroundColor: "#fbfbfd"
      },
      colors: [
        "rgba(231,  76,  60, 0.8)",
        "rgba(230, 126,  34, 0.8)",
        "rgba(242, 202,  39, 0.8)",
        "rgba(46,  204, 112, 0.8)",
        "rgba(52,  152, 219, 0.8)",
        "rgba(155,  89, 182, 0.8)",

        "rgba(231,  76,  60, 0.6)",
        "rgba(230, 126,  34, 0.6)",
        "rgba(242, 202,  39, 0.6)",
        "rgba(46,  204, 112, 0.6)",
        "rgba(52,  152, 219, 0.6)",
        "rgba(155,  89, 182, 0.6)",

        "rgba(231,  76,  60, 0.4)",
        "rgba(230, 126,  34, 0.4)",
        "rgba(242, 202,  39, 0.4)",
        "rgba(46,  204, 112, 0.4)",
        "rgba(52,  152, 219, 0.4)",
        "rgba(155,  89, 182, 0.4)"
      ],
      tooltip: {
        style: { fontSize: "14px" },
        pointFormat: `
${__("Amount")}: {point.niceAmount} {point.code}<br>
${__("Price")}: {point.nicePrice} ${global.currency}<br>
<b>${__("Value")}: {point.y} ${global.currency}</b>
`
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          animation: false,
          cursor: "pointer",
          dataLabels: {
            enabled: true,
            format:
              "{point.niceAmount} {point.code}<br>({point.percentage:.0f}%)",
            style: { fontSize: "14px" }
          },
          point: {
            events: {
              select: x => this.parent.select(x.target.options)
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
            .sort((a, b) => b.value - a.value)
        }
      ],
      credits: { enabled: false }
    })
  }
}

function makeAssetPoint (asset) {
  const assetPoint = Object.create(asset)
  assetPoint.y = Number(nice(asset.value, 2))
  assetPoint.niceAmount = nice(asset.amount)
  assetPoint.nicePrice = nice(asset.price)
  return assetPoint
}

PortfolioGui.Chart = class PortfolioChart extends Gui {
  constructor (asset) {
    super(`
      <section><h3>${asset.code} ${__("to")} ${global.currency}</h3>
        <div -ref=%container><p>${__("Loading...")}</p></div>
      </section>
    `)

    this.asset = asset
    this.listen("destroy", () => this.chart && this.chart.destroy())
    marketData.assetHistory(asset).then(data => this.makeChart(data))
  }

  makeChart (data) {
    this.chart = Highcharts.stockChart(this.container, {
      rangeSelector: { selected: 2 },
      chart: {
        backgroundColor: "#fbfbfd"
      },
      yAxis: [
        { labels: { align: "left" }, height: "80%", resize: { enabled: true } },
        { labels: { align: "left" }, top: "80%", height: "20%", offset: 0 }
      ],
      series: [
        {
          type: "spline",
          name: "Price",
          data: data.map(x => [x.time, +nice(x.price)])
        },
        {
          type: "column",
          name: "Volume",
          data: data.map(x => [x.time, x.volume]),
          yAxis: 1
        }
      ],
      credits: { enabled: false }
    })
  }
}

/**
 * Export
 */

module.exports = PortfolioGui
