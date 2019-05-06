"use_strict"
/**
 * Application initialization
 */
const dom = require("@cosmic-plus/domutils/es5/dom")
const html = require("@cosmic-plus/domutils/es5/html")
const i18n = require("@cosmic-plus/i18n")
const load = require("@cosmic-plus/domutils/es5/load")

const global = require("./logic/global")

async function init () {
  // Service worker
  if (navigator.serviceWorker) navigator.serviceWorker.register("worker.js")

  // Internationalization
  i18n.addTranslation("fr", require("../locales/fr.json"))
  i18n.setLocale(global.language)

  // Loading require i18n (TODO: picture loading)
  html.show(dom.loading)

  // Libraries loading
  await load.js("stellar-sdk.js")
  await import(/* webpackChunkName: "app" */ "./app")

  html.hide(dom.loading)
}

init()
