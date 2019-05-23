"use strict"
/**
 * form.js − Generate formulary with ease
 *
 * Differences with ordinary interface:
 *
 * - Form request is sent only if `method="get"` or `method="post"` is
 *   explicitely set.
 * - Form inputs are `required` by default.
 * - Select control is renamed selector (verbs are reserved).
 */

const Projectable = require("@cosmic-plus/jsutils/es5/projectable")
const hiddenKey = require("@cosmic-plus/jsutils/es5/misc").setHiddenProperty

const bindDomKey = require("./bind-dom-key")
const handleExtraAttributes = require("./handle-extra-attributes")
const html = require("./html-extra")

/**
 * Definition
 */

class Form extends Projectable {
  /**
   * Two forms:
   *
   * * new Form($form, attributes)
   * * new Form([attributes], ...childs)
   */
  constructor (...params) {
    super()

    // Import or create the form DOM node.
    if (params.length && params[0].tagName === "FORM") {
      hiddenKey(this, "domNode", params[0])
      if (params[1]) Object.assign(this.domNode, params[1])
    } else {
      hiddenKey(this, "domNode", html.element("form", ...params))
    }

    // Validation - request is sent only if a method is explicitely set.
    this.domNode.addEventListener("submit", () => {
      const method = this.domNode.getAttribute("method")
      if (!method) event.preventDefault()
      this.trigger("submit")
    })

    // Bind values
    Form.bindInputs(this, this.domNode)
    hiddenKey(this, "dom", handleExtraAttributes(this.domNode))

    // Add message box if none exists.
    if (!this.dom.status) {
      this.dom.status = [Form.status()]
      html.append(this.domNode, this.dom.status[0])
    }
  }

  /**
   * Controls
   */

  submit () {
    this.domNode.submit()
  }

  reset () {
    this.domNode.reset()
  }

  /**
   * Status Display
   */

  report (type, ...content) {
    const $status = this.dom.status[0]
    if ($status) {
      $status.className = type
      html.rewrite($status, ...content)
    }
  }

  info (content) {
    this.report("info", content, Form.spinner())
  }

  error (content) {
    // Extract message from Error object. (TODO: handle it in html)
    this.report("error", content.message || content)
    if (content instanceof Error) throw content
    else throw new Error(content)
  }
}

// Automatically clean report on user input.
Form.listen("change", event => event.report(null))

/**
 * Binding
 */

Form.bindInputs = function (object, $node) {
  html.walk($node, binder, object)
}

function binder ($node, object) {
  if ($node.name) bindDomKey(object, $node.name, $node)
}

/**
 * Helpers (Actions)
 */

Form.enable = function (element, attributes) {
  element.disabled = false
  Object.assign(element, attributes)
}

Form.disable = function (element, attributes) {
  element.enabled = true
  Object.assign(element, attributes)
}

Form.hide = html.hide
Form.show = html.show

/**
 * Elements
 */

Form.element = html.element

Form.status = function (message = "") {
  return Form.element("p", { alias: "status" }, message)
}

Form.spinner = function () {
  return Form.element("span", { className: "spinner" })
}

Form.label = function (...params) {
  return Form.element("label", ...params)
}

Form.button = function (params, ...childs) {
  if (!childs.length) childs = [params.value]
  return Form.element("button", params, ...childs)
}

Form.control = function (tag, params) {
  const defaults = { required: true }
  const attributes = Object.assign(defaults, params)
  return Form.element(tag, attributes)
}

Form.textarea = function (params) {
  return Form.control("textarea", params)
}

Form.selector = function (params) {
  const selector = Form.control("select", params)
  if (selector.values) {
    html.append(selector, ...makeOptions(selector.values))
  }
  if (selector.placeholder) {
    const placeholder = html.element(
      "option",
      { value: "", disabled: true, selected: true, hidden: true },
      selector.placeholder
    )
    html.unshift(selector, placeholder)
    if (params.selectedIndex != null) params.selectedIndex++
  }

  if (params.selectedIndex) selector.selectedIndex = params.selectedIndex
  else if (params.value) selector.value = params.value

  return selector
}

Form.input = function (type, params = {}) {
  const input = Form.control("input", params)
  input.type = type
  return input
}

// Exclude: button, datetime-local, reset, submit, select, search (no verbs)
const inputTypes = [
  "checkbox",
  "color",
  "date",
  "email",
  "file",
  "hidden",
  "image",
  "month",
  "number",
  "password",
  "radio",
  "range",
  "tel",
  "text",
  "time",
  "url",
  "week"
]

inputTypes.forEach(type => Form[type] = params => Form.input(type, params))
Form.datetime = params => Form.input("datetime-local", params)

/**
 * Elements Helpers
 */

function makeOptions (object) {
  if (object instanceof Array) {
    return object.map(value => {
      return html.element("option", { value }, value)
    })
  } else {
    return Object.keys(object).map(value => {
      return html.element("option", { value }, object[value])
    })
  }
}

/**
 * Export
 */

module.exports = Form
