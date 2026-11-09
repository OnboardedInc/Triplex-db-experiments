// [EXP-K01-R12] Why: N01 business facts exclude persisted _Transaction rows (transactionMetadata.ts:29-59; TriplesLive.ts:513-517). Rejected: deriving expected storage counts from the observed scan or disabling the journal to make the old count pass.
import { accountsFor, ownFacts, sharedFacts, populationCounts, type Fact } from "./world.ts";
export function n01SeedCounts(subjects: number, batchFacts: number) {
  if (
    !Number.isSafeInteger(subjects) ||
    subjects < 1 ||
    !Number.isSafeInteger(batchFacts) ||
    batchFacts < 1
  )
    throw Error("G0 invalid N01 seed inputs");
  const accounts = accountsFor(subjects);
  const valueKinds = new Set<string>(["number", "datetime", "string", "ref", "json"]);
  let commands = 0,
    business = 0,
    journal = 0;
  const batch = (facts: readonly Fact[]) => {
    if (!facts.length) return;
    commands++;
    business += facts.length;
    for (const f of facts) valueKinds.add(f.v.type);
    // [EXP-K01-R12] Why: seed.ts commit always supplies actor+commandId; metadataInputs emits position/instant, those two fields, unique changed entities and every change. Rejected: one changed-entity row per fact or one per entity across the whole seed (batch boundaries matter).
    journal += 4 + new Set(facts.map((f) => f.e)).size + facts.length;
  };
  // [EXP-K01-R12] Why: mirror the input partition, independently of receipts: shared worlds slice at batchFacts; subject batches flush before overflow and never split a subject (seed.ts:105-144). Rejected: ceil(total facts/batchFacts), which loses account/subject boundaries.
  for (let a = 0; a < accounts; a++) {
    const facts = sharedFacts(a);
    for (let k = 0; k < facts.length; k += batchFacts) batch(facts.slice(k, k + batchFacts));
  }
  let pending: Fact[] = [];
  for (let i = 0; i < subjects; i++) {
    const facts = ownFacts(i, accounts);
    if (pending.length + facts.length > batchFacts) {
      batch(pending);
      pending = [];
    }
    pending.push(...facts);
  }
  batch(pending);
  if (business !== populationCounts(subjects, accounts).seedAssertions)
    throw Error("G0 N01 generator/closed form differs");
  return {
    subjects,
    accounts,
    batchFacts,
    commands,
    business,
    journal,
    storedAssertions: business + journal,
    valueKinds: [...valueKinds].sort(),
  };
}
