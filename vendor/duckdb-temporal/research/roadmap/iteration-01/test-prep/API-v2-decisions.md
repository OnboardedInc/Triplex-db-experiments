# Iteration 1 selected typed value contract

Decision date 30 October 2026. This is the orchestrator's selected contract after two completed primary-source research passes and controlled transport/dictionary experiments. It is a specification and acceptance-test preparation checkpoint, **not an implemented feature**. The original prototype owner retains its source/PR until handoff.

## Domain and identity

- Stable tags: `1=str`, `2=bool`, `3=i64`, `4=f64`; unknown tags fail closed.
- Strings are NUL-free valid UTF-8 scalar text, exact bytes, with no Unicode normalization or locale collation.
- Booleans accept only false or true. Int64 accepts the full signed 64-bit range. Float64 accepts finite IEEE 754 binary64, including representable subnormals; negative zero normalizes to positive zero.
- Equality is tag plus normalized payload. There is no string/bool/int/float coercion, no epsilon equality, and no NaN or infinity.
- Result order is tag rank then UTF-8 byte/boolean/signed-integer/finite-numeric order, with lexicographic tuple comparison. Local insertion-order dictionary IDs are not value order or durable identifiers.
- Base entity and attribute fields remain string identifiers. Base values are tagged. Every cell of every derived tuple is tagged, including values moved into a derived relation's first position. A numeric binding cannot unify with an identically printed string entity.
- Reference, date, timestamp, null, decimal, unsigned, arbitrary-precision integer, JSON and blob **value** tags are unsupported in this iteration. Existing temporal metadata is unchanged.

## Language version 2

Preserve both existing quoted-string forms/escaping and add lowercase `true`/`false`, checked signed decimal integers, and decimal/exponent floats. An integer token contains neither fraction nor exponent; a token containing either is f64. Thus `1` differs from `1.0`, while `1.0`, `1.00` and `1e0` agree.

```text
integer ::= "-"? ("0" | [1-9][0-9]*)
digits  ::= "0" | [1-9][0-9]*
float   ::= "-"? (digits "." [0-9]+ exponent? | digits exponent)
exponent ::= [eE] [+-]? [0-9]+
```

Integer `-0` normalizes to integer zero; float `-0.0` normalizes within its own tag. No leading plus or zeroes, `.5`, `1.`, hex, separators, bare null, NaN or Infinity. Enforce a 128-byte numeric-token limit, complete consumption and a valid token delimiter before conversion. Parse int64 without passing through double. Check conversion status and consumed range before checking finiteness: failed `from_chars` can leave its finite initial destination untouched.

Float literals round to nearest binary64 with ties to even. Reject overflow and nonzero literals that underflow all the way to zero; retain representable subnormals. This is not an exact-decimal language. Item 1 introduces no arithmetic, casts, comparisons or newly generated recursive values.

## Native SQL boundary

Add a distinct `td_query_v2`; do not change the legacy `td_query` input type, grammar, counters, string return shape or NULL-list semantics.

```text
TDValue = STRUCT(tag UTINYINT,s VARCHAR,b BOOLEAN,i BIGINT,f DOUBLE)
TDFact = STRUCT(e VARCHAR,a VARCHAR,v TDValue,
                valid_from BIGINT,valid_to BIGINT,tx_from BIGINT,tx_to BIGINT)
td_query_v2(program VARCHAR,facts TDFact[],valid_at BIGINT,known_at BIGINT,
            max_facts BIGINT,max_rounds BIGINT,max_work BIGINT)
  -> STRUCT(rows TDValue[][],rounds BIGINT,derived_facts BIGINT,work BIGINT)
```

The fact list, each fact, each value struct, its tag, e/a, coordinates and selected payload must be nonnull. Exactly the selected payload is nonnull; inactive payloads are NULL. SQL NULLs discriminate transport fields and do not become a logical null. An empty v2 fact list is an explicit typed empty list; NULL list is rejected. Validate every supplied row, even if not visible at the chosen snapshot.

