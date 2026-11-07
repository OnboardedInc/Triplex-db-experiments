# QLever planner memory at the public query boundary

Tags: `backend:qlever`, `surface:qlever-datalog`, `surface:qlever-native`,
`goal:4`, `goal:5`, `problem:planner-memory`, `mechanism:closed-projection`,
`mechanism:paired-optionals`, `mechanism:planner-threshold`,
`status:qualified-fixture-candidate-open-scale-and-durability`.

The translated family12 public query exhausted the pinned QLever container's
2GiB limit while the planner was enumerating alternatives. The retained logs
contain greedy planning lines and no completed-plan marker before exit137 with
`OOMKilled=true`. This locates the observed failure in planning; it does not
identify an allocation stack. Later unavailable-query errors are consequences
of that first OOM, not additional independent planner failures.

The first complete native142 diagnostic passed at the same2GiB engine limit,
including all eight family12 current/reopen answers. That is useful evidence
that a different application query surface avoids this particular failure. It
is not a matched timing comparison, a general SPARQL qualification, or proof of
the256-client target. The native packet's later task-wide source-cut repair
has its own counterexample and focused verification; the earlier full packet
remains historical evidence for its exact source closure. A fresh final native
packet now passes all142 after the task-wide source-cut repair, with baseline100
before and after, thin controller publication and source/controller preimages.

## Retained experiment chain

All arms keep the engine image/CID/caps. A–E keep planning budget100; F explicitly
selects1 and restores100. The client
reservation remains896MiB with the separately recorded outer-controller
old-space flag256MiB. Every new attempt has its own source, build, oracle and
resource binding; a queued job or process exit zero is not a passing result.

| Arm              | Changed mechanism                                                               | Observed outcome                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Original control | Correlated `NOT EXISTS`, compact assertion leaf                                 | [First full-packet family12 OOM](../../.devloop/jobs/qlever-datalog-packet-bounded-v2/attempts/0001/terminal.json); later query errors are availability cascades.                                                                                                   |
| A                | Independently projected negative relation, shared flattened family/lexical keys | [First main-query OOM](../../.devloop/jobs/qlever-negation-projected-family12-v1/attempts/0001/terminal.json); no semantic answer.                                                                                                                                  |
| B                | Eligible `MINUS` over the same closed negative projection                       | [Fresh healthy-server attempt OOM](../../.devloop/jobs/qlever-negation-minus-family12-v2/attempts/0001/terminal.json); no semantic answer. The earlier v1 attempt saw an already stopped server and is setup failure.                                               |
| C                | Existing persisted scalar family/lexical/order leaf, retaining B                | [First main-query OOM](../../.devloop/jobs/qlever-negation-persisted-family12-v1/attempts/0001/terminal.json). Its completeness admission finished before the main planner failed.                                                                                  |
| D                | One retirement `OPTIONAL` binding both order fields, retaining C                | [Actual writer/history/partial-row gate passed](../../.devloop/jobs/qlever-retirement-pair-entry-v1/attempts/0001/terminal.json), then [the first family12 main query OOMed](../../.devloop/jobs/qlever-retirement-paired-family12-v1/attempts/0001/terminal.json). |
| E | Prune unused scalar order channels | [Twelve typed/control cases passed24 executions](../../.devloop/jobs/qlever-scalar-order-entry-v2/attempts/0001/terminal.json), then [family12 still OOMed](../../.devloop/jobs/qlever-scalar-order-family12-v1/attempts/0001/terminal.json). |
| F | Planner algorithm threshold100→1, E disabled | [All eight family12 answers passed](../../.devloop/jobs/qlever-planner-budget1-family12-v2/attempts/0001/terminal.json), followed by [the complete142 packet](../../.devloop/jobs/qlever-datalog-budget1-packet-v1/attempts/0001/terminal.json) and [the unchanged44 suite](../../.devloop/jobs/qlever-foundation-budget1-v1/attempts/0001/terminal.json), all at the same2GiB with100→1→100 verified. These are separate functional gates, not a default or performance promotion. |

The [A/B declaration](../../qualification/qlever-live/negation-wave1.json),
[C declaration](../../qualification/qlever-live/negation-persisted-wave1.json)
and [D/E declaration](../../qualification/qlever-live/retirement-wave1.json)
retain the proposed mechanisms and decision gates. Failed controls are not
repeated unchanged merely to make a new chart.

## Admission and semantic costs

