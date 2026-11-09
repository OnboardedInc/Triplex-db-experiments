# CX-VOBS6 round 2 — OBS01 round 8: ACCEPT-OFFLINE

**North star:** P3 correctness: publication timing must remain attached to the
observed store, and visibility must not grant an unproven durability claim.
Goals/targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`.
Procedure: `lab/PROTOCOL.md`. Date: 2026-11-09.

**Reviewed head:** `bcbf21c48097163ea83557fc8876168983c60595` of
`exp/OBS01-observer`, read-only in the `obs01` worktree. This reviewer branch
remains based on its prior report commit `2f1d1f10`; no candidate changes were
merged or edited here. The probe imports the target's code, checks its bytes
against `git show bcbf21c4:<path>`, copies preimages, and verifies unchanged bytes
after execution. Scope is F1–F3 and the two requested variations.

**Verdict: ACCEPT-OFFLINE.** F1 and F3's tested failures are corrected. F2 is
closed by unconditional refusal of live VM durable/P3 normalization, **not by
implementing synchronization enforcement**. No new high-severity finding in
scope. This does not qualify the observer for live P3 measurements.

## Finding disposition and fresh reproductions

Locations below refer to the reviewed **bcbf21c4** source, not the older observer
files in this reviewer checkout.

| Prior finding | Disposition | Relevant reviewed locations |
| --- | --- | --- |
| F1 — High: replacement source moved L about 397 ms late | Closed in the tested offline collector paths | `lab/observer/vm_watch.py:69` FileBinding; `:165` poll connection checks; `:195` binding setup; `:227` rename/delete refusal; `lab/observer/vm_normalizer.py:200` raw identity checks |
| F2 — High: sync-disabled writer accepted as durable publication | Closed by refusal; independent enforcement remains unimplemented | `lab/observer/vm_normalizer.py:212`, especially `:216`; `lab/observer/vm_watch.py:137` forces live collector clockMode to vm |
| F3 — Medium: impossible send/inverted decision window accepted | Closed | `lab/observer/vm_normalizer.py:174` send ≤ U; `:297` ordered interval guard |

### F1: original replacement and a swap between polls

Replayed the original main/WAL/SHM replacement, independent fresh read, and
400 ms later old-handle commit. Both the fresh adapted original probe and this
reviewer's collector run now **REFUSE/F1** before the seal transport callback.
The independent connection still reads replacement LSN 1, demonstrating that
refusal is the new physical binding check, not a failed planted write.

The new collector holds descriptors for main/WAL/SHM, checks identity before and
after reads/polls, and checks opened byte-read handles. Keeping the old objects
open also prevents inode reuse while their identities are trusted. The parser
independently checks identity records across observed events. Its publication
formula remains last-negative start / first-positive end.

The requested fast variation performs actual `os.replace` calls to rename the
main aside, rename an equal-byte replacement over it, move that replacement
aside, then restore the **original inode**. The final inode and bytes therefore
match the start; no monitored query begins during the swap. In `attempt02`:

- Swap: **207,625 ns** (207.625 us).
- Surrounding measured query-start period: **10,887,542 ns** (idle fallback).
- Original inode restored before the following poll.
- Result: **REFUSED — `F1 bound database rename/delete event`**; no seal callback.

This specifically tests the event refusal needed when sampling file identities
alone could miss a temporary replacement. The recorded operation also took less
than the requested 250 us active period; its measured comparison is to the
actual idle period, not an asserted active cadence.

**Offline boundary:** macOS cannot generate Linux inotify events. The physical
rename-over is real; its MOVED_FROM/MOVED_TO records are supplied by an explicit
offline adapter through the **unchanged `Inotify.read` byte decoder** and actual
collector run-loop rejection path. Linux `/proc` identity and noise calls and
bundle transport are also adapted. This is not a live Linux delivery test or a
sealed VM bundle. Raw decoded events, collector events and query times are in
`attempt02/rename-over-fast/timing-and-events.json` and `collector-events.json`.

### F2: OFF, FULL and FULL-to-OFF after readiness

The original OFF/delayed-fsync reproduction now **REFUSES/F2** with actual
writer synchronous readback 0. The same-inode FULL fixture still accepts as
offline visibility evidence. The fresh fourteen-test suite also checks NORMAL,
missing state and the attempted live use of a FULL declaration.

For the additional requested variation, the trusted test adapter reads actual
writer WAL/FULL state **before** starting the collector, waits for its successful
initial poll/ready file, then switches that connection to OFF and commits. A
fresh independent read sees LSN 1. The case deliberately retains the earlier
FULL state, testing a stale start-only declaration rather than reporting the new
OFF value to the parser.

| Actual writer / supplied fixture state | Offline-synthetic normalization | VM-mode normalization |
| --- | --- | --- |
| OFF / current OFF state | REFUSED/F2 | REFUSED/F2 |
| FULL at start, OFF after ready / stale FULL state | ACCEPTED as offline fixture | **REFUSED/F2** |
| FULL throughout / current FULL state | ACCEPTED as offline fixture | **REFUSED/F2** |

This is an important limit, not an omitted negative: the fixture state is a
static evaluator input and does **not** detect later PRAGMA changes. The fix does
not claim that it does. The live collector fixes `clockMode='vm'`; the parser's
VM path refuses unconditionally, regardless of that state. Start-only FULL
metadata therefore cannot restore a durable/P3 grant. A future implementation
must not relax this refusal merely because a start check passed.

Evidence under `attempt02/{sync-off-actual,sync-off-after-start,full-control}/`
retains original collector records and separate, freshly hash-bound offline/VM
normalizer inputs and outcomes. The offline adapter intentionally adds the
actual trusted send and selects each evaluation mode; it is not candidate input
to a live collector. `sealTransportCalled: true` in these records refers only
to the test's **recording stub**, not a real seal. The unchanged real Bundle
invokes the parser before sealing; VM normalization here fails at F2.

### F3: original impossible window, exact boundary and grouped member

Fresh runs through the pinned parser:

| Case | Outcome |
| --- | --- |
| Original send 15.9 ms, U 10.55 ms, stored stamp interval [15,16] ms | REFUSED/F20 driver send after publication U |
| Send exactly U = 10,550,000 ns | ACCEPTED |
| Send U + 1 ns | REFUSED/F20 |
| Two-member CRC-valid commit, one member sent U + 1 ns | REFUSED/F20 |

The grouped fixture recomputes the payload/header CRC, frame length and marker
binding; its refusal is explicitly F20, not an unrelated codec failure. The
latest matched member send controls the decision window. The normalizer now
rejects send > U before interval comparison and explicitly rejects inverted
stamp/window bounds. The pinned decision/publication kind mapping is unchanged.
No tolerance was widened. Inputs and normalized positive controls are retained
as `attempt02/F3-*.raw.jsonl` and `F3-send-equals-U.normalized.json`.

## Commands, attempts and retained evidence

Everything executed through the existing heavy semaphore; free host disk was
about 12 GiB before admission (required minimum 5 GiB). No slot or engine was
taken. The target worktree was only read, with `python3 -B` preventing cache
writes there. Temporary fixtures and durable evidence use authorized paths.

`attempt01` passed all 14 supplied Python tests and refused the replacement.
The review harness then failed its fast-swap *measurement* assertion: it had
delivered the rename event immediately, so the correct refusal stopped polling
before a following poll existed to bound the swap. Its result remains
**INCOMPLETE**, unchanged. The corrected harness waits for both adjacent query
starts before delivering the queued offline event. It does not alter source
code or skip the refusal.

`attempt02` is the final source-bound run:

- **14 supplied Python tests passed**, including sealed offline fixture/O-OBS
  rerun and parser-change refusal.
- **9 adapted original reviewer probes** reached their expected outcomes: F1,
  OFF, impossible send, rewrite/reset/checksum/schema/rollover refuse; FULL
  visibility control accepts.
- **9 reviewer cases** above reached their expected outcomes, including the
  fast swap, post-start OFF and grouped future send.
- Reviewed source bytes matched bcbf21c4 before and after execution. The original
  reviewer helper remains byte-identical to `2f1d1f10`, SHA256
  `17c6f471c77ba56cb225ce6e41d55add543015d067b0bf1246b89880e27e63c1`.

The run waited for four occupied heavy slots. A later guard checked whether my
waiting wrapper could be requeued at 100 ms; it found the run already admitted
and stopped **no process**. Final retention used supported 100 ms polling. No
other holder, job, resident, semaphore limit or process was changed.

Reproduce from this reviewer worktree, with the `obs01` source still matching
bcbf21c4 and a **new** output directory:

```sh
node lab/bin/heavy.mjs --label CX-VOBS6-round8-reproduce --poll-ms 100 -- \
  python3 -B lab/verify/OBS01/probe_round8.py \
  /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6/round8/reproduce-new
