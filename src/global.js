"use_require"
/**
 * Global variables
 */
const Projectable = require("@cosmic-plus/jsutils/projectable")
const i18n = require("@cosmic-plus/i18n")

const global = module.exports = new Projectable()

/// Current reference currency.
global.currency = localStorage.currency || "USD"
global.project("currency", localStorage)

// Current language
global.language =
  localStorage.language || i18n.systemLocale().replace(/-.*/, "")
global.project("language", localStorage)

/// Current user portfolio.
global.portfolio = undefined

/// Order type to use when rebalancing
global.rebalancingStrategy = "balance"

/// Rebalancing threshold
global.threshold = 0.01

/// Main navigation
global.tabs = null
