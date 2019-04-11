"use_strict"
/**
 * Compute portfolio data from Account object.
 */
const axios = require("@cosmic-plus/base/axios")
const cosmicLib = require("cosmic-lib")
const Mirrorable = require("@cosmic-plus/jsutils/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/projectable")
const { timeout } = require("@cosmic-plus/jsutils/misc")
const { __ } = require("@cosmic-plus/i18n")

const Asset = require("./asset")
const Balance = require("./balance")
const global = require("./global")
// const History = require("./portfolio-history")
const Offers = require("./offers")

/**
 * Class
 */

module.exports = class Portfolio extends Projectable {
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
      return this.assets
        .filter(asset => asset.isSupported)
        .reduce((sum, x) => sum + x.value, 0)
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
      const asset = balance.asset

      if (this.assets.indexOf(asset) === -1) {
        this.assets.push(asset)
        this.balances.push(balance)
        asset.watch(this, "total", () => asset.compute("share"))
        asset.getInfo()
      } else if (this.balances.indexOf(balance) === -1) {
        this.balances.push(balance)
      }
    }

    if (this.new) {
      delete this.new
      await Asset.refreshPrices()
      this.offers = Offers.forPortfolio(this)
      await this.offers.stream()
      this.trigger("open")
    }
  }
}

/**
 * Extension
 */

Asset.define("share", "value", function () {
  return global.portfolio && 100 * this.value / global.portfolio.total
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
