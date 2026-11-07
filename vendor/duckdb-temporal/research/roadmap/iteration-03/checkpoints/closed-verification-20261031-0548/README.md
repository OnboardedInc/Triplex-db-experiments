# Goal 3 closed verification checkpoint — 31 October 2026

## Current state

Goals **1–2 are bounded accepted**. Goal **3 is not yet accepted**; performance
remains **UNRUN**, and goals **4–10 remain queued in order**. This checkpoint
preserves closed correctness/research evidence, not production certification,
universal equivalence, a speed claim, a merge or a deployment.

Current code is on draft PR7, verified head
`52b1e81f1d71590bdefb376e62924c9f717d4344` over
`583dd3e1342d2b5c8601f088e42cbcc9952189f1`. Root's remote read-back verifies all
**280 source files**, manifest
`5e30c8b2dfaaac103c647a42440fb7d6c39d83846cc107913452b4e62db2c384`.
Selected native 0.4.0 bytes are identified by
`260b430a462a66b53e71728e860e9920b524a31c63dd117158e8524d73353a1a`
(235,446 bytes), actual unstable C API v2/host 2.0.0, pinned d54cbbe3. Application
code is **not duplicated here**; use PR7's exact source. Protected working native
artifact remains separately identified as `5b661f3843799cb97b5c7458f503eca9fefd0f58beb053bf22c740c05cb6270d`.

Pre-code contract and research QA were already verified on private research-reference
main `910f0ac597426ec813219fef07f3d795c7a9edbc` (contract SHA
`ea95d719241adab0ef69bf94d80dc5e898bfeae419d419f10efb68b5db545a1e`).
Those earlier bundles are referenced, not duplicated. The six-file frozen code
review plus manifest `297a9068…` is included; its no-blocker result is static
review, not runtime acceptance.

**This local package is not durable until root publishes it under the existing
private-repository permission and verifies remote main/read-back.** Root alone
owns source/ref/PR/Page/main integration. No publication or external call was
performed to create this package.

## Evidence lanes — do not pool their counts

| Lane / candidate | Closed observed scope |
|---|---|
| Native IR | 12,073 direct shared-parser/ownership/cap/FP assertions; 10 scalar cases; exact owned IR/golden; three identical production builds; old-host rejection and separately labeled direct-core O0/g1 ASAN+UBSAN. Binding/host/leak sanitizer certification is not inferred. |
| Python genuine-001 | 48 focused/boundary/cap checks using genuine candidate001; whole SQL/native rows/bits, actual route and low-cap behavior. Separate from later FP and full campaigns. |
| Python FP-002, final candidate002 | 26 isolated children, all actual exits0; 468 labeled checks, including the finite unsupported entry/getter matrix. Six static guard checks and 12 supported actual reader-count cases are separate evidence. No hostile mid-DB/fetch/COMMIT control-change guarantee. |
| Independent checker003, candidate001 | 156 PASS/156 child0 and actual controller/outer0: 135 fixtures (74 SQL, 24 successful whole-native, 37 expected errors), plus 21 integrations. Complete typed rows/bits/cuts/order, snapshot, getter, ownership, shadow-state and injected fault/no-prefix checks. 40 checker controls are not application cases. |
| Full regression, candidate002 | Terminal `verify_expressions.sh` child/controller/outer0, including formerly killed legacy22/typed57 large suites, all reached storage/FP/browser/codec/expression suites; exact suite breakdown in `full-regression/REPORT.md`. Extras: planner20 (five manual-IR SQL smokes), direct IR12,073/scalar10; final exact clean export280/280 plus two stdlib exporter tests; natural no-engine19 and five APIs' unavailable/rollback/reopen behavior. These repeated IR checks are not additional unique semantic coverage. |

Candidate001→002 changes only the exporter whitelist and its added stdlib source
closure test; the other 278 common source files, including planner/native/runtime
test bodies, are identical per the final regression receipt. Independent
candidate001 and final candidate002 evidence stays labeled separately; root must
reconcile the final closure rather than silently pooling studies.

The implemented bounded contract is additive planned reads, native-owned IR,
whole-program acyclic/filter-free proved SQL, and genuine whole-original native
fallback for every filter, cyclic SCC and unproved bound. Legacy APIs/counters
remain genuine. SQL route reports native=None, exact tagged/BLOB/set semantics,
same-transaction full-width clocks and fresh controls. The reports establish
only their finite tested scope.

## Failures retained, not relabeled

- Native's initial scalar-metadata mismatch, initial build issues and O1/g
  compiler kill remain alongside the later bounded direct-core sanitizer retry.
  A specific OOM cause was not proved.
