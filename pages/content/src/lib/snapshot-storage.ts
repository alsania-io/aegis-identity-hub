/**
 * Snapshot & Profile Version History Storage Layer
 * Manages point-in-time state backups, rollbacks, and portable .alsania.json archives.
 */

import { AppState } from '../types/identity';
import { generateId } from './identity-storage';

export interface StateSnapshot {
  id: string;
  label: string;
  timestamp: string;
  source: 'auto' | 'manual' | 'import';
  state: AppState;
  summary: {
    promptsCount: number;
    agentsCount: number;
    skillsCount: number;
    toolsCount: number;
    memoryCount: number;
    activeProfile: string;
  };
}

const SNAPSHOTS_KEY = 'aegis_state_snapshots_v1';
const MAX_SNAPSHOTS = 25;

export function loadSnapshots(): StateSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load snapshots:', e);
    return [];
  }
}

export function saveSnapshots(snapshots: StateSnapshot[]): void {
  try {
    const pruned = snapshots.slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(pruned));
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [SNAPSHOTS_KEY]: pruned }).catch(() => {});
    }
  } catch (e) {
    console.warn('Failed to save snapshots:', e);
  }
}

export function createSnapshot(
  state: AppState,
  label: string = 'Manual Snapshot',
  source: 'auto' | 'manual' | 'import' = 'manual'
): StateSnapshot {
  const snapshot: StateSnapshot = {
    id: 'snap-' + Date.now() + '-' + generateId().slice(0, 4),
    label,
    timestamp: new Date().toISOString(),
    source,
    state: JSON.parse(JSON.stringify(state)),
    summary: {
      promptsCount: state.prompts?.length || 0,
      agentsCount: state.agents?.length || 0,
      skillsCount: state.skills?.length || 0,
      toolsCount: (state as any).tools?.length || 0,
      memoryCount: state.memory?.length || 0,
      activeProfile: state.activeProfileId || 'default'
    }
  };

  const existing = loadSnapshots();
  const updated = [snapshot, ...existing];
  saveSnapshots(updated);
  return snapshot;
}

export function deleteSnapshot(id: string): void {
  const existing = loadSnapshots();
  saveSnapshots(existing.filter(s => s.id !== id));
}

export function exportAlsaniaArchive(state: AppState): void {
  const archive = {
    alsaniaProtocol: 'v3.0',
    app: 'Aegis Identity Hub',
    exportedAt: new Date().toISOString(),
    checksum: 'als_' + Date.now().toString(16),
    state
  };

  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aegis-identity-${new Date().toISOString().split('T')[0]}.alsania.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAlsaniaArchive(jsonString: string): AppState {
  const parsed = JSON.parse(jsonString);
  if (parsed.state) {
    return parsed.state;
  }
  return parsed;
}
