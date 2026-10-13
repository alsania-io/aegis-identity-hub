/**
 * cross-tab.ts — Cross-tab execution layer (swarm keystone). MV3-SAFE.
 *
 * MV3 problem: the service worker sleeps ~30s idle; a long await inside it
 * dies. Fix: split into TWO SHORT worker ops — `start` (inject+submit) and
 * `poll` (read reply state). Neither holds a long await. The CALLER (content
 * script, which never sleeps) runs the polling loop.
 *
 * Messages:
 *   { type:'cross-tab:start', host, prompt, tabId?, createIfMissing? }
 *     -> { success, tabId, baseline, error? }
 *   { type:'cross-tab:poll', tabId, replySelector? }
 *     -> { success, text, done, error? }
 */

/** site -> selectors */
const SITE_SEL: Record<string, { input: string; send: string; reply: string }> = {
  'chat.deepseek.com': {
    input: 'textarea, div[contenteditable="true"]',
    send: 'button[aria-label*="Send" i], div[role="button"]:has(svg)',
    reply: '.ds-assistant-message-main-content',
  },
  'claude.ai': {
    input: 'div[contenteditable="true"][data-testid="composer-input"], div[contenteditable="true"]',
    send: 'button[aria-label*="Send" i], button[type="submit"]',
    // Fallback list (architecture §4): Claude's DOM churns; try known variants
    // newest-first. The first match wins in q(). UNVERIFIED against a live tab —
    // if capture returns empty, inspect a logged-in claude.ai and prepend the
    // working selector here. Kept as a LIST so one rename doesn't break capture.
    reply: '.font-claude-message, [data-testid="assistant-message"], div[data-is-streaming], [class*="font-claude-message"], [class*="assistant"][class*="message"], .prose',
  },
  'chatgpt.com': {
    input: 'div[contenteditable="true"], textarea',
    send: 'button[data-testid="send-button"], button[aria-label*="Send" i]',
    reply: '[data-message-author-role="assistant"]',
  },
  default: {
    input: 'textarea, div[contenteditable="true"]',
    send: 'button[type="submit"], button[aria-label*="Send" i]',
    reply: '[class*="assistant"], [class*="message"]',
  },
};

// Phase 5 (Architecture §6.4): tab leases so two swarm runs cannot both drive
// the SAME chat tab and interleave their subtasks. A tab is leased to ONE owner
// (a swarm run / task-set) for the run's duration; findTab skips leased tabs so
// a second run gets its OWN tab. A new service-worker generation invalidates
// stale leases (they cannot resurrect after a restart).
import { createTabLeaseStore, pickUnleasedTab, TAB_LEASE_KINDS } from "@extension/shared/lib/tab-leases";

const SW_GENERATION = Date.now();
const tabLeases = createTabLeaseStore({ generation: 1 });

export function __tabLeasesForTests() {
  return tabLeases;
}

function urlForHost(host: string): string {
  const h = host.replace(/^\*\.\/?/, '');
  if (h.includes('deepseek')) return 'https://chat.deepseek.com/';
  if (h.includes('claude')) return 'https://claude.ai/new';
  if (h.includes('chatgpt') || h.includes('openai')) return 'https://chatgpt.com/';
  if (h.includes('gemini')) return 'https://gemini.google.com/app';
  if (h.includes('kimi')) return 'https://kimi.com/';
  if (h.includes('qwen')) return 'https://chat.qwen.ai/';
  if (h.includes('aistudio')) return 'https://aistudio.google.com/';
  if (h.includes('grok') || h.includes('x.com')) return 'https://grok.com/';
  return `https://${h}/`;
}

async function findTab(host: string): Promise<number | null> {
  const h = host.replace(/^\*\.\/?/, '').replace(/\/$/, '');
  const tabs = await chrome.tabs.query({});
  // §6.4: skip tabs already leased so two runs never share a conversation.
  // (A tab leased to THIS owner is reused by resolveTab, which checks first.)
  const candidates = tabs.filter((t) => t.url && t.url.includes(h)).map((t) => t.id);
  return pickUnleasedTab(tabLeases, candidates);
}

