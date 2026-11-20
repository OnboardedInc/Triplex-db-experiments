# Mac replay observations

Every arm uses the first 240 seconds of the sealed deep schedule with zero load readers, 5,110 primary offers and 144 resends. The population seed has 1,604,464 live facts across 10,000 subjects. The current comparison uses one signed Datomic image. Mac timings describe this host. JVM pause durations and allocation per save inform the server hypotheses.

| Arm | Verified saves | Saves/s | ACK p50 / p99 / p99.9 / max in ms | Write gateway pauses, p50 / p99 / max in ms | Writer average cores / peak MiB | HTTP requests/save |
| --- | ---: | ---: | ---: | --- | --- | ---: |
| Serial C | 5,110 | 21.29 | 518 / 20,851 / 22,587 / 22,678 | 159, 9.71 / 175.01 / 260.81 | 0.152 / 620 | 1.292 |

Serial C accounted for all offers and resends and matched all 48 independent oracle reads. All fifty slowest saves spent most of their time queued before dispatch, with a median of 21.61 seconds in that interval. The writer's rounded heap occupancy grew by about 53.80 MiB/s between pauses, or 2.48 MiB per covered save across 4,952 saves. The allocation recording arrived after the timeout for its text export. Subsequent arms seal the binary directly for allocation sampling.

The Serial writer logged 156 young and three full pauses, all reporting allocation failure. Twenty-six overlapped the harness's explicit index requests, including two full pauses. The remaining 133 include one full pause and had a 60.04 ms p99. There was no history-growth overlay in the window. The G1 reader logged 296 pauses at 12.36 / 58.14 / 108.17 ms p50 / p99 / max. The G1 transactor logged 163 pauses at 20.09 / 93.41 / 96.05 ms. [Evidence manifest](SHA256SUMS)

About 103 minutes of heavy-wrapper and formal lease waiting preceded Serial C's stack. An earlier attempt reached admission with an image that had been removed. The next seeded all 10,000 subjects, but three other heavy tokens could not drain within the two-minute timing deadline. That attempt released its slot and volume without offering saves. Serial C took the formal lease before reserving memory and held the separate physical timing lock for 6 minutes and 13 seconds. [Evidence manifest](SHA256SUMS)
