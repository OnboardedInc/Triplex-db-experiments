# Local evidence and receipt audit

The files below are relative to the durable Triplex lab vault's `evidence/DX-HASYNC1` directory. `SHA256SUMS` covers the retained raw files. The runs used separate PostgreSQL volumes and Datomic Pro 1.0.7745 inside one Mac VM. The counts and clocks are diagnostic evidence for Priority 9.

| Attempt prefix               | Revision    | Stage                                                                                                       |
| ---------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| `hasync-smoke-7404da3d`      | `609b8245b` | The source seal rejected the terminal receipt after detecting edits. Role states and cleanup were retained. |
| `hasync-smoke-c4680cdb`      | `72a60d044` | Source-bound recovery smoke. 17.14 s to the new write.                                                      |
| `hasync-commit-61a547e8`     | `72a60d044` | Mid-commit log pointer update.                                                                              |
| `hasync-ack-0721e2bd`        | `72a60d044` | Durable original reply deliberately withheld from the client.                                               |
| `hasync-index-4f952505`      | `72a60d044` | Index segment write held by an observed PostgreSQL lock.                                                    |
| `hasync-import-3f9de3b3`     | `72a60d044` | One 2,000-fact commit held at the log pointer.                                                              |
| `hasync-cut-wal-71b247fd`    | `72a60d044` | WAL dropped in the primary-to-standby direction.                                                            |
| `hasync-cut-wal-6bd66acc`    | `8553fed4a` | WAL-cut rerun with the new survivor check. 11.30 s, nine earlier receipts and 126 pinned reads.             |
| `hasync-cut-reply-774dd66e`  | `72a60d044` | Replies dropped in the standby-to-primary direction.                                                        |
| `hasync-restart-e6ade5f2`    | `72a60d044` | Both exact fenced roles refused a fresh startup.                                                            |
| `hasync-cost-plain-f9a361f8` | `72a60d044` | 1,536 checked saves across matched local/remote flush blocks.                                               |
| `hasync-cost-group-3133c55c` | `8553fed4a` | 1,536 checked saves with W1 grouping enabled.                                                               |
| `hasync-move-4b838b84`       | `8553fed4a` | Live copy, planned fence, promotion, rewind and two-copy writes.                                            |

## Where the code publishes outcomes

- The supervisor seals ingress, verifies the exact stopped process IDs and startup latch, then requires the original cluster and timeline, confirmed WAL floor and new timeline. The independent adapter checks a fresh challenge and reads back reboot-safe isolation for the same owner. Its test used a stub. [Supervisor](supervisor.ts) · [Pair](pair.ts) · [Independent adapter](power-fence.ts) · [Ingress](ingress.ts)
- Smoke and fault trials require actual fault evidence tied to the current operation and container. They verify earlier receipts, reject duplicate or reordered feed entries, resolve the same ambiguous operation, check fault witness values with O-REPLAY and repeat each returned witness cut after promotion. [Faults](faults.ts) · [Smoke](smoke.ts) · [Oracle binding](replay.ts) · [Link counters](wal-link.ts)
- The cost driver reads back each requested durability mode, validates every operation and exact row on B after replay, and checks the native grouping multiplicity and actual request depth. Each block's raw observations remain in its current attempt directory. [Cost](cost.ts)
- The move driver binds the final source flush and old pins to the promoted cluster. It requires a newly rewound standby identity, the existing cluster ID, a fresh new receipt and a confirmed remote flush, then reconciles original receipts and feed. [Move](move.ts)
- Seeding checks canonical counts, every seed receipt, the physical manifest and the original database basis. The campaign binds each fresh stage to its seed manifest and receipt ledger. The collector verifies transferred bytes, campaign and source IDs, stage timings, population size and ownership cleanup. The two-server path was typechecked, with hardware execution pending. [Seed](seed.ts) · [Campaign](campaign.ts) · [Collector](../ha1/control.ts)
- The attempt runner binds the nonce, revision, input hashes, mounted gateway bytes, builds, slot and actual images and containers. It checks ownership cleanup and a fresh source seal before recording a terminal observation. [Attempt runner](../ha1/run.ts)

The broader O-REPLAY suite ran 384 tests and reported three failures in unchanged inputs. They concern the Datomic lane coverage entry, the retained `E-UNAVAILABLE-CUT` entry, and the HAM reference source hash. The witness replay checks in the seven named fault drills completed. No frozen acceptance inputs changed.
Part 2 edited checkpoints bind the seed attempt, source, slot, size, PostgreSQL system identity, a verified physical backup manifest, Datomic basis and the immutable receipt ledger. The old and current status rows are compared byte-for-byte at their original logical and physical cuts before and after the fault. Deep read assertions bind the subject, expected typed values and exact basis to each offer.
