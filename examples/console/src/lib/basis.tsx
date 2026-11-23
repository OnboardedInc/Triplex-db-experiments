// [DX-CON1] The basis control's state: the recorded axis and the valid axis, set independently (DESIGN.md 7.1). It
// applies to Data and Query; Journal and Configuration stay current. Kept in the URL (?recorded=..&valid=..) so a link
// opens the same cut, and remembered for the session.
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import type { Basis } from "./api";

export type Recorded = { mode: "latest" } | { mode: "position"; position: number } | { mode: "recordedAt"; at: string };
export type Valid = { mode: "now" } | { mode: "date"; date: string };
export type BasisState = { recorded: Recorded; valid: Valid };

const LATEST: BasisState = { recorded: { mode: "latest" }, valid: { mode: "now" } };

export function parseBasis(params: URLSearchParams): BasisState {
  const r = params.get("recorded");
  const v = params.get("valid");
  const recorded: Recorded =
    r && /^\d+$/.test(r) ? { mode: "position", position: Number(r) } : r && !Number.isNaN(Date.parse(r)) ? { mode: "recordedAt", at: r } : { mode: "latest" };
  const valid: Valid = v && !Number.isNaN(Date.parse(v)) ? { mode: "date", date: v } : { mode: "now" };
  return { recorded, valid };
}

export function basisParams(b: BasisState): Record<string, string> {
  const out: Record<string, string> = {};
  if (b.recorded.mode === "position") out["recorded"] = String(b.recorded.position);
  if (b.recorded.mode === "recordedAt") out["recorded"] = b.recorded.at;
  if (b.valid.mode === "date") out["valid"] = b.valid.date;
  return out;
}

/** The tool input form of a basis; undefined at latest and now. */
export function toBasis(b: BasisState): Basis | undefined {
  const out: Basis = {};
  if (b.recorded.mode === "position") out.position = b.recorded.position;
  if (b.recorded.mode === "recordedAt") out.recordedAt = new Date(b.recorded.at).toISOString();
  if (b.valid.mode === "date") out.validAt = new Date(b.valid.date).toISOString();
  return Object.keys(out).length ? out : undefined;
}

export const isLatest = (b: BasisState) => b.recorded.mode === "latest" && b.valid.mode === "now";

export function recordedWords(b: BasisState) {
  return b.recorded.mode === "latest"
    ? "Recorded latest"
    : b.recorded.mode === "position"
      ? `Recorded at position ${b.recorded.position.toLocaleString("en-US")}`
      : `Recorded at ${b.recorded.at.replace("T", " ").slice(0, 16)}`;
}
export const validWords = (b: BasisState) => (b.valid.mode === "now" ? "Valid now" : `Valid on ${b.valid.date.slice(0, 10)}`);

type Ctx = { basis: BasisState; setBasis: (b: BasisState) => void; reset: () => void };
const BasisContext = createContext<Ctx>({ basis: LATEST, setBasis: () => {}, reset: () => {} });

export function BasisProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const basis = useMemo(() => parseBasis(params), [params]);
  const setBasis = useCallback(
    (b: BasisState) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("recorded");
          next.delete("valid");
          for (const [k, v] of Object.entries(basisParams(b))) next.set(k, v);
          return next;
        },
        { replace: false },
      ),
    [setParams],
  );
  const reset = useCallback(() => setBasis(LATEST), [setBasis]);
  return <BasisContext.Provider value={{ basis, setBasis, reset }}>{children}</BasisContext.Provider>;
}

export const useBasis = () => useContext(BasisContext);
export { LATEST };
