/**
 * Aegis Identity Hub - API Client
 * Merged from aegis-identity-hub/src/lib/api.ts
 */

export const DEFAULT_HUB_URL = 'https://ais-dev-3oug745mnyn3cn5iilw6os-658524861020.us-east1.run.app';

export function getApiBaseUrl(): string {
  // Check if running in extension with stored config
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    // We'll read this async, but for sync use we return default
    // The actual URL will be resolved in buildApiUrl
  }
  return DEFAULT_HUB_URL;
}

export function buildApiUrl(path: string, baseUrl?: string): string {
  const base = baseUrl || DEFAULT_HUB_URL;
  // Remove trailing slash from base if present
  const cleanBase = base.replace(/\/$/, '');
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return cleanBase + cleanPath;
}

/**
 * Get the configured hub URL from extension storage (async)
 */
export async function getHubUrlFromExtension(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['aegis_hub_url'], (res) => {
        if (res.aegis_hub_url) {
          resolve(res.aegis_hub_url.replace(/\/$/, ''));
        } else {
          resolve(DEFAULT_HUB_URL);
        }
      });
    } else {
      resolve(DEFAULT_HUB_URL);
    }
  });
}

/**
 * Set the hub URL in extension storage
 */
export async function setHubUrlInExtension(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ aegis_hub_url: url }, () => resolve());
    } else {
      resolve();
    }
  });
}

/**
 * Sync state to backend server
 */
export async function syncToServer(
  syncKey: string,
  state: any,
  hubUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = buildApiUrl(`/api/sync/${syncKey}`, hubUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: text || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: data.success !== false };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Register device with backend
 */
export async function registerDevice(
  syncKey: string,
  device: { id: string; name: string; type: string; browser: string },
  hubUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = buildApiUrl(`/api/sync/${syncKey}/device`, hubUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device)
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * AI enhance a prompt
 */
export async function enhancePrompt(prompt: string, hubUrl?: string): Promise<string | null> {
  try {
    const url = buildApiUrl('/api/ai/enhance-prompt', hubUrl);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.enhanced || null;
  } catch {
    return null;
  }
}