/** Resolve (or create) the target tab and LEASE it to `ownerId`. Returns tabId. */
async function resolveTab(
  host: string,
  tabId: number | undefined,
  createIfMissing: boolean,
  ownerId: string,
  taskSetId?: string | null,
): Promise<{ tabId?: number; created?: boolean; error?: string }> {
  const kind = taskSetId ? TAB_LEASE_KINDS.TASK_SET : TAB_LEASE_KINDS.THIS_TAB;
  let resolved: number | null = tabId != null ? tabId : await findTab(host);
  let created = false;
  if (resolved == null) {
    if (!createIfMissing) return { error: `no tab found for ${host}` };
    const tab = await chrome.tabs.create({ url: urlForHost(host), active: false });
    if (tab.id == null) return { error: 'failed to create tab' };
    resolved = tab.id;
    created = true;
  }
  // Acquire (or refresh) the lease. already-leased by the SAME owner is fine.
  const existing = tabLeases.leaseForTab(resolved);
  if (!existing) {
    const acq = tabLeases.acquire({ tabId: resolved, kind, ownerId, taskSetId: taskSetId ?? null });
    if (!acq.ok && acq.error !== 'already-leased') return { error: `lease failed: ${acq.error}` };
  } else if (existing.ownerId !== ownerId) {
    return { error: `tab ${resolved} is leased to another run` };
  }
  return { tabId: resolved, created };
}

/** START: inject prompt + submit. Short op. Returns baseline reply count. */
async function startOp(
  tabId: number,
  prompt: string,
): Promise<{ success: boolean; baseline?: number; error?: string }> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    args: [prompt],
    func: async (promptText: string) => {
      const HOST = location.hostname;
      const SEL: Record<string, { input: string; send: string; reply: string }> = {
        'chat.deepseek.com': {
          input: 'textarea, div[contenteditable="true"]',
          send: 'button[aria-label*="Send" i], div[role="button"]:has(svg)',
          reply: '.ds-assistant-message-main-content',
        },
        'claude.ai': {
          input: 'div[contenteditable="true"][data-testid="composer-input"], div[contenteditable="true"]',
          send: 'button[aria-label*="Send" i], button[type="submit"], button:has(svg[viewBox="0 0 16 16"])',
          reply: '.font-claude-message, [data-testid="assistant-message"], div[data-is-streaming], [class*="font-claude-message"], [class*="assistant"][class*="message"], .prose',
        },
        'chatgpt.com': {
          input: 'div[contenteditable="true"], textarea',
          send: 'button[data-testid="send-button"], button[aria-label*="Send" i]',
          reply: '[data-message-author-role="assistant"]',
        },
        default: {
          input: 'textarea, div[contenteditable="true"]',
          send: 'button[type="submit"], button[aria-label*="Send" i]',
          reply: '[class*="assistant"], [class*="message"]',
        },
      };
      const cfg = Object.entries(SEL).find(([k]) => HOST.includes(k))?.[1] ?? SEL.default;
      const q = (s: string) => {
        for (const part of s.split(',')) {
          const el = document.querySelector<HTMLElement>(part.trim());
          if (el) return el;
        }
        return null;
      };
      const input = q(cfg.input);
      if (!input) return { success: false, baseline: 0, error: 'input not found on ' + HOST };

      const baseline = document.querySelectorAll(cfg.reply).length;
      input.focus();
      if (input.tagName === 'TEXTAREA') {
        (input as HTMLTextAreaElement).value = promptText;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        // contenteditable (Claude/ChatGPT): use execCommand so React registers it.
        input.textContent = '';
        const ok = document.execCommand('insertText', false, promptText);
        if (!ok) input.textContent = promptText;
        input.dispatchEvent(new InputEvent('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Give React a beat to enable the send button.
      await new Promise((r) => setTimeout(r, 250));

      const sendBtn = q(cfg.send);
      if (sendBtn && !(sendBtn as HTMLButtonElement).disabled) {
        sendBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      } else {
        // Fallback: Enter key.
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true }));
      }
      return { success: true, baseline };
    },
  });
  const r = results?.[0]?.result as { success: boolean; baseline?: number; error?: string } | undefined;
  return r ?? { success: false, error: 'no result from start script' };
}

