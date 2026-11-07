# G6-ORACLE-DESIGN-001 — frozen hand specifications

**Conversation-only SOURCE/MATH proposal. All empirical stages UNRUN.** No fixtures were materialized, calls executed, implementation inspected, files written or external saves made. The earlier 17-document packaging audit remains **BLOCKED / NOT ACCEPTED**.

## 1. Basis and notation

Sole normative basis: the coordinator-supplied excerpt attributed to:

- Contract: `db2d182507939aeb1444eb00673c2c93cc20d3dbafd35c93454b9817856e5e82`
- Required clarification: `01ac203ff162fd172a2e25073a62a58e91f3839735da33217f78bdbe593c875f`

These identities were supplied, not independently re-read or recomputed here. No implementation/header/review is an oracle.

Let:

- `M = 2^64−1`.
- `c` be a positive Word, `c ≤ M−16`, satisfying the **adequate pre-existing carrier/charge-map premise** for these examples. No particular small baseline or real bookkeeping footprint is asserted.
- `E(q) = Exact(q)`.
- `Over = OverU64`, representing a proved nonnegative mathematical bound `M+1`, not an unknown or wrapped Word.
- `BoolTrue` mean an exact Boolean, **not** Word `1`.
- `∅` mean an absent output field.

Each trace starts with its **own never-initialized carrier**, adequate binding premises and no shared state.

### Full snapshots

Each trace declares immutable identity:

`Jt = (K, B, W, C, S)`.

Every displayed vector is:

`V = (mode, P, H, L, Q, np, nh, A, I, identity_exhausted)`.

**The complete expected snapshot in every trace row is exactly `Jt` concatenated with that row’s fully displayed `V`.** No mutable field is omitted.

### Slots and receipts

Stored-slot shorthand:

- `F = (FREE, id=0, charge=0)`
- `p(j,q) = (PENDING, id=j, charge=q)`
- `h(j,q) = (HELD, id=j, charge=q)`

Slot lists are in index order. These are mathematical stored-state expectations, **not observations emitted by ordinary calls**.

Receipt notation:

- `AC` = `accepted_changed`, code `none`
- `AU` = `accepted_unchanged`, code `none`
- `R/code` = `refused`, with the displayed non-none code

`Out = (token, issued_id, observed_slot)` specifies **all three presence decisions**. An observed record is labelled with its queried slot index; no wire representation is prescribed.

All trace rows have a logical receipt and a **present initialized snapshot**, including refusals. All cleanup calls assume genuine owner/borrow-end acknowledgments; they are not physical-allocation/destruction evidence.

---

## 2. Eight fresh-carrier traces

### T1 — pending, fulfil, phase replay and stale cleanup

`J1 = (1, c+8, 8, c, 1)`

Token values:

