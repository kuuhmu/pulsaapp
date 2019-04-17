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
  localStorage.language || i18n.systemLocale().replace(/-.*/, "") || "us"
global.project("language", localStorage)

/// Current user portfolio.
global.portfolio = undefined

// How much a balance can deviate from its allocated share (percentage).
global.balanceShareDeviation = 0.2

/// Minimum offer value to setup a rebalancing operation (in Lumens).
global.minOfferValue = 1

// Maximum spread for pairs (percentage).
global.maxSpread = 0.05

// Price shift to put our offer in first position... (percentage of pair
// spread).
global.spreadTightening = 0.01

// ... But don't try to be ahead of offers whose cumulative volume is lower than
// (percentage of offer amount).
global.skipMarginalOffers = 0.1

/// Main navigation
global.tabs = null
