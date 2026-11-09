"""EXP-A01 regression harness for contract 0.3.14: every deliberate regression must make the generator report CONTRACT INVALID.
Runs from any directory; operates on the worktree that contains this file. tests-through-039.json holds the earlier mutations
(entries whose anchors no longer exist are reported as retired, not run)."""
import json, pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
GEN = REPO / "lab/acceptance/build_contract.py"
src = GEN.read_text()
mut = REPO / "lab/acceptance/_negtest_tmp.py"
tests = json.loads((HERE / "tests-through-039.json").read_text())
T = lambda *pairs: [list(p) for p in pairs]
tests.update({
 # W0-1.1.2 pin
 "W0 hash wrong": T(('"lab/world/W0/SPEC.md": "23ca6eb157e07f352495bdfd9d86ce4dedc490d5795264c8662681722c352807"', '"lab/world/W0/SPEC.md": "23ca6eb1"')),
 "W0 table digest wrong": T(('"hashTableSha256": "b5941569402865a52149ed0116efa60eb5b489dc9a27d15f8591e2daa51b051c"', '"hashTableSha256": "b5941569"')),
 "W0 commit back": T(('"version": "W0-1.1.2", "commit": "fedfcdaee6f3ea188e96d9eec9671cbb0c623f5c"', '"version": "W0-1.1.2", "commit": "ada2e90337b7ab210dc302df01c81896fe546bcf"')),
 "W0 verifier old": T(('"verifierEntry": "V-D01e-W0-1.1.2",', '"verifierEntry": "V-D01-W0-1.1.1",')),
 "W0 frozen dropped": T(('"frozenHashes": ["lab/world/W0/expected-sha256.json", "lab/world/W0/input-sha256.json"]', '"frozenHashes": ["lab/world/W0/expected-sha256.jsonx"]')),
 "W0 registry brief": T(('"briefSha256": "6df85539b0dd6c5a66b524c3c106fff3b8866f6afb3f581737e3a13ddd263dca"', '"briefSha256": "6df85539"')),
 "W0 fingerprint dropped": T(('    "oDomainFingerprint": dict(W0_FINGERPRINT_CANDIDATE,', '    "oDomainFingerprint": None and dict(W0_FINGERPRINT_CANDIDATE,')),
 "W0 fingerprint wrong": T(('"worldsSha256": "fec1d7cedee2b2f18c77e78210e4e9ed14fffb72e9629545155c7307e969c760"', '"worldsSha256": "fec1d7ce00000000000000000000000000000000000000000000000000000000"')),
 # O-DOMAIN
 "OD hash wrong": T(('"lab/oracles/domain/w0.py": "841f7d9d2e175e09474fdf23969bfddda77851995335828ed1c97b34d9167f00"', '"lab/oracles/domain/w0.py": "841f7d9d"')),
 "OD file dropped": T(('    "lab/oracles/domain/test_domain.py": "9103d227207999538ddba6e19bb8c6e64397ddfcf6a585bf42890538416b5f08",\n', '')),
 "OD commit wrong": T(('"O-DOMAIN": {"files": "lab/oracles/domain/**", "commit": "5d1fd1a3a60c01e5b5fc5d210ea0b3098074e3b9"', '"O-DOMAIN": {"files": "lab/oracles/domain/**", "commit": "276a280000000000000000000000000000000000"')),
 "OD unregistered": T(('"verifierEntry": "V-D01c-O-DOMAIN", "excludes": []', '"verifierEntry": "V-D01d", "excludes": []')),
 "OD status": T(('"O-DOMAIN": {"status": "BUILT-ACCEPTED",', '"O-DOMAIN": {"status": "TO-BUILD",')),
 "OD runner note": T(('"decodedInputRule": "O-DOMAIN 5d1fd1a\'s case loader does not read the inputBase64 form', '"decodedInputRule": "O-DOMAIN 5d1fd1a\'s case loader reads every form')),
 # Q65a O-CONTRACT runner
 "Q65a runner disagrees": T(('    pinned = isinstance(comp, dict) and not unbound and all(', '    pinned = isinstance(comp, dict) and all(')),
 "Q65a log unchecked": T(('            if ok and "log" in extra:', '            if False:')),
 "Q65a runner dropped": T(('    "O-CONTRACT": {"argv": ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--oracle", "O-CONTRACT", "{case}"],', '    "O-CONTRACTX": {"argv": ["python3", "-I", "-B", "lab/acceptance/build_contract.py", "--oracle", "O-CONTRACT", "{case}"],')),
 # Q57
 "Q57 reading dropped": T(("A13 any nesting depth is a valid JSON value, then E_VALUE, and implementations must not fail on recursion limits; ", "")),
 "Q57 N1 dropped": T(("Beside A12 (V-D01e N1): publish and receive integers have no upper bound; ", "")),
 # Q63
 "Q63d sql": T(("seeders and appliers on XTDB use parameterised statements only;", "seeders and appliers on XTDB may use literal statements;")),
 "Q63a follower": T(('"sharedVolumeFollower": "rejected for promotion:', '"sharedVolumeFollower": "accepted:')),
 "Q63b direction": T(("read scaling on both lanes comes from replicas fed by the broker (Q58b)", "read scaling comes from shared-log followers")),
 # Q64
 "Q64f clash unchecked": T(('    return sorted(set(pending_ids) & set(md_ids))', '    return []')),
 "Q64b series dropped": T(('"screening-r4": {"sha256": None, "seed": None, "offerScheduleSha256": None}, "rule": "each screening series', '"rule": "each screening series')),
 # Q65
 "Q65b spec hash": T(('    return hashlib.sha256(json.dumps({k: spec.get(k) for k in ("format", "argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()', '    return hashlib.sha256(json.dumps({k: spec.get(k) for k in ("argv", "outputs", "run")}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()')),
 "Q65c selection": T(("a case reached by several select entries records the first select entry in contract order", "a case reached by several select entries records any of them")),
 "Q65e pinned early": T(('    "format": "triplex-db-2/build-spec/1", "argv": None,', '    "format": "triplex-db-2/build-spec/1", "argv": ["pnpm"],')),
 "Q65f blockers": T(('"rule": "every blocker stays until EXP-G03\'s executing gate exists;', '"rule": "blockers may be waived;')),
 # Q66
 "Q66a prefixes": T(("the acceptable answers are the n + 1 prefixes, never all 2^n subsets (RULINGS Q66a)", "any subset is acceptable (RULINGS Q66a)")),
 "Q66 case dropped": T(('ERASURE_Q66_CASES = ["ER-INFLIGHT-PREFIXES", "ER-CURSOR-ERASURE-PREFIX"]', 'ERASURE_Q66_CASES = ["ER-INFLIGHT-PREFIXES"]')),
 "Q66 not refused": T(('"cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES + ERASURE_Q66_CASES]', '"cases": [["CS-ERASURE", c] for c in ERASURE_RESIDUAL_CASES]')),
 "Q66d lane": T(("the explicitly converted half is a lane obligation, because O-REPLAY does not model text-to-decimal conversion (RULINGS Q66d)", "O-REPLAY models it")),
 # Q67
 "Q67b identity": T(("executions are keyed by instance, never by output hash (RULINGS Q67b)", "executions are keyed by output hash (RULINGS Q67b)")),
 "Q67c fencing": T(("an answer is accepted only if (incarnation, marker) is equal before and after (RULINGS Q67c)", "an answer is accepted (RULINGS Q67c)")),
 "Q67c case dropped": T(('Q67_CASES = ["CO-RESET-DURING-QUERY", "CO-TYPED-ERROR-SHAPE"]', 'Q67_CASES = ["CO-TYPED-ERROR-SHAPE"]')),
 "Q67d enumeration": T(("ACK records are reconciled afterwards; a late or lost ACK is never a feed defect (RULINGS Q67d)", "a lost ACK is a feed defect (RULINGS Q67d)")),
 "Q67e isolation": T(("oracle bytes run from an evaluator-owned read-only copy re-hashed before every invocation", "oracle bytes run from the claimed commit")),
 "Q67f any rounds": T(('    if not (_typed(m.get("rounds"), "int") and m["rounds"] in d["looks"]):', '    if not (_typed(m.get("rounds"), "int") and d["rounds"]["min"] <= m["rounds"] <= d["rounds"]["max"]):')),
 "Q67f per-round unchecked": T(('    if not isinstance(per, list) or len(per) != m["rounds"] or not all(', '    if not isinstance(per, list) or not all(')),
 "Q67f RED admitted": T(('    if m.get("window") != "GREEN" or m.get("accounting") != "all-offered":', '    if m.get("accounting") != "all-offered":')),
 "Q67f committed-only admitted": T(('    if m.get("window") != "GREEN" or m.get("accounting") != "all-offered":', '    if m.get("window") != "GREEN":')),
 "Q67g overlap allowed": T((' or _cpuset(pl["candidate"]["cpuset"]) & _cpuset(pl["A0"]["cpuset"]) or pl["candidate"]["slot"] == pl["A0"]["slot"]):', ' or pl["candidate"]["slot"] == pl["A0"]["slot"]):')),
 "Q67g capacity unchecked": T(('    if m["design"] == "duet" and (pl["candidate"]["cpus"] != pl["A0"]["cpus"] or ', '    if m["design"] == "duet" and (')),
 "Q67g denominator unchecked": T(('    if any(len(_cpuset(pl[k]["cpuset"])) != pl[k]["cpus"] for k in pl):', '    if False:')),
 "Q67g arm slot unchecked": T((' or mp["placement"]["candidate"]["slot"] != comp["source"]["slot"] or mp["placement"]["A0"]["slot"] != entry["composition"]["source"]["slot"]:', ':')),
 "Q67g slot back": T(('"window": "window"},\n    "placement":', '"window": "window", "slot": "str"},\n    "placement":')),
 "Q67h shape dropped": T(('"shape": "{_tag: ReplicaUnavailable, required, observed, replica, cause?} (RULINGS Q67h)",', '')),
 "Q67i hash equality": T(('    if rec.get("schema") == "case-result/2":\n        return "PASS" if reference_compare(', '    if False:\n        return "PASS" if reference_compare(')),
 "Q67i bag as ordered": T(('    if comparator == "CMP-BAG-ROWS":\n        return isinstance(e_, list) and isinstance(o_, list) and sorted(key(x) for x in e_) == sorted(key(x) for x in o_)', '    if comparator == "CMP-BAG-ROWS":\n        return isinstance(e_, list) and isinstance(o_, list) and [key(x) for x in e_] == [key(x) for x in o_]')),
 "Q67i unknown passes": T(('        return isinstance(e_, dict) and isinstance(o_, dict) and e_.get("_tag") is not None and e_.get("_tag") == o_.get("_tag") and e_.get("reason") == o_.get("reason") and not o_.get("rows")\n    return False', '        return isinstance(e_, dict) and isinstance(o_, dict) and e_.get("_tag") is not None and e_.get("_tag") == o_.get("_tag") and e_.get("reason") == o_.get("reason") and not o_.get("rows")\n    return key(e_) == key(o_)')),
 "Q67j promotion admitted": T(('    if claim.get("kind", "comparison") not in ("comparison", "screening"):', '    if claim.get("kind", "comparison") not in ("comparison", "screening", "promotion"):')),
 # Q68
 "Q68b horizon": T(("the broker refuses a new pin that would make H trail head by more than 24 hours", "the broker accepts any pin")),
 "Q68c frame size": T(('"sweepFrameMaxResults": 64,', '"sweepFrameMaxResults": 640,')),
 "Q68d host reads": T(('"hostServedReads": "provisional: reads served from the broker count for the P4 bars when the receipt records route = host', '"hostServedReads": "provisional: reads served from the broker count for the P4 bars')),
 "Q68f current copies": T(("every current copy (the broker's current store, XTDB tx_current, the QLever cur graph) is covered by Q58e's per-subject keys", "current copies are rebuilt on erasure")),
 # Q69
 "Q69e live composition": T(('"liveComposition": "the live A/A uses public-queued, matching EXP-N01\'s A0 (RULINGS Q69e)"', '"liveComposition": "the live A/A uses any composition (RULINGS Q69e)"')),
 "Q69f fallback": T(('"fallback": {"name": "screening-r4",', '"fallback": {"name": "screening-r2",')),
 "Q69 window dropped": T(('    "windowProcedure": "the pool cannot hold', '    "windowProcedureX": "the pool cannot hold')),
 # Q71
 "Q71a list filled": T(('    "installMetadataExclusions": None,', '    "installMetadataExclusions": ["node_modules/.modules.yaml"],')),
 "Q71b toolchain": T(("and the pnpm version when the build or run calls pnpm; the Python version", "; the Python version")),
 "Q71b invocation schema": T(('    "oracle-invocation/1": {', '    "oracle-invocation/0": {')),
 # Q72f
 "Q72f error back": T(('{"id": "CE-FUTURE-BASIS", "error": "E-BASIS-NOT-AVAILABLE", "reason": "basis-not-reached",', '{"id": "CE-FUTURE-BASIS", "error": "E-UNAVAILABLE-CUT", "reason": "unavailable-cut",')),
 "Q72f retired dropped": T(('RETIRED_ERRORS = {"E-UNAVAILABLE-CUT": {"was": "ReadError / unavailable-cut", "replacedBy": "E-BASIS-NOT-AVAILABLE",', 'RETIRED_ERRORS = {"E-UNAVAILABLE-CUT": {"was": "ReadError / unavailable-cut", "replacedBy": "E-READ",')),
})
tests.update({'Q70a rule weakened': [['"Every `cursorFrom` continuation is answered from the source read\'s start, scope and prefixes, whether or not the source had commits in flight; a continuation\'s own readStart is never consulted."', '"WEAKENED Q70a"']], 'Q70b rule weakened': [['"A literal cursor token equal to a `nextCursor` that a read with commits in flight issued earlier in the same case continues that read per prefix; token bytes and the cursor vectors stay unchanged. Any other literal token keeps today\'s rule (the query\'s own read view)."', '"WEAKENED Q70b"']], 'Q70c rule weakened': [['"Q70b extends to every read: a literal cursor token equal to a `nextCursor` issued earlier in the same case by any read, in flight or not, continues that read (its start, scope and prefixes). Only a token no earlier read issued uses the query\'s own read view. This closes the F7 hole reached through a literal token."', '"WEAKENED Q70c"']], 'Q70d rule weakened': [['"When several earlier reads issued the same token, the continuation follows the latest of them in case order."', '"WEAKENED Q70d"']], 'Q70e rule weakened': [['"Prefixes whose pages did not issue the token are left out, the same as a prefix with no next cursor under `cursorFrom`."', '"WEAKENED Q70e"']], 'Q70f rule weakened': [['"When the earlier reads that issued a literal token disagree in start, scope or per-prefix answers, the continuation fails closed with a typed X-NOT-MODELED \\"ambiguous literal token\\" (a fourth listed refusal site). Issuers with identical views continue as Q70d says."', '"WEAKENED Q70f"']], 'Q70g rule weakened': [['"Q70c extends to the journal: a `transactions` call whose `after` equals a `next` that an earlier transactions page issued in the same case continues that read (its start and prefixes), one answer per prefix; an `after` no earlier page issued uses the call\'s own read view."', '"WEAKENED Q70g"']], 'Q74a rule weakened': [['"Screening and development receipts may be seeded by clone of a golden; the receipt records `seededBy: clone` with the golden key (adapter commit, world and seed-generator hash, driver seed options, image digest, engine config hash) and the golden\'s freeze fingerprint. Acceptance runs seed fresh (TARGETS 6)."', '"WEAKENED Q74a"']], 'Q74b rule weakened': [['"The canonical freeze state is settled: `POST /system/finish-block`, compactor jobs 0, live index empty. A fresh-seeded arm compared with a cloned arm settles the same way before its window. Older unsettled A0 receipts are not compared with settled ones."', '"WEAKENED Q74b"']], 'Q74c rule weakened': [['"No clone-seeded receipt counts, even for screening, until validation E1 passes: a fresh-seeded slot against its clone under the PAIR-0 A/A procedure, holding within 1.10 at p50 and 1.15 at p99, with R26 section 6.9\'s seven predictions checked."', '"WEAKENED Q74c"']], 'Q74d rule weakened': [['"A cloned slot is ready only after `/healthz/started` (read with `docker exec`) and the R26 C1-C8 checks pass, then the same warm-up on every arm."', '"WEAKENED Q74d"']], 'Q74e rule weakened': [['"Runs that measure P1 force one `finish-block` at a fixed trace time in every window, on every arm, so a settled clone still has a maintenance event."', '"WEAKENED Q74e"']], 'Q74f rule weakened': [['"A golden or clone is made only when host free disk after the copy stays at or above 5 GiB; clone volumes are removed after each run. At the 10k rung (3.41 GiB per XTDB volume) that allows one clone at a time today."', '"WEAKENED Q74f"']], 'Q74g rule weakened': [['"A broker composition clones the engine volume and the broker directory together, from one stopped moment."', '"WEAKENED Q74g"']], 'Q70h rule weakened': [['"Issuers are compared by view: start, scope, and the prefixes whose pages issued the token. Issuers with identical views and different page bodies (for example different limits reaching the same token) continue rather than refuse, because the continuation depends only on the view."', '"WEAKENED Q70h"']], 'Q70i rule weakened': [['"Q70f\'s fail-closed rule applies to a journal `after` issued by disagreeing pages too (\\"ambiguous journal after\\"); Q70g matching requires the same journal scope."', '"WEAKENED Q70i"']], 'Q70j rule weakened': [['"A `transactions` read decides which erasures are in flight from its own `scope` field, not from `cut.scope` or the default scope."', '"WEAKENED Q70j"']], 'Q70k rule weakened': [['"Q70j applies to every read kind that takes a `scope` field (`transactions`, `transaction`, `transactionByCommand`, `transactionsForEntity`, `journalFacts`, `assertions`, `cutCatalog`, `history` with no cut): in-flight erasures come from the scope the read reads. Other kinds use their cut\'s scope."', '"WEAKENED Q70k"']], 'Q75a rule weakened': [['"At the start of every run, every evaluator-side file the run executes (claim.mjs, lib.mjs, gate.mjs, the reference and oracle runner files) is compared with its git blob at the evaluator\'s commit, read with `GIT_NO_REPLACE_OBJECTS=1`; a mismatch refuses the run and marks the checkout poisoned (EVALUATOR-TAMPERED) until restored from git. An edit made and restored inside one run stays on the named unprotected list until EXP-G03 isolates builds."', '"WEAKENED Q75a"']], 'Q75b rule weakened': [['"Every oracle copy and every other trusted byte is read, hashed and copied before the first candidate process runs; the evaluator\'s git runs with `GIT_NO_REPLACE_OBJECTS=1` and checks each blob against its tree entry\'s object id."', '"WEAKENED Q75b"']], 'Q75c rule weakened': [['"An oracle is pinned only when the contract lists sha256 for every runner file; COMPILED oracles (O-CONTRACT) are pinned that way through the contract\'s own outputs. A claim that depends on any oracle without such a list is DIAGNOSTIC (Q59e literally). build_contract.py\'s contractBlockers and claim.mjs\'s follow the same rule in contract 0.3.11."', '"WEAKENED Q75c"']], 'Q75d rule weakened': [['"The identity records each resolved binary children run (node, pnpm, python3): path, sha256 and version; children run with PATH pinned to the recorded toolchain directory."', '"WEAKENED Q75d"']], 'Q75e rule weakened': [['"The identity walk uses lstat, refuses any symlink that resolves outside the checkout, and hashes file modes; configuration the evaluator does not apply is recorded as unbound, not hashed as if applied."', '"WEAKENED Q75e"']], 'Q75f rule weakened': [['"Every child process gets a fresh HOME and TMPDIR."', '"WEAKENED Q75f"']], 'Q75g rule weakened': [['"A row comparator applies to each `queries[i]` entry\'s `result` (or its `inFlight.acceptable[j].result`) inside an O-REPLAY answer; `commandOutcomes` and `state` compare exactly. Contract 0.3.11 states this; until then those cases stay UNCOMPARABLE (fail closed)."', '"WEAKENED Q75g"']], 'Q75h rule weakened': [['"Following compiled Q67h, `cause` is optional; when present it must be a structured object with `_tag` or `message`."', '"WEAKENED Q75h"']], 'Q75i rule weakened': [['"The run keeps the set of evidence hashes it wrote and requires every one at the end (deletion detected); every return path carries GATE-NOT-RUN from the run\'s start; end checks run inside the try. admitCore returns DIAGNOSTIC for `kind: \\"promotion\\"`, and admit_claim in the reference does the same in 0.3.11."', '"WEAKENED Q75i"']], 'Q75j rule weakened': [['"The unprotected list names F1\'s in-run restore, setsid, TOCTOU, no filesystem or network isolation; \\"double fork escapes\\" is corrected (it is killed). Q67i\'s \\"CMP-EXACT\\" reads as CMP-EXACT-VALUE; no comparator is plain byte equality, and hash equality applies only to case-result/1 documents."', '"WEAKENED Q75j"']], 'Q70l rule weakened': [['"Every paged read kind continues by one rule. The oracle keeps a table of paged kinds and their continuation parameter and issued value (entityPage: `cursor`/`cursorFrom` and `nextCursor`; `transactions`: `after` and `next`; `transactionsForEntity`: `beforePosition` and `nextBeforePosition`, matched on the same entity, scope and `snapshotPosition`). A continuation value equal to one an earlier page of the same kind and key issued continues that read\'s view (Q70a-c, Q70g); disagreeing issuers refuse (Q70f, Q70i); identical views continue (Q70d, Q70h). A self-check fails if any query kind whose output carries a `next*` field is missing from the table, so a new paged kind cannot be left on the old rule."', '"WEAKENED Q70l"']], 'Q70m rule weakened': [['"`after`, `beforePosition` and any other integer continuation parameter must be a JSON integer; a string, a float or a negative value makes the case malformed (exit 2), never a crash or a FAIL exit. Matching uses the parsed integer."', '"WEAKENED Q70m"']], 'Q76a rule weakened': [['"The single-read default\'s typed refusal above 1M edge rows (XTDB) or 100k (QLever) stands. Cheaper per-round reads (XTDB entity-keyed projection tables, a QLever IRI ledger, R10 6.4) belong to a later experiment on the P4 current structure (Q68a), since both need an id-keyed current copy."', '"WEAKENED Q76a"']], 'Q76b rule weakened': [['"`XtdbStorageAdapter.initialize` stops creating `tx_query_relations`; the C8 follow-up removes it after V-C8, so no read-path artefact remains in the schema."', '"WEAKENED Q76b"']], 'Q76c rule weakened': [['"A recursive rule shape a lane cannot answer is refused typed, never answered without its constraint. Core\'s SQL `compileRecursiveCTE` ignoring tail constraints is a correctness defect for the SQL adapters outside the two lanes; it is recorded in the capability matrix and fixed when a lane uses it."', '"WEAKENED Q76c"']], 'Q76d rule weakened': [['"The C8 follow-up wires `countSimplePaths` into WL20 supports on both lanes, so supports are general rather than path lengths 1-3."', '"WEAKENED Q76d"']], 'Q76e rule weakened': [['"Maintained queries publish only from the change feed consumer (P3), never from a read; until that consumer exists, `query()` answers directly."', '"WEAKENED Q76e"']], 'Q76f rule weakened': [['"XTDB G1/G2 receipts for C8 are rerun on an exclusive slot after V-X02\'s; the overloaded-dev receipts stay as diagnostic."', '"WEAKENED Q76f"']], 'Q70n rule weakened': [['"The Q70l completeness check runs every query kind registered in `run.QUERIES` on generated cases and inspects the actual output (top level, pages and nested objects) for any `next*` key; a kind whose output carries one and is not in `CONTINUATIONS` fails, and a kind that cannot be exercised fails conservatively. Static source matching may stay as an extra check, never as the only one. Negative controls: a computed key, a helper in another module, a nested dictionary."', '"WEAKENED Q70n"']], 'Q70o rule weakened': [['"`cursorFrom.page` is an integer continuation parameter under Q70m: a JSON integer from 0 to the last page index, otherwise the case is malformed (exit 2); invalid reference shapes raise the oracle\'s input error, never an uncaught exception."', '"WEAKENED Q70o"']], 'Q77a rule weakened': [['"Every accepted recursion budget is enforced with a typed refusal and never a partial or over-budget success: a confirmation read may not extend the answer past maxRounds; ruleClosure enforces maxRounds and maxVisited (or rejects budget fields it does not support). maxDepth keeps its Datalog meaning."', '"WEAKENED Q77a"']], 'Q77b rule weakened': [['"Path counting uses iterative DP over DAGs and an explicit stack for bounded cyclic enumeration; pathSteps refusal stays typed."', '"WEAKENED Q77b"']], 'Q77c rule weakened': [['"The write counter positively classifies every operation it forwards; any multipart, prepared, portal or other operation it cannot classify counts as a write (or is refused). Classifications of prepared statements and portals survive tally resets, and Execute operations are what is counted."', '"WEAKENED Q77c"']], 'Q78a rule weakened': [['"Datomic Pro 1.0.7745 (Apache 2.0 binaries, Java 17+), dev storage inside the transactor for DA00-DA02; SQL storage is a later arm only if io-stats show peer cache misses loading the transactor. The zip\'s sha256 is pinned by the lab, the bundled peer jar is cross-checked against Maven Central\'s sha1 and PGP signature. No Datomic source exists, so lane D has no engine-repair track; gaps get workarounds."', '"WEAKENED Q78a"']], 'Q78b rule weakened': [['"`tx2-datomic-dev` (2.75 GiB: transactor heap 640m, gateway heap 1g) is a parkable resident: only the orchestrator parks it (`engine.mjs down`, volume kept). Lane D slot runs and lane X/Q exclusive-slot runs do not overlap with it running."', '"WEAKENED Q78b"']], 'Q78c rule weakened': [['"A thin Clojure gateway on the official Peer API speaking HTTP/1.1 + JSON with every value tagged (longs and entity ids as decimal strings); the gateway rejects query functions outside an allowlist (C8 floor). Rejected: peer-server with the undocumented Client wire protocol; the legacy REST server."', '"WEAKENED Q78c"']], 'Q78d rule weakened': [['"One Datomic database per Triplex scope; each assertion is a fact entity (`:f/id`, `:f/subject`, `:f/live`, `:f/attr`, one typed value attribute, valid-time bounds); commit metadata on the transaction entity; retraction retracts `:f/live`; a latest-basis read uses the current db, a past basis `as-of`, reads in a transaction `d/with`. One `:db/cas` per entity per transaction (Jepsen: operations inside one transaction apply as if concurrent)."', '"WEAKENED Q78d"']], 'Q79a rule weakened': [['"Every SQL hazard guard runs on the same comment-aware token stream as the envelope, recognises quantified comparisons including the bare-expression operand, and keeps `UNION ALL` / `SELECT ALL` and supported subqueries; public-provider regression cases for the comment and bare forms."', '"WEAKENED Q79a"']], 'Q79b rule weakened': [['"Checked int64 arithmetic yields a typed failure in the Effect error channel, never a defect; tests assert Fail (not Die) and recovery with catchTag in both languages."', '"WEAKENED Q79b"']], 'Q79c rule weakened': [['"Exact Datalog arithmetic (the five exact compute operators and anything downstream) never lowers through DECIMAL to BIGINT; it keeps the exact result as text through range checks and decoding, or refuses with a typed error until exact lowering exists. This is Sam\'s \\"no silent precision loss\\" rule and applies to core\'s compiler for every lane that uses it."', '"WEAKENED Q79c"']], 'Q79d rule weakened': [['"With the language switch unset, behaviour is main\'s; changing the default needs its own qualification and a ruling."', '"WEAKENED Q79d"']], 'Q81a rule weakened': [['"At the end of a run the evaluator re-checks every case input it handed out (present, same bytes) along with the evidence set; a deleted or rewritten input after its last use refuses the run (INPUT-TAMPERED). The guarantee is kept, not narrowed."', '"WEAKENED Q81a"']], 'Q75c blocker bypass': [['        if not runner_pinned(x):\n            out.append(f"oracle-runner-unpinned:{x}")', '        if False:\n            out.append(f"oracle-runner-unpinned:{x}")']], 'Q75c admission bypass': [['        if not runner_pinned(x, pins, cfg["oracleRunners"]):', '        if False:']], 'Q75c COMPILED exemption': [['    runner = runners.get(x)', '    if ORACLES[x]["status"] == "COMPILED":\n        return True\n    runner = runners.get(x)']], 'Q75g full replay compared as rows': [['    if comparator != "CMP-EXACT-VALUE" and isinstance(e_, dict) and members <= set(e_):', '    if False:']], 'Q75g state unchecked': [[' or key(e_["state"]) != key(o_["state"])', '']], 'Q75g outcomes unchecked': [[' or key(e_["commandOutcomes"]) != key(o_["commandOutcomes"])', '']], 'Q75h cause unchecked': [[' and cause_ok(e_) and cause_ok(o_)', '']], 'Q78 null image bypass': [['    if lane is not None and not (IMAGE_PINS.get(ENGINE_OF[lane]) or {}).get("imageId"):', '    if False:']], 'Q78 D unregistered': [['LANES = ["xtdb-xtql", "xtdb-sql", "qlever-sparql", "datomic-datalog"]', 'LANES = ["xtdb-xtql", "xtdb-sql", "qlever-sparql"]']], 'Q78 D image prematurely pinned': [['"datomic": {"image": None, "imageId": None}', '"datomic": {"image": "unverified", "imageId": "sha256:" + "f" * 64}']], 'V-O04i hash table corrupt': [['"lab/oracles/replay/run.py": "c967ad2d6d811f006da6f5766a0ca7aa7ef0c4c220ad239f7a55b7b994a4f856"', '"lab/oracles/replay/run.py": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"']], 'V-O04i wrong version': [['"oracleVersion": "0.4.9"', '"oracleVersion": "0.4.8"']]})
tests.update({
 "Q78 D raw obligation omitted": T(('lanes=X + ["datomic-datalog"]', 'lanes=X')),
 "Q75c O-CONTRACT projection omitted": T(('"{case}"], "files": ["lab/acceptance/build_contract.py", "lab/acceptance/oracle-contract.json"],', '"{case}"], "files": ["lab/acceptance/build_contract.py"],')),
})
# [EXP-A01] Why: Q75c now independently rejects unpinned runners before the old status fallback. Rejected: calling a redundant status-only mutation a surviving admission defect.
superseded = {"Q59e unpinned allowed": "Q75c runner hashes independently refuse the same unpinned fixture"}
for name, reason in superseded.items():
    tests.pop(name, None)
    print("SUPERSEDED " + name + ": " + reason, flush=True)