- `a = (1,0,1,PENDING)`
- `b = (1,0,1,HELD)`

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(1,c+8,8,c,1)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(3),E(2),0)` | AC | `(OPEN,3,0,c+3,c+3,1,0,2,1,false)` | `[p(1,3)]` | `(a,1,∅)` |
| 3 | `fulfil(a)` | AC | `(OPEN,0,3,c+3,c+3,0,1,2,1,false)` | `[h(1,3)]` | `(b,∅,∅)` |
| 4 | `fulfil(a)` | R/wrong_phase | `(OPEN,0,3,c+3,c+3,0,1,2,1,false)` | `[h(1,3)]` | `(∅,∅,∅)` |
| 5 | `fulfil(b)` | R/wrong_phase | `(OPEN,0,3,c+3,c+3,0,1,2,1,false)` | `[h(1,3)]` | `(∅,∅,∅)` |
| 6 | `release(b)` | AC | `(OPEN,0,0,c,c+3,0,0,2,1,false)` | `[F]` | `(∅,∅,∅)` |
| 7 | `release(b)` | R/stale_token | `(OPEN,0,0,c,c+3,0,0,2,1,false)` | `[F]` | `(∅,∅,∅)` |
| 8 | `close()` | AC | `(CLOSED,0,0,c,c+3,0,0,2,1,false)` | `[F]` | `(∅,∅,∅)` |

**Why:** row 4 has an obsolete phase; row 5 has the current phase but the wrong operation phase. After release, FREE makes row 7 stale. Fulfil issues no new ID; release preserves peak/work/issue.

### T2 — combined limits, OverU64 and rejection atomicity

`J2 = (2, c+8, 3, c, 2)`

- `a = (2,0,1,PENDING)`
- `b = (2,1,2,PENDING)`

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(2,c+8,3,c,2)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F,F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(6),E(2),0)` | AC | `(OPEN,6,0,c+6,c+6,1,0,2,1,false)` | `[p(1,6),F]` | `(a,1,∅)` |
| 3 | `reserve(1,E(3),E(2),1)` | R/byte_limit | `(OPEN,6,0,c+6,c+6,1,0,2,1,false)` | `[p(1,6),F]` | `(∅,∅,∅)` |
| 4 | `reserve(1,E(2),Over,1)` | R/work_limit | `(OPEN,6,0,c+6,c+6,1,0,2,1,false)` | `[p(1,6),F]` | `(∅,∅,∅)` |
| 5 | `reserve(1,Over,E(0),1)` | R/byte_limit | `(OPEN,6,0,c+6,c+6,1,0,2,1,false)` | `[p(1,6),F]` | `(∅,∅,∅)` |
| 6 | `reserve(1,E(2),E(1),1)` | AC | `(OPEN,8,0,c+8,c+8,2,0,3,2,false)` | `[p(1,6),p(2,2)]` | `(b,2,∅)` |
| 7 | `reserve(0,E(0),E(0),2)` | R/slot_occupied | `(OPEN,8,0,c+8,c+8,2,0,3,2,false)` | `[p(1,6),p(2,2)]` | `(∅,∅,∅)` |
| 8 | `observe_slot(1)` | AU | `(OPEN,8,0,c+8,c+8,2,0,3,2,false)` | `[p(1,6),p(2,2)]` | `(∅,∅,slot 1: p(2,2))` |

**Why:** row 3 exceeds both remaining byte `2` and work `1`; byte refusal wins. Row 4 fits bytes but cannot provisionally increase `P/L/Q` before its work refusal. Row 6 reaches both caps exactly and receives ID `2`, not an ID consumed by refusals. Owners remain outstanding at this trace’s end.

### T3 — zero-byte owners still block close

`J3 = (3, c+8, 0, c, 1)`

