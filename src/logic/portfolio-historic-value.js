"use strict"
/**
 * Compute Historic Value from historic balances
 */
const Asset = require("./asset")
const portfolioHistoricBalances = require("./portfolio-historic-balances")
const { arraySum } = require("../helpers/misc")

/**
 * Function
 */

module.exports = async function portfolioHistoricValue (portfolio) {
  const history = await portfolioHistoricBalances(portfolio)
  const assets = markHeldAssets(history)
  const historicPrices = await getHistoricPrices(assets)

  history.forEach(day => {
    shrinkHistoricPrices(day.time, historicPrices)
    computeDayValues(day, historicPrices)
  })

  // eslint-disable-next-line no-console
  console.log(history)
  return history
}

function markHeldAssets (history) {
  const ids = {}
  history.forEach(day => {
    Object.keys(day.asset).forEach(key => ids[key] = true)
  })

  const assets = Object.keys(ids).map(Asset.resolve)
  assets.forEach(asset => asset.hasBeenHeld = true)
  return assets
}

/**
 * Returns an object containing the historic price of each **asset**.
 */
async function getHistoricPrices (assets) {
  const historicPrices = {}

  const promises = assets.map(asset => asset.getHistoricPrice())
  await Promise.all(promises)

  assets.forEach(asset => {
    if (asset.historicPrice) historicPrices[asset.id] = asset.historicPrice
  })

  return historicPrices
}

/**
 * Remove oldest prices from **historicPrices** until the first element of each
 * serie is the price just before **time**.
 */
function shrinkHistoricPrices (time, historicPrices) {
  for (let asset in historicPrices) {
    const prices = historicPrices[asset]
    const index = prices.findIndex(entry => entry.time > time)
    if (index > 1) historicPrices[asset] = prices.slice(index - 1)
    else if (index === -1) historicPrices[asset] = prices.slice(-1)
  }
}

/**
 * Computes `price` & `value` fields for portfolio history using
 * **historicPrices**.
 */
function computeDayValues (day, historicPrices) {
  day.price = {}
  day.value = {}
  day.total = 0

  // Compute each asset value at `day.time` as well as the portfolio total.
  for (let asset in day.asset) {
    day.price[asset] = historicPrices[asset]
      ? historicPrices[asset][0].price
      : 0
    day.value[asset] = day.asset[asset] * day.price[asset]
    day.total += day.value[asset]
  }

  // Filter data for display in chart.
  day.filtered = {}
  const marginals = []

  for (let asset in day.value) {
    const share = day.value[asset] / day.total
    if (share) {
      day.filtered[asset] = day.value[asset]
      if (share < 0.03) marginals.push(asset)
    }
  }

  if (marginals.length > 1) {
    day.filtered.others = arraySum(marginals.map(asset => day.value[asset]))
    marginals.forEach(asset => delete day.filtered[asset])
  }
}
