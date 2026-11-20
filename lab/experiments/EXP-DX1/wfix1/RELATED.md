# Retry and retraction audit

| Path | Frozen branch head | Check |
| --- | --- | --- |
| Import loader | `c5cb9553b` | `load1/snapshot.ts:228–255` checks saved frames first and resolves any tagged or thrown write failure with its original command. The adaptive checkpoint test loses the reply, advances the destination and recovers the same tuple and assertion digest. |
| Joined Publish | `1f1d371ae` | `actv-lazy/join/account.ts:383–435` resolves the command before the mutable plan and again after a failed plan. The test covers an already committed command and a winner appearing between the first lookup and the stale valid-time check. |
| Notice sender | `172ca4a8f` | `notify1/journal.ts:225–237` resolves the command before checking the live tail. `notify1/store.ts:145–164` reads the original after a serial rejection. The test confirms both return the same receipt after the tail advances. |

No additional identity-order defect reproduced in these three paths. The ordered receiver also looks up the original before checking progress and repeats that lookup if the cursor has moved. The lazy acknowledgement verifies the scope generation, which the source writes only at its first position.

The separate Datomic layout replay's shape C spliced change times from the offer and skipped the predecessor check for retractions. The altered row in the staged native test compares shape C with the serialized reference on the same pinned database. The candidate gives the splicer the writer's canonical change and retains its checked predecessor. Its red and green runs are still queued.

The live journal and packed journal reader use committed rows. The packed reader resolves business references from stored history. The three named paths consume these feeds and do not encode their own transaction changes. PREP1 and INT1 use the separate prepared writer. Its stamping and guard changes are in [the integration recipe](PORTS.md).

Run the three TypeScript cases with `WFIX1_RELATED_STAGE` pointing to the frozen exports in subdirectories `load`, `join` and `notice`, using `node --import tsx --test related-paths.test.mjs`. Build the public core and Datomic packages from the joined branch. The fixtures supply controlled storage outcomes to exercise recovery across a known precondition change.
