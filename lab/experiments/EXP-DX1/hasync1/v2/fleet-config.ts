import assert from "node:assert/strict";
import type { Mode, Role } from "../../ha1/common.ts";

export const fleetMode = (mode: Mode) =>
  mode === "hasync-fleet-shared" || mode === "hasync-fleet-dedicated";
export const pgRole = (site: "a" | "b", i: number) => `fleet-${site}-pg${i}` as const;
export const txRole = (site: "a" | "b", i: number) => `fleet-${site}-tx${i}` as const;

export function fleetCaps(mode: Mode, systems: number, bench: boolean) {
  assert(fleetMode(mode) && [1, 4, 10].includes(systems));
  const dedicated = mode === "hasync-fleet-dedicated";
  const caps = new Map<Role, number>([
    ["write", bench ? 896 : 352],
    ["read", bench ? 896 : 352],
    ["tool", 64],
  ]);
  for (let i = 0; i < systems; i++) {
    for (const side of ["a", "b"] as const) {
      caps.set(txRole(side, i), bench ? 640 : 240);
      if (dedicated || i === 0) caps.set(pgRole(side, i), bench ? 192 : dedicated ? 64 : 128);
    }
  }
  return caps;
}
