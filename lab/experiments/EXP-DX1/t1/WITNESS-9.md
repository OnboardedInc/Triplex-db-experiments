# Off-thread publication witness

Source `afee00b0`, fresh 10,000-subject full-level ABA, unchanged 450-second ladder diagnostic through 1,024 readers. The candidate changes only `DX_PUBLICATION_MODE=deferred` to `worker`; original strict server clocks, exact local reads, split `pending`, heaps, CPU placement, frozen digest `aa8a7636ff027ab3` and every collector remain fixed. These are diagnostic arms, not the full verdict pair. Controls are the synchronous opening/closing arms of this session, not historical off runs.

| full-level observation | opening deferred | worker | closing deferred |
| --- | ---: | ---: | ---: |
| all-primary commands | 3707 | 3707 | 3707 |
| commit p50 / p99 ms | 13.267 / 46.694 | 12.754 / 53.128 | 13.222 / 59.621 |
| peer wait p99 ms | 35.018 | 41.002 | 42.985 |
| commits >50 ms / summed wall ms | 25 / 1866.082 | 51 / 3190.735 | 62 / 5010.132 |
| writer lateness >50 ms episodes / union ms | 0 / 0 | 0 / 0 | 1 / 51.772 |
| writer witness persistence/dispatch p50 / p99 ms | 1.049 / 4.227 | .019 / .068 | .988 / 3.537 |
| maximum writer persistence/dispatch ms | 20.161 | 3.352 | 15.784 |
| independent main-thread readback p99 ms | .455 | .376 | .398 |
| writer maximum GC pause ms | 84.232 | 43.111 | 77.752 |
| primary-window Mac swap GiB median | 4.109 | 4.109 | 4.109 |
| primary-window Mac non-VM CPU median / p99 % | 10.6 / 91.2 | 11.2 / 98.5 | 10.6 / 99.6 |

Commit p50 improves .490 ms against .045-ms bookend drift. The candidate's p99 is effectively the bookend mean; 12.927-ms drift and 25→62 outlier-count variation prevent a tail-gain claim. The 137-ms witness stall from pair A did not recur in these controls. The structural fix is observed: synchronous FULL SQLite persistence runs on another isolate; the writer retains dispatch and independent SELECT verification. No timing is subtracted from offer-to-ACK, and no ACK timestamp moves.

Every arm captures and durably persists all 3,707 expected witnesses, with zero pending or failed readbacks. Original captured host/boot times survive the move. Each arm's independent oracle passes with zero mismatches/receipt violations; all sampled and unsampled model reads remain exact. Source/build bytes match across arms, actual container settings are read back, and per-arm cgroup IDs are checked against those owned containers before normalization. The first analysis attempt rejected different actual cgroup identities; the corrected derivation proves their bindings instead of ignoring them. Raw manifests and oracle archive bytes are rehashed before comparison.

Keep worker mode as the benchmark default. It removes the known blocking I/O mechanism and improves this matched median; it does not establish the 50-ms tail bar. The fallback `DX_PUBLICATION_MODE=deferred` remains available for controls. The new worker interval is recorded on its actual thread in the offline timeline; main-thread readback has a separate named scope.

The required 1,000-subject smoke `tx2-dxt1-p9-smoke-b` is DONE/oracle PASS: 1,964,080/1,964,080 model reads exact, 95/95 witnesses durably read back, complete traces/no collector errors. The initial failed built-loader smoke stays retained. Source-bound normal checks: 37 host and 294 Datomic tests pass, 51 external-service skips; build/declarations/typecheck/lint/shell pass. Root-JS still fails on the inherited unregistered file; root packaging is not verified because pinned pnpm rejects the required `--store-dir` option for `pack`.

Private evidence: `evidence/DX-T1/tx2-dxt1-p9-witness-a-{1-baseline,2-candidate,3-baseline}/`; derived verified results and script in `p9-witness-analysis-b/`; normal-check receipt in `p9-release-checks-b/`. Public per-run indexes and hashes are under `runs/`. The first analysis and test failures remain separate.