- `a = (3,0,1,PENDING)`
- `b = (3,0,1,HELD)`

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(3,c+8,0,c,1)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(0),E(0),0)` | AC | `(OPEN,0,0,c,c,1,0,0,1,false)` | `[p(1,0)]` | `(a,1,∅)` |
| 3 | `close()` | R/owners_outstanding | `(OPEN,0,0,c,c,1,0,0,1,false)` | `[p(1,0)]` | `(∅,∅,∅)` |
| 4 | `fulfil(a)` | AC | `(OPEN,0,0,c,c,0,1,0,1,false)` | `[h(1,0)]` | `(b,∅,∅)` |
| 5 | `close()` | R/owners_outstanding | `(OPEN,0,0,c,c,0,1,0,1,false)` | `[h(1,0)]` | `(∅,∅,∅)` |
| 6 | `release(b)` | AC | `(OPEN,0,0,c,c,0,0,0,1,false)` | `[F]` | `(∅,∅,∅)` |
| 7 | `close()` | AC | `(CLOSED,0,0,c,c,0,0,0,1,false)` | `[F]` | `(∅,∅,∅)` |
| 8 | `observe_slot(0)` | AU | `(CLOSED,0,0,c,c,0,0,0,1,false)` | `[F]` | `(∅,∅,slot 0: F)` |

**Why:** owner counts, not byte sums, govern close. Removing a zero-byte owner is nevertheless a changed transition. CLOSED observation is allowed; baseline `L=c` is retained.

### T4 — transfer, issuance stamp and slot-reuse replay

`J4 = (4, c+8, 5, c, 1)`

- `a = (4,0,1,PENDING)`
- `b = (4,0,1,HELD)`
- `d = (4,0,2,HELD)`
- `r = (4,0,3,PENDING)`

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(4,c+8,5,c,1)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(4),E(1),0)` | AC | `(OPEN,4,0,c+4,c+4,1,0,1,1,false)` | `[p(1,4)]` | `(a,1,∅)` |
| 3 | `fulfil(a)` | AC | `(OPEN,0,4,c+4,c+4,0,1,1,1,false)` | `[h(1,4)]` | `(b,∅,∅)` |
| 4 | `transfer(b,1)` | AC | `(OPEN,0,4,c+4,c+4,0,1,1,2,false)` | `[h(2,4)]` | `(d,2,∅)` |
| 5 | `release(b)` | R/stale_token | `(OPEN,0,4,c+4,c+4,0,1,1,2,false)` | `[h(2,4)]` | `(∅,∅,∅)` |
| 6 | `release(d)` | AC | `(OPEN,0,0,c,c+4,0,0,1,2,false)` | `[F]` | `(∅,∅,∅)` |
| 7 | `reserve(0,E(1),E(0),2)` | AC | `(OPEN,1,0,c+1,c+4,1,0,1,3,false)` | `[p(3,1)]` | `(r,3,∅)` |
| 8 | `abandon(a)` | R/stale_token | `(OPEN,1,0,c+1,c+4,1,0,1,3,false)` | `[p(3,1)]` | `(∅,∅,∅)` |

**Why:** fulfil changes state but not the issuance revision, so stamp `1` remains correct for transfer. Transfer changes identity without changing charge/counts/work. After reuse, old pending token `a` is stale even though the replacement is also PENDING. This is not payload replacement/reallocation.

### T5 — DRAINING pending cleanup, including zero charge

`J5 = (5, c+8, 4, c, 2)`

