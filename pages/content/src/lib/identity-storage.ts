/**
 * Aegis Identity Hub - Storage Layer
 * Merged from aegis-identity-hub/src/lib/storage.ts
 */

import { AppState, defaultAppState, Device } from '../types/identity';

const STORAGE_KEY = 'aegis_identity_hub_state';
const DEVICE_KEY = 'aegis_device_info';
const UI_LOCK_KEY = 'aegis_ui_locked';

function mergeWithDefaults(parsed: Partial<AppState>): AppState {
  return {
    ...defaultAppState,
    ...parsed,
    settings: {
      ...defaultAppState.settings,
      ...parsed.settings
    },
    mcpConfig: {
      ...defaultAppState.mcpConfig,
      ...parsed.mcpConfig
    },
    swarmConfig: {
      ...defaultAppState.swarmConfig,
      ...parsed.swarmConfig
    }
  };
}

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

/**
 * Synchronous read used for the initial React state on mount.
 * localStorage is PAGE-scoped (per site origin), so it is only a fast local
 * cache here — the source of truth is chrome.storage.local (extension-scoped,
 * survives site data clears and is shared across every host page). See
 * hydrateFromChromeStorage() for the async upgrade path that runs right after.
 */
export function loadLocalState(): AppState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return mergeWithDefaults(JSON.parse(stored));
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  return { ...defaultAppState };
}

/**
 * Async hydration: reads the extension-scoped copy of state from
 * chrome.storage.local and, if it's newer/present, returns it so the caller
 * can update React state. This is what actually fixes state "resetting" when
 * localStorage on the current page is empty, cleared, or partitioned.
 */
export async function hydrateFromChromeStorage(): Promise<AppState | null> {
  if (!hasChromeStorage()) return null;
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const stored = result[STORAGE_KEY];
    if (!stored) return null;
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return mergeWithDefaults(parsed);
  } catch (e) {
    console.warn('Failed to hydrate state from chrome.storage.local:', e);
    return null;
  }
}

export function saveLocalState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }

  // Write-through to extension-scoped storage so state survives per-site
  // localStorage resets/clears and is consistent across every host page.
  if (hasChromeStorage()) {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: state }).catch((e: unknown) => {
        console.warn('Failed to save state to chrome.storage.local:', e);
      });
    } catch (e) {
      console.warn('Failed to save state to chrome.storage.local:', e);
    }
  }
}

export function getDeviceInfo(): { id: string; name: string; type: string; browser: string } {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    // Fall through
  }

  // Generate new device info
  const browser = detectBrowser();
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const info = {
    id: 'dev-' + Date.now(),
    name: isMobile ? 'Mobile Device' : 'Desktop Browser',
    type: isMobile ? 'mobile' : 'desktop',
    browser: browser
  };

  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(info));
  } catch (e) {
    // Ignore
  }

  return info;
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Kiwi')) return 'Kiwi';
  return 'Unknown';
}

export function getUiLocked(): boolean {
  try {
    const val = localStorage.getItem(UI_LOCK_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setUiLocked(locked: boolean): void {
  try {
    localStorage.setItem(UI_LOCK_KEY, String(locked));
  } catch {
    // Ignore
  }
}

export function generateId(): string {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
}

export function getSyncKey(): string {
  const state = loadLocalState();
  if (state.syncKey) return state.syncKey;
  // Generate a new sync key
  const key = 'sync-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
  const updated = { ...state, syncKey: key };
  saveLocalState(updated);
  return key;
}