# Overnight bench predictions, November 19–20

| Item and time recorded (UTC) | Prediction made before execution | Observed |
| --- | --- | --- |
| 0 · 23:59–00:01 | One deep account of 100,000 people, 64 live readers. I expect about 0.9 s from Publish to the first correct read, durable logical changes by then, and about 90 s to finish broad-release dispatch. The 10k loaded p99 was 0.843 s and its durable recipe used six writes. Dispatch still traverses the changed roster. The published launcher currently accepts only ten pooled accounts. | Pending |
| 1 · 00:05 | My first estimate was 180/330 saves/s and 1.7× grouped quiet p99. Before launch, PRED-QUEUE’s matched nine-neighbor forecast narrowed the rates to 150–200 individual and 205–285 grouped. I expect 180/245 saves/s and quiet ratios of 20×/3×. The 330/s busy-interval rate excludes idle and drain time. | Pending |
| 2 · 00:05 | I expect about 1,200 imported current facts/s at the fastest setting that holds neighboring read and commit p99 within 1.5×. The isolated seed delivered 4,670/s with much larger batches. The live VM import reached 556/s, and PRED-LOAD found material setup and per-fact work. | Pending |
| 3 · 00:05 | I expect the thin range check to save about one SQL read per primary at the serial point and less than 2 ms of median ACK latency. W1 measured substantial variability in physical reads and only a small identity-check component in its warm sample. | Pending |
| 4 · 00:05 | I expect 70 s for page guards and 320 s for individual guards on the standard 100k release with two evaluators. ACT1 projected 61–78 s from the smaller runs. | Pending |
| 5 · 00:05 | I expect about 200 read-gateway and 430 write-gateway resident bytes per untouched thin person at 1M, with more pressure at 4M. INT1 measured 209 and 434 at 100k. I expect person-cache bytes for untouched people to remain zero at 2% active. | Pending |
