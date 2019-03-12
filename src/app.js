"use_strict"
/**
 * Login interface
 */
const dom = require("@cosmic-plus/jsutils/dom")
const Form = require("@cosmic-plus/jsutils/form")
const Gui = require("@cosmic-plus/jsutils/gui")
const html = require("@cosmic-plus/jsutils/html")
const Tabs = require("@cosmic-plus/jsutils/tabs")
const params = require("@cosmic-plus/jsutils/params")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./global")
const Portfolio = require("./portfolio")

const ActivityGui = require("./activity-gui")
const PortfolioGui = require("./portfolio-gui")
const SettingsGui = require("./settings-gui")
const ShareGui = require("./share-gui")
const { isOverflowing } = require("./helpers")

require("./footer")

/**
 * License
 */

const license = new Gui(`
<section><h2>License</h2>
  <section><h3>MIT License</h3>

  <p>Copyright (c) 2019 Antoine Bodin &lt;<a
  href="mailto:mister.ticot@cosmic.plus">mister.ticot@cosmic.plus</a>&gt;</p>

  <p>Permission is hereby granted, free of charge, to any person obtaining a
  copy of this software and associated documentation files (the "Software"), to
  deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:</p>

  <p>The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.</p>

  <p>THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>
`)

/**
 * Beta 1 Welcome
 */

const welcome = new Gui(`
<section><h2>February, 16th − Beta 1 Release</h2>
  <section><h3>Welcome!</h3>

    <p>Equilibre.io is a portfolio balancer for the Stellar Decentralized
    EXchange. Define how you want to split your portfolio, and it will help you
    maintaining the balance. (i.e.: 1/4 Bitcoin, 1/4 Lumens, 1/4 US Dollars, 1/4
    Renmibi)</p>

    <p>Regularly balancing an investment portfolio is known to boost its
    performances, providing you choose wisely the assets to bet on. Equilibre.io
    also let you spread your position over several anchors, for a better fund
    safety.</p>

    <p>Equilibre.io is still under testing & development. If you use it now,
    I'll ask you to consider yourself as a tester. Please report any bug you
    could encounter, and double-check transactions before signing them.</p>

    <p>Your feedback matters to me and will be listened to.</p>

    <p>Respectfully, <br>MisterTicot</p>

  </section>

  <section><h3>To Be Implemented</h3>
    <ul>
      <li>Interface to add/remove assets</li>
      <li>Portfolio historic value</li>
      <li>Customizable rebalancing periodicity</li>
      <li>Better position spreading over anchors</li>
      <li>Pie graph for rebalancing tab</li>
    </ul>
  </section>

  <section><h3>Known Limitations</h3>
    <ul>

      <li>It is required to "Cancel All" offers between applying a new balance
      setup</li>

      <li>There may be a delay between validating a rebalancing operation &
      having the interface reflecting it.</li>

    </ul>
  </section>
</section>
`)

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

  try {
    global.portfolio = await Portfolio.resolve(address)
    global.portfolio.listen("open", initGui)
  } catch (error) {
    console.error(error)
    loginForm.setError(error)
  }
}

function initGui () {
  const portfolio = global.portfolio

  const selected = location.hash
  tabs.remove("#welcome")
  tabs.remove("#login")
  tabs.add("#portfolio", __("Portfolio"), new PortfolioGui(portfolio))
  tabs.add("#rebalance", __("Rebalance"), new ShareGui(portfolio))
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
  return import(/* webpackChunkName: "ledger" */ "@cosmic-plus/ledger-wallet").then(
    ledger => ledger.default
  )
}
