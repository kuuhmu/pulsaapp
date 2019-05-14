"use strict"
/**
 * Various independent helpers.
 */
const misc = exports

/**
 * Returns **number** if it is greater than 0, else returns 0.
 */
misc.positive = function (number) {
  return Math.max(0, number)
}

/**
 * Returns **number** if it is lesser than 0, else returns 0.
 */
misc.negative = function (number) {
  return Math.min(0, number)
}

/**
 * Returns **number** with 7 digits after the dot.
 */
misc.fixed7 = function (number) {
  return +Number(number).toFixed(7)
}

/**
 * Returns a number whose value is limited to the given range.
 */
misc.clamp = function (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Sum array values, or array elements `key` if specified.
 */
misc.arraySum = function (array, key) {
  if (key) return array.reduce((sum, obj) => sum + obj[key], 0)
  else return array.reduce((sum, x) => sum + x, 0)
}
