# Changelog

All notable changes to this project will be documented in this file.

This project adheres to **[Semantic
Versioning](https://semver.org/spec/v2.0.0.html)**. Version syntax is
`{major}.{minor}.{patch}`, where a field bump means:

- **Patch**: The release contains bug fixes.
- **Minor**: The release contains backward-compatible changes.
- **Major**: The release contains compatibility-breaking changes.

**Remember:** Both micro and minor releases are guaranteed to respect
backward-compatibility and can be updated to without risk of breakage. For major
releases, please check this changelog before upgrading.

## 1.17.0 - 2021-09-17

### Added

- UI: List CityStates Medieval (CSM).
- UI: List USD Coin (USDC).

### Changed

- UI: Remove support for FRAS & WLO.

## 1.16.0 - 2021-04-03

### Changed

- Logic: Switch to a new fiat rate API.

## 1.15.1 - 2021-04-03

### Changed

- Data: Set naobtc & fchain anchors as unpeg.

### Fixed

- Logic: Fix an API change that broke the app. (Thanks alioli)

## 1.15.0 - 2021-01-11

### Changed

- Logic: Upgrade to stellar-sdk 7.x.
- UI: Remove StellarPort.io anchors until market making gets fixed. The high
  spread and low volume negatively impact Equilibre.io performance.

## 1.14.0 - 2020-11-08

### Changed

- Meta: Update depends.

## 1.13.1 - 2020-09-12

### Fixed

- UI: Fix portfolio history graph. A change in Coingecko caused it to not
  compute anymore.

## 1.13.0 - 2020-07-25

### Changed

- Meta: Keep all images in browser cache. Speeds-up loading, +360Ko in cache.

## 1.12.0 - 2020-07-19

### Changed

- Meta: Update application icons & PWA theme (again).

## 1.11.0 - 2020-07-05

### Changed

- Meta: Upgrade icons & PWA colors.
- Style: Upgrade charts colors.
- Style: Polish small-screen tab selector.
- Style: Polish selectors style.
- Style: Normalize form elements style across OS.
- Style: More form elements polishing.

### Fixed

- UI: Fix iOs 13 rebalancing side-frame bug.

## 1.10.0 - 2020-06-21

### Added

- UI: Add images in the welcoming page.

### Changed

- UI: Change donation address.
- UI: Upgrade graphic style.

### Fixed

- Security: Upgrade deprecated depend. (Highcharts => 8.x)
- UI: Fix french translation.

## 1.9.1 - 2020-05-04

### Fixed

- Logic: Fix apay.io USDT support. (now considered as an USD anchor)

## 1.9.0 - 2020-05-02

### Added

- Data: Add support for apay.io USDT anchor.

### Changed

- Data: Update demo configuration.

## 1.8.1 - 2020-04-19

### Fixed

- Logic: Fix transaction request generation. (regression from 1.8.0)
- UI: Fix a bug that prevented portfolio historic to display.

## 1.8.0 - 2020-04-18

### Changed

- Logic: Update hardware wallet libraries.

## 1.7.0 - 2020-01-25

### Added

- Data: Add market data for GNT (glitzkoin.com) & WLO (pigzbe.com). Equilibre.io
  won't offer to add those coins as their orderbooks are not strong enough, but
  users holding those coins can access market data & rebalancing options.

### Changed

- Data: Re-add asset EURT (tempo.eu.com). Tempo solved its liquidity issues &
  the orderbook is stable since more than a month.
- Data: List asset WXT (wirexapp.com).

## 1.6.0 - 2020-01-11

### Added

- Logic: Add dust burning. Until now, Equilibre.io was failing to close some
  trustlines because dust worth under 0.0000001XLM cannot be sold on the DEX.
  This dust is now sent back to the emitter to bring the balance to 0 before
  closing the trustline.

### Changed

- Logic: Upgrade @cosmic-plus/ledger-wallet to 2.x.
- UI: Remove `FRAS` from listed assets. The FRAS/XLM pair is not liquid enough
  anymore.
- UI: Update demo account configuration.

### Fixed

- Logic: Close offers before trustlines. Prevent errors when trying to remove an
  asset with a balance of 0 that has open offers.

## 1.5.1 - 2019-11-30

### Fixed

- Meta: Fix `font/roboto-slab.woff` filename.

## 1.5.0 - 2019-11-30

### Changed

- Meta: Preload script & style.

### Fixed

- UI: Get rid of font loading delay.

## 1.4.3 - 2019-11-23

### Fixed

- Data: Remove `x.token.io` from listed USD anchors. While the token can still
  be traded at the expected price, the order book became thin lately, and it
  looks like <x.token.io> is not caring its anchor anymore.

## 1.4.2 - 2019-11-15

### Fixed

- Logic: Fix liquidation of one-of-several anchor. For assets having multiple
  anchors, liquidation of only one of the anchors was failing on the last dust.

## 1.4.1 - 2019-11-09

### Fixed

- Configuration: Remove PEDI from listed asset. The PEDI/XLM pair doesn't comply
  with Equilibre.io requirements anymore. (volume is too low, spread is at 60%)

- UI: Fix spread percentage formula.
  - spread = ask - bid
  - spread% = 100 \* spread / ask

## 1.4.0 - 2019-10-05

### Added

- UI: Add Trezor Wallet support.
- UI: Add icons for hardware wallets.

### Changed

- Logic: Upgrade [@cosmic-plus/ledger-wallet] to 1.x.
- Logic: Upgrade [@cosmic-plus/trezor-wallet] to 0.2.x.

## 1.3.1 - 2019-09-28

### Fixed

- Translation: Fix french translation.

## 1.3.0 - 2019-09-21

### Changed

- Meta: Update donation address.
- UI: Update footer icons.

## 1.2.1 - 2019-09-09

### Fixed

- Logic: Fix federated address resolution. This have been broken by 1.1.0. -
  Thanks [@m4dpr0ph3ss0r](https://keybase.io/m4dpr0ph3ss0r)

## 1.2.0 - 2019-09-07

### Changed

- API: Upgrade [cosmic-lib] to 2.x. (protocol changes)

### Fixed

- Meta: Fix a rare application upgrade bug. Bypass browser cache when fetching
  latest release to prevent possible unconsistent upgrade.

## 1.1.1 - 2019-08-31

### Fixed

- UI: Fix a style regression from 1.1.0. Highcharts needs to use inline style.

## 1.1.0 - 2019-08-31

### Added

- Security: Add strict Content-Security-Policy.

## 1.0.5 - 2019-08-10

### Fixed

- Fix spread percentage definition: `100*(bestAsk-bestBid)/midpoint`.

## 1.0.4 - 2019-08-03

### Changed

- Remove REPO from default assets list as it doesn't match listing requirements
  anymore (low spread, decent daily volumes).

### Fixed

- Lock rebalancing transaction request to public network.

## 1.0.3 - 2019-07-23

### Fixed

- Workaround an issue introduced in [stellar-sdk] 2.0.1 that broke portfolio
  history retrieval.

## 1.0.2 - 2019-07-22

### Changed

- Improve mobile display.
- Throw an error when a too low XLM allocation would cause rebalancing to take
  more than 20 steps.
- Remove thewwallet.com WSD from anchors choice because it has not enough volume
  anymore.

### Fixed

- Ensure that outdated offers are replaced before new one are passed. This fixes
  cases in which outdated offers prevented to pass new ones due to liability
  threshold.
- Fix a case in which clicking "Cancel" in the target setup dialog would not
  reset target setting to the previous state.
- Fix several miscalculations related to balancing assets with multiple anchors
  & liquidation. In some cases, those mistakes were preventing trades to be
  passed, or were causing trades to be passed with lower amount than expected.
  (Thanks m4dpr0ph3ss0r)

## 1.0.1 - 2019-07-11

### Fixed

- Fix a bug that sometime caused rebalancing transactions to be invalid. (Thanks
  m4dpr0ph3ss0r)

## 1.0.0 - 2019-07-06

### Added

- Deal with cases where there's not enough XLM to rebalance the portfolio in one
  step.
- Lock a minimum XLM balance to pay for network reserve & offers.

### Changed

- Theme Highstock according to new Equilibre.io colors.
- Target configuration form appears in a modal box.
- Add a title to each card.
- Don't raise an error anymore when rebalancing target is over/under portfolio
  total value by less than 1‰.

### Fixed

- Fixed a bug that could lock the app on very low width display.
- Reduce font size on wider screens. (Thanks [@Pselden] & Damian)
- Fix a case in which allocation check limits were bypassed.

## 0.11.2 - 2019-06-28

### Fixed

- Adjust text size on small screen devices.
- Fix Source Sans Pro font path.

## 0.11.1 - 2019-06-28

### Changed

- Complete interface re-design. (Thanks Alris Can)
- Make demo easier to spot.

## 0.11.0 - 2019-06-25

### Added

- Legal disclaimer.

### Changed

- Rewrite 'Welcome' page.
- Easier access to the demo account & the related article.
- Tiny theme tweaks.

## 0.10.2 - 2019-06-22

### Changed

- Update [cosmic-lib] to 1.5.1. (Security fix)

## 0.10.1 - 2019-06-17

### Fixed

- Fix an error in fiat historical price refreshing that prevented portfolio
  history to get computed in some cases.

## 0.10.0 - 2019-06-15

### Added

- Add the portfolio history chart.

### Removed

- Removed pricing in fiat currencies that were not fully supported: BGN, HRK,
  ISK & RON.

### Changed

- Dramatically improve historical prices caching & performance.
- Use Highstock for all charts (saves 224Kb).
- Automatically reload the application once an update gets installed.

### Fixed

- Properly fetch the orderbook for assets with code "XLM" which are not native
  lumens.
- Fix a case in which the price graph printed a value one day in the future.

## 0.9.1 - 2019-06-08

### Changed

- Improve theme: font & background colors, element spacing, form styling, chart
  font & colors, smaller footer, small screen display...

## 0.9.0 - 2019-06-01

### Added

- It is now possible to add new assets to the portfolio.
- It is now possible to enable/disable anchors on-the-fly for tethered assets
  that have multiple known anchors. The rebalancing algorithm will gradually
  move the funds to comply with the new setup in about 5~15 steps.
- Add the "remove" rebalancing mode to liquidate an asset and remove its
  trustlines.

### Changed

- Try to make an additional profit when an anchor for a tethered asset is out of
  balance.
- Up-to-date targets for demo portfolio.

### Fixed

- Fix a regression introduced in 0.8.0 that prevented rebalancing operations to
  get generated in some cases.
- Raise up the number of fetched offers for orderbooks to fix an edge-case where
  price estimation for native assets other than Lumens would fail.
- Handle the edge-case of a fully rebalanced portfolio which has obsolete offers
  to cancel.
- US Dollar name now displays properly.
- Truncate default quantity in target size setup.
- Fix a rare bug that prevented new trustline to show up.
- Fix a rare bug that prevented target of empty balance to be computed properly.

## 0.8.1 - 2019-05-24

### Changed

- The portfolio pie chart is now displayed instantly.

### Fixed

- Portfolio pie chart: Fix cases that caused wrong positioning.
- Portfolio price chart: Make data for last day display properly (a timestamp
  issue caused weird roundings for crypto assets).
- Fix a bug that caused sell offers under 1XLM to pick absurdly high prices
  instead of being filtered out.

## 0.8.0 - 2019-05-17

### Added

- Rebalancing: Assets with multiple anchors whose are imbalanced now gets
  pro-actively rebalanced. This happens once the asset itself is balanced
  enough. This is done by little steps to mitigate the risks when only one of
  the two balancing trade is taken: anchorA to XLM or XLM to AnchorB.

### Changed

- Rebalancing: Native assets other than lumens don't use global market prices
  anymore, as those prices are not reliable due to market manipulations. This
  change affects valuation & price picking of: MOBI, REPO, RMT, SLT, TERN.
- Rebalancing: Anchors risk-balancing rules are now strictly applied when
  crafting transactions.
- Improve compliance with the [PWA] standard.
- Improve loading time.

## 0.7.0 - 2019-05-11

### Added

- Settings: 30 additional reference currencies (total: 33).

### Fixed

- Rebalancing: Being the quote currency, XLM cannot be in "ignore" mode.

## 0.6.1 - 2019-05-04

### Fixed

- Fix a mistake that prevented to select "Ignore" rebalancing mode.

## 0.6.0 - 2019-05-03

### Compatibility

This version comes with significant changes to the rebalancing targets
configuration. It will automatically convert your previous setup to the new
format. The first time you'll rebalance your portfolio, you'll have to
`[Save]` the converted configuration (which will lead to exactly the same
balance).

### Added

- New balancing mode "weight" that replaces "equal". Weight let you specify
  relative sizes for your positions. Once "percentage" & "quantity" targets have
  been allocated, the remaining funds are split between "weight" targets.
- New balancing mode "ignore".

### Changed

- Balancing mode "percentage" is now strictly applied. Before, it would act as
  "weight" in case unallocated funds remains − which could lead to a confusing
  user experience.
- Raise an error when total "percentage" targets are over hundred. Before, it
  would lower every target to get back to a valid sum − but this could lead to
  confusion as well.
- Remove Stronghold anchors from the trusted list. (Not active anymore)
- Rebalancing interface displays "Goal" according to rebalancing mode
  (weight/percentage/quantity/ignore).
- Rebalancing interface "Divergence" is now displayed relatively to portfolio
  total value.

### Fixed

- All overallocation/underallocation cases are now properly detected.
- Detect when an anchor order book is not tradable anymore.
- Rebalancing targets are now properly sorted after changes.
- Fix an inconsistency that would cause rebalance targets to be uselessly
  computed multiple times.
- Improve loading message spacing.

## 0.5.0 - 2019-04-19

### Added

- Logic for orders that need to take place over multiple anchors, such as
  position entries and exits.
- Equilibre.io will now tend to spread the position equally over asset multiple
  anchors.
- Apply price picking optimizations when rebalancing assets with quantity
  targets.
- Validity span of 5 minutes for transactions.
- Animate transaction signing frame.

### Fixed

- Fix background image of transaction signing frame.

## 0.4.5 - 2019-04-12

### Changed

- Rebalancing & activity tabs now refresh immediately after validating
  rebalancing operations.
- Improve memory management.
- Update [cosmic-lib] to 1.2.10.

### Fixed

- Fix a 0.4.4 regression which sometimes causes coin image to not display under
  activity tab.
- Fix a 0.4.4 regression which caused displayed anchor prices to be incorrect
  until first price refresh.
- Fix a bug that would cause rebalancing to fail when performed immediately
  after canceling offers - thanks [@ddombrowsy].

## 0.4.4 - 2019-04-05

### Changed

- Interface loads considerably faster.
- Interface reflects account/offers change considerably faster.

## 0.4.3 - 2019-04-04

### Fixed

- Fix a regression introduced in 0.4.2 that prevented optimal offer price
  picking.

## 0.4.2 - 2019-04-03

### Fixed

- Rebalancing orders are now computed right after login, as intended.
- Fix a memory leak in portfolio pie chart widget - thanks [@pawelfus].

## 0.4.1 - 2019-03-21

### Fixed

- Fixed a typo in welcome page.

## 0.4.0 - 2019-03-21

### Changed

- Fine-tuning of offers price picking.
- Rebalance algorithm will now pass less trades and assets shares will generally
  be better balanced.
- Assets whose global market price is not known is now is now defined as its bid
  price at a depth of 50XLM (assumed liquidation price). This is intended to
  prevent over-valuation of those assets.

### Removed

- Liquidity providing feature has been removed from the rebalancing algorithm.
  This feature had a negative effect on portfolio performance in case of
  important price moves.

### Fixed

- Fix chart display when pie slice is selected.

## 0.3.0 - 2019-03-14

### Added

- Equilibre.io can now be installed on some mobile devices
- Support for assets for which global market price is unknown

### Changed

- Improve portfolio pie chart responsivness
- Show some activity while login in
- Prevent interaction while login in

### Fixed

- Rebalancing now works as intended when setting a quantity target for an asset
- Rebalancing now works as intended when setting asset target to 0
- Fix a mistake that prevented marginal assets rebalancing setup to be saved
- Fix a case were marginal assets could not be rebalanced

## 0.2.0 − 2019-03-05

### Added

- Small screen interface (mobile-ready)
- Enable service worker

### Changed

- Switch to js-stellar-sdk 0.14.0
- Move "licence" tab into the footer

## 0.1.1 − 2019-02-18

### Fixed

- Fix portfolio template saving

## 0.1.0 − 2019-02-17

Beta 1 release

[cosmic-lib]: https://github.com/cosmic-plus/node-cosmic-lib/blob/master/CHANGELOG.md
[stellar-sdk]: https://github.com/stellar/js-stellar-sdk/blob/master/CHANGELOG.md
[@cosmic-plus/ledger-wallet]: https://cosmic.plus/#view:js-ledger-wallet/CHANGELOG
[@cosmic-plus/trezor-wallet]: https://cosmic.plus/#view:js-trezor-wallet/CHANGELOG
[pwa]: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Introduction
[@ddombrowsy]: https://github.com/ddombrowsky
[@pawelfus]: https://github.com/pawelfus
[@pselden]: https://github.com/pselden
