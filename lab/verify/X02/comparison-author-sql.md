nativeLanguage recorded in runner reports: xtql xtdb-sql
{
 "mineEqualsPacket": 142,
 "xtqlEqualsMine": 119,
 "sqlEqualsMine": 142,
 "xtqlEqualsSql": 119,
 "xtqlPure": 127,
 "sqlPure": 142,
 "xtqlOneCut": 127,
 "sqlOneCut": 142,
 "executions": 142,
 "xtqlStatus": {
  "PASS": 119,
  "FAIL_PUBLIC_API": 23
 },
 "sqlStatus": {
  "PASS": 142
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
 "sqlTimeouts": [],
 "xtqlWrongNotTimeout": [],
 "sqlWrongNotTimeout": [],
 "impure": [],
 "multiCut": []
}

| task | mode | expected (verifier) | XTQL | SQL | XTQL calls / ms | SQL calls / ms |
| --- | --- | --- | --- | --- | --- | --- |
| 01/before-first-status | current | (empty) | = | = | 1 / 1048 | 1 / 186 |
| 01/before-first-status | reopen | (empty) | = | = | 1 / 844 | 1 / 104 |
| 01/earlier-knowledge | current | paid | = | = | 1 / 992 | 1 / 211 |
| 01/earlier-knowledge | reopen | paid | = | = | 1 / 1347 | 1 / 87 |
| 01/paid-after-shipment-known | current | paid | = | = | 1 / 1711 | 1 / 303 |
| 01/paid-after-shipment-known | reopen | paid | = | = | 1 / 887 | 1 / 169 |
| 01/shipment-boundary | current | shipped | = | = | 1 / 1157 | 1 / 266 |
| 01/shipment-boundary | reopen | shipped | = | = | 1 / 865 | 1 / 90 |
| 02/before-any-knowledge | current | (empty) | = | = | 1 / 986 | 1 / 97 |
| 02/before-any-knowledge | reopen | (empty) | = | = | 1 / 1624 | 1 / 198 |
| 02/corrected-same-valid-time | current | B | = | = | 1 / 1113 | 1 / 108 |
| 02/corrected-same-valid-time | reopen | B | = | = | 1 / 1530 | 1 / 110 |
| 02/original-known-address | current | A | = | = | 1 / 1391 | 1 / 102 |
| 02/original-known-address | reopen | A | = | = | 1 / 1358 | 1 / 91 |
| 03/at-price-boundary | current | 120 | = | = | 1 / 526 | 1 / 90 |
| 03/at-price-boundary | reopen | 120 | = | = | 1 / 990 | 1 / 110 |
| 03/before-price-history | current | (empty) | = | = | 1 / 588 | 1 / 90 |
| 03/before-price-history | reopen | (empty) | = | = | 1 / 877 | 1 / 83 |
| 03/two-purchases | current | buy49,100; buy50,120 | = | = | 3 / 2278 | 3 / 621 |
| 03/two-purchases | reopen | buy49,100; buy50,120 | = | = | 3 / 4419 | 3 / 359 |
| 04/claim29-corrected | current | False | = | = | 2 / 2710 | 2 / 364 |
| 04/claim29-corrected | reopen | False | = | = | 2 / 3577 | 2 / 287 |
| 04/claim29-original | current | True | = | = | 2 / 2063 | 2 / 306 |
| 04/claim29-original | reopen | True | = | = | 2 / 1922 | 2 / 246 |
| 04/claim30-exclusive-end | current | False | = | = | 2 / 3160 | 2 / 342 |
| 04/claim30-exclusive-end | reopen | False | = | = | 2 / 2990 | 2 / 265 |
| 04/corrected-end | current | False | = | = | 1 / 1020 | 1 / 139 |
| 04/corrected-end | reopen | False | = | = | 1 / 1400 | 1 / 96 |
| 05/before-newer | current | paid | = | = | 1 / 6184 | 1 / 533 |
| 05/before-newer | reopen | paid | = | = | 1 / 5418 | 1 / 468 |
| 05/duplicate-counts-once | current | 3 | = | = | 1 / 954 | 1 / 153 |
| 05/duplicate-counts-once | reopen | 3 | = | = | 1 / 1101 | 1 / 445 |
| 05/older-revision-fills-history | current | created | = | = | 1 / 6227 | 1 / 1691 |
| 05/older-revision-fills-history | reopen | created | = | = | 1 / 5097 | 1 / 787 |
| 05/revision-wins-arrival | current | shipped | = | = | 1 / 8077 | 1 / 626 |
| 05/revision-wins-arrival | reopen | shipped | = | = | 1 / 4721 | 1 / 572 |
| 06/balance800 | current | 800 | = | = | 1 / 3887 | 1 / 410 |
| 06/balance800 | reopen | 800 | = | = | 1 / 3199 | 1 / 388 |
| 06/business-reversal | current | 300 | = | = | 1 / 2562 | 1 / 486 |
| 06/business-reversal | reopen | 300 | = | = | 1 / 2611 | 1 / 240 |
| 06/distinct-equal-postings | current | 1000 | = | = | 1 / 2820 | 1 / 443 |
| 06/distinct-equal-postings | reopen | 1000 | = | = | 1 / 3179 | 1 / 290 |
| 06/empty-currency | current | 0 | = | = | 1 / 2656 | 1 / 501 |
| 06/empty-currency | reopen | 0 | = | = | 1 / 3303 | 1 / 299 |
| 07/available7 | current | 10,3,7 | = | = | 1 / 5211 | 1 / 320 |
| 07/available7 | reopen | 10,3,7 | = | = | 1 / 2698 | 1 / 309 |
| 07/before-release | current | 10,4,6 | = | = | 1 / 3166 | 1 / 328 |
| 07/before-release | reopen | 10,4,6 | = | = | 1 / 3819 | 1 / 254 |
| 07/canceled-reservation | current | 10,0,10 | = | = | 1 / 2817 | 1 / 347 |
| 07/canceled-reservation | reopen | 10,0,10 | = | = | 1 / 2284 | 1 / 218 |
| 08/net700 | current | 700 | = | = | 1 / 11276 | 1 / 2134 |
| 08/net700 | reopen | 700 | = | = | 1 / 8769 | 1 / 1828 |
| 08/no-refunds | current | 1000 | = | = | 1 / 10099 | 1 / 1717 |
| 08/no-refunds | reopen | 1000 | = | = | 1 / 9421 | 1 / 1737 |
| 08/one-refund | current | 900 | = | = | 1 / 9623 | 1 / 1887 |
| 08/one-refund | reopen | 900 | = | = | 1 / 9768 | 1 / 1919 |
| 09/before-entitlement-known | current | S | = | = | 1 / 3725 | 1 / 463 |
| 09/before-entitlement-known | reopen | S | = | = | 1 / 7905 | 1 / 443 |
| 09/entitlement-boundary | current | (empty) | = | = | 1 / 3498 | 1 / 601 |
| 09/entitlement-boundary | reopen | (empty) | = | = | 1 / 6209 | 1 / 425 |
| 09/unprovisioned | current | S | = | = | 1 / 4456 | 1 / 526 |
| 09/unprovisioned | reopen | S | = | = | 1 / 5554 | 1 / 355 |
| 10/complete-source-overdue | current | overdue | = | = | 3 / 12556 | 3 / 1259 |
| 10/complete-source-overdue | reopen | overdue | = | = | 3 / 10233 | 3 / 1505 |
| 10/completed-late | current | completed_late | = | = | 2 / 5889 | 2 / 1445 |
| 10/completed-late | reopen | completed_late | = | = | 2 / 9266 | 2 / 1353 |
| 10/deadline-boundary | current | overdue | = | = | 3 / 10719 | 3 / 1603 |
| 10/deadline-boundary | reopen | overdue | = | = | 3 / 10561 | 3 / 2329 |
| 10/incomplete-source | current | pending_knowledge | = | = | 3 / 13395 | 3 / 2174 |
| 10/incomplete-source | reopen | pending_knowledge | = | = | 3 / 9851 | 3 / 2097 |
| 11/expired-membership | current | False | = | = | 5 / 34981 | 1 / 5016 |
| 11/expired-membership | reopen | False | = | = | 5 / 34824 | 1 / 4243 |
| 11/inherited-allow | current | True | TIMEOUT | = | 4 / 47312 | 1 / 6846 |
| 11/inherited-allow | reopen | True | TIMEOUT | = | 4 / 53131 | 1 / 7309 |
| 11/unknown-user | current | False | = | = | 5 / 37764 | 1 / 3404 |
| 11/unknown-user | reopen | False | = | = | 5 / 34179 | 1 / 7110 |
| 12/corrected-block | current | True | TIMEOUT | = | 0 / 30009 | 1 / 2697 |
| 12/corrected-block | reopen | True | TIMEOUT | = | 0 / 30008 | 1 / 1251 |
| 12/deny-two-allows | current | False | TIMEOUT | = | 0 / 30006 | 1 / 2969 |
| 12/deny-two-allows | reopen | False | = | = | 1 / 24330 | 1 / 1106 |
| 12/exclusive-block-end | current | True | TIMEOUT | = | 0 / 30015 | 1 / 2650 |
| 12/exclusive-block-end | reopen | True | TIMEOUT | = | 0 / 30011 | 1 / 1199 |
| 12/one-allow-remains | current | True | TIMEOUT | = | 0 / 30020 | 1 / 3755 |
| 12/one-allow-remains | reopen | True | TIMEOUT | = | 0 / 30031 | 1 / 1163 |
| 13/destination | current | B | = | = | 3 / 17762 | 1 / 341 |
| 13/destination | reopen | B | = | = | 3 / 12643 | 1 / 350 |
| 13/move-boundary | current | A | TIMEOUT | = | 3 / 48501 | 1 / 351 |
| 13/move-boundary | reopen | A | = | = | 4 / 29474 | 1 / 446 |
| 13/move-not-yet-known | current | A; B | = | = | 4 / 65596 | 1 / 380 |
| 13/move-not-yet-known | reopen | A; B | = | = | 4 / 36041 | 1 / 409 |
| 13/nested-items | current | A; B | TIMEOUT | = | 3 / 64088 | 1 / 398 |
| 13/nested-items | reopen | A; B | = | = | 4 / 51009 | 1 / 419 |
| 14/affected-customer | current | C | = | = | 3 / 10908 | 1 / 770 |
| 14/affected-customer | reopen | C | = | = | 3 / 9375 | 1 / 607 |
| 14/before-shipment | current | (empty) | = | = | 3 / 9329 | 1 / 585 |
| 14/before-shipment | reopen | (empty) | = | = | 3 / 9922 | 1 / 596 |
| 14/corrected-genealogy | current | (empty) | = | = | 3 / 12551 | 1 / 545 |
| 14/corrected-genealogy | reopen | (empty) | = | = | 3 / 11797 | 1 / 531 |
| 15/dependency-set | current | W; Y; Z | TIMEOUT | = | 2 / 40026 | 1 / 325 |
| 15/dependency-set | reopen | W; Y; Z | TIMEOUT | = | 2 / 44138 | 1 / 281 |
| 15/diamond-cycle | current | X | = | = | 4 / 52434 | 1 / 928 |
| 15/diamond-cycle | reopen | X | TIMEOUT | = | 2 / 44414 | 1 / 702 |
| 15/vulnerability-end | current | (empty) | = | = | 4 / 51493 | 1 / 1066 |
| 15/vulnerability-end | reopen | (empty) | TIMEOUT | = | 2 / 48029 | 1 / 832 |
| 16/metadata-added | current | A,7; B,7; C,7 | = | = | 3 / 20076 | 3 / 1222 |
| 16/metadata-added | reopen | A,7; B,7; C,7 | = | = | 3 / 16300 | 3 / 1045 |
| 16/original-lineage | current | A,7; B,7 | = | = | 3 / 21295 | 3 / 1388 |
| 16/original-lineage | reopen | A,7; B,7 | = | = | 3 / 24048 | 3 / 1360 |
| 16/unknown-output | current | (empty) | = | = | 3 / 22167 | 3 / 1437 |
| 16/unknown-output | reopen | (empty) | = | = | 3 / 14763 | 3 / 1481 |
| 17/equal-steps-fail | current | False | = | = | 1 / 14015 | 1 / 1235 |
| 17/equal-steps-fail | reopen | False | = | = | 1 / 15487 | 1 / 1848 |
| 17/include-exclusive-boundary | current | S; U | = | = | 1 / 15053 | 1 / 1510 |
| 17/include-exclusive-boundary | reopen | S; U | = | = | 1 / 16255 | 1 / 1509 |
| 17/ordered-not-reordered | current | S | = | = | 1 / 14797 | 1 / 1430 |
| 17/ordered-not-reordered | reopen | S | = | = | 1 / 13697 | 1 / 2129 |
| 18/bridge-known | current | 12 | TIMEOUT | = | 0 / 30028 | 1 / 1552 |
| 18/bridge-known | reopen | 12 | TIMEOUT | = | 0 / 30005 | 1 / 1401 |
| 18/clipped | current | 5 | TIMEOUT | = | 0 / 30006 | 1 / 1034 |
| 18/clipped | reopen | 5 | TIMEOUT | = | 0 / 30008 | 1 / 1085 |
| 18/duplicate-stays10 | current | 10 | TIMEOUT | = | 0 / 30006 | 1 / 985 |
| 18/duplicate-stays10 | reopen | 10 | TIMEOUT | = | 0 / 30076 | 1 / 1765 |
| 18/gap | current | 0 | = | = | 1 / 4583 | 1 / 1536 |
| 18/gap | reopen | 0 | = | = | 1 / 5689 | 1 / 1406 |
| 18/union10 | current | 10 | TIMEOUT | = | 0 / 30006 | 1 / 801 |
| 18/union10 | reopen | 10 | TIMEOUT | = | 0 / 30010 | 1 / 1869 |
| 19/future-valid-feature | current | 99 | = | = | 1 / 1546 | 1 / 154 |
| 19/future-valid-feature | reopen | 99 | = | = | 1 / 1632 | 1 / 90 |
| 19/historical-training-example | current | P,10,True | = | = | 2 / 7425 | 2 / 910 |
| 19/historical-training-example | reopen | P,10,True | = | = | 2 / 7695 | 2 / 704 |
| 19/label-not-known | current | (empty) | = | = | 1 / 6206 | 1 / 572 |
| 19/label-not-known | reopen | (empty) | = | = | 1 / 7471 | 1 / 484 |
| 19/restated-feature-separate | current | 20 | = | = | 1 / 1723 | 1 / 138 |
| 19/restated-feature-separate | reopen | 20 | = | = | 1 / 1487 | 1 / 122 |
| 20/last-support-removed | current | False,0 | = | = | 3 / 7979 | 3 / 599 |
| 20/last-support-removed | reopen | False,0 | = | = | 3 / 13012 | 3 / 686 |
| 20/one-support | current | True,1 | = | = | 3 / 11215 | 3 / 701 |
| 20/one-support | reopen | True,1 | = | = | 3 / 13359 | 3 / 858 |
| 20/remaining-closure | current | B; C | = | = | 3 / 7881 | 1 / 246 |
| 20/remaining-closure | reopen | B; C | = | = | 3 / 8414 | 1 / 268 |
| 20/two-supports | current | True,2 | = | = | 3 / 11712 | 3 / 1017 |
| 20/two-supports | reopen | True,2 | = | = | 3 / 11194 | 3 / 927 |
