# Bounded memory and combined campaign evidence

[P4-SHA256SUMS](P4-SHA256SUMS) uses paths relative to the durable `evidence/DX-THIN1/int1` directory. Set SUMS to the path of the published manifest and run `shasum -a 256 -c "$SUMS"` from the durable directory.

| Entry | Contents |
| --- | --- |
| `p4/checks/early-slope.json` | Recalculation from the original four fixed-activity observations in `p3-final-thin/import-samples.jsonl` and `p3-final-deep/import-samples.jsonl` on `d0a909ba4`. The [Part 3 manifest](GATEWAY-SHA256SUMS) covers those inputs. |
| `p4/checks/pins-p4.json` | Pin comparison against the 43 acceptance files on the observed main revision. The frozen trace inputs match Part 3. |
| `p4/checks/everything-plan-check.json` | Eight physical arms and the four 40-person preflight arms. The case list and treatment are shared by the runner and collector. |
| `p4/checks/native/` | Source, installed image and source-input digests for each completed native gate. Raw build and selftest logs include the first failure. |

Observed integration heads at the 03:23 UTC source cut were W1 `596138919`, HA1 `46a788316`, ACT1 `3d4783226`, STG1 `cad4a60e3`, PREP1 `0f7438020` and RD1 `89cf9d4d2`.

W1 and PREP1 share the authoritative row stamper, including predecessor clocks and valid ranges. W1 keeps ready-member ordering and a bulk turn after eight live turns. PREP1's optional overlap uses that queue with guarded head prediction and ledger or timed-retraction shapes fall back to the reference writer. The HA merge uses actual decoded frame rows and HTTP bytes while preserving typed refusal. STG1's reconciles use the durable range proof when available, and the joined publisher's activation callback applies to activation alone. The later HA, ACT1 and RD1 evidence refreshes merged cleanly.

The first W1 refresh gate caught an old speculative-splice signature and a string key in the new retry assertion. The correction preserves the shared predecessor function and checks the actual encoded head against the original acknowledgement. The first gate's output remains in the manifest.
