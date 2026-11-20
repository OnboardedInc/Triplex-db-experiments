# DX-HA1 · More small import frames in flight

At the 128-fact cap, server frames took 21.84 ms on average. Datomic applied the frame in 4.08 ms and the writer held its turn for about 11 ms.
Several small frames can prepare and collect receipts at once. Only one import frame may hold the writer's turn, and ready saves go first.
The first two server arms are 16 facts with two in flight, then 24 with two. The forecasts are 3,040 and 3,600 queryable facts per second.
The forecasts still put quiet reads outside the 1.5× allowance. The single-server run will check every account against two fresh controls.
The Mac verified 13,936 facts, reached four and eight frames in flight, and checked order, original receipts and restart. Mac timings are diagnostic.
Earlier results and the sustained import check are in [part 5](PART5.md).

## Evidence and predictions

- The archived means sum to 21.84 ms across 4,943 frame matches. The 8 ms required at 24 facts is a target. The [stage split and forecasts](PREDICTIONS-PART6.md) describe how to falsify the model.
- The client counts every frame through the durable checkpoint. Pressure from two pending live saves halves the window, and four reduce it to one. The gateway schedules ready live saves ahead of queued bulk requests. It releases a bulk turn only when its peer future resolves.
- A cluster-side predecessor check refuses a suffix whose earlier frame has no committed claim. Durable frame identity combines the source, scope, width and ordinal with the exact original content. Client checkpoint replay looks up each original receipt.
- [Evidence and receipt audit](EVIDENCE6.md) · [Archived measurements and checksum](SHA256SUMS.part6)
