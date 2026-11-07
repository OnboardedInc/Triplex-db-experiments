# Temporal Datalog on DuckDB — investigation checkpoint

Updated 2026-10-30 03:25 UTC. Status: tested experimental prototype, not production-ready or a drop-in Triplex backend. Work continues.

## Goal and durable home

Explore a native DuckDB Datalog extension over EAV facts with independent valid/transaction time; benchmark equivalent SQL honestly; publish a private playable Site. Up to 50 optimization rounds is a ceiling, not a claimed count. No Codex/user-computer work.

- [Draft code/research PR #7]([PRIVATE_REFERENCE_REMOVED]), branch `dot/temporal-datalog-prototype-20261030`.
- First source checkpoint independently read back at `c24108a183a236c45eb570458a168fe1ef1cbaac`; 22 source/test/research files plus official DuckDB headers/license. Never merged.
- [Pinned Triplex/API research](research/triplex-interoperability-20261030.md). Triplex source `e24dcdbfce4e61da3e2f08c0e4f2a4531c7df0a0`.

## Verified implementation and API boundary

Same native Linux x86-64 binary LOADed and evaluated rules in DuckDB **2.0.0** and **1.4.3**. Stable v1.2.0 C extension ABI deliberately used: [released 2.0 C API v2 is explicitly unstable](https://duckdb.org/docs/2.0/clients/c/overview), and [not all optimizer/operator hooks are exposed](https://github.com/duckdb/duckdb/discussions/27525). This prototype is a native scalar evaluator, not a new parser/storage engine/optimizer extension.

Positive Datalog supports joins and mutual recursion with set semantics, indexed semi-naive evaluation and explicit work/fact/round/byte guards. Values are strings only. Seven-field temporal rows arrive as a DuckDB typed list from the caller's transaction snapshot; no reentrant SQL/IO inside the callback. Both intervals use `[from,to)`.

A bounded persisted SQL wrapper is implemented and passed 18 initial tests: actual insertion/retraction TIMESTAMPTZ values, rollback-safe logical transaction clock, atomic correction/retraction retaining history, same-transaction native snapshot query, command receipt replay, reopen persistence and parameterized inputs. These do not establish full Triplex conformance or multi-process safety.

## Actual preliminary evidence

Initial native binary SHA256 `799cfe50c261c63757297d5b240ec0b632bada91fad298a219983228f4f472cc`. DuckDB2.0.0, one thread, 128MB managed-memory setting, deterministic seed20261030, 14 workloads ×21 warm measured samples after first query+2warmups; output sets/checksums consumed and matched to independent Python oracles. In-memory tables/tmpfs, shared host; not cold disk/concurrency/production throughput.

Mixed initial result: native full path wins7/14 and loses7/14 against the smaller median of conventional recursive UNION and applicable USING KEY set-closure SQL baselines. Chain1024 native4.087ms vs UNION12.135ms / keyed10.493ms; scan27,453rows native19.977ms vs SQL3.856ms. No universal speedup. Materializing input lists is included. Raw results and reproducible round ledger will follow in the PR; no optimization round claimed for initial baseline.

Independent adversarial+random correctness checks exceed590 successful comparisons, with exact final counts to be pinned per final candidate. Native integration tests, ASAN/UBSAN500nonlinear trials and10,000parser-fuzz inputs pass; leak sanitizer is not certified. Independent ABI review additionally tests2305 varying invocations across vector-chunk boundaries. Browser reference currently23test groups pass, including9shared independent-oracle fixtures. Counts overlap in purpose; do not add them into an unsupported certification score.

## Site and limitations

Private Site registered once, not yet published. The interactive playground is an explicitly labeled independent JavaScript reference implementation, NOT DuckDB-Wasm or the native binary; measured native results are separately identified. The native binary cannot directly execute in Cloudflare Worker hosting. No production Triplex adapter, full typed values, negation/aggregates, synchronization, signature/distribution audit, platform matrix or production-readiness claim.

## Resource isolation and next steps

Shared overlay remains below recovered-worktree's fixed preparation guard; no guard reduction, evidence deletion, task interruption or overlay build. This task uses bounded separate tmpfs scratch (~132MB at last check), serial compilation and one-thread benchmarks; test peak RSS~112MiB. DuckDB2.0 virtual-address reservations make tight RLIMIT_AS unsafe, so no false physical-memory-isolation claim.

Continue measured optimization rounds with frozen source/binary hashes and regression decisions; finish independent review and persistence tests; save raw evidence/provenance and final source; deploy private Site; verify actual UI as available. Leave PR draft while prototype/acceptance limitations remain.
