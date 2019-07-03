"use strict"
/**
 * Actions Board
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")

/**
 * Definition
 */

module.exports = class Actions extends Gui {
  constructor (actions) {
    super(`<div class="Actions">toButton:%actions...</div>`)
    this.actions = actions
  }

  toButton ([name, onclick, type = "button"]) {
    return html.create("button", { type, onclick: onclick.bind(this) }, name)
  }
}
