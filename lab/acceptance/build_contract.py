#!/usr/bin/env python3
"""Single source of truth for the triplex-db-2 acceptance contract.

Run:  python3 -I lab/acceptance/build_contract.py
It writes lab/acceptance/obligations.json and replaces the generated block in
lab/acceptance/ACCEPTANCE.md (between the GENERATED markers). It also validates
that every obligation references defined lanes, oracles, entrypoints, profiles,
case sets, closure rules and mutation controls, and prints the per-goal counts.

Stdlib only. Imports nothing from the repository.
"""
import hashlib
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
VERSION = "0.1.0-draft"

LANES = ["xtdb-xtql", "xtdb-sql", "qlever-sparql"]
ALL = LANES
ENGINE_OF = {"xtdb-xtql": "xtdb", "xtdb-sql": "xtdb", "qlever-sparql": "qlever"}

SECTIONS = [
    ("G1", "Goal 1. Eight exact value types, schemas, cardinality, uniqueness, references"),
    ("G2", "Goal 2. Expressions, arithmetic boundaries, specified error semantics"),
    ("G3", "Goal 3. Useful plans, costing, preconstruction admission, recursion"),
    ("G4", "Goal 4. Completed absence and negation at coherent cuts"),
    ("G5", "Goal 5. Full-support aggregates, typed groups, empties, exact overflow"),
    ("G6", "Goal 6. Cancellation, deadlines, resource ownership, cleanup"),
    ("G7", "Goal 7. Atomic writes, receipts, migration and evolution, recovery"),
    ("G8", "Goal 8. Bounded reuse, transactional publication, maintained supports"),
    ("G9", "Goal 9. Bitemporal intervals, presence, corrections, lineage, deletion, cascades"),
    ("G10", "Goal 10. Public TypeScript and schema integration, scope, cursors, lifecycle, capabilities, consumers"),
    ("R", "R. Entity API (the ORM) and raw queries make sense"),
    ("S", "S. Scale: 10m distinct entities, 100m active representative facts"),
    ("L", "L. Load: 256 logical clients, 512 and 1024 stress"),
]

# --------------------------------------------------------------------------- oracles
ORACLES = {
    "O-EVT": {
        "status": "EXISTS",
        "path": "qualification/workloads/event_oracles.py",
        "check": "python3 qualification/workloads/validate_workloads.py (71 checked, 0 unchecked); qualification/workloads/test_event_oracles.py",
        "computes": "expected_rows for the 71 packet cases from immutable events, parameters and two-time cuts",
        "independence": "Python, imports no Triplex code, ignores normalized assertions",
    },
    "O-REPLAY": {
        "status": "TO-BUILD",
        "path": "lab/acceptance/oracle/replay.py (proposed; built by a later experiment, EXP-O01)",
        "computes": "see ACCEPTANCE.md section 4.2: complete assertion metadata, raw-lifetime and snapshot history, entity models, transactions, receipts, expected failures, cursors, support counts, analytic scale counts",
        "independence": "Python stdlib only; reads command streams, fixture specs and ACK receipts; imports no production visibility, constraint, projection, hydration or codec code; implements its own int64, binary64 and codepoint order",
    },
    "O-HAM": {
        "status": "EXISTS",
        "path": "qualification/capacity/historical-assertion-metadata-v1/oracle.mjs, qualification/capacity/historical-assertion-metadata-v2/oracle.mjs",
        "computes": "finite-nine historical assertion snapshot metadata (four-commit five-version microfixture plus same-R control)",
        "independence": "Node only; independently accepted per handoffs/claude-native/README.md:116-119; independence of the v2 copy must be re-verified (no Triplex import) before use",
    },
    "O-CFG8": {
        "status": "EXISTS",
        "path": "qualification/capacity/configured-entities-v1/oracle.mjs",
        "computes": "configured-eight fixture: membership, typed values, ids, history, retirement-metadata target, receipts (52 checks, 5 retained failures)",
        "independence": "Node only per CONTRACT.md; runtime ids only from assertion receipts",
    },
    "O-STR": {
        "status": "EXISTS",
        "path": "qualification/extensions/string-order-v1/oracle.json (SHA 8f4da85e...), policy.json",
        "computes": "frozen codepoint order arrays: ASCII A,E,c,z; continuation c,z; Unicode codepoint order; range > U+E000",
        "independence": "authored before execution; no engine output, no casefold",
    },
    "O-COLL": {
        "status": "EXISTS",
        "path": "qualification/native-controls/qlever-collation-tiny-v1/oracle.json",
        "computes": "9-triple tiny collation control expected order and ranges",
        "independence": "authored before execution; cites SPARQL 1.1 operator mapping",
    },
    "O-SHAPE": {
        "status": "TO-AUTHOR",
        "path": "lab/acceptance/cases/shape-controls.json (proposed)",
        "computes": "frozen expected answers for correlated NOT EXISTS (flat, nested), EXISTS, MINUS, OPTIONAL plus !BOUND, latest revision, empty max group, grouped empty SUM, tied int64 maxima",
        "independence": "hand-authored from SPARQL 1.1 / SQL semantics with citations, frozen before execution, cross-checked by O-REPLAY",
    },
    "O-ERR": {
        "status": "TO-AUTHOR",
        "path": "lab/acceptance/cases/error-semantics.json (proposed)",
        "computes": "the specified typed error (tag, retained cause class) expected for every negative case",
        "independence": "derived from Triplex public error types and docs, frozen before execution; needs an orchestrator ruling where Triplex specifies nothing",
    },
    "O-TESTKIT": {
        "status": "EXISTS",
        "path": "packages/testkit/src/index.ts (triplesConformanceCases)",
        "computes": "authored expected values inside each of the 44 shared cases",
        "independence": "expectations are literals in test code; KV runs the same cases as a regression participant only",
    },
    "O-OBS": {
        "status": "TO-AUTHOR",
        "path": "lab/acceptance/cases/observation-protocol.json (proposed), from wiki/problems/cancellation-observation-levels.md",
        "computes": "required evidence per observation level (settled, transport acknowledged, owned work drained, reuse, engine idle) joined to one request id",
        "independence": "engine-side observation (XTDB metrics and logs, QLever cmd=dump-active-queries and logs, container stats) never the client's own counter",
    },
    "O-SPEC": {
        "status": "TO-AUTHOR",
        "path": "lab/acceptance/cases/type-witnesses/ (proposed)",
        "computes": "positive and negative TypeScript witnesses with expected tsc outcome per file; package export manifest expectations",
        "independence": "tsc on the packed public declarations only",
    },
    "O-KV": {
        "status": "EXISTS",
        "path": "packages/core/src/kv/ (KvTriples.layer)",
        "computes": "differential regression participant",
        "independence": "NOT independent: shares core transaction, temporal, constraint and decoding code. Never the sole oracle for any obligation (review r1 finding 5)",
    },
}

# --------------------------------------------------------------------------- entrypoints
ENTRYPOINTS = {
    "EP-TRIPLES": "Public `Triples` service (packages/core/src/store/Triples.ts: transact, assert, retract, get, entity, entities, entityPage, match, history, transaction, transactionByCommand, transactions, transactionsForEntity, currentPosition, queryAll, queryPage) over the lane Runtime (`packages/xtdb/src/index.ts` or `packages/qlever/src/index.ts`, `.layer({scope, capabilities})`).",
    "EP-REPO": "Entity repository `Repository<Model>` typed from EntityType: `at(basis)`, `get`, `getMany`, `find({where, include, limit, cursor})`, `timeline` (public core entity subpath planned by EXP-R01; the receipt records the exact exported symbol and module it imported).",
    "EP-WRITER": "`Writer` -> `WritePlan` -> `commit(plans, {actor, commandId, ...})`, exactly one transact per commit.",
    "EP-NATIVE": "The lane's own native read surface. xtdb-xtql: `makeXtdbNativeQueries(...).select` (XTQL). xtdb-sql: `.selectSql` and `.selectSqlWithReachability`. qlever-sparql: `makeQleverNativeQueries(...)` native SPARQL. Helper fragments from the lane's native context are allowed.",
    "EP-RAW-HATCH": "The documented raw escape hatch through Triplex (native query with declared contract) whose text references only names published in the raw-query guide and uses no helper fragments.",
    "EP-RAW-WIRE": "Direct engine protocol from a client with no Triplex code: pgwire to XTDB (SQL, and XTQL through `XTQL(...)`), SPARQL 1.1 Protocol over HTTP to QLever, against the documented raw dataset.",
    "EP-RESOLVE": "`resolveXtdbOperation` / `resolveQleverOperation` (packages/*/src/Operations.ts) or their public successors.",
    "EP-EXPLAIN": "Public explain or plan capture for repository queries and native reads (QueryExecutor.explain exists for Datalog; repository and native explain are to be exposed).",
    "EP-PKG": "Packed tarballs (`pnpm pack`) installed into a clean consumer project outside the workspace; only public package exports imported.",
    "EP-CLI": "`triplex` bin from @triplex-build/triplex-cli, installed from its tarball.",
    "EP-ENGINE-OBS": "Engine-side observation surfaces (XTDB /metrics and logs, QLever cmd=dump-active-queries and logs, docker stats/inspect). Observation only, never a public Triplex entrypoint.",
}

# --------------------------------------------------------------------------- profiles
PROFILES = {
    "P-STATIC": "No engine. Static checks on packed public declarations and sources.",
    "P-TINY": "Fresh scope on the dev slot, at most 1,000 entities, single client. Modes: current (same runtime) and reopen (fresh runtime and fresh client on the same scope). Where the obligation says so, also engine-restart mode.",
    "P-TINY-CONC": "P-TINY plus controlled concurrent actors: a writer committed between the calls of one task, and N-way races (N = 16 unless stated).",
    "P-HEAVY": "Exclusive slot (s1..s3), fixture of at least 1m entities or a declared synthetic long-running query, so that cancellation, deadlines and admission act on real work.",
    "P-FAULT": "Exclusive slot with fault injection: container kill, connection drop, request timeout, restart, at declared fault points.",
    "P-RUNG": "Scale ladder rung 10k, 100k or 1m distinct entities (representative profile unless stated), admitted by capacity forecast.",
    "P-SCALE-10M": "Target dataset of S.dataset.target-population: 10,000,000 distinct application entities, 100,000,000 active representative domain facts, one database scope, sparse and representative profiles, retained history.",
    "P-LOAD": "lab/acceptance/load-contract.json levels 256 (acceptance), 512 and 1024 (stress) on P-SCALE-10M.",
}

