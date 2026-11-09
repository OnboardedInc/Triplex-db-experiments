# E1 under Q93 (supersedes the process-evidence recipe)

North star: seed-reuse speed for P1-P5 with exact content. Authority: lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md;
Q93a/b and R36. This plan grants no qualification: E1 remains unrun.

XTDB measurements require a seed manifest; the old inline XTDB seed path refuses. Seed with xtdb-seed.ts. It pins G0 D before finish-block. Build the golden with `engine.mjs golden --manifest FILE`:
two finish-blocks/jobs waits, stop, stopped copy, two starts of the ordinary qualification clone, D/L equality. The golden
volume is never started. No stop-line or frontier reading decides anything. Keep its reported volume/size and remove it
only with explicit `engine.mjs golden-rm` when the qualification work is finished.

For the clone arm, `engine.mjs clone --golden-record FILE` emits TRIPLEX_LAB_GOLDEN in addition to the endpoint/container.
Pass its manifest to driver.ts. The driver checks the key/health/quiescence refusals, then independently runs G0 on its
writer endpoint before workers/warm-up. For the fresh arm, seed the same inputs into a fresh admitted exclusive slot,
then `engine.mjs fresh --manifest FILE`; use its TRIPLEX_LAB_FRESH_STATE and TRIPLEX_LAB_REFERENCE_GOLDEN pointing at the
comparison golden. This performs the same two cuts/jobs waits and restart. Fresh Dprime must equal golden Dprime (Q93c); each arm independently passes full D against its own source pin; live_tables is
read only after restart. Unset the clone-arm environment before the fresh arm and vice versa.

Use the existing PAIR-0 A/A schedule and p50 <=1.10 / p99 <=1.15 margins. Same recipe/image/version requires fresh E1
before clone receipts count. First new commit position and end counts are refusal-only. Record maintenance in the window
under Q74e. All acquisition has deadlines. No runner deletes goldens; clean only each current owned slot through engine.mjs.
No engine/slot/volume action is authorized or performed by this offline implementation round.

Round 9: source pinning now computes the separate Q93c Dprime. D never accepts a changed clone, including generated metadata. E1 compares Dprime only; missing or unrankable normalization refuses. Raw scalar transport retains pgwire types/bytes; unsupported NaN payload/structured transport refuses until qualified. No live E1 is claimed.

Round 10 supersedes any implication that result-column OIDs alone prove stored widths. The native catalog must corroborate a monomorphic scalar type; numeric unions refuse. Dprime now preserves equality and order of verified clock instants, and refuses an instant inconsistent with its transaction clock even when its derived uniqueness identity agrees. Regenerate both source pins after integration; follow LIVE-round10.md for native-wire and two-start checks before E1.
