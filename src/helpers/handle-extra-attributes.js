"use strict"

const { timeout } = require("@cosmic-plus/jsutils/es5/misc")

const html = require("./html-extra")

/**
 * Walk **$node** tree and handle extra attributes for each domNode. Extra
 * attributes are:
 *
 * * alias:  Define an identifier for the local context.
 * * label:  Enclose the node into a dedicated label element.
 */
module.exports = function walkNodeTree ($node) {
  const aliases = {}
  html.walk($node, handleExtraAttributes, aliases)
  return aliases
}

function handleExtraAttributes ($node, aliases) {
  setAliases($node, aliases)
  handleLabel($node)
  handleValidate($node)
}

/**
 * Bind **$node** to **aliases** properties for to its className, alias, name
 * and/or id.
 */
function setAliases ($node, aliases) {
  // Ordered by priority
  if ($node.className) {
    if (!aliases[$node.className]) aliases[$node.className] = []
    aliases[$node.className].push($node)
  } else if ($node.alias) {
    aliases[$node.alias] = $node
    delete aliases[$node.alias]
  } else if ($node.name) {
    aliases[$node.name] = $node
  } else if ($node.id) {
    aliases[$node.id] = $node
  }
}

/**
 * Enclose **$node** into its own label if it has a `label=` attribute.
 */
function handleLabel ($node) {
  // `<option>` tags have a `label` attribute in HTML5.
  if (!$node.label || $node.tagName === "OPTION") return

  const $label = html.element("label", { for: $node })
  const $span = html.element("span", $node.label)
  html.replace($node, $label)
  html.append($label, $span, $node)
  delete $node.label
}

/**
 * Setup automatic validation using **$node**'s validate function.
 */
function handleValidate ($node) {
  const validate = $node.validate
  if (!validate || !$node.hasProperty("oninput")) return

  $node.addEventListener("input", () => {
    $node.setCustomValidity("")
    timeout(0).then(() => validateNodeValue($node, validate))
  })
  delete $node.validate
}

function validateNodeValue ($node, validate) {
  try {
    validate($node.value)
  } catch (error) {
    $node.setCustomValidity(error.message)
    $node.reportValidity()
    console.error(error)
  }
}