# --------------------------------------------------------------------------- case sets
CASESETS = {
    "CS-U44": {"status": "EXISTS", "source": "packages/testkit/src/index.ts triplesConformanceCases (44 cases); drivers packages/xtdb/test/conformance.test.ts, packages/qualification/test/runtime-conformance.test.ts", "note": "QLever has no conformance.test.ts; a homebase-free runner is needed (R4 5.3)."},
    "CS-PKT71": {"status": "EXISTS", "source": "qualification/workloads/temporal-workloads.json (20 workloads, 71 cases) with recipes packages/qualification/src/native/xtdb-workloads.ts, qlever-workloads.ts, qlever-recursion.ts", "note": "XTQL recipes must be authored for 57 SQL-only and 3 hybrid tasks (R6 2.2); 14 SQL tasks use SQL-only reachability."},
    "CS-PKT-MULTICALL": {"status": "TO-AUTHOR", "source": "the 16 multi-call tasks of CS-PKT71 (R6 2.6: 03 price, 04 coverage x3, 10 x4, 16 x3, 19 training x2, 20 supports x3) plus the writer-between-calls shape of packages/qualification/experiments/qlever-task-basis.ts"},
    "CS-ENTRY": {"status": "EXISTS", "source": "packages/xtdb/experiments/native-entry.ts (13 checks), packages/qlever/experiments/native-entry.ts (11 checks)", "note": "XTQL versions of the 5 SQL-only read checks and SQL versions of the 6 XTQL-only read checks are to be authored (R6 2.5)."},
    "CS-TYPES8": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.1; seeds: R6 goal 1 experiment, R2 4.1, R1 Q3, response r1 B5 step 3"},
    "CS-TYPES8-NEG": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.1; seeds: R4 3.6 (surrogates, non-finite, non-canonical int64)"},
    "CS-WIDEN": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.1; seeds: R1 Q3 union columns, R2 4.1 invalid typed literals, review r1 finding 12"},
    "CS-PARAMS": {"status": "TO-AUTHOR", "source": "wiki/problems/native-number-parameters.md (24 parameter checks, raw job absent from checkout)"},
    "CS-CONSTRAINTS": {"status": "TO-AUTHOR", "source": "testkit cases 'graph constraints reject invalid post-states across valid time', 'graph constraints agree across storage backends'; configured-eight Required rejection; packages/core/src/Constraint.ts"},
    "CS-SCHEMA-RELEASE": {"status": "TO-AUTHOR", "source": "configured-eight schema v1 -> v2 (CONTRACT.md); R4 1.4"},
    "CS-NUMERIC": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.2; seeds: R6 goal 2 boundary probe, R2 4.1 arithmetic, packages/xtdb/experiments/query/integer-*.json"},
    "CS-ERRORS": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.2; testkit 'datalog rejects invalid and unbound queries with backend-neutral typed errors'; R4 3.8 contract and row limits"},
    "CS-STR": {"status": "EXISTS", "source": "qualification/extensions/string-order-v1 (oracle.json, policy.json), qualification/native-controls/qlever-collation-tiny-v1, plus the R5 A3 IRI page-sample class (to author from R5 probe T1h)"},
    "CS-SHAPE": {"status": "TO-AUTHOR", "source": "wiki/problems/native-correlation.md, R5 sections 3-4 and 5.4, R6 experiment 5"},
    "CS-CONFLICT": {"status": "TO-AUTHOR", "source": "review r1 finding 13; response r1 B4"},
    "CS-SUPPORT": {"status": "TO-AUTHOR", "source": "testkit 'datalog aggregates preserve duplicate rows and define empty and distinct results', 'same-value facts in one batch keep distinct identities'; packet 05/06/18/20; review r1 finding 13"},
    "CS-QMIX": {"status": "TO-AUTHOR", "source": "qualification/benchmark-contract.json queryFamilies (point, selective-filter, join, anti-join, recursion, aggregate, historical, interval, pagination)"},
    "CS-ADMIT": {"status": "TO-AUTHOR", "source": "R6 goal 3 (admission after the fact), R2 3.3 and 6.5 (planner memory), review r1 finding 1"},
    "CS-RECURSION-TOPO": {"status": "TO-AUTHOR", "source": "qualification/benchmark-contract.json topologies (chain, tree, diamond, cycle, high-fanout, skewed-hotset); R6 goal 3 (100k-edge chain, depth 50)"},
    "CS-CANCEL": {"status": "TO-AUTHOR", "source": "native-entry cancellation check; wiki/problems/cancellation-observation-levels.md; R2 6.4; R6 experiment 9"},
    "CS-SCRATCH": {"status": "TO-AUTHOR", "source": "R4 3.1 scratch tables, 4.1 scratch graphs; R6 finding 4 and experiment 10"},
    "CS-LIFECYCLE": {"status": "TO-AUTHOR", "source": "wiki/problems/load-liveness.md (pool construction), R6 goal 10 (openNative pool), packages/qlever/src/QleverClient.ts no-op close"},
    "CS-WRITE": {"status": "TO-AUTHOR", "source": "testkit 'conditional transactions are atomic and journal their changes', 'transaction journals cannot be retracted', 'reserved Triplex namespaces reject ordinary writes atomically'; packages/qlever/test/storage.test.ts 16-way command test; R4 2.3, 3.4-3.7, 4.3-4.4"},
    "CS-FAULT": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.3; review r1 finding 7; R2 1.8 probes A-C; R6 experiment 10"},
    "CS-MIGRATION": {"status": "TO-AUTHOR", "source": "review r1 finding 12; response r1 decision 12; configured-eight schema v1 -> v2"},
    "CS-PUBLISH": {"status": "TO-AUTHOR", "source": "review r1 finding 8; response r1 B2"},
    "CS-REUSE": {"status": "TO-AUTHOR", "source": "R6 goal 8; packages/xtdb MaintainedQueries.ts; testkit 'derivation materialization uses indexed dependency freshness'"},
    "CS-SUPPORT-DAG": {"status": "TO-AUTHOR", "source": "packet workload 20 (length-3 bound) extended to larger DAGs; review r1 finding 13"},
    "CS-TEMPORAL": {"status": "TO-AUTHOR", "source": "handoffs/claude-native/README.md:43-48; review r1 finding 6; response r1 decision 6; native-entry half-open checks"},
    "CS-HAM9": {"status": "EXISTS", "source": "qualification/capacity/historical-assertion-metadata-v1/reproducers.json, v2 README"},
    "CS-CFG8": {"status": "EXISTS", "source": "qualification/capacity/configured-entities-v1 (TINY-XTDB-CONTRACT-v4.md, oracle.mjs); five failing targets named in R6 3.1"},
    "CS-PRESENCE-DELETE": {"status": "POLICY-PENDING", "source": "wiki/research/presence-reference-deletion-requirements-v1.md (requirements menu, no policy chosen)"},
    "CS-CURSOR": {"status": "TO-AUTHOR", "source": "testkit 'Datalog reads are bounded by default and cursors traverse the complete snapshot', 'historical cursor pages intersect recorded time and the commit snapshot', 'paged queries use deterministic snapshot-stable cursors'; native-entry fixed-cut page continuation; review r1 finding 8"},
    "CS-SCOPE": {"status": "TO-AUTHOR", "source": "qlever native-entry scope-isolation; review r1 finding 9; response r1 B3"},
    "CS-CAPS": {"status": "TO-AUTHOR", "source": "lab/acceptance/capability-matrix.md rows; R6 goal 10 (Capabilities.none)"},
    "CS-SLICE": {"status": "TO-AUTHOR", "source": "response r1 B5 step 6 (vertical slice); public-native-consumer-v2 shape (wiki/status.md:127)"},
    "CS-TYPEWITNESS": {"status": "TO-AUTHOR", "source": "R3 artifacts api-sketch.ts and usage.ts; decision D5 (absent optional = missing property, card-many = array)"},
    "CS-ENTITY": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.4 (entity suite specification)"},
    "CS-RAW-RECIPES": {"status": "TO-AUTHOR", "source": "ACCEPTANCE.md 6.5 plus the published raw-query guide (to be written)"},
    "CS-FRAGMENT-EQUIV": {"status": "TO-AUTHOR", "source": "R5 5.4 equivalence conditions C1-C4; review r1 finding 14"},
    "CS-SCALE-SAMPLE": {"status": "TO-AUTHOR", "source": "qualification/benchmark-contract.json queryFamilies, measurements; configured-entities-v1 CONTRACT.md (deterministic boundary/history samples, complete counts)"},
    "CS-LOAD": {"status": "DRAFT", "source": "lab/acceptance/load-contract.json"},
}

# --------------------------------------------------------------------------- mutation controls
MUTANTS = {
    "M-HALF-OPEN": "validTo treated as inclusive (or validFrom as exclusive) in the visibility filter of the system under test.",
    "M-DROPPED-SUPPORT": "when two live assertions support the same value, retracting one removes the value from the projection, plain triple or derived result.",
    "M-FUTURE-RETIREMENT": "snapshot reads return retractedAt/retractTxId of a retirement recorded after the cut.",
    "M-INT64-ROUND": "int64 values pass through binary64 on the read or write path.",
    "M-ENTITY-TYPE-SWAP": "entity type labels of two EntityTypes swapped in the projection or in hydration.",
    "M-STALE-PROJECTION": "the projection is served one publication behind while the returned basis reports the latest position.",
    "M-CUT-OFF-BY-ONE": "reads use position P-1, or treat recordedAt <= R as < R.",
    "M-NEGZERO": "-0.0 normalized to +0.0 on any path.",
    "M-ICU-ORDER": "text order and range comparison use locale collation instead of codepoint order.",
    "M-SCOPE-LEAK": "the scope predicate or graph selection is dropped from one read path.",
    "M-MASK-RAW": "the snapshot retirement mask is applied to the ordinary raw-lifetime history contract.",
    "M-CONFLICT-PICK": "a card-one conflict is resolved by an arbitrary pick instead of the typed conflict outcome.",
    "M-IDENTITY-COLLAPSE": "same-value assertions in one batch collapse into one assertion identity.",
    "M-JOURNAL-ORDER": "transaction changes are returned in a different order than written.",
    "M-CLAIM-IGNORED": "the command-claim check is skipped, so a duplicate command commits twice.",
    "M-DECORRELATE": "a negation helper omits the correlated-variable re-binding.",
    "M-STALE-REUSE": "a reused derived result is not invalidated after an affecting write.",
    "M-CARD-MANY-DROP": "one element of a cardinality-many array is dropped on hydration or projection.",
}

# --------------------------------------------------------------------------- closure rules
CLOSURE_RULES = {
    "CR-PASS-ALL": "Every declared case executes in every declared mode for the lane, each result is PASS against the named oracle, executed case ids equal the declared set exactly, and the receipt passes V1-V16.",
    "CR-COUNTEREXAMPLE": "The original counterexample case runs with its original frozen expected answer (oracle file hash unchanged since the first recorded failure) and passes; the raw counterexample text is not edited; CR-PASS-ALL holds.",
    "CR-MUTANT-KILL": "For each listed mutant, a mutation receipt on the same candidate tree (mutation patch hash recorded, oracle and case hashes unchanged) executes the full declared suite and records at least one FAIL; the unmutated suite passes CR-PASS-ALL on that tree.",
    "CR-OBSERVE": "Every required observation level of O-OBS is evidenced and joined to one request or connection identity, within the stated bounds; uncertainty after timeout or lost acknowledgement fails the case.",
    "CR-FAULT": "Every declared fault point is injected at least the stated number of times; after each injection and recovery the post-state equals O-REPLAY through every listed access path; zero ACKed commands lost; zero unresolved outcomes at the end.",
    "CR-STATIC": "Every positive witness compiles and every negative witness fails with the expected diagnostic, against the packed public declarations of the candidate.",
    "CR-SCALE": "The rung's dataset receipt meets the declared counts (verified by independent count queries in the lane language and O-REPLAY analytic counts), the run was admitted under a capacity forecast, and the correctness subsample passes with zero tolerance.",
    "CR-PERF": "Each CALIBRATE threshold named by the obligation is frozen in a calibration receipt that predates the acceptance receipt, and every acceptance run meets it; three independent runs, all must pass.",
    "CR-METRICS": "Every listed metric is present, measured (not estimated) and bound to the dataset and build identity; no threshold beyond presence unless stated.",
    "CR-LOAD": "load-contract.json at its frozen version: calibration receipt exists and predates; every invariant holds with zero tolerance and every threshold is met in each of the required independent runs at the named level.",
    "CR-MATRIX": "Every capability-matrix cell with a non-empty required-by list is EXACT with a passing receipt; every KNOWN-LIMIT cell has an empty required-by list, a retained counterexample receipt and an entry in the raw-query guide.",
    "CR-PROVENANCE": "The receipt's authoring manifest lists only the raw-query guide and engine documentation hashes as inputs to the raw recipes, and the author identity differs from the authors of the lane's repository and projection code.",
}

# --------------------------------------------------------------------------- obligations
OBL = []


def O(id, goals, title, statement, lanes=ALL, scope="lane", cases=None, oracle=None, ep=None,
      profile="P-TINY", closure=("CR-PASS-ALL",), params=None, mutants=(), sources=(),
      grounding="grounded", notes=None):
    OBL.append({
        "id": id,
        "goals": list(goals),
        "title": title,
        "statement": statement,
        "lanes": list(lanes),
        "receiptScope": scope,
        "cases": cases or {},
        "oracles": list(oracle or []),
        "entrypoints": list(ep or []),
        "profile": profile,
        "closure": {"rules": list(closure), "params": params or {}},
        "mutationControls": list(mutants),
        "sources": list(sources),
        "grounding": grounding,
        "notes": notes,
        "status": {lane: "OPEN" for lane in lanes},
    })


