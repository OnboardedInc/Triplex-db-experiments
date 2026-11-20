# Attempt index

Raw files are under the lab's durable evidence directory at `evidence/DX-HA1/load1`. The manifest paths are relative to that directory.

| Attempt | Revision | Outcome |
|---|---|---|
| `load-live-5e5324c8-5a8c-4393-b029-7c91ffa1fd9e` | `13197ca81` | Five one-database live arms at 50 producer offers per second |
| `load-live-ba302509-3a31-47ca-b078-3eae747fae66` | `1f7fbfce3` | Session stopped, stale attempt reclaimed by exact role ID and nonce |
| `load-live-d0df1520-78a1-49c7-b78b-14f726e36316` | `13197ca81` | Five one-database live arms at 235 producer offers per second |
| `load-live-f352ee39-349e-4742-9a19-8d9e0cd39253` | `13197ca81` | Failed before summary |
| `load-profile-db2a7358-3f67-40d3-81c4-9838d27f4303` | `8b3497d5f` | Missing pinned image preflight |
| `load-profile-f5eb2ff8-50cf-4ab4-abab-ea862d36506f` | `11506feda` | Six staggered trace arms and thirty exact receipt checks |
| `load-quiet-db807e07-9145-438d-933c-d1b708e13162` | `1f7fbfce3` | Ten quiet arms with complete source, feed and physical row checks |
| `tooling-ef0d52687` | `ef0d52687` | Scoped typecheck, adapter tests and independent evidence aggregation |

Run the saved `summarize.py` against the evidence directory to recompute the stage statistics and quiet p99 from raw commands. Candidate p99 counts confirmed samples, while offered counts retain capacity misses. LOAD1 arms with legacy HA1 profile headers recorded more scope slots than they used. The raw live samples name the one resolved Datomic database.
