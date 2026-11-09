# EXP-QNODELAY independent review: FIX-FIRST

Reviewer: CX-VQNODELAY. Branch: `verify/QNODELAY`. Reviewed builder head: `08a117761279de9ea0562b4f134b68df08889d6a` (`exp/QNODELAY-qlever-connection`). Observations collected 2026-11-09 04:04–04:08 UTC, Node v22.23.2.

North star: P1 and P4 host read latency, with transport correctness as the floor. Goals and targets: `lab/SCOPE.md`, `lab/NORTH-STAR.md`, `lab/TARGETS.md`. Q97b reviewed from the main checkout, read only. All shared-resident timing is **DIAGNOSTIC under Q91a**.

**Verdict: FIX-FIRST.** The stall-removal claim is supported, the connection count is real, and no growing client socket/descriptor leak was observed. Abort classification is mode dependent, and the receipt-mode coverage is incomplete. Compressed responses introduce an additional compatibility regression. Keep the default **keep-alive** for this round. Do not flip it before the fixes and a representative P1/P4 comparison including concurrency, writers, handshake/CPU cost and the admitted built-base profile.

## Findings

### F1 — Medium: custom abort reasons change transport classification between modes

Locations: `packages/qlever/src/QleverClient.ts:17`, `:39`, `:145`, `:175`.

Reproduction: run `transport.mjs` with the command below; inspect `transport-result.json` cases `abort-error`, `abort-string` and `preabort-error`. A local server holds the response; call `client.query(..., { signal })`, then `controller.abort(new Error("caller-stop"))` (also tested an already-aborted signal and a string reason).

- Keep-alive propagates the caller's ordinary Error/string. The P2Q classifier returns **false**.
- Per-request emits Node `AbortError { code: "ABORT_ERR", cause: callerReason }`. The same classifier returns **true**.

This changes whether the same stopped read is considered replica-unreachable and therefore its error/fallback routing. Builder tests only check rejection, so they miss this. Plain `abort()`, header/body deadlines, resets, truncated bodies, HTTP 400/403/500 and response byte limits preserve the classifier's boolean in the fixtures tested; timeout error names themselves differ.

Proposed fix: normalize timeout/abort identity at the common request boundary, with the original cause retained, for both transports. P2Q already has a common `QleverRequestError("timeout" | "aborted", cause)` catch at its request boundary; preserve that behavior when integrating this branch. Add parity assertions for ordinary, custom-reason, pre-aborted and body-read cancellation. Do not classify by error-message text.

### F2 — Medium: active QG1 latency receipts still omit connection mode

Locations: `lab/experiments/EXP-QG1-qlever-generations/grid.mjs:60`, `:212`; `lab/experiments/EXP-QG1-qlever-generations/summarize.mjs:15`.

The grid's direct `fetch` writes each request's `ms`, status, query parameters and raw-response hash without a mode. Its binding and cell summary omit it too. `summarize.mjs` emits cold/warm query timings and P4 quantiles without retaining either transport mode. An environment-selected per-request P4 child can therefore sit beside fixed keep-alive direct-fetch timings in a mode-less summary.

Reproduction: `receipt-coverage.mjs` extracts and invokes the **unchanged source function** `req` with an in-memory fetch/filesystem fixture. The emitted `1.request.json` has valid timing/status/hash fields and neither `connectionMode` nor `qleverConnectionMode`. No QG1 engine, write, rebuild or slot acquisition is performed. Evidence: `receipt-coverage.json`.

Proposed fix: record actual fixed `keep-alive` on the direct-fetch request writer and binding/cell receipts; propagate the child's recorded P4 mode separately through summaries. Fail closed or explicitly mark unknown modes when summarizing older inputs. Apply the same inventory rule to remaining timing producers. Additional source omissions are `lab/scenarios/legacy.mjs:37` (retired but runnable GS receipt) and `packages/qlever/experiments/string-order-probe.ts:46` / `:82` (inherited diagnostic call timings); these are not fresh production-performance findings.

The added fields in the NS, P5, gate envelope, current GS v2, C8, J01, QG1 P4 and the modified package experiment reports are present. The QG1 `probe.mjs` direct-fetch field correctly states its actual fixed mode. This does **not** establish the requested universal receipt coverage.

### F3 — Medium: valid gzip JSON becomes a decode failure in per-request mode

Location: `packages/qlever/src/QleverClient.ts:20`–`:23` (raw IncomingMessage wrapped as a Response without content decoding).

Reproduction: `transport-result.json`, case `gzip`. A local endpoint returns HTTP 200, `Content-Encoding: gzip` and a nonce-bound valid SPARQL JSON result. Keep-alive fetch decodes it and returns the expected row. Per-request reads compressed bytes as UTF-8, then throws `TypeError: QLever did not return a SPARQL SELECT result`.

