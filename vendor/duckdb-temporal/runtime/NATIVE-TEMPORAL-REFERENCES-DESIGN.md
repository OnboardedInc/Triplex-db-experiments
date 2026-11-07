# Retained native entity presence

Managed presence is integrated in extension 0.32. The exact build passes
405 integration checks, TypeScript, all twenty functional workload families
and actual archived 0.31 and 0.28 upgrades. The [full
receipt](evidence/native-managed-presence-032-full-20261105.json) and
[focused receipt](evidence/native-managed-presence-032-focused-20261105.json)
pin the executed sources and artifacts. The original profile and its
receipts remain on `codex/temporal-presence-batch-20261105`.

## Contract

`entity T live { ... }` opts a newly declared schema/type domain into retained
presence. A type already declared by an older schema cannot opt in implicitly.
Its policy cannot change in a subsequent version. The additional type policy
and activation metadata use the existing catalog namespace and revisions.
Existing schema IR, hashes and ordinary native request hashes retain their
bytes. A schema with a live type uses `td.schema/4`. Its first successful
registration advances the store to format 11 and commits one knowledge event;
an exact replay advances nothing. Combined uniqueness and presence activation
share one event. Existing unique domains continue to apply in format 11.

Every native put or patch of a live entity retains its authored half-open valid
interval, including an empty record. Put replaces the complete presence set;
patch adds its authored interval while preserving prior presence outside it.
Empty records clear properties inside their edit while still authoring presence.
Identity remains stable and the existing identity-only reference contract stays
unchanged. Presence adds no Datalog attribute or assertion.

Batch members contribute the same events at the one shared parent position.
Members remain distinct by entity. The batch parent receipt records the exact
tracked member intervals in canonical member order. Member receipt and request
hash shapes remain unchanged; a batch with no tracked members retains its old
receipt bytes. The existing command transaction commits the receipt, event,
facts, provenance, clock and retained-assertion accounting together. Successful
replay records no event, including after later writes or changed member order.

`NativeEntityStore.presenceAt(entityId, {knownAt, validAt})` and
`PRAGMA td_entity_presence_at(entity_id, known_at, valid_at)` return null when
no managed edit exists by that knowledge cut. After the first edit they return
a boolean. The newest put or covering patch determines that point. Existing
assertion reads preserve their result shape and all query APIs retain the same
audited-native strategy.

The startup/revalidation audit binds schema policies and activation receipts,
single and batch intervals, owners, command/member provenance, and assertion
closures. Canonical history independently checks creation and carry bounds.
This integration includes no temporal-reference modifier, interval deletion,
restriction or cascade path. Those remain separate command and audit work.
The earlier isolated normalized reference-overlay experiment remains only on
its original branch.

## Reconciliation and qualification

The source merges presence changes into current registration and command
files, retaining the newer interval, multi-cut, correlated lookup and anti-join
APIs. Full verification registers ten presence methods: the original nine and
one populated format-11 regression covering those newer read APIs, old cuts,
exact correction endpoints, all eight carriers, replay and reopen. The owner
pairing fixture adds the presence helper to its exact core/companion contract.

The focused gate passes 26 public methods and five pairing methods.
The complete verifier passes 405 checks, and all 213 workload answers and
60 reopened profiles match. To reproduce from the runtime directory,
build the core first and pair its companion with the pinned engine:

```sh
[LOCAL_PATH_0034] build_native.py
[LOCAL_PATH_0034] build_owner_probe.py \
  --source-dir "$TD_DUCKDB_SOURCE" --engine-library "$TD_DUCKDB_ENGINE" \
  --compat-mutations
node_modules/.bin/tsc --pretty false
node --test build/adapter/test-native-presence.js \
  build/adapter/test-native-uniqueness.js \
  build/adapter/test-batch-owned.js build/adapter/test-batch-limits.js \
  build/adapter/test-batch-recovery.js
[LOCAL_PATH_0034] -m unittest test_owner_pairing
```

The MJS adapter helpers must first be copied to `build/adapter` as in the normal
verifier. The focused public set above expects 26 methods, plus five pairing
methods. The standalone predecessor gate requires fresh synthetic databases
and an exact accepted predecessor artifact directory:

```sh
TD_TEST_PRESENCE_PREDECESSOR=031 TD_TEST_LEGACY_031_BUILD="$TD_ACCEPTED_031_BUILD" \
  node --test adapter/test-presence-upgrade.mjs
TD_TEST_PRESENCE_PREDECESSOR=028 TD_TEST_LEGACY_028_BUILD="$TD_ACCEPTED_028_BUILD" \
  node --test adapter/test-presence-upgrade.mjs
```

The executed 0.31 predecessor profile pins core
`5191449b92d71209f9739771c8e5d03c6a5525b5e800ffdde91e28db83b4b946`
and companion
`4b872cb97f4c95536f1139e215351c717c03e557476e18fb580ffb21a1f183f4`.
The test creates a format-10 store using the predecessor, upgrades a fresh
subject, checks its definition, history, receipt and unique constraint, then
checks the predecessor's format error against a format-11 clone. Both
0.31 and 0.28 gates pass. A selectable 0.30 profile is also available.

Format-11 managed-batch crash and backup profiles, historical presence
audit cost, and per-entity lookup scale remain separate acceptance gates.
