# Opaque native-order RDF prefix calibration v2

This separately versioned proposal samples the first two 256-row pages from
each declared named/default RDF query population, then repeats that population's
first page. It sends at most six SELECT requests and returns at most1,536
bindings. It reuses the exact ordering, namespace exclusion and page size of
the refused200k-row continuity preflight; it does not increase that preflight's
cap or execute a whole snapshot.

This is a new `OPAQUE_NATIVE_ORDER_PREFIX_ONLY` contract. The failed v1 attempt
and its codepoint oracle remain unchanged. V1 returned a mixed-case STR-order
discrepancy against SPARQL1.1; this profile does not correct or qualify that
ordering. See [the semantic finding](../../wiki/problems/qlever-native-string-order.md).

The sampler retains exact safe JSON replies, canonical RDF-channel JSONL in
bounded gzip files, incremental observations and partial failures. It reports
wire/canonical/gzip bytes per returned row and client wall intervals for dispatch
to headers, body acquisition, JSON parsing and durable evidence capture. These
are application transport measurements, not engine CPU or isolated engine time.

Acceptance checks cover exact binding/term channels, 256-row shape, no duplicate
identities within/across adjacent pages and identical canonical rows when the
first page is repeated. Received order is retained without sorting, casefolding
or a guessed locale comparator. Strict codepoint and adjacent-boundary comparisons
remain separate diagnostics; false is retained and never relabelled passed.
`codepointOrderQualified:false` is explicit in the contract, checks and report.
Blank-node identities are retained; their codepoint-order diagnostic is
unavailable. Query-local blank labels may cause a repeated-page refusal, and
this profile supplies no general blank-node continuity guarantee.

These checks prove only consistency of the observed prefixes. They do not prove
standards ordering, exhaustiveness, a complete multiset, stability of unread
data, random-sample representativeness, ACK continuity or domain scale.

Only private Docker identity GETs, fixed version/settings/activity GETs and the
six structured page requests are reachable. COUNT, arbitrary query text,
namespace probes, updates, settings writes, cancellation, stop/start/kill,
copy/mount/permission and recovery are refused. No automatic retry or action
runs after a failure. A timeout does not establish physical cancellation; a
partial failure leaves the existing resident reservation in place.

The proposed client is896MiB/1CPU/64MiB/180s; Node uses a256MiB heap and the
Python child has a160s parent ceiling. Each reply is capped at2MiB, each HTTP
request at6s and native timeout at5s. The six-page window is60s including parsing
and capture. Exact raw reply files total at most12MiB, canonical uncompressed
rows at most16MiB, compressed rows at most16MiB and incremental metadata at
most4MiB. Raw and gzip files are owner-only. The whole artifact allocation stays
within64MiB, including8MiB permitted controller logs and the final bounded
report. The selected host Python executable is fingerprinted; a complete host
stdlib/dynamic-library environment closure is not claimed.

Prior evidence is preserved: `qlever-native-readonly-preflight-v2/0001` refused
the old200k continuity cap without retaining its exact count/channel. The later
count-only inventory observed named524,365/default523,793 as separate RDF
query populations. This sampler neither reconstructs the old refusal nor treats
the sum of those populations as a unique RDF or application entity count.

No operational call is authorized by creating this source or its manifest.
