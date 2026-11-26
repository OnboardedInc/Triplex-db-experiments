# Pinned reads: the cut lookup's hardening and the writers' audit gate (DX-RD7)

Builder's page, branch `exp/DX-RD7-pinned-read-hardening`, first from `origin/exp/DX-INT1` at `2ce636613`, then merged
with `65a851d1b` (the save line's fourth pass, landed while this ran) before any gate. Conditions 1 and 2 of the
pinned-read review (`rd6/REVIEW-1.md`). Neither option's default changes here. Every time is a Mac diagnostic.

## 1. The hardened cut lookup (condition 2)

`packages/datomic/gateway/src/triplex/gateway/group_cut_guard.clj`, required last by `main.clj` (after `batch`, so after
`commit.clj` and every stored function). With `TX2_PINNED_CUT_LOOKUP=1` at load it replaces `group-cut/member-at`;
with the option off it replaces nothing, so the gateway is the base byte for byte (identities and log below).

The guard reads the position's history once (`d/datoms (d/history current) :avet position cut`, at most two datoms):

| History of the position | Answer |
| --- | --- |
| no datom | nil: no view can hold a number that was never asserted (this keeps solo-save pins off the walk) |
| exactly one datom, its assertion | the current database's answer, accepted when its transaction is at or before the view's t (the builder's rule) |
| anything else (a retraction, a second assertion) | the lookup ref on the past view, the reference (and a fallback count) |

This differs from the review's harness form in one way: the review sought the history, then sought the current index
again (two seeks); the guard takes the entity and transaction from the one history datom (one seek). It also differs
from a literal reading of "only when the history holds exactly its one assertion": a position with no history at all
answers nil instead of walking, because the walk is what the option exists to avoid and an empty history proves the
answer.

**Shown (in memory, the head's image `ce17d18e`, `rd7/clj-run.sh`):**

| Check | Without the guard | With the guard |
| --- | --- | --- |
| The review's `attack grouped` case, an interior member's position retracted (`grouped-saves-and-the-cut-lookup`; option sets `on` and `cut`) | 2 of 6 reads differ, each set | **0 of 6** |
| The same number then asserted on another entity | 2 of 6, each set | **0 of 6** |
| Every other case of the review's targeted tests, 9 writer settings (server, grouped, owner head, serial, general, index, import, hints, accounts) | as the review: equal everywhere except the short-cut's own planted break (R6-1: 2 of 2 and 1 of 12 under `on` and `short`) | the same counts, case by case; tests 8 per setting, 0 failed, 0 errors in both runs |
| `rd7/harness.clj` `guard-main`: positions 0 to 999 at 43 pins against the lookup ref on the past view; 300 transactions, 30 interior positions retracted and 30 asserted again on new entities, 400 numbers never written | 22 of 43,000 lookups differ | **0 of 43,000** (1,290 fell back to the view) |
| The review's fuzz hook (`rd6-attacks/fuzz-main`, unchanged), `TX2_PINNED_CUT_LOOKUP=1` at load so `on`, `cut` and `hard` run the guard; seed 11, 600 serial steps, 2 rounds, unsealed protection, removals, faults; server, serial, grouped, import | — | 61,865 read shapes x 4 option sets = 247,460 comparisons, **0 differences**; 514,281 short-cut answers; S5's own comparison 0 differing; the review's audit 0 violations on both scopes of every point |

The runs without the guard are the same image with `TX2_PINNED_CUT_LOOKUP` unset at load (the guard is then not
installed; the harness switches the option per read, which reaches the builder's lookup).

**Cost on the Mac toy, diagnostic only** (`cost!`, grouped setting, 40 subjects edited 40 times before the pin, 300
groups of four after it, 900 grouped positions; microseconds per lookup, 400 rounds over 50 positions):

| Lookup | Builder's | Review's hardened form | This guard | Walk on the view (option off) |
| --- | --- | --- | --- | --- |
| Interior position of a group | 0.63 | 1.24 (+0.61) | 0.71 (**+0.09**) | 0.60 |
| Solo save before the pin | 0.48 | 1.55 (+1.07) | 0.45 (**-0.02**) | 15.61 |
| Number never written | 0.59 | 0.93 (+0.34) | 0.32 (**-0.27**) | 0.34 |

Whole pinned reads through `/v1/.../read` on the same toy (ms per read): interior 0.354 off, 0.322 builder, 0.326
guard; solo 0.371, 0.243, 0.229; at the pin 0.387, 0.221, 0.275. The spread between repeats is larger than any
difference here (an earlier small toy gave the opposite order), so the toy shows no cost of the guard on a whole
read; the review measured +0.87 us per lookup for its form on its toy. Answers equal under all three in every timed
read. Not measured on storage: at 1 billion the history seek may load one history segment that the current seek does
not; the server session's A1 step is the place for it (condition 3).

## 2. The writers' audit gate (condition 1)

RESULTS_AUDIT

## 3. R6-2 and R6-4

RESULTS_DOCS

## 4. Gates

RESULTS_GATES

## 5. Not tested

RESULTS_NOT
