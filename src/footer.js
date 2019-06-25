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
    require("@fortawesome/fontawesome-free/svgs/brands/keybase.svg"),
    "Keybase",
    "https://keybase.io/team/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/telegram-plane.svg"),
    "Telegram",
    "https://t.me/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/reddit.svg"),
    "Reddit",
    "https://reddit.com/r/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/twitter.svg"),
    "Twitter",
    "https://twitter.com/cosmic_plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/medium.svg"),
    "Medium",
    "https://medium.com/cosmic-plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/brands/github.svg"),
    "GitHub",
    "https://github.com/cosmic-plus/webapp-equilibre-io"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/solid/globe.svg"),
    __("Website"),
    "https://cosmic.plus"
  ),
  new Icon(
    require("@fortawesome/fontawesome-free/svgs/solid/envelope.svg"),
    __("Email"),
    "mailto:mister.ticot@cosmic.plus"
  ),
  new Icon(require("../bundled/donate.svg"), "Donate", donate)
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
