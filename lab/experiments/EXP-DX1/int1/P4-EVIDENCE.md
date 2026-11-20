# Bounded memory and combined campaign evidence

[P4-SHA256SUMS](P4-SHA256SUMS) uses paths relative to the durable `evidence/DX-THIN1/int1` directory. Set SUMS to the path of the published manifest and run `shasum -a 256 -c "$SUMS"` from the durable directory.

| Entry | Contents |
| --- | --- |
| `p4/checks/early-slope.json` | Recalculation from the original four fixed-activity observations in `p3-final-thin/import-samples.jsonl` and `p3-final-deep/import-samples.jsonl` on `d0a909ba4`. The [Part 3 manifest](GATEWAY-SHA256SUMS) covers those inputs. |
| `p4/checks/pins-p4.json`, `pins-final-check.json` | Pin comparisons against the 43 acceptance files on the observed main revision. The frozen trace inputs match Part 3. |
| `p4/checks/everything-plan-sealed.json` | Eight physical arms and the four 40-person preflights. The runner and collector share the case list and explicit option settings. |
| `p4-pilot-thin` | The independent collector checked the 100/150/200-person pilot with two fixed touches and verified the original roster, counters and clean volume release. At 200 the 96 MiB PostgreSQL pool had 17.27 MiB assigned. Per-process proportional memory was unavailable. |
| `p4-everything-a` | The first managed campaign smoke stopped before driver readiness. The loader had two concurrency declarations after the merge. The correction keeps ordinary pipelining and serial deep receipt order. All 328 changed and bench modules parsed after the repair. The failed slot released its own volume. |
| `p4-scopes` | The 1/8/32/128-scope census on `cfec11ea1`. The original ledgers and saved checks bind all 128 opens, the pinned reads, the four first writes and the managed cleanup. |
| `p4/checks/cleanup/` | Fresh image-manager receipts for the 11 removed staged tags and refusals for any retained image checked in the same pass. |
| `p4/checks/native/` | Source, installed image and source-input digests for each completed native gate. Raw build and selftest logs include the first failures. |
| `p4/checks/*-focused.log` | Ten notice tests and nine loader and oracle tests completed. The first SDK run found a legacy byte-order difference. The corrected identity-range run passed all 11 checks against the original fixture. |
| `p4/checks/native-retry-in-memory.log` | The updated authoritative retry test completed 70 in-memory Datomic assertions, including the original receipt, new command conflict and unchanged head. |

Observed integration heads at the 03:23 UTC source cut were W1 `596138919`, HA1 `46a788316`, ACT1 `3d4783226`, STG1 `cad4a60e3`, PREP1 `0f7438020` and RD1 `89cf9d4d2`.

W1 and PREP1 share the authoritative row stamper, including predecessor clocks and valid ranges. W1 keeps ready-member ordering and a bulk turn after eight live turns. PREP1's optional overlap uses that queue with guarded head prediction and ledger or timed-retraction shapes fall back to the reference writer. The HA merge uses actual decoded frame rows and HTTP bytes while preserving typed refusal. STG1's reconciles use the durable range proof when available, and the joined publisher's activation callback applies to activation alone. The later HA, ACT1 and RD1 evidence refreshes merged cleanly.

The first W1 refresh gate caught an old speculative-splice signature and a string key in the new retry assertion. The correction preserves the shared predecessor function and checks the actual encoded head against the original acknowledgement. The first gate's output remains in the manifest. The full corrected integration gate on `23917e67a` completed 27 tests and 54,079 assertions with zero failures. The later SDK and harness changes retain the same native gateway, codec and launcher inputs.
