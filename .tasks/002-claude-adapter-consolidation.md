# Task 002: Consolidate Claude Adapter

Read `.tasks/000-ADAPTER-CONSOLIDATION-PLAYBOOK.md` FIRST and follow it exactly.

## Target
- **Canonical adapter (edit this):** `pages/content/src/plugins/adapters/claude.adapter.ts` (1199 lines)
- **Legacy addon (merge from):** `addons/claude.adapter.js` (333 lines)
- **Dead copy (IGNORE, do not edit):** `pages/content/src/plugins/adapters/claude.adapter (copy).ts`

## Host
`claude.ai` - the composer input is a `contenteditable` ProseMirror div; send is a button in the composer controls.

## Phases
1. Read the playbook + all three files above. List addon behaviors missing from the adapter.
2. Port those behaviors into `claude.adapter.ts` (send-button finder, input insertion for contenteditable, submit). Single dispatch. Wire async auto-submit.
3. Type-check: `npx tsc --noEmit -p pages/content/tsconfig.json 2>&1 | grep -i claude` -> expect no errors.

## Notes
- A pre-existing syntax bug at ~line 841 (broken `fallbackSelectors` array) was already fixed by the orchestrator. Do not reintroduce it.
- Preserve `contenteditable` handling - Claude uses ProseMirror, NOT a textarea.

## Do NOT Do
- Do NOT edit the manifest, other adapters, or the `(copy)` file.
- Do NOT run a full build.
