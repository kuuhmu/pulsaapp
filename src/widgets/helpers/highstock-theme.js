"use strict"
/**
 * Theme for Highstock
 */
const Highstock = require("highcharts/highstock")

/**
 * Main Theme
 */

Highstock.theme = {
  chart: {
    backgroundColor: "#fefefe",
    style: {
      fontFamily: "'Source Sans Pro', arial, sans-serif",
      color: "#111"
    }
  },

  tooltip: { style: { fontSize: "14px" } },
  credits: { enabled: false },

  plotOptions: {
    pie: {
      allowPointSelect: true,
      animation: false,
      cursor: "pointer",
      dataLabels: { style: { fontSize: "14px" } }
    }
  }
}

Highstock.setOptions(Highstock.theme)

/**
 * Individual Theme Components
 */

Highstock.pieColors = [
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
]

Highstock.pieResponsive = {
  rules: [
    {
      condition: { maxWidth: 500 },
      chartOptions: {
        legend: { enabled: true },
        plotOptions: {
          pie: {
            showInLegend: true,
            dataLabels: {
              format: "{point.percentage:.0f}%",
              distance: -20
            }
          }
        }
      }
    }
  ]
}