import hashlib
print("SOURCE sha256=" + hashlib.sha256(src.encode()).hexdigest(), flush=True)
tests.update({'R2 F1 payload projection disabled': [('fields = ("rows",) if "rows" in a else ("raw", "snapshot") if "raw" in a and "snapshot" in a else ()', 'fields = ()')], 'R2 F1 cut metadata ignored': [('key({k: v for k, v in a.items() if k not in fields}) == key({k: v for k, v in b.items() if k not in fields})', 'True')], 'R2 F2 Unicode recursion escaped': [('key = lambda x: json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=False)', 'key = lambda x: json.dumps(x, sort_keys=True, separators=(",", ":"), ensure_ascii=True)')], 'R2 F3 composition excludes D': [('"engines": "each assignment is XTDB, QLever or Datomic"', '"engines": "each assignment is XTDB or QLever"')], 'R2 F3 receipt excludes D': [('each {engine: xtdb | qlever | datomic, imageDigest', 'each {engine: xtdb | qlever, imageDigest')], 'R2 F4 compiler defect omitted': [('"KL-CORE-TAIL": ("core SQL compileRecursiveCTE', '"KL-CORE-TAIL-REMOVED": ("core SQL compileRecursiveCTE')]})
tests.update({'Q72a literal weakened': [('"The flock helper runs detached in its own process group, ignores INT, TERM and '
                            'HUP, and exits only on stdin EOF; when it exits for any reason the log '
                            'fail-stops (every later append throws), and each append checks the helper is '
                            "alive. A test kills the helper and Ctrl-Cs the holder's group and shows no "
                            'second writer."',
                            '"WEAKENED Q72a"')],
 'Q72a consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72a', None)\n\ndef checks_0312():")],
 'Q72b literal weakened': [('"Q67c applies to every broker read surface: a surface that answers in one '
                            'request reads the marker in that request (a UNION with the marker triple, as '
                            'pulls do); a surface that needs several requests (Datalog executor, '
                            'dependencyState, native with awaitBasisMs) compares (incarnation, marker) '
                            'before and after, and every fence and replay writes a new incarnation first. '
                            "V-P2Q's live residual test (zero-downtime rewind between the probes) is a "
                            'regression case."',
                            '"WEAKENED Q72b"')],
 'Q72b consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72b', None)\n\ndef checks_0312():")],
 'Q72c literal weakened': [('"Rename reasons to the contract\'s strings now (`basis-not-reached`, '
                            '`replica-unreachable`). Core tagged errors (Q67h) are required before the '
                            'broker becomes a default, not for the default-off merge; until then no claim '
                            'may close an obligation pinned to E-BASIS-NOT-AVAILABLE or '
                            'E-REPLICA-UNAVAILABLE."',
                            '"WEAKENED Q72c"')],
 'Q72c consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72c', None)\n\ndef checks_0312():")],
 'Q72d literal weakened': [('"The A0 change with the option off is a correctness fix (main answers a basis '
                            'above the published position) and stays. The frozen A0 control (Q46b) is '
                            're-frozen at the P2Q merge, and every matched comparison names the change."',
                            '"WEAKENED Q72d"')],
 'Q72d consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72d', None)\n\ndef checks_0312():")],
 'Q72e literal weakened': [('"The synchronous whole-log replay per outage pull is a blocker for default, not '
                            'for default-off; it is replaced by the Q58c store (recent_rows or a current '
                            "index, on R25's design). Probes are coalesced into one in-flight probe per "
                            'replica in this round. Tests import src through tsx, never dist."',
                            '"WEAKENED Q72e"')],
 'Q72e consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72e', None)\n\ndef checks_0312():")],
 'Q72g literal weakened': [('"Every broker-mode wiring passes `awaitBasisMs: 2000` (the Q58a default) until '
                            'the core native facade exists; receipts are measured at the claimed head."',
                            '"WEAKENED Q72g"')],
 'Q72g consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q72g', None)\n\ndef checks_0312():")],
 'Q80a literal weakened': [('"O-OBS judges evidence only inside an evaluator-owned, contract-bound case and '
                            'run context (obligation, case, witness kind, threshold ids, run id) and against '
                            'collector objects the evaluator retained itself; evidence that only hashes '
                            'itself is REFUSED. The collector and context format comes from R27."',
                            '"WEAKENED Q80a"')],
 'Q80a consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q80a', None)\n\ndef checks_0312():")],
 'Q80b literal weakened': [('"Each fault transition and each wait bound has a witness schema of source-bound '
                            'events (start, end, readback) checked against retained objects; a label naming '
                            'the transition or the duration is never evidence of it."',
                            '"WEAKENED Q80b"')],
 'Q80b consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q80b', None)\n\ndef checks_0312():")],
 'Q80c literal weakened': [('"Work ratios compare integer counters exactly against rational contract '
                            'thresholds (cross-multiplication), never binary64."',
                            '"WEAKENED Q80c"')],
 'Q80c consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q80c', None)\n\ndef checks_0312():")],
 'Q82a literal weakened': [('"O-OBS enforces six kinds in trust order: EI engine-internal, TO '
                            'transport-observed (a wire proxy in a separate process), HO host-observed '
                            '(cgroup, /proc, sockets, file scans), DR durable read-back, HR harness-observed '
                            '(caller-side fields only), CR reported by Triplex code (rejected; includes the '
                            "Datomic gateway, the broker's own timestamps, and a counter inside the client "
                            'process). `source.kind` is `<code>/<engine>/<sourceId>`."',
                            '"WEAKENED Q82a"')],
 'Q82a consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q82a', None)\n\ndef checks_0312():")],
 'Q82b literal weakened': [('"OBS-NO-MUTATION, OBS-PREABORT, OBS-CANCEL and OBS-ACK-ORDER pass only when two '
                            'sources of different kinds agree."',
                            '"WEAKENED Q82b"')],
 'Q82b consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q82b', None)\n\ndef checks_0312():")],
 'Q82c literal weakened': [('"Evidence arrives as an obs-bundle/1 written by an observer sidecar per engine '
                            'container that engine.mjs starts (never builder code): content-addressed raw '
                            'chunks, a hash chain per stream, HMAC-SHA256 chunk headers under a per-run key '
                            'the SUT never sees, a witness log of chain heads written only by orchestrator '
                            'tooling, a clock bridge with stated uncertainty, and hash-pinned normalizer '
                            'scripts that O-OBS reruns; records are recomputed from raw bytes, never '
                            'accepted as given. Because every agent runs as one macOS user, acceptance '
                            'additionally repeats the collection by the verifier (ACCEPTANCE 5.8); the '
                            'bundle alone suffices only for screening."',
                            '"WEAKENED Q82c"')],
 'Q82c consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q82c', None)\n\ndef checks_0312():")],
 'Q82d literal weakened': [('"Every erasure-scan location first finds a canary written before the erasure '
                            "with the same scanner, or the verdict is REFUSED (QLever's FSST-compressed "
                            'vocabulary defeats plain grep). Observer outputs (QLever metrics log, XTDB '
                            'DEBUG logs and spans, proxy captures, docker logs), old index generations and '
                            'freed blocks join PROTECTED_COPY_INVENTORY."',
                            '"WEAKENED Q82d"')],
 'Q82d consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q82d', None)\n\ndef checks_0312():")],
 'Q82e literal weakened': [('"XTDB mutation evidence is the gauge node.tx.latestCompletedTxId, never '
                            'source-log offsets (flushes and compaction append to the log); XTDB EXPLAIN '
                            'ANALYZE attributes are JSON (scan_rows_read, scan_pages_used, scan_files_used), '
                            "and the P4 harness's decoding (p4.mjs:29) is fixed to read them; QLever runs "
                            'with --enable-metrics and its per-query metrics log on. Lane D CANCEL and '
                            'PREABORT use host-observed per-thread /proc series of the gateway JVM plus the '
                            'proxy (HO + TO)."',
                            '"WEAKENED Q82e"')],
 'Q82e consumer dropped': [('def checks_0312():',
                            "OBSERVATION_RULES.pop('Q82e', None)\n\ndef checks_0312():")],
 'Q83a literal weakened': [('"Slots s1-s3 add `-Dlog4j2.shutdownHookEnabled=false` to javaOpts, so XTDB\'s '
                            'shutdown hook can log `Stopping node...`, the three server-stopped lines and '
                            "`Node stopped.` (Log4j's own hook otherwise drops them). The dev residents are "
                            'unchanged. This changes the slot config hash and therefore every golden key; '
                            'receipts before the change name the old hash."',
                            '"WEAKENED Q83a"')],
 'Q83a consumer dropped': [('def checks_0312():', "SEED_RULES.pop('Q83a', None)\n\ndef checks_0312():")],
 'Q83b literal weakened': [('"Settled = two finish-blocks (the second records the post-compaction catalog), '
                            'compactor jobs 0, and snapshot-independent evidence (new block file whose tx_id '
                            'and latest_processed_msg_id equal the node gauges, block.last_upload_time '
                            'advanced, xt.trie_stats showing the new tries, file listing and trie digest '
                            'unchanged over three readings 5 s apart); never `xt.live_tables` (stale shared '
                            'snapshot, upstream #6174). Clean stop = exit within 10 s with the stop lines '
                            'and exit 143, well-formed LOG and REPLICA_LOG tails checked offline, empty '
                            '`buffers/**/.tmp` (refuse, never delete). The freeze fingerprint is taken on a '
                            'reference start of the source after the copy, and every arm, fresh or cloned, '
                            'starts the same way. Re-test the second finish-block and the reference start '
                            'when XTDB 2.2.1 is pinned."',
                            '"WEAKENED Q83b"')],
 'Q83b consumer dropped': [('def checks_0312():', "SEED_RULES.pop('Q83b', None)\n\ndef checks_0312():")],
 'Q83c literal weakened': [('"Never read a block that may not exist (MemoryCache hangs the caller): list '
                            '`buffers/v06/blocks/b*.binpb` first and query `xt.block_files` only for listed '
                            'indices, re-listing just before each query; block numbers are not dense (GC '
                            'keeps the latest 10)."',
                            '"WEAKENED Q83c"')],
 'Q83c consumer dropped': [('def checks_0312():', "SEED_RULES.pop('Q83c', None)\n\ndef checks_0312():")],
 'Q84a literal weakened': [('"WAL, synchronous=FULL, fullfsync=ON on every non-readonly connection, '
                            'checkpoint_fullfsync=ON, wal_autocheckpoint=0, journal_size_limit=16 MiB, '
                            'locking NORMAL (not EXCLUSIVE); the single writer holds a SQLite exclusive lock '
                            'on a separate broker.lock file for the life of the process (replaces the perl '
                            'flock helper); assert SQLite >= 3.51.3 at open."',
                            '"WEAKENED Q84a"')],
 'Q84a consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q84a', None)\n\ndef checks_0312():")],
 'Q84b literal weakened': [('"One writer worker thread owns the read-write commit connection; one '
                            'checkpointer thread runs wal_checkpoint(PASSIVE) every 4 s on its own '
                            'connection; four reader threads with readonly connections fed over MessagePort; '
                            'the main thread never touches broker.db. Backstop: above 64 MiB of WAL the '
                            'writer closes a gate, readers park between transactions, the writer runs '
                            'RESTART."',
                            '"WEAKENED Q84b"')],
 'Q84b consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q84b', None)\n\ndef checks_0312():")],
 'Q84c literal weakened': [('"Every read transaction starts with `SELECT lsn, epoch, h FROM marker` and is '
                            'served only when h <= B <= lsn, else routed to the source; one unit of work per '
                            'transaction (one pull or one 64-subject page). Long work keeps its basis '
                            'through a retention pin (pinBasis holds H <= B), never an open read '
                            'transaction."',
                            '"WEAKENED Q84c"')],
 'Q84c consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q84c', None)\n\ndef checks_0312():")],
 'Q84d literal weakened': [('"H1\'s current rows live in broker.db as live_rows and retired_rows clustered '
                            "by entity, written in the commit's own transaction, so W is always the "
                            'snapshot\'s marker."',
                            '"WEAKENED Q84d"')],
 'Q84d consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q84d', None)\n\ndef checks_0312():")],
 'Q84e literal weakened': [('"Lock, open (recovery), PASSIVE (sync adopted frames), bump the epoch, run the '
                            'marker and ACKED-sidecar cross-checks, then start readers; a mid-WAL corruption '
                            'that SQLite recovers silently is caught by the ACKED sidecar."',
                            '"WEAKENED Q84e"')],
 'Q84e consumer dropped': [('def checks_0312():', "BROKER_RULES.pop('Q84e', None)\n\ndef checks_0312():")],
 'Q83d literal weakened': [('"Settle evidence does not require observing L0 tries: compaction may merge them '
                            "before the first poll. Settled means the new block's tx_id and "
                            'latest_processed_msg_id equal the node gauges, xt.trie_stats covers that block '
                            'at whatever level it now sits, compactor jobs 0, and the file listing and trie '
                            'digest are unchanged over three readings 5 s apart."',
                            '"WEAKENED Q83d"')],
 'Q83d consumer dropped': [('def checks_0312():', "SEED_RULES.pop('Q83d', None)\n\ndef checks_0312():")],
 'Q79e literal weakened': [('"The quantified-comparison guard classifies the operand by a small grammar, not '
                            'by listed shapes: any parenthesized query expression (SELECT, VALUES, and set '
                            'operations UNION / INTERSECT / EXCEPT with or without ALL, at any nesting of '
                            'parentheses, with comments anywhere) is a subquery and is admitted if it '
                            'contains no nested unsafe comparison; anything else is refused. Tests are '
                            "generated from the grammar's combinations (each form at depths 1-3, with and "
                            "without comments) and each generated query is checked against XTDB's own "
                            'answer, next to the round-2 rejections."',
                            '"WEAKENED Q79e"')],
 'Q79e consumer dropped': [('def checks_0312():',
                            "EXACT_QUERY_RULES.pop('Q79e', None)\n\ndef checks_0312():")],
 'Q85a literal weakened': [('"Database creation for a scope is idempotent and never resets or lowers an '
                            'existing scope position; concurrent creates converge on one database with its '
                            'position intact."',
                            '"WEAKENED Q85a"')],
 'Q85a consumer dropped': [('def checks_0312():', "DATOMIC_RULES.pop('Q85a', None)\n\ndef checks_0312():")],
 'Q85b literal weakened': [('"The gateway accepts every scope name the public Triplex constructor can '
                            'produce (mapped to a Datomic database name by a documented, reversible '
                            'encoding) and nothing else."',
                            '"WEAKENED Q85b"')],
 'Q85b consumer dropped': [('def checks_0312():', "DATOMIC_RULES.pop('Q85b', None)\n\ndef checks_0312():")],
 'Q85c literal weakened': [('"Every image build starts from a fresh context that contains only verified '
                            'inputs listed in the input hash; a reused or dirty context refuses the build."',
                            '"WEAKENED Q85c"')],
 'Q85c consumer dropped': [('def checks_0312():', "DATOMIC_RULES.pop('Q85c', None)\n\ndef checks_0312():")],
 'Q85d literal weakened': [('"The TypeScript and JVM codecs share one specification of each value kind\'s '
                            'range and representation, with a shared test vector set; a value either codec '
                            'cannot represent is refused by both."',
                            '"WEAKENED Q85d"')],
 'Q85d consumer dropped': [('def checks_0312():', "DATOMIC_RULES.pop('Q85d', None)\n\ndef checks_0312():")],
 'Q86a literal weakened': [('"Every candidate process (builds, case runners, lane D gateways, A0) runs in a '
                            'hardened container in the triplex2 VM and none on the Mac: uid 10001, '
                            '--cap-drop ALL, no-new-privileges, --read-only with tmpfs, memory = '
                            'memory-swap, --pids-limit, --oom-score-adj 500, no Docker socket, no Mac bind '
                            "mounts. Inputs enter as a tar of the contract's `boxInputs` (built packages, "
                            'workspace manifests, lockfile; never lab/) plus a read-only Linux pnpm store '
                            'volume filled by orchestrator tooling; outputs leave only through per-case '
                            '`docker exec` stdout (capped, timed, hashed on receipt) and a trusted walker '
                            'container."',
                            '"WEAKENED Q86a"')],
 'Q86a consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86a', None)\n\ndef checks_0312():")],
 'Q86b literal weakened': [('"Each container has its own PID namespace; after every case `docker top` must '
                            "show only the runner's processes and at teardown the container cgroup must be "
                            'gone (read by the R27 observer), else the run fails closed."',
                            '"WEAKENED Q86b"')],
 'Q86b consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86b', None)\n\ndef checks_0312():")],
 'Q86c literal weakened': [('"One internal network per arm with no gateway, whose only other member is a '
                            "trusted relay to that arm's slot engine (R27's TO proxy in its own container); "
                            'builds and offline cases use --network none; a preflight check runs every time '
                            'and any failure marks the run ISOLATION-NOT-IN-FORCE (DIAGNOSTIC)."',
                            '"WEAKENED Q86c"')],
 'Q86c consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86c', None)\n\ndef checks_0312():")],
 'Q86d literal weakened': [('"Adds the image id and build-input hash, the toolchain read inside the image, '
                            'the store volume listing hash, a canonical isolation-profile hash checked '
                            'against docker inspect, and daemon, containerd, runc and kernel versions; '
                            'container names, cpusets and slot stay placement (Q67g)."',
                            '"WEAKENED Q86d"')],
 'Q86d consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86d', None)\n\ndef checks_0312():")],
 'Q86e literal weakened': [('"Oracle files never enter a candidate container and the candidate image has no '
                            'python3 (closes oracle laundering, L1). The evaluator works from its own clone '
                            'with commit ids passed explicitly, never `--authority-ref main` (closes D3, a '
                            'builder moving main)."',
                            '"WEAKENED Q86e"')],
 'Q86e consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86e', None)\n\ndef checks_0312():")],
 'Q86f literal weakened': [('"Paired arms put each arm\'s SUT, relay and observer on one shared core; lane '
                            "D's candidate gateway leaves the engine container for its own container, and "
                            'lane D durable-readback evidence is not accepted until SQL storage replaces dev '
                            'storage (the H2 password lets the gateway write storage directly)."',
                            '"WEAKENED Q86f"')],
 'Q86f consumer dropped': [('def checks_0312():', "ISOLATION_RULES.pop('Q86f', None)\n\ndef checks_0312():")],
 'Q79f literal weakened': [('"The X02 guard treats comments exactly as the pinned XTDB lexer does '
                            '(SqlLexer.g4:12 defines BLOCK_COMMENT recursively): balanced nested block '
                            'comments are consumed at any depth, an unterminated comment is an error, and '
                            "the guard's tokenizer must agree with the lexer on every identifier boundary, "
                            'including dollar-bearing, quoted and Unicode identifiers. Where the guard and '
                            'the lexer disagree, the query is refused, never passed."',
                            '"WEAKENED Q79f"')],
 'Q79f consumer dropped': [('def checks_0312():',
                            "EXACT_QUERY_RULES.pop('Q79f', None)\n\ndef checks_0312():")],
 'Q87 literal weakened': [('"A contract version merges into main only when lab/bin/test/claim.test.mjs and '
                           'claim-round2.test.mjs pass on the contract branch merged with main, in addition '
                           "to build_contract.py --verify and the contract's own tests. Contract 0.3.11 at "
                           '3b46c8a passed its review but fails 8 of 108 evaluator tests; its merge into '
                           'main (e074baf) was undone before anything built on it."',
                           '"WEAKENED Q87"')],
 'Q87 consumer dropped': [('def checks_0312():', "MERGE_GATES.pop('Q87', None)\n\ndef checks_0312():")],
 'Q83e literal weakened': [('"Settle evidence records three values separately and never equates them: (a) '
                            "the block-cut frontier F, the immutable block's latest_processed_msg_id; (b) "
                            'the settled replay frontier M, the processed watcher after maintenance drains '
                            '(lag 0, jobs 0, tries stable, over the Q83d polls); (c) the stable application '
                            'transaction T. F < M is accepted only when every source message in (F, M] is '
                            'read from the stopped log tail and is a maintenance message (TriesAdded, '
                            'compactor output), never an application transaction; T is unchanged across the '
                            'window. The final stopped log tails and the reference and clone resume are '
                            'bound to M. Exact reference/clone equality and the two-start catalog checks '
                            'stay. This replaces the part of Q83d that refused every F < M."',
                            '"WEAKENED Q83e"')],
 'Q83e consumer dropped': [('def checks_0312():', "SEED_RULES.pop('Q83e', None)\n\ndef checks_0312():")],
 'O-OBS screening scope promoted': [('"acceptanceLevel": "screening", "acceptanceRequires":',
                                     '"acceptanceLevel": "full", "acceptanceRequires":')],
 'O-OBS commit replaced': [('"files": "lab/acceptance/oracle/observe.py", "commit": '
                            '"23e2273fc6b15b92821b318acd387f5484155d8a"',
                            '"files": "lab/acceptance/oracle/observe.py", "commit": '
                            '"ffffffffffffffffffffffffffffffffffffffff"')],
 'O-OBS transitive runner omitted': [('O_OBS_FILES = dict(O_REPLAY_FILES, **', 'O_OBS_FILES = dict({}, **')],
 'O-OBS pin hash altered': [('668136f3c99e09b5332363bb6beaac7f177d07ef7718eb59b2b801faeedcb2cb',
                             'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
 'O-OBS verifier removed': [('def checks_0312():',
                             'VERIFIER_REGISTRY["entries"].pop("V-O05-round4")\n\ndef checks_0312():')],
 'Q82c screening admission bypass': [('            if pins[x].get("acceptanceLevel") == "screening":',
                                      '            if False:')],
 'Q82c screening blocker bypass': [('        if pin and pin.get("acceptanceLevel") == "screening":',
                                    '        if False:')],
 'Q82b single source safety': [('2 if _protocol in (', '1 if _protocol in (')],
 'Q82d observer outputs omitted': [('"observer outputs", "old index generations", "freed blocks"]',
                                    '"old index generations", "freed blocks"]')],
 'Q83e resume bound to F': [('"resumeBoundTo": "M"', '"resumeBoundTo": "F"')],
 'Q83b supersession removed': [('supersededBy=["Q83b", "Q83d", "Q83e"]', 'supersededBy=[]')],
 'Q86 isolation prematurely in force': [('"inForce": False', '"inForce": True')],
 'Q87 tests reduced': [('"minimumTests": 108', '"minimumTests": 107')],
 'Q87 weakening assertions allowed': [('"weakenAssertions": False', '"weakenAssertions": True')]})
