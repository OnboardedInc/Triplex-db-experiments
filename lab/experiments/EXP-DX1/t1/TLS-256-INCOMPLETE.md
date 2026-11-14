# TLS L256: incomplete bookends

Closing control was refused below 15 GiB. These are observed arms, not a qualified gain; TLS stays enabled.

| arm / summary | all-primary p50 / p99 ms | small L256 p50 / p99 ms | L256 swap GiB / Mac CPU % | oracle |
| --- | --- | --- | --- | --- |
| baseline | 20.905 / 179.940 | 13.695 / 46.720 | 12.316 / 47.4 | PASS, zero mismatches |
| candidate | 20.291 / 201.230 | 15.103 / 68.352 | 12.601 / 50.7 | PASS, zero mismatches |

Source a8419d3a952cc157a1eb85f3cf295659c85cf436; 3,530 primary commands/arm; fixed quiet logging. Raw case/verdict bytes remain in the canonical run folders.
