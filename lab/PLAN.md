# triplex-db-2 dev-loop plan (v2)

Status: v2, 2026-11-07. Rewritten after Sam re-scoped the work around his five priorities. Scope is defined only in
`lab/SCOPE.md`; the fitness is `lab/NORTH-STAR.md`; measurements, requirements and the 20 real-world golden scenarios are in
`lab/TARGETS.md`. This plan says how the loop gets there. Earlier versions (v0 to v1.2) are in git history; their goals and
performance targets are superseded and must not be used.

## 1. Mission and done condition

**Mission.** Tune a Triplex fact store for Sam's five priorities on two lanes, with Triplex as the TypeScript interface used
almost like an ORM and raw native queries that still make sense:

| Surface | Engine (pinned) | Native language |
| --- | --- | --- |
| X-XTQL | XTDB 2.2.0, image digest `a6a42650...` | XTQL (primary) |
| X-SQL | XTDB 2.2.0, same foundation | XTDB SQL (named alternative) |
| Q-SPARQL | QLever 0.6.0, image digest `37d5ede1...`, with its log of record when it is the source of truth | SPARQL |

**The five priorities (fixed, in order):**

1. **P1** Many concurrent reads, each pinned to an exact point in time, that never block writers.
2. **P2** Small, atomic, idempotent commits per subject, with low latency, because a person is waiting on the next step.
3. **P3** An ordered, resumable change feed, so the runtime knows which subjects to re-run.
4. **P4** A fast path to current values, kept separate from history.
5. **P5** Release activation: re-evaluating up to 100k subjects without hurting live traffic.

**Done condition.** The goal is complete when one identified integrated profile (source tree, build manifest, engine images
and configuration, projection-spec and log-format versions, and the chosen engine for each layer) meets all of:

1. **Ten-goal backbone:** every obligation in `lab/acceptance/obligations.json` for the ten goals and the ORM and raw-query
   requirement is closed by fresh receipts on each surface, with optional capabilities enabled where claimed.
2. **Requirements:** each of Sam's must-haves, as corrected (`lab/TARGETS.md` section 3), is met natively or through a
   documented workaround with its own passing tests; a gap with neither stays open.
3. **North star:** P1 to P5 meet their bars (`lab/TARGETS.md` section 1) at year-one scale on the fixed writer trace,
   measured per surface for the read priorities (P1, P4, P5).
4. **Golden scenarios:** all 20 real-world golden scenarios (`lab/TARGETS.md` section 6) pass: every expected answer matches
   the independent oracle and every scenario's load bars hold.
5. **Fresh final acceptance:** nothing carries into the final run of the selected profile.

