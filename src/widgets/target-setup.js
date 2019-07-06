"use strict"
/**
 * Target Setup Form
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")

const Anchor = require("../logic/anchor")
const TargetSetupAnchors = require("./target-setup-anchors")
const TargetSetupSize = require("./target-setup-size")
const { arrayOnlyInFirst } = require("../helpers/misc")

/** Definition **/

module.exports = class TargetSetup extends Gui {
  constructor (target) {
    super(`
<div class="TargetSetup">
  <h3>%name</h3>
  <hr>

  %sizeSetup
  %anchorsSetup

</div>
    `)

    this.target = target
    this.backup = {
      size: target.size,
      mode: target.mode,
      opening: target.opening.slice(),
      closing: target.closing.slice()
    }

    this.name = target.asset.name
    this.sizeSetup = new TargetSetupSize(target)

    if (this.target.asset.anchors.length > 1) {
      this.anchorsSetup = new TargetSetupAnchors(target)
    }
  }

  confirm () {
    this.sizeSetup.maybeSwitchMode()

    const asset = this.target.asset
    if (asset.id === "XLM") {
      // Use `target.value` as `target.amount` gets modified in throttle mode.
      if (this.target.value < asset.amountMin * asset.price) {
        this.target.mode = "amount"
        this.target.size = asset.amountMin
      }
    }

    this.close()
  }

  cancel () {
    this.target.size = this.backup.size
    this.target.mode = this.backup.mode

    const opened = arrayOnlyInFirst(
      this.target.opening,
      this.backup.opening
    ).concat(arrayOnlyInFirst(this.backup.closing, this.target.closing))
    opened
      .map(Anchor.resolve)
      .forEach(anchor => this.target.removeAnchor(anchor))

    const closed = arrayOnlyInFirst(
      this.target.closing,
      this.backup.closing
    ).concat(arrayOnlyInFirst(this.backup.opening, this.target.opening))
    closed.map(Anchor.resolve).forEach(anchor => this.target.addAnchor(anchor))

    this.close()
  }

  close () {
    document.activeElement.blur()
    this.sizeSetup.destroy()
    if (this.anchorsSetup) this.anchorsSetup.destroy()
    this.destroy()
  }
}
