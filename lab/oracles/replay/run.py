"""Case driver: case JSON in, expected-answer JSON out (SCHEMA.md)."""

from __future__ import annotations

import copy
import hashlib
from pathlib import Path

from . import entities as E
from . import exact as X
from . import replay as R
from . import scale as S
from . import values as V
from . import views as W

CASE_FORMAT = "triplex-db-2/o-replay-case/1"
OUTPUT_FORMAT = "triplex-db-2/o-replay-expected/1"
ORACLE_VERSION = "0.1.0"
SOURCE_FILES = ["__init__.py", "__main__.py", "cli.py", "values.py", "exact.py", "replay.py", "constraints.py",
                "views.py", "entities.py", "scale.py", "run.py", "selfcheck.py"]


def source_hashes():
    here = Path(__file__).parent
    return V.OrderedOut((name, hashlib.sha256((here / name).read_bytes()).hexdigest())
                        for name in SOURCE_FILES if (here / name).exists())


QUERIES = {
    "match": W.q_match, "entityTriples": W.q_entity_triples, "history": W.q_history,
    "assertionSnapshot": W.q_assertion_snapshot, "assertions": W.q_assertions,
    "transactions": W.q_transactions, "transaction": W.q_transaction,
    "transactionByCommand": W.q_transaction_by_command, "transactionsForEntity": W.q_transactions_for_entity,
    "cutCatalog": W.q_cut_catalog, "entityPage": W.q_entity_page, "valueSupports": W.q_value_supports,
    "reachability": W.q_reachability, "aggregate": W.q_aggregate, "expr": W.q_expr, "compare": W.q_compare,
    "sortValues": W.q_sort_values, "get": E.q_get, "getMany": E.q_get, "find": E.q_find,
    "timeline": E.q_timeline, "validTimeline": E.q_valid_timeline,
}


def _analytic(run, query):
    return V.OrderedOut(S.configured_entity_counts(int(query["n"]), int(query["width"])).items())


QUERIES["analyticCounts"] = _analytic


