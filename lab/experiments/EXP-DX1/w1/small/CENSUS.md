# Datoms and bytes in one field replacement

The Mac SQL slot committed one replacement of one fact and one replacement of three facts. Each had a real preceding write, one command claim and one feed journal. The census reads the durable log at each acknowledged native transaction. Counts below are datoms and value bytes. Ref and scalar bytes use EDN spelling. The exact serialized Datomic log length and disk WAL amplification are separate units.

| Purpose | 1 fact, original | 1 fact, compact | 3 facts, original | 3 facts, compact |
| --- | ---: | ---: | ---: | ---: |
| New business assertion texts | 1 / 258 | 1 / 194 | 3 / 774 | 3 / 582 |
| Retraction of original business texts | 1 / 246 | 1 / 246 | 3 / 771 | 3 / 771 |
| Journal position row | 1 / 284 | 1 / 191 | 1 / 284 | 1 / 191 |
| Journal clock row | 1 / 299 | 1 / 206 | 1 / 299 | 1 / 206 |
| Journal changed subject row | 1 / 308 | 1 / 215 | 1 / 308 | 1 / 215 |
| Journal command ID row | 1 / 298 | 1 / 205 | 1 / 298 | 1 / 205 |
| Journal assertion and retraction entries | 2 / 994 | 2 / 808 | 6 / 3,015 | 6 / 2,457 |
| Datomic transaction instant | 1 / 37 | 1 / 37 | 1 / 37 | 1 / 37 |
| Transaction position and journal position index | 2 / 2 | 2 / 2 | 2 / 2 | 2 / 2 |
| Operation ID | 1 / 13 | 1 / 13 | 1 / 13 | 1 / 13 |
| Transaction ID and new journal entity identity | 2 / 60 | 2 / 60 | 2 / 60 | 2 / 60 |
| Transaction record clock and clock high water | 2 / 34 | 2 / 34 | 2 / 34 | 2 / 34 |
| Transaction-to-journal feed link | 1 / 14 | 1 / 14 | 1 / 14 | 1 / 14 |
| Subject revision add/retract and journal revision add | 3 / 3 | 3 / 3 | 3 / 3 | 3 / 3 |
| Claim command key, transaction ref and transaction ID | 3 / 57 | 3 / 57 | 3 / 57 | 3 / 57 |
| **Total** | **23 / 2,907** | **23 / 2,285** | **31 / 5,969** | **31 / 4,847** |
| Complete uncompressed EDN datom tuples | 4,534 B | 3,880 B | 8,462 B | 7,284 B |

The input fixture's request JSON was 8,139 or 16,767 bytes in either arm. It contains 4,579/9,532 bytes of tagged `rows`, 3,087/6,588 of `rowTexts`, 204/378 of new IDs, 91 of claims, 16 of entity list, 15 of operation ID, 15 of position, span, source and clock/scope values, and 132 of key/framing bytes. The wider 3-fact commit includes six explicit journal changes. This accounts for the difference from the earlier 23-datom average in a fixture with only four journal rows.

The stored prefix already carries the assertion ID, exact valid-time bits, indexed reference and logical recorded position. A journal's owner repeats its transaction ID in this fixture. The compact suffix drops those duplicate columns where equal, omits null columns and the default schema version, and inserts the authoritative record clock in the prepared slots. It retains the original change IDs and every arbitrary change value. The reader expands back to ordinary row text before emitting journal or replica bytes. A retired old row can use its native retract coordinate and the transaction header for its historical retirement; interior grouped cuts and imports can still need explicit markers. The subject revision is the fast CAS witness. The receipt's claim keys and feed links remain indexed because deriving them via a history scan would change lookup cost and fallback behavior.

Pre-existing seeds use ordinary rows alongside new rows. Every gateway reading a mixed scope needs the new decoder. Turning writing off remains safe after the decoder is deployed.
