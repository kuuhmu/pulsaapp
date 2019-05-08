"use_strict"
/**
 * Donate Interface
 */
const { CosmicLink } = require("cosmic-lib")
const { __ } = require("@cosmic-plus/i18n")

const SideFrame = require("./side-frame")

const MYPUBKEY = "GAWO2C52D57XBT7SQL6YB3XPHFLFD2J4Z5RN7HPFZSHXJMXH72HRXNV3"

module.exports = function promptDonation () {
  const amount = prompt(`\
${__("Equilibre.io runs on donation.")}\
${__("Each contribution is a pleasant surprise for me. :)")}

${__("Enter an amount (in Lumens)")}:\
`)

  if (amount === "0" || isNaN(+amount)) {
    confirm(`${__("Not a valid amount")}: ${amount}`)
  } else if (amount) {
    showDonateFrame(amount)
  }
}

function showDonateFrame (amount) {
  const memo = __("Donation to Equilibre.io")
  const network = "public"
  const cosmicLink = new CosmicLink({ memo, network }).addOperation("payment", {
    amount,
    destination: MYPUBKEY
  })

  new SideFrame(cosmicLink.uri)
}