# [EXP-A01-0312] Why: Q86e supersedes Q61a's mutable-ref lookup; mutate the operative field rather than its overwritten history. Rejected: counting the old no-op as a semantic defect or dropping its control.
tests["Q61a source"] = T(("never --authority-ref main (Q86e supersedes Q61a lookup)", "from the claimed commit (Q61a)"))
tests.update({'Q59c V-O04i report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-O04i\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-O03 report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-O03\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-O04c report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-O04c\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-D01-W0-1.1.1 report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-D01-W0-1.1.1\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-D01e-W0-1.1.2 report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-D01e-W0-1.1.2\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-D01c-O-DOMAIN report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-D01c-O-DOMAIN\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')], 'Q59c V-O05-round4 report substituted with matching hash': [('def checks_0312():', 'VERIFIER_REGISTRY["entries"][\'V-O05-round4\'].update(brief="lab/acceptance/pins/O-OBS-V-O05-round4.md", briefSha256="aa275c634384c42977b6ed294be9cb527423a9ad824b9101556017b065bb12dc")\n\ndef checks_0312():')]})
tests.update({'Q88a literal weakened': [('"Lane D evidence from Datomic dev storage is DIAGNOSTIC for every durable-readback, lost-ACK, P2 receipt and final acceptance obligation. Dev storage is H2 inside the transactor with H2\'s default 500 ms write delay, so an abrupt transactor stop can lose acknowledged transactions, which P2\'s 100% receipt bar does not allow. Acceptance runs on SQL storage on PostgreSQL (fsync on commit) with peers on a SELECT-only role (closes R28\'s R5, the peer writing storage). Dev storage stays allowed for development gates. This decides the storage half of Q78e without loosening any of Sam\'s bars; the other option R32 lists (accept a declared loss window) would loosen P2 and is Sam\'s alone."', "'WEAKENED Q88a'")], 'Q88a consumer dropped': [('def checks_0312_round3():', "DATOMIC_RULES.pop('Q88a', None)\n\ndef checks_0312_round3():")], 'Q88b literal weakened': [("'Lane D moves to SQL storage in EXP-DA04 (brief lab/experiments/EXP-DA04-sql-storage/BRIEF.md) before the DA03 NS smoke: resident pair Postgres 0.5 GiB plus Datomic 2.25 GiB in the existing 2.75 GiB budget (fallback 3.0 GiB if G1 runs short), exclusive lane D slot 4.0 GiB with the resident pair parked. Gates: G1 88/88 with --previous; durability probes D1 (abrupt transactor stop) and D2 (abrupt Postgres stop) with zero lost ACKs, D0 the same on dev storage as the control; tenancy probe; erasure inventory smoke.'", "'WEAKENED Q88b'")], 'Q88b consumer dropped': [('def checks_0312_round3():', "DATOMIC_RULES.pop('Q88b', None)\n\ndef checks_0312_round3():")], 'Q88c literal weakened': [("'Crypto-shredding is the primary PII erasure on every lane D storage; Datomic excision in batches of about 2,000 to 3,000 datoms is the second layer; keys live in their own Postgres schema so key deletion can be shown by scanning table files and WAL.'", "'WEAKENED Q88c'")], 'Q88c consumer dropped': [('def checks_0312_round3():', "DATOMIC_RULES.pop('Q88c', None)\n\ndef checks_0312_round3():")], 'Q45a xtdb-workloads.ts repin reverted': [("'ff39d3f2fcb74ee2a318e8801a12680a4f9f366b4a7f5ed9e20e89d5ccd8a3d0'", "'22d785b034e440ca896b3fce7fe2df94e643586cb802fddd940fea84aff31fc3'")], 'Q45a xtdb-workloads.ts repin omitted': [('def checks_0312_round3():', "WORKLOAD_REPINS_0312.pop('packages/qualification/src/native/xtdb-workloads.ts')\n\ndef checks_0312_round3():")], 'Q45a qlever-workloads.ts repin reverted': [("'9349878403ee468ce6b64922c648d88f598f799b1c65fc42a712aa47598e54da'", "'410963c62f46be95525643f5eb78bf4069dee27d986b251f2aca33d05e48d2b3'")], 'Q45a qlever-workloads.ts repin omitted': [('def checks_0312_round3():', "WORKLOAD_REPINS_0312.pop('packages/qualification/src/native/qlever-workloads.ts')\n\ndef checks_0312_round3():")], 'Q88 dev evidence promoted': [('"developmentEvidence": "DIAGNOSTIC"', '"developmentEvidence": "QUALIFIED"')], 'Q88 unsafe peer role': [('"peerRole": "SELECT-only"', '"peerRole": "read-write"')]})
# [EXP-A01-0313] Why: Q93 retires these predicates; their negative controls are retained as named historical controls, not counted as executed. Rejected: counting a mutation of superseded source as caught.
retired_0313 = {"Q83d literal weakened": "Q93a retires Q83d", "Q83d consumer dropped": "Q93a retires Q83d", "Q83e literal weakened": "Q93a retires Q83e", "Q83e consumer dropped": "Q93a retires Q83e", "Q83e resume bound to F": "Q93 content gate replaces resume gating", "Q83b supersession removed": "Q93 replaces Q83b/d/e precedence"}
for name in retired_0313:
    tests[name] = [("INTENTIONALLY_RETIRED_0313:" + name, "")]
