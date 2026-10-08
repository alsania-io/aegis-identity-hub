/**
 * cross-tab-client.ts — content-script side of the cross-tab layer.
 *
 * MV3-SAFE: the long wait lives HERE (content script, which never sleeps),
 * not in the service worker. We call `cross-tab:start` (short) then poll
 * `cross-tab:poll` (short) until the reply stabilises.
 */

export interface CrossTabResult {
  success: boolean;
  text?: string;
  target?: string;
  error?: string;
  tabId?: number;
}

function runtime(): any {
  return (globalThis as any).browser?.runtime ?? (globalThis as any).chrome?.runtime;
}

async function send(msg: any): Promise<any> {
  const rt = runtime();
  if (!rt?.sendMessage) return { success: false, error: 'no runtime.sendMessage' };
  try {
    return await rt.sendMessage(msg);
  } catch (e: any) {
    return { success: false, error: e?.message ?? String(e) };
  }
}

/**
 * Drive a browser model in another tab; poll until the reply stabilises.
 */
export async function executeInTab(
  host: string,
  prompt: string,
  opts: { tabId?: number; createIfMissing?: boolean; timeoutMs?: number } = {},
): Promise<CrossTabResult> {
  const timeoutMs = opts.timeoutMs ?? 120000;
  const pollMs = 700;

  // 1) START (short worker op)
  const started = await send({
    type: 'cross-tab:start',
    host,
    prompt,
    tabId: opts.tabId,
    createIfMissing: opts.createIfMissing ?? true,
  });
  if (!started?.success) {
    return { success: false, error: started?.error ?? 'start failed', tabId: started?.tabId };
  }
  const tabId: number = started.tabId;
  const baseline: number = started.baseline ?? 0;

  // 2) POLL loop (long wait lives here — content script never sleeps)
  const start = Date.now();
  let last = '';
  let stable = 0;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    const p = await send({ type: 'cross-tab:poll', tabId, baseline });
    if (p?.success && p.text) {
      if (p.text === last) {
        if (++stable >= 2) {
          return { success: true, text: p.text, target: host, tabId };
        }
      } else {
        last = p.text;
        stable = 0;
      }
    }
  }
  return last
    ? { success: true, text: last, target: host, tabId }
    : { success: false, error: 'no reply captured (timeout)', target: host, tabId };
}

/** Map a tab/<site> model id to a host string. */
export function hostFromTabModel(modelId: string): string | null {
  const m = modelId.match(/^tab[:/](.+)$/i);
  if (!m) return null;
  const site = m[1].trim().toLowerCase();
  const MAP: Record<string, string> = {
    deepseek: 'chat.deepseek.com',
    claude: 'claude.ai',
    chatgpt: 'chatgpt.com',
    openai: 'chatgpt.com',
    gemini: 'gemini.google.com',
    kimi: 'kimi.com',
    qwen: 'chat.qwen.ai',
    aistudio: 'aistudio.google.com',
    grok: 'grok.com',
  };
  return MAP[site] ?? (site.includes('.') ? site : null);
}
