"use strict"
/**
 * Target Setup Anchors
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

/* Definition */

module.exports = class TargetSetupAnchors extends Gui {
  constructor (target) {
    super(`
<fieldset class="TargetSetupAnchors">
  <legend>${__("Anchor")}:</legend>
  %toAnchorCheckbox:anchors...
</fieldset>
  `)

    this.target = target
    this.anchors = target.asset.anchors
  }

  toAnchorCheckbox (anchor) {
    return new AnchorCheckbox(anchor, {
      getState: () => isTargetAnchorActive(this.target, anchor),
      callback: this.switchAnchor.bind(this)
    })
  }

  switchAnchor (anchor, checked) {
    if (checked) {
      this.target.addAnchor(anchor)
    } else if (areTwoOrMoreAnchorsActive(this.target)) {
      this.target.removeAnchor(anchor)
    }
  }
}

function isTargetAnchorActive (target, anchor) {
  const balance = target.asset.balances.find(b => b.anchor === anchor)
  return balance && balance.isActive
}

function areTwoOrMoreAnchorsActive (target) {
  const count = target.asset.balances.reduce((sum, balance) => {
    return balance.isActive ? sum + 1 : sum
  }, 0)
  return count > 1
}

class AnchorCheckbox extends Gui {
  constructor (anchor, params = {}) {
    const { getState, callback } = params

    super(`
<span class="AnchorCheckbox">
  <input -ref=%checkbox type="checkbox" %checked>
  <label -ref=%label %onclick>%name</label>
</span>
`)
    this.name = anchor.name
    this.checked = getState()

    this.onclick = () => {
      callback(anchor, !this.checked)
      this.checked = getState()
    }
  }
}
