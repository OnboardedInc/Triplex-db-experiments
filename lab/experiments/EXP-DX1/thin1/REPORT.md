An eight-fact person added about 6.7 kB of resident memory per eager reader at 100,000 people.
The test driver's compact expected-value model added another 3.1 kB per person.
Both costs arrived during import, even for people nobody subsequently read.
These measurements ran on the 16 GiB guest with synthetic gateway rows and the existing reader and model.
Two exclusive managed slots now run Postgres, the transactor and separate read and write gateways.
The 10k native control added 23.6 MB to Postgres tables and indexes during seed. All 10,000 outbox states matched on readback.
Single-machine population capacity remains unmeasured.
North star priorities are pinned reads, current values and activation. All timings here are busy-host diagnostics.

| Existing component, incremental bytes/person (bytes/fact) | 10k seed only | 10k after 2% touched | 100k seed only | 100k after 2% touched |
| --- | ---: | ---: | ---: | ---: |
| Reader RSS | 10,856 (1,357) | 10,869 (1,355) | 6,668 (833) | 6,695 (835) |
| Reader JS heap, includes maps | 2,683 (335) | 2,699 (337) | 1,708 (214) | 1,731 (216) |
| Reader packed current rows | 1,232 (154) | 1,236 (154) | 1,239 (155) | 1,243 (155) |
| Reader shared lookup table | 250 (31) | same seed base | 240 (30) | same seed base |
| Reader accounted history | 0 | 23 (3) | 0 | 23 (3) |
| Compact driver model RSS | 3,985 (498) | 3,999 (499) | 3,104 (388) | 3,145 (392) |
| Read gateway / write gateway / transactor object cache / Postgres disk | unmeasured | unmeasured | unmeasured | unmeasured |

Post-GC RSS is relative to the same fresh process before seeding. Component rows overlap. Seed denominators are 80k/800k facts, followed by one new fact for each of 200/2,000 active people. The driver model ran separately. Each subject has three owned answers.

Use the Datomic `reach-touched` composition with the gateway read path. Its per-reader replica starts on first demand and follows journal identities. Historical or unproven cuts use exact gateway reads. Activation has explicit `full` and `dependencies` modes.
W0 R2 orders a background check for a person with no status. A certified import still publishes that person's exact record. The shortcut saves the world read.

**Evidence audit**

- Component profiles use fresh processes, exclusive output files, guest boot IDs and exact source/build hashes. RSS includes runtime overhead.
- Reader admission checks page content, reachable closure, cut and live generation. Only contiguous applied transactions can advance history. Pinned-read checks compare every public field to command intent and assigned receipt IDs.
- Feed and roster replay compare every transaction to the intent log and its content hash, scoped to the fresh run, slot and inputs. SQLite commits the certificate, first possible change and cursor together.
- Activation checks release bytes, pinned cut, ordered roster count/hash and returned subject. The driver hashes actual publication records after closing them. O-DOMAIN reconstructs the original worlds independently.
- Frozen O-REPLAY uses a new case/output directory and checks the case digest, receipt consistency and results for every requested entity, including empty roots. Completed results require both oracle checks.

The native benchmark queue runs 1M then 4M in distinct stacks. It records RSS by process, Postgres sizes, gateway cache gauges, durable receipts and all outbox states. The first 100k guest wire run checked 13,000 reads and 100,000 independent release records per arm.
