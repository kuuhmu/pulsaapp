"use_strict"
/**
 * Settings Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const global = require("./logic/global")

/**
 * Class
 */

class SettingsGui extends Gui {
  constructor () {
    super(`
      <section><h2>${__("Settings")}</h2>
        <section><h3>${__("General Settings")}</h3>
          <form>
            <label><span>${__("Language")}:</span>
              <select value=%language>
                <option value="us">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <label><span>${__("Currency")}:</span>
              <select value=%currency>
                <option value="CNY">CNY</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </form>
        </section>
      </section>
    `)

    // Two-way binding
    global.project(["currency", "language"], this)
    this.project(["currency", "language"], global)

    // Refresh interface
    this.listen("change:currency", () => location.reload())
    this.listen("change:language", () => location.reload())
  }
}

/**
 * Export
 */

module.exports = SettingsGui