- `a = (5,0,1,PENDING)`
- `z = (5,1,2,PENDING)`

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(5,c+8,4,c,2)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F,F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(2),E(1),0)` | AC | `(OPEN,2,0,c+2,c+2,1,0,1,1,false)` | `[p(1,2),F]` | `(a,1,∅)` |
| 3 | `reserve(1,E(0),E(1),1)` | AC | `(OPEN,2,0,c+2,c+2,2,0,2,2,false)` | `[p(1,2),p(2,0)]` | `(z,2,∅)` |
| 4 | `abort_admission()` | AC | `(DRAINING,2,0,c+2,c+2,2,0,2,2,false)` | `[p(1,2),p(2,0)]` | `(∅,∅,∅)` |
| 5 | `fulfil(a)` | R/core_draining | `(DRAINING,2,0,c+2,c+2,2,0,2,2,false)` | `[p(1,2),p(2,0)]` | `(∅,∅,∅)` |
| 6 | `abandon(a)` | AC | `(DRAINING,0,0,c,c+2,1,0,2,2,false)` | `[F,p(2,0)]` | `(∅,∅,∅)` |
| 7 | `abandon(z)` | AC | `(DRAINING,0,0,c,c+2,0,0,2,2,false)` | `[F,F]` | `(∅,∅,∅)` |
| 8 | `close()` | AC | `(CLOSED,0,0,c,c+2,0,0,2,2,false)` | `[F,F]` | `(∅,∅,∅)` |

**Why:** abort neither cleans owners nor refunds work. DRAINING blocks fulfil but permits genuine pending cleanup. Closing retains peak, admitted work, issue and baseline.

### T6 — token/domain/foreign/slot precedence

`J6 = (6, c+8, 3, c, 1)`

`a = (6,0,1,PENDING)`. Foreign key `99` is a valid nonzero Word.

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(6,c+8,3,c,1)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 2 | `reserve(0,E(1),E(1),0)` | AC | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(a,1,∅)` |
| 3 | `fulfil((99,1,1,PENDING))` | R/foreign_token | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,∅)` |
| 4 | `fulfil((6,1,1,PENDING))` | R/invalid_slot | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,∅)` |
| 5 | `transfer((99,0,0,HELD),BoolTrue)` | R/invalid_token | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,∅)` |
| 6 | `transfer((99,0,1,HELD),BoolTrue)` | R/invalid_argument | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,∅)` |
| 7 | `reserve(1,E(0),E(0),1)` | R/invalid_slot | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,∅)` |
| 8 | `observe_slot(0)` | AU | `(OPEN,1,0,c+1,c+1,1,0,1,1,false)` | `[p(1,1)]` | `(∅,∅,slot 0: p(1,1))` |

**Why:** row 3’s foreign key wins over its domain-valid but out-of-carrier slot. Row 5’s malformed token issue `0` wins before malformed second argument; row 6’s well-formed token leaves the Boolean stamp as the domain error, before foreign-token semantics.

### T7 — full Word work admission, cap equality and OverU64

`J7 = (7, c+8, M, c, 2)`

`a = (7,0,2,PENDING)`.

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(7,c+8,M,c,2)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F,F]` | `(∅,∅,∅)` |
| 2 | `charge_work(E(M),0)` | AC | `(OPEN,0,0,c,c,0,0,M,1,false)` | `[F,F]` | `(∅,1,∅)` |
| 3 | `charge_work(Over,1)` | R/work_limit | `(OPEN,0,0,c,c,0,0,M,1,false)` | `[F,F]` | `(∅,∅,∅)` |
| 4 | `charge_work(E(1),0)` | R/issue_mismatch | `(OPEN,0,0,c,c,0,0,M,1,false)` | `[F,F]` | `(∅,∅,∅)` |
| 5 | `charge_work(E(1),1)` | R/work_limit | `(OPEN,0,0,c,c,0,0,M,1,false)` | `[F,F]` | `(∅,∅,∅)` |
| 6 | `reserve(0,E(8),E(0),1)` | AC | `(OPEN,8,0,c+8,c+8,1,0,M,2,false)` | `[p(2,8),F]` | `(a,2,∅)` |
| 7 | `reserve(1,Over,Over,2)` | R/byte_limit | `(OPEN,8,0,c+8,c+8,1,0,M,2,false)` | `[p(2,8),F]` | `(∅,∅,∅)` |
| 8 | `observe()` | AU | `(OPEN,8,0,c+8,c+8,1,0,M,2,false)` | `[p(2,8),F]` | `(∅,∅,∅)` |

**Why:** admitted work `M` requires only one issuance, not `M` performed operations. Row 4’s valid stale stamp wins before the work limit. Row 6 can admit zero additional work at the exhausted work cap and reach byte equality. Ordinary observe emits no slot record.

### T8 — mode precedence, zero work and CLOSED lifecycle

`J8 = (8, c+8, 2, c, 1)`.

