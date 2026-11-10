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
| 8501 | routes / get /v2/admin/scan-stats | 2 |
| 8501 | routes / post /v1/db/create | 5 |
| 8501 | routes / post /v1/db/{db}/transact | 231 |
| 8501 | routes / post /v2/db/{db}/transactions | 4 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/create | 4 |

## warmup → baseline

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 15 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 28 |
| 8501 | routes / post /v2/db/{db}/begin | 8 |
| 8501 | routes / post /v2/db/{db}/reach | 14 |
| 8501 | routes / post /v2/db/{db}/transactions | 5 |
| 8502 | branches / entities / calls | 223 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 223 |
| 8502 | routes / post /v2/db/{db}/reach | 53813 |

## baseline → L1

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 20 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 5 |
| 8501 | routes / get /v2/admin/scan-stats | 2 |
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
| 8501 | routes / get /v1/db/{db}/basis | 20 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 39 |
| 8501 | routes / post /v2/db/{db}/begin | 9 |
| 8501 | routes / post /v2/db/{db}/reach | 21 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 19 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 19 |
| 8502 | routes / post /v2/db/{db}/reach | 10223 |

## L4 → L16

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 20 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 2 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 42 |
| 8501 | routes / post /v2/db/{db}/begin | 20 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 21 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 81 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 81 |
| 8502 | routes / post /v2/db/{db}/reach | 59820 |

## L16 → L64

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 92 |
| 8501 | branches / entity / calls | 1 |
| 8501 | branches / scan / calls | 1 |
| 8501 | branches / scan / datoms | 199580 |
| 8501 | routes / get /v1/db/{db}/basis | 37 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 94 |
| 8501 | routes / post /v1/db/{db}/release | 2 |
| 8501 | routes / post /v1/db/{db}/transact | 50 |
| 8501 | routes / post /v2/db/{db}/begin | 11 |
| 8501 | routes / post /v2/db/{db}/command | 2 |
| 8501 | routes / post /v2/db/{db}/journal | 2 |
| 8501 | routes / post /v2/db/{db}/reach | 28 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / calls | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / datoms | 199580 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 199580 |
| 8502 | branches / entities / calls | 7109 |
| 8502 | routes / get /v1/db/{db}/basis | 1352 |
| 8502 | routes / get /v2/admin/scan-stats | 2 |
| 8502 | routes / post /v1/db/{db}/read | 7109 |
| 8502 | routes / post /v2/db/{db}/reach | 54124 |

## L64 → L256

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 114 |
| 8501 | branches / entity / calls | 1 |
| 8501 | branches / scan / calls | 1 |
| 8501 | branches / scan / datoms | 201059 |
| 8501 | routes / get /v1/db/{db}/basis | 42 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 116 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 42 |
| 8501 | routes / post /v2/db/{db}/begin | 14 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 22 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / calls | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / datoms | 201059 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201059 |
| 8502 | branches / entities / calls | 14409 |
| 8502 | routes / get /v1/db/{db}/basis | 2795 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 14411 |
| 8502 | routes / post /v2/db/{db}/reach | 2804 |

## L256 → L1024

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 2430 |
| 8501 | branches / entity / calls | 1 |
| 8501 | branches / scan / calls | 12 |
| 8501 | branches / scan / datoms | 413175 |
| 8501 | routes / get /v1/db/{db}/basis | 498 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 495 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 2445 |
| 8501 | routes / post /v1/db/{db}/release | 12 |
| 8501 | routes / post /v1/db/{db}/transact | 523 |
| 8501 | routes / post /v2/db/{db}/begin | 49 |
| 8501 | routes / post /v2/db/{db}/command | 12 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 480 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / calls | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / datoms | 201408 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201408 |
| 8502 | branches / entities / calls | 12518 |
| 8502 | routes / get /v1/db/{db}/basis | 2358 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 12516 |
| 8502 | routes / post /v2/db/{db}/reach | 2348 |

## L1024 → recovery

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 1428 |
| 8501 | branches / scan / calls | 14 |
| 8501 | branches / scan / datoms | 804871 |
| 8501 | routes / get /v1/db/{db}/basis | 277 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 280 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 1441 |
| 8501 | routes / post /v1/db/{db}/release | 14 |
| 8501 | routes / post /v1/db/{db}/transact | 294 |
| 8501 | routes / post /v2/db/{db}/begin | 63 |
| 8501 | routes / post /v2/db/{db}/command | 14 |
| 8501 | routes / post /v2/db/{db}/reach | 261 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201408 |
| 8502 | branches / entities / calls | 8631 |
| 8502 | routes / get /v1/db/{db}/basis | 1645 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 8631 |
| 8502 | routes / post /v2/db/{db}/reach | 1645 |

## recovery → p4mix

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 911 |
| 8501 | branches / scan / calls | 5 |
| 8501 | branches / scan / datoms | 988096 |
| 8501 | routes / get /v1/db/{db}/basis | 193 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 197 |
| 8501 | routes / get /v2/admin/scan-stats | 3 |
| 8501 | routes / post /v1/db/{db}/read | 916 |
| 8501 | routes / post /v1/db/{db}/release | 6 |
| 8501 | routes / post /v1/db/{db}/transact | 216 |
| 8501 | routes / post /v2/db/{db}/begin | 44 |
| 8501 | routes / post /v2/db/{db}/command | 6 |
| 8501 | routes / post /v2/db/{db}/reach | 179 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201408 |
| 8502 | branches / entities / calls | 9139 |
| 8502 | routes / get /v1/db/{db}/basis | 1768 |
| 8502 | routes / get /v2/admin/scan-stats | 2 |
| 8502 | routes / post /v1/db/{db}/read | 9139 |
| 8502 | routes / post /v2/db/{db}/reach | 1768 |

## p4mix → p4h1

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 752 |
| 8501 | branches / scan / calls | 6 |
| 8501 | branches / scan / datoms | 1082673 |
| 8501 | routes / get /v1/db/{db}/basis | 161 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 162 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 761 |
| 8501 | routes / post /v1/db/{db}/release | 5 |
| 8501 | routes / post /v1/db/{db}/transact | 179 |
| 8501 | routes / post /v2/db/{db}/begin | 31 |
| 8501 | routes / post /v2/db/{db}/command | 5 |
| 8501 | routes / post /v2/db/{db}/reach | 151 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201408 |
| 8502 | branches / entities / calls | 2637 |
| 8502 | routes / get /v1/db/{db}/basis | 517 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 2637 |
| 8502 | routes / post /v2/db/{db}/reach | 517 |

## p4h1 → final

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 234 |
| 8501 | branches / scan / calls | 1 |
| 8501 | branches / scan / datoms | 242460 |
| 8501 | routes / get /v1/db/{db}/basis | 46 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 60 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 232 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 49 |
| 8501 | routes / post /v2/db/{db}/begin | 3 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 45 |
| 8501 | scanPatterns / {"attribute" ":_tx/command-id"} / maxDatoms | 201408 |
| 8502 | branches / entities / calls | 818 |
| 8502 | routes / get /v1/db/{db}/basis | 157 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 818 |
| 8502 | routes / post /v2/db/{db}/reach | 157 |

