
---

## Phase 1: Read Both Sources

**Files:**
- `addons/copilot.adapter.js` (384 lines)
- `pages/content/src/plugins/adapters/copilot.adapter.ts` (635 lines)
- `pages/content/src/plugins/adapters/base.adapter.ts` (base contract)

VERIFY: You can list what the addon does that the adapter does not.

---

## Phase 2: Merge

### 2.1 Port addon logic into the adapter
For each meaningful addon behavior (send-button finding, input detection, submit strategy), port it into the TS adapter as private methods using `this.context.logger` (not console.log).

### 2.2 submitForm: single dispatch + robust finder
Match the DeepSeek pattern. One `dispatchEvent` only.

### 2.3 handleToolExecutionCompleted triggers auto-submit
Must be `async`, gated on `uiState.preferences?.autoSubmit`, skip its own `submitForm` events, 300ms delay, then `await this.submitForm()`.

VERIFY:
```bash
grep -c "submitButton.click()" pages/content/src/plugins/adapters/copilot.adapter.ts   # expect 0
grep -c "dispatchEvent(new MouseEvent" pages/content/src/plugins/adapters/copilot.adapter.ts  # expect 1
```

---

## Phase 3: Type-Check

```bash
export PATH=/home/sigma/.nvm/versions/node/v24.20.0/bin:$PATH
cd /home/sigma/Desktop/echo-lab/nyxshop/aidh/aegis-identity-hub
npx tsc --noEmit -p pages/content/tsconfig.json 2>&1 | grep -i copilot
```
VERIFY: no `copilot` errors. (Other files out of scope.)

---

## Checklist
- [ ] Read addon + adapter + base
- [ ] Ported send-button / input / submit logic
- [ ] Single dispatch only
- [ ] Auto-submit wired
- [ ] `tsc` shows no copilot errors

---

## Report Format
1. Files changed
2. What was ported from the addon
3. tsc result (copilot-specific)
4. Any uncertainty

---

## Do NOT Do
- Do NOT edit the manifest
- Do NOT delete files
- Do NOT touch other adapters
- Do NOT run a full build (orchestrator does that)
- Do NOT add features not in the addon
