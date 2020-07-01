"use strict"
/**
 * Theme for Highstock
 */
const Highstock = require("highcharts/highstock")

/**
 * Theme Colors
 */
const primaryLight = "#daeeff"
const primaryDark = "#003f90"
const white = "#fff"
const black = "#292929"
const greyLight = "#eaeaea"
const greyMedium = "#a9a9a9"
const greyDark = "#545454"

/**
 * Main Theme
 */

Highstock.theme = {
  rangeSelector: {
    selected: 2,
    inputBoxBorderColor: greyMedium,
    buttonTheme: {
      fill: greyLight,
      states: {
        hover: { fill: primaryLight },
        select: { fill: primaryDark, style: { color: white } }
      }
    }
  },

  chart: {
    backgroundColor: white,
    style: {
      fontFamily: "'Source Sans Pro', arial, sans-serif",
      color: black
    }
  },

  xAxis: {
    lineColor: greyMedium,
    tickColor: greyMedium
  },

  yAxis: {
    lineColor: greyMedium,
    tickColor: greyMedium
  },

  navigator: {
    maskFill: "rgba(119, 153, 213, 0.07)",
    outlineColor: greyMedium,
    xAxis: { gridLineColor: greyMedium },
    series: { color: primaryDark }
  },

  tooltip: { style: { fontSize: "16px" } },
  scrollbar: { enabled: false },
  credits: { enabled: false },

  plotOptions: {
    column: {
      color: greyDark,
      dataGrouping: { enabled: false }
    },

    pie: {
      allowPointSelect: true,
      animation: false,
      cursor: "pointer",
      dataLabels: { style: { fontSize: "16px" } }
    },

    spline: {
      color: primaryDark,
      dataGrouping: { enabled: false }
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
