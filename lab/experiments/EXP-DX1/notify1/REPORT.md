A shared wage-floor save used to notify one of the two people it affected. The old check accepted that result.
The same save now records the whole roster whenever a smaller list cannot be proved.
The new check asks Python which people changed and which stayed the same. It catches a missing person even in an old stored event.
The 21–68 milliseconds measured saving the recipe in a quiet window. That timing did not include storing individual notices or changed answers.
The old sender spent 78.5 of 97.8 seconds on scheduled breaks. Writing progress and acknowledgements to the live database was the next largest cost.
Moving progress to the recipient and grouping work reached 338 notices per second in short trials, above the agreed read-latency limit.
A longer deep trial before the membership fix sent 46 notices per second within both relative limits.
For an isolated 9,798-notice release, the server estimate is 35–55 per second with a separate read gateway. A steady rate under the new save rule remains open.

| Review finding                                      | Decision                              | Fix commit                                            | Regression test                                                                                                                                |
| --------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 8. Omitted shared-floor notice                      | Accepted                              | `707f53fe1` and `858fda585`                           | Shared local floor, backdated two-hop floor on both sides of Publish, unaffected neighbour, narrowed event refused before dispatch or erasure. |
| 9. Quiet-window admission                           | Accepted                              | `9bdf31958`                                           | Recipe-only, a missing owed entry, elapsed deadline and rows after the captured cut are rejected.                                              |
| 1. DELTA read timing misses durable values and debt | Accepted jointly                      | `9bdf31958` for the guard. DELTA integration pending. | Actual output, guard, and debt data read back at one captured cut.                                                                             |
| 11. Expired staging certificate                     | Accepted for the historical prototype | Archive `ca4304eb5`                                   | No active caller imports staged preparation or activation. [Closed stage](../actv-staged/REPORT.md)                                            |

**Affected membership**

The old code accepted any syntax-valid list of subject IDs. The source and journal save together, but the list lacked proof of the source dependency closure at both the predecessor and committed cuts and both business instants. The new event covers the complete enrolled census. An existing unproved narrowed event stops before cursor advancement or erasure can remove its source evidence. Historical scopes that already advanced past such an event need a separate repair audit.

**Deadline check and companion handoff**

`assertDeadlinePublication` opens the native cut observed within one second. It reads the original activation assertion and published head, then decodes physical changed values, retirements, coverage guards and owed entries. A real save forces the concurrent Publish to retry. With the recipient idle, the test rejects recipe-only, late rows, a missing owed entry and an elapsed deadline. A fresh native process read the complete test layout with evaluation disabled. This checks durable state in a small fixture. A host still needs current-route reads and physical publication verification on its own layout and traffic.

At DX-ACT1 `cff46335b`, `join/account.ts:648–650,714–725` assigns a census to a shared location or jurisdiction edit. The exact wage-floor failure therefore takes the wider path there. The same method passes a narrow owner list for other edits to `Notices.plan`. Bring over `notify1/journal.ts` from `858fda585` and keep the joined activation-only range hook. Port the full-roster check in `verify.ts` and `oracle.py` to the joined reader using its real durable selection. For the deadline use `deadline.ts`'s assertions against joined `physical()` plus actual owed rows. `join/account.ts:457–518` writes output chunks and a notice recipe. It needs physical debt when the release owes notices.

At DELTA `e12105b91`, `solo.ts:257–286` expands two releases after the timed offers. Its timing covers the early read. Move the measurement endpoint to the last durable changed value and owed entry and verify both from the original deadline cut with dispatch disabled. The DELTA writer and public read timing still need that integration.

The alternating arms, per-notice budgets, CPU and queue measurements and server command are preserved with the original traffic evidence. The full-census fallback has a separate cost. At 1.6 unproved saves/s it adds 160,000 subject checks/s on a 100,000-person roster. A worker paced at 16 people per 14 ms nominally checks at most 1,143/s, so that mix grows a backlog. The 35–55/s forecast assumes the release has reached the front of the queue and does not establish a sustained operating point. The additional post-fix timing pair stayed queued. The 1,000-person preflight is a diagnostic before the 100,000-deep-person server pair. [Rate investigation](RATE.md) · [Part 2](PART2.md) · [Rate manifest](RATE-SHA256SUMS)

**Evidence audit**

`verify` binds the original command, assertion bytes and position, event hash chain, epoch, release, clocks and durable census pages before folding the entire independent roster. Python derives the changes and complement. The verifier checks durable selection, effects, ledgers and receiver state. `captureDeadlineCut` binds actual source head and receiver position to the ingress, and `assertDeadlinePublication` matches the original command and assertion, epoch, release and chunk digests at that cut. The 14 native and 14 memory checks completed. Native logs bind the source and exclusive holder. The engine slot and volume were released. The digest audit found zero touched acceptance pins. All checks are experiment diagnostics. [Review evidence](AUDIT-SHA256SUMS)
