"use strict"
/**
 * Donate Interface
 */
const { CosmicLink } = require("cosmic-lib")
const { __ } = require("@cosmic-plus/i18n")

const SideFrame = require("./side-frame")

const MYPUBKEY = "GC6Z477WPMLJDLMBJPSCTIJA33V7F5EB7ZH5OIKZEUQUBAWKJZH42JVW"

module.exports = function promptDonation () {
  const amount = prompt(`\
${__("Equilibre.io runs on donation.")} \
${__("Each contribution matters to me.")} \
${__("Thank you!")}

${__("Enter an amount (in Lumens)")}:\
`)

  if (amount === "0" || isNaN(+amount)) {
    confirm(`${__("Not a valid amount")}: ${amount}`)
  } else if (amount) {
    showDonateFrame(amount)
  }
}

function showDonateFrame (amount) {
  const memo = __("Donation to Cosmic.plus")
  const network = "public"
  const cosmicLink = new CosmicLink({ memo, network }).addOperation("payment", {
    amount,
    destination: MYPUBKEY
  })

  new SideFrame(cosmicLink.uri)
}
