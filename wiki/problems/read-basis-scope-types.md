# General and native read-basis scope types

Tags: `#problem` `#typescript` `#read-basis` `#legacy-runtime-scope`
`#source-type-correction` `#public-artifacts-pending` `#not-a-performance-result`

The general `ReadBasis` annotation originally required branded `DatabaseScope`,
while the existing low-level `TripleStoreRuntimeService` accepts an opaque
string and retains legacy `"default"` scopes. Public `Runtime.layer` validates
database identities separately. A basis reports the scope actually used; it
does not turn an arbitrary string into a database selector or serialize a
pending transaction overlay.

The first isolated A no-emit attempt failed with seven scope-brand diagnostics.
An unchanged no-A control reproduced the same seven errors in KV and Triples
return contracts. Its `completed_verified_bytes` outcome means an independently
pinned expected-failure diagnostic was reproduced, **not** that types passed.
[Both failures and raw compiler logs are retained](../../qualification/evidence/read-basis-scope-brand-noemit-failure-v1.json).

The separate baseline correction types general `ReadBasis.scope` as `string`
and explicitly keeps `NativeReadBasis.scope:DatabaseScope`. Native resolver
inputs and actual validation, public runtime validation, service defaults,
cursor behavior and executable resolver bodies stay unchanged. The two source
annotations are independent of the proposed A hook.

[Strict source noEmit](../../qualification/evidence/read-basis-scope-baseline-types-v1.json)
passes with four negative static witnesses. The fixture is also included in
the standard runtime type project; both [normal copied core type projects](../../qualification/evidence/read-basis-scope-baseline-types-v2.json)
pass without executing test bodies. [Independent final review](../../qualification/reviews/read-basis-scope-baseline-final-independent.json)
checks all declared pins, anchors/preimages, real compiler exits, static
witnesses and unchanged executable bodies.

Public dist still carries the earlier declaration identity. Ordinary generation,
parsed-JavaScript comparison, real public-export consumer witnesses and the
required package check are separate pending gates. Old functional runs retain
their exact as-built identities. No A integration, native execution, throughput,
capacity or full-scale outcome follows from this type-only correction.
