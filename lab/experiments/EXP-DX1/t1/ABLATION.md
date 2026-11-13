# tx2-dxt1-p2-abl-a

Source b7887c23023be9bc22ac6b667fd86b4300504fcf; one session, common host/VM sampling, 10,000 subjects, frozen 200-second zero-reader segment. Control is mean bookend off-arm quantiles; no pooled-percentile claim.

| arm / level | p50 ms | p99 ms | off p50 / p99 ms | p50 delta ms / % | swap GiB median (min-max) |
| --- | ---: | ---: | --- | --- | --- |
| off / off | 15.655 | 90.700 | 15.994 / 121.864 | -0.339 / -2.12% | 12.523 (12.516-12.539) |
| tx-jfr / full | 15.430 | 204.021 | 15.994 / 121.864 | -0.564 / -3.53% | 12.508 (12.500-12.516) |
| gw-jfr / full | 15.862 | 182.386 | 15.994 / 121.864 | -0.132 / -0.83% | 12.453 (12.383-12.500) |
| postgres / full | 15.935 | 169.897 | 15.994 / 121.864 | -0.059 / -0.37% | 12.344 (12.344-12.383) |
| gateway / full | 15.906 | 173.031 | 15.994 / 121.864 | -0.088 / -0.55% | 12.320 (12.215-12.344) |
| node / full | 17.131 | 366.080 | 15.994 / 121.864 | 1.136 / 7.10% | 12.137 (12.137-12.137) |
| native-logs / full | 19.109 | 122.709 | 15.994 / 121.864 | 3.115 / 19.48% | 12.137 (12.137-12.137) |
| full / full | 19.191 | 97.894 | 15.994 / 121.864 | 3.197 / 19.99% | 12.105 (12.105-12.129) |
| off / off | 16.333 | 153.028 | 15.994 / 121.864 | 0.339 / 2.12% | 12.098 (12.066-12.105) |

Controls: tx2-dxt1-p2-abl-a-1-off, tx2-dxt1-p2-abl-a-9-off. Each arm: 3420 completed primary commands. Observed differences are diagnostic; recorder effects can interact and host noise is retained.
