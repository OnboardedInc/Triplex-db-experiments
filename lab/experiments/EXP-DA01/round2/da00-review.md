# EXP-DA00 independent adversarial review

**Verdict: FIX-FIRST.** Reviewer CX-VDA00, branch `verify/DA00`, 2026-11-08. Reviewed
`exp/DA00-datomic-bringup` at **702643f745ab5d9865635ddb3896d2faa9a56b36**. Product code was not changed.

North star: the correctness floor for P1-P5, especially exact values and preserving P2's scope position.
Scope and procedure: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`, `lab/PROTOCOL.md`;
design: main checkout's R29 sections 1-3 and Q78a-e in `lab/acceptance/RULINGS-PENDING.md:99`.
Inherited homebase procedures were not used. No subagents, merges, pushes or releases.

## Findings

### F1 — P1: concurrent create can reset an already advanced scope position

**Location:** `packages/datomic/gateway/src/triplex/gateway/main.clj:25` (initial scope transaction at line 28).

The initialization decision and the write of `:triplex.scope/position 0` are separate transactions.
Two initializers can both observe an absent scope. A slower initializer can then overwrite the position
after the other initializer finishes and a writer advances it. The unique scope key upserts the same
scope entity; it does not protect its position from this overwrite. This breaks the claimed idempotent
create property and makes DA01's monotonic commit positions unsafe under concurrent initialization.

**Reproduction:** `gateway-selftest.clj`, on the reviewed image's real `datomic:mem://` Peer API.
The verifier pauses only initializer A's initial position transaction, lets initializer B complete,
transacts position 7, and releases A. Actual results:

```text
before: basis t=1004, position=7
after:  basis t=1005, position=0
scratch database deleted=true
```

Evidence: [`evidence/gateway-probe.jsonl`](evidence/gateway-probe.jsonl), second row.
The pause wraps `d/transact` but delegates every actual transaction to the original function; no
database result is mocked. This is a deterministic interleaving, not a timing-dependent stress claim.

**Proposed fix:** make initialization conditional inside one serialized Datomic transaction, preserving
an existing position and schema identity; handle a competing initializer by reading the established
state. Add a synchronized concurrency regression that checks an advanced position survives.

### F2 — P1: create/delete reject every scope made by the public Triplex constructor

**Location:** `packages/datomic/gateway/src/triplex/gateway/main.clj:14`.

`every? string? tuple` requires a string generation. The actual public contract requires a nonnegative
safe integer generation (`packages/core/src/runtime/DatabaseScope.ts:25`). Running
`DatabaseScope.test("cx-vda00")` through the built public `@triplex-build/triplex/runtime` export produces:

```json
["triplex-scope-v1","test","test","cx-vda00",0]
```

