# Maintaining the Naro website

- Keep this website checkout separate from the native application project.
- GitHub repository: `plexideas/naro-site`.
- Netlify publish directory: `docs`; production branch: `main`.
- No build command, dependencies, backend, or environment variables are required.
- Never add OAuth client JSON, tokens, `.env` files, local account data, private documents, or native build artifacts to this repository.
- The screenshot comes from the app’s isolated integration run and contains only sample files and an `example.com` address.
- Existing Naro and document icons are used without alteration.

## Checks before publishing

Run `python3 scripts/build.py` and `python3 scripts/check.py` to lint public files and validate local links, metadata, and asset references. Preview desktop and mobile layouts before design changes. Public downloads must not be announced until an installer is actually published and tested.

## Domain and Google verification

Connect an owned domain in Netlify and complete Google Search Console domain verification before submitting it for Google branding verification. No production URL is hard-coded in the HTML: internal links and assets work on both a Netlify preview and the final domain.

After the final domain is known, add canonical URLs and an absolute `og:image` URL for social previews, and link the deployed site from this README and the GitHub repository homepage. Keep a reachable support email in Google Auth Platform and add the chosen public support address to the site.

The privacy page describes the current app and planned Netlify hosting. Recheck it against each release, including any future update service or diagnostics. Removing an account currently clears local authorization, but users must revoke Google access separately.

## Scope

This repository contains the website only. No application binaries, update feed, automatic updater, or Google Console changes are published by it. No application license has been selected. The owner connects the repository to Netlify; no Netlify deployment has been created by preparing this repository.

## Languages

Edit the shared English HTML in `templates/` and maintain all nine catalogs in `locales/`. Regenerate and commit `docs/` with the source changes; Netlify still serves static files without a build step. The generator requires identical catalog keys and writes canonical URLs, alternate-language links and a sitemap. Do not edit generated pages directly.

Capture translated screenshots using `native/localization_integration.py` in the separate application project. Only fixture accounts and sample documents may appear. Keep the app name Naro unchanged in all translations. Check keyboard access to the language menu and desktop/mobile overflow before publishing.
