# Tiny native collation control — source-only proposal

Tags: `problem:qlever-native-string-order` `hypothesis:binary-vocabulary-profile`.
No container, indexer, binary, build, startup, request, settings, copy or main
service action is authorized. This proposal is downstream of the isolated wrapper
experiment; it does not change that contract or its independent oracle.

## Pinned prebuilt option finding

The current pinned ICU-enabled binary cannot select NoICU through server/index
arguments or settings JSON. This is a compile-time selection: the CMake option
sets a macro, UnicodeSupport chooses a constexpr default and LocaleManager chooses
a different comparator type. ServerMain's dedicated options and generic runtime
parameter table do not expose that build choice; IndexBuilderMain exposes settings
and locale but not a NoICU override. Index configuration checks the recorded build
mode against the binary. Locale language/country/punctuation changes are not a
proof of codepoint behavior and require their own rebuilt index.

Source authority is the exact runtime commit
`6c5861a6526d7d7ae77735d09339ee0825f0c001`:

- [CMake323–331](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/CMakeLists.txt#L323)
- [UnicodeSupport16–27](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/util/UnicodeSupport.h#L16)
- [LocaleManager424–434](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/vocabulary/LocaleManager.h#L424)
- [ServerMain67–271](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/ServerMain.cpp#L67)
- [RuntimeParameters](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/global/RuntimeParameters.h)
- [IndexBuilderMain203–334](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/IndexBuilderMain.cpp#L203)
- [IndexImpl1426–1442](https://github.com/ad-freiburg/qlever/blob/6c5861a6526d7d7ae77735d09339ee0825f0c001/src/index/IndexImpl.cpp#L1426)

The direct source hashes/copies are in
[the option audit](../../../.artifacts/qlever-string-mechanisms-v1/option-surface/source-index.json)
and its [resolved indexer-path addendum](../../../.artifacts/qlever-string-mechanisms-v1/option-surface/additional-source-index.json).
An initial guessed root-level IndexBuilderMain path returned404 and is preserved;
CMake831 identifies the actual `src/index/IndexBuilderMain.cpp`. No help command or
native binary ran during this inspection.

## Feasible sequence and explicit blockers

A tiny ICU control may use the existing immutable image. An actual NoICU arm first
requires a separately built and anchored matching binary/image; no such artifact
is currently qualified. Source/toolchain acquisition, native build memory and
peak disk need a separate proposal and grant. The tiny-index idea removes any need
to copy or pause main data for this semantic control, but does not remove the new
binary prerequisite. Building inside the current VM is not assumed to fit.

After that prerequisite, two fresh indices can be built sequentially from the
same fixed [nine-triple input](fixture.nt), one per binary mode, each in its own
owned case directory. The entire input is unrelated to main Q data. It is ordinary
RDF, not configured Triplex entities, writes/history/receipt qualification or
capacity. The [oracle](oracle.json) is independently authored; it is not a replay
of the current wrong native answer. Both indices need identical parser/vocabulary,
permutation and resource settings except the declared ICU build mode.

Before any case starts, record fresh private VM/daemon identity, exact images,
mainQ and XTDB resident caps/reservations, guest available memory/current RSS,
Mac pressure, global canonical reservations and actual owned disk headroom. Current
engine caps total5GiB; separately budgeted guest system overhead is about1.25GiB.
This is a conservative allowance, not a new live measurement. A case may be
admitted only if those observations support its actual reservation under the
existing8GiB VM; neither VM growth nor a main/X stop is included.

## Startup/index calibration before semantic use

These are proposed diagnostic profiles, not claims that any will fit:

- First indexer:256MiB memory+same swap limit,0.5CPU,64PIDs,120s, parser buffer1MiB,
  sequential parsing and32MiB sort memory. Retain native usage logs plus Docker
  peak/exit/OOM evidence. Reserve256MiB new index/temp/log disk and monitor actual
  case growth. The task APFS cap remains the hard total boundary; the per-case
  disk monitor is an abort mechanism, not an independently hard filesystem quota.
- First server:256MiB memory+same swap limit,0.5CPU,64PIDs; one simultaneous query,
 64MiB query-processing memory,4MiB cache,1MiB single/lazy entries, one lazy-read and
  sort thread,3s default query timeout. Read back the selected supported values.
  Startup/readiness has60s total and bounded outputs; do not raise a default silently.
- If one cannot start/index, preserve that exact first failure. A separately
  reviewed successor may select384/512/768MiB. There is no automatic retry, cap
  raise or belief that512MiB is sufficient. Stop if fresh guest/host headroom does
  not support the next profile while current main/X reservations remain intact.
- A new host client proposes512MiB/1CPU/64MiB disk/180s, bounded64KiB replies,
  at most32bindings,8closed queries and8MiB retained evidence. Indexing and startup
  precede the fixed query inventory. A separately anchored owner reservation must
  exist before starting the case server, using the reviewed prepared-stopped mode.

Both foundations remain unchanged and counted. The extra guest CPU quota0.5 plus
existing main1.5/XTDB2 equals the configured4CPU envelope. Admission still checks
actual pressure and all current jobs; these constants are not capacity evidence.
No serial rule for other independent engines follows. Queries on a tiny case and
any co-runners must be named in their finite cohort receipt.

## Semantic inventory and cleanup boundary

Freeze8 closed native cases before calls: unordered stored membership, stored STR
ascending/descending, stored STR greater-than-E, local VALUES STR ascending,
mixed stored/local ordering, exact NFD/NFC term identity and Unicode LCASE.
Expected order and membership are the oracle's codepoints and exact term channels.
No client sort/casefold is allowed. Preserve every wrong result. A NoICU Unicode
function failure narrows/disqualifies its proposed supported language, even if
ASCII/codepoint comparisons pass. This is an engine mechanism control, never a
public SDK or full SPARQL acceptance substitute.

Case identifiers, image/binary hashes, new loopback endpoint, index mounts, token
file and exact argv must be frozen only after artifacts exist and independent
source review clears them. Token values never enter manifests/logs. Cases must
refuse main CID/mount/data paths. Retain outputs on any abort; stop only owned
case resources using the explicitly reviewed controlled-stop policy, then verify
exact identity/gone state and release only proven stopped/gone reservations.
Main owner/history/settings are not stopped, copied, rewritten or reconciled.
A failed cleanup retains UNKNOWN costs. No execution is authorized by this file.
