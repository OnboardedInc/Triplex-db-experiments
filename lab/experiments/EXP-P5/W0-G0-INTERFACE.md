# Shared K01/P5 G0 admission

North star: P5 correctness while preserving P1/P2; authority: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; Q93a.

**Round 3 supersedes the snapshot-only round-2 interface.** `lab/bench/lib/g0.ts` is the sole admission coordinator. Its full-content D includes every declared adapter table/column, every returned dynamic column, all retained assertion lifetimes, claims, attempts and scope metadata. Exact typed encoding is in `g0-values.ts`. `readE1G0` additionally exposes K01's normalized Dprime; clone admission always compares full D.

`w0-fingerprint.ts` retains only the subordinate streaming W0 component and a compatibility wrapper:

```ts
fingerprintSweep({
  endpoint, scope, basis: { position, validAt },
  expected: { N, basisTx, facts, worlds, R2 },
  counts: { position, assertions, retired, frames },
  pin, // mandatory full-content pre-freeze Pin from g0.ts
  deadlineMs: 600_000,
})
```

The wrapper opens the measuring handle, verifies endpoint/scope, delegates to `admitG0`, and retains start/end counts plus the resulting D. Missing full-content pins, incomplete scans, history/value/interval changes, W0 mismatches and deadlines refuse with `FingerprintRefusal`. Snapshot equality alone grants nothing. The coordinator checks elapsed monotonic time after work as well as a timer; the W0 reader yields between pages and checks aborts.

K01 supplies the component with:

```ts
read: signal => readW0Fingerprint(composition, N, { position: B0, validAt: V_W0 }, signal)
```

`readW0Fingerprint` returns `{basisTx, facts, worlds, R2}` and performs no admission comparison. It preserves Q89i's `{e,a,v,tx}` projection. K01's `requireW0Fingerprint` owns the O-DOMAIN comparison.

Offline memory source seeding explicitly calls `freezeMemoryG0` before any clone; each COW arm then reads its own complete content through `admitG0`. The memory reader binds all actual owner-state cells, including original commands/receipts and historical lifetimes, using K01's encoding. This is a diagnostic memory representation, not an XTDB table-layout equivalence claim. The clone's logical scope is the source pin's scope; its actual endpoint remains separately bound. A candidate cannot generate its own expected pin during admission.

Native XTDB requires an explicit `--g0-pin` created before freeze; the P5 wrapper opens K01's complete native reader. No native admission or layout/quiescence check was executed in round 3. K01 still owns full clone lifecycle and E1 qualification.