The persisted fields already exist in the writer codec; C did not add a second
database or uncharged helper relation. Its absence check still scans assertion
identifiers and retained history in the exact scope. The
[actual owned malformed-row gate](../../.devloop/jobs/qlever-persisted-source-admission-v1/attempts/0001/terminal.json)
first accepts a complete scope, deletes one scalar lexical quad in that fixture
only, detects the missing row with shared-subject native pattern correlation,
and refuses the public query before its main plan. The scan is charged on
every call and is not a constant-time migration certificate.

D takes inspiration from the existing native fact leaf and interval-boundary
query, which bind retirement position/time together. The owning retraction
writer updates both fields in one mutation, and the RDF codec emits both order
channels. The live gate passed: after damaging two owned rows in opposite
directions, equal global predicate counts remained1/1, while the per-row
`BOUND`-exclusive-or admission found both damaged rows and the public query
refused them before main execution. This check also includes retained history
and is charged on every call. Pairing alone nevertheless did not prevent the
family12 planner OOM at the same2GiB cap.

`MINUS` is eligible only for nonempty, definitely bound shared logical keys;
keyless negation retains global `NOT EXISTS`. The compiler preserves Triplex's
existing flattened scalar equality, including reference/string behavior,
rather than silently substituting strict RDF fact identity. Current public
grammar rejects nested double-NOT before lowering; the conservative inherited
control guard is future/internal defensive coverage, not an exposed current
grammar defect. OR-negation remains an expression using `NOT EXISTS`.

All defaults remain unchanged. A candidate needs the actual pair/migration
admission gates, relevant typed/global/repeated-variable semantic gates, the
same eight family12 checks, the complete142 and unchanged44 gates, and a
separate verifier before any default change. The interval provider's internal
point-query profile must also be bound explicitly before claiming one uniform
profile for a complete interval packet.

## Recovery and other open work

Every OOM retains its pre-restart acknowledged positions, assertions,
retractions, history audits, native plan logs and data hashes. Recovery restarts
only the exact owned QLever CID with the same caps, reconciles every newly
acknowledged arm scope, and uses an anchored readiness attempt before refreshing
the resident owner. After E, all70 declared state/history audits across17
declared scopes passed with the retained delta bytes unchanged. This is a
read-OOM recovery gate; it is not
write-crash, independent-writer or power-loss acceptance.

The separate [raw SPARQL correlation finding](native-correlation.md) remains a
semantic counterexample for the pinned engine. Rewriting an application query
with positive grouping does not fix that engine behavior. The next native
qualification refresh now retains one task upper source position across all
calls while preserving intentional earlier cuts. The
[fresh native v5 packet](../../.devloop/jobs/qlever-native-packet-v5/attempts/0001/terminal.json)
canonically publishes all142 against the final source closure. The old v4 child
also produced answers, but its controller failed before publication; that old
attempt remains explicitly unqualified.

The separate [F declaration](../../qualification/qlever-live/planner-budget-wave1.json)
uses the actual runtime revision's planner selector. The supplied public source
corpus is a different commit and was not treated as runtime authority. A budget
of1 makes greedy planning eligible for smaller connected subplans. The100
control already logged241 greedy choices before OOM; this result is not a
claim that the repair simply changed every plan from dynamic programming to
greedy. The setting chooses algorithms and is not a memory ceiling. The retained
success log spans966 greedy messages across the complete eight-case attempt,
not a matched per-query comparison. No fair timing or throughput claim follows.

F's first wrapper attempt failed on an unavailable optional package import
before any native call. Its second attempt uses bounded native administration
requests and verifies both selection and restoration. These are setup and
cleanup operations around the unchanged public SDK packet. The interval helper
subsequently received the same explicit runtime query flags in its internal
point executor; the prior eight family12 answers did not qualify that previously
separate interval path. The fresh full142 and unchanged44 now bind the final
interval-wired build. The [independent full142 review](../../qualification/reviews/qlever-f142-final-independent.json)
checks all answers,3224 current input pins, the2GiB cap and actual setting
selection/restoration. The experimental profile is persisted source, eligible
MINUS, paired retirement, bounded complete aggregate answers, E disabled and
planner threshold1. SDK defaults remain unchanged. Native v5 uses its independent
typed SPARQL path and baseline100; there is no claim that the two surfaces ran
the same query representation or a matched performance cohort.

New attempts now retain hashed independent source, runner, oracle and controller
preimages. The [actual E failure](../../.devloop/jobs/qlever-scalar-order-family12-v1/attempts/0001/terminal.json)
verified133 declared and144 invocation source objects. This closes the future
source reconstruction gap for those selected roles; old receipts remain
historical and dependency/build blobs are not relabeled as source archives.