CUR_REOPEN = {"modes": ["current", "reopen"]}
CUR_REOPEN_RESTART = {"modes": ["current", "reopen", "engine-restart"]}

# ---------------- Goal 1
O("G1.found.unchanged44", ["G1"], "Unchanged44 on the lane foundation",
  "The unchanged 44-case shared conformance suite passes against the lane engine's Triples foundation in current and reopened form: 44 named cases per mode, 88 executions, zero skipped.",
  scope="engine", cases={"set": "CS-U44", "select": "all", "executions": 88},
  oracle=["O-TESTKIT"], ep=["EP-TRIPLES"], params=CUR_REOPEN,
  sources=["wiki/goals.md:20-23", "lab/research/R4-codebase-harness-map.md 5.3", "lab/PLAN.md 5.4 G1"],
  notes="KV runs the same cases as a regression participant (packages/testkit/test/fixtures.test.ts); its agreement closes nothing.")
O("G1.types.eight-type-roundtrip", ["G1"], "Eight value types round-trip exactly on every surface",
  "Every case of CS-TYPES8 (one assertion per value family string, number, integer/int64, boolean, datetime, ref, json, blob, including the listed edge values) reads back bit-exact through Triples, the repository, the lane's native surface with a schema-derived contract, and the documented raw recipe, in current, reopen and engine-restart modes.",
  cases={"set": "CS-TYPES8", "select": "all"}, oracle=["O-REPLAY"],
  ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], params=CUR_REOPEN_RESTART,
  closure=("CR-PASS-ALL", "CR-MUTANT-KILL"), mutants=["M-INT64-ROUND", "M-NEGZERO"],
  sources=["wiki/goals.md:9", "lab/research/R6-xtdb-gap-analysis.md goal 1", "lab/reviews/plan-review-r1.response.md B5 step 3", "lab/research/R2-qlever-capabilities.md 4.1", "lab/research/R1-xtdb-capabilities.md Q3"])
O("G1.types.invalid-rejected", ["G1"], "Invalid values are rejected atomically",
  "Every case of CS-TYPES8-NEG (lone surrogate, NaN, +/-Infinity, non-canonical int64 text, integer outside int64, invalid datetime, malformed json or blob descriptor) is rejected with the specified typed WriteError; the committed position is unchanged, no receipt or claim exists, and no partial row or triple is visible through any access path.",
  scope="engine", cases={"set": "CS-TYPES8-NEG", "select": "all"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER"], params=CUR_REOPEN,
  sources=["lab/research/R4-codebase-harness-map.md 3.6", "lab/research/R6-xtdb-gap-analysis.md goal 1"])
O("G1.types.storage-widening-safe", ["G1"], "Later writes never change an earlier exact read",
  "After the heterogeneous writes of CS-WIDEN (whole-number floats, text and int64 in attributes that share physical storage; invalid typed literals), every previously written value still reads back bit-exact on every surface, current and reopen.",
  cases={"set": "CS-WIDEN", "select": "all"}, oracle=["O-REPLAY"],
  ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], params=CUR_REOPEN,
  mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/research/R1-xtdb-capabilities.md Q3 (union columns reach Node as JSON numbers)", "lab/research/R2-qlever-capabilities.md 4.1 (invalid typed literal becomes a plain string)", "lab/reviews/plan-review-r1.codex.md finding 12"],
  grounding="derived")
