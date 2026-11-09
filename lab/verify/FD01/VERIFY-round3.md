# CX-VFD01 round 3: ACCEPT-OFFLINE

North star: P3 correctness and source-publication-to-durable-known lag, under `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md` 1.1 P3 and Q98. Reviewed **731e10e4075715c65c10f2ce720de2d3dcee9b1a**, branch `exp/FD01-feed-contract`. Read REPORT.md round 3 and round3/EVIDENCE.md. Offline only; no implementation edits.

## Verdict

**ACCEPT-OFFLINE. No new actionable findings within the documented trusted-producer boundary.** R2-F1 is closed for the host measurement path: legacy process-relative readings are rejected, host/boot identity is checked, and actual consumer captures cannot be replaced with an arbitrary scheduling callback. An ACK-derived observation cannot replace the independently persisted publication record.

Fresh validation: **14/14 host tests, 11/11 bench tests**, including **900 actual process-stop observations** (500 keyed candidate, 300 unkeyed split, 100 keyed split negative control). The builder's 1,240-test G0 is historical builder evidence; I did not rerun root G0 or claim it as my result.

## Requested adversarial cases

| Case | Fresh result |
| --- | --- |
| R2 `cross-process.mjs` unchanged | Same exact bytes as review commit 0fcaa911. It exits 1 specifically at the new `publicationLagMs`, with `Publication clock origin mismatch`. This expected negative outcome is checked by error origin, not exit status alone |
| Two fresh processes with staggered start times, new capture primitive | Correct bound lag **409.0305 ms**; the old subtraction of relative process readings would give **75.190625 ms**. Producer sidecar readback equals the source process's returned record |
| Same host, changed reboot identity in second process | Rejected: `Publication clock origin mismatch`. Host digest stays equal; boot digest changes. Retrying publication against the old sidecar retains the old record, so it cannot silently become a new-boot observation |
| Worker thread opens its own bound clock | Compatible host/boot domain and accepted elapsed **521.294 ms** from the producer record |
| Parent clock object structured-cloned into worker | Rejected as `Unbound feed clock`; opening a local clock in that worker is the valid path |
| Forged plain clock with copied legitimate domain | Rejected by `captureFeedInstant` as unbound; actual `FeedConsumer` refuses before checkpoint advance |
| Forged boot/origin tag on an observation | Rejected as clock-origin mismatch |
| Fresh ACK capture with legitimate origin, substituted timestamp | Rejected as `Publication differs from producer record`; actual consumer leaves checkpoint 0 and emits no lag |
| Publication identity replaced with ACK identity | Rejected against the original producer record |
| Producer record or observation for position 2 supplied for position 1 | Rejected by exact position binding; actual consumer leaves checkpoint 0 and emits no lag |
| Fabricated reader returning arbitrary bytes | Rejected by `readProducerPublication` as unbound |
| Fixed publication 100 ms / known 400 ms | Exact **300 ms**; false claims 1, 200 and 260 each rejected |
| Same helper called by NS driver, p99 inputs 249/250/251 | **true / true / false**, preserving the inclusive 250 ms boundary |

The reboot case is an explicit **simulation**, not a reboot of the shared host. A separate participant process substitutes only the OS boot-query response before constructing its clock. This exercises construction of a new bound clock, capture, sidecar retry and comparison under a changed boot identity. It does not demonstrate recovery across an actual machine reboot.

The clock tests use fresh actual OS boot queries where applicable. The sandbox denies that read-only query by default; the baseline and new participant probe were run with the needed OS-read access. No fallback clock or fabricated identity was used for the normal producer, consumer or worker. No raw hostname or boot UUID was sent to a service.

## Atomicity and prior controls

The same independently authored round 2 `atomic-child.mjs` was copied unchanged. Its real SQLite snapshots are read after abrupt exit 77, before any replay, then checked by the reviewed `auditConsumerAtomicity`.

- Ordinary one-transaction writes: all five stop phases accepted.
- Checkpoint-first writes inside the same transaction: all five phases accepted.
- `BEGIN` on one connection with checkpoint autocommitted on another: rejected at before-commit/after-effect partial states.
- Checkpoint committed first in a separate transaction: rejected after first commit.
- Effects for message 1 committed with checkpoint still at message 0: rejected after commit/after-checkpoint.

That is **25 additional abrupt process stops** over five implementations, with every bad implementation rejected by at least one required phase. The original full host suite separately reran its 900-stop matrix, including the exact original keyed-split mutation and the duplicating unkeyed control. No atomicity algorithm changed in this round.

The new producer-clock test also freshly checks original publication timestamp preservation on retry, changed publication identity refusal, source binding, missing records, different host/boot, fake clock/reader rejection, and a modified persisted timestamp rejected by digest verification. The actual-consumer bench checks missing/unbound/late-map refusal before progress and a >=300 ms elapsed interval despite a skewed scheduling callback.

## Trusted producer boundary and integration work

The new host path removes the permissive clock-label default and directly captures the common host monotonic primitive. `publicationLagMs` checks exact coordinates, publication identity, record digest, timestamp and host/boot domain against producer bytes. `readProducerPublication` supplies those bytes through a bound read-only reader. These are meaningful integrity checks and close the prior tested substitution routes.