class Run:
    def __init__(self, case):
        if case.get("format") != CASE_FORMAT:
            raise V.OracleInputError(f"case format must be {CASE_FORMAT}")
        self.case = case
        self.schemas = E.load_schemas(case.get("schemas"))
        self.engine = R.Engine(case.get("rules"), case.get("adapter"), self.schemas, case.get("enforcement"),
                               case.get("defaultScope", "default"))
        self.commands = list(case.get("commands") or [])
        for i, command in enumerate(self.commands):
            command["_index"] = i
        receipts = case.get("receipts")
        self.receipt_mode = receipts is not None
        self.receipts = {}
        for rec in receipts or []:
            idx = int(rec["command"])
            if idx in self.receipts:
                raise V.OracleInputError(f"two receipts for command {idx}")
            self.receipts[idx] = rec
        self.command_positions = {}
        self.outcomes = {}
        self.violations = []
        self.diverged_at = None
        self.next_synth = {}

    # ------------------------------------------------------------------ identities

    def _receipt(self, index):
        rec = self.receipts.get(index)
        if rec is None:
            return None
        outcome = rec.get("outcome")
        if outcome == "unknown":
            outcome = rec.get("resolvedOutcome")
            if outcome is None:
                self.violations.append({"rule": "R-RCP-6", "command": index, "problem": "unresolved unknown outcome"})
                return None
        return dict(rec, outcome=outcome)

    def _instant(self, command, rec):
        if rec is not None and rec.get("outcome") == "committed" and rec.get("instant") is not None:
            return V.Num.parse(rec["instant"], "receipt instant")
        if command.get("clock") is not None:
            return V.Num.parse(command["clock"], "command clock")
        return None

    def _identity(self, state, command, rec, instant):
        ops = command.get("operations") or []
        if rec is not None and rec.get("outcome") == "committed" and rec.get("position") is not None:
            ids = list(rec.get("assertionIds") or [])
            usable = len(ids) == len(ops)
            seen = set()
            for op, aid in zip(ops, ids):
                if op.get("op") == "assert" and (aid is None or aid in state.assertions or aid in seen):
                    usable = False
                seen.add(aid)
            if not usable:
                # R-RCP-4: identities that cannot be bound are replaced by symbolic ones
                ids = [f"unbound:{command['_index']}:{i}" if op.get("op") == "assert" else None
                       for i, op in enumerate(ops)]
                self._diverge(command["_index"])
            return {"txId": rec.get("txId"), "position": int(rec["position"]), "instant": instant,
                    "assertionIds": ids, "fromReceipt": True}
        position = max(state.last_position, self.next_synth.get(state.name, 0)) + 1
        self.next_synth[state.name] = position
        ids = [(op.get("ref") or f"a:{command['_index']}:{i}") if op.get("op") == "assert" else None
               for i, op in enumerate(ops)]
        return {"txId": f"tx:{command['_index']}", "position": position,
                "instant": instant if instant is not None else V.Num(float(position)),
                "assertionIds": ids, "fromReceipt": False}

    # ------------------------------------------------------------------ processing

    def process(self):
        i = 0
        while i < len(self.commands):
            command = self.commands[i]
            race = command.get("race")
            if race is None:
                self._sequential(command)
                i += 1
            else:
                j = i
                while j < len(self.commands) and self.commands[j].get("race") == race:
                    j += 1
                self._race(self.commands[i:j])
                i = j

    def _expect(self, state, command, instant):
        if command.get("hostAbort"):
            raise R.Rejected("host-abort", "the host aborted this command's transaction (declared intent)")
        if instant is None and any(op.get("op") == "assert" and op.get("validFrom") is None
                                   for op in command.get("operations") or []):
            raise V.OracleInputError(f"command {command['_index']} needs a clock or receipt instant")
        return self.engine.plan(state, command, instant or V.Num(0.0))

    def _sequential(self, command):
        index = command["_index"]
        state = self.engine.scope(command.get("scope") or self.engine.default_scope)
        rec = self._receipt(index)
        if command.get("kind", "transact") == "internal":
            expected = V.OrderedOut([("outcome", command.get("expectedOutcome", "committed"))])
            if expected.get("outcome") == "committed":
                identity = self._identity(state, command, rec, self._instant(command, rec))
                self.engine.apply_internal(state, command, identity)
                self.command_positions[index] = identity["position"]
            self._record(index, expected, rec)
            return
        instant = self._instant(command, rec)
        try:
            plan = self._expect(state, command, instant)
        except R.Rejected as rejection:
            self._record(index, rejection.to_output(), rec)
            return
        identity = self._identity(state, command, rec, instant)
        if not identity["fromReceipt"] and self.receipt_mode:
            self._diverge(index)
        self.engine.apply(state, command, plan, identity)
        self.command_positions[index] = identity["position"]
        self._record(index, V.OrderedOut([("outcome", "committed")]), rec)

    def _race(self, members):
        """R-CMD-10: a declared race group. The system's serial order among committed
        members is taken from receipt positions (an identity fact); every outcome is
        still derived by the oracle."""
        state = self.engine.scope(members[0].get("scope") or self.engine.default_scope)
        recs = {m["_index"]: self._receipt(m["_index"]) for m in members}
        if self.receipt_mode:
            committed = sorted((m for m in members if (recs[m["_index"]] or {}).get("outcome") == "committed"),
                               key=lambda m: int(recs[m["_index"]]["position"]))
            others = [m for m in members if m not in committed]
        else:
            committed, others = list(members), []
        prefixes = [(copy.deepcopy(state.__dict__), dict(self.engine.sym_ids))]
        winners = []
        for m in committed:
            rec = recs[m["_index"]]
            instant = self._instant(m, rec)
            try:
                plan = self._expect(state, m, instant)
            except R.Rejected as rejection:
                if not self.receipt_mode:
                    others.append(m)
                    self._record(m["_index"], rejection.to_output(), rec)
                    continue
                self._record(m["_index"], rejection.to_output(), rec)
                continue
            identity = self._identity(state, m, rec, instant)
            self.engine.apply(state, m, plan, identity)
            self.command_positions[m["_index"]] = identity["position"]
            winners.append(m["_index"])
            self._record(m["_index"], V.OrderedOut([("outcome", "committed")]), rec)
            prefixes.append((copy.deepcopy(state.__dict__), dict(self.engine.sym_ids)))
        if not self.receipt_mode:
            return
        final = (copy.deepcopy(state.__dict__), dict(self.engine.sym_ids))
        for m in others:
            rec = recs[m["_index"]]
            possible = []
            for snapshot, syms in prefixes:
                probe = R.ScopeState(state.name)
                probe.__dict__.update(copy.deepcopy(snapshot))
                saved = self.engine.sym_ids
                self.engine.sym_ids = dict(syms)
                try:
                    self._expect(probe, m, self._instant(m, rec) or V.Num(0.0))
                    possible.append(None)
                except R.Rejected as rejection:
                    possible.append(rejection)
                finally:
                    self.engine.sym_ids = saved
            failures = [p for p in possible if p is not None]
            if failures:
                expected = failures[0].to_output()
                expected.append(("possibleCategories", sorted({p.category for p in failures})))
            else:
                expected = V.OrderedOut([("outcome", "committed"),
                                         ("note", "succeeds at every serialization point of its race")])
            self._record(m["_index"], expected, rec)
        state.__dict__.update(final[0])
        self.engine.sym_ids = final[1]

    def _diverge(self, index):
        if self.diverged_at is None:
            self.diverged_at = index

    def _record(self, index, expected, rec):
        observed = None
        verdict = "EXPECTED-ONLY"
        if self.receipt_mode:
            if rec is None:
                verdict = "FAIL"
                self.violations.append({"rule": "R-RCP-6", "command": index, "problem": "no receipt / unresolved"})
            else:
                observed = V.OrderedOut([("outcome", rec.get("outcome"))])
                if rec.get("error") is not None:
                    observed.append(("errorTag", rec["error"].get("_tag")))
                verdict = self._compare(expected, rec)
                if verdict == "FAIL":
                    self._diverge(index)
        self.outcomes[index] = V.OrderedOut([("command", index), ("expected", expected), ("observed", observed),
                                             ("verdict", verdict)])

    @staticmethod
    def _compare(expected, rec):
        want = expected.get("outcome")
        got = rec.get("outcome")
        if want != got:
            return "FAIL"
        if want == "committed":
            return "PASS"
        tag = expected.get("errorTag")
        got_tag = (rec.get("error") or {}).get("_tag")
        possible = expected.get("possibleCategories")
        got_cat = rec.get("category")
        if possible and got_cat is not None:
            return "PASS" if got_cat in possible else "FAIL"
        if tag is None:
            if got_cat is not None:
                return "PASS" if got_cat == expected.get("category") else "FAIL"
            return "PASS-OUTCOME-ONLY"
        if got_tag != tag:
            return "FAIL"
        if tag == "CommandAlreadyCommittedError":
            original = (rec.get("error") or {}).get("transactionId")
            return "PASS" if original is None or original == expected.get("transactionId") else "FAIL"
        if tag == "ConstraintViolationError":
            codes = (rec.get("error") or {}).get("codes")
            return "PASS" if codes is None or sorted(codes) == expected.get("codes") else "FAIL"
        return "PASS"

    # ------------------------------------------------------------------ receipt consistency

    def receipt_consistency(self):
        """Spec item 2 as corrected by the orchestrator: positions dense and increasing
        per scope, ids unique, rejected commands hold no position. Instants are NOT
        required to be non-decreasing (runtimes supply their own clocks)."""
        if not self.receipt_mode:
            return V.OrderedOut([("status", "NOT-APPLICABLE"), ("reason", "no receipts supplied")])
        problems = list(self.violations)
        by_scope = {}
        tx_ids, assertion_ids = {}, {}
        for command in self.commands:
            index = command["_index"]
            rec = self.receipts.get(index)
            if rec is None:
                continue
            outcome = rec.get("outcome") if rec.get("outcome") != "unknown" else rec.get("resolvedOutcome")
            scope = command.get("scope") or self.engine.default_scope
            if outcome == "committed":
                for field in ("txId", "position", "instant"):
                    if rec.get(field) is None:
                        problems.append({"rule": "R-RCP-1", "command": index, "problem": f"committed receipt lacks {field}"})
                if rec.get("position") is not None:
                    by_scope.setdefault(scope, []).append((index, int(rec["position"]), command))
                if rec.get("txId") is not None:
                    if rec["txId"] in tx_ids:
                        problems.append({"rule": "R-RCP-3", "command": index, "problem": "txId reused",
                                         "other": tx_ids[rec["txId"]]})
                    tx_ids[rec["txId"]] = index
                ops = command.get("operations") or []
                ids = rec.get("assertionIds")
                if command.get("kind", "transact") != "internal":
                    if ids is None or len(ids) != len(ops):
                        problems.append({"rule": "R-RCP-4", "command": index,
                                         "problem": "assertionIds must align with operations"})
                    else:
                        for op, aid in zip(ops, ids):
                            if (op.get("op") == "assert") != (aid is not None):
                                problems.append({"rule": "R-RCP-4", "command": index,
                                                 "problem": "assertion id presence does not match op kinds"})
                            if aid is not None:
                                key = (scope, aid)
                                if key in assertion_ids:
                                    problems.append({"rule": "R-RCP-3", "command": index,
                                                     "problem": f"assertion id {aid} reused",
                                                     "other": assertion_ids[key]})
                                assertion_ids[key] = index
                if command.get("clock") is not None and rec.get("instant") is not None:
                    if V.Num.parse(command["clock"]) != V.Num.parse(rec["instant"]):
                        problems.append({"rule": "R-RCP-7", "command": index,
                                         "problem": "receipt instant differs from the declared deterministic clock"})
            elif outcome == "rejected":
                for field in ("position", "txId"):
                    if rec.get(field) is not None:
                        problems.append({"rule": "R-RCP-2", "command": index, "problem": f"rejected receipt holds {field}"})
                if any(x is not None for x in rec.get("assertionIds") or []):
                    problems.append({"rule": "R-RCP-2", "command": index, "problem": "rejected receipt holds assertion ids"})
        initial = self.case.get("initialPositions") or {}
        for scope, rows in by_scope.items():
            positions = sorted(p for _, p, _ in rows)
            start = int(initial.get(scope, positions[0] - 1)) + 1
            if positions != list(range(start, start + len(positions))):
                problems.append({"rule": "R-RCP-1", "scope": scope,
                                 "problem": "positions are not dense", "positions": positions, "expectedStart": start})
            last = None
            for index, position, command in rows:   # stream order; race members may reorder
                if last is not None and position < last[1] and not (
                        command.get("race") is not None and command.get("race") == last[2].get("race")):
                    problems.append({"rule": "R-RCP-1", "command": index,
                                     "problem": "position decreases in stream order outside a race group"})
                last = (index, position, command)
            groups = {}
            for index, position, command in rows:
                if command.get("physicalGroup") is not None:
                    groups.setdefault(command["physicalGroup"], []).append(position)
            for group, members in groups.items():
                members.sort()
                if members != list(range(members[0], members[0] + len(members))):
                    problems.append({"rule": "R-RCP-5", "physicalGroup": group,
                                     "problem": "positions of one physical transaction are not consecutive",
                                     "positions": members})
        return V.OrderedOut([("status", "FAIL" if problems else "PASS"),
                             ("violations", [V.OrderedOut(p.items()) for p in problems])])

    # ------------------------------------------------------------------ queries

    def run_queries(self):
        out = []
        for i, query in enumerate(self.case.get("queries") or []):
            kind = query.get("kind")
            qid = query.get("id", f"q{i}")
            if kind not in QUERIES:
                raise V.OracleInputError(f"unknown query kind {kind!r}")
            entry = [("id", qid), ("kind", kind)]
            try:
                entry.append(("result", QUERIES[kind](self, query)))
            except X.TypedError as error:
                entry.append(("error", error.to_output()))
            except E.Conflicts as error:
                entry.append(("error", error.to_output()))
            except V.InvalidValue as error:
                entry.append(("error", V.OrderedOut([("error", "invalid-value"), ("message", str(error))])))
            out.append(V.OrderedOut(entry))
        return out


