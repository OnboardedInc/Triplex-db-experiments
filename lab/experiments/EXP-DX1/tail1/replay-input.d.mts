import type { frozenDeep } from "../../../bench/lib/deep-profile.ts";

export function matchOffers(
  archive: unknown,
  plan: ReturnType<typeof frozenDeep>,
  seconds: number,
): {
  seconds: number;
  start: number;
  primary: number;
  offerCount: number;
  archive: string;
  ledger: string;
};
