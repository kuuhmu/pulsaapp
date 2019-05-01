"use_strict"
/**
 * Login interface
 */
const dom = require("@cosmic-plus/domutils/es5/dom")
const Form = require("@cosmic-plus/domutils/es5/form")
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const Tabs = require("@cosmic-plus/domutils/es5/tabs")
const params = require("@cosmic-plus/domutils/es5/params")
const { __ } = require("@cosmic-plus/i18n")

const clickWall = require("./click-wall")
const global = require("./global")
const Portfolio = require("./portfolio")
const { isOverflowing } = require("./helpers")

const ActivityGui = require("./activity-gui")
const PortfolioGui = require("./portfolio-gui")
const SettingsGui = require("./settings-gui")
const RebalanceGui = require("./rebalance-gui")

const license = new Gui(require("./html/license.html"))
const welcome = new Gui(require("./html/welcome.html"))

require("./footer")

/**
 * Init
 */
const tabs = global.tabs = new Tabs({ nav: dom.header, view: dom.main })
tabs.add("#welcome", __("Welcome"), welcome)
tabs.add("#login", __("Login"), dom.loginForm)
tabs.add("#license", null, license)
tabs.add("#about", null, welcome)

tabs.select(location.hash)
if (!tabs.selected) tabs.select("#welcome")

tabs.fitScreen = function () {
  if (isOverflowing(dom.header)) {
    html.replace(tabs.nav.domNode, tabs.selector.domNode)
  }
}
tabs.fitScreen()

const loginForm = new Form(dom.loginForm).addValidator(login)
html.show(dom.loginForm)
dom.loginForm.autocomplete = "on"
if (params.address) {
  tabs.select("#login")
  dom.loginAddressBox.value = params.address
  login()
} else {
  dom.ledgerLoginButton.onclick = () => loginWithLedgerWallet()
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
  ledger = await getLedgerModule()
  loginForm.setInfo(__("Please open the Stellar App in your Ledger Wallet"))
  try {
    await ledger.connect()
    dom.loginAddressBox.value = ledger.publicKey
    login()
  } catch (error) {
    console.error(error)
    loginForm.setError(error)
  }
}

async function login (address = dom.loginAddressBox.value) {
  if (!address) throw new Error(__("Please enter an address."))
  if (ledger) ledger.disconnect()

  loginForm.setInfo(__("Connecting to your account..."))
  params.$set({ address })
  clickWall.enable()

  try {
    global.portfolio = await Portfolio.resolve(address)
    loginForm.setInfo(`${__("Fetching market data")}...`)
    setTimeout(
      () => loginForm.setInfo(`${__("Sorry, it takes a while (^.^)\"")}...`),
      10000
    )
    setTimeout(() => loginForm.setInfo(`${__("Almost there")}...`), 20000)
    setTimeout(
      () => loginForm.setInfo(`${__("I'm running, I'm running")}...`),
      30000
    )
    global.portfolio.listen("open", () => {
      initGui()
      clickWall.disable()
    })
  } catch (error) {
    console.error(error)
    loginForm.setError(error)
    clickWall.disable()
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

  tabs.select(selected)
  if (!tabs.selected) tabs.select("#portfolio")
}

/**
 * Module loading
 */

function getLedgerModule () {
  return import(
    /* webpackChunkName: "ledger" */ "@cosmic-plus/ledger-wallet"
  ).then(ledger => ledger.default)
}
