# CX-VOBS6 — OBS01 rounds 6–7: FIX-FIRST

Reviewed `exp/OBS01-observer` at **c1a14ad577fcdebbfdea4407b9d5999da12ac0e2**.
Independent reviewer branch: `verify/OBS01-r7`. Date: 2026-11-09.

**North star:** P3 correctness. The source publication bracket must not move the
lag origin forward, and the consumer bracket must represent a durable record.
Scope and targets are `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`;
procedure is `lab/PROTOCOL.md`. Read the requested OBS01 report rounds, VM.md,
main-checkout R44 sections 3.1–3.6, Q100e/q/r/s, and G03's V2 report/source.
Exact document hashes and the four ruling rows are retained with the evidence.

**Verdict: FIX-FIRST.** Two high-severity trust-boundary defects and one medium
decision-window defect remain. The supplied offline tests pass after preparing
their missing scratch parent directory. Persistent WAL corruption/reset,
checkpoint rollover, schema and clock controls work in the tested cases.
Observer code and acceptance files were not changed.

Wording clarification: R44/Q100e defines **L as the last negative poll's start**,
and **U as the first positive poll's end**. L normally precedes publication and
may precede its WAL sync. It is U's positive read that is conditionally after
sync; lag uses `U_consumer - L_source` conservatively. The task's references to
first-positive L and L not preceding durability cannot both describe that
contract. This review assesses the R44 bracket, without changing its rule.

## Findings

### F1 — High: replacing source files divorces the poll connection from captured WAL

**Location:** `lab/observer/vm_watch.py:131`, `:157`, `:166`, `:208`;
`lab/observer/vm_normalizer.py:249`, `:280`.

The poller opens SQLite once. WAL tailing and final readback independently open
the configured pathname. No cross-read device/inode binding connects them.
`stable()` checks inode consistency only within one read; its final comparison
with `initial` compares bytes, so a replacement main file with identical bytes
passes. Inotify's rename/delete/create events only wake polling (`:185–189`).

**Reproduction:** `probe_round7.py`, `collector_case(..., 'path-replacement')`:

1. Start the actual collector and wait for its successful initial RO poll.
2. Rename `broker.db`, `-wal`, `-shm`; retain the open old writer/observer handles.
3. Recreate the configured main pathname from its identical initial bytes. Commit
   LSN 1 there with FULL, and independently read LSN 1 through a fresh connection.
4. About 400 ms later commit LSN 1 through the old writer handle; stop collection.
5. Run the unchanged normalizer over actual collector polls/tails/final bytes,
   with a trusted offline adapter supplying the actual send and synthetic domain.

Final attempt `adversarial03` **ACCEPTED** position 1024 with
`L=853162736213166`, `U=853162747990375`. The replacement source's commit already
returned at `853162339326708`, and the independent fresh read saw LSN 1 before
the delay. Thus **L is at least 396,886,458 ns too late**. Initial/final inodes
were `176406140`/`176406154`; both writers used synchronous level 2. This can
understate source-to-consumer lag by nearly 400 ms, crossing the 250 ms bar.
Q100s correctly permits the original decision stamp, so F20 does not rescue it.

Evidence: `adversarial03/path-replacement/{collector-events.json,
normalizer-input.jsonl,normalized.json}` and `adversarial03/RESULT.json` under
the durable root below. `adversarial01` and `adversarial02` independently retain
the same failure (399.120000 and 399.817250 ms late).

**Proposed fix:** bind the poll connection, main/WAL/SHM objects and every tail/
final read to the same opened files and generation. Refuse rename, unlink,
replacement, or identity change throughout capture, including same-byte main
replacement. Rechecking a hash at the end is insufficient. Add the real open-
connection replacement regression for source and consumer stores.

### F2 — High: readable WAL state is accepted without establishing writer synchronization

**Location:** `lab/observer/vm_watch.py:131–144`;
`lab/bin/vm-observer.mjs:63–66`; `lab/observer/vm_normalizer.py:249`.

G03 V2 establishes ordering for its **FULL** writer, SQLite 3.40.1 and image
`sha256:3344768f0ab951cb8053083a57e2a923d062dfeb21ac4392171fcf17f9cd11ac`.
It explicitly does not establish every build/interleaving. The VM controller
checks source container/holder/volume and column profile, but neither collector
nor parser requires a trusted, source-bound WAL-sync observation or enforcement
of that writer's synchronization mode. A candidate can change its own connection
to OFF/NORMAL without changing the stored schema or bytes the parser validates.
The observer's own RO connection's PRAGMA cannot establish the writer's mode.

