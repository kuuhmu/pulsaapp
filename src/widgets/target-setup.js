"use strict"
/**
 * Target Setup Form
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const { __ } = require("@cosmic-plus/i18n")

const TargetSetupAnchors = require("./target-setup-anchors")
const TargetSetupSize = require("./target-setup-size")

/** Definition **/

module.exports = class TargetSetup extends Gui {
  constructor (target) {
    super(`
<section class="TargetSetup">
  <form onsubmit="return false">

    <h3>%name</h3>
    <hr>

    %sizeSetup
    %anchorsSetup

    <hr>
    <input type="submit" onclick=%close value="${__("Close")}">

  </form>
</section>
    `)

    this.target = target
    this.name = target.asset.name

    this.sizeSetup = new TargetSetupSize(target)

    if (this.target.asset.anchors.length > 1) {
      this.anchorsSetup = new TargetSetupAnchors(target)
    }
  }

  close () {
    this.sizeSetup.maybeSwitchMode()
    this.trigger("close")
    this.destroy()
  }
}
