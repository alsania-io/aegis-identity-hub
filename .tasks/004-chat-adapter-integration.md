# Task 004: Integrate chat.adapter.js into Default/Base

Read `.tasks/000-ADAPTER-CONSOLIDATION-PLAYBOOK.md` FIRST and follow it.

## Target
- **Legacy addon (merge from):** `addons/chat.adapter.js` (442 lines) - loaded on ALL sites alongside the main bundle.
- **Integration targets:** `pages/content/src/plugins/adapters/default.adapter.ts` (fallback, `hostnames=['*']`) and/or `pages/content/src/plugins/adapters/base.adapter.ts` (abstract base).

## Goal
`chat.adapter.js` runs on every site as a generic helper. Its genuinely generic logic should live in `DefaultAdapter` (which matches all hosts). Site-specific logic should NOT go here.

## Phases
1. Read the playbook + `addons/chat.adapter.js` + `default.adapter.ts` + `base.adapter.ts`.
2. Categorize each addon behavior: (a) generic -> DefaultAdapter, (b) site-specific -> note it (belongs in a per-site adapter, NOT here), (c) redundant -> note for removal.
3. Port only the GENERIC behaviors into `default.adapter.ts`. Do not touch `base.adapter.ts` unless a truly universal helper belongs there (prefer DefaultAdapter).
4. Type-check: `npx tsc --noEmit -p pages/content/tsconfig.json 2>&1 | grep -i 'default.adapter'` -> expect no errors.

## Notes
- DefaultAdapter must stay a safe universal fallback - no host-specific selectors.
- If a behavior is site-specific, DO NOT port it; report it instead.

## Report
List each addon behavior and its disposition (generic-ported / site-specific-skipped / redundant).

## Do NOT Do
- Do NOT edit the manifest or other adapters.
- Do NOT run a full build.
- Do NOT add host-specific logic to DefaultAdapter.
