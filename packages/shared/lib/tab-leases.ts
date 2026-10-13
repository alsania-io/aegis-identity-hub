// Phase 5 — tab leases (pure module). Ported into Aegis Identity Hub from the
// Hermes browser extension (`extension/lib/tab-leases.mjs`) — reused, not
// reinvented. One lease per tab; governs which tab a swarm worker owns, so
// subtasks cannot interleave in one conversation (Architecture §6.4).
//
// Kinds: this-tab | selected-tabs | task-set (shared identity across tabs).
// Ownership: owned (released only by owner) | borrowed (reclaimed on disconnect).
// Safety: idle expiry; MV3 generation invalidation (a new service-worker
// generation drops stale leases so a restart can't resurrect them); bounded,
// versioned, fail-closed snapshots carrying LEASE METADATA ONLY — never page
// URL, title, transcript, or content.
//
// Pure: no browser APIs; `now` is injectable for tests.

export const TAB_LEASE_VERSION = 1;
export const TAB_LEASE_STORAGE_KEY = "aegisTabLeases";
export const TAB_LEASE_DEFAULT_TTL_MS = 30 * 60_000;
export const MAX_TAB_LEASES = 32;

export const TAB_LEASE_KINDS = Object.freeze({
  THIS_TAB: "this-tab",
  SELECTED_TABS: "selected-tabs",
  TASK_SET: "task-set",
} as const);

export const TAB_LEASE_OWNERSHIPS = Object.freeze({
  OWNED: "owned",
  BORROWED: "borrowed",
} as const);

export type TabLeaseKind = (typeof TAB_LEASE_KINDS)[keyof typeof TAB_LEASE_KINDS];
export type TabLeaseOwnership = (typeof TAB_LEASE_OWNERSHIPS)[keyof typeof TAB_LEASE_OWNERSHIPS];

export interface TabLease {
  tabId: number;
  windowId: number | null;
  kind: TabLeaseKind;
  ownership: TabLeaseOwnership;
  ownerId: string;
  leaseId: string;
  generation: number;
  acquiredAt: number;
  expiresAt: number;
  taskSetId: string | null;
  groupSource: "native" | "internal";
}

const KNOWN_KINDS = new Set<string>(Object.values(TAB_LEASE_KINDS));
function normalizeLease(entry: any): TabLease | null {
  if (!entry || typeof entry !== "object") return null;
  const tabId = Number(entry.tabId);
  const windowId = Number(entry.windowId) || null;
  const kind = String(entry.kind || "").trim();
  const ownership = String(entry.ownership || "").trim();
  const ownerId = String(entry.ownerId || "").trim();
  const leaseId = String(entry.leaseId || `${ownerId}:${Number(entry.tabId)}:${Number(entry.acquiredAt)}`).trim();
  const groupSource = entry.groupSource === "internal" ? "internal" : "native";
  if (!Number.isInteger(tabId) || tabId <= 0) return null;
  if (!KNOWN_KINDS.has(kind)) return null;
  if (ownership !== TAB_LEASE_OWNERSHIPS.OWNED && ownership !== TAB_LEASE_OWNERSHIPS.BORROWED) return null;
  if (!ownerId) return null;
  if (!leaseId) return null;
  const generation = Number(entry.generation);
  const acquiredAt = Number(entry.acquiredAt);
  const expiresAt = Number(entry.expiresAt);
  if (!Number.isInteger(generation) || generation < 1) return null;
  if (!Number.isFinite(acquiredAt) || !Number.isFinite(expiresAt)) return null;
  const taskSetId = kind === TAB_LEASE_KINDS.TASK_SET ? String(entry.taskSetId || "").trim() : null;
  if (kind === TAB_LEASE_KINDS.TASK_SET && !taskSetId) return null;
  return {
    tabId, windowId, kind: kind as TabLeaseKind, ownership: ownership as TabLeaseOwnership,
    ownerId, leaseId, generation, acquiredAt, expiresAt, taskSetId, groupSource,
  };
}

export interface TabLeaseStoreOptions {
  now?: () => number;
  ttlMs?: number;
  maxLeases?: number;
  supportsTabGroups?: boolean;
  generation?: number;
}

export interface AcquireArgs {
  tabId: number;
  kind?: string;
  ownerId?: string;
  ownership?: TabLeaseOwnership;
  windowId?: number | null;
  taskSetId?: string | null;
  at?: number;
}

export type LeaseResult =
  | { ok: true; lease: TabLease }
  | { ok: false; error: string; lease?: TabLease | null };