tests['Q74b literal weakened'] = [("'becomes the **recipe**: two finish-blocks, jobs-0 waits, `docker stop -t 60`, copy from a stopped container. A timeout refuses; nothing in it grants.'", "'WEAKENED Q74b'")]
tests['Q74d literal weakened'] = [("'**replaced** by Q93a/b: health precondition plus G0 in the driver; `owner.json` holds slot ownership only'", "'WEAKENED Q74d'")]
tests['Q83a literal weakened'] = [("'**kept as a diagnostic aid**; no rule requires the lines'", "'WEAKENED Q83a'")]
tests['Q83b literal weakened'] = [("'**superseded by Q93a**: the steps stay in the recipe, their readings become diagnostics; `xt.live_tables` is read only on a freshly started node (K3)'", "'WEAKENED Q83b'")]
tests['Q83c literal weakened'] = [("'kept for diagnostic tools; B never reads `xt.block_files`'", "'WEAKENED Q83c'")]
tests['Q74c literal weakened'] = [('"No clone-seeded receipt counts, even for screening, until validation E1 passes: a fresh-seeded slot against its clone under the PAIR-0 A/A procedure, holding within 1.10 at p50 and 1.15 at p99, with R26 section 6.9\'s seven predictions checked. **unchanged**; E1 is rerun when the recipe, the image or the XTDB version changes"', "'WEAKENED Q74c'")]
tests['Q91a literal weakened'] = [('"QLever-lane performance evidence (P1, P4, P5, GS) counts only from a server whose data sits mostly in a built base index with a delta bounded by a declared rebuild threshold. Every QLever receipt records base triple count, delta triple count and the delta in the blocks the measured scans touched. The lane\'s design (R2, R8, R13, R17) always assumed this; nothing built or measured it, and qlever-dev\'s base holds 1 triple. Earlier QLever latency numbers from delta-only servers are DIAGNOSTIC."', "'WEAKENED Q91a'")]
tests['Q91a consumer dropped'] = [("def checks_0314():", "QLEVER_EVIDENCE_RULES.pop('Q91a', None)\n\ndef checks_0314():")]
tests['Q91b literal weakened'] = [("'qlever-dev is no longer reset with --fresh as a delta policy; delta growth on shared residents is handled by the rebuild loop of Q91c once it is qualified.'", "'WEAKENED Q91b'")]
tests['Q91b consumer dropped'] = [("def checks_0314():", "QLEVER_EVIDENCE_RULES.pop('Q91b', None)\n\ndef checks_0314():")]
tests['Q91c literal weakened'] = [('"EXP-QG1 (lab/experiments/EXP-QG1-qlever-generations/) builds the rebuild loop: phase 1 on an exclusive slot measures scan and join cost against delta size (monotonic and spread keys) on a 10M-triple base and picks the threshold; phase 2 rebuilds blue/green index generations from the broker log, with reader leases so one multi-request read stays on one generation, and checks Q89i byte identity across every swap. The feed stays the log. Bounding the delta per graph is rejected (all graphs share one server\'s blocks)."', "'WEAKENED Q91c'")]
tests['Q91c consumer dropped'] = [("def checks_0314():", "QLEVER_EVIDENCE_RULES.pop('Q91c', None)\n\ndef checks_0314():")]
tests['Q91d literal weakened'] = [('"The first rebuild-index runs on a copy of qlever-dev\'s data on an exclusive slot, not on the shared resident, because several reviews read qlever-dev live and upstream bug #3172 can make a rebuild fail."', "'WEAKENED Q91d'")]
tests['Q91d consumer dropped'] = [("def checks_0314():", "QLEVER_EVIDENCE_RULES.pop('Q91d', None)\n\ndef checks_0314():")]
tests['Q93a literal weakened'] = [("'For seed reuse on every lane, the only evidence that grants admission is a content fingerprint (G0) read through the engine by the process that will measure, on the endpoint it measures, before its warm-up, compared with a digest pinned before the freeze began (and with O-DOMAIN where one exists). Every other observation (stop, settle, log tails, frontiers, inspect, stderr, timers, owner state, copy hashes, plan hashes, disk) is refusal-only or a diagnostic, and no decision reads a diagnostic.'", "'WEAKENED Q93a'")]
tests['Q93a consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q93a', None)\n\ndef checks_0314():")]
tests['Q93b literal weakened'] = [("'Fields, pinning point and counts as in sections 2.1 and 3.2; every read has a deadline; the golden is published only after two starts of a clone each reproduce `D` and the layout digest `L`.'", "'WEAKENED Q93b'")]
tests['Q93b consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q93b', None)\n\ndef checks_0314():")]
tests['Q94b literal weakened'] = [("'Every GS stream is W0-valid and every domain claim a scenario names is checked by O-DOMAIN; a scenario whose spec names a domain claim and whose run makes no such check fails closed. The W01 world vocabulary is retired'", "'WEAKENED Q94b'")]
tests['Q94b consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94b', None)\n\ndef checks_0314():")]
tests['Q94c literal weakened'] = [("'The GS background is the frozen TARGETS 2.1 trace through the W0 trace mapper (Q92k); the private writerTrace is retired; every measured window holds one burst and one maintenance event'", "'WEAKENED Q94c'")]
tests['Q94c consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94c', None)\n\ndef checks_0314():")]
tests['Q94d literal weakened'] = [("'GS world admission follows Q93a: a G0 content fingerprint per run; a fresh scope or verified clone per run; store counts at start and end; on lane Q the Q91a counts'", "'WEAKENED Q94d'")]
tests['Q94d consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94d', None)\n\ndef checks_0314():")]
tests['Q94e literal weakened'] = [("'Every GS receipt before contract 0.4.0 is DIAGNOSTIC: none closes an obligation or enters a comparison. The GS.12 defect and the W01b harness findings stay as defect reports'", "'WEAKENED Q94e'")]
tests['Q94e consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94e', None)\n\ndef checks_0314():")]
tests['Q94f literal weakened'] = [('"GS.04b applies only to compositions with a separate current store; on those it is required. GS.04\'s engine-kill schedule is required on every lane and runs only on an exclusive slot"', "'WEAKENED Q94f'")]
tests['Q94f consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94f', None)\n\ndef checks_0314():")]
tests['Q94g literal weakened'] = [('"GS.19\'s outbox and GS.10\'s publications must be the product\'s atomic outbox; a harness-side outbox file can pass only GS.19\'s P3 checks, as a diagnostic"', "'WEAKENED Q94g'")]
tests['Q94g consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94g', None)\n\ndef checks_0314():")]
tests['Q94h literal weakened'] = [('"GS.10\'s race (in-flight reconciles finish on the old release) is scheduled as EXP-P5 round C, right after rounds A and B, and is required for GS.10 to close"', "'WEAKENED Q94h'")]
tests['Q94h consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94h', None)\n\ndef checks_0314():")]
tests['Q94i literal weakened'] = [('"GS.03\'s vendor-revision rule goes into W0-1.2 with an O-DOMAIN `signal-ack` operation; the `superseded` outcome stays flagged for Sam"', "'WEAKENED Q94i'")]
tests['Q94i consumer dropped'] = [("def checks_0314():", "GOLDEN_SCENARIO_RULES.pop('Q94i', None)\n\ndef checks_0314():")]
tests['Q93c literal weakened'] = [('"G0 admits a clone by the full digest D over every stored column (byte-level identity with its golden). E1, which compares a clone with a fresh seed of the same inputs, uses a second digest D\' over the same columns with engine-assigned values normalized: engine-generated ids and system timestamps are replaced by their rank in commit order, and every other column is kept as is. A fresh seed must match the golden\'s D\', never its D. The normalization list is part of the G0 module, each entry with a comment naming the engine source that assigns it, and a test fails if a column is normalized without one."', "'WEAKENED Q93c'")]
tests['Q93c consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q93c', None)\n\ndef checks_0314():")]
tests['Q83d revived'] = [("def checks_0314():", "SEED_RULES['Q83d'] = {}\n\ndef checks_0314():")]
tests['Q83e revived'] = [("def checks_0314():", "SEED_RULES['Q83e'] = {}\n\ndef checks_0314():")]
tests['Q93 only content grants'] = [('"grant": "G0 content fingerprint only; read in the measuring process on its measured endpoint before warm-up every run"', '"grant": "owner readiness grants"')]
tests['Q93 deadline removed'] = [('"deadlines": "every read has a deadline; timeout refuses"', '"deadlines": "none"')]
tests['Q93 D normalized incorrectly'] = [('"cloneDigest": "D: every stored column, byte-level identity to golden"', '"cloneDigest": "normalized digest"')]
tests['Q93 fresh digest uses D'] = [('"freshSeedDigest": "D-prime: same columns; only engine-assigned ids/system timestamps normalized to rank in commit order; every normalization has an engine-source comment and a test"', '"freshSeedDigest": "D"')]
tests['Q93 golden one start'] = [('"goldenPublication": "two starts of a qualification clone each reproduce D and L before golden publication"', '"goldenPublication": "one start"')]
tests['Q91 delta admitted'] = [('"deltaOnly": "DIAGNOSTIC"', '"deltaOnly": "ACCEPTED"')]
tests['Q91 fresh reset policy'] = [('"freshResetAsDeltaPolicy": False', '"freshResetAsDeltaPolicy": True')]
tests['Q94 comparison admitted'] = [('"entersComparison": False', '"entersComparison": True')]
tests['Q94 GS blocker removed'] = [('        out.append("gs-diagnostic-before-0.4.0:Q94e")', '        pass')]
tests['Q94 GS admission allowed'] = [('    if any(o["id"].startswith("GS.") for o in claimed):', '    if False:')]
tests['Q61i Datomic image unpinned'] = [("{'image': 'tx2-datomic:1.0.7745-da00', 'imageId': 'sha256:34fb9db10a278ff5614e7ac59788a2456329c75d098871ce1831465e243f2dcf'}", '{"image": None, "imageId": None}')]
tests['Q45a testkit identity reverted'] = [("'cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28'", "'6001458f13ca711e9679d6b8e6fe3b746ea60f4e9deb5be08b2484b17ad87988'")]
tests['Q45a pin review omitted'] = [('def checks_0314():', 'PIN_CHANGES_0313 = {}\n\ndef checks_0314():')]
tests["Q45a testkit case projection drift"] = [("def checks_0314():", "CS[\"CS-U44\"][\"pinnedSourceFiles\"][0][\"sha256\"] = \"bad\"\n\ndef checks_0314():")]
tests["Q45a testkit oracle projection drift"] = [("def checks_0314():", "ORACLES[\"O-TESTKIT\"][\"files\"] = []\n\ndef checks_0314():")]
tests['Q74b rule weakened'] = tests['Q74b literal weakened']
tests['Q74c rule weakened'] = tests['Q74c literal weakened']
tests['Q74d rule weakened'] = tests['Q74d literal weakened']
tests['Q83a consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q83a', None)\n\ndef checks_0314():")]
tests['Q83b consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q83b', None)\n\ndef checks_0314():")]
tests['Q83c consumer dropped'] = [("def checks_0314():", "SEED_RULES.pop('Q83c', None)\n\ndef checks_0314():")]
tests['Q83d revived'] = [("def checks_0314():", 'SEED_RULES[\'Q83d\'] = {\'topic\': \'settle evidence after fast compaction\', \'rule\': "Settle evidence does not require observing L0 tries: compaction may merge them before the first poll. Settled means the new block\'s tx_id and latest_processed_msg_id equal the node gauges, xt.trie_stats covers that block at whatever level it now sits, compactor jobs 0, and the file listing and trie digest are unchanged over three readings 5 s apart.", \'basis\': \'K01 round 2 (G3 blocked by fast compaction)\'}\n\ndef checks_0314():')]
tests['Q83e revived'] = [("def checks_0314():", 'SEED_RULES[\'Q83e\'] = {\'topic\': \'three frontiers\', \'rule\': "Settle evidence records three values separately and never equates them: (a) the block-cut frontier F, the immutable block\'s latest_processed_msg_id; (b) the settled replay frontier M, the processed watcher after maintenance drains (lag 0, jobs 0, tries stable, over the Q83d polls); (c) the stable application transaction T. F < M is accepted only when every source message in (F, M] is read from the stopped log tail and is a maintenance message (TriesAdded, compactor output), never an application transaction; T is unchanged across the window. The final stopped log tails and the reference and clone resume are bound to M. Exact reference/clone equality and the two-start catalog checks stay. This replaces the part of Q83d that refused every F < M.", \'basis\': \'XTDB c6c1962: BlockCutter.kt:235, 280-295; SourceMessage.kt:139-147; Compactor.kt:150-152; SourceLogProcessor.kt:142, 199-211; Database.kt:375-387\'}\n\ndef checks_0314():')]
# [CX-A01-0314] Why: each new ruling and repin must reject missing or changed content. Rejected: an exit-code-only positive run.
for rid in ['Q96a','Q96b','Q96c','Q96d','Q97a','Q97b','Q97c']:
    dest = 'LANE_X_P2_RULES' if rid.startswith('Q96') else 'LANE_Q_P4_RULES'
    tests[rid+' literal weakened'] = [('def checks_0314():', f'RULES_0314[{rid!r}]["rule"] = "weakened"\n\ndef checks_0314():')]
    tests[rid+' consumer missing'] = [('def checks_0314():', f'{dest}.pop({rid!r})\n\ndef checks_0314():')]
    tests[rid+' compiled row absent'] = [('def checks_0314():', f'RULINGS[:] = [r for r in RULINGS if r["id"] != {rid!r}]\n\ndef checks_0314():')]
