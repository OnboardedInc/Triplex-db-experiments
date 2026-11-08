# Rulings recorded but not yet compiled (Q38c: RULINGS.md holds only compiled or explicitly listed entries)

These move into RULINGS.md when the contract version that compiles them is built.

## Q51b: EXP-P2X feed lag on XTDB (not compiled in 0.3.8: an experiment direction with no contract effect)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q51b feed lag on XTDB | The next XTDB P2/P3 experiment puts XTDB behind the same host log and broker as EXP-P2Q (EXP-P2B: XTDB as the replica, current and history layer), since that composition measured feed lag p99 12.8-24.5 ms and an ACK independent of the engine. The subject-stamp path stays the XTDB-native arm (A1) to compare against; a separate consumer database through ATTACH is not pursued unless P2B fails. | both engines stay candidates for every layer; fewer moving parts |

## Q70: V-O04e cursor continuations of in-flight reads (O-REPLAY 0.4.4)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70a continuation view | Every `cursorFrom` continuation is answered from the source read's start, scope and prefixes, whether or not the source had commits in flight; a continuation's own readStart is never consulted. | V-O04e F7 |
| Q70b literal token | A literal cursor token equal to a `nextCursor` that a read with commits in flight issued earlier in the same case continues that read per prefix; token bytes and the cursor vectors stay unchanged. Any other literal token keeps today's rule (the query's own read view). | V-O04e F8, fix (b) |

## Q70 additions: what O-REPLAY 0.4.4 left undecided
| Q | Ruling | Basis |
| --- | --- | --- |
| Q70c any issuing read | Q70b extends to every read: a literal cursor token equal to a `nextCursor` issued earlier in the same case by any read, in flight or not, continues that read (its start, scope and prefixes). Only a token no earlier read issued uses the query's own read view. This closes the F7 hole reached through a literal token. | O-REPLAY 0.4.4 author, item 1 |
| Q70d equal tokens | When several earlier reads issued the same token, the continuation follows the latest of them in case order. | 0.4.4 author, item 2 |
| Q70e prefixes without the token | Prefixes whose pages did not issue the token are left out, the same as a prefix with no next cursor under `cursorFrom`. | 0.4.4 author, item 3 |

## Q72: V-P2Q round 2 on f711193 (broker fix round 2)
| Q | Ruling | Basis |
| --- | --- | --- |
| Q72a lock helper | The flock helper runs detached in its own process group, ignores INT, TERM and HUP, and exits only on stdin EOF; when it exits for any reason the log fail-stops (every later append throws), and each append checks the helper is alive. A test kills the helper and Ctrl-Cs the holder's group and shows no second writer. | V-P2Q N1 |
| Q72b answer snapshot | Q67c applies to every broker read surface: a surface that answers in one request reads the marker in that request (a UNION with the marker triple, as pulls do); a surface that needs several requests (Datalog executor, dependencyState, native with awaitBasisMs) compares (incarnation, marker) before and after, and every fence and replay writes a new incarnation first. V-P2Q's live residual test (zero-downtime rewind between the probes) is a regression case. | V-P2Q N2; Q67c |
| Q72c reasons | Rename reasons to the contract's strings now (`basis-not-reached`, `replica-unreachable`). Core tagged errors (Q67h) are required before the broker becomes a default, not for the default-off merge; until then no claim may close an obligation pinned to E-BASIS-NOT-AVAILABLE or E-REPLICA-UNAVAILABLE. | V-P2Q question 5; Q67h |
| Q72d A0 guard | The A0 change with the option off is a correctness fix (main answers a basis above the published position) and stays. The frozen A0 control (Q46b) is re-frozen at the P2Q merge, and every matched comparison names the change. | V-P2Q N3; Q62a |
| Q72e outage replay | The synchronous whole-log replay per outage pull is a blocker for default, not for default-off; it is replaced by the Q58c store (recent_rows or a current index, on R25's design). Probes are coalesced into one in-flight probe per replica in this round. Tests import src through tsx, never dist. | V-P2Q N4, N5, N8 |
| Q72g native in broker mode | Every broker-mode wiring passes `awaitBasisMs: 2000` (the Q58a default) until the core native facade exists; receipts are measured at the claimed head. | V-P2Q N7, m3 |
