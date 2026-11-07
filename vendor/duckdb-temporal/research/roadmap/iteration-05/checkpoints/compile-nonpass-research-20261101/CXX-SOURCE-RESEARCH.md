# Native pilot compile-nonpass — independent C++ source/language investigation

2026-11-01 UTC · **SOURCE/TEXT/PRIMARY DOCUMENTATION ONLY — NO REPAIR OR RETRY**

## Result first

**No definite source-proven C++17 name/type/signature/header/constant-expression defect was found in this bounded literal audit. The actual compile failure cause remains UNKNOWN.** There is no justified source repair or new compiler action from this finding.

Coordinator-supplied operational context, not newly inspected results: the new002 compile-only call g3:1303 terminated with outer4, a reaped compiler driver reporting1, classification COMPILE_NONZERO and artifactfalse; pilot/native calls remain0. No diagnostics were captured or read here. A nonzero result without diagnostics does not identify which source, language, library, tool or other stage rejected the action. This negative manual audit neither overturns that nonpass nor establishes compiler acceptance. Earlier source-only reviews were never build passes.

STOP remains controlling: no compiler/preprocessor/parser/AST/import/executable, diagnostic capture, installed probe, repair, deletion, alternate route or equivalent retry was performed or proposed. The separate worker owns public driver/search/cwd/environment portability research; none of those subjects was independently probed here.

## Exact local authority and read scope

Only the three newly authorized local source inputs were read and content-hashed; all were reread fully as literal text and final hashes remained unchanged:

| Input | SHA256 / read |
|---|---|
| `.agent-logs/goal5-native-performance-source/candidate-001/native_scaling_unit.cpp` | `0d826c951d2bbaf83aaae9415d3190d1218dd8e6ebd4497b1306d876b1689583`; all995 lines |
| `.agent-logs/goal5-native-performance-compile-only/proposal-002/bound-project/include/aggregate_reducer_v1.hpp` | `2dfb6e9437bcf9c8c89c27cd9619cd42d7f9f41d0fbedc4f0a2e25af46896dbc`; all368 lines |
| `.agent-logs/goal5-native-performance-compile-only/proposal-002/bound-project/src/aggregate_reducer_v1.cpp` | `6d1562326905c7f9758eb3c148c9008674315a6ae13206abb09c5c05b8229d30`; all1156 lines |

The latter two are the fresh proposal002 bound project, not an old held payload. No other local project, command/result/marker, installed header, system/compiler source, inventory or stopped record was read. Matching proposed source identities does not establish which bytes an executed compiler actually opened.

## Literal findings and primary cross-checks

### 1. Public names, types, friend access and the reduce signature

**No mismatch found.** Pilot aliases U/I resolve to the header's U64/I64. Its Descriptor, GroupMode/Operator/Tag enumerators, Value factories/accessors, Success/Failure/Counters fields, OwnedOutputRow size/index access and Outcome arms match the header. The header's by-value `Outcome reduce(Request) noexcept` at364 matches the definition at core1151–1154; both are in aggregate_reducer_v1.

The header's `detail::Reducer` forward declaration/friend is the same namespace/class defined by the core: its anonymous helper namespace closes at115 before class Reducer at117. This supports its private Value/OwnedOutputRow/Outcome access; no accidental anonymous-namespace friend mismatch was found. The header declares public nothrow moves for the owned API objects; the pilot uses those declarations and does not invoke private Outcome arm constructors.

### 2. Empty optionals do not require a default Outcome

