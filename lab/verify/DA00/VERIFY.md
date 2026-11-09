# V-DA00: lane D bring-up review

## CX-VDA00 (Codex reviewer at high) on exp/DA00-datomic-bringup 702643f: FIX-FIRST (saved by the orchestrator, 2026-11-08 22:32Z)
Evidence: verify/DA00 d393484 (lab/verify/DA00/VERIFY.md there). G0 passed on all three lanes; scratch databases deleted; live park and
restart not rerun (the resident was in use by DA01).
- F1 (P1): a concurrent database create can reset a scope position that has already advanced (7 to 0).
- F2 (P1): create and delete reject every scope the public Triplex constructor makes.
- F3 (P2): a reused image build context admits bytes absent from the input hash.
- F4 (P2): the TypeScript bigdec validator accepts values the mirrored JVM codec cannot represent.
Ruled Q85; fixed in DA01's next round (the DA01 branch carries DA00 and edits the same gateway code), then re-reviewed together.
