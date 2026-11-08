nativeLanguage recorded in runner reports: xtql xtdb-sql
{
 "mineEqualsPacket": 142,
 "xtqlEqualsMine": 119,
 "sqlEqualsMine": 78,
 "xtqlEqualsSql": 73,
 "xtqlPure": 127,
 "sqlPure": 80,
 "xtqlOneCut": 127,
 "sqlOneCut": 80,
 "executions": 142,
 "xtqlStatus": {
  "PASS": 119,
  "FAIL_PUBLIC_API": 23
 },
 "sqlStatus": {
  "PASS": 78,
  "FAIL_PUBLIC_API": 38,
  "MISSING": 26
 },
 "xtqlTimeouts": [
  "11/inherited-allow",
  "11/inherited-allow (reopen)",
  "12/corrected-block",
  "12/corrected-block (reopen)",
  "12/deny-two-allows",
  "12/exclusive-block-end",
  "12/exclusive-block-end (reopen)",
  "12/one-allow-remains",
  "12/one-allow-remains (reopen)",
  "13/move-boundary",
  "13/nested-items",
  "15/dependency-set",
  "15/dependency-set (reopen)",
  "15/diamond-cycle (reopen)",
  "15/vulnerability-end (reopen)",
  "18/bridge-known",
  "18/bridge-known (reopen)",
  "18/clipped",
  "18/clipped (reopen)",
  "18/duplicate-stays10",
  "18/duplicate-stays10 (reopen)",
  "18/union10",
  "18/union10 (reopen)"
 ],
 "sqlTimeouts": [
  "08/net700",
  "08/net700 (reopen)",
  "08/no-refunds",
  "08/no-refunds (reopen)",
  "08/one-refund",
  "08/one-refund (reopen)",
  "11/expired-membership (reopen)",
  "11/inherited-allow (reopen)",
  "11/unknown-user",
  "11/unknown-user (reopen)",
  "12/corrected-block",
  "12/corrected-block (reopen)",
  "12/deny-two-allows",
  "12/deny-two-allows (reopen)",
  "12/exclusive-block-end",
  "12/exclusive-block-end (reopen)",
  "12/one-allow-remains",
  "12/one-allow-remains (reopen)",
  "14/affected-customer",
  "14/before-shipment (reopen)",
  "14/corrected-genealogy",
  "14/corrected-genealogy (reopen)",
  "15/diamond-cycle",
  "15/diamond-cycle (reopen)",
  "15/vulnerability-end",
  "15/vulnerability-end (reopen)",
  "16/metadata-added",
  "16/metadata-added (reopen)",
  "16/original-lineage",
  "16/original-lineage (reopen)",
  "16/unknown-output",
  "16/unknown-output (reopen)",
  "17/equal-steps-fail",
  "17/equal-steps-fail (reopen)",
  "17/include-exclusive-boundary",
  "17/include-exclusive-boundary (reopen)",
  "17/ordered-not-reordered",
  "17/ordered-not-reordered (reopen)"
 ],
 "xtqlWrongNotTimeout": [],
 "sqlWrongNotTimeout": [],
 "impure": [],
 "multiCut": []
}