def evaluate_case(case, case_sha256=None):
    run = Run(case)
    run.process()
    consistency = run.receipt_consistency()
    queries = run.run_queries()
    outcomes = [run.outcomes[i] for i in sorted(run.outcomes)]
    failed = consistency.get("status") == "FAIL" or any(o.get("verdict") == "FAIL" for o in outcomes)
    verdict = "FAIL" if failed else ("PASS" if run.receipt_mode else "EXPECTED-ONLY")
    scopes = []
    for name, state in sorted(run.engine.scopes.items()):
        scopes.append(V.OrderedOut([
            ("scope", name), ("lastPosition", state.last_position),
            ("assertions", [R.assertion_output(a) for a in W.ordered(state.assertions.values())]),
            ("transactions", [R.record_output(r) for r in state.records if getattr(r, "journaled", True)]),
        ]))
    return V.OrderedOut([
        ("format", OUTPUT_FORMAT),
        ("oracle", V.OrderedOut([("id", "O-REPLAY"), ("version", ORACLE_VERSION), ("sourceSha256", source_hashes())])),
        ("caseId", case.get("caseId")), ("caseSha256", case_sha256),
        ("verdict", verdict), ("divergedAtCommand", run.diverged_at),
        ("receiptConsistency", consistency), ("commandOutcomes", outcomes),
        ("state", scopes), ("queries", queries),
        ("rulesInEffect", V.OrderedOut((k, v if not isinstance(v, list) else list(v))
                                       for k, v in sorted(run.engine.rules.items()))),
    ])


def evaluate_text(text: bytes):
    digest = hashlib.sha256(text).hexdigest()
    case = V.loads(text.decode("utf-8"))
    return evaluate_case(case, digest)