```

Durable root:
`/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VOBS6/round8/`.
[round8-INDEX.json](round8-INDEX.json) and
[round8-SHA256SUMS](round8-SHA256SUMS) index **272 files / 7,862,005 bytes**.
Retention checked **266 nested manifest entries**, the complete final file set
and every read-back hash. Manifest SHA256:
`9e925d79b9811f2d7a8eaaf4e4c51879fd9e4153aaeb2a79cca72836a5be4afd`.
Raw chunks, fixture keys/databases, attempt preimages and bulky outputs remain
outside Git. The prior round-7 report/evidence/index are unchanged.

## Observation-to-verdict / receipt audit (9a)

Every new reviewer-code site that assigns an outcome, verdict or receipt:

| Site | Content | Freshness | Binding |
| --- | --- | --- | --- |
| `probe_round8.parse` / `frame_events` | Runs the unchanged pinned parser on retained bytes; records actual acceptance or refusal; caller asserts exact expected F2 branch | New case/run, current monotonic framing and actual captured observations | Exact case/raw SHA, same source/member/actual send; explicit offline versus VM evaluation; no live seal |
| `probe_round8.collect_case` | Actual writer PRAGMA/independent read, inode restoration, measured nonoverlap/period, real decoder and F1 refusal; asserts OFF/FULL outcomes | Fresh files, ready handshake, post-ready toggle, current threads/times; no earlier attempt samples | Current exact target modules, original collector polls/tails/readbacks; platform/event/transport adapters identified |
| Reused `probe_round7.fixture_case` and F3 mutators | Actual parser outcome and F20 reason, real CRC-valid grouped bytes, U/U+1 positive/negative controls | Fresh SQLite fixture and random run per case | Exact original helper hash plus reviewed round-8 test/parser modules; retained raw case frames |
| `probe_round8.main` / RESULT / manifest | Child exit/log count, adapted original probe count, all assertions, preimage and post-run hashes; drift removes the ACCEPT-OFFLINE status | Exclusive attempt directory and run interval; incomplete attempts retained | Used target files compared to git object bcbf21c4; reviewer tool/original helper hashes and copies; no slot claim |
| `retain_round8.main` / INDEX verdict | Rechecks all defect/boundary outcomes, actual OFF/start-FULL values, grouped F20, logs, manifests, complete file set and bytes | Final attempt must be ACCEPT-OFFLINE with unchanged source; current target/tool hashes rechecked | Exact reviewed commit, source copies, original helper commit, durable root; verdict limited to F1–F3 offline |

The unchanged collector/parser seal and authentication routines are exercised by
the supplied offline fixture tests only. No reviewer routine grants semantic NS
PASS, VM durability or P3 acceptance.

## Pin impact and remaining limits

This review changes no pinned source or contract file. No old/new pinned hash
movement is introduced: only new files under `lab/verify/OBS01/` are committed.
The candidate's round-8 hash movements remain its contract owner's re-pin work;
the exact reviewed hashes are in the new index. No `lab/acceptance/` edit, code
fix, target-worktree edit, main merge or push was made.

Not performed or established: live Linux inotify generation/delivery, actual VM
clock/cgroup collection, writer/VFS sync enforcement, VM durability or power-loss
qualification, matched-arm overhead, trusted G03 driver integration, NS workload
acceptance, root pnpm suite, or new Node/engine checks. The executable changes are
Python-only; the prior Node checks are historical, not counted as fresh here.

**Open before live P3 use:** independent ongoing synchronization enforcement
bound to exact writer/build/files/commit range, trusted driver-send collection,
and the required live clock/overhead/qualification evidence. Keep VM refusal
until those exist. No unresolved F1–F3 defect is reported within this offline
scope; ACCEPT-OFFLINE does not close these live prerequisites.
