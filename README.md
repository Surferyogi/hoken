# Hoken

*Hoken* (保険) is Japanese for "insurance".

A local-first, installable PWA that evaluates insurance coverage, payouts and cost, and flags
**gaps, duplication and points of attention**. It ships with a Singapore rule pack (MediShield
Life, Integrated Shield Plans, MediSave Additional Withdrawal Limits, IP rider rules).

No server. No analytics. No network calls after the page loads. Everything you type is kept in
your browser's `localStorage`.

---

## The one rule this project follows

**Nothing is invented.** Every figure in the app is either

1. read directly off a document that was supplied, or
2. quoted from a cited official source (each one is listed with its URL on the **Sources** tab), or
3. arithmetic performed on 1 and 2, with the arithmetic shown in the finding itself.

Anything else renders as **Not available** and is surfaced as a *missing input* that blocks a
specific conclusion. There are no default values, no illustrative numbers and no estimates
anywhere in `src/data/seed.js`.

---

## Privacy — read this before you push

The seed data in this repository is deliberately reduced:

| Field | In the repo? |
|---|---|
| Name | Yes |
| NRIC | **Masked only** (`S****451E`, exactly as printed on the premium bill) |
| Policy number, bill reference | Yes |
| Residential address | **No** |
| Adviser's phone and email | **No** |

Even so, this is a repository containing a named individual's policy numbers and premiums.
**Make the GitHub repository private** unless you have a reason not to. GitHub Pages can serve a
site from a private repository on paid plans; on the free plan a Pages site is public even when
the repo is private, so treat the deployed URL as public either way.

If you would rather ship nothing personal at all, delete the contents of `SEED_POLICIES` in
`src/data/seed.js`, leave the array empty, and enter your policies in the app instead.

---

## What is in it

| Tab | What it does |
|---|---|
| **Overview** | Headline position, critical items, main medical plan at a glance |
| **Gaps & duplication** | Duplicate-cover detection, an 11-category coverage scan, sub-limits inside the cover you already have |
| **Cost** | Premium split, cash vs MediSave-payable, unknown costs, due dates and renewals, the Great Eastern cash benefit ledger |
| **Simulator** | Enter a hospital bill and see what you pay with and without the rider, line by line |
| **Actions** | Prioritised to-do list plus the exact questions to put to each insurer |
| **Policies** | Every transcribed field, editable; `Not available` marks what was never on a document |
| **Sources** | Every document and every official source with its URL and retrieval date; export and reset |

---

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build a production bundle:

```bash
npm run build    # -> dist/
npm run preview
```

---

## Deploy to GitHub Pages

1. Create the repository on GitHub (private is recommended — see **Privacy** above).
2. Push this folder:

   ```bash
   git remote add origin https://github.com/<you>/<repo>.git
   git branch -M main
   git push -u origin main
   ```

3. In the repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
   This step is required. Without it the workflow builds but never publishes.
4. Push to `main` (or run the workflow manually from the **Actions** tab). The workflow in
   `.github/workflows/deploy.yml` builds the site and deploys it.
5. The site lands at `https://<you>.github.io/<repo>/`.

The workflow works out the Vite `base` path from the repository name, so a project site and a
`<you>.github.io` user site both work without editing anything.

### Install it as an app

Open the deployed URL on your phone and use **Add to Home Screen** (iOS Safari) or the install
prompt (Android Chrome). It then runs full-screen and works offline via the service worker.

---

## Versioning

`src/version.js` holds `APP_VERSION` in the format `vYYYY:MMM:DD-HH:MM` (Asia/Singapore).
**Bump it every time `src/App.jsx` changes**, and add a line to `CHANGELOG` in the same file. The
version is shown in the header, in the footer and on the Sources tab, and the build script stamps
it into the service worker cache name so a new deploy invalidates the old cache.

---

## Project layout

```
src/
  App.jsx            all views; bump src/version.js whenever this changes
  main.jsx           entry point and service worker registration
  version.js         APP_VERSION + CHANGELOG
  styles.css
  data/
    seed.js          transcribed policy data - null means "not available", never zero
    sources.js       citation registry; every asserted figure points at an entry here
  lib/
    rules.js         Singapore rule pack (gaps, duplication, cost, attention)
    simulator.js     claim payout model
scripts/
  stamp-sw.js        writes APP_VERSION into the service worker cache name at build time
public/
  manifest.webmanifest, sw.js, icons
```

---

## Limits you should know about

- The simulator models the **cost-sharing mechanics only**: policy year limit, deductible,
  co-insurance, rider co-payment and its annual cap. It does not model benefit-specific
  sub-limits, exclusions, pre-existing condition loadings, pre-authorisation outcomes, or a claim
  spanning two policy years.
- Plan benefit figures come from the insurer's **published policy conditions**, not from a
  personal policy schedule. Check them against your own contract.
- Official figures were retrieved on **2026-08-19**. Premiums, limits and rules change; the
  Sources tab records the retrieval date for each one so you can tell when to re-check.
- This is an analysis aid, not financial advice. It is not a substitute for your insurer or a
  licensed financial adviser.