- Original independent `/tmp` attempt: six completed PASS cases; case006 has
  partial raw stdout, no terminal child receipt/outcome unknown; remainder UNRUN
  after ENOSPC/outer1. Raw bytes are preserved without decoding/repair.
- Original complete workspace checker002 campaign: **152 PASS / 4 FAIL**, outer1.
  The four checker KeyErrors mishandled `message_contains`; actual genuine arms
  already agreed. Checker003's separately approved correction, primary research,
  negative controls and new full run are distinct; old FAILs stay FAILs.
- Original full aggregate001 exit137 and distinct typed-large child-9/outer137
  remain. Exporter001 exited0 but the independent closure check failed1 at
  **272/279**, omitting seven native IR test/golden files. Candidate002 fixed the
  whitelist and verified the complete final export, without altering old results.
- Initial copy/launcher ENOSPC failures, unloaded wrong-helper-source receipt,
  and actual controller/child/outer receipts are included.

Capacity-recovery metadata records 525 inactive synthetic DB files,
**2,208,460,800 bytes**, copied to workspace and independently path/byte/SHA
verified before only matching `/tmp` copies were reclaimed after all owners were
quiet. `/tmp` free bytes rose 15,253,504→2,223,714,304; observed MemAvailable
2,119,484→4,256,040 kB. No source/raw/logs were removed. The full DB data is **not
inside this package**; only SOURCE-INVENTORY/verification/reclaim metadata is
included. This is not a durable DB-binary backup or proof of OOM attribution.

## Package layout and exclusions

`EVIDENCE-MANIFEST.json` maps every selected original path to its exact bytes,
SHA256, mode and root alias. Repeated content appears once as
`payloads/<sha256>`; restoration recreates **every selected logical path** and its
original mode. There is no normalization: empty files, partial stdout, invalid
JSON/UTF-8 if present, stderr, scripts, fixtures and failure receipts retain their
exact bytes. Root aliases retain source provenance without writing back to those
paths. Original app/native/DB files were never imported or executed by packaging.

`EXCLUSIONS.json` explicitly records skipped source/mirror/candidate/build/runtime/
DB/cache trees, binary helper/artifact identities, inline application patches/API
source payloads, duplicate old archive containers and any missing/mutable input.
No instruction/skill/session dump, credentials, private platform text or private
reasoning belongs here. Known correctness owners released writes; selected
append-only coordinator/independent operational logs are exact bounded-prefix
snapshots, not a claim that their parent tasks stopped forever. In-flight
`performance-methods-001` is deliberately omitted until a later closed checkpoint.

## Reproduce byte-level restoration — no app tests

With Python standard library only:

```sh
# Concatenate parts in PACKAGE-MANIFEST.json order, not arbitrary glob order.
python - <<'PY'
import base64, hashlib, json
from pathlib import Path
m=json.loads(Path('PACKAGE-MANIFEST.json').read_text())
parts=[]
for p in m['parts']:
    b=Path(p['path']).read_bytes()
    assert len(b)==p['bytes']<=240000
    assert hashlib.sha256(b).hexdigest()==p['sha256']
    parts.append(b)
b=base64.b64decode(b''.join(parts),validate=True)
assert len(b)==m['archive']['bytes']
assert hashlib.sha256(b).hexdigest()==m['archive']['sha256']
Path('restored-package.tar.gz').write_bytes(b)
PY
python restore_bundle.py --archive restored-package.tar.gz \
  --dest NEW-empty-restore-path --report restore-verification.json
```

The restorer refuses existing destinations, unsafe/duplicate/nonregular tar
members, unindexed payloads and bad hashes/modes. It restores both archive members
and logical evidence paths, then rechecks complete pathsets, every byte/hash and
every mode. The preparer also builds the deterministic tar.gz twice and requires
identical bytes before producing Base64 parts (each ≤240,000 bytes). Local actual
restore receipts and a root-inspectable publication proposal accompany the bundle.

## Next gates

Root should first verify and durably checkpoint this exact closed evidence,
keeping PR7 draft and Page status aligned. Goal3 still needs final scope
reconciliation and the frozen performance protocol/campaign: paired planned SQL,
forced-native planned and legacy native on actual bounded public fixtures,
full-path E0/E1/E2 costs, route/plan/host/source/exit evidence and regressions.
Supplemental malformed retained-row/schema and late-control/COMMIT/lost-ack
boundaries remain explicitly scoped; existing read-only planned APIs do not add
a new evaluated-command contract. No early acceptance or performance claim follows
from checkpointing. Continue goals4–10 only after goal3's stated gate is met.
