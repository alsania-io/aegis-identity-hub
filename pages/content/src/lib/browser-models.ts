/**
 * browser-models.ts — single source of truth for browser-tab model options.
 *
 * Browser models are addressed as `tab/<site>` model ids. The router
 * (lib/model-dispatcher.ts CASE 0 -> lib/cross-tab-client.ts hostFromTabModel)
 * maps the <site> slug to a host and drives that site's tab cross-tab.
 *
 * IMPORTANT: this list MUST stay in sync with the MAP in
 * lib/cross-tab-client.ts `hostFromTabModel()`. If you add a site there,
 * add it here so it is selectable in every model dropdown.
 *
 * One durable owner. SwarmTab, SettingsTab and AgentsTab all import from here
 * so the option set never drifts between panels.
 */

import { AiModelItem } from '../types/identity';

export interface BrowserModelOption {
  /** `tab/<site>` model id used by the dispatcher. */
  id: string;
  /** Human label shown in dropdowns. */
  name: string;
  /** Host the cross-tab layer drives. */
  host: string;
}

/** Canonical browser-tab sites, mirroring cross-tab-client hostFromTabModel(). */
export const BROWSER_MODEL_SITES: BrowserModelOption[] = [
  { id: 'tab/aistudio', name: 'Google AI Studio (browser tab)', host: 'aistudio.google.com' },
  { id: 'tab/claude', name: 'Claude (browser tab)', host: 'claude.ai' },
  { id: 'tab/chatgpt', name: 'ChatGPT (browser tab)', host: 'chatgpt.com' },
  { id: 'tab/gemini', name: 'Gemini (browser tab)', host: 'gemini.google.com' },
  { id: 'tab/deepseek', name: 'DeepSeek (browser tab)', host: 'chat.deepseek.com' },
  { id: 'tab/qwen', name: 'Qwen (browser tab)', host: 'chat.qwen.ai' },
  { id: 'tab/kimi', name: 'Kimi (browser tab)', host: 'kimi.com' },
  { id: 'tab/grok', name: 'Grok (browser tab)', host: 'grok.com' },
];

/**
 * Browser-tab models shaped as AiModelItem for SearchableModelSelect.
 * providerName 'BROWSER' drives the provider filter chip in the dropdown.
 */
export const BROWSER_MODEL_OPTIONS: AiModelItem[] = BROWSER_MODEL_SITES.map((s) => ({
  id: s.id,
  rawId: s.id,
  name: s.name,
  providerId: 'browser' as any,
  providerName: 'BROWSER',
  description: `Route this task to a live ${s.host} browser tab and read the reply cross-tab.`,
  category: 'browser-tab',
  pricingType: 'free' as any,
  tags: ['browser-tab', 'cross-tab', s.host],
}));

/**
 * Merge browser-tab models in front of a provider-model list, de-duplicated by
 * id. Use everywhere a model dropdown should offer browser models.
 */
export function withBrowserModels(models: AiModelItem[] = []): AiModelItem[] {
  const seen = new Set(BROWSER_MODEL_OPTIONS.map((m) => m.id));
  const rest = models.filter((m) => !seen.has(m.id));
  return [...BROWSER_MODEL_OPTIONS, ...rest];
}
