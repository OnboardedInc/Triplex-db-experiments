# DX-B9 retained failures and replacements

All paths below are relative to `/Users/sam/Claude/Projects/triplex-db-2/evidence/DX-B9`.
No failed/aborted aggregate is relabelled successful.

- Setup: sandboxed `host-quiet.sh` could not read `ps`/`sysctl`; sampling was rerun with host permission before any engine attempt. pnpm's run command rejected plain `--store-dir`; builds use the equivalent owned `--config.store-dir` setting. No pnpm configuration was written.
- `frozen-1`: unavailable `jcmd` produced three empty recordings. Editing its running shell runner caused an outer file-offset error after the four phase reports were copied. Exit1,849s, all objects removed. Its rows remain raw diagnostics only. Executing immutable captured shell copies and JVM-exit JFR flushing replaced this attempt.
- `mixed-1`: cancelled during host wait before resources existed.
- `frozen-2`, `mixed-2`: completed original A/B holds,773/1028s. Busy host observations remain explicit. The moving hold's immediate busy sample followed an earlier quiet precheck while it waited for the mutex; it did not repeat the whole quiet wait at that point. Neither is called a quiet absolute qualification.
- `fix-frozen-1`: explicit abort124 after277s when busy-host repeated fills threatened the lease. Its objects were removed. `fix-mixed-1` was cancelled while waiting. A sealed cloned seed replaced repeated fills.
- `tx2-dxb9-fix1-allgates-*`: rejected combined gate. Missing W0 build prevented a fixture from loading; simultaneous long/short/differential traffic hit record-time waits and the lease. The complete failure logs remain; this is not a gate union.
- `clone-frozen-1`: rejected physical `du` equality (202440 versus202432KiB). Equal block allocation was an incorrect expectation. New attempts check file-name sets and SHA256 content; `du` only enforces a cap. Its clone was removed.
- `clone-frozen-2`: byte equality passed, but opening B advanced native t from131451 to131453 without changing the logical52039 head. The attempt was rejected and removed. Later attempts retain native t changes, require exact logical head, and compare all warm SDK-answer bytes across arms. No arbitrary native-metadata equivalence is claimed.
- `clone-mixed-1`: cancelled before admission to free a heavy slot for the W0 prerequisite build. `clone-frozen-3` and `clone-mixed-2` were cancelled before containers so SDK inputs could be recaptured after the W0 repair.
- `tx2-dxb9-fix1-shortdiff2-*`: all300 differential scenarios completed, but the short slice failed. The stale W0 fixture omitted its now-required backend URL and observed the old client. The unchanged index timing test missed its cross-clock bound by0.23ms (2016 versus2015.772708ms). The attempt remains failed.
- `w0-fixture-probe/result.log`: with correct URL/instrumentation, both layouts exposed the real multi-root row-order defect. The decoder was repaired to preserve the existing portable BFS assertion; no assertion was weakened. Five focused decoder tests, build and typecheck then passed.
- `final-frozen-1`: completed prototype comparison, but the opt-in implementation still lost at64 readers under the non-overlap rule. The report-fed map was therefore put behind `TX2_RECENT_REVISIONS=1`, off by default. `final-mixed-1` was cancelled before any stack once this prototype was no longer the selected default.

The selected default's `default-frozen-1`, `default-mixed-1` and `a-default1-*` attempts are separate fresh jobs. Their eventual results, including any additional failures, belong in REPORT.md and the evidence index. An earlier successful slice cannot conceal a later failure.
