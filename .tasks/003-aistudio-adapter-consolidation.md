# Task 003: Consolidate AI Studio Adapter

Read `.tasks/000-ADAPTER-CONSOLIDATION-PLAYBOOK.md` FIRST and follow it exactly.

## Target
- **Canonical adapter (edit this):** `pages/content/src/plugins/adapters/aistudio.adapter.ts` (1986 lines)
- **Alternate version (merge ideas from, but do NOT keep both):** `pages/content/src/plugins/adapters/aistudio.adapter (copy).ts` (1569 lines)
- **Legacy addon:** none dedicated (AI Studio logic lives in the adapter + main bundle).

## Host
`aistudio.google.com` - Google AI Studio.

## Phases
1. Read the playbook + both aistudio files. Compare: identify which of the two has the working `submitForm` / `handleToolExecutionCompleted` and robust button finding. The `(copy)` may contain the fixed auto-submit (like DeepSeek did) - port it into the canonical file.
2. Merge the BEST logic from both into `aistudio.adapter.ts`. Single dispatch. Async auto-submit wired.
3. Type-check: `npx tsc --noEmit -p pages/content/tsconfig.json 2>&1 | grep -i aistudio` -> expect no errors.

## Notes
- This adapter is the largest; prioritize submit + auto-submit correctness over refactoring.
- Preserve class name `AIStudioAdapter`, hostnames, capabilities.

## Do NOT Do
- Do NOT edit the manifest or other adapters.
- Do NOT run a full build.
- Do NOT leave duplicated logic between the two files - the `(copy)` will be deprecated by the orchestrator.
