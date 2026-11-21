# Resume the held 514.7M cut

Use the Step 1 code pin for the held PostgreSQL volume. Keep the stopped run at `6d3d44641` and its evidence intact. The custodian still verifies the stopped inventory before opening the private volume.

In the Linux load configuration, keep the existing Datomic profile and the 400 GB directory ceiling. Use a new writable output parent with exact copies of the terminal `.edn` checkpoint and its `.population.edn` ledger beside the output directory. Set `source` to the full code pin. Keep `ladderEvidence` pointing at the original extracted ladder and set `resumeEvidence` to a separate, immutable extraction of the stopped load. Put the separately published `stopped-hold.json` alongside that extraction's `custody.json`. The exact stopped archive SHA-256 is `f402912526dbf0b7773d71518cf7df84dfbbc65681922850d212c300a453ba9f`. The stopped hold SHA-256 is `646eee96678dcd06e924005a3dccbe37213accac2850769454ecee33d94a4e4a`.

Set `fromRecords=514741853`, `ratePrior=9022.51` and these options in the existing config. The top-level `maxHours` and `maxUsd` still apply to measurements.

```json
{
  "directoryLimitBytes": 400000000000,
  "loadingLimits": { "floor": 6500, "lowCycles": 2, "maxHours": 26, "maxUsd": 28.34 }
}
```

```sh
node lab/experiments/EXP-DX1/age1/server.mjs load "$AGE_RUNG_CONFIG"
```

The load checks the previous attempt's hashes, closed writer custody, seed, machine, original calibration and cycle history. Its fresh live cut must match **514,741,853 records**, native t **38,613,452**, and logical head **4,034,400** on first admission. It charges the verified **2h 14m 53s** already spent and excludes the pause between runs from the new steady-rate denominator. For a later restart of this continuation, retain its output, state and admission. Editing the nested loading limits changes the policy without restarting its paid clock. The two-cycle policy makes the projected finish advisory. The paid deadline and safety limits remain active. Omitted loading limits retain the original one-cycle floor of 9,900 and the 16-hour budget. Measurements and scorecard handoff use their existing commands and inputs.
