# Scan statistics by interval

Each row is a delta of cumulative native counters between phase-boundary snapshots. Route admin calls include observation. `datoms` counts fact-identity enumeration; subsequent entity API work is additional. Unfinished scans still contribute enumeration counts. Maxima are cumulative witnesses, never subtracted.

## setup → start

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /health | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / get /health | 1 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |

## start → warmup

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/create | 5 |
| 8501 | routes / post /v1/db/{db}/transact | 231 |
| 8501 | routes / post /v2/db/{db}/transactions | 5 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/create | 4 |
| 8502 | routes / post /v2/db/{db}/reach | 2 |

## warmup → baseline

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 15 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 28 |
| 8501 | routes / post /v2/db/{db}/begin | 8 |
| 8501 | routes / post /v2/db/{db}/reach | 14 |
| 8501 | routes / post /v2/db/{db}/transactions | 11 |
| 8502 | branches / entities / calls | 220 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 220 |
| 8502 | routes / post /v2/db/{db}/reach | 60974 |

## baseline → L1

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 44 |
| 8501 | routes / get /v1/db/{db}/basis | 29 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 6 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 44 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 41 |
| 8501 | routes / post /v2/db/{db}/begin | 11 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 20 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v2/db/{db}/reach | 1 |

## L1 → L4

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 104 |
| 8501 | routes / get /v1/db/{db}/basis | 39 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 104 |
| 8501 | routes / post /v1/db/{db}/transact | 39 |
| 8501 | routes / post /v2/db/{db}/begin | 9 |
| 8501 | routes / post /v2/db/{db}/reach | 19 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 3728 |
| 8502 | routes / get /v1/db/{db}/basis | 725 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 3729 |
| 8502 | routes / post /v2/db/{db}/reach | 724 |

## L4 → L16

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 100 |
| 8501 | routes / get /v1/db/{db}/basis | 41 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 2 |
| 8501 | routes / post /v1/db/{db}/read | 100 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 42 |
| 8501 | routes / post /v2/db/{db}/begin | 20 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 21 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 13104 |
| 8502 | routes / get /v1/db/{db}/basis | 2544 |
| 8502 | routes / get /v2/admin/scan-stats | 2 |
| 8502 | routes / post /v1/db/{db}/read | 13103 |
| 8502 | routes / post /v2/db/{db}/reach | 2544 |

## L16 → L64

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 148 |
| 8501 | routes / get /v1/db/{db}/basis | 48 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 148 |
| 8501 | routes / post /v1/db/{db}/release | 2 |
| 8501 | routes / post /v1/db/{db}/transact | 50 |
| 8501 | routes / post /v2/db/{db}/begin | 11 |
| 8501 | routes / post /v2/db/{db}/command | 2 |
| 8501 | routes / post /v2/db/{db}/journal | 2 |
| 8501 | routes / post /v2/db/{db}/reach | 28 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 16016 |
| 8502 | routes / get /v1/db/{db}/basis | 3080 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 16016 |
| 8502 | routes / post /v2/db/{db}/reach | 3085 |

## L64 → L256

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 114 |
| 8501 | routes / get /v1/db/{db}/basis | 42 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 114 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 42 |
| 8501 | routes / post /v2/db/{db}/begin | 14 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 22 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 15203 |
| 8502 | routes / get /v1/db/{db}/basis | 2952 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 15203 |
| 8502 | routes / post /v2/db/{db}/reach | 2950 |

## L256 → L1024

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 2916 |
| 8501 | routes / get /v1/db/{db}/basis | 585 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 581 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 2919 |
| 8501 | routes / post /v1/db/{db}/release | 18 |
| 8501 | routes / post /v1/db/{db}/transact | 612 |
| 8501 | routes / post /v2/db/{db}/begin | 55 |
| 8501 | routes / post /v2/db/{db}/command | 17 |
| 8501 | routes / post /v2/db/{db}/journal | 16 |
| 8501 | routes / post /v2/db/{db}/reach | 571 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 12194 |
| 8502 | routes / get /v1/db/{db}/basis | 2312 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 12196 |
| 8502 | routes / post /v2/db/{db}/reach | 2309 |

## L1024 → recovery

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 2937 |
| 8501 | routes / get /v1/db/{db}/basis | 568 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 565 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 2934 |
| 8501 | routes / post /v1/db/{db}/release | 20 |
| 8501 | routes / post /v1/db/{db}/transact | 611 |
| 8501 | routes / post /v2/db/{db}/begin | 76 |
| 8501 | routes / post /v2/db/{db}/command | 21 |
| 8501 | routes / post /v2/db/{db}/journal | 22 |
| 8501 | routes / post /v2/db/{db}/reach | 547 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 11008 |
| 8502 | routes / get /v1/db/{db}/basis | 2109 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 11007 |
| 8502 | routes / post /v2/db/{db}/reach | 2109 |

## recovery → p4mix

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 2657 |
| 8501 | routes / get /v1/db/{db}/basis | 549 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 553 |
| 8501 | routes / get /v2/admin/scan-stats | 2 |
| 8501 | routes / post /v1/db/{db}/read | 2659 |
| 8501 | routes / post /v1/db/{db}/release | 18 |
| 8501 | routes / post /v1/db/{db}/transact | 568 |
| 8501 | routes / post /v2/db/{db}/begin | 62 |
| 8501 | routes / post /v2/db/{db}/command | 18 |
| 8501 | routes / post /v2/db/{db}/journal | 18 |
| 8501 | routes / post /v2/db/{db}/reach | 533 |
| 8502 | branches / entities / calls | 10490 |
| 8502 | routes / get /v1/db/{db}/basis | 2011 |
| 8502 | routes / get /v2/admin/scan-stats | 2 |
| 8502 | routes / post /v1/db/{db}/read | 10490 |
| 8502 | routes / post /v2/db/{db}/reach | 2012 |

