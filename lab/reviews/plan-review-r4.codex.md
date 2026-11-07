1. **APPLIED — Explicit recorded time.** C1 now requires R absent; every explicit-R read takes the exact path until a separately proven optimization exists. ([C1](/Users/sam/projects/triplex-db-2/lab/PLAN.md:149))

2. **APPLIED — Coherent maintenance reads and safe chunks.** C4 binds maintenance to its target/generation/mapping, computes chunks immediately before application, accounts for intervening writes, and retains progress for recovery. Qualified raw queries refuse normal results or use exact relations during MAINTAINING; concurrency and crash/resume falsifiers are named. ([C4](/Users/sam/projects/triplex-db-2/lab/PLAN.md:211))

3. **APPLIED — Retry success requires publication.** C2.7 distinguishes durable commitment from publication, permits success only after publication is established, and specifies pending/repairing outcomes plus the requested crash-and-retry test. ([C2.7](/Users/sam/projects/triplex-db-2/lab/PLAN.md:178))

4. **APPLIED — Receipt applicability.** Carry-forward requires unchanged bound identities and an explicit applicability check. Final integrated acceptance must always execute afresh. ([§1.7](/Users/sam/projects/triplex-db-2/lab/PLAN.md:43))

5. **APPLIED — Contract-first implementation dependencies.** EXP-R01 is narrowed to scaffolding, specification compilation and behavior-preserving extraction. Planner, repository and writer behavior moves to EXP-R02 behind reviewed acceptance and golden vectors. ([§9](/Users/sam/projects/triplex-db-2/lab/PLAN.md:437))

**READY TO EXECUTE—as a gated experimental program where failed falsifiers block dependent implementation and promotion.**