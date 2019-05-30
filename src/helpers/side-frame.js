"use strict"
/**
 * Signing Side Frame
 */
const html = require("@cosmic-plus/domutils/es5/html")
const Observable = require("@cosmic-plus/jsutils/es5/observable")
const { __ } = require("@cosmic-plus/i18n")

const ClickWall = require("./click-wall")

/**
 * Class
 */

class SideFrame extends Observable {
  constructor (url) {
    super()

    if (SideFrame.current) SideFrame.current.close()
    SideFrame.current = this

    this.domNode = html.create("iframe", {
      title: "Signing Frame",
      className: "animated",
      src: url,
      sandbox: "allow-same-origin allow-scripts allow-forms allow-popups",
      hidden: true
    })
    Object.assign(this.domNode.style, SideFrame.style)
    html.append(document.body, this.domNode)

    this.show()
  }

  show () {
    if (!this.domNode.hidden) return

    this.domNode.style.animationName = "slideInRight"
    html.show(SideFrame.close, this.domNode)

    return SideFrame.shadow.enable().then(() => {
      SideFrame.shadow.onclick = () => this.close()
      SideFrame.close.onclick = () => this.close()
      this.trigger("show")
    })
  }

  hide () {
    if (this.domNode.hidden) return

    html.hide(SideFrame.close)
    this.domNode.style.animationName = "slideOutRight"

    return SideFrame.shadow.disable().then(() => {
      html.hide(this.domNode)
      this.trigger("hide")
    })
  }

  close () {
    SideFrame.current = null
    this.hide().then(() => {
      html.destroy(this.domNode)
      this.trigger("close")
      this.destroy()
    })
  }
}

/**
 * Event
 */

window.addEventListener("message", event => {
  const frameWindow =
    SideFrame.current && SideFrame.current.domNode.contentWindow

  if (event.source === frameWindow) {
    switch (event.data) {
    case "show":
      SideFrame.current.show()
      break
    case "hide":
      SideFrame.current.hide()
      break
    case "close":
      SideFrame.current.close()
      break
    }
  }
})

/**
 * Frame style
 */

SideFrame.style = {
  position: "fixed",
  zIndex: 1000,
  right: 0,
  top: 0,
  width: "30em",
  maxWidth: "100%",
  height: "100vh",
  border: "0.1em solid hsl(240, 10%, 75%)",
  background: "hsl(240, 40%, 98%)",
  backgroundImage: `url('./images/cosmic-link.svg')`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "12em 12em",
  padding: 0
}

/**
 * Closing button
 */

SideFrame.close = html.create("span", { hidden: true }, `× ${__("Close")}`)
Object.assign(SideFrame.close.style, {
  position: "fixed",
  zIndex: 1001,
  top: "0.1em",
  right: "0.1em",
  color: "hsl(0, 0%, 40%)",
  fontSize: "0.9em",
  fontWeight: "bold",
  cursor: "pointer",
  background: "hsl(0, 0%, 95%)",
  borderBottomLeftRadius: "0.1em",
  padding: "0.1em 0.3em"
})
document.body.insertBefore(SideFrame.close, document.body.firstChild)

/**
 * Shadow Layer
 */

SideFrame.shadow = new ClickWall({
  scrollbar: "hide",
  opacity: 0.3,
  delay: 400
})

/**
 * Export
 */

module.exports = SideFrame
