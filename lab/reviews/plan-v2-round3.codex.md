CLOSED means the generated contract resolves the finding; it does not mean execution passed. Regeneration was checked with all writes intercepted in memory.

1. **Major — R2-2: CLOSED.** “Accounting is not progress” now requires oracle-valid commands to publish, independently justified conflicts, bounded queues and burst recovery. The generated selection includes the progress cases. [ACCEPTANCE.md:2336](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2336)

2. **Critical — R2-6: CLOSED.** GATE-W0 blocks domain-dependent closure until independent review and pinned inputs. Null W0 pins explicitly block. Deferred authorship no longer permits a domain pass. [ACCEPTANCE.md:1187](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1187)

3. **Major — R2-7: CLOSED.** GS.19 now requires “zero duplicate externally visible effects,” explicitly permitting and counting replay attempts. [ACCEPTANCE.md:2565](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2565)

4. **Critical — R2-8: CLOSED.** C6’s whole-journal comparison now substitutes erasure markers on both sides before comparison; the dedicated reproduction obligation covers this. [ACCEPTANCE.md:1749](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1749)

5. **Major — R2-9: CLOSED.** Metadata-only widening requires preserved integer capacity and unchanged order keys; otherwise atomic migration or failure is mandatory. [ACCEPTANCE.md:302](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:302)

6. **Critical — R2-11: CLOSED.** Eligibility now combines prefix completeness, epoch, C1, reconstructability and current erasure knowledge, with generated cases for each. [ACCEPTANCE.md:1958](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1958) The new ACK reversal creates the separate coverage gap in finding 15.

7. **Critical — R2-14: CLOSED.** Positive evaluator fixtures now require CLOSED outcomes alongside negative fixtures, preventing an always-OPEN evaluator from qualifying. [ACCEPTANCE.md:1148](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1148)

8. **Critical — R2-15: PARTIAL.** Coordinates, nested ordinals, resolved prefixes and aborted-offset accounting are compiled. The density exemption remains self-declared, and conditional selection conflicts with the ordinary case list. See finding 14. [ACCEPTANCE.md:1855](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1855)

9. **Critical — R2-16: PARTIAL.** The 10 ms limit, eligibility, measured fallback cost and continued ACKs resolve the original contradictions. Required outage verification still does not cover native-surface fallback equivalence. See finding 15. [ACCEPTANCE.md:1844](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1844)

10. **Critical — R2-17: CLOSED.** Current erasure eligibility, old-cache invalidation, reproduction exceptions and exclusive-key evidence are explicit. [ACCEPTANCE.md:2089](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2089)

11. **Major — R2-18: CLOSED.** Independently reviewed W0 coverage floors now gate domain obligations, including release impact, rule firing, fanout and multiple outputs. [ACCEPTANCE.md:2583](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2583)

12. **Major — R2-19: CLOSED.** Split reads straddle existing frozen commands; the driver adds no writes. Candidate throughput therefore cannot increase the offered write workload. [ACCEPTANCE.md:2327](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:2327)

13. **Major — R2-20: CLOSED.** Legacy vectors have compiled lane-specific rejection outcomes, with in-range coverage assigned separately. They no longer impose native signed-64 acceptance on QLever. [ACCEPTANCE.md:239](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:239)

14. **Critical — Q32e’s dense exemption is forgeable and ambiguously selected.**  
    Disputed text: `if composition.get("positionsDense") is True`. [build_contract.py:997](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:997)

    A non-dense candidate can submit that Boolean. Calling `position_gate_blocks` with it and the three dense cases returns **False**, meaning unblocked. No density-proof validator accompanies the branch. “With its evidence” in the receipt description does not define a mechanically checked proof.

    Meanwhile, the generated obligation still selects `all` plus every falsifier explicitly, contradicting the conditional helper. [ACCEPTANCE.md:1857](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1857)

    **Change:** Make conditional selection authoritative. Grant the exemption only through independently verified, source-bound allocator evidence—initially an exact pinned A0 allowlist. Changed allocators default to non-dense. Add a forged-density rejection fixture.

15. **Major — Q31e forbids stale fallbacks but does not require native outage equivalence tests.**  
    Disputed text: “served by an index eligible for it, else by the fallback.”

    Another lagging fallback is already forbidden by COMPOSITION eligibility. The remaining gap is query equivalence: the ACK/outage obligation tests repository pulls but omits `EP-NATIVE`. [obligations.json:19107](/Users/sam/projects/triplex-db-2/lab/acceptance/obligations.json:19107) Recording a cross-language route does not prove that its replacement query preserves parameters, basis and meaning.

    **Change:** Require outage RYOW cases for each claimed serving surface, including stale fallback rejection and an equivalent cross-language recipe where used. Bind both recipes to one semantic query identity and expected answer. Keep total request latency and language attribution.

16. **Major — Q30 needs an explicit journal boundary.**  
    Disputed text: JSON containing `-0` “at any depth” fails every qualified write route. [ACCEPTANCE.md:1319](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:1319)

    Ordinary JSON rejection and number-assertion preservation are compatible in principle. The current journal embeds `triple.value` inside a change and writes that change as a **JSON-valued assertion**. [transactionMetadata.ts:20](/Users/sam/projects/triplex-db-2/packages/core/src/store/transactionMetadata.ts:20), [transactionMetadata.ts:55](/Users/sam/projects/triplex-db-2/packages/core/src/store/transactionMetadata.ts:55) An unrestricted recursive guard therefore rejects the journal of an otherwise valid number `-0` assertion, contradicting AMB-04.

    Q14b itself is consistent: identity equality does not authorize changing the stored representation.

    **Change:** Distinguish user JSON validation from lossless typed journal encoding. Require a paired test: user JSON `-0` rejects; number `-0` commits, journals, replays and reads back bit-exactly.

17. **Major — Comparative screening bypasses the mechanically attached gates.**  
    Screening receipts explicitly support candidate comparisons while never passing VA. [ACCEPTANCE.md:617](/Users/sam/projects/triplex-db-2/lab/acceptance/ACCEPTANCE.md:617) Position gates are attached to NS/GS **closure**, leaving ordinary screening comparisons outside that mechanism. [build_contract.py:1779](/Users/sam/projects/triplex-db-2/lab/acceptance/build_contract.py:1779)

    **Change:** Validate position and applicable W0 prerequisites when admitting comparative or promotion claims, including screening claims. Failed or pending prerequisites may produce diagnostics, never a qualified winner.

18. **Major — The checked-in generation is already stale.**  
    Regeneration matches three outputs; `obligations.json` and ACCEPTANCE differ because the current RULINGS hash differs from their pinned input, changing the transitive hash. RULINGS now also contains Q33. [RULINGS.md:150](/Users/sam/projects/triplex-db-2/lab/acceptance/RULINGS.md:150)

    **Change:** Reconcile the intended ruling set, regenerate and verify exact output equality before issuing receipts.

**NOT READY for generation-2 comparisons.** Minimum changes: authenticate density and reconcile selection; require native fallback-equivalence coverage; define the JSON/journal boundary; enforce prerequisites on comparative screening; regenerate a consistent contract snapshot.