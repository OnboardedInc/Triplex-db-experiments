"""Generate small declarative fixtures from the iteration-1 research contract.

This is not an evaluator: expected answers are constructed explicitly. The file
is an implementation-independent handoff corpus, not evidence that an engine
has passed. Run without dependencies to reproduce contract-fixtures.json.
"""
from __future__ import annotations

import json
from pathlib import Path


def value(tag, payload):
    return {"t": tag, "v": payload}


def fact(payload, *, entity="e", attribute="a", valid_from="0", valid_to="100",
         tx_from="0", tx_to="100"):
    return {"e": entity, "a": attribute, "v": payload,
            "valid_from": valid_from, "valid_to": valid_to,
            "tx_from": tx_from, "tx_to": tx_to}


def case(name, program, facts, expected, *, valid_at="1", known_at="1"):
    return {"name": name, "program_version": 2, "program": program,
            "facts": facts, "valid_at": valid_at, "known_at": known_at,
            "expected_rows": expected}


def main():
    string_one = value("str", "1")
    boolean_one = value("bool", True)
    integer_one = value("i64", "1")
    float_one = value("f64", 1.0)
    four = [string_one, boolean_one, integer_one, float_one]
    program = "answer(?v) :- triple('e','a',?v)."
    cases = [
        case("four_tagged_ground_values",
             "answer('1'). answer(true). answer(1). answer(1.0).", [],
             [[v] for v in four]),
        case("four_tags_survive_base_values", program,
             [fact(v) for v in four], [[v] for v in four]),
        case("duplicate_values_are_sets_not_bags", program,
             [fact(v) for v in four for _ in range(3)], [[v] for v in four]),
        case("derived_first_position_remains_typed",
             "vals(?v,'slot') :- triple('e','a',?v). "
             "answer(?v,?s) :- vals(?v,?s).",
             [fact(v) for v in four], [[v, value("str", "slot")] for v in four]),
        case("typed_value_does_not_unify_with_text_entity",
             "answer(?x) :- triple(?x,'same',?x).",
             [fact(v, entity="1", attribute="same") for v in four], [[string_one]]),
        case("numeric_entity_literal_cannot_match_text_entity",
             "answer(?v) :- triple(1,'a',?v).", [fact(integer_one, entity="1")], []),
        case("different_float_spellings_normalize_within_float_tag",
             "answer(1). answer(1.0). answer(1e0). answer(1.00).", [],
             [[integer_one], [float_one]]),
        case("signed_zero_is_normalized_only_within_its_tag",
             "answer(0). answer(-0). answer(0.0). answer(-0.0).", [],
             [[value("i64", "0")], [value("f64", 0.0)]]),
        case("full_int64_and_adjacent_unsafe_js_integers", program,
             [fact(value("i64", n)) for n in
              ("9223372036854775807", "9007199254740993", "9007199254740992",
               "-9223372036854775808", "-9007199254740993")],
             [[value("i64", n)] for n in
              ("-9223372036854775808", "-9007199254740993", "9007199254740992",
               "9007199254740993", "9223372036854775807")]),
        case("float_order_is_numeric_not_spelling_or_intern_id", program,
             [fact(value("f64", n)) for n in (10.0, -5e-324, 2.0, 5e-324, -2.0, 0.0)],
             [[value("f64", n)] for n in (-2.0, -5e-324, 0.0, 5e-324, 2.0, 10.0)]),
        case("strings_use_utf8_byte_order_not_js_utf16_order", program,
             [fact(value("str", s)) for s in ("\U0001f600", "\ue000", "\u00e9", "e\u0301")],
             [[value("str", s)] for s in ("e\u0301", "\u00e9", "\ue000", "\U0001f600")]),
        case("legacy_looking_text_is_never_inferred", program,
             [fact(value("str", s)) for s in
              ("true", "01", "1e0", "2026-10-30", "9223372036854775807", "null")],
             [[value("str", s)] for s in
              ("01", "1e0", "2026-10-30", "9223372036854775807", "null", "true")]),
        case("full_int64_time_cut_is_lossless", program,
             [fact(integer_one, valid_from="9007199254740993",
                   valid_to="9007199254740995")], [[integer_one]],
             valid_at="9007199254740993"),
        case("half_open_upper_time_cut_is_excluded", program,
             [fact(integer_one, valid_from="9007199254740993",
                   valid_to="9007199254740995")], [],
             valid_at="9007199254740995"),
        case("rounded_valid_boundary_must_not_admit_earlier_cut", program,
             [fact(integer_one, valid_from="9007199254740993",
                   valid_to="9007199254740994")], [],
             valid_at="9007199254740992"),
        case("rounded_recorded_boundary_must_not_admit_earlier_cut", program,
             [fact(integer_one, tx_from="9007199254740993",
                   tx_to="9007199254740994")], [],
             known_at="9007199254740992"),
        case("max_int64_valid_cut_is_excluded_by_open_end", program,
             [fact(integer_one, valid_from="9223372036854775806",
                   valid_to="9223372036854775807")], [],
             valid_at="9223372036854775807"),
        case("max_int64_predecessor_valid_cut_is_included", program,
             [fact(integer_one, valid_from="9223372036854775806",
                   valid_to="9223372036854775807")], [[integer_one]],
             valid_at="9223372036854775806"),
        case("max_int64_recorded_cut_is_excluded_by_open_end", program,
             [fact(integer_one, tx_from="9223372036854775806",
                   tx_to="9223372036854775807")], [],
             known_at="9223372036854775807"),
        case("native_extreme_interval_comparison_never_subtracts", program,
             [fact(integer_one, valid_from="-9223372036854775808",
                   valid_to="9223372036854775807")], [[integer_one]],
             valid_at="-9223372036854775808"),
    ]
    failures = [
        {"name": "integer_overflow", "program": "answer(9223372036854775808)."},
        {"name": "integer_underflow", "program": "answer(-9223372036854775809)."},
        {"name": "float_overflow", "program": "answer(1e400)."},
        {"name": "nonzero_float_underflow_to_zero", "program": "answer(1e-400)."},
        {"name": "malformed_number_suffix", "program": "answer(1e0junk)."},
        {"name": "malformed_boolean_suffix", "program": "answer(truex)."},
        {"name": "leading_zero", "program": "answer(01)."},
        {"name": "unsupported_null_literal", "program": "answer(null)."},
        {"name": "json_number_is_not_an_i64_payload", "value": {"t": "i64", "v": 1}},
        {"name": "json_number_is_not_a_v2_valid_clock", "valid_at": 9007199254740992},
        {"name": "json_number_is_not_a_v2_recorded_clock", "known_at": 9007199254740992},
        {"name": "json_string_is_not_a_boolean_payload", "value": {"t": "bool", "v": "true"}},
        {"name": "unsupported_reference_tag", "value": {"t": "ref", "v": "e"}},
        {"name": "unsupported_date_tag", "value": {"t": "date", "v": "2026-10-30"}},
        {"name": "unsupported_null_tag", "value": {"t": "null", "v": None}},
    ]
    out = {"format": "temporal-datalog-research-contract-fixtures", "version": 1,
           "value_format_version": 2,
           "status": "Unexecuted declarative expectations; not conformance evidence",
           "target": "New native v2 and independent browser/reference v2 paths; store has narrower known-at admission",
           "cases": cases, "rejections": failures,
           "metamorphic_checks": ["permute input and rule order without changing canonical rows",
                                  "repeat each base assertion without changing logical answers",
                                  "typed JSON export then import preserves every canonical value"]}
    destination = Path(__file__).with_name("contract-fixtures.json")
    destination.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(cases)} explicit answer cases and {len(failures)} rejection cases")


if __name__ == "__main__":
    main()
