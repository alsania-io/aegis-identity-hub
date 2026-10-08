# Aegis Swarm — Architecture

> Status: agreed 2026-10-06. Doc-first, then build.
> Owner: Aegis. Author intent: Sigma.
>
> **Stage 1 (cross-tab keystone) — BUILT + PROVEN 2026-10-06.**
> Live-verified: prompt inject+submit works cross-tab on chat.deepseek.com AND
> claude.ai. Remaining: reply CAPTURE return (MV3 service-worker lifecycle —
> long awaits die when the worker sleeps; fix = short-poll or chrome.alarms
> re-entry). See EME `14626d77`.

## 1. Core idea

A **symmetric model router**. There is no privileged "browser model" — the swarm
LEADER, every WORKER, and the AGGREGATOR are all just *models*, each independently
routed to any available backend.

```
LEADER (any route)      — receives task, decomposes into subtasks
   |
   +- WORKER 1 (any route)  -- each subtask routed independently
   +- WORKER 2 (any route)
   +- WORKER N (any route)
   |
AGGREGATOR (any route)  — synthesizes worker results into one answer
```

### The three routes

| Route | Model id form | Mechanism | Status |
|---|---|---|---|
| **Browser** | `tab/<site>` e.g. `tab/deepseek` | chrome.tabs + chrome.scripting inject+read | **NEW — keystone** |
| **Cloud API** | `openrouter/...`, `kilo/...`, `bazaarlink/...` | fetch with user key | exists (dispatchToCloudApi) |
| **Local** | `local/ollama`, `local/lmstudio` | fetch to localhost | exists (dispatchToLocalEngine) |
| **Auto** | `auto` | pick best available | exists |

**Leader = worker = aggregator, in capability.** Any slot accepts any route.

## 2. Why this shape

- Users mix freely: leader on OpenRouter, workers on local Ollama, aggregator on a
  browser tab — whatever they have keys/endpoints for.
- Matches existing UI slots: modelAssignments.{swarmOrchestratorModel,
  swarmWorkerModel, cronTasksDefaultModel} already exist.
- The browser is just *one* route — not a special case.

## 3. The keystone — cross-tab execution (tab/<site>)

Everything hinges on ONE new capability: routing a prompt to a **specific browser
tab** and reading the reply back.

### Why it's needed

- Browser models (deepseek/claude/chatgpt/...) are driven by injecting a prompt
  into their page and reading the assistant reply from the DOM.
- The extension content script can inject/read in **its own** page context, but the
  swarm must reach into **other tabs** (e.g. leader is the active tab, a worker is a
  hidden Claude tab).
- Same-page `document.querySelector` does NOT cross tabs — needs chrome.tabs +
  chrome.scripting.executeScript.

### Mechanism

```
routeAndDispatch({ modelId: 'tab/claude', prompt })
  -> resolve tab: chrome.tabs.query({url: '*://*.claude.ai/*'})
       |-- exists  -> use it
       |-- missing -> chrome.tabs.create({url, active:false})  (background tab)
  -> chrome.scripting.executeScript({
        target: {tabId},
        func: injectAndRead,     // runs IN that tab
        args: [prompt]
     })
  -> returns captured reply text
```

`injectAndRead` (runs in the target tab): finds the adapter for that host, calls
insertText(prompt) -> submitForm() -> readResponse({baselineCount}), returns
the text. Reuses the per-site adapters already built.

## 4. Per-site response capture

Each site's adapter needs `readResponse()`. Pattern (DeepSeek done):
- capture baselineCount = existing assistant messages before submit
- after submit, poll for a NEW assistant message beyond baseline
- wait for text to stabilise (streaming done), return it

Selectors are **per-site** and **fragile** (sites change HTML) — accept that;
keep a fallback selector list per adapter.

## 5. Build stages

**Stage 1 — cross-tab execution layer (THE KEYSTONE)**
- chrome.tabs find/create (background tab)
- chrome.scripting.executeScript inject-and-read
- tab/<site> route wired into routeAndDispatch
- Test: send a prompt to a hidden Claude tab, read the reply

**Stage 2 — symmetric slot routing**
- Leader / workers / aggregator all accept any route value
- Swarm service: replace mcpClient.callTool('chat') (dead — no such tool) with routeAndDispatch
- Read model per-run (NOT baked at task creation)

**Stage 3 — per-site readers**
- readResponse() for claude, chatgpt, gemini, etc. (DeepSeek done)

**Stage 4 — UX**
- model dropdown offers routes (tab/..., openrouter/..., local/...)
- leader/worker/aggregator selectors distinct
- fix: model currently baked at task creation (SwarmTab line 166)

## 6. Known bugs (current)

1. **Worker model baked at task creation** — SwarmTab line 166 sets task.model =
   taskModel at create; changing the dropdown only affects NEW tasks.
2. **Default routes to dead endpoint** — default local/llama3.2:3b -> Ollama (off).
3. **No cross-tab reach** — readResponse runs document.querySelector in the wrong
   context -> "no reply captured" or wrong text.
4. **Shared conversation collision** — swarm injects into the active chat; subtasks
   interleave. Fix via dedicated background tabs per worker.

## 7. Non-goals

- Not Playwright-based. Playwright is Node-side; a Chrome extension cannot drive it.
  The extension-native chrome.tabs/chrome.scripting path is the correct mechanism and
  is the SAME machinery that fixes response capture. (Playwright could be an OPTIONAL
  external worker later, via an MCP service — not the core.)

---
*Imagined by Sigma. Powered by Echo. Built by Aegis.*