Use the existing stable C_STRUCT v1.2.0 registration/vector API. Keep query state local and no callback SQL/IO. Preserve compact uint32 tuple IDs and put typed identity in the query-local interner. Start with simple owned-key lifetime safety; split per-kind maps with a shared ID namespace are preferred if the implementation stays clear. The dictionary-only measurements do not justify wider hot tuples, global persistent interning, a query speedup claim or lifting resource caps.

The callback validates **post-binding typed SQL values**. It cannot reconstruct a source type/precision intentionally erased by an explicit SQL cast. Python and JSON adapters must validate source payloads before preparing or casting them. No test or documentation may promise the callback detects information no longer present at its boundary.

## JSON and browser boundary

Use `{t:"str",v:"text"}`, `{t:"bool",v:true}`, `{t:"i64",v:"9223372036854775807"}` and `{t:"f64",v:1.0}`. Require exactly recognized fields and the tag-specific payload type. No untagged scalar or automatic stringify conversion. All i64 payloads and all full-range temporal coordinates are **canonical decimal strings**, including safe small integers: `0` or optional `-` followed by a nonzero digit and remaining digits. Reject leading plus, leading zeroes and `-0` on this canonical wire boundary; textual Datalog's `-0` remains valid and normalizes to `0`.

Inside JS, parse these strings directly to BigInt and range-check; never convert through Number or wrap with `asIntN`. Reject nonfinite f64 before JSON serialization, since JSON would otherwise replace it with null. The explicit float tag survives JSON emitting an integral float as `1`.

The future browser reference test boundary is `evaluateV2(program,facts,validAt,knownAt,limits={})`, returning an object with tagged JSON `rows` (or a Promise thereof). Browser `limits` fields are `facts`, `rounds`, `work`. Internal APIs may differ if an exact transparent test adapter is supplied. Existing v1 browser behavior remains separate. Reference evaluation must remain algorithmically independent from the native kernel; share semantic fixtures, not evaluator code.

## Persistence and migration

Use schema version 2 and physical typed payloads, preferably `v_tag`, `v_s`, `v_b`, `v_i`, `v_f`, with explicit known-tag/one-active-payload/finite-float constraints. Preserve the existing valid/recorded half-open intervals, fact identities, clock, command receipts, inserted/retracted timestamps, retained duplicate assertions and single-writer/admission contracts.

Dispatch on the existing validated schema version **before** running version-specific bootstrap. Use one transactional shadow-table migration that embeds each old value as `Str(original bytes)` and preserves all other fields exactly. Replace the metadata table/constraint that currently enforces `version=1`. Never migrate by replaying commands, parsing legacy value text, deduplicating history or advancing the clock. Unknown/malformed schemas fail closed. Verify rollback/retry and idempotent reopen; old code must refuse schema 2 rather than reinterpret it.

The implementation may select an additive typed store class/module to keep legacy call sites stable, but it must provide an explicit migration entry point and cannot hide or stringify typed rows for legacy queries. Final public Python names belong in the implementation checkpoint before release. Typed admission counts numeric payloads and dictionary entries against bounds; complete allocator/cancellation accounting remains item 6.

## Acceptance boundary

The two research memos, raw experiments and declarative expected-answer corpus are inputs to acceptance, not passed feature tests. Require real native LOAD/evaluation, independent reference/SQL agreement on tagged rows, full int64/float/Unicode/carrier/batch tests, historical migration equivalence at every relevant cut, and unchanged legacy verification. Record source/binary hashes and full-path costs, including SQL list materialization and fetch. Any regression may be reported honestly; correctness cannot be traded for a favorable timing.

No next roadmap implementation begins until item 1's declared acceptance is established. The ten-item order and draft-PR workflow remain unchanged. No deployment, merge, resource deletion, Codex task or user-computer action is authorized by this specification.
