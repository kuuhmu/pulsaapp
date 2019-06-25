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
const { isOverflowing } = require("./helpers/dom")

const ActivityGui = require("./activity-gui")
const PortfolioGui = require("./portfolio-gui")
const SettingsGui = require("./settings-gui")
const RebalanceGui = require("./rebalance-gui")

const license = new Gui(require("../bundled/license.html"))
const welcome = new Gui(require("../bundled/welcome.html"))
const disclaimer = new Gui(require("../bundled/disclaimer.html"))

require("./footer")

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

const tabs = global.tabs = new Tabs({ nav: dom.header, view: dom.main })
tabs.add("#welcome", __("Welcome"), welcome)
tabs.add("#login", __("Login"), dom.loginTab)
tabs.add("#license", null, license)
tabs.add("#disclaimer", null, disclaimer)
tabs.add("#about", null, welcome)
dom.demoLink.onclick = displayDemo
html.show(dom.loginTab)

tabs.select(location.hash)
if (!tabs.selected) tabs.select("#welcome")

tabs.fitScreen = function () {
  if (isOverflowing(dom.header)) {
    html.replace(tabs.nav.domNode, tabs.selector.domNode)
  }
}
tabs.fitScreen()

const loginForm = new Form(dom.loginForm, { onsubmit: login })
loginForm.dom.loginWithLedger.onclick = loginWithLedgerWallet

if (params.address) {
  tabs.select("#login")
  loginForm["stellar-public-key"] = params.address
  login()
}

tabs.listen("select", page => {
  location.hash = page
  window.scrollTo(0, 0)
})

/**
 * Functions
 */

let ledger
async function loginWithLedgerWallet () {
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

async function login () {
  const address = loginForm["stellar-public-key"]
  if (!address) loginForm.error(__("Please enter an address."))
  if (ledger) ledger.disconnect()

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
  tabs.add("#portfolio", __("Portfolio"), new PortfolioGui(portfolio))
  tabs.add("#rebalance", __("Rebalance"), new RebalanceGui(portfolio))
  tabs.add("#activity", __("Activity"), new ActivityGui(portfolio))
  tabs.add("#settings", __("Settings"), new SettingsGui())
  tabs.add("#logout", __("Logout"), () => {
    location.replace(location.href.replace(/\?.*$/, "#login"))
  })
  tabs.fitScreen()

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

const demoConfig = `{"childs":[{"mode":"percentage","size":12.5,"asset":"BTC"},"CNY",{"mode":"percentage","size":12.5,"asset":"ETH"},"EUR",{"mode":"percentage","size":1.5625,"asset":"FRAS"},{"mode":"percentage","size":1.5625,"asset":"MOBI"},{"mode":"percentage","size":1.5625,"asset":"PEDI"},{"mode":"percentage","size":1.5625,"asset":"REPO"},{"mode":"percentage","size":1.5625,"asset":"RMT"},{"mode":"percentage","size":1.5625,"asset":"SHX"},{"mode":"percentage","size":1.5625,"asset":"SLT"},{"mode":"percentage","size":1.5625,"asset":"TERN"},"USD",{"mode":"percentage","size":12.5,"asset":"XLM"}]}`

/**
 * Module loading
 */

function getLedgerModule () {
  return import(
    /* webpackChunkName: "ledger" */ "@cosmic-plus/ledger-wallet"
  ).then(ledger => ledger.default)
}
