# W0 G0 module shared with K01

North star: P5 correctness; Q93a/b; scope/targets: lab/SCOPE.md, NORTH-STAR.md, TARGETS.md.

Import `lab/bench/lib/w0-fingerprint.ts` from this branch after integration. No sibling checkout import is necessary.

The small admission entry point is:

```ts
fingerprintSweep({
  endpoint, scope, basis: {position, validAt},
  expected: {N, basisTx, facts, worlds, R2},
  counts: {position, assertions, retired, /* backend counts may add keys */},
  deadlineMs: 600_000,
})
```

It reads fresh content from that endpoint/scope in the calling process, checks every subject in ascending order, checks start and end store counts, and returns `{status: "complete-and-matching", endpoint, scope, basis, observed}`. Every mismatch, incomplete read, absent pin, deadline or endpoint mismatch throws `FingerprintRefusal` with `_tag: "FingerprintRefusal"`. An optional trusted reader factory supports the existing measuring handle and offline fixtures; it must bind the actual handle's endpoint and scope. Process observations and saved booleans are not accepted.

K01's existing `W0Check.read(signal)` can use the lower-level streaming reader, with its own outer deadline and full-table D gate:

```ts
read: signal => readW0Fingerprint(composition, N, {position: B0, validAt: V_W0}, signal)
```

The result shape is exactly K01's current `W0Fingerprint`: `{basisTx, facts, worlds, R2}`. `readW0Fingerprint` applies accepted W0/O-DOMAIN pins but does not itself grant admission or compare an oracle. The calling K01 full-content gate must still compare its independently pinned D (all assertions/history, claims, attempts and scope positions), plus this W0 component against O-DOMAIN. This W0 snapshot component does not replace K01's history/claim/table coverage or layout refusal checks. P5's original driver and round-2 measuring process both import this module.

The pre-freeze pin remains K01's responsibility. The module never manufactures a golden from a clone's own observed answer. Public XTDB uses the measuring process's configured XTDB endpoint and refuses any URL mismatch; memory is for offline diagnostics only. Backend page queries retain their own timeout; the gate has a total deadline and checks its abort signal between every page.
