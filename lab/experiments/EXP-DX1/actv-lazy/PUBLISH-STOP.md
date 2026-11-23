# Why the Publish run at 100,000 stopped at `held-campaign.ts:417` (bench 4, 2026-11-23)

**The read gateway answered a probe sent after the Publish's acknowledgement at a basis before that Publish.** This
is case (a) in mechanism: the read gateway serves its own Datomic peer's latest database (`d/db`, no `d/sync`), and
nothing makes that peer have the Publish at the moment the write gateway acknowledges it. It is not a wrong answer
and not a bookkeeping fault in the runner: the probe was paired with the release it was sent after, and the failed
half is the basis position. The store makes no promise that an unpinned read on one gateway already sees a write
acknowledged on another; the runner's probe assumed one. Whether the store must make that promise is the owner's
decision. Exactness is unchanged: the check is kept, and now records its values and fails the run at the end
instead of hiding the later windows.

## 1. Which half failed, and the values

The stop is `assert(b.tx >= r.position && b.validTime === validTime)` at line 417 (build `4e64e0d97`, the same file as
INT1 `61a794c1d`), called from line 626, the first-correct probe of a Publish in the rolling 6 window at 3.5 saves/s.

- **The valid-time half cannot fail.** `LazyReader.readAt` builds `b = { tx: p, validTime: pin.validTime ?? offered }`
  (`read.ts`), and the probe passes `{ validTime }`, the constant the check compares with. So **`b.tx < r.position`**.
- **What the evidence does not hold.** The failing window's file is written only when a window finishes, and the
  assertion message carries no values, so the archive (`evidence/DX-BM1/bench4/bench4-publish100k/`) has no probe
  basis, release position, subject or probe times for the stop. The read gateway's trace is sampled (716 requests in
  27 minutes) and records no basis. Which Publish of the window (1 to 20) stopped is unknown.
- **What is known from the code at that line:** the subject is `members.at(-1)` of `samples(100000, j)`, that is
  subject `(7919 j + 47) mod 100000` for Publish j (50,000 if that equals 0, 50,000 or 99,999); the route answering is the read
  gateway's (`DATOMIC_URL` of the reader worker is `peer.read`); the probe was sent after `offer()` returned, which is
  after the write gateway's acknowledgement and two receipt reads.
- **For comparison, the barrier 6 window just before it:** in all 20 Publishes the probe's basis equalled the
  release position exactly (118,656 to 119,008), sent 2.0 to 16.0 ms after the receipt was in hand; the +1 s deadline
  reads were 3 to 4 positions past it. The read gateway was caught up within about 2 ms every time there.

**What the runner records now** (`cb282d6b2`): every failed read check writes all its values, both halves separately
(`txHalf`, `validTimeHalf`), plus subject, route, basis, release position and sequence, acknowledgement and receipt
clocks, read start and end, into `readFailures` (exactness) or `visibilityFailures` (an answer before the
acknowledged Publish) in `held-observations.json` and the window's own file. Each Publish also records the read
gateway's head right after its acknowledgement (`readHeadAfterAck`, `readHeadLagAfterAck`) and how many probe
answers came before the Publish was visible (`probesBeforePublishVisible`).

## 2. Which it is

**Not (b), from the code.** `r` is the value `offer()` returned in the same loop turn, awaited before the probe is
sent; `releases` is appended in that order; `r.position` is the write receipt's position (asserted equal to the native
acknowledgement), and `b.tx` is the reader's resolved position (`resolvePin` returns the head when no position is
pinned). Both are store positions; the `>=` compares like with like. The deadline reads use the release in force at
their own basis, so they cannot fail this half.

