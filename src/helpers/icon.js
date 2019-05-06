"use_strict"
/**
 * Footer Icons
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")

class Icon extends Gui {
  constructor (image, name, action) {
    super(`<a -ref=%link class="Icon">%image</a>`)

    this.image = typeof image === "string" ? new Gui(image) : image
    this.link.title = name

    if (typeof action === "function") {
      this.link.onclick = action
    } else if (typeof action === "string") {
      this.link.href = action
      if (action.match(/^http/)) {
        this.link.target = "_blank"
        this.link.rel = "noopener"
      }
    }
  }
}

module.exports = Icon