| # | Logical call | Receipt | V | Stored slots | Out |
|---|---|---|---|---|---|
| 1 | `initialize(8,c+8,2,c,1)` | AC | `(OPEN,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 2 | `abort_admission()` | AC | `(DRAINING,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 3 | `abort_admission()` | AU | `(DRAINING,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 4 | `charge_work(E(0),0)` | R/invalid_argument | `(DRAINING,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 5 | `close()` | AC | `(CLOSED,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 6 | `reserve(0,E(0),E(0),0)` | R/core_closed | `(CLOSED,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 7 | `initialize(8,c+8,2,c,1)` | R/carrier_in_use | `(CLOSED,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |
| 8 | `close()` | AU | `(CLOSED,0,0,c,c,0,0,0,0,false)` | `[F]` | `(∅,∅,∅)` |

**Why:** Exact-zero work is a domain error even in DRAINING. CLOSED does not permit reinitialization. Repeated close is unchanged, not fake zero-state initialization.

---

## 3. Four independent binding/error-prefix decisions

These are **single-decision specifications**, separate from the eight traces. Pre-existing state is an explicit premise, not another hidden proposed call.

For never-initialized carriers, no initialized snapshot or initialized FREE-slot state is fabricated. Existing carrier/backing contents remain untouched and otherwise unspecified.

| ID | Premise and five logical arguments, in order | Expected outcome and complete presence/state expectation |
|---|---|---|
| B1 | Never initialized; bad backing. `initialize(9,c+8,2,c,BoolTrue)` | **Logical receipt:** `refused / invalid_argument`. **Snapshot absent.** Token/issued ID/observed slot all absent. Remains never initialized; no ledger/slot mutation or binding adoption. S’s malformed domain wins before examining backing. |
| B2 | Already initialized with immutable `(10,c+8,2,c,2)`, `V=(OPEN,0,0,c,c,0,0,0,0,false)`, slots `[F,F]`; bad new backing. Attempt `initialize(10,c+8,2,c,3)` | **Logical receipt:** `refused / carrier_in_use`. **Present full snapshot:** `(10,c+8,2,c,2; OPEN,0,0,c,c,0,0,0,0,false)`. Actual S remains **2**, not requested 3. Slots remain `[F,F]`. Token/issued ID/observed slot absent; no adoption or stamp. |
| B3 | Never initialized; bad backing. `initialize(11,c+7,2,c+8,1)`; every field domain valid, but C>B | **Logical receipt:** `refused / control_limit`. **Snapshot absent.** Token/issued ID/observed slot absent. Remains never initialized, with no ledger/slot mutation/adoption. The logical control-limit prefix wins before examining backing. |
| B4 | Never initialized; otherwise admissible `initialize(12,c+8,2,c,1)`; null backing or unmatched usable extent | **Separately typed `BindingRefused`. No logical receipt or logical code is invented.** Snapshot/token/issued ID/observed slot absent. No initialization, ledger/slot mutation, stamp or binding adoption. The excerpt does not supply a finer binding-reason enum; none is invented. |

Valid backing truth, alignment, lifetime and exclusive binding remain premises—not pointer-safety conclusions.

---

## 4. Coverage and explicit gaps

This proposes **64 logical calls across eight traces, plus four binding decisions**. None occurred.

Covered hand distinctions include:

- Pending versus held charge/counts; phase mismatch versus stale identity.
- Byte-before-work refusal; no preliminary peak, work, slot or issuance mutation.
- Zero-charge live owners and count-based close.
- Work-only issuance with no token.
- Transfer versus payload replacement; old-transfer and reused-slot replay.
- DRAINING cleanup without implicit cleanup/refund.
- Domain-before-mode/semantic checks; foreign-before-slot semantics.
- Stamp `0`, issuance-only revision and valid stale-stamp refusal.
- Exact finite-cap equality, `OverU64`, snapshot presence and optional-output absence.
- Binding refusal versus the preserved logical-error prefix.

**Not exhaustive:** every malformed shape/domain, arity error, upper S/index boundary, never-initialized non-initialize call, every mode/operation pair, or every competing-error combination is not separately specified.

**Identity exhaustion is not reached.** Maximum I here is `3`; `A=M` in T7 does not change that. No smaller M, private-state seed or exhaustion fixture is proposed.

No allocator, performed-work, physical/RSS, upstream SQL/vector, host/v2 polling, database transaction/publication/health, concurrency, performance or goal6 acceptance follows.

## 5. Progress and freeze

- **11:12:45 UTC task timestamp:** conversation-only normative excerpt accepted; previous packaging audit kept blocked.
- **11:13 conversation update:** deriving validation order, snapshots and presence fields; no active empirical/tool call or approval.
- **11:17:39 UTC conversation update:** reported refusal atomicity, zero-owner close and `A=M` versus issuance distinctions.
- **Freeze:** this complete message is **G6-ORACLE-DESIGN-001**, awaiting C’s independent comparison. No content hash, save, execution result or full-file audit is claimed.