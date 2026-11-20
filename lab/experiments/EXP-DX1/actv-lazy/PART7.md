# After the receipt

Publish still commits the release, its source cut and the notice recipe together. A settlement worker reopens that receipt. It writes one bounded page and the matching restart cursor in the same transaction. The value and notice archives use separate native scopes on the same writer. That keeps settlement traffic out of the source feed that ordinary saves have to inspect.

Values are scoped to one immutable receipt. A newer release effective at the same or an earlier business time can stop the unfinished value copy. Any completed old pages remain usable at their original cut. The notice worker finishes every event in order, including one whose value copy became obsolete. It commits addressed notice bytes with its item state and cursor while the recipient is offline. Delivery later uses the same ordered receiver and original replay identities.

The archive reader uses a stored response only at the receipt's exact record and valid-time cut, with the same release, epoch and erasure frontier. It derives from the receipt's pinned source when a page is missing. A subsequent live save takes the ordinary current-read path. Protected inputs need a retention decision before this archive can record them.

Bulk frames carry W1's `activation` or `notice` class on the native claim. The producer uses round-robin turns across ready accounts, live preference, a bounded bulk turn after eight completed live saves, and a duty cycle. Each frame is constrained by an 8 ms W1 estimate and the native row and byte limits. The estimate cannot preempt a submitted database commit. P6 needs observed live and neighbour p99 ratios, including stalls and backlog.

W1 implements its native queue per Datomic connection. The application queue shares admission across the source, archives and neighbour in these trials. A production installation needs the same admission ownership across hosts to preserve the one-in-flight bulk bound.

The six component windows keep the receiver offline and leave the individual notice clock empty. The optional settlement windows price both durable endpoints and report ordinary save and read ratios at 3.5 and 23.5 saves per second. They use a separate account with matched address and stamp saves for the loaded and control windows. The retained W0 source witnesses are unaffected by these two edits. This diagnostic does not replace the frozen interference trace.

## Evidence audit

- `Archive.write/turn/stored/reader` bind the original marker's release, cut, epoch, census and event. The checked native claim covers the exact operation body and predecessor. Reopened pages match a contiguous hash chain and an independent full-roster value comparison. The reader checks the answer's subject, basis and release under the current erasure fence.
- `RecordedNotices.turn/packets/deliver` bind the original event, covered membership, packet chain and native restart cursor. The gate compares every ordered effect with Python before opening the receiver, then checks a repeated delivery has zero new effects.
- `requireCoverage/ownedCommand` refuse durable narrowed coverage without the original owner's native facts. The shared-census regression folds every enrolled subject, including the complement, at the witnessed commit.
- `collect/server/local` bind the source SHA, build, nonce, owner, slot, seeds, exact per-offer native clocks and result bytes. The consumer replays point inputs and recomputes latency. `role-gate` binds each guest observation to the private managed holder and role before comparing the reopened cuts. [Review response](REVIEW2.md)