export function createTabLeaseStore(opts: TabLeaseStoreOptions = {}) {
  const now = opts.now ?? Date.now;
  const ttlMs = opts.ttlMs ?? TAB_LEASE_DEFAULT_TTL_MS;
  const maxLeases = opts.maxLeases ?? MAX_TAB_LEASES;
  const supportsTabGroups = opts.supportsTabGroups ?? true;
  let currentGeneration = Math.max(1, Number(opts.generation) || 1);
  const leases = new Map<number, TabLease>();

  function leaseForTab(tabId: number): TabLease | null {
    const lease = leases.get(Number(tabId));
    return lease ? { ...lease } : null;
  }
  function acquire(args: AcquireArgs): LeaseResult {
    const {
      tabId, kind = "", ownerId = "",
      ownership = TAB_LEASE_OWNERSHIPS.OWNED,
      windowId = null, taskSetId = null, at = Number(now()),
    } = args;
    const normalizedTabId = Number(tabId);
    if (!Number.isInteger(normalizedTabId) || normalizedTabId <= 0) throw new Error("Tab id is required.");
    if (!KNOWN_KINDS.has(kind)) throw new Error(`Unknown tab lease kind: ${String(kind || "")}`);
    const normalizedOwner = String(ownerId || "").trim();
    if (!normalizedOwner) throw new Error("Lease owner id is required.");
    if (kind === TAB_LEASE_KINDS.TASK_SET && !String(taskSetId || "").trim()) {
      throw new Error("Task-set leases require a task set id.");
    }
    if (kind !== TAB_LEASE_KINDS.TASK_SET && taskSetId != null && String(taskSetId).trim()) {
      throw new Error("Only task-set leases may carry a task set id.");
    }
    if (leases.has(normalizedTabId)) {
      return { ok: false, error: "already-leased", lease: leaseForTab(normalizedTabId) };
    }
    if (leases.size >= maxLeases) return { ok: false, error: "lease-limit" };
    const lease: TabLease = {
      leaseId: `${normalizedOwner}:${normalizedTabId}:${Number(at)}`,
      tabId: normalizedTabId, windowId: Number(windowId) || null,
      kind: kind as TabLeaseKind, ownership, ownerId: normalizedOwner,
      generation: currentGeneration, acquiredAt: Number(at),
      expiresAt: Number(at) + Number(ttlMs),
      taskSetId: kind === TAB_LEASE_KINDS.TASK_SET ? String(taskSetId).trim() : null,
      groupSource: supportsTabGroups ? "native" : "internal",
    };
    leases.set(normalizedTabId, lease);
    return { ok: true, lease: { ...lease } };
  }

  function release(args: { tabId: number; ownerId?: string }): LeaseResult {
    const normalizedTabId = Number(args.tabId);
    const lease = leases.get(normalizedTabId);
    if (!lease) return { ok: false, error: "not-leased" };
    if (String(args.ownerId || "").trim() !== lease.ownerId) return { ok: false, error: "not-owner" };
    leases.delete(normalizedTabId);
    return { ok: true, lease: { ...lease } };
  }

  function renew(args: { tabId: number; ownerId?: string; leaseId?: string; generation?: number; at?: number }): LeaseResult {
    const normalizedTabId = Number(args.tabId);
    const lease = leases.get(normalizedTabId);
    if (!lease) return { ok: false, error: "not-leased" };
    if (String(args.ownerId || "").trim() !== lease.ownerId) return { ok: false, error: "not-owner" };
    if (String(args.leaseId || "").trim() !== lease.leaseId) return { ok: false, error: "stale-lease" };
    if (Number(args.generation) !== lease.generation) return { ok: false, error: "stale-generation" };
    const renewed: TabLease = { ...lease, expiresAt: Number(args.at ?? now()) + Number(ttlMs) };
    leases.set(normalizedTabId, renewed);
    return { ok: true, lease: { ...renewed } };
  }
  function removeTab(tabId: number): LeaseResult {
    const normalizedTabId = Number(tabId);
    const lease = leases.get(normalizedTabId);
    if (!lease) return { ok: false, error: "not-leased" };
    leases.delete(normalizedTabId);
    return { ok: true, lease: { ...lease } };
  }

  /** Reclaim every borrowed lease owned by a disconnected borrower. */
  function reclaimBorrowed(args: { ownerId?: string }): number {
    const normalizedOwner = String(args.ownerId || "").trim();
    let reclaimed = 0;
    for (const [tabId, lease] of leases) {
      if (lease.ownership === TAB_LEASE_OWNERSHIPS.BORROWED && lease.ownerId === normalizedOwner) {
        leases.delete(tabId);
        reclaimed += 1;
      }
    }
    return reclaimed;
  }

  function reclaimExpired(args: { at?: number } = {}): number {
    const at = Number(args.at ?? now());
    let reclaimed = 0;
    for (const [tabId, lease] of leases) {
      if (at >= Number(lease.expiresAt)) { leases.delete(tabId); reclaimed += 1; }
    }
    return reclaimed;
  }

  /** Invalidate every lease acquired under an older generation (MV3 restart). */
  function invalidateGeneration(args: { generation: number }): number {
    let invalidated = 0;
    for (const [tabId, lease] of leases) {
      if (Number(lease.generation) !== Number(args.generation)) { leases.delete(tabId); invalidated += 1; }
    }
    return invalidated;
  }

  /** Adopt recovered leases into a newer service-worker generation. */
  function adoptGeneration(args: { generation: number }): number {
    const g = Number(args.generation);
    if (!Number.isInteger(g) || g < currentGeneration) return 0;
    currentGeneration = g;
    let adopted = 0;
    for (const [tabId, lease] of leases) {
      if (lease.generation === g) continue;
      leases.set(tabId, { ...lease, generation: g });
      adopted += 1;
    }
    return adopted;
  }
  function leasedTabIds(): number[] { return [...leases.keys()]; }

  function leasesForKind(kind: TabLeaseKind): TabLease[] {
    return [...leases.values()].filter((l) => l.kind === kind).map((l) => ({ ...l }));
  }

  function taskSetTabIds(taskSetId: string): number[] {
    const n = String(taskSetId || "").trim();
    return [...leases.values()]
      .filter((l) => l.kind === TAB_LEASE_KINDS.TASK_SET && l.taskSetId === n)
      .map((l) => l.tabId);
  }

  function count(): number { return leases.size; }
  function usesNativeGroups(): boolean { return supportsTabGroups; }

  /** Bounded, versioned, fail-closed snapshot — lease metadata only. */
  function snapshot(): { version: number; entries: TabLease[] } {
    const entries = [...leases.values()]
      .map((l) => ({ ...l }))
      .sort((a, b) => Number(a.acquiredAt) - Number(b.acquiredAt))
      .slice(0, Math.max(1, Number(maxLeases) || MAX_TAB_LEASES));
    return { version: TAB_LEASE_VERSION, entries };
  }

  function hydrate(raw: any): TabLease[] {
    if (!raw || typeof raw !== "object") return [];
    if (Number(raw.version) !== TAB_LEASE_VERSION) return [];
    if (!Array.isArray(raw.entries)) return [];
    const parsed = raw.entries.map(normalizeLease).filter((x: TabLease | null): x is TabLease => !!x);
    const at = Number(now());
    const adopted: TabLease[] = [];
    for (const lease of parsed) {
      if (at >= Number(lease.expiresAt)) continue; // expired leases never resurrect
      if (!leases.has(lease.tabId)) { leases.set(lease.tabId, lease); adopted.push(lease); }
    }
    while (leases.size > maxLeases) {
      const oldest = [...leases.values()].sort((a, b) => Number(a.acquiredAt) - Number(b.acquiredAt))[0];
      leases.delete(oldest.tabId);
    }
    // Return only what was ACTUALLY adopted (expired/duplicate skipped) — the
    // honest contract. (Hermes' original returned all parsed; we tighten it.)
    return adopted;
  }

  return {
    acquire, renew, release, removeTab, reclaimBorrowed, reclaimExpired,
    invalidateGeneration, adoptGeneration, leaseForTab, leasedTabIds,
    leasesForKind, taskSetTabIds, count, usesNativeGroups, snapshot, hydrate,
  };
}

export type TabLeaseStore = ReturnType<typeof createTabLeaseStore>;

/**
 * §6.4 helper: pick the first tab that is NOT currently leased. Given a list of
 * candidate tab ids (in preference order), returns the first unleased one, or
 * null if all are leased. Pure; takes the store so it composes with a real one
 * and is trivially testable.
 */
export function pickUnleasedTab(store: TabLeaseStore, candidateTabIds: Array<number | null | undefined>): number | null {
  for (const id of candidateTabIds) {
    if (id == null) continue;
    if (!store.leaseForTab(id)) return id;
  }
  return null;
}