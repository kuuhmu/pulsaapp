"use strict"
/**
 * Markets statistics & data
 *
 * @exports marketData
 */
const marketData = exports

const axios = require("@cosmic-plus/base/es5/axios")
const nice = require("@cosmic-plus/jsutils/es5/nice")

const global = require("./global")
const History = require("./history")

/**
 * Generic price/history
 */

marketData.assetHistory = async function (asset, limit = 1000) {
  // Remove old prices cache from version <= 0.9.1
  // REMOVAL: 2020-07 (one year)
  delete localStorage[`prices.${asset.code}`]

  const cache = History.getCache(asset.id)

  if (cache) {
    const missing = History.missingDays(cache)
    if (!missing) return cache
    if (cache.length) limit = missing + 1
  }

  const newData = await getPriceHistory(asset, limit)
  if (!newData) return

  const history = cache ? History.join(cache, newData) : newData
  History.cut(history, 1000)

  History.setCache(asset.id, history)
  return history
}

function getPriceHistory (asset, limit) {
  if (asset.type === "crypto") return marketData.crypto.history(asset, limit)
  else if (asset.type === "fiat") return marketData.fiat.history(asset, limit)
}

/**
 * Crypto price/history by "https://www.coingecko.com"
 */

marketData.crypto = {}

function coingeckoCall (page, params) {
  return axios.get(`https://api.coingecko.com/api/v3/${page}`, { params })
}

marketData.crypto.list = async function () {
  const response = await coingeckoCall("coins/list")
  const list = {}
  response.data.forEach(entry => {
    const symbol = entry.symbol.toUpperCase()
    list[symbol] = { apiId: entry.id, name: entry.name }
  })
  return list
}

marketData.crypto.stellarNative = async function () {
  const response = await coingeckoCall("exchanges/stellar_term")
  return response.data.tickers.map(x => x.coin_id).filter(x => x)
}

marketData.crypto.info = async function (asset) {
  const response = await coingeckoCall(`coins/${asset.apiId}`, {
    localization: false,
    tickers: false,
    market_data: false,
    community_data: false,
    developer_data: false,
    sparkline: false
  })
  return response.data
}

marketData.crypto.prices = async function (assets) {
  const ids = assets.map(asset => asset.apiId).join(",")
  const quote = global.currency.toLowerCase()
  const response = await coingeckoCall("simple/price", {
    ids,
    vs_currencies: quote
  })
  const prices = {}
  assets.forEach(asset => {
    const assetData = response.data[asset.apiId]
    if (assetData) prices[asset.code] = assetData[quote]
  })
  return prices
}

marketData.crypto.history = async function (asset, limit = 1000) {
  const response = await coingeckoCall(`coins/${asset.apiId}/market_chart`, {
    vs_currency: global.currency,
    days: Math.max(limit, 100)
  })

  const data = response.data.prices.map((record, index) => {
    return {
      time: record[0],
      price: record[1],
      // volume: response.data.total_volumes[index][1]
      volume: +nice(response.data.total_volumes[index][1] / record[1])
    }
  })

  // Work around end of serie inconsistencies.
  const today = History.today()
  if (data[data.length - 2].time === today) {
    data.length = data.length - 1
  } else {
    History.latest(data).time = today
  }

  if (limit < 100) History.cut(data, limit)
  return data
}

/**
 * Fiat prices / history by "https://exchangeratesapi.io"
 */

marketData.fiat = {}

async function exchangeratesCall (page, symbols, params = {}) {
  params.base = global.currency
  if (typeof symbols === "string") {
    params.symbols = symbols
  } else {
    if (global.currency === "EUR") symbols = symbols.filter(x => x !== "EUR")
    params.symbols = symbols.join(",")
  }
  params.source = "equilibre.io"

  return axios
    .get(`https://api.exchangeratesapi.io/${page}`, { params })
    .then(response => {
      if (global.currency === "EUR" && !response.data.start_at) {
        response.data.rates.EUR = 1
      }
      return response
    })
}

marketData.fiat.prices = async function (assets) {
  const symbols = assets.map(asset => asset.code)
  const response = await exchangeratesCall("latest", symbols)
  const data = response.data.rates
  for (let symbol in data) {
    data[symbol] = nice(1 / data[symbol], 8)
  }
  return data
}

marketData.fiat.history = async function (asset, limit = 1000) {
  const end_at = new Date().toISOString().slice(0, 10)
  const today = new Date(end_at)
  today.setDate(today.getDate() - limit)
  const start_at = today.toISOString().slice(0, 10)

  // Exchangeratesapi doesn't returns EUR/EUR rate.
  if (global.currency === "EUR" && asset.id === "EUR") {
    return [{ time: History.today(), price: 1 }]
  }

  // Get history.
  const response = await exchangeratesCall("history", asset.code, {
    start_at,
    end_at
  })

  // Format data.
  const data = Object.keys(response.data.rates)
    .sort()
    .map(date => {
      return {
        time: History.time(date),
        price: +nice(1 / response.data.rates[date][asset.code], 8)
      }
    })

  // Add today's entry.
  if (History.latest(data).time !== History.today()) {
    data.push({
      time: History.today(),
      price: History.latest(data).price
    })
  }

  return data
}
