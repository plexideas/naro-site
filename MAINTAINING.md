# Maintaining the Naro website

- Keep this website checkout separate from the native application project.
- GitHub repository: `plexideas/naro-site`.
- Netlify publish directory: `docs`; production branch: `main`.
- Netlify runs the build, lint and tests from `netlify.toml`. Install Node 24 dependencies with `npm ci`. Analytics uses Netlify Functions and Blobs; no external analytics account or new environment variables are required.
- Never add OAuth client JSON, tokens, `.env` files, local account data, private documents, or native build artifacts to this repository.
- The screenshot comes from the app’s isolated integration run and contains only sample files and an `example.com` address.
- Existing Naro and document icons are used without alteration.

## Checks before publishing

Run `npm run build`, `npm run check` and `npm test` before publishing. Preview desktop and mobile layouts before design changes. Public downloads must not be announced until an installer is actually published and tested.

## Domain and Google verification

Connect an owned domain in Netlify and complete Google Search Console domain verification before submitting it for Google branding verification. No production URL is hard-coded in the HTML: internal links and assets work on both a Netlify preview and the final domain.

After the final domain is known, add canonical URLs and an absolute `og:image` URL for social previews, and link the deployed site from this README and the GitHub repository homepage. Keep a reachable support email in Google Auth Platform and add the chosen public support address to the site.

The privacy page describes the current app and planned Netlify hosting. Recheck it against each release, including any future update service or diagnostics. Removing an account currently clears local authorization, but users must revoke Google access separately.

## Scope

This repository contains the website only. No application binaries, update feed, automatic updater, or Google Console changes are published by it. No application license has been selected. The owner connects the repository to Netlify; no Netlify deployment has been created by preparing this repository.

## Languages

Edit the shared English HTML in `templates/` and maintain all nine catalogs in `locales/`. Regenerate and commit `docs/` with the source changes. The generator requires identical catalog keys and writes canonical URLs, alternate-language links and a sitemap. Do not edit generated pages directly. The Russian maintainer dashboard `docs/stats.html` is authored separately and excluded from the sitemap.

## Analytics

Open https://naro.tools/stats for daily visitors, daily visitors who clicked a download/release link, conversion, and all-time GitHub installer download counts. Public reporting contains aggregate counts only. The dashboard does not track its own visits. Data collection began September 24, 2026; historical visits are unavailable.

The daily visitor key is an HMAC of the platform client IP and user agent using a random daily salt. Neither raw value is stored in our Blobs records or logged by these functions. This estimates daily visitors, not exact people: shared networks/browser versions can merge visitors and changes of network can split them. Repeated events write the same key; no read-modify-write counter can lose concurrent visits. Download clicks also record a visit. Salt creation uses atomic `onlyIfNew` writes with strong reads.

The `naro-analytics` store persists across production deploys. Non-production deploys use a separate store named with their deploy ID. Scheduled cleanup runs at 03:00 UTC, keeping 30 UTC calendar days of events and removing previous days' salts. Netlify's own infrastructure logs are subject to its policies. No analytics cookie or browser identifier is created.

GitHub DMG/ZIP totals include repeats, automated downloads and updates from all sources. Neither button clicks nor GitHub counts prove completed transfers, unique people or installs. Existing counters can disappear if GitHub assets are replaced or removed. API failures remain visible instead of becoming zeroes.

For local integration tests use `npx netlify-cli dev --offline --dir docs`. The browser tracker only sends from the production domains. Test the event API with a matching Origin header, then fetch `/api/analytics`. Use user agent `NaroAnalyticsCheck` for production health checks that must not increment counts. Never seed production with test data. Netlify function rate limits restrict collection and reports per IP.

Capture translated screenshots using `native/localization_integration.py` in the separate application project. Only fixture accounts and sample documents may appear. Keep the app name Naro unchanged in all translations. Check keyboard access to the language menu and desktop/mobile overflow before publishing.

The compact globe menu works without JavaScript. `docs/language.js` adds browser-language detection on unprefixed URLs, remembers manual selection locally, preserves query strings and anchors, and closes the menu on Escape or an outside click. Explicit language URLs must never be redirected. Run the browser language checks after changing this behavior.
