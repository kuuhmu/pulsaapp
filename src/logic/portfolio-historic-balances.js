"use strict"
/**
 * Account Historic Balances
 */
const cosmicLib = require("cosmic-lib")
const loopcall = require("@cosmic-plus/loopcall")

const Asset = require("./asset")
const Balance = require("./balance")
const History = require("./history")

const { fixed7 } = require("../helpers/misc")

/**
 * Function
 */

module.exports = async function portfolioHistoricBalances (
  portfolio,
  limit = 1000
) {
  const cache = History.getCache(portfolio.account.id)

  if (cache) {
    const missing = History.missingDays(cache)
    if (!missing) return cache
    if (cache.length) limit = missing + 1
  }

  const newData = await getPortfolioHistory(portfolio, limit)
  if (!newData) return

  const history = cache ? History.join(cache, newData) : newData
  History.cut(history, 1000)

  History.setCache(portfolio.account.id, history)
  return history
}

async function getPortfolioHistory (portfolio, limit = 100) {
  // Start from today...
  const day = { time: History.today(), asset: {}, balance: {} }
  portfolio.balances.forEach(balance => {
    updateBalance(day, balance, +balance.amount)
  })
  const history = [day]

  const loopUntil = Date.now() - History.oneDay * limit
  await effectsLoopcall(portfolio.accountId, {
    filter: record => ingestRecord(history, record),
    breaker: () => history[0].time < loopUntil
  })

  History.cut(history, limit)
  return history
}

function ingestRecord (history, record) {
  // ... then go back in time...
  let day = history[0]
  const recordDate = History.roundTime(record.created_at) - History.oneDay

  // ... filling each day with previous state...
  while (recordDate !== day.time) {
    day = {
      time: day.time - History.oneDay,
      asset: Object.assign({}, day.asset),
      balance: Object.assign({}, day.balance)
    }
    if (day.time === STRONGHOLD_SHUTDOWN) applyStrongholdFix(day)
    history.unshift(day)
  }

  // ... and mutating that day after recorded effects.
  const handler = handle[record.type]
  if (handler) handler(day, record)
}

function effectsLoopcall (accountId, { filter, breaker }) {
  const server = cosmicLib.resolve.server()
  const callBuilder = server
    .effects()
    .forAccount(accountId)
    .order("desc")
  return loopcall(callBuilder, { filter, breaker })
}

/**
 * Effect handlers
 */

const handle = {}

handle.trade = function (day, record) {
  const bought = recordToBalance(record, "bought")
  updateBalance(day, bought, -record.bought_amount)

  const sold = recordToBalance(record, "sold")
  updateBalance(day, sold, +record.sold_amount)
}

handle.account_credited = function (day, record) {
  updateBalance(day, recordToBalance(record), -record.amount)
}

handle.account_debited = function (day, record) {
  updateBalance(day, recordToBalance(record), +record.amount)
}

handle.trustline_removed = function (day, record) {
  updateBalance(day, recordToBalance(record), 0)
}

handle.trustline_created = function (day, record) {
  const balance = recordToBalance(record)
  if (day.balance[balance.id] !== 0) {
    console.error("Balances mismatch: ", day.balance[balance.id], record)
  }
  delete day.balance[balance.id]

  const asset = assetForBalance(balance, day)
  if (day.asset[asset.id] === 0) delete day.asset[asset.id]
}

handle.account_created = function (day) {
  day.balance.XLM = 0
  day.asset.XLM = 0
}

function updateBalance (day, balance, amount) {
  updateData(day.balance, balance.id, amount)
  const asset = assetForBalance(balance, day)
  updateData(day.asset, asset.id, amount)
}

function updateData (data, id, amount) {
  if (!data[id]) data[id] = 0
  data[id] = Math.max(0, fixed7(data[id] + amount))
}

function recordToBalance (record, prefix) {
  const codeKey = prefix ? `${prefix}_asset_code` : "asset_code"
  const issuerKey = prefix ? `${prefix}_asset_issuer` : "asset_issuer"

  if (!record[codeKey]) return Balance.resolve("XLM")
  else return Balance.resolve(record[codeKey], record[issuerKey])
}

/**
 * Special cases
 */

const STRONGHOLD_KEY1 =
  "GBSTRH4QOTWNSVA6E4HFERETX4ZLSR3CIUBLK7AXYII277PFJC4BBYOG"
const STRONGHOLD_KEY2 =
  "GBSTRUSD7IRX73RQZBL3RQUH6KS3O4NYFY3QCALDLZD77XMZOPWAVTUK"
const STRONGHOLD_SHUTDOWN = 1556582400000

/**
 * Account for Stronhold balances until they redeemed their tether the
 * 2019-04-30.
 */
function applyStrongholdFix (day) {
  for (let asset in day.asset) {
    const anchor = asset.substr(-56)
    if (anchor === STRONGHOLD_KEY1 || anchor === STRONGHOLD_KEY2) {
      const id = asset.split(":")[0]
      updateData(day.asset, id, day.asset[asset])
      delete day.asset[asset]
    }
  }
}

/**
 * Return **balance**'s asset at `day.time`, which may not be the same as today
 * as anchors have been shutdown/unpegged in the past.
 */
function assetForBalance (balance, day) {
  // Optimizations.
  if (balance.asset.id.length < 60) return balance.asset
  if (day.time > STRONGHOLD_SHUTDOWN) return balance.asset

  switch (balance.anchor.pubkey) {
  case STRONGHOLD_KEY1:
  case STRONGHOLD_KEY2:
    return Asset.table[balance.code] || balance.asset
  }
  return balance.asset
}
