Busy-host diagnostic; tracing `as captured in the private run configuration`; no performance verdict. Final population controls and host swap/CPU context are in [READING-14.md](../../READING-14.md).

Busy-host correctness diagnostic only; no performance verdict.

Fresh clone of the sealed 1k W0 source, current stack, source `c165501b0b77c9301764c6d3df323abf82ff0051`. The source volume was mounted read-only, SHA256 copied into a fresh owned destination, then detached from the writer stack.

All 1,000 worlds, 1,000 independent Python outputs and 1,000 durable published states compared equal. The independent journal fold matched stored history counts. Input position 42,775; published position 42,786. The receipt binds this attempt's nonce, source/build manifest and exact log SHA256.

The index and checksums are committed here; the exact receipt, source hashes, original logs, compressed traces, image IDs, clone checksums and source readback remain under `$EVIDENCE_ROOT/DX-T1/tx2-dxt1-p14-w0-clone-b/`. Cleanup exited zero with an empty owned inventory and no lease. No timing acceptance is inferred from this 1k smoke.