The reviewed gateway's `scope-name` rejects those exact bytes with `Only test scope tuples may be
created or deleted`, before contacting a transactor. Its selftest and measurements instead fabricate
five-string tuples, masking the integration failure. This is in the DA00 create/delete skeleton,
independent of the not-yet-implemented storage adapter.

Evidence: [`evidence/public-scope.txt`](evidence/public-scope.txt) and the first row of
[`evidence/gateway-probe.jsonl`](evidence/gateway-probe.jsonl).

**Proposed fix:** validate the first four fields as strings and the generation against the actual
safe-integer contract, retain the test-environment restriction, and use scopes from the public
constructor in client/gateway integration tests. Update the five-string claim in the package README.
The concurrently built DA01 successor already appears to change this rule; that successor is not the
reviewed 702643f image and does not close this finding on the reviewed commit.

### F3 — P2: a reused build context admits bytes absent from the input hash

**Location:** `lab/bin/engine.mjs:112` (recursive copies at lines 113, 117-118; build at line 124).

The content-addressed context directory is reused. `fs.cpSync(..., { recursive: true })` overwrites
matching files but retains extra files already present at the destination. The input hash is computed
from the verified extraction and source before these copies; the destination is never compared with
that manifest. Dockerfile `COPY datomic/` and `COPY gateway/` include retained extras. Therefore a
retry can build unmanifested bytes under the same `BUILD_INPUTS_SHA256` label.

**Reproduction:** `build-probe.py` prepopulates an isolated context with the harmless file
`datomic/UNVERIFIED-CX-VDA00`, absent from the ZIP and all manifests. It invokes the actual reviewed
`engine.mjs build`. A Docker fixture intercepts the final build command and confirms the extra file
is still present while the original `c15195...` input hash is passed. It exits 42 before any real
Docker build, image/tag mutation, slot-pin update or container launch. The engine consequently exits 1.
The test explicitly checks `slots.json` is unchanged and removes only its own never-launched context.

Evidence: [`evidence/build-context-probe.json`](evidence/build-context-probe.json),
[`evidence/build-context-summary.log`](evidence/build-context-summary.log), and
[`evidence/build-context-probe.log`](evidence/build-context-probe.log).

**Proposed fix:** build in an exclusively created fresh context, or compare all staged bytes and paths
against the intended manifests immediately before Docker consumes them. Reject unexpected paths,
including symlinks, instead of merging into an unchecked existing directory. Add an extra-file retry case.

**Important qualification:** the retained DA00 image itself is clean. Independent layer inspection
found no unexpected payload bytes. F3 concerns the builder's reproducibility/integrity guarantee.

### F4 — P2: the TypeScript bigdec validator accepts values its mirrored JVM codec cannot represent

**Location:** `packages/datomic/src/codec.ts:38`.

Validation checks decimal spelling but not Java BigDecimal's representable scale/exponent domain.
Both `encodeTagged` and `decodeTagged` accept and return these values, whereas the actual image codec
throws `NumberFormatException`:

```text
1E-2147483648
1.0E-2147483647
1E+999999999999999999999
```

Evidence: [`evidence/codec-comparison.json`](evidence/codec-comparison.json), independent TypeScript
and image-backed Clojure results in `codec-ts.json` and `codec-jvm.jsonl`.
Accepted values tested did round-trip exactly; this finding is inconsistent acceptance at the limits,
not observed rounding. Note the asymmetric valid case `1E+2147483648` has scale -2147483648 and
must remain accepted; an exponent magnitude-only check would incorrectly reject it.

**Proposed fix:** parse exponent and fractional digit count with exact integer arithmetic, mirror the
JVM's scale/parser limits, and raise `DatomicCodecError` for unrepresentable values. Add positive and
negative boundary cases to both codecs, including the asymmetric valid case above.

## Verification matrix

| Requested check | Independent result | Evidence |
| --- | --- | --- |
| ZIP SHA-256 | MATCH: `60ac6bc5f04fefb85a5aeef6a5e6c5369c5a880ca6b9f205e00a12719e7bd2dc`, 272,751,248 bytes | `evidence/supply.json` |
| Peer against retained Maven Central SHA-1 | MATCH: `a976733ab47a8ed3f19c687995e09f406191f9b7`; bundled and separately retained JAR bytes equal | `evidence/supply.json`, `supply.py` |
| PGP signature | GOODSIG/VALIDSIG using newly imported retained public key, fingerprint `749F6F7C583CA630FF76AECDF255D6EA3FD20B93` | `evidence/gpg-verify.txt`, `gpg-import.txt` |
| Extraction/input manifests | All 792 distribution files match ZIP and receipt; gateway/config bytes and both input hashes independently recomputed | `evidence/supply.json` |
| Actual pinned image payload | All 805 payload files equal verified distribution plus gateway/config source. Base layer prefix equals the digest-pinned Temurin base; eight image layers examined | `evidence/image-payload.json`, `image.py`, `image-inspect.json`, `image-history.jsonl` |
| Codec independent boundaries | 62 cases on TS and actual image codec; accepted numbers exact, three TS/JVM rejection mismatches (F4) | `evidence/codec-comparison.json` |
| Unmodified gateway selftest | PASS: 2 tests, 34 assertions, zero errors/failures, reviewed image by ID, pool-admitted 1.5 GiB/network none | `evidence/selftest.log` |
| Public scopes / initialization race | Both failures reproduced against reviewed image's real mem backend (F1/F2) | `evidence/gateway-probe.jsonl` |
| Engine CLI control flow | Isolated Docker/health fixture: up, repeated up without recreation, ownership refusal, down retaining volume, up again, image-ID refusal; actual reviewed CLI invoked | `evidence/lifecycle-cli.json`, `lifecycle-cli.log` |
| Pool | Fresh initial real status: three residents READY, 9.25 GiB reserved including 2.75 GiB Datomic. Existing lab tests independently confirm 3.5 GiB exclusive refusal | `evidence/status-before.txt`, `lab-tests.tap` |
| X/Q hashes and lab tests | PASS 22/22, zero skips, all eight prior X/Q effective-config hashes unchanged | `evidence/lab-tests.tap` |

The pinned reviewed image is `sha256:d0e2465fd9548980373a61f84b8f50e339a82cd627c56ead0ac284b87cb34c6d`;
build inputs `c15195a2c2bffd4de222f55ea79c76266b321bc8b02f6451e9a157d386199256`;
source inputs `1ac6a327b79735778212eef110d1e7983a23c3fb15561415fbe613a9d85378cb`.

The second image-backed test uses a copied reviewed config whose `image` field is the original
immutable image ID, because DA01 changed the shared mutable tag during this review. Original gateway
and config-source manifests remain byte-identical and pass `assertDatomicImage`. The only mounted
override is the independent **selftest namespace**, read-only; gateway/codec implementation files
come from the original image. Exact effective Docker commands are in `evidence/probe-command.jsonl`.

### Fresh G0 on all three lanes

| Lane | Executed/pass | Fail | Reviewed skips | Receipt under `evidence/gates/` |
| --- | ---: | ---: | ---: | --- |
| datomic | 1017 | 0 | 46 | `G0-datomic-20261108T221754Z-61c28b.json` |
| xtdb | 1013 | 0 | 130 | `G0-xtdb-20261108T221853Z-c06b1a.json` |
| qlever | 1018 | 0 | 67 | `G0-qlever-20261108T221933Z-bc909c.json` |

Every final receipt binds reviewed HEAD 702643f, has no modified executed-source files, uses the
reviewed lockfile SHA-256 `b2b3e6e8cdfb18df6d235a8724611ee4fe637426c722a5de34326346b3cb6500`,
and has zero unexpected skips. Copies of raw logs/manifests are under `evidence/g0-raw/<run-id>/`;
the receipt's original `runs/G0/...` paths are also retained in this worktree. No skip policy changed.

The first Datomic G0 also passed but bound pnpm's generated lockfile rewrite; it is retained separately
as `G0-datomic-20261108T221648Z-1093dd.json`. The rewrite was captured in `install-lockfile.diff`,
restored to HEAD, and explicitly rerun with `--previous`. This is not substituted for the final-source run.

## Live lifecycle, ownership, and limits

The reviewer never parked, stopped or recreated any resident. The initial status observed the actual
DA00 gateway READY. While this review ran, other processes parked it and deployed several DA01 images;
the shared event log records those transitions. Later live health and the create/duplicate/basis/delete
sequence in `evidence/live.json` succeed on a **DA01 successor**, with a different gateway/schema hash.
That is scratch-cleanup/operability evidence, not semantic acceptance of the reviewed image.

Live park/restart persistence was not independently rerun because the task expressly forbids it.
The builder's retained final receipt has identical basis/schema before and after park, and retained
volume=true (`evidence/historical-persistence.json`). That is historical evidence. The isolated CLI
fixture confirms actual command/control flow without pretending to prove filesystem durability.

The independent race test used only a mem database and deleted it. A live scratch create was interrupted
by a concurrent resident replacement; the subsequent gateway changed its accepted scope shape.
The exact partial scratch database was identified by its verifier-only scope and deleted separately;
its cleanup result is retained in `evidence/interrupted-cleanup.log` (`deleted true`). Because the
successor gateway rejects the older string-generation scope even for deletion, cleanup used a short
Peer CLI inside the resident, with a 256 MiB heap, solely to delete that exact scratch database.
It ran through the heavy limiter, changed no resident lifecycle/configuration, and targeted no
unrelated database. Subsequent HTTP reads confirm both live scratch databases are absent
(`evidence/scratch-absence.json`). Shared lifecycle transitions are copied in
`evidence/shared-datomic-events.jsonl`.

No G1/G2/NS/GS, root `pnpm check`, pack check, exclusive Datomic profile, fresh empty-volume startup,
100-database memory measurement, P1-P5 load qualification, tenant-isolation proof or erasure proof was
performed. Q78e's final storage/tenancy decisions remain open. No Maven or keyserver refetch was made:
the task's retained checksum/signature/key bytes were recomputed and checked. Signature validity does
not establish the key owner's identity through an independent trust chain.

## Reviewer tooling and retained failures

Heavy work used `lab/bin/heavy.mjs`; host free space was above 5 GiB (initially 27 GiB). Dependency
installation was offline/frozen using only the authorized pnpm store. No global pnpm configuration changed.
All authored tools and committed evidence are under this directory; runtime caches and keyring files
are excluded. The owned 300 MiB build-context probe fixture and temporary image-save file were removed
after inspection; original ZIP, extracted distribution, image, shared build contexts and first-failure
receipts were preserved.

Reviewer-tool corrections are visible rather than discarded: `image-payload-1.log` records an initial
compressed-layer reader error (fixed with format autodetection); `codec-ts-first.log` records an overly
restrictive expectation for Java's asymmetric scale limit; `codec-comparison-first.log` records the
verifier's plain-JSON fixture losing negative-zero metadata (comparison corrected to use exact raw
wire bytes). `interrupted-cleanup-first.log` records an incorrect Clojure CLI invocation, corrected
to the distribution's stdin-script mode before successful deletion. These are verifier mistakes,
not product findings. G0 printed `could not write index`
from optional `git stash create`; receipts explicitly retain null stash identities and separately bind
HEAD, lockfile and executed-file hashes. No synthetic Git proof was substituted.

Promotion requires F1-F4 fixes and a fresh independent rerun of the changed gates. No product fix was
made by this reviewer.
