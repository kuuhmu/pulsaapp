"use_strict"
/**
 * Signing Side Frame
 */
const html = require("@cosmic-plus/jsutils/html")
const Observable = require("@cosmic-plus/jsutils/observable")
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

    SideFrame.shadow.onclick = () => this.close()
    SideFrame.close.onclick = () => this.close()
    html.show(SideFrame.shadow, SideFrame.close, this.domNode)

    this.trigger("show")
  }

  hide () {
    if (this.domNode.hidden) return

    document.documentElement.style.overflow = this.htmlOverflow
    document.body.style.overflow = this.bodyOverflow

    SideFrame.shadow.onclick = null
    html.hide(SideFrame.shadow, SideFrame.close, this.domNode)

    this.trigger("hide")
  }

  close () {
    SideFrame.current = null
    this.hide()
    html.destroy(this.domNode)
    this.trigger("close")
    this.destroy()
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
  backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="12em" height="12em" viewBox="0 0 18055.55 18055.55" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd"><path d="M6184.01 6244.26l-5076.93 5077.09c-1542.18 1542.18-1542.18 4042.74 0 5584.91 1542.18 1542.18 4042.74 1542.18 5584.91 0l5050.06-5050.22c-946.39 926.55-2243.37 1281.63-3458.3 1065.06l-2788.46 2788.46c-881.29 881.29-2310.22 881.29-3191.52 0-881.29-881.29-881.29-2310.22 0-3191.51l2788.62-2788.62 2311.35-2311.19c883.05-858.58 2294.87-850.9 3168.48 22.71 880.17 880.17 881.29 2306.54 3.52 3188.31l2288.31-2288.47c-136.75-767.89-501.74-1503.15-1095.13-2096.54-593.23-593.23-1328.33-958.22-2096.22-1095.13-1271.39-226.64-2574.93 181.38-3488.69 1095.13z" fill="#c1c1c1"/><path d="M11772.44 11825.98l5076.93-5077.09c1542.18-1542.18 1542.18-4042.74 0-5584.91-1542.18-1542.18-4042.74-1542.18-5584.91 0L6214.4 6214.2c946.39-926.56 2243.37-1281.63 3458.3-1065.07l2788.46-2788.46c881.29-881.29 2310.22-881.29 3191.52 0 881.29 881.29 881.29 2310.22 0 3191.52l-2788.62 2788.62L10552.71 10652c-883.05 858.57-2294.87 850.9-3168.48-22.71-880.17-880.17-881.29-2306.55-3.52-3188.31L5092.4 9729.45c136.75 767.89 501.74 1503.15 1095.13 2096.54 593.23 593.23 1328.33 958.22 2096.22 1095.13 1271.39 226.64 2574.93-181.37 3488.69-1095.13z" fill="#9f9f9f"/><path d="M12651.33 7587.95l-1418.38 1418.38c7.84 577.72-204.89 1157.83-638.02 1603.44l2269.12-2268.96c-45.58-255.91-116.44-508.14-212.72-752.85zm-909.28 4268.09c-810.76 793.48-1919.32 1194.94-3038.77 1116.89-139.79-9.76-279.9-26.87-419.53-51.82l-509.1 509.1c365.47 95.48 749.17 146.35 1144.56 146.35 448 0 880.65-65.26 1289.15-186.81l1533.7-1533.7z" fill="#a6a6a6"/><path d="M6214.4 6214.2c810.76-793.48 1919.32-1194.94 3038.77-1116.89 139.79 9.76 279.9 26.87 419.53 51.82l439.2-439.2c-379.87-103.8-779.89-159.3-1192.7-159.3-416.81 0-820.35 56.46-1203.57 162.34L6214.4 6214.2zm509.1 2788.78c7.36-557.41 220.08-1112.57 638.02-1542.5L5092.4 9729.44c42.87 240.56 108.12 478.07 195.77 708.87L6723.5 9002.98z" fill="#888888"/></svg>')`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
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
  background: "rgba(0,0,0,0.2)"
})
document.body.insertBefore(SideFrame.shadow, document.body.firstChild)

/**
 * Export
 */

module.exports = SideFrame
