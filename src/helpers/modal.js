"use strict"
/**
 * Modal boxes helper
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")

const ClickWall = require("./click-wall")

/**
 * Definition
 */

class Modal extends Gui {
  constructor (params = {}) {
    super(`
<div class="Modal" %style %hidden>%content</div>
    `)

    Object.assign(this.style, Modal.style)
    this.hidden = true
    this.content = params.content

    // Handle styling parameters.
    this.trap(
      Modal.styleParams,
      (event) => this.style[event.key] = event.value
    )
    Modal.styleParams.forEach((key) => this[key] = params[key])

    // Initialization.
    document.body.insertBefore(this.domNode, document.body.firstChild)
  }

  setPosition () {
    const translate = { x: 0, y: 0 }
    if (!this.left && !this.right) {
      this.style.left = "50%"
      translate.x = "-50%"
    }
    if (!this.top && !this.bottom) {
      this.style.bottom = "50%"
      translate.y = "50%"
    }
    this.style.transform = `translate(${translate.x}, ${translate.y})`
  }

  async open () {
    Modal.clickWall.enable()

    this.hidden = false
    this.setPosition()

    await Modal.shadow.enable()
    Modal.shadow.onclick = () => this.close()

    Modal.clickWall.disable()
    this.trigger("open")
  }

  async close () {
    Modal.clickWall.enable()

    this.hidden = true
    await Modal.shadow.disable()

    Modal.clickWall.disable()
    this.trigger("close")
    this.destroy()
  }
}

/**
 * Configuration
 */

Modal.styleParams = [
  "height",
  "width",
  "top",
  "right",
  "bottom",
  "left",
  "padding"
]

Modal.style = {
  zIndex: 1000,
  position: "fixed"
}

Modal.shadow = new ClickWall({
  scrollbar: "hide",
  opacity: 0.3,
  delay: 300
})

Modal.clickWall = new ClickWall()
Modal.clickWall.domNode.style.zIndex = "2000"

/**
 * Export
 */
module.exports = Modal
