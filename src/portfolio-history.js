"use_strict"
/**
 * Portfolio historical balances & value.
 *
 * @exports portfolioHistory
 */

// const cc = require("cryptocompare")
const cosmicLib = require("cosmic-lib")
const loopcall = require("@cosmic-plus/loopcall")

const Asset = require("./asset")
const global = require("./global")

/**
 * Balances history
 *
 * Start from current state and derive history by looking at past transactions.
 */

const History = module.exports = class History extends Array {
  static async forPortfolio (portfolio) {
    if (portfolio.history) return portfolio.history
    const history = portfolio.history = new History("portfolio")
    await getPortfolioHistory(history, portfolio)
    return history
  }

  static async forAccount (account) {
    if (account.history) return account.history
    const history = account.history = new History("account")
    await getAccountHistory(history, account)
    return history
  }

  static async forAsset (asset) {
    if (asset.history) return asset.history
    const history = asset.history = new History("asset")
    await getAssetHistory(history, asset)
    return history
  }

  constructor (type) {
    super()
    this.type = type
  }

  async getPrices () {
    switch (this.type) {
    case "portfolio":
      await getPortfolioPrices(this)
      break
    }
  }
}

async function getPortfolioHistory (history, portfolio) {
  history.assets = {}

  const accountHistory = await History.forAccount(portfolio.account)
  accountHistory.forEach(day => {
    history.unshift({ date: day.date })
    for (let entry in day) {
      if (typeof day[entry] !== "object") continue
      const [rawCode] = entry.split(":")
      const code = Asset.resolve(rawCode).code
      if (!history.assets[code]) history.assets[code] = true
      if (!history[0][code]) history[0][code] = { amount: day[entry].amount }
      else history[0][code].amount += day[entry].amount
    }
  })

  return history
}

async function getPortfolioPrices (history) {
  for (let code in history.assets) {
    if (typeof history.assets[code] !== "boolean") continue
    const asset = Asset.resolve(code)
    history.assets[code] = await History.forAsset(asset)
  }
}

async function getAccountHistory (history, account) {
  const records = await effectsForAccount(account)
  // const strRecords = records.map(JSON.stringify)
  // localStorage["effects:" + account.id] = strRecords
  // const strRecords = localStorage["effects:" + account.id]
  // const records = JSON.parse(strRecords)

  /// Set the current balances first.
  let date = dailyDate(new Date())
  const day = {}
  account.balances.map(entry => {
    const { balance, asset_code, asset_issuer } = entry
    const id = makeAssetId(asset_code, asset_issuer)
    day[id] = { amount: +balance }
  })
  day.date = date
  history.unshift(day)

  records.forEach(record => {
    /// Go backward in time.
    const newDate = dayBefore(record.created_at)
    if (newDate !== date) {
      history.unshift(makeNewDay(history[0]))
      date = history[0].date = newDate
    }

    const func = effectHandler[record.type]
    if (func) func(history[0], record)
    else {
      console.error(`Missing type handler: ${record.type}`)
      console.error(record)
    }
  })
}

function makeNewDay (day) {
  const newDay = Object.assign({}, day)
  for (let key in newDay) {
    newDay[key] = Object.assign({}, day[key])
  }
  return newDay
}

async function getAssetHistory (history, asset) {
  // const prices = await cc.histoDay(asset.code, global.currency, {
  //   limit: "none"
  // })
}

/**
 * Effect handlers
 */

const effectHandler = {}

effectHandler.trade = function (day, record) {
  const bought = makeAssetId(
    record.bought_asset_code,
    record.bought_asset_issuer
  )
  const sold = makeAssetId(record.sold_asset_code, record.sold_asset_issuer)
  day[bought].amount = round7(day[bought].amount - record.bought_amount)
  day[sold].amount = round7(day[sold].amount + +record.sold_amount)
}

effectHandler.account_credited = function (day, record) {
  const asset = makeAssetId(record.asset_code, record.asset_issuer)
  day[asset].amount = round7(day[asset].amount + +record.amount)
}

effectHandler.account_debited = function (day, record) {
  const asset = makeAssetId(record.asset_code, record.asset_issuer)
  day[asset].amount = round7(day[asset].amount - record.amount)
}

effectHandler.trustline_created = function (day, record) {
  const asset = makeAssetId(record.asset_code, record.asset_issuer)
  delete day[asset]
}

effectHandler.trustline_removed = function (day, record) {
  const asset = makeAssetId(record.asset_code, record.asset_issuer)
  day[asset] = { amount: 0 }
}

effectHandler.trustline_updated = () => {}

/**
 * Stellar helpers
 */

async function effectsForAccount (account) {
  const server = cosmicLib.resolve.server()
  const callBuilder = server
    .effects()
    .forAccount(account.id)
    .order("desc")
  return loopcall(callBuilder, { limit: 200 })
}

function makeAssetId (code, issuer) {
  if (!code) return "XLM"
  else return `${code}:${issuer}`
}

/**
 * Generic helpers
 */

function dailyDate (date) {
  if (date instanceof Date) date = date.toISOString()
  return date.replace(/T.*/, "")
}

function dayBefore (ISOString) {
  const date = new Date(ISOString)
  date.setDate(date.getDate() - 1)
  return dailyDate(date)
}

function round7 (number) {
  return +Number(number).toFixed(7)
}
