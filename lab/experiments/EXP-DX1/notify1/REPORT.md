A shared wage-floor save used to notify one of the two people it affected. The old check accepted that result.
The same save now records the whole roster whenever a smaller list cannot be proved.
The new check asks Python which people changed and which stayed the same. It catches a missing person even in an old stored event.
The 21–68 milliseconds measured saving the recipe in a quiet window. That timing did not include storing individual notices or changed answers.
The old sender spent 78.5 of 97.8 seconds on scheduled breaks. Writing progress and acknowledgements to the live database was the next largest cost.
Moving progress to the recipient and grouping work reached 338 notices per second in short trials, above the agreed read-latency limit.
The longer deep trial sent 46 notices per second within both relative limits. The deep-workload server forecast is 35–55 per second at 9,798 notices.
Only Mac measurements exist. The server forecast assumes foreground readers have a separate gateway.

| Review finding                                      | Decision                              | Fix                                                                                     | Regression test                                                                                                     |
| --------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 8. Omitted shared-floor notice                      | Accepted                              | Census on unproved saves in `Notices.plan` and full independent coverage in `verify`    | Shared local floor, backdated two-hop floor on both sides of Publish, unaffected neighbour, narrowed event refused. |
| 9. Quiet-window admission                           | Accepted                              | Label the historical timing and require a physical publication snapshot at the deadline | In progress.                                                                                                        |
| 1. DELTA read timing misses durable values and debt | Accepted jointly                      | Separate the read clock from the last durable output and owed record                    | In progress.                                                                                                        |
| 11. Expired staging certificate                     | Accepted for the historical prototype | Archived. The active notice path uses no staged certificate.                            | Scope inspection. [Closed stage](../actv-staged/REPORT.md)                                                          |

**Affected membership**

The old code accepted any syntax-valid list of subject IDs. The source and journal save together, but the list lacked proof of the source dependency closure at both the predecessor and committed cuts and both business instants. The new event covers the complete enrolled census. An existing unproved narrowed event stops before cursor advancement. Historical scopes that already advanced past such an event need a separate repair audit.

The alternating arms, per-notice budgets, CPU and queue measurements and server command are preserved with the original traffic evidence. The full-census save fallback can add work beyond those timings. The 1,000-person preflight is a diagnostic before the 100,000-deep-person server pair. [Rate investigation](RATE.md) · [Part 2](PART2.md) · [Rate manifest](RATE-SHA256SUMS)

**Evidence audit**

`verify` binds the original command, assertion bytes and position, event hash chain, epoch, release, clocks and durable census pages before folding the entire independent roster. Python derives the changed items including retirements and the complement. The verifier checks the durable selection, effects, ledgers and receiver state. The regression uses a committed source event, both clocks and an unaffected member. All checks are experiment diagnostics.
