Round 8 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

Since round 7 I accepted all five open findings as Q55a-e. Contracts 0.3.8 and 0.3.9 compile Q50 to Q62 (`python3 -I
lab/acceptance/build_contract.py --verify`; changelogs in ACCEPTANCE.md section 0; 157 obligations); Q57, Q63, Q64 and Q65 are pending rows in
lab/acceptance/RULINGS-PENDING.md. The lab's claim evaluator now exists: `lab/bin/claim.mjs` on branch exp/E01-claim-evaluator (head e2a082e;
`git show e2a082e:lab/bin/claim.mjs`), whose `qualify` builds both sides itself, resolves cases from pinned manifests, runs pinned oracle bytes,
and always adds GATE-NOT-RUN because no executing gate exists yet. Other evidence: V-P2Q REJECTED the QLever broker (lab/verify/P2Q/VERIFY.md);
its fix round is exp/P2Q-qlever-log-broker f711193 (REPORT section "Fix round Q62a"), under re-verification; PAIR-0 (lab/research/R22-
noise-robust-benchmarking.md, Q60) is compiled as provisional NS closure rules.

Attack, in this order:
1. Round-7 findings 1, 2, 5, 6, 7: CLOSED, PARTIAL or NOT CLOSED in the generated contract and in claim.mjs, with file:line evidence. For 1 and 2,
   try to reach QUALIFIED in the reference model or in claim.mjs without the evidence existing, including through the 0.3.9 fields
   (oracleRunners, oracleAnswerRule, caseManifest, buildSpec, imagePins, A0 measuredBy, VERIFIER_REGISTRY).
2. claim.mjs itself: any way a candidate's own code, build script, archive attributes, environment or the offline executor can influence its
   verdict or the A0 control's.
3. Read surfaces under the broker fix round: do the per-surface rules (Q55b-d, Q58a, Q58d) and the fix round's typed errors (which keep `_tag:
   "ReadError"` with a `reason`) let a composition pass while serving a stale answer as current, or fail for a reason that is not a defect?
4. PAIR-0 closure: can a CR-NS claim close from a noisy window, from a duet whose arms differ in regime, or with a committed-only histogram?
5. Anything else that would let generation 2 make a comparative or promotion claim the evidence does not support.

End with READY or NOT READY for generation-2 comparisons, and the minimum changes if NOT READY.
