# Retained equivalence sample: independent Python expectations, verifier XTQL, author SQL

This is historical execution evidence, recomputed by CX-VX02. It is not a fresh candidate gate.

| Logical task | Independent expected rows | XTQL modes matching | SQL modes matching |
| --- | --- | --- | --- |
| 01/before-first-status | `[]` | current, reopen | current, reopen |
| 01/earlier-knowledge | `[[{"tag":"str","value":"paid"}]]` | current, reopen | current, reopen |
| 01/paid-after-shipment-known | `[[{"tag":"str","value":"paid"}]]` | current, reopen | current, reopen |
| 01/shipment-boundary | `[[{"tag":"str","value":"shipped"}]]` | current, reopen | current, reopen |
| 02/before-any-knowledge | `[]` | current, reopen | current, reopen |
| 02/corrected-same-valid-time | `[[{"tag":"str","value":"B"}]]` | current, reopen | current, reopen |
| 02/original-known-address | `[[{"tag":"str","value":"A"}]]` | current, reopen | current, reopen |
| 03/at-price-boundary | `[[{"tag":"i64","value":"120"}]]` | current, reopen | current, reopen |
| 03/before-price-history | `[]` | current, reopen | current, reopen |
| 03/two-purchases | `[[{"tag":"str","value":"buy49"},{"tag":"i64","value":"100"}],[{"tag":"str","value":"buy50"},{"tag":"i64","value":"120"}]]` | current, reopen | current, reopen |
| 04/claim29-corrected | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 04/claim29-original | `[[{"tag":"bool","value":true}]]` | current, reopen | current, reopen |
| 04/claim30-exclusive-end | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 04/corrected-end | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 05/before-newer | `[[{"tag":"str","value":"paid"}]]` | current, reopen | current, reopen |
| 05/duplicate-counts-once | `[[{"tag":"i64","value":"3"}]]` | current, reopen | current, reopen |
| 05/older-revision-fills-history | `[[{"tag":"str","value":"created"}]]` | current, reopen | current, reopen |
| 05/revision-wins-arrival | `[[{"tag":"str","value":"shipped"}]]` | current, reopen | current, reopen |
| 06/balance800 | `[[{"tag":"i64","value":"800"}]]` | current, reopen | current, reopen |
| 06/business-reversal | `[[{"tag":"i64","value":"300"}]]` | current, reopen | current, reopen |
| 06/distinct-equal-postings | `[[{"tag":"i64","value":"1000"}]]` | current, reopen | current, reopen |
| 06/empty-currency | `[[{"tag":"i64","value":"0"}]]` | current, reopen | current, reopen |
| 07/available7 | `[[{"tag":"i64","value":"10"},{"tag":"i64","value":"3"},{"tag":"i64","value":"7"}]]` | current, reopen | current, reopen |
| 07/before-release | `[[{"tag":"i64","value":"10"},{"tag":"i64","value":"4"},{"tag":"i64","value":"6"}]]` | current, reopen | current, reopen |
| 07/canceled-reservation | `[[{"tag":"i64","value":"10"},{"tag":"i64","value":"0"},{"tag":"i64","value":"10"}]]` | current, reopen | current, reopen |
| 08/net700 | `[[{"tag":"i64","value":"700"}]]` | current, reopen | current, reopen |
| 08/no-refunds | `[[{"tag":"i64","value":"1000"}]]` | current, reopen | current, reopen |
| 08/one-refund | `[[{"tag":"i64","value":"900"}]]` | current, reopen | current, reopen |
| 09/before-entitlement-known | `[[{"tag":"str","value":"S"}]]` | current, reopen | current, reopen |
| 09/entitlement-boundary | `[]` | current, reopen | current, reopen |
| 09/unprovisioned | `[[{"tag":"str","value":"S"}]]` | current, reopen | current, reopen |
| 10/complete-source-overdue | `[[{"tag":"str","value":"overdue"}]]` | current, reopen | current, reopen |
| 10/completed-late | `[[{"tag":"str","value":"completed_late"}]]` | current, reopen | current, reopen |
| 10/deadline-boundary | `[[{"tag":"str","value":"overdue"}]]` | current, reopen | current, reopen |
| 10/incomplete-source | `[[{"tag":"str","value":"pending_knowledge"}]]` | current, reopen | current, reopen |
| 11/expired-membership | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 11/inherited-allow | `[[{"tag":"bool","value":true}]]` | none (timeouts) | current, reopen |
| 11/unknown-user | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 12/corrected-block | `[[{"tag":"bool","value":true}]]` | none (timeouts) | current, reopen |
| 12/deny-two-allows | `[[{"tag":"bool","value":false}]]` | reopen | current, reopen |
| 12/exclusive-block-end | `[[{"tag":"bool","value":true}]]` | none (timeouts) | current, reopen |
| 12/one-allow-remains | `[[{"tag":"bool","value":true}]]` | none (timeouts) | current, reopen |
| 13/destination | `[[{"tag":"str","value":"B"}]]` | current, reopen | current, reopen |
| 13/move-boundary | `[[{"tag":"str","value":"A"}]]` | reopen | current, reopen |
| 13/move-not-yet-known | `[[{"tag":"str","value":"A"}],[{"tag":"str","value":"B"}]]` | current, reopen | current, reopen |
| 13/nested-items | `[[{"tag":"str","value":"A"}],[{"tag":"str","value":"B"}]]` | reopen | current, reopen |
| 14/affected-customer | `[[{"tag":"str","value":"C"}]]` | current, reopen | current, reopen |
| 14/before-shipment | `[]` | current, reopen | current, reopen |
| 14/corrected-genealogy | `[]` | current, reopen | current, reopen |
| 15/dependency-set | `[[{"tag":"str","value":"W"}],[{"tag":"str","value":"Y"}],[{"tag":"str","value":"Z"}]]` | none (timeouts) | current, reopen |
| 15/diamond-cycle | `[[{"tag":"str","value":"X"}]]` | current | current, reopen |
| 15/vulnerability-end | `[]` | current | current, reopen |
| 16/metadata-added | `[[{"tag":"str","value":"A"},{"tag":"i64","value":"7"}],[{"tag":"str","value":"B"},{"tag":"i64","value":"7"}],[{"tag":"str","value":"C"},{"tag":"i64","value":"7"}]]` | current, reopen | current, reopen |
| 16/original-lineage | `[[{"tag":"str","value":"A"},{"tag":"i64","value":"7"}],[{"tag":"str","value":"B"},{"tag":"i64","value":"7"}]]` | current, reopen | current, reopen |
| 16/unknown-output | `[]` | current, reopen | current, reopen |
| 17/equal-steps-fail | `[[{"tag":"bool","value":false}]]` | current, reopen | current, reopen |
| 17/include-exclusive-boundary | `[[{"tag":"str","value":"S"}],[{"tag":"str","value":"U"}]]` | current, reopen | current, reopen |
| 17/ordered-not-reordered | `[[{"tag":"str","value":"S"}]]` | current, reopen | current, reopen |
| 18/bridge-known | `[[{"tag":"i64","value":"12"}]]` | none (timeouts) | current, reopen |
| 18/clipped | `[[{"tag":"i64","value":"5"}]]` | none (timeouts) | current, reopen |
| 18/duplicate-stays10 | `[[{"tag":"i64","value":"10"}]]` | none (timeouts) | current, reopen |
| 18/gap | `[[{"tag":"i64","value":"0"}]]` | current, reopen | current, reopen |
| 18/union10 | `[[{"tag":"i64","value":"10"}]]` | none (timeouts) | current, reopen |
| 19/future-valid-feature | `[[{"tag":"i64","value":"99"}]]` | current, reopen | current, reopen |
| 19/historical-training-example | `[[{"tag":"str","value":"P"},{"tag":"i64","value":"10"},{"tag":"bool","value":true}]]` | current, reopen | current, reopen |
| 19/label-not-known | `[]` | current, reopen | current, reopen |
| 19/restated-feature-separate | `[[{"tag":"i64","value":"20"}]]` | current, reopen | current, reopen |
| 20/last-support-removed | `[[{"tag":"bool","value":false},{"tag":"i64","value":"0"}]]` | current, reopen | current, reopen |
| 20/one-support | `[[{"tag":"bool","value":true},{"tag":"i64","value":"1"}]]` | current, reopen | current, reopen |
| 20/remaining-closure | `[[{"tag":"str","value":"B"}],[{"tag":"str","value":"C"}]]` | current, reopen | current, reopen |
| 20/two-supports | `[[{"tag":"bool","value":true},{"tag":"i64","value":"2"}]]` | current, reopen | current, reopen |