Proposed fix: preserve supported content decoding in the fresh transport, with the byte budget enforced on decoded bytes, or explicitly negotiate/validate an identity-only transport and document that narrower contract. Add successful-result and HTTP-error-body parity tests. The stock resident's uncompressed literal-query timings do not expose this. Redirect following already differs and is explicitly documented by the builder; I did not count that disclosed boundary as another finding.

## Timing claim: independently recomputed and reproduced

`audit.mjs` verified **115/115** builder manifest entries; hashed all copied preimages; rechecked attempt4's non-dist preimages against this checkout; validated all completed attempts' decoded binding contents, nonces, per-attempt timestamps, warmup labels, hashes and cell quantiles. Attempts 2–4 are separate completed diagnostics. Attempt 1 remains a retained first failure, not a passing sample.

Attempt4 nearest-rank quantiles from raw timings, excluding 40 warmups:

| Mode | Bytes | n | p50 ms | p99 ms | >=35 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| keep-alive | 16 | 120 | 15.946042 | 52.097042 | 60 |
| keep-alive | 2048 | 120 | 14.162958 | 59.395166 | 60 |
| keep-alive | all | 240 | 15.946042 | 59.056625 | 120 |
| per-request | 16 | 120 | 4.037000 | 7.279333 | 0 |
| per-request | 2048 | 120 | 4.621583 | 7.869083 | 0 |
| per-request | all | 240 | 4.233250 | 7.869083 | 0 |

All **520/520** decoded attempt4 responses match the independently constructed expected bindings. The report's rounding is correct. These data support the operational >=35 ms stall count, not a packet-level diagnosis of every slow request.

Fresh reviewer probes used only sequential, read-only literal SELECTs on the existing shared `http://127.0.0.1:7070` resident, ABBA mode order and payloads 16/2048 bytes, 64 measured + four warmups per cell:

| Mode | n | p50 ms | p99 ms | >=35 ms |
| --- | ---: | ---: | ---: | ---: |
| keep-alive | 256 | 19.147917 | 55.360000 | 128 |
| per-request | 256 | 2.110417 | 3.925333 | 0 |

A further 1,024 measured + four warmup sequential per-request reads had p99 3.589666 ms and zero >=35 ms observations. All **1,572/1,572** responses across comparison and longevity cells matched their unique expected nonce and complete payload. The resident ID/start time remained unchanged. Owner, endpoint, image/config identity and co-running inventory are retained before/after. Source bytes were rehashed at the end. No engine lifecycle, data changes, loaded benchmark or exclusive reservation was used. Base/delta/touched-block counts remain explicitly null; no P1/P4 acceptance follows.

## Connection lifecycle and P2Q catalog

- Local independent server: 10,000 sequential nonce-checked queries per mode. Keep-alive accepted two sockets and retained two bounded pooled sockets; per-request accepted **10,000 distinct sockets** and had **zero open** at checkpoints/end. Per-request numeric descriptor counts stayed **19** at all ten 1,000-request checkpoints (one TCP listener). Keep-alive stayed 23. No increasing descriptor/socket trend was observed.
- Real resident: counted client `net.Socket.connect`/`close` events to port 7070, without modifying its networking. All **1,300 per-request requests created 1,300 sockets**, and every one closed. Keep-alive created two sockets and reused them; those bounded pooled sockets were still open at the final in-process observation. During the 1,024-request longevity cell, numeric descriptor counts stayed **20**, including the two keep-alive sockets. This demonstrates client closure; I did not measure resident process FD counts under other agents' traffic or kernel TIME_WAIT costs.
- The absent-selection resolver remains keep-alive; explicit keep-alive overrides a per-request environment selection. The previous fetch path is otherwise unchanged. Native cancellation remains the separate WebSocket path.
- P2Q is **not merged into this reviewed tree**. I froze reference head `1096fb8639903395593954e44be6872118fe4c68`, copied its classifier/catalog/client byte-exact under `reference/`, and verified the copies against Git. `transport.mjs` executes the exact classifier body/table with this branch's actual QleverHttpError; absent broker-only class constructors are fixture stand-ins. Thus these are direct-client/classifier tests, not integrated native/Datalog/broker acceptance.
- All **118 catalog codes**, transport and negative controls, were injected into real client sockets at direct and one-cause-nested depths, in both modes: **472 cases**. All **332 transport-code cases** preserved the code and classified true. Overall **471/472** retained the expected code/classification. Exception: direct synthetic `UND_ERR_INFO` in keep-alive is consumed by Undici's informational-event path and eventually becomes a timeout; per-request propagates it and classifies false. Nested `UND_ERR_INFO` and other negative controls pass. This is a synthetic injection/runtime boundary in the unchanged fetch path, not a newly discovered physical outage or a separate claimed QNODELAY defect. The full catalog check is deliberately **false**, not silently marked passing. It needs a runtime-appropriate informational-event test before anyone claims complete end-to-end catalog acceptance.
- The local collection has **21 true / 5 false** checks: three custom-abort parity failures, gzip parity failure, and the catalog aggregate above. The reviewer command exits 1 intentionally. No false check was removed or rerun into a claimed PASS.

