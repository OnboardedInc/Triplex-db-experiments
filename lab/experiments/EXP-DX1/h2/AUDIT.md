# DX-H2 receipt audit (diagnostic only)

No scorecard PASS, contract revision or acceptance receipt is issued.

| Producer | Content checked | Freshness | Binding |
| --- | --- | --- | --- |
| `w0-driver.ts` G0 / `w0-fingerprint.ts` | Full world and R2 digests equal freshly invoked population O-DOMAIN; counts match store | Fresh scope, seed and reader in the current attempt | Scope, endpoint, seed basis, N, source hashes, oracle source hashes |
| `w0-driver.ts` G1/G2 | Every pinned world equals its pre-mutation preview; every output byte equals independent reconcile | Preview and evaluation produced during this attempt | Same page's exact subject list and position/valid-time basis, release hash |
| G3 | At least ceil(N/100) retroactive mutations change oracle flags and are positively seen at head; G1 covers their pinned outputs | New ACKs after capture | Receipt positions strictly greater than captured basis, witness subjects retained |
| G4/G7 / `sweep.ts` | Unique complete subject/page coverage, every output basis exact, eligible snapshot and stable epoch; completed cursor no-op | Workers and cursor created for attempt | Cursor binds scope, basis, sweep ID, release/activation hashes, ordered subject-list hash |
| G5 / `w0-outbox.ts` | Delivery bytes equal independent O-DOMAIN publish fold, no duplicate delivery IDs/sequences; state and deliveries committed atomically | Fresh command IDs in fresh scope | Hash of actual evaluation records is outbox command ID; ACK precedes cursor |
| G9 | Counts read independently from storage equal actual feed assertion/retirement fold | After traffic and sweep stop | Same scope, monotonic feed traversal; rejects missing counts |
| `w0-live.ts` | Failed readers/writers fail the attempt; offers/ACKs/corrections/duplicates/lost ACKs retained | Raw samples from active arm | Scope, arm ID, frozen generator/trace digest, absolute offer/ACK/read times |
| Timing and ratios | Actual wall clocks and HTTP Agent requests; finite quantiles with explicit null for empty samples | Per-page async context and current traffic samples | Sources hashed at start and rechecked at end; stack receipt/command file retained separately |

Limits: the existing G4 is PARTIAL (no live abrupt-stop cycles), G6 NOT-RUN, G8 missing. G5 checks the existing ACK/returned-delivery path; it does not add a new independent readback of every committed outbox row. The latency pair is diagnostic: evolving store, no clone/A-A calibration, current-position uniform readers rather than the complete TARGETS read mix. This is never converted into a P5 acceptance PASS.

`w0-journal.ts` additionally enumerates identities from ACKs in this private fresh scope, requires dense observed positions 1..source head (otherwise refuses), and point-reads every requested stored public `Triples.transaction` record. Each record must match its recorded transaction ID and position and carry changes. No count is folded from ACK payloads. The engine test compares every returned journal page byte-for-byte with the old public `transactions` route on a 50-subject seed that fits its cap; the 200-subject failure of the old route is retained separately.

`w0-claims.ts` uses the exported `DatomicClient.claim(db, commandId, position)` to read the real stored command claim at a captured source head, then public `Triples.transaction` to verify the stored transaction ID, command ID and eligible position. No ACK cache resolves lost ACKs. The small-store engine gate compares present and absent command lookups byte-for-byte with public `transactionByCommand` before the larger activation. This W0-only workaround avoids that method's whole-fact scan without changing packages.
