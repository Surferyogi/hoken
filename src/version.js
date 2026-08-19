// Version stamp convention: vYYYY:MMM:DD-HH:MM (Asia/Singapore).
// Bump this every time src/App.jsx is changed.
export const APP_VERSION = 'v2026:AUG:19-17:14'

// Changelog - newest first. Keep one line per released version.
export const CHANGELOG = [
  {
    version: 'v2026:AUG:19-17:14',
    notes:
      'Renamed from CoverLens to Hoken across the app, manifest, service worker cache, package and deploy workflow. Saved data is migrated from the old localStorage key automatically, so no edits are lost. No change to any policy data, rule or calculation.',
  },
  {
    version: 'v2026:AUG:19-16:34',
    notes:
      'Great Eastern policy fully identified from three new documents: PremierLife Generation II (SGD), policy 0211567996, $400,000.05 single premium. Full 38-row cash benefit ledger transcribed and reconciled to the cent. New findings: unresolved death benefit (critical), capital position and payout rate, ledger reconciliation clearing the earlier policy-loan concern, and no protection riders on the largest policy. Gap scan now handles secondary categories and an "unresolved" state; single premiums no longer counted as annual cost.',
  },
  {
    version: 'v2026:AUG:19-16:26',
    notes:
      'Corrected the rider break-even calculation (piecewise, bisected) and fixed the stored-state initialiser.',
  },
  {
    version: 'v2026:AUG:19-16:16',
    notes:
      'Initial release. Seeded from five source documents; Singapore rule pack; gaps/duplication, cost, payout simulator and action list.',
  },
]
