"use strict"
/**
 * Asset Prompt
 */
const { __ } = require("@cosmic-plus/i18n")

const AssetSelector = require("./asset-selector")
const Dialog = require("../helpers/dialog")
const Modal = require("../helpers/modal")

/**
 * Definition
 */

module.exports = class AssetPrompt extends Modal {
  constructor (assets) {
    super({ width: "40em" })

    // Interaction.
    const assetSelector = new AssetSelector(assets)
    this.content = new Dialog(assetSelector)
    this.content.actions = [
      [__("OK"), () => this.returns(assetSelector.selected), "submit"],
      [__("Cancel"), () => this.returns(null)]
    ]
    this.content.listen("close", () => this.returns(null))

    // Promise an answer.
    this.answer = new Promise(resolve => this.returns = resolve)
    this.answer.then(() => {
      this.close()
      this.destroy()
    })
  }
}