## p4mix → p4h1

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 1957 |
| 8501 | routes / get /v1/db/{db}/basis | 368 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 371 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 1955 |
| 8501 | routes / post /v1/db/{db}/release | 13 |
| 8501 | routes / post /v1/db/{db}/transact | 367 |
| 8501 | routes / post /v2/db/{db}/begin | 38 |
| 8501 | routes / post /v2/db/{db}/command | 13 |
| 8501 | routes / post /v2/db/{db}/journal | 13 |
| 8501 | routes / post /v2/db/{db}/reach | 354 |
| 8502 | branches / entities / calls | 1918 |
| 8502 | routes / get /v1/db/{db}/basis | 366 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 1917 |
| 8502 | routes / post /v2/db/{db}/reach | 365 |

## p4h1 → grow3

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 1300 |
| 8501 | routes / get /v1/db/{db}/basis | 236 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 227 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 1300 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 231 |
| 8501 | routes / post /v2/db/{db}/begin | 19 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 219 |
| 8502 | branches / entities / calls | 3308 |
| 8502 | routes / get /v1/db/{db}/basis | 639 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 3308 |
| 8502 | routes / post /v2/db/{db}/reach | 639 |

## grow3 → p4h3

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 43 |
| 8501 | routes / get /v1/db/{db}/basis | 6 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 5 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 43 |
| 8501 | routes / post /v1/db/{db}/transact | 10 |
| 8501 | routes / post /v2/db/{db}/begin | 3 |
| 8501 | routes / post /v2/db/{db}/reach | 3 |
| 8502 | branches / entities / calls | 1 |
| 8502 | routes / get /v1/db/{db}/basis | 1 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 1 |
| 8502 | routes / post /v2/db/{db}/reach | 1 |

## p4h3 → grow10

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 82 |
| 8501 | routes / get /v1/db/{db}/basis | 35 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 82 |
| 8501 | routes / post /v1/db/{db}/transact | 35 |
| 8501 | routes / post /v2/db/{db}/begin | 17 |
| 8501 | routes / post /v2/db/{db}/reach | 15 |
| 8502 | branches / entities / calls | 3869 |
| 8502 | routes / get /v1/db/{db}/basis | 733 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 3869 |
| 8502 | routes / post /v2/db/{db}/reach | 733 |

## grow10 → p4h10

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 48 |
| 8501 | routes / get /v1/db/{db}/basis | 15 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 22 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 48 |
| 8501 | routes / post /v1/db/{db}/transact | 29 |
| 8501 | routes / post /v2/db/{db}/begin | 3 |
| 8501 | routes / post /v2/db/{db}/reach | 10 |
| 8502 | branches / entities / calls | 1 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 1 |
| 8502 | routes / post /v2/db/{db}/reach | 1 |

## p4h10 → presweep

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 133 |
| 8501 | routes / get /v1/db/{db}/basis | 46 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 133 |
| 8501 | routes / post /v1/db/{db}/release | 2 |
| 8501 | routes / post /v1/db/{db}/transact | 48 |
| 8501 | routes / post /v2/db/{db}/begin | 20 |
| 8501 | routes / post /v2/db/{db}/command | 2 |
| 8501 | routes / post /v2/db/{db}/journal | 2 |
| 8501 | routes / post /v2/db/{db}/reach | 26 |
| 8502 | branches / entities / calls | 4000 |
| 8502 | routes / get /v1/db/{db}/basis | 779 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 4000 |
| 8502 | routes / post /v2/db/{db}/reach | 819 |

## presweep → sweep

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 88 |
| 8501 | routes / get /v1/db/{db}/basis | 36 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 88 |
| 8501 | routes / post /v1/db/{db}/transact | 36 |
| 8501 | routes / post /v2/db/{db}/begin | 16 |
| 8501 | routes / post /v2/db/{db}/reach | 16 |
| 8502 | branches / entities / calls | 9449 |
| 8502 | routes / get /v1/db/{db}/basis | 1811 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 9449 |
| 8502 | routes / post /v2/db/{db}/reach | 1773 |

## sweep → final

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 594 |
| 8501 | routes / get /v1/db/{db}/basis | 336 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 17 |
| 8501 | routes / get /v2/admin/scan-stats | 2 |
| 8501 | routes / post /v1/db/{db}/read | 594 |
| 8501 | routes / post /v1/db/{db}/release | 10 |
| 8501 | routes / post /v1/db/{db}/transact | 234 |
| 8501 | routes / post /v2/db/{db}/begin | 93 |
| 8501 | routes / post /v2/db/{db}/command | 10 |
| 8501 | routes / post /v2/db/{db}/journal | 10 |
| 8501 | routes / post /v2/db/{db}/reach | 117 |
| 8502 | branches / entities / calls | 46444 |
| 8502 | routes / get /v1/db/{db}/basis | 9111 |
| 8502 | routes / get /v2/admin/scan-stats | 2 |
| 8502 | routes / post /v1/db/create | 1 |
| 8502 | routes / post /v1/db/{db}/read | 46444 |
| 8502 | routes / post /v2/db/{db}/reach | 9108 |