O("G1.types.native-parameters", ["G1"], "Native parameters keep exact values",
  "Parameters of every value family bound into a native query in the lane language (including -0.0, int64 extremes, text containing quote, $$ and ;) reach the engine with their exact value and type, current and reopen.",
  cases={"set": "CS-PARAMS", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-NATIVE"], params=CUR_REOPEN,
  mutants=["M-NEGZERO"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/problems/native-number-parameters.md", "wiki/status.md:159-169"])
O("G1.schema.required", ["G1"], "Required is enforced atomically",
  "With enforcement on, a command that leaves a Required attribute missing at any represented valid-time boundary is rejected with the typed constraint error and no residue; the same command with the attribute present commits.",
  scope="engine", cases={"set": "CS-CONSTRAINTS", "select": "required"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER"], params=CUR_REOPEN,
  sources=["wiki/goals.md:9", "lab/research/R6-xtdb-gap-analysis.md 3.1 (Required rejection, no residue)"])
O("G1.schema.cardinality", ["G1"], "Cardinality-one is enforced with the specified counting rule",
  "With enforcement on, a second live overlapping assertion for a cardinality-one attribute is rejected; the counting rule (assertions, including duplicate equal-valued assertions, per packages/core/src/Constraint.ts) matches O-REPLAY; cardinality-many keeps every live value.",
  scope="engine", cases={"set": "CS-CONSTRAINTS", "select": "cardinality"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO"], params=CUR_REOPEN, mutants=["M-CARD-MANY-DROP"],
  closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:9", "lab/reviews/plan-review-r1.codex.md finding 13 (Constraint.ts:193 counts assertions)"])
O("G1.schema.unique", ["G1"], "Uniqueness holds under concurrent writers",
  "A unique attribute value can be live on at most one entity at any valid instant; a second writer is rejected with the typed error; in a 16-way race for the same value exactly one command commits.",
  scope="engine", cases={"set": "CS-CONSTRAINTS", "select": "unique"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER"], profile="P-TINY-CONC", params=CUR_REOPEN,
  sources=["wiki/goals.md:9", "lab/PLAN.md 3.2 item 1 (uniqueness enforcement)"])
O("G1.schema.reference-target", ["G1"], "Reference targets are enforced at represented boundaries",
  "With ReferenceTarget rules supplied, a ref must target a visible entity of the required EntityType at every represented valid-time boundary of the source fact; same-batch forward references are admitted; a violating command is rejected atomically.",
  scope="engine", cases={"set": "CS-CONSTRAINTS", "select": "reference"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-TRIPLES", "EP-WRITER"], params=CUR_REOPEN,
  sources=["wiki/research/presence-reference-deletion-requirements-v1.md (Temporal references row)", "packages/core/src/Constraint.ts"],
  notes="Temporal coverage against presence intervals is a separate, policy-pending contract (see G9.presence.explicit).")
O("G1.schema.release-derived-contracts", ["G1", "G10"], "Contracts derive from the active schema release",
  "Repository model types and native helper contracts are derived from the active ConfigStore release (Attribute/EntityType handles), not from hand-written TypeExpr; after a v1 -> v2 release the derived contracts change accordingly; every read reports the schema snapshot it used.",
  cases={"set": "CS-SCHEMA-RELEASE", "select": "all"}, oracle=["O-REPLAY", "O-SPEC"],
  ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  sources=["handoffs/claude-native/README.md:31-35", "lab/research/R6-xtdb-gap-analysis.md goal 1 and goal 10", "lab/research/R4-codebase-harness-map.md 1.4"])

# ---------------- Packet (cross-goal)
O("PKT.full142", ["G2", "G3", "G4", "G5", "G9"], "Native packet: 142 named executions in the lane language",
  "All 71 packet tasks run in current and reopened form (142 named executions) on the lane's native surface; every read substep is traced with the lane's language and only that language (a hybrid task counts for neither XTDB language); host post-processing is allowed only as a declared normalization step with no data access, recorded in the trace; answers equal expected_rows and O-EVT.",
  cases={"set": "CS-PKT71", "select": "all", "executions": 142}, oracle=["O-EVT"], ep=["EP-NATIVE"],
  params={"modes": ["current", "reopen"], "languagePurity": True},
  sources=["wiki/goals.md:20-23", "lab/reviews/plan-review-r1.codex.md finding 4", "lab/reviews/plan-review-r1.response.md decision 4", "lab/research/R6-xtdb-gap-analysis.md 2.2"])

# ---------------- Goal 2
O("G2.arith.int64-overflow", ["G2"], "int64 arithmetic is exact or a typed overflow",
  "On the repository and on supported native fragments, int64 +, -, *, unary minus, ABS and CAST from text are exact inside [-2^63, 2^63-1] and raise the specified typed overflow error outside it; no result wraps. Cases include values near 2^53, 2^59, 2^62 and 2^63.",
  cases={"set": "CS-NUMERIC", "select": "int64-scalar"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN, mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:10", "lab/research/R6-xtdb-gap-analysis.md goal 2 (scalar + and * use addExact)", "lab/research/R2-qlever-capabilities.md 4.1 (60-bit integers wrap)"])
O("G2.arith.binary64", ["G2"], "binary64 arithmetic and comparison are IEEE exact",
  "On the repository and supported native fragments, binary64 values and the results of +, -, *, / and comparisons are bit-exact IEEE 754 (including -0.0 and subnormals); NaN and infinities are never stored; division by zero and invalid casts follow O-ERR.",
  cases={"set": "CS-NUMERIC", "select": "binary64"}, oracle=["O-REPLAY", "O-ERR"],
  ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN, mutants=["M-NEGZERO"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:10", "lab/research/R2-qlever-capabilities.md 4.1 (49-bit mantissa, 13 digits)"],
  grounding="derived", notes="Division-by-zero and invalid-cast semantics need a frozen rule in O-ERR; Triplex does not state one in the sources read.")
O("G2.expr.cross-family-comparison", ["G2"], "Comparisons across numeric families follow the specified rule",
  "Equality and order between int64 and binary64 values follow the specified exact rule (2^53+1 is not equal to 2^53 as binary64), and typed identities stay distinct (boolean true vs int64 1, text '1' vs int64 1) on the repository and supported native fragments.",
  cases={"set": "CS-NUMERIC", "select": "cross-family"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  sources=["testkit 'datalog equality predicates compare numeric values as numbers', 'datalog equality keeps identity bindings string-typed'", "lab/research/R2-qlever-capabilities.md 4.1 (comparison converts to double)"],
  grounding="derived")
O("G2.errors.typed-taxonomy", ["G2"], "Errors surface as the specified typed errors",
  "Every case of CS-ERRORS (invalid query text, unbound variable, contract decode mismatch, row limit exceeded, timeout, cancellation, unsupported-shape refusal, read-only refusal, unavailable cut, unknown scope) yields the specified typed error with the original cause retained, and never a success with partial rows.",
  cases={"set": "CS-ERRORS", "select": "all"}, oracle=["O-ERR"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  sources=["wiki/goals.md:10", "lab/research/R6-xtdb-gap-analysis.md goal 2 (no error taxonomy)", "lab/research/R4-codebase-harness-map.md 3.8"])
O("G2.strings.codepoint-supported", ["G2", "G10"], "Codepoint string order on the supported surfaces",
  "Repository queries and supported native fragments order, range-filter and page text in Unicode codepoint order: the frozen string-order-v1 arrays (ASCII A,E,c,z; original-cut continuation c,z; Unicode codepoint order; > U+E000) and the tiny collation control pass unchanged, current and reopen.",
  cases={"set": "CS-STR", "select": "supported"}, oracle=["O-STR", "O-COLL"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"), mutants=["M-ICU-ORDER"],
  sources=["wiki/goals.md:47-64", "wiki/problems/qlever-native-string-order.md", "lab/research/R5-qlever-semantic-blockers.md 3", "lab/research/R6-xtdb-gap-analysis.md goal 10"])
O("G2.strings.codepoint-raw", ["G2", "G10"], "Codepoint string order on the unrestricted raw surface",
  "The original raw counterexamples (tiny control `ORDER BY STR(?l) STR(?e)`, its two ranges, and the IRI page-sample class), and their SQL and XTQL ports over the documented raw dataset, return the codepoint answers of O-STR and O-COLL.",
  cases={"set": "CS-STR", "select": "raw"}, oracle=["O-STR", "O-COLL"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE"], params=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/goals.md:47-64", "lab/research/R5-qlever-semantic-blockers.md 1 and 5.5 (needs NoICU build or engine repair)", "handoffs/claude-native/START-HERE.md:28-34"],
  notes="For qlever-sparql this is expected to need engine repair (R5 S2 NoICU build). Whether raw STR order is inside the done condition is open question Q1 in REPORT.md; this contract keeps it required.")

# ---------------- Goal 3
O("G3.plan.explain", ["G3"], "Plans are captured for every query",
  "Every repository query and native read can return its engine plan and the Triplex route chosen (for example projection versus exact ledger path); the acceptance receipts for CS-QMIX record the plan of every executed query.",
  cases={"set": "CS-QMIX", "select": "all"}, oracle=["O-SPEC"], ep=["EP-EXPLAIN", "EP-REPO", "EP-NATIVE"],
  sources=["wiki/goals.md:11", "lab/research/R6-xtdb-gap-analysis.md goal 3 (no plan or cost capture)"])
O("G3.plan.access-path-at-scale", ["G3"], "Point and selective reads use key-bounded access at 10m",
  "At P-SCALE-10M the point, getMany, selective equality and reverse-reference classes, on the repository and in the lane language, resolve through a key-bounded access path named in the captured plan, and their latency does not grow with dataset size beyond the calibrated ratio between the 1m rung and 10m.",
  cases={"set": "CS-QMIX", "select": "point,getMany,selective-filter,reverse-ref"}, oracle=["O-REPLAY"],
  ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"], profile="P-SCALE-10M", closure=("CR-SCALE", "CR-PERF"),
  params={"thresholds": {"p99LatencyMsPerClass": "CALIBRATE", "latencyRatio10mOver1m": "CALIBRATE"}},
  sources=["wiki/goals.md:11", "lab/research/R1-xtdb-capabilities.md Q7 (only _id indexed)", "lab/reviews/plan-review-r1.codex.md finding 11"],
  grounding="derived")
O("G3.admission.preconstruction", ["G3"], "Expensive queries are refused before construction",
  "Every case of CS-ADMIT (reachability over its row or round budget, a SPARQL group with more EXISTS clauses than the planner budget allows, an unbounded cross product, a result beyond maxRows) is refused with the typed admission error before the engine builds the expensive structure: zero scratch rows or graphs created, no planner memory above the calibrated bound, and the engine stays available.",
  cases={"set": "CS-ADMIT", "select": "all"}, oracle=["O-ERR", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"],
  profile="P-HEAVY", closure=("CR-PASS-ALL", "CR-OBSERVE"), params={"thresholds": {"plannerMemoryBytes": "CALIBRATE"}},
  sources=["wiki/goals.md:11", "lab/reviews/plan-review-r1.codex.md finding 1", "lab/research/R6-xtdb-gap-analysis.md goal 3", "lab/research/R2-qlever-capabilities.md 3.3, 6.5"])
O("G3.cost.budget-honored", ["G3"], "Admitted queries stay inside their declared budget",
  "Every admitted query records its estimated cost and its actual rows, memory and time; on CS-QMIX at P-SCALE-10M no admitted query exceeds its declared budget, and a query whose actual cost crosses the budget is stopped at the budget with a typed error rather than run to completion.",
  cases={"set": "CS-QMIX", "select": "all"}, oracle=["O-OBS", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-EXPLAIN"],
  profile="P-SCALE-10M", closure=("CR-PASS-ALL", "CR-OBSERVE"),
  sources=["wiki/goals.md:11 (costing)"], grounding="derived")
O("G3.recursion.scalable", ["G3"], "Recursion is correct and bounded on every topology at scale",
  "Recursive reads over chain, tree, diamond, cycle, high-fanout and skewed-hotset topologies (including a 100k-edge chain of depth 50) return O-REPLAY answers in the lane language (XTQL authors its own rounds, no SQL), record rounds and engine transactions per read, leave zero scratch residue, and meet the calibrated latency at the 1m rung and at P-SCALE-10M.",
  cases={"set": "CS-RECURSION-TOPO", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"],
  profile="P-SCALE-10M", closure=("CR-PASS-ALL", "CR-PERF"), params={"thresholds": {"p99LatencyMsPerTopology": "CALIBRATE"}},
  sources=["wiki/goals.md:11", "qualification/benchmark-contract.json topologies", "lab/research/R6-xtdb-gap-analysis.md goal 3"])

# ---------------- Goal 4
O("G4.neg.correlated-not-exists", ["G4"], "Correlated negation is correct on the supported surfaces",
  "The flat and nested correlated NOT EXISTS controls (two revision rows and a later-order relation, expected only `two`), and their EXISTS, MINUS and OPTIONAL plus !BOUND variants and the latest-revision case, return the O-SHAPE answers through the repository and supported native fragments in the lane language.",
  cases={"set": "CS-SHAPE", "select": "negation"}, oracle=["O-SHAPE", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"), mutants=["M-DECORRELATE"],
  sources=["wiki/problems/native-correlation.md", "lab/research/R5-qlever-semantic-blockers.md 1, 5.4", "lab/research/R6-xtdb-gap-analysis.md experiment 5"])
O("G4.neg.correlated-not-exists-raw", ["G4"], "Correlated negation is correct on the unrestricted raw surface",
  "The original raw correlated NOT EXISTS controls (flat and nested, unedited text) and their SQL and XTQL ports over the documented raw dataset return only `two`.",
  cases={"set": "CS-SHAPE", "select": "negation-raw"}, oracle=["O-SHAPE"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE"], params=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/problems/native-correlation.md", "lab/research/R5-qlever-semantic-blockers.md 5.5 (C5 engine patch)", "lab/reviews/plan-review-r1.codex.md finding 14"],
  notes="For qlever-sparql this needs an engine repair (R5 C5). Open question Q1 in REPORT.md.")
O("G4.cut.task-wide-fixed", ["G4", "G9"], "One cut per multi-call task under a concurrent writer",
  "Each multi-call task pins one captured position for all its calls; a writer committed between two calls of a task does not change that task's answer; the next task sees the writer; explicit earlier cuts inside a task never exceed the task position.",
  cases={"set": "CS-PKT-MULTICALL", "select": "all"}, oracle=["O-EVT", "O-REPLAY"], ep=["EP-NATIVE"],
  profile="P-TINY-CONC", params=CUR_REOPEN, mutants=["M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/research/R6-xtdb-gap-analysis.md finding 1, 2.6, experiment 2", "packages/qualification/experiments/qlever-task-basis.ts"])
O("G4.neg.conflict-not-false-absence", ["G4", "G5"], "Conflicts never read as absence",
  "With enforcement off, for every case of CS-CONFLICT (equal duplicates, unequal duplicates, overlapping intervals, partial repair, retirement of the last remaining support) the repository raises the typed conflict outcome on read; repository filters, joins, aggregates and negation never report a definite absence or a single value for a conflicted attribute; the documented native and raw recipes return the conflict indicator or the full value set.",
  cases={"set": "CS-CONFLICT", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], params=CUR_REOPEN,
  mutants=["M-CONFLICT-PICK", "M-DROPPED-SUPPORT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/reviews/plan-review-r1.codex.md finding 13", "lab/reviews/plan-review-r1.response.md B4"],
  grounding="derived", notes="The raw half depends on the B4 representation still under review round 2.")

# ---------------- Goal 5
O("G5.agg.shape-controls", ["G5"], "Aggregate edge shapes keep their specified answers",
  "An empty maximum group stays absent, a grouped empty SUM produces no row, an ungrouped empty sum follows the packet rule (COALESCE to 0 where the task says so), and tied int64-maximum winners are all kept, on the repository and supported native fragments.",
  cases={"set": "CS-SHAPE", "select": "aggregate"}, oracle=["O-SHAPE", "O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  closure=("CR-COUNTEREXAMPLE",),
  sources=["wiki/problems/native-correlation.md (three passing edge controls)", "lab/research/R6-xtdb-gap-analysis.md goal 5"])
O("G5.agg.full-support", ["G5"], "Aggregates count supports, not deduplicated values",
  "Aggregates over duplicate-valued assertions follow the specified set, pair and witness semantics (equal values on two assertions, the same value on two entities, RDF plain-triple deduplication): counts and sums equal O-REPLAY on the repository and supported native fragments.",
  cases={"set": "CS-SUPPORT", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  mutants=["M-DROPPED-SUPPORT", "M-IDENTITY-COLLAPSE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:13", "testkit 'datalog aggregates preserve duplicate rows and define empty and distinct results'", "lab/reviews/plan-review-r1.codex.md finding 13"])
O("G5.agg.typed-groups", ["G5"], "Group keys keep typed identity",
  "Group keys and HAVING comparisons keep typed identity (boolean true, int64 1, binary64 1.0 per the specified rule, text '1' are distinct groups) on the repository and supported native fragments.",
  cases={"set": "CS-NUMERIC", "select": "groups"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  sources=["wiki/goals.md:13", "testkit 'datalog having preserves typed group and aggregate equality'"])
O("G5.agg.exact-overflow", ["G5"], "Aggregate overflow is exact or a typed error",
  "SUM and AVG over int64 inputs whose exact total leaves [-2^63, 2^63-1], and totals that cross +/-2^59, return the exact value or the specified typed overflow error on the repository and supported native fragments; never a wrapped value.",
  cases={"set": "CS-NUMERIC", "select": "int64-aggregate"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  mutants=["M-INT64-ROUND"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:13", "lab/research/R6-xtdb-gap-analysis.md finding 2 (LongVector SUM wraps)", "lab/research/R2-qlever-capabilities.md 4.1"])

# ---------------- Goal 6
O("G6.cancel.observed-drain", ["G6"], "Native cancellation is observed down to drained engine work",
  "Cancelling a genuinely long read in the lane language produces evidence for every O-OBS level joined to one request: caller settlement, transport cancellation sent and acknowledged, the engine no longer running that statement within the calibrated bound, and healthy reuse of the same connection.",
  cases={"set": "CS-CANCEL", "select": "read"}, oracle=["O-OBS"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"],
  profile="P-HEAVY", closure=("CR-OBSERVE",), params={"thresholds": {"drainBoundMs": "CALIBRATE"}},
  sources=["wiki/goals.md:14", "wiki/problems/cancellation-observation-levels.md", "lab/research/R6-xtdb-gap-analysis.md goal 6", "lab/research/R2-qlever-capabilities.md 6.4"])
O("G6.deadline.enforced", ["G6"], "Deadlines are enforced end to end",
  "A read that exceeds its timeoutMs returns the typed timeout within the deadline plus the calibrated grace, and the engine work drains as in G6.cancel.observed-drain; a non-interruptible engine operation (for example a QLever sort) is either prevented by admission or drained within the bound.",
  cases={"set": "CS-CANCEL", "select": "deadline"}, oracle=["O-OBS", "O-ERR"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"],
  profile="P-HEAVY", closure=("CR-OBSERVE",), params={"thresholds": {"deadlineGraceMs": "CALIBRATE", "drainBoundMs": "CALIBRATE"}},
  sources=["wiki/goals.md:14", "lab/research/R2-qlever-capabilities.md 6.4"])
O("G6.cancel.preaborted-no-work", ["G6"], "A pre-aborted request does no engine work",
  "A request cancelled before dispatch issues zero engine statements, observed engine-side, and returns the typed cancellation.",
  cases={"set": "CS-CANCEL", "select": "preaborted"}, oracle=["O-OBS", "O-ERR"], ep=["EP-NATIVE", "EP-REPO", "EP-ENGINE-OBS"],
  closure=("CR-OBSERVE",),
  sources=["lab/research/R6-xtdb-gap-analysis.md goal 6 (native-query.test.ts)", "packages/qlever/experiments/native-entry.ts unavailable-cut-and-preaborted-query-reject"])
O("G6.cleanup.scratch-zero", ["G6"], "No scratch residue after reads, cancels and crashes",
  "After normal reads, after cancellation in the middle of a recursion round, and after engine crash, restart and documented recovery, every scratch relation of the lane (XTDB tx_native_relations, tx_native_relation_attempts, tx_query_relations, constraint scratch; QLever native scratch and receipt graphs and derived nodes) holds zero rows for finished work, and every working-outcome-unknown is resolved.",
  cases={"set": "CS-SCRATCH", "select": "all"}, oracle=["O-OBS"], ep=["EP-NATIVE", "EP-REPO", "EP-RESOLVE", "EP-ENGINE-OBS"],
  profile="P-FAULT", closure=("CR-FAULT",), params={"repetitionsPerFaultPoint": 3},
  sources=["lab/research/R6-xtdb-gap-analysis.md finding 4, goal 6", "lab/research/R4-codebase-harness-map.md 3.1, 4.1"])
O("G6.ownership.bounded-connections", ["G6"], "Connections and engine work are bounded and released",
  "Engine connections per process never exceed the declared pool caps, across 100 open-use-close cycles and under 1024 logical clients; after close the engine-side connection count returns to its baseline and no background work continues.",
  cases={"set": "CS-LIFECYCLE", "select": "bounds"}, oracle=["O-OBS"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"],
  closure=("CR-OBSERVE",),
  sources=["wiki/goals.md:14", "wiki/problems/load-liveness.md (separate pools, default 20 connections)", "lab/reviews/plan-review-r1.codex.md finding 2 (logical clients versus connections)"])
O("G6.resource.memory-failure-contained", ["G6"], "A resource failure does not take the engine down",
  "A read that would exceed the engine's memory budget is refused or fails with a typed error; writes and other reads keep working within the calibrated window without a manual restart; any restart the design needs is the documented recovery path and is counted in the receipt.",
  cases={"set": "CS-ADMIT", "select": "memory"}, oracle=["O-OBS", "O-ERR"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"],
  profile="P-HEAVY", closure=("CR-OBSERVE",), params={"thresholds": {"availabilityWindowMs": "CALIBRATE"}},
  sources=["wiki/problems/recovery.md (2GiB read OOM, ingestion unavailable)", "wiki/problems/qlever-planner-memory.md", "lab/research/R2-qlever-capabilities.md 6.5"])

# ---------------- Goal 7
O("G7.write.atomic", ["G7"], "Commands are all-or-nothing on every access path",
  "Every multi-operation command in CS-WRITE and every fault point in CS-FAULT that targets a write leaves either the complete command or nothing, as seen through every listed access path (XTDB _id lookup and column predicate; QLever subject, predicate-object and object scans); a later successful write never publishes a partial earlier one.",
  scope="engine", cases={"set": "CS-WRITE", "select": "atomic"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-RAW-WIRE"],
  profile="P-FAULT", closure=("CR-PASS-ALL", "CR-FAULT"), params={"repetitionsPerFaultPoint": 3},
  sources=["wiki/goals.md:15", "lab/reviews/plan-review-r1.codex.md finding 7", "lab/research/R2-qlever-capabilities.md 1.8 probes A and B"])
O("G7.write.command-idempotency", ["G7"], "A command id commits at most once",
  "A duplicate commandId, sequentially and in a 16-way concurrent race, commits exactly once; every other attempt gets CommandAlreadyCommitted with the original transaction id; transactionByCommand returns that transaction.",
  scope="engine", cases={"set": "CS-WRITE", "select": "idempotency"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"],
  profile="P-TINY-CONC", params=CUR_REOPEN, mutants=["M-CLAIM-IGNORED"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["handoffs/claude-native/README.md:41", "lab/research/R4-codebase-harness-map.md 3.4, 4.4", "packages/qlever/test/storage.test.ts (16-way command test)"])
O("G7.write.preconditions-cas", ["G7"], "Preconditions and concurrency never lose an update",
  "TripleLive and EntityState preconditions reject stale commands with TransactionConflictError; under concurrent conflicting writers no acknowledged update is lost and replay-safe retries produce the O-REPLAY final state.",
  scope="engine", cases={"set": "CS-WRITE", "select": "preconditions"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-TRIPLES", "EP-WRITER"],
  profile="P-TINY-CONC", params=CUR_REOPEN,
  sources=["lab/research/R4-codebase-harness-map.md 2.3, 3.5"])
O("G7.receipt.journal-complete", ["G7"], "Receipts and journal are complete and ordered",
  "Every acknowledged command has a transaction record whose position, instant, actor, commandId, correlationId, causationId, configSnapshot and ordered changes equal O-REPLAY; journal entries cannot be retracted through ordinary writes; reserved namespaces reject ordinary writes atomically; every ACK has a durable operation receipt.",
  scope="engine", cases={"set": "CS-WRITE", "select": "receipts"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-RESOLVE"],
  params=CUR_REOPEN_RESTART, mutants=["M-JOURNAL-ORDER"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["handoffs/claude-native/README.md:41", "lab/research/R9-core-plumbing.md (journal tier)", "lab/reviews/plan-review-r1.codex.md finding 10", "testkit cases 29-32, 34, 36, 39"])
O("G7.write.unknown-outcome", ["G7"], "Unknown write outcomes resolve before any retry",
  "When the client is killed after submit, the connection drops during commit, or the engine times out the request, the caller gets the typed unknown-outcome error with its operation id; resolution through the operation id returns a definitive committed or absent outcome; no retry happens before resolution; the final state holds the command exactly once or not at all.",
  scope="engine", cases={"set": "CS-FAULT", "select": "lost-ack"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-RESOLVE"],
  profile="P-FAULT", closure=("CR-FAULT",), params={"repetitionsPerFaultPoint": 3},
  sources=["handoffs/claude-native/START-HERE.md:35-43", "lab/research/R4-codebase-harness-map.md 3.7, 4.4", "lab/research/R2-qlever-capabilities.md 1.8 probe C"])
O("G7.recovery.crash-restart", ["G7"], "Crash, restart and re-read of every old cut",
  "For every engine fault point in CS-FAULT (XTDB during COMMIT SYNC, after commit before ACK, mid recursion round; QLever between permutation mutations, after persistence before snapshot publication, during index rebuild, during projection maintenance), after restart and the documented recovery: every ACKed command is present, every unACKed command is resolved, every frozen cut re-reads identically through the repository, the native surface in every language of the engine, and the raw recipe, and all access paths agree.",
  scope="engine", cases={"set": "CS-FAULT", "select": "engine-crash"}, oracle=["O-REPLAY"],
  ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-WIRE", "EP-RESOLVE"], profile="P-FAULT",
  closure=("CR-FAULT",), params={"repetitionsPerFaultPoint": 3, "ackedCommandsLostMax": 0},
  sources=["wiki/goals.md:15", "lab/reviews/plan-review-r1.codex.md finding 7", "lab/reviews/plan-review-r1.response.md B1", "lab/research/R6-xtdb-gap-analysis.md experiment 10"])
O("G7.recovery.backup-restore", ["G7"], "Backup and restore reproduce every read",
  "A stopped backup and a restore into a fresh engine reproduce every frozen cut on every surface, and the restored engine accepts new writes at the next position.",
  scope="engine", cases={"set": "CS-FAULT", "select": "backup-restore"}, oracle=["O-REPLAY"],
  ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"], profile="P-FAULT", closure=("CR-PASS-ALL",),
  sources=["qualification/benchmark-contract.json separatePhases (backup, restore)", "lab/research/R6-xtdb-gap-analysis.md goal 7 (recovery.mjs)"],
  grounding="derived")
O("G7.migration.schema-evolution", ["G7", "G10"], "Schema evolution with live data, concurrent clients and resumable backfill",
  "For each case of CS-MIGRATION (add an optional attribute, add a constraint over existing data, change an attribute's type-version, move an attribute to a new physical mapping), with old and new clients running concurrently: reads at bases before the release use the old mapping and after it the new one, a backfill killed midway resumes to the O-REPLAY final state, old cursors continue or fail with the typed cursor error, and history is preserved.",
  cases={"set": "CS-MIGRATION", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-NATIVE"],
  profile="P-TINY-CONC", params=CUR_REOPEN_RESTART,
  sources=["wiki/goals.md:15", "lab/reviews/plan-review-r1.codex.md finding 12", "lab/reviews/plan-review-r1.response.md decision 12"])
O("G7.migration.valid-writes-never-rejected", ["G7"], "Valid Triplex writes are never rejected for the physical design",
  "Every write that O-REPLAY classifies as valid Triplex (untyped facts, facts without entityType, values that violate a projection column type, writes during a migration) is accepted, and every surface still reads it correctly.",
  scope="engine", cases={"set": "CS-MIGRATION", "select": "valid-writes"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-WRITER", "EP-REPO", "EP-NATIVE"],
  params=CUR_REOPEN,
  sources=["lab/reviews/plan-review-r1.codex.md finding 12", "lab/reviews/plan-review-r1.response.md decision 12", "lab/NOTEBOOK.md R9 decisions (never reject a valid write)"])

# ---------------- Goal 8
O("G8.publish.coherent", ["G8"], "Every read sees one coherent publication",
  "Under concurrent commit groups, every read's answer equals O-REPLAY at the basis the read returned; no read mixes two publications of ledger, projection, schema or index state; delayed maintenance never yields an answer inconsistent with the returned basis.",
  cases={"set": "CS-PUBLISH", "select": "coherence"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"],
  profile="P-TINY-CONC", mutants=["M-STALE-PROJECTION"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:16", "lab/reviews/plan-review-r1.codex.md finding 8", "lab/reviews/plan-review-r1.response.md B2"])
O("G8.publish.basis-honesty", ["G8"], "Requested bases are honored and returned bases are true",
  "A read at a requested basis is answered at exactly that basis or fails with a typed error, never silently at another; the returned basis is the basis used; after a command is ACKed at position P, the writing client's next latest-basis read returns a basis at or after P.",
  cases={"set": "CS-PUBLISH", "select": "basis"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-TRIPLES"],
  profile="P-TINY-CONC", mutants=["M-STALE-PROJECTION", "M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/reviews/plan-review-r1.codex.md finding 8 (ACK and read-your-writes)", "handoffs/claude-native/README.md:43-48"])
O("G8.publish.valid-boundary", ["G8", "G9"], "Valid-time boundaries take effect without new writes",
  "When a fact's validFrom or validTo boundary passes with no new command, reads at valid instants beyond the boundary reflect it on every surface, both before and after any maintenance the design runs.",
  cases={"set": "CS-PUBLISH", "select": "boundary"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"],
  profile="P-TINY-CONC", mutants=["M-HALF-OPEN", "M-STALE-PROJECTION"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/reviews/plan-review-r1.codex.md finding 8 (valid-time boundaries without commands)"])
O("G8.reuse.bounded-keyed", ["G8"], "Reuse is bounded, correctly keyed and invalidated",
  "Every reused derived result (closures, maintained queries, projection segments, caches) is keyed by scope, position, recorded and valid time, definition hash and schema release; its size stays within the declared cap; answers equal a run with reuse disabled; an affecting write invalidates it for later bases; hit rate and rebuild cost are recorded.",
  cases={"set": "CS-REUSE", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profile="P-TINY-CONC",
  mutants=["M-STALE-REUSE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:16", "lab/research/R6-xtdb-gap-analysis.md goal 8 (nothing proven for native)"])
O("G8.support.alternate-maintained", ["G8"], "Maintained supports survive partial retraction",
  "Removing one of two supports keeps a derived fact; removing the last support removes it; this holds for packet workload 20 and for CS-SUPPORT-DAG (depth beyond 3, at least 1,000 nodes, incremental deletions), and for two identical assertions where one is retracted.",
  cases={"set": "CS-SUPPORT-DAG", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], params=CUR_REOPEN,
  mutants=["M-DROPPED-SUPPORT"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:16", "lab/research/R6-xtdb-gap-analysis.md 2.2 (workload 20 length-3 bound)", "lab/reviews/plan-review-r1.codex.md finding 13"])
O("G8.support.maintenance-cost", ["G8", "S"], "Maintenance cost and lag are measured and bounded",
  "At the 1m rung and at P-SCALE-10M, engine rows or triples written per domain fact (ledger, projection, journal, indexes separately), maintenance work per valid-time boundary and maintenance lag are recorded, and lag stays within the load contract's freshness bound.",
  cases={"set": "CS-SCALE-SAMPLE", "select": "maintenance"}, oracle=["O-OBS"], ep=["EP-ENGINE-OBS", "EP-REPO"],
  profile="P-SCALE-10M", closure=("CR-METRICS", "CR-PERF"), params={"thresholds": {"maintenanceLagMs": "load-contract.freshnessBoundMs"}},
  sources=["wiki/goals.md:16", "handoffs/claude-native/README.md:123-127 (write amplification separately)"])

# ---------------- Goal 9
O("G9.temporal.half-open-intervals", ["G9"], "Half-open valid intervals on every surface",
  "Valid intervals are [validFrom, validTo) with null meaning open-ended, exact at fractional-millisecond boundaries and at the boundary instants themselves, for every surface, current, reopen and engine restart.",
  cases={"set": "CS-TEMPORAL", "select": "valid"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"],
  params=CUR_REOPEN_RESTART, mutants=["M-HALF-OPEN"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["handoffs/claude-native/README.md:46-48", "lab/research/R6-xtdb-gap-analysis.md 2.5 (half-open boundary checks)"])
O("G9.temporal.recorded-cuts", ["G9"], "Recorded-time and position cuts are exact",
  "Reads by recordedAt between commits, at an instant shared by two distinct commits, at interior positions of a nested multi-position transaction, after corrections, and around aborted transactions (before and after) equal O-REPLAY; ordinary reads take R and V only, exact P appears only in native contracts and pagination; any mapping to engine time is proven by these cases before use.",
  cases={"set": "CS-TEMPORAL", "select": "recorded"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"],
  profile="P-TINY-CONC", params=CUR_REOPEN_RESTART, mutants=["M-CUT-OFF-BY-ONE"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["handoffs/claude-native/README.md:43-48", "lab/reviews/plan-review-r1.codex.md finding 6", "lab/reviews/plan-review-r1.response.md decision 6", "lab/research/R1-xtdb-capabilities.md Q1"])
O("G9.history.raw-lifetime-compat", ["G9"], "Ordinary history keeps the raw lifetime contract",
  "Ordinary Triples.history, match, entity and entities keep their raw assertion-lifetime contract (complete retractedAt, retractedPosition and retractTxId) exactly as O-REPLAY computes it; no global mask is applied.",
  scope="engine", cases={"set": "CS-HAM9", "select": "raw-lifetime"}, oracle=["O-REPLAY", "O-HAM"], ep=["EP-TRIPLES"], params=CUR_REOPEN,
  mutants=["M-MASK-RAW"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["handoffs/claude-native/README.md:46-48", "qualification/capacity/historical-assertion-metadata-v1/reproducers.json resultContract.rawLifetimeCompatibility"])
O("G9.history.snapshot-metadata", ["G9"], "As-of snapshots hide retirements not yet known",
  "The five failing tiny-v4 checks, the finite-nine fixture and the same-R control pass through the repository timeline and as-of reads and through the native history helpers in the lane language: retirement fields are null until the retirement is known at the cut (R and P) and equal O-REPLAY after.",
  cases={"set": "CS-CFG8", "select": "retirement-metadata-target", "also": "CS-HAM9"}, oracle=["O-CFG8", "O-HAM", "O-REPLAY"],
  ep=["EP-REPO", "EP-NATIVE"], profile="P-TINY-CONC", params=CUR_REOPEN,
  mutants=["M-FUTURE-RETIREMENT"], closure=("CR-COUNTEREXAMPLE", "CR-MUTANT-KILL"),
  sources=["wiki/goals.md:17", "lab/research/R6-xtdb-gap-analysis.md 3.1", "qualification/reviews/configured-entity-xtdb-tiny-v4-terminal-independent.json"])
O("G9.corrections.preserve", ["G9"], "Corrections preserve what was previously recorded",
  "A correction (retract plus assert) keeps the earlier value visible at earlier recorded cuts and both versions in history, on every surface, current, reopen and restart.",
  cases={"set": "CS-TEMPORAL", "select": "corrections"}, oracle=["O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"],
  params=CUR_REOPEN_RESTART,
  sources=["wiki/goals.md:17", "testkit 'historical corrections preserve what was previously recorded'"])
O("G9.lineage.supporting-assertions", ["G9"], "Answers trace to their supporting assertions",
  "Every repository read and native helper row can return the ids and transaction ids of the assertions that support it, and they equal O-REPLAY's supports; packet lineage tasks (workload 16) are covered by PKT.full142.",
  cases={"set": "CS-ENTITY", "select": "lineage"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN,
  sources=["wiki/goals.md:17 (proof lineage)", "handoffs/claude-native/README.md:34 (assertion identity)"],
  grounding="derived", notes="'Proof lineage' is read here as assertion-level provenance; confirm (open question Q6).")
O("G9.presence.explicit", ["G9"], "Presence follows a frozen policy",
  "Explicit presence facts toggled true -> false -> true preserve domain facts and reference targets; configured-entity membership at a cut follows the frozen presence policy on every surface.",
  cases={"set": "CS-PRESENCE-DELETE", "select": "presence", "also": "CS-CFG8"}, oracle=["O-REPLAY", "O-CFG8"],
  ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH"], params=CUR_REOPEN,
  sources=["wiki/research/presence-reference-deletion-requirements-v1.md", "qualification/capacity/configured-entities-v1/CONTRACT.md"],
  grounding="policy-pending", notes="Triplex has no presence policy; the convention part is grounded in configured-eight, the policy is not.")
O("G9.deletion.entity", ["G9"], "Entity deletion keeps its contract and history",
  "The existing delete contract holds (retract the entity's current facts in one command, reject scheduled facts, retain history), and interval-local deletion follows the frozen deletion policy with preserved history and replay and reopen evidence.",
  cases={"set": "CS-PRESENCE-DELETE", "select": "deletion"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-TRIPLES"], params=CUR_REOPEN_RESTART,
  sources=["wiki/research/presence-reference-deletion-requirements-v1.md (Entity deletion row)"],
  grounding="policy-pending")
O("G9.cascade.restrict-detach-cascade", ["G9"], "Restrict, detach and bounded cascade",
  "Restrict, detach and bounded reverse cascade follow the frozen cascade policy: deterministic receipts, bounded newly removed endpoints, legal cycles that do not seed deletion, alternate supports, and atomic refusal when a cascade exceeds its budget.",
  cases={"set": "CS-PRESENCE-DELETE", "select": "cascade"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-WRITER"], params=CUR_REOPEN,
  sources=["wiki/research/presence-reference-deletion-requirements-v1.md (Restrict, detach and cascade row)", "wiki/goals.md:17"],
  grounding="policy-pending")

# ---------------- Goal 10
O("G10.pkg.clean-consumer-slice", ["G10"], "Packaged vertical slice in a clean consumer",
  "From packed tarballs in a clean consumer outside the workspace: a write, a repository read, an authored native read in the lane language, history, a receipt, a cursor continuation and a reopen all equal O-REPLAY against the lane engine; the CLI inspects the same database and reports the same data.",
  cases={"set": "CS-SLICE", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-PKG", "EP-CLI"], params=CUR_REOPEN,
  sources=["wiki/goals.md:18", "lab/reviews/plan-review-r1.response.md B5 step 6", "wiki/status.md:127"],
  notes="Whether the CLI must support XTDB and QLever is open question Q7.")
O("G10.pkg.type-witnesses", ["G10", "R"], "Public types are derived from the schema",
  "Against the packed public declarations: Repository<Model> types derive from EntityType (unknown attribute key is a compile error, cardinality-many is an array, absent optional is a missing property, int64 is the tagged integer type, refs carry their target type), and native contract types derive from schema handles; every positive witness compiles and every negative witness fails.",
  cases={"set": "CS-TYPEWITNESS", "select": "all"}, oracle=["O-SPEC"], ep=["EP-PKG"], profile="P-STATIC", closure=("CR-STATIC",),
  sources=["lab/NOTEBOOK.md decision D5", "lab/research/R3-artifacts/api-sketch.ts", "wiki/status.md:30-37 (public type witnesses)"])
O("G10.scope.isolation", ["G10"], "Scopes never leak",
  "Two scopes on one engine with identical entity ids: the repository, the native helpers and the documented raw recipe for each scope return only that scope's data, current and reopen.",
  cases={"set": "CS-SCOPE", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-RAW-HATCH", "EP-RAW-WIRE"], params=CUR_REOPEN,
  mutants=["M-SCOPE-LEAK"], closure=("CR-PASS-ALL", "CR-MUTANT-KILL"),
  sources=["lab/reviews/plan-review-r1.codex.md finding 9", "lab/reviews/plan-review-r1.response.md B3", "packages/qlever/experiments/native-entry.ts scope-isolation"])
O("G10.cursor.stable", ["G10"], "Cursors are complete, snapshot-stable and cheap",
  "Cursor pages are deterministic and traverse the complete snapshot with no duplicate or skipped row under concurrent writes; a cursor issued at P1 continues at P1 after the publication advances; historical cursors intersect recorded time; at P-SCALE-10M page 10,000 costs no more than the calibrated multiple of page 1.",
  cases={"set": "CS-CURSOR", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-TRIPLES"],
  profile="P-TINY-CONC", closure=("CR-PASS-ALL", "CR-PERF"), params={"modes": ["current", "reopen"], "thresholds": {"deepPageCostRatio": "CALIBRATE"}},
  mutants=[], sources=["testkit cursor cases", "lab/reviews/plan-review-r1.codex.md finding 8", "lab/research/R6-xtdb-gap-analysis.md goal 10 (OFFSET is O(offset))"])
O("G10.cursor.compatibility", ["G10"], "Cursors survive restarts, releases and rebuilds",
  "A cursor issued before an engine restart, a client reopen, a schema release change or a projection rebuild either continues correctly or fails with the typed cursor error naming the reason; it never returns rows from another basis.",
  cases={"set": "CS-CURSOR", "select": "compatibility"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-REPO", "EP-NATIVE"], params=CUR_REOPEN_RESTART,
  sources=["lab/reviews/plan-review-r1.codex.md finding 1 (cursor compatibility)", "lab/reviews/plan-review-r1.response.md decision 12 (old cursors route to the ledger)"])
O("G10.capabilities.truthful", ["G10"], "Advertised capabilities are true",
  "Every capability the runtime advertises has a passing case and every capability it does not advertise is refused with a typed error; the advertised set equals the lane's EXACT rows of the capability matrix.",
  cases={"set": "CS-CAPS", "select": "all"}, oracle=["O-ERR", "O-REPLAY"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE"],
  sources=["wiki/goals.md:18", "lab/research/R6-xtdb-gap-analysis.md goal 10 (Capabilities.none)"])
O("G10.lifecycle.open-close", ["G10"], "Open, close and reopen are clean",
  "initialize is idempotent across restarts, close releases every connection and background task (engine-side observed), the native provider shares or declares its pool, and reopen after close works.",
  cases={"set": "CS-LIFECYCLE", "select": "lifecycle"}, oracle=["O-OBS"], ep=["EP-TRIPLES", "EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"],
  closure=("CR-OBSERVE",),
  sources=["wiki/goals.md:18", "wiki/problems/load-liveness.md", "lab/research/R4-codebase-harness-map.md 2.1 (initialize on every start)"])
O("G10.native.entry-checks", ["G10"], "Native entry checks in the lane language",
  "The native entry checks pass fresh, current and reopen, with every read check executed in the lane's language (XTQL versions of the SQL-only checks for xtdb-xtql, SQL versions of the XTQL-only checks for xtdb-sql, the 11 SPARQL checks for qlever-sparql).",
  cases={"set": "CS-ENTRY", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-NATIVE"], params={"modes": ["current", "reopen"], "languagePurity": True},
  sources=["lab/research/R6-xtdb-gap-analysis.md 2.5", "lab/research/R4-codebase-harness-map.md 5.4"])
O("G10.native.read-only-and-safe-params", ["G10"], "Native reads cannot write and parameters cannot inject",
  "Native read surfaces refuse every write form (multi-statement, modifying CTE, SPARQL UPDATE, comment-boundary escapes) with a typed error and no engine mutation, including recursion helpers under a read-only role; bound parameters containing quote, $$, ; and newlines are data.",
  cases={"set": "CS-ENTRY", "select": "read-only,safe-parameters"}, oracle=["O-ERR", "O-OBS"], ep=["EP-NATIVE", "EP-ENGINE-OBS"], params=CUR_REOPEN,
  sources=["lab/research/R6-xtdb-gap-analysis.md finding 4, 2.5", "packages/xtdb/src/native/ReadOnlySql.ts"])

# ---------------- R
O("R.repo.entity-suite", ["R"], "Entity suite against the independent oracle",
  "Every case of CS-ENTITY (section 6.4) passes through the repository and writer on the lane: all eight types, cardinality one and many, optional, refs and includes, history and timeline, corrections, conflicts with enforcement off, presence, at current and past bases, current, reopen and engine restart; expected answers come only from O-REPLAY.",
  cases={"set": "CS-ENTITY", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER"], params=CUR_REOPEN_RESTART,
  sources=["lab/PLAN.md 1 (done condition item 4)", "lab/reviews/plan-review-r1.codex.md finding 5", "lab/reviews/plan-review-r1.response.md decision 5"])
O("R.repo.mutation-controls", ["R"], "The entity and history suites kill every mutant",
  "Each mutation control in the catalog makes at least one case of CS-ENTITY, CS-TEMPORAL or CS-HAM9 fail on the lane, with oracle and case files unchanged.",
  cases={"set": "CS-ENTITY", "select": "all", "also": "CS-TEMPORAL,CS-HAM9"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-WRITER", "EP-NATIVE"],
  closure=("CR-MUTANT-KILL",), mutants=list(MUTANTS.keys()),
  sources=["lab/reviews/plan-review-r1.codex.md finding 5", "lab/reviews/plan-review-r1.response.md decision 5", "lab/experiments/EXP-A01-acceptance-contract/BRIEF.md (mutation controls)"])
O("R.raw.parity", ["R"], "Raw queries return what the entity API returns",
  "For every query class of CS-RAW-RECIPES (point by id, attribute equality, range, order and page, ref join, reverse ref, anti-join, aggregate, history at a basis, interval at a valid instant, journal and receipt lookup), a raw query written only from the published raw-query guide returns the same answer as the repository at the same basis and as O-REPLAY, in the lane language, through both the raw hatch and direct wire access.",
  cases={"set": "CS-RAW-RECIPES", "select": "all"}, oracle=["O-REPLAY"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE", "EP-REPO"], params=CUR_REOPEN,
  sources=["lab/PLAN.md 1 (raw queries must make sense)", "lab/reviews/plan-review-r1.response.md B3 (raw-query dataset and scope contract)"])
O("R.raw.guide-only-authoring", ["R"], "Raw recipes are authored from the guide alone",
  "The raw recipes used by R.raw.parity were authored by an author whose inputs were only the raw-query guide and the engine's own documentation, recorded in an authoring manifest with input hashes.",
  cases={"set": "CS-RAW-RECIPES", "select": "all"}, oracle=[], ep=["EP-RAW-WIRE"], profile="P-STATIC", closure=("CR-PROVENANCE",),
  sources=["lab/PLAN.md 1 ('has never read Triplex source')"], grounding="derived",
  notes="Only partly machine-checkable: the manifest is checkable, the author's prior knowledge is not. Open question Q5.")
O("R.raw.capability-required-cells", ["R", "G2", "G10"], "Required capability cells are exact on the raw surface",
  "Every capability-matrix cell whose required-by list is non-empty is EXACT for the lane with a passing receipt; every KNOWN-LIMIT cell has an empty required-by list, keeps its original counterexample receipt and is documented in the raw-query guide.",
  cases={"set": "CS-CAPS", "select": "all"}, oracle=["O-REPLAY", "O-SHAPE", "O-STR"], ep=["EP-RAW-HATCH", "EP-RAW-WIRE", "EP-NATIVE", "EP-REPO"],
  closure=("CR-MATRIX",),
  sources=["lab/reviews/plan-review-r1.codex.md finding 14", "lab/reviews/plan-review-r1.response.md decision 14"])
O("R.native.fragment-equivalence", ["R", "G4"], "Helper fragments state and enforce their equivalence conditions",
  "Each supported native helper (correlation re-binding, order keys, conflict-aware fragments, recursion helpers) states its equivalence conditions; a static check refuses an authored query outside them with a typed error naming the condition; generated cases inside the conditions agree with O-REPLAY; a refusal never closes an obligation that requires the refused shape.",
  cases={"set": "CS-FRAGMENT-EQUIV", "select": "all"}, oracle=["O-REPLAY", "O-ERR"], ep=["EP-NATIVE"], params=CUR_REOPEN,
  sources=["lab/research/R5-qlever-semantic-blockers.md 5.4", "lab/reviews/plan-review-r1.codex.md finding 14"])

# ---------------- S
O("S.dataset.target-population", ["S"], "The target dataset exists and is counted",
  "One database scope holds 10,000,000 distinct application entities and 100,000,000 active representative domain facts written through public writes (representative profile, 10 facts per entity), and a second dataset holds 10,000,000 entities at 1 fact each (sparse profile); counts of configured entities, domain facts, structural facts, assertion versions and retirements, config facts, journal, claim and receipt metadata, maintenance relations and engine rows or triples are reported separately and match independent count queries and O-REPLAY analytic counts; every command is ACKed with a receipt and no outcome is unresolved.",
  scope="engine", cases={"set": "CS-SCALE-SAMPLE", "select": "counts"}, oracle=["O-REPLAY"], ep=["EP-WRITER", "EP-TRIPLES", "EP-NATIVE"],
  profile="P-SCALE-10M", closure=("CR-SCALE",),
  params={"distinctEntities": 10000000, "activeDomainFacts": 100000000, "profiles": ["representative-10", "sparse-1"], "singleScope": True},
  sources=["wiki/goals.md:40-46", "handoffs/claude-native/README.md:123-127", "qualification/benchmark-contract.json", "qualification/capacity/configured-entities-v1/CONTRACT.md", "qualification/load-waves/five-surface-point-rate16-v1/plan.json fixture.countMeaning"])
O("S.rungs.ladder", ["S"], "Each rung passes before the next opens",
  "Rungs 10k, 100k, 1m and 10m are climbed in order; each rung is admitted by capacity forecast and passes S.correctness.query-families before the next rung is admitted; a failing or blocked rung keeps S open.",
  cases={"set": "CS-SCALE-SAMPLE", "select": "per-rung"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profile="P-RUNG", closure=("CR-SCALE",),
  sources=["lab/PLAN.md 3.5", "qualification/capacity/configured-entities-v1/CONTRACT.md (admission stages)"])
O("S.correctness.query-families", ["S"], "All query families are correct at 10m",
  "At P-SCALE-10M, for both profiles, the nine query families (point, selective filter, join, anti-join, recursion, aggregate, historical, interval, pagination) run on deterministic sampled parameters and on complete-count queries, on the repository and in the lane language, and every answer equals O-REPLAY with zero tolerance.",
  cases={"set": "CS-SCALE-SAMPLE", "select": "families"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profile="P-SCALE-10M",
  closure=("CR-SCALE",), params={"samplesPerFamily": "CALIBRATE"},
  sources=["qualification/benchmark-contract.json queryFamilies", "qualification/capacity/configured-entities-v1/CONTRACT.md"])
O("S.capacity.admitted", ["S"], "Scale runs fit the admitted envelope",
  "Before each rung the run is admitted with a forecast of peak memory and disk that includes rebuild or compaction overlap, delta growth during rebuild, pre-GC growth, WAL, backups, replay peaks and host-side clients; observed peaks stay within the envelope; an over-budget rung is BLOCKED_CAPACITY and S stays open; no deletion of evidence or budget increase converts a failure into a pass.",
  scope="engine", cases={"set": "CS-SCALE-SAMPLE", "select": "capacity"}, oracle=["O-OBS"], ep=["EP-ENGINE-OBS"], profile="P-SCALE-10M",
  closure=("CR-SCALE",),
  sources=["qualification/benchmark-contract.json capacityRule", "lab/reviews/plan-review-r1.codex.md finding 15", "lab/reviews/plan-review-r1.response.md decision 15"])
O("S.metrics.reported", ["S"], "Scale metrics are measured and reported separately",
  "At each rung and at 10m: bytes per entity and per fact, write amplification (ledger, projection, journal, indexes separately), history separately, ingest rate, cold and warm latency p50, p90, p95 and p99 per family (at least 10,000 observations per qualified population), rebuild or compaction time, restart time, peak RSS per resource owner and peak disk.",
  cases={"set": "CS-SCALE-SAMPLE", "select": "metrics"}, oracle=["O-OBS"], ep=["EP-ENGINE-OBS", "EP-REPO", "EP-NATIVE"], profile="P-SCALE-10M",
  closure=("CR-METRICS",),
  sources=["qualification/benchmark-contract.json measurements", "handoffs/claude-native/README.md:123-127", "lab/PLAN.md 3.5"])
O("S.maintenance.correct-during", ["S", "G8"], "Maintenance at 10m keeps reads correct",
  "Compaction, index rebuild and projection maintenance at P-SCALE-10M complete, and reads during and after them equal O-REPLAY; their duration is recorded.",
  scope="engine", cases={"set": "CS-SCALE-SAMPLE", "select": "maintenance"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-ENGINE-OBS"],
  profile="P-SCALE-10M", closure=("CR-SCALE",),
  sources=["qualification/benchmark-contract.json separatePhases (maintenance)", "lab/research/R2-qlever-capabilities.md 1.7"])
O("S.restart.at-scale", ["S", "G7"], "Restart at 10m",
  "An engine restart at P-SCALE-10M becomes available within the recorded time and every sampled old cut re-reads identically.",
  scope="engine", cases={"set": "CS-SCALE-SAMPLE", "select": "restart"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE"], profile="P-SCALE-10M",
  closure=("CR-SCALE", "CR-METRICS"),
  sources=["qualification/benchmark-contract.json separatePhases (restart)"])
O("S.packet.coresident", ["S", "G3"], "The packet passes with the target dataset resident",
  "PKT.full142 passes in a separate scope on the engine that holds the P-SCALE-10M dataset, so the packet's plans are qualified at target scale.",
  cases={"set": "CS-PKT71", "select": "all", "executions": 142}, oracle=["O-EVT"], ep=["EP-NATIVE"], profile="P-SCALE-10M",
  params={"modes": ["current", "reopen"], "languagePurity": True},
  sources=["wiki/goals.md:11 (no target-scale plan qualification)"], grounding="derived")

# ---------------- L
O("L.calibration.frozen", ["L"], "The load contract is calibrated and frozen before acceptance",
  "A create-only calibration receipt freezes the load-contract version hash and every CALIBRATE value, respecting every hard floor and ceiling, before any acceptance run; calibration runs never count as acceptance.",
  cases={"set": "CS-LOAD", "select": "calibration"}, oracle=["O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER"], profile="P-LOAD",
  closure=("CR-LOAD",), params={"level": "calibration"},
  sources=["qualification/benchmark-contract.json calibration", "lab/reviews/plan-review-r1.codex.md finding 2", "lab/reviews/plan-review-r1.response.md decision 2"])
O("L.accept.256", ["L"], "256 logical clients with steady writes at 10m",
  "At 256 logical clients on the representative P-SCALE-10M dataset, with the writer floor, the frozen query mix and maintenance overlapping the window, three independent runs per lane each meet every threshold and invariant of load-contract.json.",
  cases={"set": "CS-LOAD", "select": "256"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER"], profile="P-LOAD",
  closure=("CR-LOAD",), params={"level": 256, "runs": 3},
  sources=["wiki/goals.md:40-46", "lab/PLAN.md 1 (done condition item 3)", "lab/reviews/plan-review-r1.codex.md finding 2"])
O("L.stress.512", ["L"], "512-client stress under the frozen overload policy",
  "At 512 logical clients the overload policy holds in three runs per lane: zero wrong answers, rejections typed and counted, the writer floor met, admitted correct goodput at or above the calibrated fraction of the 256 goodput, outstanding work within the pending limit.",
  cases={"set": "CS-LOAD", "select": "512"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER"], profile="P-LOAD",
  closure=("CR-LOAD",), params={"level": 512, "runs": 3},
  sources=["wiki/goals.md:40-46", "lab/PLAN.md 1"])
O("L.stress.1024", ["L"], "1024-client stress under the frozen overload policy",
  "The L.stress.512 conditions hold at 1024 logical clients in three runs per lane.",
  cases={"set": "CS-LOAD", "select": "1024"}, oracle=["O-REPLAY"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER"], profile="P-LOAD",
  closure=("CR-LOAD",), params={"level": 1024, "runs": 3},
  sources=["wiki/goals.md:40-46", "lab/PLAN.md 1"])
O("L.recovery.after-stress", ["L"], "The system recovers after stress",
  "After each 1024 stress window, a 256 acceptance window that starts within the calibrated recovery window passes every L.accept.256 threshold, with zero outstanding work and connection counts and engine memory back within the calibrated band of their pre-stress baseline.",
  cases={"set": "CS-LOAD", "select": "recovery"}, oracle=["O-REPLAY", "O-OBS"], ep=["EP-REPO", "EP-NATIVE", "EP-WRITER", "EP-ENGINE-OBS"], profile="P-LOAD",
  closure=("CR-LOAD",), params={"level": "recovery", "runs": 3},
  sources=["lab/reviews/plan-review-r1.codex.md finding 2 (recovery after stress)", "lab/reviews/plan-review-r1.response.md decision 2"])


# --------------------------------------------------------------------------- receipt validity
VALIDITY = [
    ("V1", "Produced by lab/bin in this repository and stored append-only at lab/runs/<gate>/<run-id>.json with raw output under runs/<gate>/<run-id>/."),
    ("V2", "Source tree identity includes uncommitted and untracked changes and equals the candidate tree under evaluation (or passes the carry-forward rule in 5.5)."),
    ("V3", "The gate built first: sha256 of every built dist file the gate imported is recorded and was produced in this run from the V2 tree."),
    ("V4", "Lockfile sha256, Node and pnpm versions are recorded."),
    ("V5", "Engine image digest equals the pin (XTDB a6a42650..., QLever 37d5ede1...) or a named repaired image declared in this contract version; engine config hash recorded."),
    ("V6", "The endpoint actually contacted equals the slot's endpoint; never 15442, 17019 or any homebase host."),
    ("V7", "Gate script, oracle files and case-set files hash to the values pinned for this contract version."),
    ("V8", "Fixture content hash and a fresh scope id are recorded."),
    ("V9", "Raw results are retained and hashed before any assertion runs."),
    ("V10", "Executed count equals the declared count; skipped = 0, unsupported = 0, not-implemented = 0; errors only where the case expects them."),
    ("V11", "For lane receipts, every read substep records its language and it equals the lane's language; any other language or a hybrid task fails the case."),
    ("V12", "runKind = acceptance. Calibration, diagnostic, probe and author-preview runs never close anything."),
    ("V13", "A verifier receipt from a different agent role reproduces the result on the same candidate tree."),
    ("V14", "The obligation's definition hash in the receipt equals its hash in the current contract version."),
    ("V15", "The run was admitted by resource admission; co-running containers and peak memory, CPU and disk are recorded; no BLOCKED_CAPACITY."),
    ("V16", "No acceptance receipt for the same obligation, lane and candidate tree failed; first failures are retained and a rerun cannot overwrite or outvote them."),
]


def obligation_hash(o):
    core = {k: o[k] for k in ("id", "goals", "statement", "lanes", "receiptScope", "cases", "oracles", "entrypoints", "profile", "closure", "mutationControls")}
    return hashlib.sha256(json.dumps(core, sort_keys=True).encode()).hexdigest()


def validate():
    errors = []
    ids = set()
    for o in OBL:
        if o["id"] in ids:
            errors.append(f"duplicate id {o['id']}")
        ids.add(o["id"])
        for g in o["goals"]:
            if g not in dict(SECTIONS):
                errors.append(f"{o['id']}: unknown goal {g}")
        for lane in o["lanes"]:
            if lane not in LANES:
                errors.append(f"{o['id']}: unknown lane {lane}")
        for x in o["oracles"]:
            if x not in ORACLES:
                errors.append(f"{o['id']}: unknown oracle {x}")
        for x in o["entrypoints"]:
            if x not in ENTRYPOINTS:
                errors.append(f"{o['id']}: unknown entrypoint {x}")
        if o["profile"] not in PROFILES:
            errors.append(f"{o['id']}: unknown profile {o['profile']}")
        cs = o["cases"].get("set")
        if cs not in CASESETS:
            errors.append(f"{o['id']}: unknown case set {cs}")
        for also in (o["cases"].get("also") or "").split(","):
            if also and also not in CASESETS:
                errors.append(f"{o['id']}: unknown also case set {also}")
        for r in o["closure"]["rules"]:
            if r not in CLOSURE_RULES:
                errors.append(f"{o['id']}: unknown closure rule {r}")
        for m in o["mutationControls"]:
            if m not in MUTANTS:
                errors.append(f"{o['id']}: unknown mutant {m}")
        if o["mutationControls"] and "CR-MUTANT-KILL" not in o["closure"]["rules"]:
            errors.append(f"{o['id']}: mutants listed but CR-MUTANT-KILL missing")
        if "CR-MUTANT-KILL" in o["closure"]["rules"] and not o["mutationControls"]:
            errors.append(f"{o['id']}: CR-MUTANT-KILL without mutants")
        if o["receiptScope"] not in ("lane", "engine"):
            errors.append(f"{o['id']}: bad receiptScope")
        if "—" in json.dumps(o, ensure_ascii=False):
            errors.append(f"{o['id']}: em-dash")
    required_mutants = {"M-HALF-OPEN", "M-DROPPED-SUPPORT", "M-FUTURE-RETIREMENT", "M-INT64-ROUND", "M-ENTITY-TYPE-SWAP", "M-STALE-PROJECTION"}
    used = {m for o in OBL for m in o["mutationControls"]}
    for m in required_mutants - used:
        errors.append(f"required mutant {m} unused")
    for g, _ in SECTIONS:
        for lane in LANES:
            if not any(g in o["goals"] and lane in o["lanes"] for o in OBL):
                errors.append(f"goal {g} has no obligation for lane {lane}")
    return errors


def oracle_needs_new(o):
    return [x for x in o["oracles"] if ORACLES[x]["status"] != "EXISTS"]


def build_json():
    for o in OBL:
        o["definitionSha256"] = obligation_hash(o)
        o["needsNewOracle"] = oracle_needs_new(o)
        o["caseSetStatus"] = CASESETS[o["cases"]["set"]]["status"]
    doc = {
        "format": "triplex-db-2/acceptance-obligations/1",
        "version": VERSION,
        "status": "DRAFT-UNREVIEWED: not frozen; freezes as 1.0.0 after orchestrator and adversarial review",
        "generatedBy": "lab/acceptance/build_contract.py",
        "lanes": LANES,
        "engineOfLane": ENGINE_OF,
        "sections": [{"id": g, "title": t} for g, t in SECTIONS],
        "receiptValidity": [{"id": i, "rule": r} for i, r in VALIDITY],
        "closureRules": CLOSURE_RULES,
        "oracles": ORACLES,
        "entrypoints": ENTRYPOINTS,
        "profiles": PROFILES,
        "caseSets": CASESETS,
        "mutationControls": MUTANTS,
        "statusAlgorithm": {
            "obligationClosed": "closed(O, lane, T) = every rule in O.closure.rules holds over the valid acceptance receipts R(O, scopeKey, T), where scopeKey = lane if O.receiptScope == 'lane' else engineOfLane[lane], and every receipt satisfies V1-V16",
            "goalClosed": "closed(G, lane, T) = for every O with G in O.goals and lane in O.lanes: closed(O, lane, T); a goal with an obligation in grounding 'policy-pending' cannot close until that policy is frozen in a later contract version",
            "done": "done(T) = closed(G, lane, T) for every G in G1..G10, R, S, L and every lane, on one integrated candidate tree T, plus the integrated verification receipt of section 5.6",
            "statusValues": ["OPEN", "CLOSED"],
        },
        "obligations": OBL,
    }
    (HERE / "obligations.json").write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    return doc


def md_escape(s):
    return s.replace("|", "\\|")


def render_sections():
    out = []
    for g, title in SECTIONS:
        out.append(f"### {title}\n")
        group = [o for o in OBL if o["goals"][0] == g]
        cross = [o for o in OBL if g in o["goals"][1:]]
        if not group and not cross:
            out.append("No obligations.\n")
        for o in group:
            lanes = ", ".join(o["lanes"]) if o["lanes"] != ALL else "all three"
            scope = "one receipt per lane" if o["receiptScope"] == "lane" else "one receipt per engine (both XTDB lanes share the XTDB receipt)"
            cases = o["cases"]["set"] + (f" ({o['cases'].get('select')})" if o["cases"].get("select") else "")
            if o["cases"].get("also"):
                cases += f", also {o['cases']['also']}"
            if o["cases"].get("executions"):
                cases += f", {o['cases']['executions']} executions"
            cs_status = CASESETS[o["cases"]["set"]]["status"]
            oracle = ", ".join(f"{x} ({ORACLES[x]['status']})" for x in o["oracles"]) or "none (provenance check)"
            closure = " + ".join(o["closure"]["rules"])
            params = o["closure"]["params"]
            if params:
                closure += " with " + json.dumps(params, ensure_ascii=False)
            out.append(f"**`{o['id']}`: {o['title']}.**")
            out.append(f"- Statement: {o['statement']}")
            out.append(f"- Lanes: {lanes}; {scope}.")
            out.append(f"- Cases: {cases}; case set {cs_status}.")
            out.append(f"- Oracle: {oracle}.")
            out.append(f"- Entrypoints: {', '.join(o['entrypoints'])}. Profile: {o['profile']}.")
            out.append(f"- Closure: {closure}.")
            if o["mutationControls"]:
                out.append(f"- Mutation controls: {', '.join(o['mutationControls'])}.")
            out.append(f"- Sources: {'; '.join(o['sources'])}.")
            if o["grounding"] != "grounded":
                out.append(f"- Grounding: **{o['grounding']}**.")
            if o["notes"]:
                out.append(f"- Notes: {o['notes']}")
            out.append(f"- Status: OPEN on every listed lane (no fresh acceptance receipt exists).")
            out.append("")
        if cross:
            out.append("Also counted in this section: " + ", ".join(f"`{o['id']}`" for o in cross) + ".\n")
    return "\n".join(out)


def counts_table():
    rows = ["| Section | xtdb-xtql | xtdb-sql | qlever-sparql | of which policy-pending | of which derived |", "| --- | ---: | ---: | ---: | ---: | ---: |"]
    total = {lane: 0 for lane in LANES}
    for g, _ in SECTIONS:
        os_ = [o for o in OBL if g in o["goals"]]
        c = {lane: sum(1 for o in os_ if lane in o["lanes"]) for lane in LANES}
        pp = sum(1 for o in os_ if o["grounding"] == "policy-pending")
        dv = sum(1 for o in os_ if o["grounding"] == "derived")
        rows.append(f"| {g} | {c['xtdb-xtql']} | {c['xtdb-sql']} | {c['qlever-sparql']} | {pp} | {dv} |")
    for lane in LANES:
        total[lane] = sum(1 for o in OBL if lane in o["lanes"])
    rows.append(f"| distinct obligations | {total['xtdb-xtql']} | {total['xtdb-sql']} | {total['qlever-sparql']} | {sum(1 for o in OBL if o['grounding']=='policy-pending')} | {sum(1 for o in OBL if o['grounding']=='derived')} |")
    return "\n".join(rows)


def render_md():
    path = HERE / "ACCEPTANCE.md"
    text = path.read_text()
    begin, end = "<!-- BEGIN GENERATED OBLIGATIONS -->", "<!-- END GENERATED OBLIGATIONS -->"
    cb, ce = "<!-- BEGIN GENERATED COUNTS -->", "<!-- END GENERATED COUNTS -->"
    a, b = text.index(begin) + len(begin), text.index(end)
    text = text[:a] + "\n\n" + render_sections() + "\n" + text[b:]
    a, b = text.index(cb) + len(cb), text.index(ce)
    text = text[:a] + "\n\n" + counts_table() + "\n\n" + text[b:]
    path.write_text(text)


def main():
    errs = validate()
    if errs:
        print("\n".join(errs))
        sys.exit(1)
    build_json()
    render_md()
    print(counts_table())
    print(f"obligations: {len(OBL)}")
    print("need a new oracle:", ", ".join(o["id"] for o in OBL if o["needsNewOracle"]))
    print("not grounded:", ", ".join(f"{o['id']}({o['grounding']})" for o in OBL if o["grounding"] != "grounded"))


if __name__ == "__main__":
    main()