tests['0314 repin missing'] = [('def checks_0314():','PIN_CHANGES_0314 = {}\n\ndef checks_0314():')]
tests['0314 repin stale'] = [('def checks_0314():', 'PIN_CHANGES_0314["packages/testkit/src/index.ts"]["sha256"] = "cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28"\n\ndef checks_0314():')]
tests['0314 case pin stale'] = [('def checks_0314():', 'CS["CS-U44"]["pinnedSourceFiles"][0]["sha256"] = "cb89a55ced5426b8fa0af3523fbbeb73870e61e3622ebb42e8a78c3e67da8d28"\n\ndef checks_0314():')]
tests['0314 review binding absent'] = [('def checks_0314():','RULING_REVIEW_0314["commit"] = "missing"\n\ndef checks_0314():')]

tests['0314 pending Sam id truncated'] = [(r'Q\d+[a-z]?(?:-clarified|-S\d+)?|AMB-', r'Q\d+[a-z]?(?:-clarified)?|AMB-')]

run, caught, missed, retired = 0, 0, [], []
for name, pairs in tests.items():
    if any(src.count(a) < 1 for a, _ in pairs):
        retired.append(name)
        continue
    t = src
    for a, b in pairs:
        t = t.replace(a, b, 1)
    t = t.replace("        (HERE / name).write_text(text)", "        pass")
    mut.write_text(t)
    r = subprocess.run([sys.executable, "-I", str(mut)], capture_output=True, text=True, cwd=str(REPO))
    msg = (r.stdout + r.stderr).strip().splitlines()
    ok = r.returncode != 0 and bool(msg) and msg[0].startswith("CONTRACT INVALID")
    run += 1
    caught += ok
    print(("CAUGHT " if ok else "MISSED ") + name + ": " + (msg[1] if len(msg) > 1 else (msg[0] if msg else ""))[:140])
    if not ok:
        missed.append(name)
mut.unlink()
print(f"total {len(tests)} run {run} caught {caught} missed: {missed} retired (anchor gone): {len(retired)} {retired}")
sys.exit(1 if missed else 0)
