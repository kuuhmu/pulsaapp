"use strict"
/**
 * Donate Interface
 */
const { CosmicLink } = require("cosmic-lib")
const { __ } = require("@cosmic-plus/i18n")

module.exports = function promptDonation () {
  const amount = prompt(`\
${__("Donations are put to good use.")} \
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
  const destination = "tips*cosmic.plus"
  const cosmicLink = new CosmicLink({ memo, network }).addOperation("payment", {
    amount,
    destination
  })

  cosmicLink.open()
}
