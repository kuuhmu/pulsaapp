"use strict"
/**
 * Dialog
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const { __ } = require("@cosmic-plus/i18n")

const Modal = require("./modal")

/**
 * Definition
 */

class Dialog extends Gui {
  constructor (params = {}) {
    const { title, content, actions } = params

    super(`
<form class="Dialog" onsubmit="return false">

  <h3>%title</h3>

  <hr hidden=%hasNoTitle>

  %content

  <hr hidden=%hasNoContent>

  <div class="Actions">
    %toButton:actions...
  </div>
</form>
    `)

    this.title = title
    this.content = typeof params === "string" ? params : content
    this.actions = actions

    this.hasNoTitle = !this.title
    this.hasNoContent = !this.content
  }

  toButton ([name, onclick, type = "button"]) {
    return html.create("button", { type, onclick: onclick.bind(this) }, name)
  }
}

/**
 * Utilities
 */

Dialog.alert = function (params = {}) {
  const dialog = new Dialog(params)
  const modal = new Modal({ content: dialog })
  dialog.actions = [[__("OK"), () => modal.close()]]

  modal.open()
  return new Promise(resolve => modal.listen("close", resolve))
}

Dialog.confirm = function (params = {}) {
  const dialog = new Dialog(params)
  const modal = new Modal({ content: dialog })

  const promise = new Promise(resolve => {
    modal.listen("close", () => resolve(false))
    dialog.actions = [
      [__("OK"), () => resolve(true), "submit"],
      [__("Cancel"), () => resolve(false)]
    ]
  })
  promise.finally(() => modal.close())

  modal.open()
  const el = dialog.domNode.querySelector("[autofocus]")
  if (el) el.focus()

  return promise
}

/**
 * Export
 */
module.exports = Dialog