**Reproduction:** `collector_case(..., 'synchronous-off')` starts the unchanged
poll/tail/readback path, sets the writer connection's `PRAGMA synchronous=OFF`
(read back **0**), commits, and waits 400 ms before an explicit WAL `fsync`.
Normalization **ACCEPTED** the position with
`U=853162870686291`; that explicit sync began at `853163272055375`,
**401,369,084 ns later**. The same-inode FULL control also accepts normally.

This demonstrates that the observer cannot distinguish a sync-disabled writer
from its intended durability profile. It does **not** claim an offline power
loss, prove when the OS happened to flush pages, or repeat the VM V2 experiment.
The unsupported inference is “positive read implies this commit's WAL sync”.
For a consumer, an early visible but unsynchronized checkpoint would understate
lag to the durable affected-set record. For a source, its bracket no longer
denotes the contracted durable publication.

Evidence: `adversarial03/synchronous-off/` and `adversarial03/full-control/`,
including original collector events and exact normalizer input/output.

**Proposed fix:** require independently enforced/witnessed synchronization tied
to the exact writer, SQLite/VFS implementation, database/WAL identity and commit
range before treating a visibility bracket as durable publication. Otherwise
emit visibility-only evidence and refuse durable/P3 use. A candidate-reported
configuration flag or the RO connection's default PRAGMA is insufficient.

### F3 — Medium: an impossible driver-send window passes the decision stamp check

**Location:** `lab/observer/vm_normalizer.py:187`, `:174`, `:273`.

`decision_send` checks send freshness against the whole run, but not causality
against the matched publication. `stamp_window` can return an inverted window;
the subsequent interval-disjointness test assumes ordered bounds and accepts it.

**Reproduction:** the retained `send-after-publication` fixture has a unique,
correctly identified and clock-bound driver send at **15.9 ms**, publication
`U=10.55 ms`, and SQL01 stored stamp interval **[15,16] ms**. The required decision
window is **[15.9,15.55] ms**, which has no points. Neither
`stampHigh < windowLow` nor `stampLow > windowHigh` is true, so normalization
**ACCEPTED** it and emits those inverted bounds in `stampChecks`.

Evidence: `adversarial03/send-after-publication.{raw.jsonl,normalized.json}`.
This does not substitute a candidate kind or timestamp for L; it defeats the
Q100s cross-check and the claimed send-to-commit binding.

**Proposed fix:** refuse a matched offer sent after the first-positive poll's U;
also explicitly reject inverted stamp/window intervals before testing overlap.
Apply to every grouped member and add this negative alongside valid boundary-
overlap cases. Do not widen F20's tolerances.

## Requested-check ledger

| Check | Fresh offline result | Boundary |
| --- | --- | --- |
| Observer-owned L/U, no candidate stamp origin | Formula verified; **F1** breaks file identity | `brackets()` takes last-old start / first-new end; positions copy those values |
| Post-sync visibility / G03 V2 | **F2 unresolved** | Historical V2 supports only its tested FULL profile; no live rerun |
| Pinned decision/publication kinds | Pass supplied positive/negative tests | Hardcoded `STAMP_KINDS`; publication ignores supplied `kind: decision`; **F3** remains |
| Rewritten WAL | Refused | Final differs from captured prefix: F11 |
| Reset WAL | Refused | Noncontiguous generation offsets: F11; supplied WalTail truncation negative also passes |
| Corrupt complete WAL frame | Refused | Captured/final bytes agree but frame checksum fails |
| Unknown schema | Refused | Real FD01 extra-column mutation, `schema differs from pinned fd01: frontier` |
| Checkpoint rollover | Refused | Real successful TRUNCATE plus new generation, final/captured mismatch; no repair/adoption |
| Q100q boot/offset record | Pass supplied tests | Different namespace inodes accepted; differing boot/nonzero offset refused; live process/ping evidence not collected |
| 100/249/251/400 ms plants | Pass supplied deterministic and actual-host tests | Synthetic lag truth enclosed by [delay−0.55, delay+0.55] ms; no VM precision claim |
| O-OBS authentication and copied-parser rerun | Pass supplied fixture test | Fixture/key/HMAC artifacts retained; changed parser refused; no registered NS protocol admission |

Fresh host delay brackets (`baseline02/host-delay-*.json`), in nanoseconds:

| Delay ms | Source width / measured bound | Consumer width / measured bound |
| --- | --- | --- |
| 100 | 465791 / 524291 | 399667 / 529833 |
| 249 | 494708 / 1809958 | 399625 / 1384958 |
| 251 | 557958 / 678041 | 527167 / 698000 |
| 400 | 504666 / 990583 | 409875 / 678542 |