Pilot590–623 declares disengaged optional Request/Outcome, default-emplacing Request and emplacing the public reduce result by its public move constructor. A missing public default Outcome constructor is therefore **not a demonstrated error**. Copy deletion is not itself a contradiction: the argument is moved and emplacement constructs from the returned Outcome. The official optional reference distinguishes empty construction from construction of T, documents move construction and the variadic emplacement interface. This is a language/library cross-check, not a claim about the installed library. [Microsoft optional reference (public Spanish localization)](https://learn.microsoft.com/es-es/cpp/standard-library/optional-class?view=msvc-170).

The explicit move declarations and vector/variant members were inspected; no source-level deleted-copy call was identified at the pilot boundary. This is not a proof that every possible library implementation/version will accept all instantiations.

### 3. The ASCII constexpr function uses permitted kinds of operations

Pilot28–41 initializes both local character arrays and loop indices, uses bounded loops/casts/comparisons and returns Boolean values. No uninitialized local, non-literal local, non-constexpr function call or prohibited body operation was found in that function. The vendor language reference describes initialized literal local variables and loops in relaxed constexpr bodies; the mere presence of loops is not a C++17 defect. [Microsoft constexpr language reference](https://learn.microsoft.com/en-us/cpp/cpp/constexpr-cpp?view=msvc-170).

The numeric constexpr initializers inspected also fit the declared word domain: the high bit is unsigned U64{1} shifted by63, the exponent mask fits64 bits, and the signed-min assertion forms a representable −max−1. No constant-expression overflow counterexample was identified.

### 4. Aggregate/default-member initialization and array braces reconcile

Block, CallId, Counts, Span, Sample, AxisSummary, SignedValue, SignedMedian and Pair use public scalar/member aggregates without user-provided constructors or virtual/base complications. Default member initializers do not by themselves disqualify aggregates in the selected language era; braced function returns are permitted list-initialization contexts. [Microsoft initialization reference](https://learn.microsoft.com/en-us/cpp/cpp/initializers?view=msvc-170).

The pilot's constexpr block table uses the nested std::array braces at176–183; work_values, sentinel tables and sizes likewise use appropriate nested forms. The documented too-few-brace aggregate-array pitfall is not present in those inspected initializers. Its C++17-style constexpr-if branches also match the documented feature family; no brace-count/member-count/type mismatch was found in Pair/SignedValue/SignedMedian return lists. [Microsoft C++2017 conformance notes — constexpr aggregate initialization and compile-time branches](https://learn.microsoft.com/en-us/cpp/overview/cpp-conformance-improvements-2017?view=msvc-160).

### 5. Dependent Clock names and compile-time traits

Pilot507 uses `typename Clock::duration::rep`;525/592 use `typename Clock::time_point`. These are explicit type-use sites, not omitted dependent-type disambiguators. The typename guidance distinguishes identifying dependent types; no missing-typename counterexample was established. [Microsoft dependent-type name resolution](https://learn.microsoft.com/en-us/cpp/cpp/name-resolution-for-dependent-types?view=msvc-170).

The clock reference exposes duration/period/rep/time_point, and the ratio reference exposes compile-time num/den values. Thus the pilot's qualified alias/value names do not point to a source-observed nonexistent member. Vendor-specific rep/period examples were **not** transplanted to this target; the actual traits remain unobserved. [Microsoft steady_clock reference](https://learn.microsoft.com/en-us/cpp/standard-library/steady-clock-struct?view=msvc-170), [Microsoft ratio reference (public Swedish localization)](https://learn.microsoft.com/sv-se/cpp/standard-library/ratio?view=msvc-170).

supported_clock's body combines compile-time traits/constants and is used in the constexpr-if conditions. No non-constexpr helper call occurs in that predicate. This manual check does not instantiate it or claim installed support.

### 6. Header constants and facilities

Header Limits/Error use in-class static constexpr integral constants. C++17 makes such members implicitly inline, so absence of separate out-of-class definitions is not itself a demonstrated C++17 source defect. [Microsoft inline-member conformance note](https://learn.microsoft.com/en-us/cpp/overview/cpp-conformance-improvements-2017?view=msvc-160).

The used facility names are covered by the explicit project includes: the header directly includes cstdint/limits/optional/string/utility/variant/vector; the core adds cstddef/memory/new/stdexcept; the pilot adds array/chrono/cstddef/cstdint/cstdio/limits/new/optional/type_traits/utility. No concrete missing declaration was found. In particular bad_alloc and length_error have direct new/stdexcept coverage; std::move/in_place_index, get_if, optional operations, stdio calls and type traits are not unresolved project names in the literal source.

The source really requires C++17 language/library facilities, including constexpr-if and optional/variant. Official feature/implementation pages document the relevant feature era, not the capability, mode or library used by g3:1303. They cannot diagnose an old/wrong/absent toolchain without evidence, and none is asserted here. [Clang C++ language-status table](https://clang.llvm.org/cxx_status.html), [libstdc++ implementation-status manual](https://gcc.gnu.org/onlinedocs/libstdc++/manual/status.html).

## Source-proven conditional rejection is not an observed cause

There **are explicit compile-time support gates**: exact-width typedef availability and header byte/word/range assertions; pilot41 also asserts ASCII literal values. If their declared source assumptions do not hold, translation can fail before any runtime UNSUPPORTED record. The later clock trait's zero-call UNSUPPORTED branch is not a fallback for failed earlier declarations/static_asserts. That follows directly from the source order; it is not a new defect under its declared support policy, an observed property of the target, or evidence that one of these gates caused the nonpass.

No source change to remove/bypass those guards is justified or authorized. Likewise, the audit found no basis to add speculative typename tokens, default Outcome construction, copy support, array-brace changes or separate constexpr-member definitions.

## Held-source and evidence boundary

Already-known earlier notes mentioned a separate failed WG21 read without its exact URL/action/reason. Those details remain unknown; neither a different N4659 reference nor a guess identifies the held boundary. No WG21 page/PDF/link target, alternative copy or stopped record was accessed. Fresh references above are genuinely distinct official compiler/library documentation, not substitute retrieval of a held standard payload. No public read failed in this distinct lane.

The primary documentation supports focused source reasoning; it is not a substitute for compiler diagnostics or formal conformance verification. The inspected scope yields a useful negative answer, **not a successful build, repaired cause or empirical pilot result**. The terminal compile nonpass, artifactfalse and zero pilot/native outcome remain unchanged as coordinator-reported facts. Actual cause: **UNKNOWN**. No repair, new command, diagnostic-collection action or equivalent retry is requested. All STOP/HOLDs, original files/reviews, no-deletion and external-publication boundaries remain unchanged.
