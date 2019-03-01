"use_strict"
/**
 * Queue - Delaying data fetching
 */

const { timeout, setHiddenProperty } = require("@cosmic-plus/jsutils/misc")

module.exports = class Queue extends Array {
  constructor (timeout) {
    super()
    setHiddenProperty(this, "timeout", timeout)
  }

  async push (thunk) {
    const trigger = new Promise(resolve => {
      Array.prototype.push.call(this, resolve)
    })
    if (this.length === 1) this.next()
    return trigger.then(() => thunk())
  }

  async next () {
    while (this.length) {
      this[0]()
      await timeout(this.timeout)
      this.shift()
    }
  }
}
