# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q73: EXP-D01b-112 readings for W0-1.1.3
| Q | Ruling | Basis |
| --- | --- | --- |
| Q73a deep writes | A publish or receive payload of any nesting depth is copied and written exactly (A13 applies to the writer as well as the reader). W0-1.1.3 adds a synthetic publish case with a payload of 20,000 nested arrays, delivered and stored unchanged. | EXP-D01b-112 SPEC-AMBIGUITY 1 |
| Q73b waiting at done + 1 | An inconsistent receiver snapshot with a waiting entry at done + 1 is kept as given (A15); an arriving seq equal to that entry is a duplicate, so the entry is never released. W0-1.1.3 adds a synthetic receive case: state {done 2, waiting [seq 3]}, deliveries [seq 3, seq 5]; projection applies 3 and 5, effects apply nothing, waiting [3, 5]. | EXP-D01b-112 SPEC-AMBIGUITY 2; A15 |

## Q78: lane D (Datomic) design decisions (R29)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q78e erasure and tenancy | Erasure is crypto-shredding first and excision of ciphertext second (batched, since excision is heavy); tenant isolation is one database per tenant. Whether a shared dev storage file satisfies storage-layer isolation, and whether dev storage is acceptable for final acceptance, are Sam's calls (pending). | R29 open questions |

## Q81: E01 delta check (round 3)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q81b counter, every request kind | Q77c applies to every request kind: an HTTP GET (or any method) the QLever counter does not positively classify as a read counts as a write; after a pgwire parser exception the connection's remaining traffic is counted as writes (or the connection refused) and survives tally resets. | CX-VC8-2 |
| Q81c default-off is byte-identical | An option that is off by default leaves every public client contract unchanged: J01's text-array binding becomes an explicit parameter descriptor used only by compact guards; untagged arrays keep their existing JSON handling; a differential public-client test with the option off proves it. The compact-on qualification (G1 off and on, each lane, receipts binding the encoding) runs on an exclusive slot before compact-on is used anywhere. | CX-VJ01 F1, F2 |

## Q86: R28 isolation for the executing gate (EXP-G03)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q86g VM hardening (Sam) | Narrowing the triplex2 VM's mounts (H1: today colima mounts $HOME writable, so every Docker socket holder can write anywhere in Sam's home) and blocking outbound traffic from tx2 containers (H2; today the VM reaches every Mac 127.0.0.1 service including ports 15442 and 17019) change the VM's security settings and wait for Sam. Until then R1, R4, D1, D2, D3, L1 and N1-N4 stay on the named unprotected list. | R28 decision 1 |
