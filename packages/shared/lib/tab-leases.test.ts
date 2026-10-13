// Phase 5 tab-leases tests — AIDH's first test suite (node:test, Node v24).
// Ported with the module from Hermes. Proves: acquire/release/renew ownership,
// task-set grouping, borrowed reclamation, idle expiry, MV3 generation
// invalidation, and fail-closed snapshot/hydrate (metadata only).
//
// Run: node --test packages/shared/lib/tab-leases.test.ts   (via tsx)
//   or: npx tsx --test packages/shared/lib/tab-leases.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTabLeaseStore,
  TAB_LEASE_KINDS,
  TAB_LEASE_OWNERSHIPS,
  TAB_LEASE_VERSION,
} from "./tab-leases.ts";

const T0 = 1_000_000;

function store(opts = {}) {
  let clock = T0;
  const s = createTabLeaseStore({ now: () => clock, ...opts });
  return { s, tick: (ms: number) => (clock += ms), at: () => clock };
}

test("acquire + leaseForTab round-trips, second acquire is already-leased", () => {
  const { s } = store();
  const r = s.acquire({ tabId: 7, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w1" });
  assert.equal(r.ok, true);
  assert.equal(s.leaseForTab(7)?.ownerId, "w1");
  const again = s.acquire({ tabId: 7, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w2" });
  assert.equal(again.ok, false);
  assert.equal((again as any).error, "already-leased");
});

test("only the owner may release; non-owner is refused", () => {
  const { s } = store();
  s.acquire({ tabId: 9, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w1" });
  assert.equal(s.release({ tabId: 9, ownerId: "w2" }).ok, false);
  assert.equal(s.release({ tabId: 9, ownerId: "w1" }).ok, true);
  assert.equal(s.leaseForTab(9), null);
});

test("rejects invalid acquire inputs", () => {
  const { s } = store();
  assert.throws(() => s.acquire({ tabId: 0, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" }));
  assert.throws(() => s.acquire({ tabId: 1, kind: "bogus", ownerId: "w" }));
  assert.throws(() => s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "" }));
  assert.throws(() => s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.TASK_SET, ownerId: "w" }));
});
test("task-set leases group several tabs under one identity", () => {
  const { s } = store();
  s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.TASK_SET, ownerId: "swarm", taskSetId: "run-1" });
  s.acquire({ tabId: 2, kind: TAB_LEASE_KINDS.TASK_SET, ownerId: "swarm", taskSetId: "run-1" });
  s.acquire({ tabId: 3, kind: TAB_LEASE_KINDS.TASK_SET, ownerId: "swarm", taskSetId: "run-2" });
  assert.deepEqual(s.taskSetTabIds("run-1").sort((a, b) => a - b), [1, 2]);
  assert.deepEqual(s.taskSetTabIds("run-2"), [3]);
});

test("borrowed leases are reclaimed wholesale on borrower disconnect", () => {
  const { s } = store();
  s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "panel", ownership: TAB_LEASE_OWNERSHIPS.BORROWED });
  s.acquire({ tabId: 2, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "panel", ownership: TAB_LEASE_OWNERSHIPS.BORROWED });
  s.acquire({ tabId: 3, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "other" });
  assert.equal(s.reclaimBorrowed({ ownerId: "panel" }), 2);
  assert.deepEqual(s.leasedTabIds(), [3]);
});

test("idle expiry reclaims leases past TTL; renewal extends", () => {
  const { s, tick } = store({ ttlMs: 1000 });
  const r = s.acquire({ tabId: 5, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  assert.equal(r.ok, true);
  tick(1500);
  assert.equal(s.reclaimExpired(), 1);
  assert.equal(s.count(), 0);

  const r2 = s.acquire({ tabId: 6, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  const lease = (r2 as any).lease;
  assert.equal(s.renew({ tabId: 6, ownerId: "w", leaseId: lease.leaseId, generation: lease.generation }).ok, true);
  tick(900); // within renewed window
  assert.equal(s.reclaimExpired(), 0);
});

test("renew rejects stale leaseId or generation", () => {
  const { s } = store();
  const r: any = s.acquire({ tabId: 8, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  assert.equal(s.renew({ tabId: 8, ownerId: "w", leaseId: "wrong", generation: r.lease.generation }).ok, false);
  assert.equal(s.renew({ tabId: 8, ownerId: "w", leaseId: r.lease.leaseId, generation: 999 }).ok, false);
});

test("MV3 generation invalidation drops stale-generation leases", () => {
  const { s } = store({ generation: 1 });
  s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  assert.equal(s.invalidateGeneration({ generation: 2 }), 1);
  assert.equal(s.count(), 0);
});

test("snapshot/hydrate are versioned, bounded, metadata-only, no resurrection", () => {
  const { s, tick } = store({ ttlMs: 1000 });
  s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  const snap = s.snapshot();
  assert.equal(snap.version, TAB_LEASE_VERSION);
  assert.equal(snap.entries.length, 1);
  // no page URL / title / content fields on a lease
  for (const k of ["url", "title", "transcript", "content"]) {
    assert.equal(k in snap.entries[0], false);
  }
  // fresh store (clock at T0) hydrates a still-valid snapshot
  const { s: s2 } = store({ ttlMs: 1000 });
  assert.equal(s2.hydrate(snap).length, 1);
  assert.equal(s2.leaseForTab(1)?.ownerId, "w");

  // an EXPIRED snapshot must not resurrect: advance a fresh store's clock past
  // the lease's expiresAt BEFORE hydrating.
  const { s: s4, tick: t4 } = store({ ttlMs: 1000 });
  t4(2000); // now = T0 + 2000 > expiresAt (T0 + 1000)
  assert.equal(s4.hydrate(snap).length, 0);
  assert.equal(s4.count(), 0);
});

test("lease-limit is enforced", () => {
  const { s } = store({ maxLeases: 2 });
  s.acquire({ tabId: 1, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  s.acquire({ tabId: 2, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  const over = s.acquire({ tabId: 3, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "w" });
  assert.equal(over.ok, false);
  assert.equal((over as any).error, "lease-limit");
});
import { pickUnleasedTab } from "./tab-leases.ts";

test("pickUnleasedTab returns the first UNLEASED candidate (§6.4)", () => {
  const { s } = store();
  s.acquire({ tabId: 10, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "run-A" });
  // Candidate order [10, 11, 12]: 10 is leased, so 11 wins.
  assert.equal(pickUnleasedTab(s, [10, 11, 12]), 11);
  // All leased -> null (caller must create a fresh tab).
  s.acquire({ tabId: 11, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "run-A" });
  assert.equal(pickUnleasedTab(s, [10, 11]), null);
  // Ignores null/undefined ids.
  assert.equal(pickUnleasedTab(s, [null, undefined, 12]), 12);
  // Empty list -> null.
  assert.equal(pickUnleasedTab(s, []), null);
});

test("two runs get DIFFERENT tabs for the same host (§6.4 regression)", () => {
  const { s } = store();
  // Host has two tabs open: 100 and 200.
  const runATab = pickUnleasedTab(s, [100, 200]);
  assert.equal(runATab, 100);
  s.acquire({ tabId: runATab!, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "run-A" });
  // Run B must NOT get 100 again; it gets the other tab.
  const runBTab = pickUnleasedTab(s, [100, 200]);
  assert.equal(runBTab, 200);
  s.acquire({ tabId: runBTab!, kind: TAB_LEASE_KINDS.THIS_TAB, ownerId: "run-B" });
  // A third run finds none -> must create a fresh tab (null here).
  assert.equal(pickUnleasedTab(s, [100, 200]), null);
});