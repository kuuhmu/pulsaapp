"use strict"
/**
 * Rebalancing strategies
 */
const strategy = exports

const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./global")
const { arraySum, fixed7, positive } = require("../helpers/misc")

/**
 * Applicator
 */

strategy.apply = function (target) {
  const delayed = []
  let sum = 0,
    weights = 0

  target.childs.forEach(child => {
    const mode = child.mode
    if (mode === "weight") {
      delayed.push(child)
      weights += child.size
    } else {
      strategy[mode](child)
      sum += child.value
    }
  })

  const remains = positive(target.value - sum)
  delayed.forEach(child => strategy.weight(child, remains, weights))

  checkAllocationLimits(sum, target.value, delayed.length)
  maybeThrottleTargetAmounts(target)
}

function checkAllocationLimits (allocated, available, checkUnderFlag) {
  const margin = global.misallocationTolerance

  if (allocated > available * (1 + margin)) {
    const over = +nice(allocated - available, 2)
    const overP = +nice(100 * over / available, 2)
    let msg = __("Rebalance setup is over portfolio value by")
    msg += ` ${over} ${global.currency} (${overP}%) `
    throw new Error(msg)
  } else if (!checkUnderFlag && allocated < available * (1 - margin)) {
    const under = +nice(available - allocated, 2)
    const underP = +nice(100 * under / available, 2)
    let msg = __("Rebalance setup is under portfolio value by")
    msg += ` ${under} ${global.currency} (${underP}%) `
    throw new Error(msg)
  }
}

/**
 * When not enough Lumens are available to fully rebalance the portfolio,
 * harmoniously reduce traded amounts in order to reach target in several steps
 * in a risk-managed way.
 */
function maybeThrottleTargetAmounts (target) {
  // Check if `target.amount` throttling is required.
  const Asset = require("./asset")
  const XLM = Asset.resolve("XLM")
  const liquidity = XLM.value - XLM.amountMin * XLM.price

  const buyTargets = target.childs.filter(c => c.valueDiff > 0)
  const buyValue = arraySum(buyTargets, "valueDiff")
  const misliquidity = positive(buyValue - liquidity)

  if (!misliquidity) return

  // Throttle `target.amount`.
  const sellTargets = target.childs.filter(c => c.valueDiff < 0)
  const sellValue = -arraySum(sellTargets, "valueDiff")
  const throttleRatio = 1 - positive((sellValue - misliquidity) / sellValue)

  if (!positive(throttleRatio)) {
    throw new Error(__("Not enough Lumens to trade"))
  }

  target.childs.forEach(child => {
    child.amount = fixed7(child.amount - child.amountDiff * throttleRatio)
  })
}

/**
 * Strategies
 */

strategy.amount = function (target) {
  target.amount = target.size
  target.value = target.amount * target.asset.price
  target.compute("share")
}

strategy.ignore = function (target) {
  target.value = target.asset.value
  target.amount = target.asset.amount
  target.compute("share")
}

strategy.remove = function (target) {
  target.amount = 0
  target.value = 0
  target.compute("share")
}

strategy.percentage = function (target) {
  strategy.weight(target, target.parent.value, 100)
}

strategy.weight = function (target, remains, weights) {
  if (!weights) {
    target.value = target.amount = 0
  } else {
    target.value = target.size * remains / weights
    target.amount = fixed7(target.value / target.asset.price)
  }
  target.compute("share")
}
