"use strict"

const Projectable = require("@cosmic-plus/jsutils/es5/projectable")

/**
 * Bind **$input**'s **nodeKey** to **object** **objKey**. If **nodeKey** is not
 * provided, the default value is used.
 */
module.exports = function bindnodeKey (object, objKey, $input, nodeKey) {
  const binder = bind[$input.tagName]
  if (binder) binder(object, objKey, $input, nodeKey)
  else object[objKey] = $input[nodeKey || "value"]
}

/**
 * Element-specific binders
 */
const bind = {}

bind.SELECT = function (object, objKey, $select, nodeKey = "value") {
  object[objKey] = $select[nodeKey]
  if (bind.SELECT.interactive.indexOf(nodeKey) !== -1) {
    importKeyOn("change", object, objKey, $select, nodeKey)
  }
}
bind.SELECT.interactive = ["selectedIndex", "selectedOptions", "value"]

bind.TEXTAREA = function (object, objKey, $textarea, nodeKey = "value") {
  object[objKey] = $textarea[nodeKey]
  if (nodeKey === "value") {
    importKeyOn("input", object, objKey, $textarea, nodeKey)
  }
}

bind.INPUT = function (object, objKey, $input, nodeKey) {
  object[objKey] = $input[nodeKey]
  if ($input.type === "radio") {
    bind.radio(...arguments)
  } else if ($input.type === "checkbox") {
    bind.checkbox(...arguments)
  } else if (!nodeKey || nodeKey === "value") {
    importKeyOn("input", object, objKey, $input, nodeKey || "value")
  }
}

bind.radio = function (object, objKey, $radio) {
  const setter = () => {
    if ($radio.checked) object[objKey] = $radio.value
  }
  $radio.addEventListener("change", setter)
  setter()
}

bind.checkBox = function (object, objKey, $checkbox, nodeKey = "checked") {
  object[objKey] = $checkbox[nodeKey]
  if (nodeKey === "checked") {
    importKeyOn("change", object, objKey, $checkbox, nodeKey)
  }
}

/**
 * Event setter.
 */
function importKeyOn (eventName, object, objKey, $input, nodeKey) {
  $input.addEventListener(eventName, () => {
    object[objKey] = $input[nodeKey]
    $input.setCustomValidity("")
  })
  if (object instanceof Projectable) {
    object.link(objKey, $input, nodeKey, null, { init: false })
  }
}
