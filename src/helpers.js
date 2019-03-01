"use_strict"
/**
 * Various helpers
 */

const helpers = exports

helpers.isOverflowing = function (element) {
  return (
    element.scrollHeight > element.clientHeight
    || element.scrollWidth > element.clientWidth
  )
}
