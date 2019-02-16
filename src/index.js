"use_strict"
/**
 * Application initialization
 */

const dom = require("@cosmic-plus/jsutils/dom")
const html = require("@cosmic-plus/jsutils/html")
const i18n = require("@cosmic-plus/i18n")
const load = require("@cosmic-plus/jsutils/load")

const global = require("./global")

async function init () {
  i18n.addTranslation("fr", require("../locales/fr.json"))
  i18n.setLocale(global.language)

  html.show(dom.loading)
  await load.js("stellar-sdk.js")
  await import(/* webpackChunkName: "app" */ "./app")
  html.hide(dom.loading)
}

init()