**(a) in mechanism, from the code.** The reader's head is `comp.currentPosition()` → `DatomicStorageAdapter`
`committedPosition` → `GET /v1/db/{db}/basis` on the read gateway → `main.clj` `basis`: `(d/db (connection ...))` and
`storage/head-position` of that db. There is no `d/sync` and no "at least this position" on that route. A Datomic peer
receives each new transaction from the transactor asynchronously; the write gateway's acknowledgement says its own
peer has it. So the read gateway's head can trail an acknowledged Publish, and when it does the probe answers at an
earlier basis. This is the only path by which `b.tx < r.position` can happen at line 626.

**Why rolling 6 and not barrier 6 is not proven.** A plausible reason: with per-save credits up to six saves are in
flight again the moment the Publish turn ends, so the read gateway's peer (one core, also serving the 64-seat pinned
reads) is applying novelty at the instant the probe arrives. Rolling 6 does not change when the Publish's own
acknowledgement is released (the Publish turn drains in-flight saves in both modes). Not measured.

**Not reproduced on the Mac.** A toy run with rolling 6 and barrier 6, 3.5 and 23.5 saves/s, six Publishes per window
(24 Publishes) at `766ff8167`: 0 probes answered before the Publish, read-gateway lag after the acknowledgement 0
positions every time, all deadline reads exact (diagnostic). The toy stack is idle compared with bench 4.

**Is it a store fault?** By the store's contract an unpinned read returns the read gateway's latest; the owner's bar
asks that one second after Publish every read returns the new release's answers, and the +1 s deadline reads test
that (all 20 matched in the window that completed). The probe asserted more than both: read-your-Publish on another
gateway at the instant of acknowledgement. If the owner wants that, the smallest store change is to give the reader's
head call an "at least" position (the publisher's acknowledged position) and have the read gateway's basis route wait
for it with the existing `storage/await-position` wait used by pinned reads; or to `d/sync` on unpinned basis calls
(one transactor round trip per read). Neither is built: both change the read path every account uses and need their
own gate and server measurement.

## 3. What changed in the runner

- **The first-correct probe** reads until its basis reaches the Publish. Each answer before that is recorded as a
  visibility failure with all its values and checked exactly against the release in force at its own basis; the
  first answer at or after the Publish is checked exactly against the Publish and gives the first-correct time.
- **A failed exactness check** (deadline read, probe, reopened pin) records its values, stops only its own window,
  and the next windows run. **At the end the run fails** if any exactness or visibility failure was recorded, after
  `held-observations.json` is written.
- **`DX_HELD_WINDOWS`** runs a subset of windows (`mode/rate/publish`, for example `rolling6/3.5/1`); ratios against
  a control that did not run are null. **`DX_ACT3_SETTLE=0`** skips the first release's settlement for the small
  release too.
- **Gates on the Mac** (diagnostic, at `9848a7a7f`): `DX_ACT3_INJECT=stale` made the first probe read at the previous
  release: one visibility failure recorded with `txHalf: false`, `validTimeHalf: true`, basis 11 against Publish 12;
  both Publishes of that window still measured; the next window ran; the run failed at the end with the values.
  `DX_ACT3_INJECT=mismatch` checked one deadline read against the wrong subject: the window recorded the failure and
  stopped, the next window ran all its Publishes, the run failed at the end with `subjectMatches: false`. The
  default campaign at `cb282d6b2` (setting unset, all eight toy windows): first settlement checked (86 changed
  values and 8 notices matched the oracle), all deadline reads exact, 0 visibility failures, read-gateway lag after
  each acknowledgement 0. Evidence (private): `evidence/DX-ACT3/load1/load-fair-{a2658ee2,5c0c3953,729d3a8a,fff51683}*.tar.gz`.

## 4. What would show this diagnosis wrong

1. A visibility failure whose `readHeadAfterAck.position` is already at or past the Publish (the read gateway had
   it, yet the reader answered earlier): a reader or route fault, not peer lag.
2. Any recorded failure with `validTimeHalf: false`.
3. A +1 s deadline read at a basis before its Publish (lag beyond the owner's one second): a bar failure.
4. Visibility failures in barrier 6 windows at the same rate as in rolling 6: the mode is not the trigger.
