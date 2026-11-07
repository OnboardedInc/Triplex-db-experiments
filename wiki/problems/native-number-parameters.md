# Native numeric parameter identity

Tags: `backend:xtdb`, `surface:xtdb-native`, `goal:1`, `goal:5`,
`problem:signed-zero-parameter`, `mechanism:typed-native-binding`,
`mechanism:lossless-evidence`, `status:qualified-subset-only`.

The read-only public probe observed four negative-zero failures across SQL and
XTQL, current and reopened clients. Its input/builder and pre-JSON trace bits
were `8000000000000000`, but the typed answer was positive zero and the raw
answer was integer text `0`. Twenty other finite-value checks passed. Native
negative-zero literals and string-to-double controls retained their sign.
The [first failed oracle](../../.devloop/jobs/xtdb-native-f64-parameters-v1/attempts/0001/terminal.json)
and its source preimages remain unchanged.

The retained source explains a plausible mechanism: `Number.isSafeInteger(-0)`
selected integer OID20, while ordinary numeric text conversion prints `0`.
The narrow repair selects float8/OID701 with spelling `-0.0` for that value.
Separately, `nativeEvidenceValue` emits a JSON-safe bit tag for negative-zero
metadata. The provider still sends the native value to the client and decodes
native rows; the evidence tag does not replace query parameters or return values.
Positive zero, ordinary finite values and the existing bigint path are unchanged.

The [fresh probe](../../.devloop/jobs/xtdb-native-f64-parameters-v2/attempts/0001/terminal.json)
passes24 numeric checks and ten independently inspected literal/text controls.
All four repaired raw and typed paths preserve negative-zero bits, and their
trace/answer-step metadata carries the distinct bit tag. The
[independent source/result review](../../qualification/reviews/xtdb-signed-zero-v2-independent.json)
checks canonical anchors, complete declared/invocation preimages, the retained
v1/v2 source diff and parameter/evidence separation. It also verifies the
unchanged13-check native entry, including exact maximum-int64 values after reopen.

The numeric probe made no application writes. This does not establish stored
fact signed-zero loss or repair, the full binary64 domain, other backends,
performance or any complete ten-goal outcome. Cross-lane reuse requires that
lane's own bound-parameter probe; a working literal is not a substitute.