They do **not** establish the semantic truth of the producer's event placement. I explicitly called `openPublicationWriter.publish` with an ACK-labelled identity as the **first** record for a position. That record was accepted, and the consumer advanced checkpoint 1. This is consistent with the builder's declared boundary: the producer is trusted to invoke publication at the source event, publication IDs are opaque, and no real source observer has been integrated. The code cannot infer that an arbitrary ID refers to an ACK. This is not an additional defect in the claimed offline contract and is not native-source qualification.

Before any real P3 receipt counts, the source adapter must bind `publish` to the native watermark/COMMIT-resolution/transact-result event, retain that original producer receipt, and prove that ACK/poll timing cannot create the first publication record. A writer with authority to replace the sidecar and recompute hashes is also outside the stated integrity boundary. Pure core arithmetic does not authenticate arbitrary raw objects; the tested host capture and reader establish their origin.

The NS driver's windows still need integration with the new host-boot time origin. Its current lack of a bound observer continues to refuse measurement; no implicit conversion or working live lane is inferred. The inclusive p99 comparison test is a scalar boundary regression, not a pooled p99 or 256-reader workload.

## Evidence and reproduction

Durable root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VFD01/round3-30e5e9a4-fa9e-4baa-9ed9-42897738d375/`.

| Path | Content |
| --- | --- |
| `source.json`, `subject/` | 76 exact Git 731e10e4 source/test/oracle preimages and SHA256s |
| `baseline.json`, `baseline-host.json`, `baseline-host.log`, `baseline-bench.log` | Fresh 14-test host and 11-test bench runs, commands and outcomes |
| `baseline-crashes.json` | 900 raw pre-replay crash observations, expected arm/phase counts |
| `probes.json` | Actual two-process/worker observations, simulated reboot, negative errors, 25 atomicity snapshots and actual-consumer results |
| `publication.db`, `atomic-*.db`, `consumer-*/` | Retained source/consumer and independent atomicity SQLite state |
| `review/` | Exact verifier tools, unchanged R2 probe, logs, receipt, report and byte-identity audit |

Own tools, compact logs, receipt and `SHA256SUMS-round3` are under `lab/verify/FD01/round3/`. Manifest paths are relative to the durable root. Bulky evidence stays outside Git. The source alias loader targets immutable exported Git preimages, not mutable builder code or dist. Existing Vitest 5.0.4 is read-only tooling. Node 22.23.2 and SQLite 3.51.3 were used. No dependency installation or rebuild was needed.

Commands, from this worktree with >=5 GiB free (and OS boot-query access for the first two):

```sh
node lab/bin/heavy.mjs --label CX-VFD01-R3-baseline -- node lab/verify/FD01/round3/baseline.mjs
node lab/bin/heavy.mjs --label CX-VFD01-R3-probes -- node lab/verify/FD01/round3/probes.mjs
node lab/bin/heavy.mjs --label CX-VFD01-R3-unchanged-cross -- node lab/verify/FD01/round3/cross-process.mjs
```

The third command is expected to fail at the new origin validation; its source bytes are deliberately unchanged. The participant reboot fixture is local to the new probe process. All heavy commands used the canonical heavy wrapper and had >5 GiB free at admission; entrypoint disk guards also check after waiting. No engine or exclusive slot was used.

## PASS / verdict audit (rule 9a)

| Result site | Content | Freshness and binding |
| --- | --- | --- |
| `baseline.mjs` and target test suites | Actual command success plus 14 host assertions, 11 bench tests, exact boundary/control outcomes and 900 concrete crashes | New source-export run and fresh reports; aliases/child hooks target Git 731e10e4; raw report and crash files retained; no historical G0 adopted |
| `probes.mjs` two-process/worker checks | Exact record readback, BigInt interval recomputation, >=350 ms elapsed, compatible domains, and specific failures for incompatible/forged/foreign observations | New processes, worker, sidecar and samples; simulated reboot explicitly marked; all 76 target hashes checked before/after |
| `probes.mjs` atomicity and consumer checks | Real exit 77, complete pre-replay snapshots, expected safe states and bad-variant rejections; exact checkpoints/lag counts on consumer refusals | New file per phase/mode; independent expected identities; same copied round 2 child bytes; newly opened consumer stores |
| Unchanged `cross-process.mjs` negative result | Failure specifically originates at `publicationLagMs` clock-origin validation, not import, resource or unrelated assertion failure | Fresh process pair and current API; exact byte equality with 0fcaa911 checked by recorder |
| `record.mjs`, receipt and SHA256SUMS | Verifies Git/source bytes, fresh baseline counts and 900 arm counts, interval arithmetic, all requested errors, exact old-probe bytes and unchanged acceptance paths | Current-attempt retained bytes and tool/report copies, explicit offline/slot-null binding, manifest readback verification |
| This verdict | ACCEPT-OFFLINE follows closure of the tested prior findings and successful requested controls | Bound only to 731e10e4 and the documented trusted-producer boundary; native publication event, live performance and release readiness remain unqualified |

No production or acceptance-contract file was modified. **No pinned path changed hash in this review.** The verifier branch contains only its own report/tools/results. No auto-commit of builder work, merge or push occurred.

Not verified: actual machine reboot, real source-event integration on any lane, G1, fresh root G0, native erasure/excision/restore, O-DOMAIN fanout, 256-reader or pooled burst lag, successful clean package installation, or end-to-end P3 qualification. The historical 11.112791 ms write p99 prediction miss and package-consumer gap remain as documented; neither is reclassified by this review.
