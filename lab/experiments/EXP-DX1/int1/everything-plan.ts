import { launchProfile } from "../jvm1/launch.mjs";
import { fieldRates } from "./field-plan.ts";
import { pooledCampaignId, campaignWindows } from "../scale1/tenant-traffic.ts";

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
        total: n * 10,
        profile,
        load,
      })),
    ),
  );
}
export type CampaignCase = ReturnType<typeof campaignCases>[number];

export function scorecardCases() {
  return campaignCases([100_000]).filter((c) => c.profile === "frozen");
}

export function campaignTenant(c: CampaignCase, smoke: boolean) {
  return {
    topology: "pooled",
    study: smoke ? "smoke" : c.people === 10_000 ? "interference" : "million",
    physical: 0,
    campaign: c.profile,
  } as const;
}

// [DX-THIN1] Why: freeze the combined path on both sides of the pair and fail closed on reviewed correctness defects.
// Rejected: trusting inherited environment flags or claiming an audited group configuration is eligible.
export const treatment = {
  DX_INT1_GATEWAYS: "demand",
  DX_INT1_LEGACY_TOUCHED: "1",
  DX_INT1_SEED_ERRORS: "1",
  DX_INT1_READERS: "touched",
  DX_INT1_DEEP_RELEASE: "ead90",
  DX_TOUCHED_READ_MODE: "following",
  DX_GROUP_COMMIT: "0",
  DX_GROUP_QUEUE_CLOCK: "0",
  DX_GROUP_STAGE_CLOCK: "1",
  DX_W1_EXTRA: "0",
  DX_W1_PREDECESSOR: "0",
  DX_W1_LEDGER: "0",
  DX_W1_PACKED_JOURNAL: "0",
  DX_W1_FAST_REPLY: "0",
  DX_WRITE_BUDGET_US: "",
  DX_SLIM_ROWS: "0",
  DX_INT1_NATIVE_WRITE_READBACK: "1",
  DX_GROUP_REUSE_PREPARED: "0",
  DX_FIELD_COALESCE: "0",
  DX_LIVE_PRIORITY: "0",
  DX_SMALL_ROWS: "0",
  DX_PREDECESSOR_LOOKUP: "0",
  DX_W1_JOURNAL_QUERY: "0",
  DX_ORDERED_SAVE: "0",
  TRIPLEX_DATOMIC_LAYOUT: "legacy",
  TRIPLEX_DATOMIC_FAST_PATHS: "",
  DX_STRICT_RECORD_CLOCKS: "1",
} as const;

export const excluded = {
  grouping:
    "The refreshed writer fixed the audited retry and retraction cases. The joined trace and maximum group frame still need a combined SQL proof.",
  reusePrepared: "Prepared reuse and parallel preparation need the same combined proof.",
  parallelPreparation:
    "Exact-basis parity covers its own tape. The joined run also needs the reader and feed schedules verified with it.",
  savedJournalLayouts: "The retained and packed journals need a combined history and feed check.",
  recordedAuditJournal: "The recorded-only audit option has a separate query contract and declines guarded scopes. The campaign exercises the current journal and pinned world reads.",
  orderedSaveWire: "The matched arm uses the existing compact wire with explicit row identities.",
  fieldCoalesce:
    "A queued replacement must preserve the intermediate row and its native assertion clock.",
  priorityAndBudget:
    "The refreshed ownership and rotation checks cover targeted cases. The combined legacy save and import repeat needs its native scheduling proof.",
  lean: "Lean native queries decline unsupported shapes and do not honor the erasure frontier. Its protected-value test has open key and restore work. The judged run uses legacy storage.",
  leanOptions:
    "Compact stored rows, lean native projections, history identity ranges, predecessor reuse and fresh row replies need the lean storage shape.",
  gzip: "The matched Mac first-read probe favored plain latency.",
  validatedPeer: "The pinned check on each pull uses the source route. The counted local reads use the bounded following replica and independently compare actual local rows with the exact source.",
  historicalFallback:
    "RD1's isolated and installed historical modes require separate reach replicas. This pair uses reach-touched.",
  joinedPublish:
    "The joined priority path has its own admission wrapper. The campaign overlay uses page-guard and selector activation on the same replica and feed.",
  collectors:
    "The paired Mac diagnostics favor tuned G1. Serial and ZGC remain controls and the combined profile still needs physical timing.",
  erasureEnvelope:
    "Detached envelopes need native query and key-store recovery coverage before use in the judged pair.",
  keepWarm: "Omitted under the frozen workload rule.",
};

export function planSummary() {
  return {
    cases: campaignCases(),
    profiles: {
      frozen: frozenProfile,
      field: { id: pooledCampaignId + "/field", ratesPerAccount: fieldRates },
    },
    treatment,
    launch: launchProfile("server"),
    excluded,
    readerCores: 2,
    savedOutputPreflight: campaignCases([4]),
    fieldWindows: Object.fromEntries(
      populations.map((n) => {
        const c = campaignCases([n]).find((c) => c.profile === "field" && c.load === "reader")!;
        return [n, campaignWindows(campaignTenant(c, false), c.load)];
      }),
    ),
  };
}
