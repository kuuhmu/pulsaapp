"use_strict"
/**
 * Asset class
 */

const AUTO_REFRESH_PRICES = true
const CRYPTO_PRICES_REFRESH_DELAY = 60 * 1000
const FIAT_PRICES_REFRESH_DELAY = 60 * 60 * 1000
const FIAT_BASEURL = "https://www.xe.com/themes/xe/images/flags/svg/"
const FIAT_IMAGEFORMAT = ".svg"

const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const global = require("./global")
const marketData = require("./market-data")
const Orderbook = require("./orderbook")

/**
 * Class
 */

const Asset = module.exports = class Asset extends Projectable {
  static resolve (id) {
    return Asset.table[id] || new Asset(id)
  }

  constructor (id) {
    super()

    this.id = id
    Asset.table[id] = this

    // Empty image by default
    this.image = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="

    if (Asset.info[id]) {
      this.code = id
      Object.assign(this, Asset.info[id])
      if (this.type === "fiat") {
        Asset.fiats.push(this)
        this.image = `${FIAT_BASEURL}${id.toLowerCase()}${FIAT_IMAGEFORMAT}`
      } else {
        Asset.cryptos.push(this)
        this.type = "crypto"
      }
    } else {
      this.code = id.replace(/:.*/, "")
      this.name = this.code
      this.type = "unknown"
    }

    this.anchors = new Mirrorable()
    this.balances = new Mirrorable()
    this.offers = new Mirrorable()
    this.autoUpdatePrice = AUTO_REFRESH_PRICES

    this.balances.mirror(balance => {
      this.anchors.push(balance.anchor)
      this.watch(balance, "amount", () => this.compute("amount"))
      this.watch(balance, ["buying", "selling"], () => {
        this.compute("liabilities")
      })
    })

    this.orderbook = Orderbook.forAsset(this)
    this.define("price", "globalPrice", () => {
      return this.globalPrice || this.orderbook.price
    })
    this.watch(this.orderbook, "price", () => this.compute("price"))
  }

  async getInfo () {
    // Happens once & only for cryptos.
    if (this.name || this.type !== "crypto") return
    this.info = await marketData.crypto.info(this)
    this.name = this.info.name
    this.image = this.info.image.small
  }

  addOrderbook (orderbook) {
    this.orderbook.addChild(orderbook)
  }
}

Asset.define("amount", "balances", function () {
  return this.balances && this.balances.reduce((sum, el) => sum + el.amount, 0)
})

Asset.define("value", ["amount", "price"], function () {
  return this.amount === 0 ? 0 : this.amount * this.price
})

Asset.define("liabilities", ["balances", "price"], function () {
  if (this.balances) {
    const rawLiabilities = this.balances.reduce(
      (sum, entry) => sum + entry.buying - entry.selling,
      0
    )
    return this.price * rawLiabilities
  }
})

Asset.define("isSupported", ["type", "price"], function () {
  return !!(this.type !== "unknown" || this.price)
})

/**
 * Utilities
 */

Asset.refreshPrices = async function (array) {
  if (!array) {
    await Asset.refreshCryptoPrices()
    await Asset.refreshFiatPrices()
  } else {
    await Asset.refreshCryptoPrices(
      array.filter(asset => asset.type === "crypto").map(asset => asset.code)
    )
    await Asset.refreshFiatPrices(
      array.filter(asset => asset.type === "fiat").map(asset => asset.code)
    )
  }
}

Asset.refreshCryptoPrices = async function (assets = Asset.cryptos) {
  if (!assets.length) return
  const prices = await marketData.crypto.prices(assets)
  assets.forEach(asset => {
    if (asset.autoUpdatePrice) asset.globalPrice = prices[asset.code]
  })
}

Asset.refreshFiatPrices = async function (fiats = Asset.fiats) {
  if (!fiats.length) return
  const prices = await marketData.fiat.prices(fiats)
  fiats.forEach(asset => {
    if (asset.autoUpdatePrice) asset.globalPrice = prices[asset.code]
  })
}

/**
 * Known Assets
 */

Asset.info = {
  USD: { type: "fiat", name: "US Dollar" },
  EUR: { type: "fiat", name: "Euro" },
  CNY: { type: "fiat", name: "Renminbi" },

  BTC: { apiId: "bitcoin" },
  ETH: { apiId: "ethereum" },
  XRP: { apiId: "ripple" },
  XLM: { apiId: "stellar" },
  KIN: { apiId: "kin" },
  BAT: { apiId: "basic-attention-token" },
  ZRX: { apiId: "0x" },
  BCH: { apiId: "bitcoin-cash" },
  STEEM: { apiId: "steem" },
  SBD: { apiId: "steem-dollar" },
  LINK: { apiId: "chainlink" },

  SLT: { apiId: "smartlands" },
  MOBI: { apiId: "mobius" },
  SHX: { apiId: "stronghold-token" },
  RMT: { apiId: "sureremit" },
  TERN: { apiId: "ternio" },
  PEDI: { apiId: "pedity" },
  GRAT: { apiId: "gratz" },
  REPO: { apiId: "repo" }
}

/**
 * Init
 */

Asset.table = {}
Asset.cryptos = []
Asset.fiats = []
new Asset(global.currency)

// Automatic global price refresh
if (AUTO_REFRESH_PRICES) {
  setInterval(Asset.refreshCryptoPrices, CRYPTO_PRICES_REFRESH_DELAY)
  setInterval(Asset.refreshFiatPrices, FIAT_PRICES_REFRESH_DELAY)
}

// eslint-disable-next-line no-console
console.log(Asset.table)
