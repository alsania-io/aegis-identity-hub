# Playbook: Adapter Consolidation

Shared instructions for Tasks 001-004. Each task names ONE adapter + its legacy addon.

## Objective
Merge a legacy `addons/*.js` content-script workaround into its canonical TypeScript adapter (`pages/content/src/plugins/adapters/*.adapter.ts`) so the addon can be removed. The adapter is the single source of truth.

## Proven Pattern (DeepSeek, completed)
1. **Robust send-button finder** `private findSendButtonNearInput()`: walk up DOM (max 12 levels) from chat input to a toolbar with 3-10 visible buttons; pick by priority: (a) disabled non-MCP button, (b) aria/title has 'send' & not 'mcp', (c) SVG send/arrow icon, (d) rightmost non-MCP button. Include `private isElementVisible(el)`.
2. **Single dispatch**: `el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}))`. NEVER `.click()` + manual MouseEvent (double submit bug).
3. **Auto-submit**: `async handleToolExecutionCompleted(data)` checks `uiState.preferences?.autoSubmit`, ignores its own `submitForm` events, waits 300ms, calls `await this.submitForm()`.
4. Listener: `void this.handleToolExecutionCompleted(data).catch(e => this.context.logger.error(...))`.

## Constraints
- Preserve class name, `hostnames`, `capabilities`.
- Use `this.context.logger` (never console.log).
- No new features beyond addon parity.
- Do NOT delete files (orchestrator deprecates).
- Do NOT edit manifest. Do NOT run full build.
- Type-check ONLY your adapter.

## Type-Check Command
```bash
export PATH=/home/sigma/.nvm/versions/node/v24.20.0/bin:$PATH
cd /home/sigma/Desktop/echo-lab/nyxshop/aidh/aegis-identity-hub
npx tsc --noEmit -p pages/content/tsconfig.json 2>&1 | grep -i <adaptername>
```
No errors for your adapter = pass.

## Report Format
1. Files changed
2. Behaviors ported from addon
3. tsc result (adapter-specific)
4. Uncertainty/blockers
