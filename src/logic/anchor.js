"use strict"
/**
 * Anchor
 */
const aliases = require("@cosmic-plus/base/es5/aliases")
const helpers = require("@cosmic-plus/jsutils/es5/misc")
const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

const Asset = require("./asset")

/**
 * Definition
 */

class Anchor extends Projectable {
  static resolve (pubkey, params) {
    return Anchor.table[pubkey] || new Anchor(pubkey, params)
  }

  constructor (pubkey, params) {
    super()
    if (params) Object.assign(this, params)

    Anchor.table[pubkey] = this

    this.pubkey = pubkey
    this.alias = aliases.all[pubkey]
    this.name = helpers.shorter(this.alias || this.pubkey)

    this.assets = {}

    if (this.emit)
      this.emit.forEach(entry => {
        if (typeof entry !== "string") this.addAsset(entry[0], entry[1])
        else this.addAsset(entry)
      })
  }

  addAsset (code, alias = code) {
    this.assets[alias] = Asset.resolve(code)
    this.assets[alias].anchors.push(this)
  }
}

Anchor.table = {}

/**
 * Utilities
 */

/**
 * Register known **anchors**.
 */
Anchor.register = function (anchors) {
  for (let pubkey in anchors) {
    Anchor.resolve(pubkey, anchors[pubkey])
  }
}

/**
 * Export
 */
module.exports = Anchor
