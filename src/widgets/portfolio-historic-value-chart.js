"use strict"
/**
 * Portfolio Historic Value Chart
 */
const Highstock = require("highcharts/highstock")
require("./helpers/highstock-theme")

const Gui = require("@cosmic-plus/domutils/es5/gui")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = require("@cosmic-plus/i18n")

const Asset = require("../logic/asset")
const global = require("../logic/global")

/**
 * Definition
 */

module.exports = class PortfolioHistoryChart extends Gui {
  constructor (portfolio) {
    super(`
<div class="PortfolioHistoryChart">
  <h3>${__("Portfolio Historical Value")}</h3>

  <div -ref=%container>
    <p>
      ${__("Downloading historical data...")}
      <span class="spinner"></span>
    </p>
    <p>
      ${__("The very first time, it may take about a minute.")}
  </div>

</div>
    `)

    this.portfolio = portfolio
    this.portfolio.getHistory().then(history => this.drawChart(history))
    this.listen("destroy", () => this.chart && this.chart.destroy())
  }

  reflow () {
    if (this.chart) {
      // Work around a rangeSelector position bug.
      if (!this.hasBeenReflown) {
        setTimeout(() =>
          this.chart.update({ rangeSelector: { enabled: true } })
        )
      }
      this.chart.reflow()
    }
    this.hasBeenReflown = true
  }

  drawChart (history) {
    const series = this.historyToSeries(history)

    this.chart = Highstock.stockChart(this.container, {
      chart: { type: "area" },

      navigator: {
        series: {
          data: history.map(x => [x.time, +nice(x.total) || null])
        }
      },

      tooltip: {
        shared: true,
        split: false,
        pointFormat: `
<span style="color:{point.color}">\u25CF</span>
{series.name}: {point.percentage:.0f}%
<br>`,
        footerFormat: `<b>Total: {point.total} ${global.currency}</b>`
      },

      yAxis: [
        {
          labels: {
            align: "left",
            formatter: function () {
              return `${this.value} ${global.currency}`
            }
          },
          resize: { enabled: true }
        }
      ],

      plotOptions: {
        series: {},
        area: {
          stacking: "normal",
          connectNulls: true,
          lineWidth: 0,
          states: {
            hover: { enabled: false },
            inactive: { enabled: false }
          }
        }
      },

      series,
      colors: Highstock.pieColors
    })

    // Work around a rangeSelector position bug.
    if (!this.hasBeenReflown) {
      this.chart.update({ rangeSelector: { enabled: false } })
    }
  }

  historyToSeries (history) {
    const series = []

    const assets = Object.values(Asset.table).filter(a => a.hasBeenHeld)
    assets.sort((a, b) => b.value - a.value)

    // Main assets historical values.
    assets.forEach(asset => {
      let isEmpty = true
      const data = history.map(day => {
        const value = +nice(day.filtered[asset.id], 2) || null
        if (value) isEmpty = false
        return [day.time, value]
      })
      if (!isEmpty) series.push({ name: asset.id, data })
    })

    // Add merged marginal balances.
    series.push({
      name: __("Others"),
      color: "#DDD",
      data: history.map(x => [x.time, +nice(x.filtered.others, 2)])
    })

    return series
  }
}
