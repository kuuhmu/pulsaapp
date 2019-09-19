"use strict"
/**
 * Footer
 */
const Gui = require("@cosmic-plus/domutils/es5/gui")
const html = require("@cosmic-plus/domutils/es5/html")
const { __ } = require("@cosmic-plus/i18n")

const donate = require("./helpers/donate")
const Icon = require("./helpers/icon")

const global = require("./logic/global")

/**
 * Class
 */

class Footer extends Gui {
  constructor (icons, links) {
    super(
      `
<footer id="footer" class="scrollable">
  <div class="nobreak">%icons...</div>
  %links
</footer>
    `,
      { icons, links }
    )
  }
}

/**
 * Icons
 *
 * SVG from @fortawesome/font-awesome-free
 * CC BY 4.0 License (https://creativecommons.org/licenses/by/4.0/)
 */

const icons = [
  new Icon(
    require("@cosmic-plus/assets/svg/cosmic-plus.svg"),
    __("by Cosmic.plus"),
    "https://cosmic.plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/twitter.svg"),
    __("Follow on Twitter"),
    "https://twitter.com/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/reddit.svg"),
    __("Follow on Reddit"),
    "https://reddit.com/r/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/medium.svg"),
    __("Follow on Medium"),
    "https://medium.com/cosmic-plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/telegram-plane.svg"),
    __("Chat on Telegram"),
    "https://t.me/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/keybase.svg"),
    __("Chat on Keybase"),
    "https://keybase.io/team/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/github.svg"),
    __("GitHub Repository"),
    "https://git.cosmic.plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/solid/envelope.svg"),
    __("Contact by Email"),
    "mailto:mister.ticot@cosmic.plus"
  ),
  new Icon(
    require("@cosmic-plus/assets/svg/donate.svg"),
    __("Donate Lumens"),
    donate
  )
]

/**
 * Links
 */
const links = new Gui(
  `
<p>
  <a onclick=%displayLicense>${__("License")}</a>
  − <a onclick=%displayDisclaimer>${__("Disclaimer")}</a>
  − <a onclick=%displayAbout>${__("About")}</a>
</p>
`,
  {
    displayLicense: () => global.tabs.select("#license"),
    displayDisclaimer: () => global.tabs.select("#disclaimer"),
    displayAbout: () => global.tabs.select("#about")
  }
)

/**
 * Create footer
 */

const footer = new Footer(icons, links)
html.append(document.body, footer)
