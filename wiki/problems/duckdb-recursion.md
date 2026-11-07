# DuckDB recursive multiplicity, domains and resource containment

Tags: `backend:duckdb`, `surface:duckdb-datalog`, `goal:3`, `goal:5`,
`goal:6`, `problem:recursive-multiplicity`, `status:observed`.

The first common packet, `duckdb-datalog-packet-v1/0001`, executed70 of142
checks:40 passed,30 failed in integer aggregate/domain families, then the
reflexive closure in family11 did not finish. We canceled it after305s. The
controller observed the owned process group gone without escalation. The report
is retained and anchored by the canceled attempt; the72 unexecuted checks are
not passes. Its scratch remains forensic evidence, including approximately5.3GB
of database and spill files. The old native spill error reported an automatic
32.1GiB allowance despite requested finite startup settings. That discrepancy's
root cause is unresolved; successful settings readback alone does not establish
effective containment.

Repeated self edges, diamonds and cycles cause the historical `UNION ALL`
recursive SQL to retain path multiplicity through the maximum depth. A final
DISTINCT cannot prevent that intermediate growth. Two opt-in native SQL
alternatives now exist for measurement on the same public AST: complete-tuple
`UNION` over arguments plus depth, with DISTINCT at visible relation boundaries;
and DuckDB `USING KEY` over argument pairs, rejecting already-seen pairs through
the engine's recurring dictionary. Maximum-depth semantics remain separate from
set novelty. Neither alternative represents path/witness multiplicity or proof
lineage; those require their own contracts and tests. The default legacy compiler
behavior remains unchanged for other dialects.

The official [WITH reference](https://duckdb.org/docs/preview/sql/query_syntax/with)
describes the2.0 engine's keyed union behavior. The
[2025 introduction](https://duckdb.org/2025/05/23/using-key) and
[research material](https://duckdb.org/library/bamberg-using-key-sigmod/) provide
inspiration for bounded dictionary/delta iteration, not automatic evidence for
this pinned2.0.0 binary. Actual C++ artifacts and fresh public results determine
acceptance. Native source facts never move to a host evaluator in these arms.

The new integer domain resolver probes canonical type categories of the joined
candidate relation within the same public transaction/cut. Only bounded type
families cross into TypeScript. It supplies existing compiler integer hints for
aggregates and ordered/computed variables. It rejects ambiguous mixed numeric
domains rather than silently casting exact integers into binary64. Its actual
probe SQL is included in debug plans; no cross-cut cache is inferred.

Resource repair uses a unique owned spill directory, explicit finite settings
after the real file and paired extension are open, matching settings in the
file-pool identity, live validation before each public transaction, and actual
native connection interruption on Effect cancellation. Individual reads have
an invocation guard; transaction rollback and native ownership reconciliation
must drain before returning. The native memory setting is an engine budget,
not hard containment of the Mac process. Job disk reservations are admission
estimates; the earlier spill demonstrated that they alone do not bound usage.

The functional resource fixture keeps a public client lease alive across actual
SDK write/read operations, then executes bounded native SQL through the identical
granular session used by the public compiler. It captures effective settings and
the owned spill path immediately before sorting. A finite sort must fail at the
1MiB native cap, without reaching its2s abort fallback. A separate interrupted
native read must settle and permit reuse of that same session. The first attempt
was too small at32MiB memory and failed during the one-fact write. The second
reached the reader and enforced1MiB (sampled temporary allocation851,968B), then
failed an authored raw-integer assertion (`1n` was correctly returned). Both
failures are retained. The subsequent `duckdb-resource-entry-v3/0001` passed the
complete byte-verified fixture, including actual native interruption/drain and
healthy reuse of the same public session. The report retains its effective
settings/path; this does not resolve the old automatic-budget discrepancy.

The focused recursive fixture distinguishes13 pair rows from4 distinct target
values: Triplex COUNT of a variable uses distinct support semantics. Its first
attempt confirmed the13 pairs but had an authored COUNT expectation of13;
original input bytes and hashes remain under
`.runtime/duckdb/recursion-v1-original-inputs/`. The repaired focused-v2 attempt
passed both arms, self-variable equality, maximum depth, typed integer SUM and
legacy50ms native deadline cleanup/reuse. A subsequent full common142 packet
passed. Diagnostic arm totals~719/712ms do not establish256-client performance
or a promoted winner; both alternatives remain available for the measured loop.
