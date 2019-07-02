"use strict"
/**
 * Asset Price Chart
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

module.exports = class AssetPriceChart extends Gui {
  constructor (asset) {
    super(`
      <section><h3>${asset.code} ${__("to")} ${global.currency}</h3>
        <div -ref=%container><p>${__("Loading...")}</p></div>
      </section>
    `)

    this.asset = asset

    asset.getHistoricPrice().then(data => this.drawChart(data))
    this.listen("destroy", () => this.chart && this.chart.destroy())
  }

  drawChart (data) {
    this.chart = Highstock.stockChart(this.container, {
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
      ]
    })
  }
}
