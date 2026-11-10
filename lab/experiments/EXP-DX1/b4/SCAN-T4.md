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
| 8501 | routes / get /v1/db/{db}/basis | 3 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/create | 5 |
| 8501 | routes / post /v1/db/{db}/transact | 1031 |
| 8501 | routes / post /v2/db/{db}/transactions | 5 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/create | 6 |
| 8502 | routes / post /v2/db/{db}/reach | 15 |

## warmup → baseline

| Peer | Counter | Count |
|---|---|---:|
| 8501 | routes / get /v1/db/{db}/basis | 15 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 2 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 28 |
| 8501 | routes / post /v2/db/{db}/begin | 19 |
| 8501 | routes / post /v2/db/{db}/reach | 14 |
| 8501 | routes / post /v2/db/{db}/transactions | 11 |
| 8502 | branches / entities / calls | 217 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 217 |
| 8502 | routes / post /v2/db/{db}/reach | 25168 |

## baseline → L1

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 13 |
| 8501 | routes / get /v1/db/{db}/basis | 47 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 6 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 13 |
| 8501 | routes / post /v1/db/{db}/release | 1 |
| 8501 | routes / post /v1/db/{db}/transact | 91 |
| 8501 | routes / post /v2/db/{db}/begin | 66 |
| 8501 | routes / post /v2/db/{db}/command | 1 |
| 8501 | routes / post /v2/db/{db}/journal | 1 |
| 8501 | routes / post /v2/db/{db}/reach | 45 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v2/db/{db}/reach | 1 |

## L1 → L4

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 276 |
| 8501 | routes / get /v1/db/{db}/basis | 101 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 3 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 276 |
| 8501 | routes / post /v1/db/{db}/release | 3 |
| 8501 | routes / post /v1/db/{db}/transact | 105 |
| 8501 | routes / post /v2/db/{db}/begin | 70 |
| 8501 | routes / post /v2/db/{db}/command | 3 |
| 8501 | routes / post /v2/db/{db}/journal | 3 |
| 8501 | routes / post /v2/db/{db}/reach | 56 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 7339 |
| 8502 | routes / get /v1/db/{db}/basis | 1412 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 7339 |
| 8502 | routes / post /v2/db/{db}/reach | 1412 |

## L4 → L16

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 5204 |
| 8501 | routes / get /v1/db/{db}/basis | 1107 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1087 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 5207 |
| 8501 | routes / post /v1/db/{db}/release | 39 |
| 8501 | routes / post /v1/db/{db}/transact | 1173 |
| 8501 | routes / post /v2/db/{db}/begin | 275 |
| 8501 | routes / post /v2/db/{db}/command | 39 |
| 8501 | routes / post /v2/db/{db}/journal | 39 |
| 8501 | routes / post /v2/db/{db}/reach | 1067 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 11663 |
| 8502 | routes / get /v1/db/{db}/basis | 2285 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 11663 |
| 8502 | routes / post /v2/db/{db}/reach | 2284 |

## L16 → L64

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 5831 |
| 8501 | routes / get /v1/db/{db}/basis | 1186 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 1182 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 5829 |
| 8501 | routes / post /v1/db/{db}/release | 39 |
| 8501 | routes / post /v1/db/{db}/transact | 1209 |
| 8501 | routes / post /v2/db/{db}/begin | 186 |
| 8501 | routes / post /v2/db/{db}/command | 39 |
| 8501 | routes / post /v2/db/{db}/journal | 39 |
| 8501 | routes / post /v2/db/{db}/reach | 1149 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 8128 |
| 8502 | routes / get /v1/db/{db}/basis | 1547 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 8128 |
| 8502 | routes / post /v2/db/{db}/reach | 1579 |

## L64 → L256

| Peer | Counter | Count |
|---|---|---:|
| 8501 | branches / entities / calls | 1403 |
| 8501 | routes / get /v1/db/{db}/basis | 295 |
| 8501 | routes / get /v1/db/{db}/operation/{id} | 242 |
| 8501 | routes / get /v2/admin/scan-stats | 1 |
| 8501 | routes / post /v1/db/{db}/read | 1402 |
| 8501 | routes / post /v1/db/{db}/release | 6 |
| 8501 | routes / post /v1/db/{db}/transact | 294 |
| 8501 | routes / post /v2/db/{db}/begin | 55 |
| 8501 | routes / post /v2/db/{db}/command | 6 |
| 8501 | routes / post /v2/db/{db}/journal | 6 |
| 8501 | routes / post /v2/db/{db}/reach | 252 |
| 8501 | routes / post /v2/db/{db}/request-index | 1 |
| 8502 | branches / entities / calls | 14161 |
| 8502 | routes / get /v1/db/{db}/basis | 2788 |
| 8502 | routes / get /v2/admin/scan-stats | 1 |
| 8502 | routes / post /v1/db/{db}/read | 14167 |
| 8502 | routes / post /v2/db/{db}/reach | 2769 |