## Pin audit

The builder's changed-pin list is complete for this checkout. Independent scans of tracked acceptance JSON path references and every old/new hash in the builder's changed-source inventory find only:

- `packages/qlever/experiments/native-entry.ts`
- Old/pinned SHA-256: `c82ce6cfabfcf61ab9f5d76791146d167741420a3be07b92559026f987634b0f`
- New SHA-256: `39b11393379e443e17d5c5cd708671e7aa33ee5e16e781eace61081ae2dce74e`
- Pins: `obligations.json/caseSets/CS-ENTRY/pinnedSourceFiles/1` and `obligations.json/caseSourcesPinned/CS-ENTRY/1`.

The stale pins remain an explicit contract-builder follow-up. Neither builder nor reviewer changed `lab/acceptance/`. My additions are confined to `lab/verify/QNODELAY/`, plus durable evidence under my assigned evidence directory.

## Evidence and reproduction

Repository results: `offline-audit.json`, `transport-result.json`, `receipt-coverage.json`, `live-summary.json`, matching logs, the source runners and frozen P2Q references. Bulky fresh raw observations: `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/attempt1/{start,result}.json`. The live summary carries the raw hash; `SHA256SUMS` binds every reviewer artifact. Builder evidence remains at `/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QNODELAY/` and was not modified.

Commands, from this worktree (host disk had >12 GiB free before admissions):

```sh
node lab/bin/heavy.mjs --label CX-VQNODELAY-offline -- node lab/verify/QNODELAY/audit.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-transport -- node --experimental-transform-types lab/verify/QNODELAY/transport.mjs
node lab/bin/heavy.mjs --label CX-VQNODELAY-live -- node --experimental-transform-types lab/verify/QNODELAY/live.mjs /Users/sam/Claude/Projects/triplex-db-2/evidence/CX-VQNODELAY/attempt1
node lab/bin/heavy.mjs --label CX-VQNODELAY-receipts -- node lab/verify/QNODELAY/receipt-coverage.mjs
```

All outputs use exclusive-create; do not overwrite these attempts. A rerun needs a new attempt/output name. `node --check` on all four runners and `git diff --check` passed. No dependency installation or dependency edits were needed; Node's local TypeScript transform executed the exact checkout client source. I did not rebuild packages, rerun the builder's Vitest suite, run root `pnpm check`, exercise real writes/commands/faults against the shared engine, certify HTTPS/proxy behavior, qualify loaded P1/P4, change the default, fix implementation code, merge or push.

## Reviewer PASS / verdict / receipt audit (rule 9a)

1. `audit.mjs`: assertions validate historical raw decoded contents, independently reconstructed nonce/payload, checksums, source copies, timestamps/warmup membership and raw-to-summary arithmetic. Historical attempts retain their historical identities/status; this never calls them new execution. Binding is the exact builder head, raw-result SHA-256, copied preimage hashes and this committed runner/manifest. No performance PASS is emitted.
2. `transport.mjs` `assert`/`check`: local response checks compare full fresh nonce-bearing results, server-observed socket identity/counts and real descriptor snapshots. Error checks inspect both outcomes and the frozen classifier on actual current-request cause chains. Catalog checks require the injected code survives and classification matches the frozen table. Freshness comes from a per-run UUID, fresh local endpoints and per-request nonce; binding is source/reference hashes and before/after source checks. False checks and the exit-1 result remain present. Fixture-only classes are explicitly declared above.
3. `live.mjs`: full deep equality against every nonce/payload precedes accepted timings; socket assertions count only port-7070 connections, check one per per-request call and closure, and require bounded descriptors. Freshness is the UUID/index, current TCP events and timestamps. Binding includes source hashes, unchanged-source checks and actual before/after resident identity/slot/endpoint. `completedCollection` means these checks completed, never semantic production acceptance. Warmups and longevity cells are separate from the comparison quantiles.
4. `receipt-coverage.mjs`: the exact source function emits a fresh in-memory fixture receipt; assertions check fixture response hash/status/timing and the mode omission. It proves writer metadata, not a database query. Snapshots are compared to the exact P2Q Git head. Source hashes and end rehash bind the checks. Pin scans are descriptive, not PASS.
5. This `FIX-FIRST` verdict derives from F1–F3 and the retained observations. `SHA256SUMS`, hashes and indexes certify bytes only. No production acceptance, source-coverage completion or contract promotion is generated by any reviewer file.

Open follow-up: normalize aborts, finish mode propagation, settle identity/compressed-response behavior, then independently rerun those gates and the integrated P2Q surfaces. A later admitted concurrency experiment must decide the default; this read-only diagnostic cannot.
