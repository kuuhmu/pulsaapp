"use_strict"
/**
 * Application initialization
 */
const dom = require("@cosmic-plus/jsutils/dom")
const html = require("@cosmic-plus/jsutils/html")
const i18n = require("@cosmic-plus/i18n")
const load = require("@cosmic-plus/jsutils/load")

async function init () {
  // Internationalization
  i18n.addTranslation("fr", require("../locales/fr.json"))
  require("./global")

  // Loading require i18n (TODO: picture loading)
  html.show(dom.loading)

  // Service worker
  if (navigator.serviceWorker) navigator.serviceWorker.register("worker.js")

  // Libraries loading
  await load.js("stellar-sdk.js")
  await import(/* webpackChunkName: "app" */ "./app")

  html.hide(dom.loading)
}

init()