/** POLL: read current reply state. Short op. */
async function pollOp(
  tabId: number,
  baseline: number,
): Promise<{ success: boolean; text?: string; done?: boolean; error?: string }> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    args: [baseline],
    func: (base: number) => {
      const HOST = location.hostname;
      const REPLY: Record<string, string> = {
        'chat.deepseek.com': '.ds-assistant-message-main-content',
        'claude.ai': '.font-claude-message, [data-testid="assistant-message"], div[data-is-streaming], [class*="font-claude-message"], [class*="assistant"][class*="message"], .prose',
        'chatgpt.com': '[data-message-author-role="assistant"]',
        default: '[class*="assistant"], [class*="message"]',
      };
      const sel = Object.entries(REPLY).find(([k]) => HOST.includes(k))?.[1] ?? REPLY.default;
      // Resolve the FIRST matching selector in the fallback list, then take its
      // LAST node — a merged comma-list querySelectorAll can interleave ordering
      // across unrelated classes and return the wrong "newest" reply.
      let nodes: NodeListOf<Element> | null = null;
      for (const part of sel.split(',')) {
        const found = document.querySelectorAll(part.trim());
        if (found.length > 0) { nodes = found; break; }
      }
      if (!nodes || nodes.length <= base) return { success: true, text: '', done: false };
      const t = ((nodes[nodes.length - 1] as HTMLElement).innerText || '').trim();
      return { success: true, text: t, done: false };
    },
  });
  const r = results?.[0]?.result as { success: boolean; text?: string; done?: boolean; error?: string } | undefined;
  return r ?? { success: false, error: 'no result from poll script' };
}

export async function handleCrossTabMessage(message: any, sendResponse: (r: any) => void): Promise<void> {
  try {
    const host: string = message.host;
    const tabIdIn: number | undefined = message.tabId;
    const createIfMissing: boolean = message.createIfMissing ?? true;

    // Owner identity for the lease. Defaults to a per-host owner so legacy
    // callers still serialize per host; swarm passes a run id + taskSetId.
    const ownerId: string = String(message.ownerId || `host:${host}`);
    const taskSetId: string | null = message.taskSetId ? String(message.taskSetId) : null;

    if (message.type === 'cross-tab:start') {
      const { tabId, created, error } = await resolveTab(host, tabIdIn, createIfMissing, ownerId, taskSetId);
      if (error || tabId == null) return sendResponse({ success: false, error });
      if (created) await new Promise((r) => setTimeout(r, 4000)); // let it load
      const res = await startOp(tabId, message.prompt ?? '');
      return sendResponse({ ...res, tabId });
    }

    if (message.type === 'cross-tab:poll') {
      const res = await pollOp(message.tabId, message.baseline ?? 0);
      return sendResponse(res);
    }

    // Release a lease (owner-only). Called when a swarm run finishes.
    if (message.type === 'cross-tab:release') {
      const r = tabLeases.release({ tabId: Number(message.tabId), ownerId });
      return sendResponse({ success: r.ok, error: r.ok ? undefined : r.error });
    }

    // Release every tab leased to a task-set (a whole swarm run finished).
    if (message.type === 'cross-tab:release-task-set') {
      const ids = tabLeases.taskSetTabIds(String(message.taskSetId || ''));
      let released = 0;
      for (const id of ids) if (tabLeases.release({ tabId: id, ownerId }).ok) released += 1;
      return sendResponse({ success: true, released });
    }

    // Backwards-compat: single-shot execute (best-effort, may hit MV3 sleep).
    if (message.type === 'cross-tab:execute') {
      const { tabId, created, error } = await resolveTab(host, tabIdIn, createIfMissing, ownerId, taskSetId);
      if (error || tabId == null) return sendResponse({ success: false, error });
      if (created) await new Promise((r) => setTimeout(r, 4000));
      const s = await startOp(tabId, message.prompt ?? '');
      return sendResponse({ success: s.success, text: '', target: host, error: s.error, tabId, baseline: s.baseline });
    }

    sendResponse({ success: false, error: 'unknown cross-tab action: ' + message.type });
  } catch (e: any) {
    sendResponse({ success: false, error: e?.message ?? String(e) });
  }
}
