# tx2-dxt1-p10-scheduler-a

Source 236dd70bf8077ee0a91acba63376db723e078306; summary tracing; scheduler trial, one uninterrupted session. Authoritative offer-to-finish remains the verdict. ACK-only retains lateness; corrected also subtracts actual lateness and is diagnostic.

| arm | original p50/p99 ms | ACK-only p50/p99 | corrected p50/p99 | lateness p50/p99 ms | swap GiB | Mac CPU p50/p99 % | >50 burst/growth/sparse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tx2-dxt1-p10-scheduler-a-1-baseline | 10.659/40.776 | 10.175/40.474 | 9.544/39.324 | 0.597/3.942 | 6.319 | 14.300/94.600 | 6/0/5 |
| tx2-dxt1-p10-scheduler-a-2-candidate | 10.001/44.913 | 9.537/44.395 | 9.306/42.843 | 0.002/3.956 | 6.293 | 14.300/63.400 | 20/0/5 |
| tx2-dxt1-p10-scheduler-a-3-baseline | 10.723/37.268 | 10.230/36.327 | 9.582/35.438 | 0.605/3.879 | 6.293 | 13.500/92.200 | 0/0/3 |

Controls are the two baseline rows in this table. Report a gain only when it exceeds their drift. A zero-reader row is context for the loaded disk trial, not a matched semantic-oracle PASS. Raw byte seals are next to this report.
