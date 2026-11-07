1. **Critical — R3-14: PARTIAL. The five-block allowlist does not prove unchanged behavior.**  
   Disputed rule: density follows from matching five allocator blocks. [build_contract.py:1143](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1143)

   I changed the exported `withTransaction` binding **in memory**, outside those blocks, to allocate an extra position before executing the transaction. All five hashes remained unchanged; `density_proven` returned **True**. The unchecked binding is at [XtdbStorageAdapter.ts:485](/Users/sam/projects/triplex-db-2/packages/xtdb/src/XtdbStorageAdapter.ts:485). Imported clients, transaction context and other callers can also change semantics without changing those hashes.

   Conditional selection itself is fixed. **Change:** restrict the exemption to an exact, independently verified source/build dependency closure, including bindings and configuration. Otherwise require the falsifiers. Add an outside-block mutation fixture.

2. **Major — R3-15: CLOSED.**  
   Native outage coverage, stale-fallback rejection and cross-language recipes bound to one semantic query identity and oracle answer are now selected explicitly. `EP-NATIVE` is present and receipt scope is lane-specific. [ACCEPTANCE.md:2019](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2019) No remaining contract-definition objection to this item.

3. **Major — R3-16: CLOSED.**  
   The guard now applies specifically to user JSON, and the generated obligation requires the paired positive journal test for number `-0` on both engines. [ACCEPTANCE.md:1446](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1446) This reconciles Q30 with AMB-04 and Q14b.

4. **Critical — R3-17: PARTIAL. Claim admission still accepts unsupported qualification.**  
   Disputed implementation: `admit_claim` accepts supplied case names and `compositionBound`, then returns QUALIFIED. It never checks O-REPLAY’s acceptance or pin. [build_contract.py:1179](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1179)

   With the A0 composition, the three dense case names and `compositionBound=True`, it returned **QUALIFIED while O-REPLAY’s pin was null**. The generated claim rule lists position, identity and W0 prerequisites but omits oracle acceptance. [obligations.json:1854](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:1854)

   **Change:** derive prerequisites from validated, source-bound closure evidence rather than supplied names/Booleans. Explicitly enforce Q37b at claim admission, screening included. Add a null-oracle-pin claim rejection fixture.

5. **Major — R3-18: NOT CLOSED in the current snapshot.**  
   `python3 -I -B lab/acceptance/build_contract.py --verify` exits **1**: `obligations.json` and `ACCEPTANCE.md` are not byte-identical. The difference is the current RULINGS hash versus the pinned input, plus the resulting transitive hash. [obligations.json:13](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:13)

   **Change:** freeze the intended ruling set, compile it and regenerate. The verification mechanism exists; its present result fails.

6. **Major — Q35’s key probes do not establish that every decimal operation uses the key.**  
   V3 sorts injected keys; V6 checks key serialization. [ACCEPTANCE.md:1476](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1476), [ACCEPTANCE.md:1505](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1505) Those can pass while an actual query orders QLever’s canonical lexical text, or a derived decimal bypasses encoding.

   **Change:** require channel-routing cases for repository, native and raw decimal comparisons, including derived expressions and aggregate results. Kill a lexical-ORDER-BY mutant. Specify that JSON is opaque unless explicitly converted to a typed decimal; such conversion must validate and encode. SUM must decode and compute exactly, then encode any decimal result used for ordering; summing key strings is invalid.

7. **Major — The new random decimal vectors silently round their source values.**  
   Disputed code: `Decimal(n).scaleb(-s)`. [gen_vectors.py:34](/Users/sam/projects/triplex-db-2/lab/oracles/decimal/gen_vectors.py:34)

   Python’s default decimal precision is 28. Replaying the generator’s draws showed **518 of 2,000** generated values changed before encoding. The resulting input/expected pairs agree with each other, hiding the lost large-value coverage.

   **Change:** construct decimals exactly from integer digits and exponent; assert equality with `Fraction(n, 10**s)`. Regenerate and independently review the vectors. Q37c also remains uncompiled: O-TDK1 is TO-BUILD and its vector pin remains null. [obligations.json:2013](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:2013)

8. **Critical — Q36a can suppress a required return to an earlier payload.**  
   Disputed rules: content version hashes `(release, inputs, payload)`; receiver deduplicates `(id, version)`. [RULINGS.md:188](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:188), [RULINGS.md:196](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:196)

   Concrete sequence: unchanged business facts, activate **R1 → R2 → R1**. The minimum-wage notice changes **1650 → 1700 → 1650**. Returning to R1 restores the original release, rule inputs and payload, hence the original version. Publication detects a changed payload, but receiver deduplication suppresses the final delivery.

   **Change:** distinguish content version from publication occurrence; assign a durable transition identity when the latest published payload changes. Replay retains that occurrence’s identity. Atomically persist publication state with its outbox record, and retain unacknowledged deliveries through crashes. Add rollback, crash-before-delivery and unchanged-activation-during-recovery cases. Compile the clarification’s “never published/latest published” comparison explicitly.

**NOT READY for generation-2 comparisons.** Minimum: close the allocator exemption; enforce oracle-backed claim admission; cover decimal routing and repair/pin vectors; distinguish outbox transitions from content hashes; regenerate consistently. O-REPLAY must be accepted and pinned before qualified comparisons—diagnostic A0 runs may continue.