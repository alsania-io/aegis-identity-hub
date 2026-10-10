/**
 * provider-models.ts — fetches a provider's LIVE model list from the background
 * service worker.
 *
 * WHY BACKGROUND: content-script fetches are subject to the HOST PAGE's CORS +
 * CSP. Calling e.g. openrouter.ai/api/v1/models from chat.deepseek.com is
 * blocked ('Failed to fetch'). The service worker runs at the EXTENSION origin;
 * with the matching host_permissions it can fetch those APIs without page CORS.
 */

import { createLogger } from '@extension/shared/lib/logger';

const logger = createLogger('ProviderModels');

export interface ProviderModelsRequest {
  id: string;
  baseUrl: string;
  apiKey?: string;
  providerId?: string;
  name?: string;
}

export interface ProviderModelsResult {
  success: boolean;
  models: any[];
  error?: string;
}

/** Normalize a model list response across provider shapes. */
function parseModels(data: any, providerId?: string): any[] {
  const out: any[] = [];
  // Ollama /api/tags
  if (Array.isArray(data?.models)) {
    for (const m of data.models) {
      const raw = m.name || m.model || '';
      if (!raw) continue;
      out.push({
        id: `local/${raw}`,
        rawId: raw,
        name: `Local ${raw}`,
        providerId: 'local',
        providerName: 'Localhost / Llama',
        description: `Discovered from local server (${m.details?.parameter_size || 'local'}).`,
        contextWindow: m.details?.context_length || 32768,
        category: /coder/.test(raw) ? 'code' : /r1/.test(raw) ? 'reasoning' : 'general',
        pricingType: 'local',
        isCustom: true,
        tags: ['discovered', 'local', 'offline'],
      });
    }
    return out;
  }
  // Standard OpenAI / OpenRouter { data: [...] }
  if (Array.isArray(data?.data)) {
    for (const m of data.data) {
      const rawId = m.id;
      if (!rawId) continue;
      out.push({
        id: `${providerId}/${rawId}`,
        rawId,
        name: m.name || rawId,
        providerId,
        providerName: providerId,
        description: m.description || `Live model from ${providerId}`,
        contextWindow: m.context_length || m.context_window || 128000,
        category: /code/.test(rawId) ? 'code' : /r1|o1|o3/.test(rawId) ? 'reasoning' : 'general',
        pricingType: providerId === 'local' ? 'local' : 'paid',
        isCustom: true,
        tags: ['live-discovered', providerId],
      });
    }
  }
  return out;
}

/**
 * Handle a 'provider:fetch-models' message. Returns via sendResponse.
 */
export async function handleProviderModelsMessage(
  message: any,
  sendResponse: (r: ProviderModelsResult) => void,
): Promise<void> {
  const { baseUrl, apiKey, providerId, name } = (message.payload || message) as ProviderModelsRequest;

  try {
    if (!baseUrl) throw new Error('baseUrl required');

    let url = baseUrl;
    if (providerId === 'local') {
      url = baseUrl.replace(/\/v1$/, '') + '/api/tags';
    } else if (!url.endsWith('/models')) {
      url = url.replace(/\/$/, '') + '/models';
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey && apiKey !== 'not-needed') {
      headers['Authorization'] = `Bearer ${apiKey}`;
      if (providerId === 'openrouter') {
        headers['HTTP-Referer'] = 'https://alsania-io.com/aegis-identity-hub';
        headers['X-Title'] = 'Aegis Identity Hub';
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = await res.json();
    const models = parseModels(data, providerId);

    logger.debug(`Fetched ${models.length} models for ${providerId} (${url})`);
    sendResponse({ success: true, models });
  } catch (err: any) {
    logger.warn(`Provider model fetch failed for ${providerId}:`, err?.message || err);
    sendResponse({ success: false, models: [], error: err?.message || String(err) });
  }
}
