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
    this.name = target.name || target.asset && target.asset.code

    this.define("command", null, () => this.toCommand(target))
    this.watch(target, ["size", "mode", "share"], () => this.compute("command"))

    target.asset.project("image", this)
    target.project("shareDiff", this)

    // TODO: Simplify once Gui ignore undefined ellipsis.
    if (target.order) target.order.project("description", this)
    else this.description = []
  }

  toCommand (target) {
    switch (target.mode) {
    case "ignore":
      return "Ignore"
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

TargetGui.Setup = class TargetSetup extends Gui {
  constructor (target) {
    super(`
<section>
  <form onsubmit=%close>

    <h3>%name</h3>
    <hr>

    <label><span>${__("Size")}:</span>

      <input class="half" type="number" step="any" min="0" %max
        value=%size placeholder=%share oninput=%maybeSwitchMode>

      <select class="half" onchange=%setMode value=%mode>
        <option value="weight">${__("Weight")}</option>
        <option value="percentage">${__("Percentage")}</option>
        <option value="amount">${__("Amount")}</option>
        <option value="ignore">${__("Ignore")}</option>
      </select>

    </label>

    <hr>
    <input type="submit" value="${__("Close")}">

  </form>
</section>
    `)

    this.target = target
    this.name = target.asset.name

    target.project("share", this, x => nice(100 * x, 2))

    target.project("size", this)
    this.project("size", target, x => x != null ? Number(x) : null)

    target.project("mode", this)
    this.project("mode", target)
  }

  maybeSwitchMode () {
    if (this.mode === "ignore") {
      this.mode = "percentage"
      this.target.update()
    }
  }

  setMode () {
    // TODO: Move this logic to Target model.
    switch (this.mode) {
    case "weight":
      this.size = 1
      this.max = null
      break
    case "percentage":
      this.size = +nice(100 * this.target.asset.share, 2)
      this.max = 100
      break
    case "amount":
      this.size = this.target.asset.amount
      this.max = null
      break
    case "ignore":
      this.size = null
      break
    }
  }

  close () {
    if (this.size != null) this.maybeSwitchMode()
    this.trigger("close")
    this.destroy()
    return false
  }
}

/**
 * Export
 */

module.exports = TargetGui