These bounds are measured max start-to-start period plus max poll query cost,
not a claim that the requested 250 us cadence was achieved. Offline host SQLite
is 3.53.3. The actual-collector reproductions substitute only Linux identity/
noise APIs, inotify (idle fallback), bundle transport and the missing trusted
driver-send adapter. They keep SQLite polling, tailing, stable-file checks and
final capture intact, then run the exact pinned normalizer. They do not create
a sealed VM bundle or claim to exercise Linux inotify delivery. Linux rename
events are visibly only wakeups in the reviewed source.

## Execution, evidence and reproduction

All suites, adversarial runs and final hashing used `lab/bin/heavy.mjs`; host
free space was about 12 GiB before admission, above 5 GiB. No engine, Docker,
Colima, network, package installation or resident lifecycle operation was used.

- `baseline01`: Python 11/11 passed; engine tests failed before execution because
  the fresh worktree lacked ignored `runs/OBS01/`, required by `mkdtempSync` in
  `test_engine.mjs:14`. Original FAILED receipt/logs retained. Created that empty
  scratch parent only; no code fix. `baseline02`: **11 Python + 9 Node passed**.
- `adversarial01`: initial F1 reproduction. `adversarial02`: full nine-case suite.
  `adversarial03`: final suite, changing the F3 send from exactly 16 to 15.9 ms
  to demonstrate the error without depending on an interval endpoint equality.
  All attempts retain source copies and pre/post source hashes.
- Final retention verified **258 nested manifest entries** and the complete
  **265-file / 8,171,616-byte** retained set by readback. Bulky evidence stays out
  of Git. [INDEX.json](INDEX.json) and [SHA256SUMS](SHA256SUMS) describe it.

Durable root: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6/`.
Manifest SHA256: `31ee9b316e2d476aa64a6fcd669275b61609efc935724ff8281f6f50bffe2de8`.

Run from this reviewer worktree with a **new** output directory:

```sh
mkdir -p runs/OBS01
node lab/bin/heavy.mjs --label CX-VOBS6-reproduce -- \
  python3 -B lab/verify/OBS01/probe_round7.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6/reproduce-new
```

For the supplied suite, use the same heavy wrapper around
`python3 -B lab/observer/run_vm_offline.py <new-durable-directory>`.
`ACCEPTED` in the adversarial script means the parser accepted planted invalid
evidence; script exit zero means the reproduction's assertions held, not that
OBS01 passed review. The final result remains FIX-FIRST.

## Observation-to-verdict / receipt audit (preamble 9a)

Every new decision/receipt site in reviewer code is listed here. No reviewer
routine grants a semantic PASS or qualifies a P3 measurement.

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `probe_round7.fixture_case` | Executes unchanged parser; asserts actual ACCEPTED/REFUSED outcome; retains exact raw/normalized bytes or refusal text | Fresh SQLite fixtures and randomized run IDs per case | Actual fixture case hash/raw SHA framing, source copies and final attempt pins |
| `probe_round7.collector_case` | Actual fresh independent source read, mode/inode readbacks, collector completion, exact normalized positions; asserts >300 ms defect separation | New files/threads/output directory; real local monotonic observations, no earlier attempt reuse | Same actual run/source/member send, captured poll/WAL/final records, labelled offline platform adapters; no slot or VM claim |
| `probe_round7.main` / `store` / RESULT and manifest | Records assertion-backed case results and SHA256 preimages; no product PASS field | Exclusive new attempt directory, before/after source hashes and run interval | Tested code copies and exact file paths; failure preserves partial output rather than success |
| `retain_round7.main` / INDEX verdict | Rechecks three defect conditions, all five refusals, baseline logs/status, source and manifest bytes | Reads final attempt, requires `sourceUnchanged`, compares current source with final pins | Reviewed files also compared byte-for-byte to `git show c1a14ad5`; exact durable root and full file set; no live slot claimed |

The original source's grant/seal routines were executed only by its supplied
offline tests, with their fixture authentication checks; they are unchanged by
this review. The path/sync reproductions explicitly do not claim sealing or
semantic qualification.

## Changed pins, remaining work and limits

No reviewed/pinned file hash moved: `git diff c1a14ad5 -- lab/observer lab/bin
lab/acceptance` is empty. Only `lab/verify/OBS01/` is added; no contract edits,
re-pins, generated output edits, implementation fixes, main merge or push.
The report and tools are committed on the reviewer branch.

The builder correctly leaves trusted driver-send collection to future G03
integration: current round-6 collection cannot normalize new SQL01 commits
without it. That known fail-closed integration gap was not presented as a new
defect. G03 still owns fresh matched-arm overhead/ping measurements. No VM V2,
power-loss, NS workload, live clocks/cgroups, root pnpm suite or full evaluator
qualification was run or independently established here. No attempt was made to
promote the original failed/unsealed round-6 VM evidence. Open work: fix F1–F3,
repeat the offline negative suite, then independently verify the trusted driver
integration and exact VM durability/clock/overhead profile before P3 use.
