"use strict"
/**
 * Asset Selector
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const Mirrorable = require("@cosmic-plus/jsutils/es5/mirrorable")
const { __ } = require("@cosmic-plus/i18n")

/**
 * Definition
 */

module.exports = class AssetSelector extends Gui {
  constructor (assets) {
    super(`
<div class="AssetSelector">
  %groups...
</div>
    `)

    this.groups = new Mirrorable()

    const fiats = assets.filter(a => a.type === "fiat")
    const cryptos = assets.filter(a => a.type === "crypto" && a.isTether)
    const natives = assets.filter(a => a.type === "crypto" && !a.isTether)

    this.addGroup(__("Fiat Tethers"), fiats)
    this.addGroup(__("Crypto Tethers"), cryptos)
    this.addGroup(__("Native Assets"), natives)
  }

  addGroup (name, assets) {
    if (!assets.length) return

    const onselect = asset => this.selected = asset
    const group = new AssetGroup(name, assets, onselect)
    this.groups.push(group)
  }
}

/**
 * Helpers
 */

class AssetGroup extends Gui {
  constructor (name, assets, onselect) {
    super(`
<fieldset class="AssetGroup">
  <legend>%name</legend>
  %toAssetRadio:assets...
</fieldset>
    `)

    this.name = name
    this.assets = assets
    this.onselect = onselect
  }

  toAssetRadio (asset) {
    return new AssetRadio(asset, () => this.onselect(asset))
  }
}

class AssetRadio extends Gui {
  constructor (asset, onselect) {
    super(`
<span class="AssetRadio half">
  <input -ref=%radio type="radio" name="asset-selector-group" %onchange>
  <label -ref=%label for=%radio>
    <img src=%image>
    %name
  </label>
</span>
    `)

    this.name = asset.name
    this.image = asset.image
    this.onchange = () => this.radio.checked && onselect()

    this.label.for = this.radio
    this.label.onclick = () => this.radio.click()
  }
}
