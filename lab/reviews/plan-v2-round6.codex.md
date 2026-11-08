1. **Critical — R5-4: PARTIAL. Admission hashes objects but still trusts their meaning.**  
   `evidence_ok` checks manifest labels and object hashes, without validating the binary object, verifier-record contents or case verdicts against retained results. [build_contract.py:1229](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1229)

   With the **actual accepted pins**, my in-memory receipt set returned **QUALIFIED** despite:
   - No retained binary or imported-module bytes.
   - A verifier object containing `{"notAVerifierRecord":true}`.
   - Case objects containing `oracleExit: 2` and `X-NOT-MODELED`, labelled PASS.

   **Change:** validate the complete object graph and record schemas, bind executed modules through verified build evidence, and recompute case/closure verdicts. EXP-E01 remains a brief, not an implemented admission command. [BRIEF.md:9](/Users/sam/projects/triplex-db-2/lab/experiments/EXP-E01-claim-evaluator/BRIEF.md:9)

2. **Critical — R5-8: CLOSED at the contract-definition level.**  
   Publication sequencing now includes basis ordering, retirement/reappearance, rollback, recovery and rejection of preview/audit publication. These are required cases. [ACCEPTANCE.md:1990](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1990) Execution remains gated on W0/O-DOMAIN.

3. **Critical — R5-9: CLOSED.**  
   Receiver high-water marks, ordered effect processing, gap recovery, atomic deduplication, reversed arrivals, restart and snapshot-seeded late starts are compiled. [ACCEPTANCE.md:2000](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2000)

4. **Critical — R5-10: CLOSED.**  
   The atomic unit now includes the basis guard, retirement, sequence, latest payload and outbox records under subject CAS. All ten transition pairs and empty/unchanged guard advancement are selected. [ACCEPTANCE.md:2010](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2010)

5. **Major — R5-11: PARTIAL. Measurement presence is checked; a matched comparison is not established.**  
   Unknown IDs are rejected and own/control receipts are required. However, absent trace and window fields match through `None == None`; A0 identity still comes from the claimant. [build_contract.py:1268](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1268)

   My accepted claim had neither trace nor window. **Change:** require nonempty, validated workload identities and measurement contents; obtain A0 from the frozen registry, as pending Q46b specifies. Candidate-selected controls cannot qualify a comparison.

6. **Critical — The oracle scope misses indirect refusals.**  
   F2’s direct exclusion is correct. The “106 closable” classification is insufficient for cases reached through broader selections.

   I supplied two schema releases changing one decimal attribute from `(5,2)` to `(6,3)`. The pinned oracle refused with `X-NOT-MODELED`. [entities.py:58](/Users/sam/projects/triplex-db-2/lab/oracles/replay/entities.py:58) Nevertheless, `oracle_scope` classifies both `G7.migration.schema-evolution` and `G1.types.storage-widening-safe` as closable: refusal matching recognises named CS-DECIMAL cases, not equivalent cases under CS-MIGRATION/CS-WIDEN. [build_contract.py:1338](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1338)

   Combined with finding 1, a migration claim containing the retained refusal qualified. **Change:** resolve pinned manifests and case contents, propagate unsupported-rule dependencies through indirect selections, and reject every actual refusal before qualification. The scope list cannot substitute for executing and judging the oracle.

7. **Major — Verification currently fails.**  
   Read-only `--verify` reports:

   `CONTRACT INVALID: RULINGS-PENDING.md still holds ruling rows`

   The validator prohibits every pending ruling row, including the explicitly pending Q46. [build_contract.py:3257](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:3257)

   **Change:** distinguish recorded pending rulings from compiled authority, then regenerate and verify. Pending Q46 must neither invalidate generation merely by existing nor silently acquire contract authority.

**NOT READY for generation-2 comparisons, even once A0 runs exist.** Minimum: finish and wire evidence-backed admission; enforce genuine matched controls; make oracle refusal handling case-resolved; reconcile pending-ruling validation and verify. Keep domain and decimal claims blocked until their respective reviewed pins are available.