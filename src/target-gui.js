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
  <td align="right">%share%</td>
  <td align="right">%valueDiffP</td>
  <td align="right">%description...</td>
</tr>
    `)

    this.target = target

    this.name = target.name || target.asset && target.asset.code
    target.asset.project("image", this)
    target.project("share", this, x => nice(x * 100, 2))
    target.project("valueDiffP", this, x => {
      return x == null ? "-" : nice(x * 100, 2) + "%"
    })

    this.watch(target, "order", () => {
      if (!target.order) {
        this.cosmicLink = this.description = null
      } else {
        target.order.project("cosmicLink", this)
        target.order.project("description", this, descriptionToList)
      }
    })
  }
}

TargetGui.Setup = class TargetSetup extends Gui {
  constructor (target, parent) {
    super(`
<section>
  <form onsubmit=%close>
    <h3>%assetName</h3>
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

    this.parent = parent
    this.target = target

    this.assetName = target.asset.name

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
    switch (this.mode) {
    case "weight":
      this.size = 1
      this.max = null
      break
    case "percentage":
      this.size = +nice(this.target.asset.share, 2)
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
    this.parent.selected = null
    return false
  }
}

/**
 * Helpers
 */

function descriptionToList (description) {
  return description.map(e => html.create("div", null, e))
}

/**
 * Export
 */

module.exports = TargetGui
