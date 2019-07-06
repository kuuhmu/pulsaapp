"use strict"
/**
 * Compute portfolio data from Account object.
 */
const axios = require("@cosmic-plus/base/es5/axios")
const cosmicLib = require("cosmic-lib")
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")
const { timeout } = require("@cosmic-plus/jsutils/es5/misc")
const { __ } = require("@cosmic-plus/i18n")

const Asset = require("./asset")
const Balance = require("./balance")
const global = require("./global")
const Offers = require("./offers")

const portfolioHistoricValue = require("./portfolio-historic-value")

const {
  arrayContains,
  arrayRemove,
  arraySum,
  arrayOnlyInFirst
} = require("../helpers/misc")
/**
 * Class
 */

class Portfolio extends Projectable {
  static async resolve (address) {
    await checkNetwork()

    const destination = await cosmicLib.resolve.address(address)
    if (destination.memo)
      throw new Error(__("Invalid federated address: shared account."))
    if (await cosmicLib.resolve.isAccountEmpty(destination.account_id))
      throw new Error(__("Empty account"))

    const portfolio = new Portfolio(destination.account_id)
    cosmicLib.config.source = portfolio.address = address
    portfolio.streamAccount()

    return portfolio
  }

  constructor (accountId) {
    super()

    // eslint-disable-next-line no-console
    console.log(this)

    this.accountId = accountId
    this.assets = new Mirrorable()
    this.balances = new Mirrorable()
    this.accountCallBuilder = Portfolio.accountCallBuilder(accountId)

    this.define("total", "assets", () => {
      const assets = this.assets.filter(asset => asset.isSupported)
      return arraySum(assets, "value")
    })
    this.assets.mirror(asset =>
      this.watch(asset, ["value", "isSupported"], () => this.compute("total"))
    )

    this.new = true
  }

  static accountCallBuilder (accountId) {
    const server = cosmicLib.resolve.server()
    return server.accounts().accountId(accountId)
  }

  async streamAccount () {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await this.getAccount()
      await timeout(5000)
    }
  }

  async getAccount () {
    try {
      const account = await this.accountCallBuilder.call()
      this.ingest(account)
    } catch (error) {
      console.error(error)
    }
  }

  async ingest (account) {
    this.account = account

    for (let index in account.balances) {
      const balance = Balance.ingest(account.balances[index])
      this.maybeAddBalance(balance)

      if (balance.id === "XLM") {
        balance.asset.amountMin = Portfolio.accountMinimumBalance(account)
      }
    }

    if (this.new) {
      delete this.new
      await Asset.refreshPrices()
      this.offers = Offers.forPortfolio(this)
      await this.offers.stream()
      this.trigger("open")
      Asset.getAllInfo()
    }
  }

  maybeAddBalance (balance) {
    if (!arrayContains(this.balances, balance)) {
      this.balances.push(balance)
      balance.asset.maybeAddBalance(balance)
    }
    this.maybeAddAsset(balance.asset)
  }

  maybeAddAsset (asset) {
    if (arrayContains(this.assets, asset)) return

    this.assets.push(asset)
    asset.watch(this, "total", () => asset.compute("share"))
    asset.getInfo()
  }

  maybeRemoveBalance (balance) {
    arrayRemove(this.balances, balance)
    balance.asset.maybeRemoveBalance(balance)
    this.maybeRemoveAsset(balance.asset)
  }

  maybeRemoveAsset (asset) {
    if (asset.balances.length) return
    // TODO: unwatch
    arrayRemove(this.assets, asset)
  }
}

/**
 * Utilities
 */

/**
 * Returns the minimum XLM balance for an account. It includes the mandatory
 * network reserve, the required amount to support 1 open offer for each
 * trustline, and an additional 0.5 Lumens to cover for fees & algorithm
 * rounding issues.
 */
Portfolio.accountMinimumBalance = function (account) {
  const baseReserve = 0.5

  let entries = (account.balances.length - 1) * 2 // Reserve an offer entry
  entries += Object.keys(account.data_attr).length
  entries += account.signers.length - 1

  return (3 + entries) * baseReserve
}

/**
 * List known assets for which account doesn't have any trustline.
 */
Portfolio.prototype.availableAssets = function () {
  const allAssets = Object.values(Asset.table)
  return arrayOnlyInFirst(allAssets, this.assets)
}

/**
 * Download & compute portfolio history.
 */
Portfolio.prototype.getHistory = async function () {
  if (!this.history) this.history = await portfolioHistoricValue(this)
  return this.history
}

/**
 * Extension
 */

Asset.define("share", "value", function () {
  return global.portfolio && this.value / global.portfolio.total
})

/**
 * Helpers
 */

async function checkNetwork () {
  const horizon = cosmicLib.resolve.horizon()
  try {
    await axios.get(horizon)
  } catch (error) {
    throw new Error(__("Can't connect to the Stellar blockchain"))
  }
}

/**
 * Export
 */
module.exports = Portfolio
