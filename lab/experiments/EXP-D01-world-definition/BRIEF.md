# EXP-D01a world definition W0: the frozen spec (step 1 of 3; the kernel and O-DOMAIN are built later by two independent agents)

**North star:** P5 (release activation must evaluate a release, TARGETS 1.1 P5) and P3 (the expected affected-subject set includes
subjects reached through referenced entities, TARGETS 1.1 P3 item 3); also the domain expectations for all 20 golden scenarios
(TARGETS 6.1). Without W0, no P5 receipt and no domain-level GS verdict can pass (the seams fail closed).
**Scope:** lab/SCOPE.md, lab/NORTH-STAR.md, lab/TARGETS.md v2 sections 1.1, 2, 6, 6.1 and 7; lab/research/SAM-pasted-targets-2026-11-07.md
for the workload's shape; lab/research/R18-read-path-feed-sweep-prior-art.md sections 3 and 7 (read sets, early cutoff, per-requirement
memoization). Inherited homebase files are for code facts only.

## Commander's intent
One small, exact, frozen world definition that two people could implement independently and get byte-identical outputs. It stands in for
Onboarded's real world definition in every test; it is not a Triplex feature. When this lands, a TypeScript reference kernel and the
Python O-DOMAIN oracle can each be written from SPEC.md alone, and any disagreement between them is a spec ambiguity you can name.

## Point of view
1. **Small and exact beats realistic and vague.** About 12 rules, each a decision table over named attributes with exact types under
   Sam's numeric rule (scaled-integer cents for money and pay rates; integer minutes for hours; dates as ISO calendar dates; no floats).
2. **Rules to cover** (TARGETS 6.1): I-9 Section 1 and Section 2 tasks with due times (Section 2 due 3 business days after start date;
   define business days exactly, no holidays); E-Verify case status transitions; background-check result; document expiry as valid-time
   boundaries (expiry creates an obligation at the boundary); pay rate at or above the work location's minimum wage (location is a
   referenced entity shared by many workers); weekly hours over 2,400 minutes produce an overtime flag; start-date moves shift every
   dependent due time; proposals (agent-authored) never satisfy a requirement until a decision fact exists; conflicting reviewer
   decisions resolve by the commit order the store reports.
3. **Outputs are data, not prose:** per subject, the set of open tasks (id, kind, dueAt), obligations (id, boundary instant), work items
   to publish (deterministic id from subject, release hash, rule id, input positions), and an effect trace. Define a canonical JSON
   serialization (key order, number forms) so outputs compare byte for byte.
4. **Read sets are part of the spec.** For each rule, list exactly which attributes of the subject and of which referenced entities it
   reads. That list defines the dependency index (R18 finding 1) and the expected affected-subject set for P3 and GS.06b.
5. **Two releases.** R1, and R2 changing exactly three requirements (for example the Section 2 due window, the minimum-wage rule's
   location attribute, one document type's expiry handling). Releases are content-addressed (define the hashing input); activation is a
   fact with a valid time. Preview evaluates R2 at a given basis without activating it.
6. **Evaluation contract:** `evaluate(subjectWorld, release, basis) -> outputs`, where subjectWorld is the subject's facts plus the facts of
   the referenced entities in the read set, all at one basis. Pure and deterministic: no clock reads; "now" is the basis's valid time.
7. **Hand-derived golden cases.** 30 to 40 small cases (inputs, release, basis, expected outputs), including boundary instants, a value at
   each numeric edge, a proposal-only case, a location wage change affecting several workers, an erased PII attribute (ErasedValue per
   TARGETS 7: rules reading it must produce a defined output), and preview-versus-activation at one basis.

## Boundaries
- Write only `lab/world/W0/**` (SPEC.md, releases/R1.json and R2.json, schema.json, cases/*.json, README.md) and this experiment folder.
  No code beyond a tiny stdlib-only Python validator for the JSON files' shape (no rule logic in it, so the oracle author stays independent).
- Do not read or write packages/*, lab/oracles/**, lab/bench/** or lab/scenarios/**. No engines.
- Work in a worktree branch `exp/D01-world-definition`.

## Gates
1. Every rule has a decision table, a read set and at least two golden cases (one positive, one negative).
2. The validator passes on every JSON file; canonical serialization rules are stated precisely enough to produce byte-identical output.
3. A self-review section lists every place two implementers could still differ, each with the resolution chosen.

## Report
Commit hash, rule list with read sets, case count, the self-review list, open questions. The orchestrator saves it as REPORT.md.
