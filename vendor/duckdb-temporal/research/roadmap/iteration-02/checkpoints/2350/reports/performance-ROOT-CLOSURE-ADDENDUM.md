# Independent root closure addendum

This addendum updates interpretation, **not original bytes**. The frozen `analyze.py`,
`analysis-A/`, `analysis-B/`, `ANALYSIS-PROVENANCE-STATUS.json`, and
`POST-RUN-INTEGRITY.json` remain unchanged. Their earlier pending/diagnostic labels
record the state before independent closure; they are not silently rewritten.

Static review found a downstream acceptance gap: the original analyzer did not
require all controller pinfo success/exit/no-timeout fields, and its bundle checks
did not rejoin every captured provenance field. This was not an observed campaign
failure. The actual controller/worker had enforced success, but that fact alone
was insufficient for a downstream acceptance claim.

The coordinator's separately captured stdlib-only evidence closes the **actual
recorded-data** gap:

- `root-postrun-closure/independent-closure.json`: `b521bc9e08832530d226d79c20d0d33d59bdc487c70f6121ad70b08acdffcc82`; 168 successful
  recorded child processes, 11,760 outcomes (7,056 measured/4,704 warmup), complete
  schedule/source/artifact/runtime/template/history/FP/flags/affinity/caps joins;
  53 synthetic denials and two optimized-entry denials retained.
- `root-postrun-closure/derivation-verification.json`: `a93e6ea41369456f96bed032a56a3c27f84b7376c118678877c217ac4a689c3c`; every
  1,176 paired row and all 28 centres, intervals, round/load-order strata and signal
  classifications exactly reconstruct; 140 altered-statistic denials retained.
- `root-postrun-closure/json-type-audit.json`: `35d4c96479ee9b33b588dac5e7a23c2a8b313964ea2d7e448d788dfc51adc346`;
  exact JSON metadata integer/bool/register-range audit and 19 negative controls.
  Its own provenance explicitly does not claim a separate pre-execution freeze.

These are recorded metadata/hash joins, not a retrospective independent kernel
observation. The derivation reconstructs the original declared estimator rather
than proving another statistical model. All per-control intervals are descriptive;
no family-wise/equivalence guarantee is claimed. The original generic analyzer
omission remains a documented reuse limitation. Complete verifier sources, original
stdout/stderr/exit records, freeze/timestamp correction notes, negatives and JSON
receipts are captured under `root-postrun-closure/` without running them here.

**Residual signals remain real descriptive observations and unresolved.** A has
empty-query_json ~5.2%; B has float256 query/query_json ~5.6%/~8.5%, tiny-float
query_json ~5.5%, and wide-float query/query_json ~12%. There is no full speed
recovery, exclusive native attribution, or item-2 acceptance claim. No campaign,
DB/native/profile call or source patch was repeated to obtain closure.
