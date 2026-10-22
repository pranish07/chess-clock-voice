# Publishing to the Chrome Web Store

This is the release runbook for Chess Clock Voice. The Developer Dashboard changes occasionally; where a label or limit is not guaranteed, verify it in the current dashboard.

- [README](README.md)
- [Store listing](store/LISTING.md)
- [Privacy policy](store/PRIVACY.md)
- [Architecture](ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)

## Prerequisites

- A Google account with 2-Step Verification.
- A Chrome Web Store developer account. Google currently charges a **one-time US$5 registration fee**; verify the current amount in the dashboard.
- A verified publisher contact email.
- A publicly reachable HTTPS privacy policy URL.
- The packaged ZIP: `release/chess-clock-voice-<version>.zip`.
- Store assets from `store/` plus screenshots you capture at **1280×800**.
- A support email you are willing to show on the listing.

## Pre-release checklist

```bash
npm install
npm run lint
npm test
npm run build
npm run package
```

Then:

- [ ] Bump the version with `npm run bump -- patch|minor|major|x.y.z`.
- [ ] Add a `CHANGELOG.md` entry under the new version (and keep `[Unreleased]` for the next change).
- [ ] Confirm `package.json`, `manifest.json`, and the ZIP filename all show the same version.
- [ ] Inspect the ZIP: `manifest.json` is at the root, `_locales/en/messages.json` is present, icons are present, and there are no source maps or dev-only files.
- [ ] Load `dist/` unpacked in a clean Chrome profile with no other extensions.
- [ ] Test a bullet, blitz, and rapid game; test both colors; test an increment game and a no-increment game.
- [ ] Test “my clock”, “opponent”, and “both”; test master off; test options save/reset/validation and a custom preset.
- [ ] Test at least two voices and the Test voice button.
- [ ] Open DevTools → Network while using the extension: there must be no extension-originated network requests.
- [ ] Confirm the manifest requests only `storage` and `https://*.chess.com/*`.
- [ ] Verify `dist/manifest.json` does not include `scripting`, `tabs`, `cookies`, `webRequest`, or `<all_urls>`.
- [ ] Re-verify selectors on the live site and update the “last verified” status in [docs/SELECTORS.md](docs/SELECTORS.md) only after real checks.

The current package is produced by `scripts/package.mjs`; it excludes `*.map` paths and writes `release/chess-clock-voice-<version>.zip`.

## Create the developer account

1. Go to <https://chrome.google.com/webstore/devconsole>.
2. Sign in with the publisher Google account.
3. Accept the developer agreement.
4. Pay the one-time registration fee.
5. Verify the publisher email and enable 2-Step Verification.
6. Complete the publisher profile (name, contact email, optional website).

The account and fee are shared by all extensions under that publisher.

## Upload the extension

1. In the Developer Dashboard, click **New item**.
2. Upload `release/chess-clock-voice-<version>.zip`.
3. Wait for package validation. Fix any manifest, icon, locale, or content-script errors before continuing.
4. The draft item is created. You can keep it unlisted until review passes.

## Store listing

Copy the fields from [store/LISTING.md](store/LISTING.md):

- **Name:** Chess Clock Voice – Spoken Time Alerts
- **Short description:** 119 characters; under the 132-character limit.
- **Category:** Productivity.
- **Language:** English.
- **Pricing:** Free.
- **Mature content:** No.
- **Icon:** `store/icon-128.png`.
- **Screenshots:** 1280×800, 3–5 images, per the screenshot plan.
- **Small promo tile:** `store/promo-tile-440x280.png`.
- **Support URL / homepage:** optional; use a stable page you control.
- **Official URL:** optional.

Verify the description does not promise board analysis, move help, or any feature the extension does not have. Do not mention engine assistance or cheating.

## Privacy practices

Open the **Privacy practices** tab.

### Single purpose

> Speaks the remaining seconds on the user's chess.com clock when time is low, using the browser's local speech synthesis.

### Permission justification

