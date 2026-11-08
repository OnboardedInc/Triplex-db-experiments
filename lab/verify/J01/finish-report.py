# [CX-VJ01] Why: refuse to finalize execution claims until each named result has completed. Rejected: treating queued work as evidence.
import json,pathlib
p=pathlib.Path('lab/verify/J01')
q=json.loads((p/'live-qlever.json').read_text());r=json.loads((p/'live-xtdb-recovery.json').read_text());i=json.loads((p/'identities.json').read_text())
assert q.get('endedAt') and q['equivalent'] and not q['failures']
assert r.get('endedAt') and r['equivalent'] and not r['failures']
assert len(i['arms'])==4 and all(a['passed'] for a in i['arms'])
before=json.loads((p/'identity-before.json').read_text());after=json.loads((p/'identity-final.json').read_text())
assert all(after['files'][k]==v for k,v in before['files'].items())
assert all(after['owners'][k]['sha256']==v['sha256'] for k,v in before['owners'].items())
s=(p/'VERIFY.md').read_text();start=s.index('Execution results are filled in below');end=s.index('The reviewed core exposes',start)
s=s[:start]+'''The following checks were actually executed on freshly built candidate code:

| Check | Observed result | Evidence |
| --- | --- | --- |
| Build core, testkit, XTDB, QLever and backend declarations | PASS | `build.log` |
| Main/default-off/explicit-A0 adapter statement equality, 24 adversarial values per lane | PASS; normalized only random operation/attempt identities | `offline.json`, `offline.mjs` |
| A0/compact staged rows; 48 QLever asserted/retracted persisted row shapes versus main | PASS; exact values, including -0 | `offline.json` |
| Candidate's focused unit tests | XTDB 6 pass / 3 live-only skip; QLever 4 pass | `xtdb-unit.log`, `qlever-unit.log` |
| Public XTDB client with encoding off versus main | Binding/input contract differs; four well-formed samples agree | `wire-audit.json`, `parameter-regression.json` |
| Existing assertion ID in each lane/encoding | All four PASS; no position advance, no overwritten value, no leaked claim | `identities.json`, `identities.log` |
| XTDB full read frontier | Six stages PASS per arm; 18 saved read/result surfaces agree; later harness assertion fails as explained below | `live-xtdb.json`, `live-xtdb.log`, `partial-comparison.json` |
| XTDB previously skipped recovery/race frontier | Four stages PASS per arm, equivalent | `live-xtdb-recovery.json`, `live-xtdb-recovery.log` |
| QLever full focused script | Ten stages PASS per arm; all 22 read/result surfaces equivalent in memory | `live-qlever.json`, `live-qlever.log` |

The independent values include signed-64 endpoints, integers above 2^53 and at the QLever native-shadow boundary, safe-integer endpoints, binary64 subnormal/decimal/adjacent values, negative zero, extreme datetime values, long Unicode/escaped strings, high-precision decimal strings, booleans, refs, JSON and blobs. The live command stores 20 values; the offline case stores 24, including `Number.MAX_VALUE` and 64-KiB text. Exact sign assertions run before JSON serialization.

The live script checks read-your-own-write, an exact commit-position cut after replacement even when timestamps are equal, half-open valid intervals, a prior recorded-time cut, history, stale preconditions, original duplicate receipts, journal changes, a resumed feed, dependency state and Datalog at the old position. Recovery tests inject transport loss after actual publication, hide the resolution channel, reopen a client and recover by command ID; inject failure before send and then explicitly retry; and race duplicate commands and empty-entity CAS preconditions. Exactly one command publishes in each race. These are transport/client recovery tests, not engine-process crash tests. No slots were acquired and no resident was stopped, restarted or recreated. Synthetic scopes and the original failures are retained.

**Verifier failures retained, not promoted:**

- `build-attempt1.log`: the first queued build command never built; pnpm 10 rejects `--store-dir` on run/exec. The successful build uses the installed pinned binaries directly, with no new installation. The only install used the project store, `--offline --frozen-lockfile --ignore-scripts`; see `install.log`.
- `offline-attempt1.log`: the first offline comparator did not normalize the random operation UUID's base64 IRI form. The corrected comparator normalizes only operation/attempt identities; its completed result is `offline.json`.
- `live-xtdb.json` and `live-xtdb.log`: both arms stopped after six passing stages because the first verifier expected `_tag === "TransactionOutcomeUnknown"`. Core deliberately retains `_tag === "WriteError"` on that subclass (`packages/core/src/errors/index.ts:34`), with `reason === "outcome-unknown"`. `live-attempt1.mjs` preserves that exact failed harness. The corrected recovery-only attempt checks the actual class/reason and runs only the four skipped stages in fresh scopes; it does not rerun the six passing read stages. The original aggregate check process therefore exits 1; that exit is a retained verifier failure, not a claimed whole-suite PASS.
- The QLever run used the corrected class/reason harness, preserved as `live-qlever-attempt1.mjs` (`harness: live.mjs:v2`). Its equivalence comparator preserves negative zero in memory, but its saved JSON snapshots render -0 as 0. The XTDB initial snapshots have the same serialization limit. `partial-comparison.json` explicitly limits its saved-snapshot comparison accordingly; it is not raw-bit proof. Direct exact assertions checked negative zero at commit/read/cut, and the independent offline row roundtrips also checked its sign. Current `live.mjs:v3` preserves the signed-zero marker in saved output and was used for the XTDB recovery frontier.

`identity-before.json`, `identity-after.json` and `identity-final.json` bind candidate source, built JavaScript/declarations, lockfile and resident-owner observations. Source/build/lock/config file hashes present before execution are unchanged at final readback; the two owner-file hashes are unchanged. Final identity also hashes the verifier tools and the retained harness versions. These owner-file observations are not a new container-image attestation or a full G1 receipt. Baseline code was copied from the pinned Git revision, not read from mutable main-checkout dist; generated baseline copies are ignored and reproducible with `prepare-baseline.mjs`.

''' +s[end:]
(p/'VERIFY.md').write_text(s)
print('Finalized report from completed evidence; all source/build/owner hashes unchanged.')
