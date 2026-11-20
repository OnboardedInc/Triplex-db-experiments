import { fieldProfile, fieldRates } from "./field-plan.ts";

export const frozenProfile = "deep/1";
export const profiles = ["frozen", "field"] as const;
export type CampaignProfile = (typeof profiles)[number];
export const populations = [10_000, 100_000] as const;
export const loads = ["zero", "reader"] as const;

export function campaignCases(people: readonly number[] = populations) {
  return people.flatMap((n) =>
    profiles.flatMap((profile) =>
      loads.map((load) => ({
        key: `${n}-${profile}-${load}`,
        people: n,
        profile,
        load,
      })),
    ),
  );
}
export type CampaignCase = ReturnType<typeof campaignCases>[number];

// [DX-THIN1] Why: freeze the combined path on both sides of the pair and fail closed on reviewed correctness defects.
// Rejected: trusting inherited environment flags or claiming an audited group configuration is eligible.
export const treatment = {
  DX_INT1_GATEWAYS: "demand",
  DX_INT1_READERS: "touched",
  DX_TOUCHED_READ_MODE: "validated",
  DX_GROUP_COMMIT: "0",
  DX_GROUP_QUEUE_CLOCK: "0",
  DX_GROUP_STAGE_CLOCK: "1",
  DX_W1_EXTRA: "1",
  DX_W1_PREDECESSOR: "1",
  DX_W1_LEDGER: "0",
  DX_W1_PACKED_JOURNAL: "0",
  DX_W1_FAST_REPLY: "0",
  DX_WRITE_BUDGET_US: "",
  DX_SLIM_ROWS: "0",
  DX_INT1_NATIVE_WRITE_READBACK: "1",
  DX_GROUP_REUSE_PREPARED: "0",
  DX_FIELD_COALESCE: "0",
  DX_LIVE_PRIORITY: "0",
  DX_SMALL_ROWS: "1",
  DX_PREDECESSOR_LOOKUP: "1",
  TRIPLEX_DATOMIC_LAYOUT: "lean",
  TRIPLEX_DATOMIC_FAST_PATHS: "fresh-texts,history-range",
  DX_STRICT_RECORD_CLOCKS: "1",
} as const;

export const excluded = {
  grouping: "The write audit reproduced a stale retraction clock in a grouped replacement.",
  reusePrepared: "The selected writer uses ordinary serial turns until grouped change bytes pass.",
  parallelPreparation: "The guarded overlap and fast member replies need a verified grouped arm.",
  savedJournalLayouts: "The retained and packed journals need a combined history and feed check.",
  orderedSaveWire: "The matched arm uses the existing compact wire with explicit row identities.",
  fieldCoalesce:
    "A queued replacement must preserve the intermediate row and its native assertion clock.",
  priorityAndBudget:
    "The audited chooser can strand an eligible live write behind a scoped import, and account hints can refuse notice progress.",
  slimRows:
    "A separate stored layout would prevent reuse of the same enabled packed-row path and prior lean evidence.",
  gzip: "The matched Mac first-read probe favored plain latency.",
  loadAndActivation:
    "Load and release experiments have their own offered schedule and exactness gates. The paired P1–P4 profile holds those treatments fixed.",
  keepWarm: "Omitted under the frozen workload rule.",
};

export function planSummary() {
  return {
    cases: campaignCases(),
    profiles: { frozen: frozenProfile, field: { id: fieldProfile, ratesPerAccount: fieldRates } },
    treatment,
    excluded,
    readerCores: 6,
    savedOutputPreflight: campaignCases([40]),
  };
}
