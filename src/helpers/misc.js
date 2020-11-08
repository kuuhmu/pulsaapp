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
 * Returns **value1** if its absolute is lesser than or equal **value2**
 * absolute, else returns **value2**.
 */
misc.absoluteMin = function (value1, value2) {
  return Math.abs(value1) <= Math.abs(value2) ? value1 : value2
}

/**
 * Return whether or not **array** contains **value**.
 */
misc.arrayContains = function (array, value) {
  return array.indexOf(value) !== -1
}

/**
 * Remove all the occurences of **item** from **array**.
 */
misc.arrayRemove = function (array, item) {
  for (let index = array.length - 1; index >= 0; index--) {
    if (array[index] === item) array.splice(index, 1)
  }
}

/**
 * Returns values that are in **array1** but not in **array2**.
 */
misc.arrayOnlyInFirst = function (array1, array2) {
  return array1.filter((item) => !misc.arrayContains(array2, item))
}

/**
 * Sum array values, or array elements `key` if specified.
 */
misc.arraySum = function (array, key) {
  if (key) return array.reduce((sum, obj) => sum + obj[key], 0)
  else return array.reduce((sum, x) => sum + x, 0)
}

/**
 * Proportionally scale **array** values, or **array** elements **key** property
 * if provided, to make their sum equal **targetSum**.
 */
misc.arrayScale = function (array, targetSum, key) {
  const sum = misc.arraySum(array, key)
  if (!sum) return array.map(() => 0)

  if (key) return array.map((obj) => obj[key] * targetSum / sum)
  else return array.map((x) => x * targetSum / sum)
}
