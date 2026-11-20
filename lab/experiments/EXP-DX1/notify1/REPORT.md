A wage-floor save records what must be checked alongside the save. The sender can now find the people whose work changed from the saved facts.
The sender follows both links from a person to the state wage floor and checks the facts on both sides of the save.
The whole roster is still checked if a record is missing, a time boundary is crossed, or the smaller set cannot be proved.
The separate sender gateway gives live reads and saves their own gateway. The recipient stores sending progress with the changes it applies.
The last measured rate inside both limits was 46 notices per second on the old gateway. All four lab slots stayed occupied, so the new comparison is still open.
The server forecast is 60–90 notices per second at the release's expected mix if the separate gateway preserves live latency.
That is about 3–5 minutes for 16,500 notices and 31–46 minutes for 165,000. Those times start when the release reaches the front of the queue.
The 21–68 milliseconds measured recording the recipe in a quiet window. The one-second check also needs the actual changed answers and owed entries while the recipient is stopped.

| Review finding | Decision | Fix | Regression test |
| --- | --- | --- | --- |
| 8. Omitted shared floor notice | Accepted | `707f53fe1`, `858fda585`, `7e9a60193`, `dd54f3982` | Both affected people and an unchanged neighbour, on both sides of Publish. A missing posting requires a census. |
| 9. Quiet-window admission | Accepted | `9bdf31958` | Recipe-only, a missing entry, late rows and an elapsed deadline are rejected. |
| 1. Exact reads alone leave durability unproved | Accepted jointly | `9bdf31958` | Read stored outputs, guards and debt independently at the same cut. |
| 11. Expired staged proof | Accepted for archived prototype | `ca4304eb5` | The active notice path needs no release preparation. [Closed stage](../actv-staged/REPORT.md) |

**Shared facts and whole-roster cost**

The ordered selector binds the original event and its predecessor to native edits, release and both clocks. It uses the exclusive maximum of the two floors to seek pay postings and visits both sides of a changed location link. It evaluates candidate work before and after, including retirements. A joined leaf is accepted only if its postings agree with committed source edges. A recent erasure can force replay from the sealed work via the census. The exact member list commits with cursor progress. Warm selectors retain the committed edge index in memory. A cold selector must rebuild it from the native feed.

The declared diagnostic mix uses 16 direct pay saves, a local floor change, a backdated state floor change, a jurisdiction move and a save crossing a scheduled validity boundary. The 40-person memory check certified 19 of 20. The boundary required the census. The cost runner prices both paths against the same offered saves. At 350–550 deep subjects checked per second, one 100k full scan takes an estimated 3–5 minutes. At 1,024 subjects per recipient commit that is 98 commits. The same fixture's ordered path predicts 3,685 affected people and four recipient commits. Both spend four journal edits and two fact edits on the source save and zero source writes during dispatch.

The earlier native release scans give a cost reference of 1.01 seconds and one recipient commit at 1,000 subjects, and 2.95–2.96 seconds and ten at 10,000. They used compact worlds, with only two and five live saves per arm. The actual 1,000- and 10,000-person shared-floor timings, written record counts and effect on live saves remain unmeasured. [Earlier cost evidence](RATE-SHA256SUMS)

**Sending and live latency**

The old 338/s result exceeded the read limit and the fast windows contained five saves each. The longer 46/s deep result met both ratios with 188 matched saves. The earlier slow reads spent most of their time waiting for the gateway's first byte and reported zero pinned-basis waits. DEEPTAIL separately matched 42 of 50 slow deep saves to writer gateway garbage collection and eight to a prior save held by one of those pauses. [Prior measurements](RATE.md)

The new sender uses a separate peer, heap and CPU placement against the same transactor. Recipient batches commit the cursor, ordered effects and deduplication together. Foreground saves still get the existing scheduling opportunity between sender reads. The test requires source position to advance exactly once per foreground commit, so the sender contributes zero writes to W1's queue. The alternating arms are scripted to price both p99s against matched prefixes of at least 500 reads. Native startup and those arms were never admitted. [Rate runner](rate-arm.ts)

The forecast assumes 350–550 checks per second on deep inputs, based on 471 per second with four foreground readers on the earlier Mac test. At 16.5% notice density that implies about 58–91 notices per second. At the earlier deep fixture's 79.9% it implies about 280–440 per second. Pinned reads and gateway service bound this rate. The 14 ms cadence caps a worker at 1,143 checks per second before work. The earlier receiver commit share was 18%. The forecast assumes the release has reached the front of the queue and both p99 ratios stay within 1.5×.

**Joined Publish**

At DX-ACT1 `3d4783226`, shared saves already append a census. Bring `notify1/journal.ts`, `ranges.ts`, `dispatcher.ts`, `census.ts`, `store.ts` and `receiver.ts` from `cad4a60e3` and apply [the joined patch](join-range.patch) from `dd54f3982`. The patched companion ran against an in-memory source and its unmodified Python verifier. The backdated shared floor won the race, Publish retried and the checked index cut selected exactly two people. The third stayed unchanged. The companion's native run remains unverified.

Keep the recipient stopped while taking the one-second cut under live saves. Reopen the exact source scope in a fresh process, bind the command, original assertion, release pair, clocks and census, and decode the activation marker, physical changed values and retirements, guards, and every owed ID, version, payload and sequence from the cut. Compare to the full independent oracle, including unchanged people. Check the recipient position stayed fixed and a normal current-route read sees the winning release. A recipe alone, a late record or a missing entry must fail. [Cut verifier](deadline.ts)

**Server command and evidence**

`DOCKER_HOST=unix:///var/run/docker.sock node --import tsx lab/experiments/EXP-DX1/notify1/bench.ts launch notify-part4-001 isolated 16 14` runs the 1,000-person preflight, shared-floor costs at 1,000 and 100,000, then the 100,000-person deep paired workload on the same server. The plan was checked locally. [Runner](bench.ts)

The 17 memory checks cover full affected and unchanged sets, original transaction bytes and position, release and both clocks. The cost runner pins fresh source and scope, independently folds both cuts and reopens the recipient receipts by ID. The rate reducer checks fresh run and slot identity, raw receipts, pinned bytes, matching offers and oracle effects. The joined snapshot pins both revisions and applies the scoped patch. The acceptance pins and frozen inputs were unchanged. The initial owned slot and volume were removed. Waiting diagnostics closed before startup. No bench server ran. [Part 4 evidence](PART4-SHA256SUMS) · [Prior audit](AUDIT-SHA256SUMS)
