Round 7 of the plan-v2 review, same conversation. Stay adversarial and read-only: do not edit any file.

Since round 6 I accepted all seven findings as Q47a-d, and contract 0.3.7 compiles Q46 to Q49 (`python3 -I lab/acceptance/build_contract.py
--verify`; changelog in ACCEPTANCE.md section 0; 153 obligations). Q50 to Q53 are now rows in lab/acceptance/RULINGS-PENDING.md, which Q47d
allows (listed, no authority). Other changes in the evidence base:
- W0-1.1.1 is merged and pinned ACCEPTED in the contract; O-DOMAIN, an independent implementation, reproduced all 87 cases and the 100k
  fingerprint (branch exp/D01c-o-domain 276a280, not merged, under review), and the contract keeps its fingerprint pin null.
- O-REPLAY stays pinned at 8cc2c26; 0.4.1 (exp/O04-oracle-erasure a9c1327) models erasure and is under re-verification (`nextPin`).
- Two commit-path experiments reported (lab/experiments/EXP-P2Q-qlever-log-broker/REPORT.md, lab/experiments/EXP-P2X-xtdb-commit-feed/REPORT.md).
  EXP-P2Q makes a host log plus broker the source of truth and QLever a replica; Q51b proposes the same composition for XTDB.

Attack, in this order:
1. Round-6 items 1, 5, 6, 7: CLOSED, PARTIAL or NOT CLOSED in the generated contract, with file:line evidence. For item 1 build a receipt set
   that passes `open_record` and `case_verdict` without the evidence existing (or show none can); for item 5 try to qualify a comparison
   whose control is not the registered A0; for item 6 find any selection that reaches an unmodeled rule and still closes.
2. Q47d: can a pending row (Q50 to Q53) gain authority anywhere in generation, admission or closure?
3. The broker composition: does the contract judge a composition whose source of truth is a host log and whose engine is a replica
   correctly for P2 (ACK after the source's durable publication, Q31e), read-your-own-write by routing (overlay, fallback to the log), and
   P3 (lag from durable publication)? Name any obligation that such a composition could pass while serving a stale read as current, or
   fail for a reason that is not a defect.
4. Domain claims: confirm that every W0-dependent obligation stays DIAGNOSTIC while the O-DOMAIN fingerprint pin is null, and that pinning it
   later cannot be done by a claimant.
5. Anything else that would let generation 2 make a comparative or promotion claim the evidence does not support.

End with READY or NOT READY for generation-2 comparisons, and the minimum changes if NOT READY.
