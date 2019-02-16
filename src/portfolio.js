"use_strict"
/**
 * Compute portfolio data from Account object.
 */
const axios = require("@cosmic-plus/base/axios")
const cosmicLib = require("cosmic-lib")
const Mirrorable = require("@cosmic-plus/jsutils/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/projectable")
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
    const portfolio = new Portfolio()
    portfolio.address = cosmicLib.config.source = address

    await testNetwork()

    const destination = await cosmicLib.resolve.address(address)
    if (destination.memo)
      throw new Error(__("Invalid federated address: shared account."))
    if (await cosmicLib.resolve.isAccountEmpty(destination.account_id))
      throw new Error(__("Empty account"))

    portfolio.accountId = destination.account_id

    const server = cosmicLib.resolve.server()
    const callBuilder = server.accounts().accountId(portfolio.accountId)
    const streamOptions = { onmessage: account => portfolio.ingest(account) }
    this.close = callBuilder.stream(streamOptions)

    return portfolio
  }

  constructor () {
    super()

    // eslint-disable-next-line no-console
    console.log(this)

    this.assets = new Mirrorable()
    this.balances = new Mirrorable()

    this.define("total", "assets", () => {
      return this.assets
        .filter(asset => asset.isSupported)
        .reduce((sum, x) => sum + x.value, 0)
    })
    this.assets.mirror(asset =>
      asset.trap("value", () => this.compute("total"))
    )

    this.new = true
  }

  async ingest (account) {
    this.account = account

    for (let index in account.balances) {
      const balance = Balance.ingest(account.balances[index])
      if (this.assets.indexOf(balance.asset) === -1) {
        await balance.asset.getInfo()
        this.assets.push(balance.asset)
        this.balances.push(balance)
        // TODO: check if following line trigger too much rebalancing
        this.trap("total", () => balance.asset.compute("share"))
      } else if (this.balances.indexOf(balance) === -1) {
        this.balances.push(balance)
      }
    }

    if (this.new) {
      delete this.new
      await Asset.refreshPrices()
      this.offers = await Offers.forPortfolio(this)
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

async function testNetwork () {
  const horizon = cosmicLib.resolve.horizon()
  try {
    await axios.get(horizon)
  } catch (error) {
    throw new Error(__("Can't connect to the Stellar blockchain"))
  }
}
