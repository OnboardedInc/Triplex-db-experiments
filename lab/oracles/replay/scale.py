"""Analytic population counts for the configured-entity generator (spec item 12).

Derived from the generator rules written in
qualification/capacity/configured-entities-v1/CONTRACT.md (not from its oracle code):

  * every entity: one live :capacity/present=true and one live type-version fact,
    plus `width` domain facts (1 = sparse1, 10 = representative10);
  * entity i with i % 100 == 0 replaces its label and type-version 1 -> 2
    (4 ops per entity: 2 retracts, 2 asserts);
  * entity i with i % 1000 == 0 cycles presence true -> false -> true
    (2 ops per transition);
  * command width is at most 500 explicit operations with complete entities atomic:
    a seed command holds floor(500 / (width + 2)) entities, a correction command
    floor(500 / 4) entities, a presence command floor(500 / 2) entities.

The same rules are executed literally by `generator_stream` so tests can check
these closed forms against an explicit replay for small n without materializing the
10m dataset.
"""

from __future__ import annotations

MAX_OPS = 500


def ceil_div(a, b):
    return -(-a // b)


def configured_entity_counts(n: int, width: int):
    if not (isinstance(n, int) and 1 <= n <= 10_000_000):
        raise ValueError("n must be an int in 1..10,000,000")
    if width not in (1, 10):
        raise ValueError("width must be 1 or 10")
    c = ceil_div(n, 100)          # entities 0, 100, 200, ...
    m = ceil_div(n, 1000)         # entities 0, 1000, ...
    seed_per_command = MAX_OPS // (width + 2)
    return {
        "configuredEntitiesLatest": n,
        "distinctDomainSubjects": n,
        "activeDomainFacts": n * width,
        "activePresenceFacts": n,
        "activeTypeVersionFacts": n,
        "activeFixtureFacts": n * (width + 2),
        "domainAssertionVersions": n * width + c,
        "presenceAssertionVersions": n + 2 * m,
        "typeVersionAssertionVersions": n + c,
        "allFixtureAssertionVersions": n * (width + 2) + 2 * c + 2 * m,
        "fixtureRetirements": 2 * c + 2 * m,
        "correctionEntities": c,
        "presenceCycleEntities": m,
        "configuredEntitiesDuringPresenceOff": n - m,
        "schemaReleaseCalls": 2,
        "configFacts": None,
        "receiptJournalClaimMetadata": None,
        "domainCommands": ceil_div(n, seed_per_command) + ceil_div(c, MAX_OPS // 4) + 2 * ceil_div(m, MAX_OPS // 2),
    }


FIELDS = ["label", "score", "exact", "flag", "group", "category", "amount", "instant", "date", "rank"]


def _data(i):
    """Typed domain values per CONTRACT.md profile description (R-SCALE-2).

    Families follow the O-CFG8 frozen notation: untagged JS numbers are binary64
    `number` (score, amount, rank, type-version), the tagged {"type":"integer"} field
    is int64, `instant` is a datetime and `group` a reference."""
    text = str(i).zfill(8)
    return {
        "label": {"type": "string", "value": f"entity-{text}"},
        "score": {"type": "number", "lexeme": repr(i / 1024 + 0.125)},
        "exact": {"type": "integer", "value": str(9007199254740993 + i)},
        "flag": {"type": "boolean", "value": i % 2 == 0},
        "group": {"type": "ref", "value": "capacity:e" + str((i // 128) * 128).zfill(8)},
        "category": {"type": "string", "value": f"category-{i % 8}"},
        "amount": {"type": "number", "lexeme": repr((i % 10000) / 8 + 0.0625)},
        "instant": {"type": "datetime", "lexeme": str(1700000000000 + i)},
        "date": {"type": "string", "value": f"2024-01-{str(i % 28 + 1).zfill(2)}"},
        "rank": {"type": "number", "lexeme": str(i % 997)},
    }


def generator_stream(n, width, *, split_dense_seed=False):
    """Yield (phase, [operations]) commands of the configured-entity generator.

    Operations use symbolic refs "<entity>/<field>/<phase>" (the O-CFG8 identity
    form). Values are given in an abstract form that selfcheck.py turns into case
    JSON. split_dense_seed reproduces tiny V4's sparse seed then 9-attribute expansion.
    """
    names = FIELDS[:width]
    window = {"validFrom": "10.125", "validTo": "30.5"}

    def assert_op(i, field, value, phase):
        return {"op": "assert", "ref": f"{i}/{field}/{phase}", "entity": i, "field": field, "value": value, **window}

    def entity_ops(i, fields):
        data = _data(i)
        ops = []
        if "present" in fields:
            ops.append(assert_op(i, "present", {"type": "boolean", "value": True}, 0))
        if "type-version" in fields:
            ops.append(assert_op(i, "type-version", {"type": "number", "lexeme": "1"}, 0))
        for name in names:
            if name in fields:
                ops.append(assert_op(i, name, data[name], 0))
        return ops

    if split_dense_seed and width == 10:
        seeds = [["present", "type-version", "label"], FIELDS[1:]]
    else:
        seeds = [["present", "type-version"] + names]
    for fields in seeds:
        per = MAX_OPS // len(fields)
        for start in range(0, n, per):
            ops = []
            for i in range(start, min(n, start + per)):
                ops.extend(entity_ops(i, fields))
            yield 0, ops
    corrected = [i for i in range(n) if i % 100 == 0]
    for start in range(0, len(corrected), MAX_OPS // 4):
        ops = []
        for i in corrected[start:start + MAX_OPS // 4]:
            ops += [{"op": "retract", "target": f"{i}/label/0"},
                    {"op": "retract", "target": f"{i}/type-version/0"},
                    assert_op(i, "label", {"type": "string", "value": f"entity-{str(i).zfill(8)}-v2"}, 1),
                    assert_op(i, "type-version", {"type": "number", "lexeme": "2"}, 1)]
        yield 1, ops
    cycled = [i for i in range(n) if i % 1000 == 0]
    previous = {i: f"{i}/present/0" for i in cycled}
    for phase in (2, 3):
        for start in range(0, len(cycled), MAX_OPS // 2):
            ops = []
            for i in cycled[start:start + MAX_OPS // 2]:
                ops += [{"op": "retract", "target": previous[i]},
                        assert_op(i, "present", {"type": "boolean", "value": phase == 3}, phase)]
                previous[i] = f"{i}/present/{phase}"
            yield phase, ops