An engine limit is not completion. When an engine cannot do something natively, the lane documents it and builds a
workaround; when a goal still needs it, the engine-repair track opens (we hold both engines' pinned source).

## 2. Numbers: no silent precision loss (Sam's corrected rule)

The old "exact int64 and decimal" requirement is replaced (verbatim source: `lab/research/SAM-pasted-numbers-2026-11-07.md`):

1. Exact storage and round trip for every value kind the world definition uses.
2. Order-preserving comparison for any attribute used in a range rule.
3. A hard error, never silent conversion, for any value the engine cannot hold.
4. A range of at least 2^53 for integers.
5. Arithmetic over many rows only where a projection needs it.

Consequences for the design:

- **Arithmetic happens in the TypeScript kernel,** per subject, exactly (BigInt or a decimal library), after reading. The engine
  only stores exactly, tests equality and sorts correctly.
- **Money and decimals** are stored as scaled integers (cents) or as decimal strings with an order-preserving encoding (the QLever
  lane's lexical strings and fixed-width hex order keys already do this). Floats are never used for business values; they are
  allowed only for approximate values and must be deterministic.
- **Error, don't convert:** the Triplex write path rejects a value an engine cannot hold before writing it (for example QLever
  integers outside ±2^59, which UPDATE would otherwise wrap silently).
- **Engine-side sums over many rows** (the XTDB split-sum or DECIMAL cast, QLever's two 32-bit channels) are only needed where a
  projection needs them; they are not a general requirement.

## 3. Architecture hypothesis: layers, both engines candidates for each

```
                        commands (one subject each)
                                  |
                                  v
                 +-----------------------------------+
                 |  SOURCE OF TRUTH (append-only)     |   XTDB native tx log, or
                 |  per-subject CAS, receipts, claims,|   QLever + log of record (C2-C4)
                 |  outbox and work items             |
                 +-----------------+-----------------+
                                   | change feed: (tx, entity, attribute, valid-time range)
            +----------------------+----------------------+
            v                      v                      v
   +----------------+     +----------------+     +------------------+
   | CURRENT INDEX  |     | HISTORY INDEX  |     | ANALYTICAL COPY  |
   | P1, P4; sync   |     | past bases,    |     | P5 sweeps, plan  |
   | on the hot path|     | explain, audit |     | impact           |
   +----------------+     +----------------+     +------------------+
       each read layer: XTDB tables or QLever graphs, picked by measurement
```

1. **Compositions are chosen per layer, not as bundles:** a composition names four assignments (source of truth, current, history,
   analytics), and layers are swapped one at a time under matched workloads before the two or three best compositions are validated
   end to end (TARGETS 4.1, RULINGS Q28). All-XTDB and all-QLever are the two A0 reference points.
2. **Read-your-own-write is immediate (P2):** the current index used by the reconcile pull is maintained synchronously with the
   commit (same engine transaction, or published before the ACK), or the pull reads the source of truth at the returned tx.
3. **The ledger stays the exact record** in whichever engine is the source of truth; read layers are derived and rebuildable from
   the change feed.

### 3.1 Lane X (XTDB) design starting points

1. **Current index:** one table per EntityType, `_id` = the Triplex entity id string (raw queries stay sensible), `ns$attr`
   columns with one declared type each, native valid time. Index tables are opt-in per attribute (unique values, paged reverse
   references, range buckets) because only `_id` is indexed and bloom pruning covers equality only after compaction (R7).
2. **Ledger:** entity-clustered UUID `_id`s so one subject's history reads together (R7).
3. **Pinned reads:** native `FOR VALID_TIME AS OF` and snapshot tokens; recorded cuts map to engine system time only at physical
   commit boundaries with no explicit recorded time (H-X-CUT); everything else takes the exact ledger path.
4. **Commits:** small parameterised statements in one transaction with `ASSERT` for CAS; the bulk lane uses raw-wire COPY
   (73k to 247k rows/s, R7).
5. **Engine hazards to route around (R14, R10, R12):** `SUM` over BIGINT wraps (cast to DECIMAL(32,0) where a projection needs a
   sum); correlated `NOT EXISTS`/`EXISTS`/`IN` drop rows when an inner predicate is unknown (#6313: write `(p) IS TRUE`); mark joins
   over 100k build rows answer false (#6345: raise the spill threshold or rewrite as UNION); join pushdown under LIMIT or a window
   (#6151); `col = ANY($1) AND p` misparses (use `IN (SELECT x FROM UNNEST($1) AS u(x))`); NULL-key joins, INTERSECT/EXCEPT and
   DISTINCT over lists with NULL (#6339 to #6341); `union-all` cannot be planned; window functions fail. The capability matrix
   records each, and native helpers reject or rewrite the shapes.

### 3.2 Lane Q (QLever) design starting points

1. **As source of truth:** the log of record and broker on the macOS host (contracts C2 to C4), because QLever has no rollback and
   does not fsync its delta (R8, R13).
2. **As a read layer:** a current graph of plain typed triples plus a compact ledger graph with IRI ids (R10), maintained from the
   change feed by a single fenced writer.
3. **Numbers:** exact lexical channels and order keys (R5); values outside the engine's exact range are rejected at write time
   (section 2); per-subject arithmetic in the kernel.
4. **Engine flags (R8):** `-j 4 -m 3G -c 512M -e 128M -s 10s`, `query-planning-budget=1`; rebuild at 750k to 1M delta;
   backpressure at 2M; 50k-triple groups; update templates use only literal terms (upstream #3172).

## 4. Correctness contracts

These hold on every composition. Where a contract's safety rests on unproven engine behavior, a falsifier must pass first, and
a failed falsifier blocks dependent work.

- **C1 read-layer eligibility.** A derived read layer serves a read only when, for the whole query: the scope matches the
  engine's ownership record; its mapping generation equals the release the reader requires; recorded time is absent (explicit
  recorded time takes the exact path, because recorded timestamps are not monotonic in commit order); the position is one the
  layer holds exactly (latest publication, or for XTDB a physical commit boundary); the valid instant is one it holds exactly
  (QLever: inside the publication's window and not maintaining); and no partial, stale or conflicted entity touches a referenced
  attribute. Otherwise the whole query takes the exact path in the same native language.
- **C2 QLever commit protocol (when QLever is the source of truth).** The host broker fsyncs one framed, pure-quad-delta log frame
  per commit group (`F_FULLFSYNC`): that is the irrevocable decision. Group members are validated against a staged prefix. One
  guarded update operation applies the group (marker `(epoch, position)` in the WHERE clause, change counts checked). QLever's
  snapshot swap is publication; the ACK follows publication; verification is post-publication; uncertainty fences the lane;
  re-send is the first repair; a retry returns success only after publication (`CommitPending` or `Repairing` before that).
  Checkpoints are folded from the log; rebuilds use crash-safe generation selection.
- **C3 one mutator per QLever store.** The broker (or, for a read layer, the feed maintainer) holds a host kernel lock, writes an
  `EPOCH_BEGIN` frame, guards every update with the marker, and treats the access token as visible.
- **C4 publication and maintenance (QLever).** The marker records `(P, validInstant, nextBoundary, state)`; boundary maintenance runs
  in bounded chunks computed at apply time; repository and qualified raw reads refuse or take the exact path while `MAINTAINING`.
- **C5 conflicts.** Equal duplicates are one value with several supports; a conflict is a card-one attribute with two or more
  distinct live values; repository reads fail with `ConflictingValuesError`; the raw convenience shape is documented as not
  equivalent; the canonical conflict-aware relation is `values(attribute)`.
- **C6 journal.** The logical journal stays queryable as documented; physical slimming only with synthesized, byte-identical facts.
- **C7 scope and tenant isolation.** One scope per engine in production with an enforced ownership record; shared engines use
  scope-qualified storage and collision tests. Tenant isolation at the storage layer is a requirement.
- **C8 reads never mutate.** Every read API, including recursion, the Datalog `rules` path and maintained queries, is read-only;
  recursion uses the shared frontier loop with budgets, then engine-native fast paths that must match it (R10).

## 5. The 20 real-world golden scenarios

On top of the normal performance tests (the NS gate in section 6.4), the loop maintains 20 golden scenarios that put the system
under the load Onboarded expects. They are specified in `lab/TARGETS.md` section 6 and built by EXP-W01.

1. **Golden means independent expected answers.** Every scenario is a seeded, deterministic command stream plus reads at named
   bases. Expected answers come from the independent oracle O-REPLAY, never from a system under test.
2. **Each scenario runs under load.** It runs with the fixed writer trace and its own concurrent readers at the profile it declares
   (most at year-one scale), and records correctness verdicts and P1 to P5 measurements in one receipt.
3. **Each scenario names the priorities it stresses** and the bars it must meet; a scenario fails on any wrong answer, any lost or
   duplicated commit, any feed gap, or any missed bar.
4. **They run on every composition** being compared, so they drive the per-layer engine choice, and the final acceptance reruns all 20
   fresh.

## 6. The evolutionary loop

### 6.1 One generation

1. **Reread `lab/NORTH-STAR.md`, `lab/SCOPE.md`, `lab/STATE.md`, `lab/SCORECARD.md` and the notebook tail.**
2. **Select by priority order:** the highest-priority unmet objective (P1 first, then P2, and so on) with a feasible experiment goes first (corrected after the Codex plan-v2 review, finding 12); correctness
   obligations it depends on are pulled forward. Keep two or three rival hypotheses per bottleneck; at most two unintegrated
   branches per lane; an obligation with no progress for two generations escalates.
3. **Brief and dispatch** with the template in 6.3.
4. **Build and run** in the agent's own worktree on `exp/<id>-<slug>`, gates through `lab/bin`.
5. **Verify** on the integrated candidate by an agent that did not write it.
6. **Promote** only when correctness invariants hold and the north-star measurements and golden scenarios improve or hold against
   frozen controls, with cumulative cost inside the frozen budgets.
7. **Next generation:** mutate winners, retire hypotheses that failed twice for the same reason. A failed falsifier blocks its
   dependents.

**Hourly learnings pass** (session cron `ae766d26`, hourly at :07): reread the north star, update the notebook from finished work,
check every running experiment still serves a priority, and launch Sonnet research where the learnings raise a question.

### 6.2 Agent roles

| Role | Model and effort | Job |
| --- | --- | --- |
| Research | Sonnet, xhigh | go wide on the web and in pinned source, probe engines, write `lab/research/*.md` |
| Coding | Opus, high | one experiment per agent from a commander's-intent brief |
| Verifier | Opus, high | rerun gates on the integrated candidate, try to break the claim |
| Adversarial review | Codex `gpt-6.1-sol`, xhigh | plans, contracts, gate or oracle changes, major promotions |

### 6.3 Brief template

1. **North star:** the priority (P1 to P5) this moves and the measurement that will show it, or the correctness reason.
2. **Scope:** cite `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`; inherited homebase files are for code facts only.
3. **Commander's intent:** the end state, why it matters, what success lets the next generation do.
4. **Point of view:** the technique to pursue and why, the rejected alternatives with reasons, what not to do.
5. **Boundaries:** files and packages in scope, branch, engine slot.
6. **Gates:** the `lab/bin` commands that define done and the receipts to produce.
7. **Report:** result class, evidence, surprises, the reasoning kept in code comments.

### 6.4 Gates, receipts and evidence

| Gate | What it runs | Needs engine |
| --- | --- | --- |
| G0 | typecheck and pure unit tests | no |
| G1 | unchanged44 shared conformance, current and reopen | yes |
| G2 | native142 (71 tasks); XTQL and SQL counted separately, every substep | yes |
| G3 | entity suite: repository and raw queries against the independent oracle, plus mutation controls | yes |
| G4 | semantic counterexamples with original expected answers | yes |
| G5 | write semantics: duplicates, CAS conflicts, unknown outcomes, crash and reopen, C2 crash matrix | yes |
| NS | north-star benchmark: P1 to P5 on the fixed writer trace (`lab/TARGETS.md` sections 1 and 2) | yes, scale window for large rungs |
| GS | the 20 golden scenarios (`lab/TARGETS.md` section 6) | yes, scale window |

Receipts bind what executed (source including uncommitted and untracked inputs, lockfile, toolchain, imported `dist` hashes, gate
and oracle hashes, spec and log versions, fixture contents, raw-result hashes, endpoint, engine image and configuration, counts,
first failures, timings, co-runners, resource peaks). Gates fail closed on skips, zero cases, missing identities or wrong endpoints.
Bytes of executed inputs and raw outcomes are retained under `runs/objects/`. Gate and oracle changes need verifier review, and
Codex review when they change what an obligation accepts. Whether an obligation is closed is decided by `lab/acceptance/`.

### 6.5 Budgets and comparisons

Hard correctness invariants are binary. Performance budgets are frozen before candidates; a hypothesis's predicted cost never sets
its own allowance; each promotion compares the integrated candidate's cumulative cost against frozen controls at the same rung;
comparisons are matched (same slot configuration, fixture, co-runners, three runs, conservative separation).

### 6.6 Notebook and code comments

`lab/NOTEBOOK.md` is append-only. Code comments carry the reasoning:
`// [EXP-NNN] Why: ... Inspired by: <ref@sha path:line> ... Rejected: <alt> (EXP-MMM: <reason>).`

## 7. Resources

| Resource | Envelope | Rule |
| --- | --- | --- |
| Docker VM | colima profile `triplex2`: 6 CPU, 12 GiB, 60 GiB disk | always `DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock`; after any colima command run `docker context use colima` |
| Reservation pool | 11 GiB, one atomic ledger (`lab/bin/engine.mjs`) | residents, slots and research probes all count; release after proven cleanup |
| Residents | `tx2-xtdb-dev`, `tx2-qlever-dev` | correctness work through disjoint scopes |
| Heavy slots | `s1` to `s3` | performance, destructive and crash tests; a scale window stops residents |
| Disk | VM 60 GiB, stop new heavy runs at 50 GiB used | XTDB pre-GC peaks about 6x live data (R7); QLever rebuild overlap about 2x index |
| Host processes | the QLever broker and log run on the macOS host (R13) | log fsync is `F_FULLFSYNC` |
| Agents | at most 10 concurrent; at most 4 heavy local commands | research probes take the smallest cap that fits, default 1.5 GiB, with a time box |

## 8. Generation 2 (north-star order; reordered after the Codex plan-v2 review, finding 12)

Measurement semantics are frozen before effort goes into broad machinery, and layers are compared one at a time at small rungs
before any composition is scaled. Both engines stay eligible for every layer throughout.

| Order | Id | Experiment | Priority |
| --- | --- | --- | --- |
| 1 | EXP-N01 + A01 0.3.2 | freeze measurement semantics: TARGETS 1.1 and 2.1 in the driver (open-loop schedule, hot set, requested-basis capture, per-band P2, P3 definitions, P4 buckets, real P5 sweep) and in contract 0.3.2 | P1 to P5 measurement |
| 2 | EXP-P2X, EXP-P2Q, EXP-CF01 (tiny) | per-subject commit (CAS on the subject's last position, duplicates, lost ACK) and the change feed (durable checkpoint, three crash points) on both sources at the 10k rung, plus a kill-and-restart fault control | P2, P3 |
| 3 | EXP-N02 | A0 measurements of both sources on P1 to P3 at 10k and 100k; re-freeze budgets | P1 to P3 baseline |
| 4 | EXP-D01 | world definition W0: the TypeScript reference kernel and the independent O-DOMAIN oracle | P5, P3 dependency rules, GS expectations |
| 5 | EXP-X04, EXP-Q05 | current index per engine fed from the same feed, synchronous with the ACK, swapped one at a time at small rungs; then the history layer | P4, P1, P2 |
| 6 | EXP-W01 (broad), EXP-S5 | the full golden suite on the two or three best compositions; the release sweep at a pinned basis with live traffic; then scaling to 1m and 10m | all five; P5 |
| always | correctness floor | XTQL parity (EXP-X02), oracle conformance (EXP-O02) and acceptance, entity core (R01/R02), H-X-CUT (F01), wire exactness (F02), decimal kind under Q22, erasure under Q24, tenant isolation, outbox path | ten goals and requirements |

EXP-W01 (already running) is narrowed to: all 20 scenario specs including TARGETS 6.1's added failure combinations, the runner seam
against the composition interface, an O-DOMAIN seam, and the first 8 scenarios end to end at the 10k rung. No scaling until order 6.

## 9. Resume protocol

After any context compaction, read `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/STATE.md`, `lab/SCORECARD.md` and the
notebook tail before acting.

## Changelog

- v0 to v1.2, 2026-11-07: plan built, three rounds of Codex review, research R1 to R13 (see git history and the notebook).
- v2, 2026-11-07: Sam's re-scope. The fitness is his five priorities (`lab/NORTH-STAR.md`), measured as in `lab/TARGETS.md`; the old
  load bar, the 10m/100m performance target and the 256/512/1024 load acceptance are removed; must-haves become requirements on the
  ten goals, not knockout gates; both engines are candidates for every layer, including source of truth; impossibilities get
  documented workarounds; "exact int64 and decimal" is replaced by Sam's corrected numeric rule (no silent precision loss); 20
  real-world golden scenarios join the done condition. Contracts C1 to C8 keep their substance; R14's XTDB hazards are listed in 3.1.
- 2026-11-07: v2.1 after the Codex plan-v2 review (14 findings accepted): selection picks the highest-priority unmet objective; generation 2 reordered (section 8); composition identity and layer swaps (TARGETS 4.1); W0 and O-DOMAIN; erasure semantics.
