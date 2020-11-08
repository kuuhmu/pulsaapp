"use strict"
/**
 * Login interface
 */
const dom = require("@cosmic-plus/domutils/es5/dom")
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const Tabs = require("@cosmic-plus/domutils/es5/tabs")
const params = require("@cosmic-plus/domutils/es5/params")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./logic/global")
const Portfolio = require("./logic/portfolio")

const ClickWall = require("./helpers/click-wall")
const Form = require("./helpers/form")

const ActivityGui = require("./activity-gui")
const PortfolioGui = require("./portfolio-gui")
const SettingsGui = require("./settings-gui")
const RebalanceGui = require("./rebalance-gui")

const license = new Gui(require("@cosmic-plus/assets/html/license.html"))
const welcome = new Gui(require("../bundled/welcome.html"))
const disclaimer = new Gui(require("../bundled/disclaimer.html"))

/**
 * Functions
 */

let ledger
async function loginWithLedgerWallet () {
  disconnectHardwareWallets()
  loginForm["stellar-public-key"] = null
  ledger = await getLedgerModule()
  loginForm.info(__("Please open the Stellar App in your Ledger Wallet"))
  try {
    await ledger.connect()
    loginForm["stellar-public-key"] = ledger.publicKey
    login()
  } catch (error) {
    loginForm.error(error)
  }
}

let trezor
async function loginWithTrezorWallet () {
  disconnectHardwareWallets()
  loginForm["stellar-public-key"] = null
  trezor = await getTrezorModule()
  loginForm.info(__("Please import your Trezor public key"))
  try {
    await trezor.connect()
    loginForm["stellar-public-key"] = trezor.publicKey
    login()
  } catch (error) {
    loginForm.error(error)
  }
}

function disconnectHardwareWallets () {
  if (ledger) ledger.disconnect()
  if (trezor) trezor.disconnect()
}

async function login () {
  const address = loginForm["stellar-public-key"]
  if (!address) loginForm.error(__("Please enter an address."))
  disconnectHardwareWallets()

  loginForm.info(__("Connecting to your account..."))
  params.$set({ address })

  const clickWall = new ClickWall()
  clickWall.enable()

  try {
    global.portfolio = await Portfolio.resolve(address)
    loginForm.info(`${__("Fetching market data")}...`)
    setTimeout(
      () => loginForm.info(`${__("Sorry, it takes a while (^.^)\"")}...`),
      10000
    )
    setTimeout(() => loginForm.info(`${__("Almost there")}...`), 20000)
    setTimeout(
      () => loginForm.info(`${__("I'm running, I'm running")}...`),
      30000
    )
    global.portfolio.listen("open", () => {
      initGui()
      clickWall.destroy()
    })
  } catch (error) {
    clickWall.destroy()
    loginForm.error(error)
  }
}

function initGui () {
  const portfolio = global.portfolio

  const selected = location.hash
  tabs.remove("#welcome")
  tabs.remove("#login")
  tabs.remove("#demo")
  tabs.add("#portfolio", __("Portfolio"), new PortfolioGui(portfolio))
  tabs.add("#rebalance", __("Rebalance"), new RebalanceGui(portfolio))
  tabs.add("#activity", __("Activity"), new ActivityGui(portfolio))
  tabs.add("#settings", __("Settings"), new SettingsGui())
  tabs.add("#logout", __("Logout"), () => {
    location.replace(location.href.replace(/\?.*$/, "#login"))
  })

  // Fix portfolio pie chart positioning.
  tabs.listen("select", () => {
    if (!tabs.selected) return
    const content = tabs.selected.content
    if (content.reflow) content.reflow()
  })

  tabs.select(selected)
  if (!tabs.selected) tabs.select("#portfolio")
}

/**
 * Demo Page
 */
const MYPUBKEY = "GAWO2C52D57XBT7SQL6YB3XPHFLFD2J4Z5RN7HPFZSHXJMXH72HRXNV3"
function displayDemo () {
  localStorage[`target:${MYPUBKEY}`] = demoConfig
  location.href = `?address=${MYPUBKEY}`
}

const demoConfig = `{"childs":[{"size":24,"asset":"BTC","closing":["GCNSGHUCG5VMGLT5RIYYZSO7VQULQKAJ62QA33DBC5PPBSO57LFWVV6P"]},{"size":32,"asset":"CNY"},{"size":24,"asset":"ETH"},{"size":32,"asset":"EUR"},{"size":6,"asset":"LTC"},{"size":3,"asset":"MOBI"},{"size":3,"asset":"RMT"},{"size":3,"asset":"SHX"},{"size":3,"asset":"TERN"},{"size":32,"asset":"USD","closing":["GDSRCV5VTM3U7Y3L6DFRP3PEGBNQMGOWSRTGSBWX6Z3H6C7JHRI4XFJP"]},{"size":24,"asset":"XLM"},{"size":6,"asset":"XRP"}]}`

/**
 * Module loading
 */

function getLedgerModule () {
  return import(
    /* webpackChunkName: "ledger" */ "@cosmic-plus/ledger-wallet"
  ).then((ledger) => ledger.default)
}

async function getTrezorModule () {
  const trezor = await import(
    /* webpackChunkName: "trezor" */ "@cosmic-plus/trezor-wallet"
  ).then((trezor) => trezor.default)
  trezor.register("equilibre.io", "mister.ticot@cosmic.plus")
  return trezor
}

/**
 * Init
 */

// Load known assets.
const Asset = require("./logic/asset")
const knownAssets = require("./data/assets.json")
Asset.register(knownAssets.fiat, { type: "fiat", isTether: true })
Asset.register(knownAssets.foreign, { type: "crypto", isTether: true })
Asset.register(knownAssets.native, { type: "crypto", isTether: false })
Asset.resolve(global.currency, { type: "fiat", isTether: true })

// Load known anchors.
const Anchor = require("./logic/anchor")
Anchor.register(require("./data/anchors.json"))

// Load footer.
require("./footer")

// Init navigation.
const tabs = global.tabs = new Tabs({
  nav: dom.header,
  selector: dom.header,
  view: dom.main
})
tabs.add("#welcome", __("Welcome"), welcome)
tabs.add("#demo", __("Demo"), displayDemo)
tabs.add("#login", __("Login"), dom.loginTab)
tabs.add("#license", null, license)
tabs.add("#disclaimer", null, disclaimer)
tabs.add("#about", null, welcome)
dom.demoLink.onclick = displayDemo
html.show(dom.loginTab)

tabs.select(null)
tabs.select(location.hash)
if (!tabs.selected) {
  if (!localStorage["PortfolioSummary.tab"]) tabs.select("#welcome")
  else tabs.select("#login")
}

// Init login.
const loginForm = new Form(dom.loginForm, { onsubmit: login })
loginForm.dom.loginWithLedger.onclick = loginWithLedgerWallet
loginForm.dom.loginWithTrezor.onclick = loginWithTrezorWallet

if (params.address) {
  tabs.select("#login")
  loginForm["stellar-public-key"] = params.address
  login()
}

// Scrollup on navigation.
tabs.listen("select", (page) => {
  location.hash = page
  window.scrollTo(0, 0)
})
