"use strict"
/**
 * Overlay that prevent user interaction
 */
const clickWall = module.exports

const html = require("@cosmic-plus/domutils/es5/html")

const overlay = html.create("div", { hidden: true })
html.append(document.body, overlay)

Object.assign(overlay.style, {
  position: "fixed",
  zIndex: 999,
  top: 0,
  width: "100%",
  height: "100%"
})

clickWall.enable = () => html.show(overlay)
clickWall.disable = () => html.hide(overlay)