| task | mode | expected (verifier) | XTQL | SQL | XTQL calls / ms | SQL calls / ms |
| --- | --- | --- | --- | --- | --- | --- |
| 01/before-first-status | current | (empty) | = | = | 1 / 1048 | 1 / 3788 |
| 01/before-first-status | reopen | (empty) | = | = | 1 / 844 | 1 / 3527 |
| 01/earlier-knowledge | current | paid | = | = | 1 / 992 | 1 / 3720 |
| 01/earlier-knowledge | reopen | paid | = | = | 1 / 1347 | 1 / 3266 |
| 01/paid-after-shipment-known | current | paid | = | = | 1 / 1711 | 1 / 3598 |
| 01/paid-after-shipment-known | reopen | paid | = | = | 1 / 887 | 1 / 4680 |
| 01/shipment-boundary | current | shipped | = | = | 1 / 1157 | 1 / 5375 |
| 01/shipment-boundary | reopen | shipped | = | = | 1 / 865 | 1 / 8332 |
| 02/before-any-knowledge | current | (empty) | = | = | 1 / 986 | 1 / 2528 |
| 02/before-any-knowledge | reopen | (empty) | = | = | 1 / 1624 | 1 / 2227 |
| 02/corrected-same-valid-time | current | B | = | = | 1 / 1113 | 1 / 2789 |
| 02/corrected-same-valid-time | reopen | B | = | = | 1 / 1530 | 1 / 2778 |
| 02/original-known-address | current | A | = | = | 1 / 1391 | 1 / 2462 |
| 02/original-known-address | reopen | A | = | = | 1 / 1358 | 1 / 2394 |
| 03/at-price-boundary | current | 120 | = | = | 1 / 526 | 1 / 2345 |
| 03/at-price-boundary | reopen | 120 | = | = | 1 / 990 | 1 / 2793 |
| 03/before-price-history | current | (empty) | = | = | 1 / 588 | 1 / 3171 |
| 03/before-price-history | reopen | (empty) | = | = | 1 / 877 | 1 / 2603 |
| 03/two-purchases | current | buy49,100; buy50,120 | = | = | 3 / 2278 | 3 / 16799 |
| 03/two-purchases | reopen | buy49,100; buy50,120 | = | = | 3 / 4419 | 3 / 13072 |
| 04/claim29-corrected | current | False | = | = | 2 / 2710 | 2 / 4704 |
| 04/claim29-corrected | reopen | False | = | = | 2 / 3577 | 2 / 5281 |
| 04/claim29-original | current | True | = | = | 2 / 2063 | 2 / 13952 |
| 04/claim29-original | reopen | True | = | = | 2 / 1922 | 2 / 6456 |
| 04/claim30-exclusive-end | current | False | = | = | 2 / 3160 | 2 / 7772 |
| 04/claim30-exclusive-end | reopen | False | = | = | 2 / 2990 | 2 / 6915 |
| 04/corrected-end | current | False | = | = | 1 / 1020 | 1 / 2282 |
| 04/corrected-end | reopen | False | = | = | 1 / 1400 | 1 / 1920 |
| 05/before-newer | current | paid | = | = | 1 / 6184 | 1 / 11335 |
| 05/before-newer | reopen | paid | = | = | 1 / 5418 | 1 / 13066 |
| 05/duplicate-counts-once | current | 3 | = | = | 1 / 954 | 1 / 2515 |
| 05/duplicate-counts-once | reopen | 3 | = | = | 1 / 1101 | 1 / 2330 |
| 05/older-revision-fills-history | current | created | = | = | 1 / 6227 | 1 / 11340 |
| 05/older-revision-fills-history | reopen | created | = | = | 1 / 5097 | 1 / 10638 |
| 05/revision-wins-arrival | current | shipped | = | = | 1 / 8077 | 1 / 11210 |
| 05/revision-wins-arrival | reopen | shipped | = | = | 1 / 4721 | 1 / 16235 |
| 06/balance800 | current | 800 | = | = | 1 / 3887 | 1 / 8843 |
| 06/balance800 | reopen | 800 | = | = | 1 / 3199 | 1 / 7973 |
| 06/business-reversal | current | 300 | = | = | 1 / 2562 | 1 / 6828 |
| 06/business-reversal | reopen | 300 | = | = | 1 / 2611 | 1 / 7123 |
| 06/distinct-equal-postings | current | 1000 | = | = | 1 / 2820 | 1 / 6855 |
| 06/distinct-equal-postings | reopen | 1000 | = | = | 1 / 3179 | 1 / 7300 |
| 06/empty-currency | current | 0 | = | = | 1 / 2656 | 1 / 5946 |
| 06/empty-currency | reopen | 0 | = | = | 1 / 3303 | 1 / 11165 |
| 07/available7 | current | 10,3,7 | = | = | 1 / 5211 | 1 / 11225 |
| 07/available7 | reopen | 10,3,7 | = | = | 1 / 2698 | 1 / 9423 |
| 07/before-release | current | 10,4,6 | = | = | 1 / 3166 | 1 / 10740 |
| 07/before-release | reopen | 10,4,6 | = | = | 1 / 3819 | 1 / 7863 |
| 07/canceled-reservation | current | 10,0,10 | = | = | 1 / 2817 | 1 / 8132 |
| 07/canceled-reservation | reopen | 10,0,10 | = | = | 1 / 2284 | 1 / 9117 |
| 08/net700 | current | 700 | = | TIMEOUT | 1 / 11276 | 0 / 30006 |
| 08/net700 | reopen | 700 | = | TIMEOUT | 1 / 8769 | 0 / 30012 |
| 08/no-refunds | current | 1000 | = | TIMEOUT | 1 / 10099 | 0 / 30007 |
| 08/no-refunds | reopen | 1000 | = | TIMEOUT | 1 / 9421 | 0 / 30018 |
| 08/one-refund | current | 900 | = | TIMEOUT | 1 / 9623 | 0 / 30006 |
| 08/one-refund | reopen | 900 | = | TIMEOUT | 1 / 9768 | 0 / 30014 |
| 09/before-entitlement-known | current | S | = | = | 1 / 3725 | 1 / 17479 |
| 09/before-entitlement-known | reopen | S | = | = | 1 / 7905 | 1 / 12334 |
| 09/entitlement-boundary | current | (empty) | = | = | 1 / 3498 | 1 / 15137 |
| 09/entitlement-boundary | reopen | (empty) | = | = | 1 / 6209 | 1 / 13343 |
| 09/unprovisioned | current | S | = | = | 1 / 4456 | 1 / 7484 |
| 09/unprovisioned | reopen | S | = | = | 1 / 5554 | 1 / 14966 |
| 10/complete-source-overdue | current | overdue | = | = | 3 / 12556 | 3 / 25930 |
| 10/complete-source-overdue | reopen | overdue | = | = | 3 / 10233 | 3 / 26236 |
| 10/completed-late | current | completed_late | = | = | 2 / 5889 | 2 / 22368 |
| 10/completed-late | reopen | completed_late | = | = | 2 / 9266 | 2 / 16041 |
| 10/deadline-boundary | current | overdue | = | = | 3 / 10719 | 3 / 32435 |
| 10/deadline-boundary | reopen | overdue | = | = | 3 / 10561 | 3 / 25062 |
| 10/incomplete-source | current | pending_knowledge | = | = | 3 / 13395 | 3 / 25171 |
| 10/incomplete-source | reopen | pending_knowledge | = | = | 3 / 9851 | 3 / 28857 |
| 11/expired-membership | current | False | = | = | 5 / 34981 | 1 / 25943 |
| 11/expired-membership | reopen | False | = | TIMEOUT | 5 / 34824 | 0 / 30662 |
| 11/inherited-allow | current | True | TIMEOUT | = | 4 / 47312 | 1 / 15311 |
| 11/inherited-allow | reopen | True | TIMEOUT | TIMEOUT | 4 / 53131 | 0 / 35375 |
| 11/unknown-user | current | False | = | TIMEOUT | 5 / 37764 | 0 / 33817 |
| 11/unknown-user | reopen | False | = | TIMEOUT | 5 / 34179 | 0 / 36033 |
| 12/corrected-block | current | True | TIMEOUT | TIMEOUT | 0 / 30009 | 0 / 30027 |
| 12/corrected-block | reopen | True | TIMEOUT | TIMEOUT | 0 / 30008 | 0 / 30010 |
| 12/deny-two-allows | current | False | TIMEOUT | TIMEOUT | 0 / 30006 | 0 / 30016 |
| 12/deny-two-allows | reopen | False | = | TIMEOUT | 1 / 24330 | 0 / 30007 |
| 12/exclusive-block-end | current | True | TIMEOUT | TIMEOUT | 0 / 30015 | 0 / 30025 |
| 12/exclusive-block-end | reopen | True | TIMEOUT | TIMEOUT | 0 / 30011 | 0 / 30006 |
| 12/one-allow-remains | current | True | TIMEOUT | TIMEOUT | 0 / 30020 | 0 / 30010 |
| 12/one-allow-remains | reopen | True | TIMEOUT | TIMEOUT | 0 / 30031 | 0 / 30010 |
| 13/destination | current | B | = | = | 3 / 17762 | 1 / 22704 |
| 13/destination | reopen | B | = | = | 3 / 12643 | 1 / 12412 |
| 13/move-boundary | current | A | TIMEOUT | = | 3 / 48501 | 1 / 13035 |
| 13/move-boundary | reopen | A | = | = | 4 / 29474 | 1 / 11825 |
| 13/move-not-yet-known | current | A; B | = | = | 4 / 65596 | 1 / 25964 |
| 13/move-not-yet-known | reopen | A; B | = | = | 4 / 36041 | 1 / 11577 |
| 13/nested-items | current | A; B | TIMEOUT | = | 3 / 64088 | 1 / 14392 |
| 13/nested-items | reopen | A; B | = | = | 4 / 51009 | 1 / 14081 |
| 14/affected-customer | current | C | = | TIMEOUT | 3 / 10908 | 0 / 33346 |
| 14/affected-customer | reopen | C | = | = | 3 / 9375 | 1 / 23497 |
| 14/before-shipment | current | (empty) | = | = | 3 / 9329 | 1 / 27356 |
| 14/before-shipment | reopen | (empty) | = | TIMEOUT | 3 / 9922 | 0 / 30414 |
| 14/corrected-genealogy | current | (empty) | = | TIMEOUT | 3 / 12551 | 0 / 30230 |
| 14/corrected-genealogy | reopen | (empty) | = | TIMEOUT | 3 / 11797 | 0 / 30688 |
| 15/dependency-set | current | W; Y; Z | TIMEOUT | = | 2 / 40026 | 1 / 18898 |
| 15/dependency-set | reopen | W; Y; Z | TIMEOUT | = | 2 / 44138 | 1 / 21204 |
| 15/diamond-cycle | current | X | = | TIMEOUT | 4 / 52434 | 0 / 33558 |
| 15/diamond-cycle | reopen | X | TIMEOUT | TIMEOUT | 2 / 44414 | 0 / 32027 |
| 15/vulnerability-end | current | (empty) | = | TIMEOUT | 4 / 51493 | 0 / 34037 |
| 15/vulnerability-end | reopen | (empty) | TIMEOUT | TIMEOUT | 2 / 48029 | 0 / 30349 |
| 16/metadata-added | current | A,7; B,7; C,7 | = | TIMEOUT | 3 / 20076 | 0 / 30008 |
| 16/metadata-added | reopen | A,7; B,7; C,7 | = | TIMEOUT | 3 / 16300 | 0 / 30004 |
| 16/original-lineage | current | A,7; B,7 | = | TIMEOUT | 3 / 21295 | 2 / 73809 |
| 16/original-lineage | reopen | A,7; B,7 | = | TIMEOUT | 3 / 24048 | 0 / 30003 |
| 16/unknown-output | current | (empty) | = | TIMEOUT | 3 / 22167 | 1 / 58345 |
| 16/unknown-output | reopen | (empty) | = | TIMEOUT | 3 / 14763 | 0 / 30009 |
| 17/equal-steps-fail | current | False | = | TIMEOUT | 1 / 14015 | 0 / 30004 |
| 17/equal-steps-fail | reopen | False | = | TIMEOUT | 1 / 15487 | 0 / 30021 |
| 17/include-exclusive-boundary | current | S; U | = | TIMEOUT | 1 / 15053 | 0 / 30012 |
| 17/include-exclusive-boundary | reopen | S; U | = | TIMEOUT | 1 / 16255 | 0 / 30009 |
| 17/ordered-not-reordered | current | S | = | TIMEOUT | 1 / 14797 | 0 / 30005 |
| 17/ordered-not-reordered | reopen | S | = | TIMEOUT | 1 / 13697 | 0 / 30007 |
| 18/bridge-known | current | 12 | TIMEOUT | MISSING | 0 / 30028 | None / None |
| 18/bridge-known | reopen | 12 | TIMEOUT | MISSING | 0 / 30005 | None / None |
| 18/clipped | current | 5 | TIMEOUT | MISSING | 0 / 30006 | None / None |
| 18/clipped | reopen | 5 | TIMEOUT | MISSING | 0 / 30008 | None / None |
| 18/duplicate-stays10 | current | 10 | TIMEOUT | MISSING | 0 / 30006 | None / None |
| 18/duplicate-stays10 | reopen | 10 | TIMEOUT | MISSING | 0 / 30076 | None / None |
| 18/gap | current | 0 | = | MISSING | 1 / 4583 | None / None |
| 18/gap | reopen | 0 | = | MISSING | 1 / 5689 | None / None |
| 18/union10 | current | 10 | TIMEOUT | MISSING | 0 / 30006 | None / None |
| 18/union10 | reopen | 10 | TIMEOUT | MISSING | 0 / 30010 | None / None |
| 19/future-valid-feature | current | 99 | = | MISSING | 1 / 1546 | None / None |
| 19/future-valid-feature | reopen | 99 | = | MISSING | 1 / 1632 | None / None |
| 19/historical-training-example | current | P,10,True | = | MISSING | 2 / 7425 | None / None |
| 19/historical-training-example | reopen | P,10,True | = | MISSING | 2 / 7695 | None / None |
| 19/label-not-known | current | (empty) | = | MISSING | 1 / 6206 | None / None |
| 19/label-not-known | reopen | (empty) | = | MISSING | 1 / 7471 | None / None |
| 19/restated-feature-separate | current | 20 | = | MISSING | 1 / 1723 | None / None |
| 19/restated-feature-separate | reopen | 20 | = | MISSING | 1 / 1487 | None / None |
| 20/last-support-removed | current | False,0 | = | MISSING | 3 / 7979 | None / None |
| 20/last-support-removed | reopen | False,0 | = | MISSING | 3 / 13012 | None / None |
| 20/one-support | current | True,1 | = | MISSING | 3 / 11215 | None / None |
| 20/one-support | reopen | True,1 | = | MISSING | 3 / 13359 | None / None |
| 20/remaining-closure | current | B; C | = | MISSING | 3 / 7881 | None / None |
| 20/remaining-closure | reopen | B; C | = | MISSING | 3 / 8414 | None / None |
| 20/two-supports | current | True,2 | = | MISSING | 3 / 11712 | None / None |
| 20/two-supports | reopen | True,2 | = | MISSING | 3 / 11194 | None / None |
