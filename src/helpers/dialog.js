"use strict"
/**
 * Dialog
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")

/**
 * Definition
 */

module.exports = class Dialog extends Gui {
  constructor (...content) {
    super(`
<form class="Dialog" onsubmit="return false">

  %content...

  <div class="DialogControls">
    %toButton:actions...
  </div>
</form>
    `)

    this.content = content
  }

  toButton ([name, onclick, type = "button"]) {
    return html.create("button", { type, onclick }, name)
  }
}
