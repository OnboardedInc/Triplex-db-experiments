# Source/provenance and minimal-change map

Date2026-10-31 UTC. Read-only contract investigation; no source edits or execution.

## Baseline and saved research

Approved published baseline: PR7 branch dot/temporal-datalog-prototype-20261030 head52b1e81f1d71590bdefb376e62924c9f717d4344, source-only mirror .agent-logs/goal3-coordinator/integration/candidate-002/. The coordinator-supplied280-file source manifest SHA256 is5e30c8b2dfaaac103c647a42440fb7d6c39d83846cc107913452b4e62db2c384. Only named relevant files were read/hashed; no siblings/staging, stopped checkpoint, protected artifact or build tree was inspected.

Saved prior NEW-item4 physical execution research: .agent-logs/goal4-negation-execution/revision-001/, manifest SHA25614dce4c69f27b53bbad62a4e72af052786beda576eb65f322d47a6f0da486b29; its source/proof/cap discussion was referenced narrowly. That revision remains unchanged.

Coordinator reports research publication main ecc8e134b8c130e80b7368ad3e98a2ea89a2cd83 / Page sequence32. This worker does not claim a new Git/Page readback or make a remote write in this contract phase.

## Exact line map (all paths under approved baseline)

| File:lines | Inspected contract seam | Future hazard / minimal change |
|---|---|---|
| engine/src/temporal_core.hpp:10–35 | old Error/Limits/Result/Engine | do not rename max_rounds or alter old result schema; additive new types |
| engine/src/temporal_typed_core.hpp:8–59 | four logical tags, owned Value, TypedResult/TypedEngine | STRUCT/list remain carriers; no new nested logical values |
| engine/src/temporal_core.cpp:22–30 | all structural constants |16 combined signed atoms;128 relations includes triple,<=127 IDB SCCs |
| temporal_core.cpp:34–99 | inline Tuple and seen/per-column index storage | reuse exact full-key membership; no new wildcard/partial-key anti index |
| temporal_core.cpp:116–171 | current byte parser/admission, relation IDs/arity | keep PositiveV1 path; do not add full-source UTF8/comment pass |
| temporal_core.cpp:173–297 | variables and typed decimal/Boolean/string parsing | no reserving not/eq/add/div; no float text/JSON roundtrip |
| temporal_core.cpp:299–384 | bracket AST building and node/nesting caps | export owned named IR2 nodes, never execute/fold filters on compile |
| temporal_core.cpp:386–437 | positive rule parser and current safety checks | new branch recognizes ! only in body; whole-rule positive binding, source ordinal diagnostics |
| temporal_core.cpp:439–455 | global unique facts, raw-row/interval/visibility loading | all retained rows before run; distinct visible+IDB cap not raw count; pending reserve once |
| temporal_core.cpp:457–478 | positive and filter work, all filters after false | preserve unit categories and eager fault barrier |
| temporal_core.cpp:479–550 | greedy indexed join, delta discard before charge, filter before dedup | positive-only view/map; no negative delta; full-group billing before membership |
| temporal_core.cpp:552–602 | old global seeding/waves/output accounting | NEW runner must not globally seed signed ground rules or reset caps per SCC; old runner untouched |
| temporal_core.cpp:608–654 | old compiler parses only, owns constants, redundant facts | IR2 no redundant facts stream; no accidental ground-negative seeding |
| temporal_core.cpp:658–763 | JSON escaping/int64 decimal/f64 hex and IR1 exact format | keep IR1 byte contract; IR2 bounded append/copy, no literal dictionary IDs |
| engine/src/temporal_plan_ir.hpp:10–58 | old owned logical structs and version1 declarations | add separate version2 types/schema, not extra unknown old keys |
| engine/src/temporal_value_domain.hpp:21–54 | term byte limit plus typed UTF8/NUL validation | validate_typed_text rejects NUL (not merely validate_term_bytes); comment bytes are not typed values |
| temporal_value_domain.hpp:111–178 | typed validation/interning/admission | same tag-separated ID dictionary; no arithmetic temporary interning |
| temporal_value_domain.hpp:192–204 | row/string output units and sort | fixed admission model not allocator census; no pending sort needed |
| engine/src/temporal_expression.hpp:12–25,86–151 |13 opcode private postfix evaluator, eager precharge | named owned IR2 opcode export and independent stack/dependency checks; existing errors retained |
| engine/src/temporal_float.hpp:10–18,23–65 | supported strict-FP target, canonical bits, control-only observation | no target broadening/control repair/cached permission; no cancellation feature added |
| engine/src/temporal_datalog.cpp:75–108,130–164 | borrowed vector-view prep and arena copies | refresh after resize; no handle/view escapes |
| temporal_datalog.cpp:168–181 | typed tag/selected payload checks | exact one active+three inactive slots; no logical SQLNULL |
| temporal_datalog.cpp:184–243 | batch tuple/cell/40-byte-cell output accounting | new callback adds explicit72*count metric units; old callers unchanged |
| temporal_datalog.cpp:245–299,343–371 | old query7args/4fields and registration | new10field callback separate; no old volatility/property change |
| temporal_datalog.cpp:302–327,374–397 | owned IR callback, volatile compile FP admission | both new callbacks explicitly volatile/specialNULL/fallible/ignore collation |
| storage/planner_v1.py:197–275 | strict td.program_ir/1 decoder and supported-language/budget keys | unchanged decoder rejects new schema; no catch-and-native workaround |
| storage/typed_store.py:56–62,654–686 | all-retained carrier, logical snapshot transaction | integration deferred; pure core has no store authority or snapshot lease |

## Minimal future edit ownership, NOT current edits

A later authorized core/IR owner can isolate compile-time PositiveV1 vs StratifiedV1 branches in temporal_core.cpp and additive headers. A separate binding owner can add the new callbacks/registrations without changing old function signatures/properties. Shared lexer/domain/tuple/filter primitives avoid cloning an entire engine; shared helpers are not remapped solely to invent granular error enums.

The proposal explicitly does NOT touch storage schema, planner trust, public persisted-store query methods, SQL anti routes, private C++ attachment authority, browser/UI, extension build/artifact, deployment or any external service.

## Provenance verification limit

No new runtime/source-host compatibility was measured. The previous source inventory already pins actual unstable C APIv2 at DuckDB2.0.0/d54; this phase defines a future artifact0.5.0 separately from language0.4/IR2. Source hashes only establish which text was inspected, not implementation/test/acceptance evidence.

