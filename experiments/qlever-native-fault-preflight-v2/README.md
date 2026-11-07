# Frozen read-only QLever API preflight v2

Source/component proposal only. No actual Docker/native call is authorized by
these files. Root must review the exact canonical contract before execution.
The original v1 source/proposal remains unchanged and unexecuted: an independent
fake-opener control found its prefix guard allowed arbitrary SELECT tails.
V2 replaces that guard with structured template rendering and adds global-deadline
controls for empty/default and final count calls. No native call found this issue.

This independent subset imports no fault executor, worker, broker, storage or
operational controller bridge. Docker routes permit only GET info, exact CID
inspection and bounded owned-container listing. QLever permits fixed stats,
get-settings and active-query observations plus four authored SELECT templates
generated from validated structured ReadQuery values. Transport rejects all raw
query strings, even strings sharing an allowed prefix. Kind/channel/UUID prefix
and bounded integer offset are revalidated when rendering each request.
Mutation/recovery method calls and update/settings/cancellation request shapes
refuse before connection. The closed-template check is not a public SPARQL parser.
Redirects are refused. No engine settings are changed or restored. Every namespace,
count/page and final/default call checks the global capture deadline before and
after the call. Its remaining budget also bounds the socket/read timeout and
the existing maximum5000ms native read timeout.

The source reads canonical state through `readState` using an already-existing
owner marker; it never calls `openContext`, a state lock, reconcile, release or
refresh. Canonical enqueue/execution/accounting and client-process cleanup remain
the normal outer controller's responsibility. On any API, oracle, capacity,
timeout, owner, active-query or resource failure, retain partial artifacts and
fail. No retry, native cancellation, stop/start/kill, update, permission change,
copy, mount or recovery branch exists here. A failed server requires a separate
reviewed recovery authorization; this program cannot attempt it.

Reservation:896MiB/1CPU client,64MiB disk,180s invocation ceiling, Node heap256MiB.
The unchanged2GiB/1.5CPU Q foundation remains charged once. Each response is at
most2MiB (control replies256KiB),6s socket/response ceiling. Full RDF capture has
120s,200000 row,2048 scope,64MiB raw and16MiB compressed limits with256-row pages.
The global named/default row counts are checked before and after streaming.
Full RDF term channels and available anchored ACK claims/frontiers are retained;
omitted historical ACK payloads remain gaps. Output summary is capped16MiB;
all artifact files use0600. No raw Docker inspection, token argv or raw HTTP error
text is retained. Failure diagnostics contain class/length/hash only.

This gate tests the pinned native API and bounded capture's feasibility. It is
not authorization for a later stop/copy/fault sequence, independent public-SDK
transaction acceptance, a full older ACK reconstruction, or a performance result.
Declared source/controller/runtime-binary pins are explicit. The existing shared
host Python runtime/stdlib/dynamic-library environment is not described as a
complete transitive byte closure. No SDK npm dependency closure is claimed.
