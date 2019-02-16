"use_strict"
/**
 * Balance GUI
 */
const Gui = require("@cosmic-plus/jsutils/gui")
const html = require("@cosmic-plus/jsutils/html")
const nice = require("@cosmic-plus/jsutils/nice")

/**
 * Class
 */

module.exports = class BalanceGui extends Gui {
  constructor (balance) {
    super(`
      <tr>
        <td>%image%name</td>
        <td>%anchor</td>
        <td>%amount</td>
        <td>%price</td>
        <td>%value></td>
      </tr>
    `)

    this.balance = balance

    this.image = balance.asset.image
      ? html.create("img", { src: balance.asset.image })
      : " "
    this.name = balance.asset.code || "XLM"
    this.anchor = balance.anchor ? balance.anchor.name : ""
    balance.project(["amount", "price"], this, nice)
    balance.project("value", this, x => nice(x, 2))
  }
}
