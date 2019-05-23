"use strict"
/**
 * Additional methods for html.
 */
const html = Object.create(require("@cosmic-plus/domutils/es5/html"))
module.exports = html

/**
 * Creates an new HTML element.
 */
html.element = function (tag, ...params) {
  let attributes
  if (
    params[0]
    && params[0].constructor === Object
    && params[0].domNode === undefined
  ) {
    attributes = params.shift()
  }

  return html.create(tag, attributes, ...params)
}

/**
 * Walks **element** dom tree, applying **func** to each node.
 */
html.walk = function (element, func, ...params) {
  func(element, ...params)
  element.childNodes.forEach(child => html.walk(child, func, ...params))
}

/**
 * Add **...children** as first **parent** children.
 */
html.unshift = function (parent, ...children) {
  for (let i = 0; i < children.length; i++) {
    parent.insertBefore(children[i], parent.childNodes[i])
  }
}
