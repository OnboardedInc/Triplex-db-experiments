An eight-fact person added about 6.7 kB of resident memory per eager reader at 100,000 people.
The test driver's compact expected-value model added another 3.1 kB per person.
Both costs arrived during import, even for people nobody subsequently read.
These measurements ran on the 16 GiB guest with synthetic gateway rows and the existing reader and model.
The managed slot uses Datomic dev storage and returned 404 for the current replica route. Its reservation was released.
The cost of these rows in production Postgres and the role-specific JVM cache occupancies still need a matching stack.
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
