"use strict"
/**
 * History - Generic history data abstraction
 */
const global = require("./global")

/**
 * Definition
 */

class History extends Array {}

/**
 * Caching
 */

History.setCache = function (key, history) {
  const json = JSON.stringify({ [global.currency]: history })
  localStorage[`history:${key}`] = json
}

History.getCache = function (key) {
  const json = localStorage[`history:${key}`]
  if (json) return JSON.parse(json)[global.currency]
}

/**
 * Utilities
 */

History.cut = function (history, length) {
  const diff = history.length - length
  if (diff > 0) history.splice(0, diff)
}

History.latest = function (history) {
  return history[history.length - 1]
}

History.join = function (oldData, newData) {
  const start = newData[0].time
  const index = oldData.findIndex((day) => day.time === start)
  return oldData.slice(0, index).concat(newData)
}

/**
 * Time Calculations
 */

History.oneDay = 24 * 60 * 60 * 1000

History.today = function () {
  return History.roundTime(new Date())
}

History.roundTime = function (time) {
  const date = new Date(time)
  date.setUTCHours(0, 0, 0, 0)
  return +date
}

History.time = function (time) {
  return +new Date(time)
}

History.missingDays = function (history) {
  return History.numberToDays(History.today() - History.latest(history).time)
}

History.numberToDays = function (number) {
  return number / History.oneDay
}

/**
 * Export
 */
module.exports = History