Use the text in [store/LISTING.md](store/LISTING.md#permission-justification-text):

- **`storage`** — save settings and presets in `chrome.storage.sync`; configuration only, no game data.
- **`https://*.chess.com/*`** — declare the content script that reads clock text, running state, time-control label, and clock placement on chess.com game pages.

### Data usage

Answer **No** to collecting or using personal data, health/financial/authentication/communications/location/web-history/user-activity data, selling/transferring data, unrelated use, and creditworthiness/lending. The extension has no server, analytics, accounts, or remote code.

### Privacy policy URL

Host [store/privacy-policy.html](store/privacy-policy.html) at a public HTTPS URL. Options:

1. **GitHub Pages:** put the file in a repository's `docs/` or root, enable Pages, use the resulting URL.
2. **Netlify / Cloudflare Pages / Vercel:** deploy `store/` as a static site.
3. **Your own site:** upload the HTML to a stable path.

The URL must open without login in an incognito window. Keep it in sync with [store/PRIVACY.md](store/PRIVACY.md).

## Required assets

| Asset                      | Size                                                  | Source                                                           |
| -------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| Extension icon             | 128×128 PNG                                           | `store/icon-128.png`; manifest also ships 16/48/128              |
| Screenshots                | 1280×800 or 640×400, PNG/JPEG, 1–5 (3–5 recommended)  | Capture per [store/LISTING.md](store/LISTING.md#screenshot-plan) |
| Small promo tile           | 440×280 PNG/JPEG                                      | `store/promo-tile-440x280.png`                                   |
| Large promo tile / marquee | Optional; use the size shown in the current dashboard | Not required for launch                                          |
| Privacy policy             | Public HTTPS page                                     | `store/privacy-policy.html`                                      |

## Distribution and visibility

- **Visibility:** Public, or Unlisted for a soft launch.
- **Regions:** all regions unless there is a reason to restrict.
- **Pricing:** free; no payments.
- **Distribution:** Chrome Web Store only.

## Submit for review

1. Re-check every tab for missing required fields.
2. Click **Submit for review**.
3. Typical first review is 1–3 business days; permission-sensitive extensions can take longer.
4. Watch the publisher email and dashboard for reviewer questions.

### Common rejection reasons and how this project avoids them

| Rejection reason                      | How this project avoids it                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Excess or unjustified permissions     | Only `storage` + `https://*.chess.com/*`; no `tabs`, `scripting`, cookies, or `<all_urls>`     |
| Unclear single purpose                | Clock-only statement repeated in listing, privacy policy, and UI                               |
| Remote code                           | All JS bundled; the only dynamic import is a local `chrome.runtime.getURL()` chunk             |
| Missing or unreachable privacy policy | Hosted HTML; no-login URL checked in incognito                                                 |
| Data disclosure mismatch              | “No data collection” matches code: no server, analytics, or remote settings                    |
| Misleading screenshots or description | Screenshots show only the real popup/options and clock UI; no engine, evaluation, or move help |
| Host permission broader than needed   | Host match limited to chess.com; no other sites                                                |
| Broken package                        | Inspect the ZIP root, manifest, locales, and icons before upload                               |
| Unclear audio behavior                | Local `speechSynthesis`; Test voice button; no cloud TTS                                       |

If a reviewer asks for a demo, give exact steps: open a chess.com live game, set a threshold to 60 s, wait for the clock to cross it, and use Test voice. Do not ask the reviewer for account credentials.

## After approval

- Install from the store in a clean profile and repeat the smoke tests.
- Pin the extension and confirm the popup opens.
- Check the listing on desktop and mobile widths.
- Keep the store version, `manifest.json`, and `package.json` in sync.
- Tag the released commit and keep the matching ZIP.

## Publishing an update

```bash
npm run bump -- patch   # or minor / major / x.y.z
npm test
npm run package
```

1. Add the changelog entry.
2. Upload the new ZIP to the same item.
3. Update “What's new”.
4. Submit for review. The version must be higher than the published version.
5. Chrome updates installed copies after approval.

## Rollback and emergency response

The Chrome Web Store does not provide instant rollback to a previous version. If a release is broken:

1. Fix the issue.
2. Bump the patch version.
3. Publish a new build as fast as review allows.
4. As an emergency measure, unpublish the item; existing installs may remain until they update or the item is removed.
5. If the issue is a bad host permission or data flow, unpublish first, then fix and re-review.

Keep every `release/*.zip` and the matching git tag so a known-good build can be re-uploaded under a new version.

## Final asset checklist

- [ ] `store/icon-128.png` (128×128)
- [ ] `store/promo-tile-440x280.png` (440×280)
- [ ] 3–5 screenshots at 1280×800
- [ ] Public privacy policy URL
- [ ] Support email
- [ ] Listing copy from [store/LISTING.md](store/LISTING.md)
- [ ] Permission justification from [store/LISTING.md](store/LISTING.md#permission-justification-text)
- [ ] ZIP root contains `manifest.json`
- [ ] Version matches in `package.json`, `manifest.json`, changelog, and ZIP name
- [ ] No source maps, `dist/node_modules`, secrets, or personal data in the ZIP
