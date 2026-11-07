1. **Critical — R4-1: CLOSED as a selection rule.**  
   All eight position cases, including all four falsifiers, are now unconditional; density declarations and allowlists grant no exemption. [ACCEPTANCE.md:2088](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2088)

   I manufactured an all-eight PASS receipt accepted by the structural checker; see finding 4. I did **not** establish that an actual misbehaving allocator passed executable falsifiers: the position case manifest remains TO-AUTHOR.

2. **Major — R4-2: CLOSED.**  
   Native outage tests, stale-fallback rejection and cross-language semantic equivalence remain required, lane-scoped cases. [ACCEPTANCE.md:2075](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2075)

3. **Major — R4-3: CLOSED.**  
   User JSON rejection and lossless number `-0` journaling remain explicitly distinguished, with the paired test selected. [ACCEPTANCE.md:1483](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1483)

4. **Critical — R4-4: PARTIAL. Receipt-shaped assertions still substitute for evidence.**  
   Disputed implementation: `receipt_valid` accepts PASS entries when `objectSha256` merely matches a 64-character hexadecimal pattern. It never opens the objects or checks executed binaries, modes, fault repetitions or verifier evidence. [build_contract.py:1168](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1168)

   My fabricated receipt contained all eight position case names, nonexistent all-zero object hashes and a binary identity different from the claim’s. `receipt_valid` returned **True**. With simulated accepted oracle pins, `admit_claim` returned **QUALIFIED**. An honestly different source-tree label was rejected, but a stale binary under the same source label was not.

   **Current null pins correctly return DIAGNOSTIC.** This becomes a qualification bypass after acceptance. Pending Q41d does not implement the missing validation. **Change:** load and verify retained objects, build/import manifests, freshness and full VA/closure evidence before admission; add these fabricated-receipt counterexamples.

5. **Major — R4-5: CLOSED.**  
   Read-only `--verify` passes byte-identically for all five outputs. Q40 is explicitly recorded-not-compiled in the generated changelog. [ACCEPTANCE.md:19](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:19)

6. **Major — R4-6: CLOSED.**  
   Repository/native/raw routing, derived expressions, aggregates, opaque JSON and explicit conversions now have selected cases and a lexical-order mutant. [ACCEPTANCE.md:1560](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1560)

7. **Major — R4-7: CLOSED.**  
   Exact tuple construction and the Fraction assertion replace contextual rounding. [gen_vectors.py:36](/Users/sam/projects/triplex-db-2/lab/oracles/decimal/gen_vectors.py:36) In-memory regeneration matched the checked-in vectors exactly. The adjacent-values fix is also present; independent acceptance remains correctly blocked.

8. **Critical — R4-8: PARTIAL.**  
   Publication sequences fix content-version reuse; atomic publication state, rollback and crash cases are compiled. [ACCEPTANCE.md:1932](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1932)

   Basis ordering and retirement remain outside the generated contract. Consequently, unchanged-payload reappearance still lacks its required new delivery there. **Change:** compile Q40c/d/h and their cases before domain comparisons. They also need the two corrections below.

9. **Critical — Publication ordering does not guarantee receiver ordering.**  
   Q40d orders evaluations at publication; Q38f gives deliveries unique identities. Neither ensures ordered application at the receiver. [RULINGS.md:232](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:232)

   Publish `(1,1650)`, then `(2,1700)`. Deliver sequence 2 first, then delayed sequence 1. Deduplication accepts both exactly once; the receiver ends at **1650**. This can occur when recovery overlaps new deliveries.

   **Change:** specify receiver-side sequence handling. State projections must never regress; effects requiring every transition need ordered processing with gap recovery. Persist deduplication atomically with receiver state/effect, or require recipient idempotency. Add reversed-arrival and restart cases.

10. **Critical — The atomic unit omits the new basis and retirement state.**  
    Q38f names sequence and latest payload as publication state. Q40d/h introduce last-applied basis and retirement separately. [build_contract.py:1104](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1104), [RULINGS.md:236](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:236)

    Commit newer payload B and its outbox record; crash before durably advancing the basis guard. An intermediate older evaluation can then publish A with a higher sequence. Retirement has the analogous resurrection window.

    **Change:** atomically persist the basis guard, retirement state, sequence, latest payload and outbox records under subject CAS. Advance the guard for empty and unchanged evaluations too. Inject crashes across these transitions.

11. **Major — Claim admission does not require evidence for the claimed comparison.**  
    `admit_claim` checks prerequisite receipts but accepts an NS.P2 claim without any NS.P2 measurement receipt; it also silently discards unknown obligation IDs. [build_contract.py:1188](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1188)

    **Change:** reject unknown IDs and require retained comparison measurements, correctness checks and matched-control evidence appropriate to the claim type.

**NOT READY for generation-2 comparisons.** Minimum: implement evidence-backed admission; compile Q40 with atomic publication and receiver-ordering cases; accept and pin the required oracles and vectors before qualified claims. Diagnostic A0 runs may continue.