"""R-SCALE-*: closed-form counts equal explicit replay; spec item 13 self-checks pass
and are sensitive to the rules they protect."""

import json
import unittest

from lab.oracles.replay import scale as S
from lab.oracles.replay import selfcheck as C
from lab.oracles.replay.tests.helpers import evaluate


def replayed_counts(n, width):
    stream = list(S.generator_stream(n, width))
    case, _ = C.cfg8_case(n, width)
    report = evaluate(case)
    rel = [r for r in report["queries"] if r["id"] == "relation"][0]["result"]["assertions"]
    field = lambda a: a["attribute"].split("/", 1)[1]
    live = [a for a in rel if a["retractedPosition"] is None]
    presence_off = [r for r in report["queries"] if r["id"] == "cut-2-inside"][0]["result"]["raw"]
    domain = lambda a: field(a) not in ("present", "type-version")
    return {
        "configuredEntitiesLatest": sum(1 for a in live if field(a) == "present" and a["value"]["value"] is True),
        "activeDomainFacts": sum(1 for a in live if domain(a)),
        "activeFixtureFacts": len(live),
        "domainAssertionVersions": sum(1 for a in rel if domain(a)),
        "presenceAssertionVersions": sum(1 for a in rel if field(a) == "present"),
        "typeVersionAssertionVersions": sum(1 for a in rel if field(a) == "type-version"),
        "allFixtureAssertionVersions": len(rel),
        "fixtureRetirements": sum(1 for a in rel if a["retractedPosition"] is not None),
        "configuredEntitiesDuringPresenceOff": sum(1 for a in presence_off
                                                   if field(a) == "present" and a["value"]["value"] is True),
        "domainCommands": len(stream),
        "maxOps": max(len(ops) for _, ops in stream),
    }


class AnalyticCounts(unittest.TestCase):
    def test_closed_forms_match_explicit_replay(self):
        for n, width in ((1, 1), (8, 10), (101, 1), (1001, 10), (2501, 1)):
            with self.subTest(n=n, width=width):
                got = replayed_counts(n, width)
                want = S.configured_entity_counts(n, width)
                self.assertLessEqual(got.pop("maxOps"), S.MAX_OPS)
                for key, value in got.items():
                    self.assertEqual(value, want[key], key)

    def test_target_population(self):
        dense = S.configured_entity_counts(10_000_000, 10)
        self.assertEqual((dense["distinctDomainSubjects"], dense["activeDomainFacts"]), (10_000_000, 100_000_000))
        self.assertEqual(S.configured_entity_counts(10_000_000, 1)["activeDomainFacts"], 10_000_000)


class SelfChecks(unittest.TestCase):
    def test_all_sections_pass(self):
        report = json.loads(C.V.dumps(C.run_all()))
        failed = [c["check"] for s in report["sections"] for c in s["checks"] if not c["pass"]]
        self.assertEqual(failed, [])

    def test_ham_check_detects_a_leaked_future_retirement(self):
        """M-FUTURE-RETIREMENT-style sanity: corrupt the frozen reference, the check fails."""
        original = C.HERE / "selfcheck_fixtures/ham-v2-reference.json"
        ref = json.loads(original.read_text())
        case = ref["cases"][1]
        self.assertTrue(all(r["knownRetirement"] is None for r in case["expected"]))
        case["expected"][0]["knownRetirement"] = {"recordedAt": 1001.25, "txId": "logical-tx2"}
        text = json.dumps(ref)
        real = C.HERE / "selfcheck_fixtures"
        old_read = type(original).read_text

        def fake(self, *a, **k):
            return text if self == original else old_read(self, *a, **k)
        type(original).read_text = fake
        try:
            rows = C.check_ham()
        finally:
            type(original).read_text = old_read
        self.assertIn(False, [r["pass"] for r in rows if r["check"] == "ham-case:" + case["id"]])
        self.assertTrue(real.exists())

    def test_continuation_table_check_detects_a_missing_paged_kind(self):
        """Q70l: dropping a paged kind from run.CONTINUATIONS, or adding a query kind whose
        output carries a next* field, fails the self-check."""
        self.assertTrue(all(r["pass"] for r in C.check_continuations()))
        table = {k: v for k, v in C.RUN.CONTINUATIONS.items() if k != "transactionsForEntity"}
        failed = [r["check"] for r in C.check_continuations(table=table) if not r["pass"]]
        self.assertEqual(failed, ["continuation-table:transactionsForEntity", "continuation-runtime:transactionsForEntity"])
        queries = dict(C.RUN.QUERIES, fakePaged=_fake_paged)
        failed = [r["check"] for r in C.check_continuations(queries=queries) if not r["pass"]]
        self.assertEqual(failed, ["continuation-table:fakePaged"])


def _fake_paged(run, query):
    """A paged kind left off the continuation table (for the self-check test above)."""
    return C.V.OrderedOut([("rows", []), ("nextPage", 1)])


if __name__ == "__main__":
    unittest.main()
