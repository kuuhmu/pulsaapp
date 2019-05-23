"use strict"
/**
 * Signing Side Frame
 */
const html = require("@cosmic-plus/domutils/es5/html")
const Observable = require("@cosmic-plus/jsutils/es5/observable")
const { timeout } = require("@cosmic-plus/jsutils/es5/misc")
const { __ } = require("@cosmic-plus/i18n")

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

    this.htmlOverflow = document.documentElement.style.overflow
    this.bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    html.show(SideFrame.shadow, SideFrame.close, this.domNode)
    this.domNode.style.animationName = "slideInRight"
    SideFrame.shadow.style.background = "rgba(0,0,0,0.3)"

    return timeout(400).then(() => {
      SideFrame.shadow.onclick = () => this.close()
      SideFrame.close.onclick = () => this.close()
      this.trigger("show")
    })
  }

  hide () {
    if (this.domNode.hidden) return

    document.documentElement.style.overflow = this.htmlOverflow
    document.body.style.overflow = this.bodyOverflow

    SideFrame.shadow.onclick = null
    html.hide(SideFrame.close)

    this.domNode.style.animationName = "slideOutRight"
    SideFrame.shadow.style.background = "transparent"

    return timeout(400).then(() => {
      html.hide(SideFrame.shadow, SideFrame.close, this.domNode)
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
  zIndex: 998,
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
  zIndex: 999,
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

SideFrame.shadow = html.create("div", { hidden: true })
Object.assign(SideFrame.shadow.style, {
  position: "fixed",
  zIndex: 997,
  top: 0,
  width: "100%",
  height: "100%",
  background: "transparent",
  transition: "background 0.4s"
})
document.body.insertBefore(SideFrame.shadow, document.body.firstChild)

/**
 * Export
 */

module.exports = SideFrame
