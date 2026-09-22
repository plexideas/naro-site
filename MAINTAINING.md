# Maintaining the Naro website

- Keep this website checkout separate from the native application project.
- GitHub repository: `plexideas/naro`.
- Pages source: `main`, `/docs`.
- Never add OAuth client JSON, tokens, `.env` files, local account data, private documents, or native build artifacts to this repository.
- The screenshot comes from the app’s isolated integration run and contains only sample files and an `example.com` address.
- Existing Naro and document icons are used without alteration.

## Checks before publishing

Run `python3 scripts/check.py` to lint public files and validate local links, metadata, and asset references. Preview desktop and mobile layouts before design changes. Public downloads must not be announced until an installer is actually published and tested.

## Before submitting to Google

The GitHub Pages URL is a public preview, not proof of verified domain ownership. Connect an owned domain, complete the Google Search Console domain verification, and then update canonical public links in the site and README. Keep a reachable support email in Google Auth Platform and add the chosen public support address to the site.

The privacy page describes the current implementation. Recheck it against each release, including any future update service or diagnostics. Removing an account currently clears local authorization, but users must revoke Google access separately.

## Scope

No application binaries, update feed, automatic updater, or Google Console changes are published by this website repository. No application license has been selected.
