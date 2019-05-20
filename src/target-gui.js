"use_strict"
/**
 * Target Graphical User Interface
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const i18n = require("@cosmic-plus/i18n")
const html = require("@cosmic-plus/domutils/es5/html")
const nice = require("@cosmic-plus/jsutils/es5/nice")
const { __ } = i18n

/**
 * Class
 */

class TargetGui extends Gui {
  constructor (target) {
    super(`
<tr class="TargetGui">
  <td align="left">
    <img src=%image alt="">
    <span>%name</span>
  </td>
  <td align="right">%command</td>
  <td align="right">%toPercent:shareDiff</td>
  <td align="right">%toDiv:description...</td>
</tr>
    `)

    this.target = target
    this.name = target.asset.code

    this.define("command", null, () => this.toCommand(target))
    this.watch(target, ["size", "mode", "share"], () => this.compute("command"))

    target.asset.project("image", this)
    target.project("shareDiff", this)

    if (target.order) target.order.project("description", this)
  }

  toCommand (target) {
    switch (target.mode) {
    case "ignore":
      return __("Ignore")
    case "amount":
      return `${target.amount} ${target.asset.code}`
    case "weight":
      return `${target.size} − ${this.toPercent(target.share)}`
    case "percentage":
      return this.toPercent(target.share)
    }
  }

  toPercent (x) {
    return !x ? "-" : nice(x * 100, 2) + "%"
  }

  toDiv (obj) {
    return html.create("div", null, obj)
  }
}

/**
 * Export
 */

module.exports = TargetGui
