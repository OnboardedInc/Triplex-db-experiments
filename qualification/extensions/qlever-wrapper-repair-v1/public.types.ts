/** Compile only against the generated private public facade; never import at runtime. */
import {
  makeQleverClient,
  makeQleverNativeQueries,
  makeQleverRuntime,
} from "@triplex-build/triplex-qlever";

const options: Parameters<typeof makeQleverRuntime>[0] = {
  url: "http://127.0.0.1:17019",
  queryLimits: {
    aggregateAnswerPlan: "bounded",
    sourcePlan: "persisted",
    negationPlan: "minus",
    retirementPlan: "paired",
    timeoutMs: 5000,
    nativeTimeoutMs: 5000,
    maxResponseBytes: 2 * 1024 ** 2,
    maxResultRows: 32,
  },
};
type PublicClient = ReturnType<typeof makeQleverClient>;
type PublicNativeFactory = typeof makeQleverNativeQueries;
type PublicRuntimeFactory = typeof makeQleverRuntime;
declare const publicTypes: [PublicClient, PublicNativeFactory, PublicRuntimeFactory];
void options;
void publicTypes;
