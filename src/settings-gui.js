"use_strict"
/**
 * Settings Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const Form = require("./helpers/form")
const global = require("./logic/global")

/**
 * Available translations.
 */
const languages = {
  us: "English",
  fr: "Français"
}

/**
 * Possible reference currencies.
 */
const currencies = [
  "AUD",
  "BGN",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HRK",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "RUB",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR"
]

/**
 * Class
 */

class SettingsGui extends Gui {
  constructor () {
    super(`
      <section><h2>${__("Settings")}</h2>
        <section><h3>${__("General Settings")}</h3>
          %general
        </section>
      </section>
    `)

    this.general = new GeneralSettings(global)
  }
}

class GeneralSettings extends Form {
  constructor (global) {
    super(
      Form.selector({
        label: __("Language"),
        name: "language",
        values: languages
      }),
      Form.selector({
        label: __("Currency"),
        name: "currency",
        values: currencies
      })
    )

    // Two-way binding.
    global.project(["currency", "language"], this)
    this.project(["currency", "language"], global)

    // Refresh interface.
    this.listen("change", () => location.reload())
  }
}

/**
 * Export
 */

module.exports = SettingsGui
