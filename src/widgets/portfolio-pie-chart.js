"use strict"
/**
 * Portfolio Pie Chart
 */
const Highstock = require("highcharts/highstock")
require("./helpers/highstock-theme")

const Gui = require("@cosmic-plus/domutils/es5/gui")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = require("@cosmic-plus/i18n")

const global = require("../logic/global")

/**
 * Class
 */

module.exports = class PortfolioPieChart extends Gui {
  constructor (portfolio) {
    super(`
<div class="PortfolioPieChart">
  <h3>${__("Repartition by Asset")}</h3>

  <div -ref=%container align="center"></div>
</div>
    `)
    this.portfolio = portfolio

    this.watch(this.portfolio, "total", () => this.draw())
    this.listen("destroy", () => this.chart && this.chart.destroy())
  }

  reflow () {
    if (this.chart) this.chart.reflow()
  }

  draw () {
    if (this.chart) this.chart.destroy()

    this.chart = Highstock.chart(this.container, {
      colors: Highstock.pieColors,
      responsive: Highstock.pieResponsive,

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
              select: x => this.selected = x.target.options.asset,
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
          data: this.portfolio.assets
            .filter(asset => asset.value)
            .map(makePoint)
            .sort((a, b) => b.y - a.y)
        }
      ]
    })
  }
}

/**
 * Helpers
 */

function makePoint (asset) {
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
