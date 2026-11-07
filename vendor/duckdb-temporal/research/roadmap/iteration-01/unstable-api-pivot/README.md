# DuckDB C API v2 research lab

Research target: official DuckDB v2.0.0, commit `d54cbbe3df17e8e5ce68312f483b4155836112aa`. Its tag was independently read from GitHub on 2026-10-30. [DECISION.md](DECISION.md) is the current architecture decision and explicitly supersedes only the stable-ABI paragraph of the earlier typed-feature specification.

This directory is distinct from the original prototype and its frozen copy. It contains primary-source research, licensed exact headers and isolated probes; it is not a completed typed implementation or production release. Worker-generated memos/probes are preserved after completion and verification, not assumed present or passed.

The `vendor` files are exact upstream UTF-8 bytes, checked by Git blob identity. The original MIT license notice is preserved in `vendor/LICENSE.duckdb`. No runtime wheel or executable is included in the durable text checkpoint.

| Path | Upstream path | Git blob |
| --- | --- | --- |
| `vendor/duckdb_v2.h` | `src/include/duckdb_v2.h` | `c36fe3ac3edd536aba8e79f6d7d9a81ed834c5e4` |
| `vendor/duckdb_extension_v2.h` | `src/include/duckdb_extension_v2.h` | `b77dc115c1013e8f4db54f372cfd53d3148455ce` |
| `vendor/LICENSE.duckdb` | `LICENSE` | `2719c9a23d2a37c1dfb7402e79f03bd615701e53` |
| `vendor/cpp_api_static_demo.cpp` | `test/api/capi/v2/static_extension/cpp_api_static_demo.cpp` | `82ac41616001e605d7ecea567133fd68687bcfbb` |

Any future target upgrade requires an explicit pin change, regenerated compatibility evidence and regression/benchmark review. The user accepted instability, not an evidence-free stabilization forecast.
