// [EXP-K01-R6] Why: incomplete acquisition must remain failure through parsing and verdict publication. Rejected: null/empty defaults and independent PASS bits (erase producer failures).
import { randomUUID, createHash } from "node:crypto";
export type Observation<T> = { state: "complete"; kind: string; binding: unknown; attempt: string; at: string; value: T } | { state: "failed"; kind: string; binding: unknown; attempt: string; at: string; error: string; cause: unknown };
export class ObservationFailure extends Error {
  observation: Observation<unknown>;
  constructor(observation: Observation<unknown>) { super(`${observation.kind}: ${observation.state === "failed" ? observation.error : "invalid observation"}`); this.observation = observation; }
}
const parsed = <T>(value: T): T => { if (value === undefined) throw Error("parser returned no observation"); return value; };
export function observe<T>(kind: string, binding: unknown, read: () => unknown, parse: (raw: any) => T): Observation<T> {
  const identity = { kind, binding, attempt: randomUUID(), at: new Date().toISOString() };
  try { return Object.freeze({ ...identity, state: "complete" as const, value: parsed(parse(read())) }); }
  catch (error) { return Object.freeze({ ...identity, state: "failed" as const, error: error instanceof Error ? error.message : String(error), cause: error }); }
}
export function complete<T>(observation: Observation<T>): T {
  if (!observation || observation.state !== "complete") throw new ObservationFailure(observation);
  return observation.value;
}
export function text(raw: unknown): string {
  if (typeof raw !== "string") throw Error("missing text observation");
  return raw;
}
export function byteCount(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 0) throw Error(`invalid byte/cap observation: ${String(raw)}`);
  return raw;
}
export function forecast(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > Number.MAX_SAFE_INTEGER) throw Error(`invalid forecast: ${String(raw)}`);
  return raw;
}
export function processOutput(raw: any, { stderrEmpty = false } = {}): { stdout: string; stderr: string } {
  if (!raw || raw.status !== 0 || raw.signal !== null || raw.error) throw Object.assign(Error("command did not complete successfully"), { raw });
  const stdout = text(raw.stdout), stderr = text(raw.stderr);
  if (stderrEmpty && stderr.length) throw Object.assign(Error("producer emitted diagnostics"), { raw });
  return { stdout, stderr };
}
export function processObservation<T>(kind: string, binding: unknown, raw: unknown, parse: (out: { stdout: string; stderr: string }) => T, options = {}): Observation<T> {
  return observe(kind, binding, () => raw, r => parse(processOutput(r, options)));
}
export function digestBytes(raw: unknown): string {
  if (!Buffer.isBuffer(raw) && typeof raw !== "string") throw Error("hash requires complete bytes");
  return createHash("sha256").update(raw).digest("hex");
}
export function booleanProof(raw: any): any {
  if (!raw || raw.ok !== true) throw Error("required semantic proof failed");
  return raw;
}
export async function observeAsync<T>(kind: string, binding: unknown, read: () => Promise<unknown>, parse: (raw: any) => T): Promise<Observation<T>> {
  const identity = { kind, binding, attempt: randomUUID(), at: new Date().toISOString() };
  try { return Object.freeze({ ...identity, state: "complete" as const, value: parsed(parse(await read())) }); }
  catch (error) { return Object.freeze({ ...identity, state: "failed" as const, error: error instanceof Error ? error.message : String(error), cause: error }); }
}
export function sqlNumber(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "" || !["number", "bigint", "string"].includes(typeof raw)) throw Error("missing numeric SQL observation");
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 0 || typeof raw === "bigint" && BigInt(n) !== raw || typeof raw === "string" && !/^[0-9]+$/.test(raw)) throw Error("invalid numeric SQL observation");
  return n;
}
export function rows(raw: unknown): Record<string, any>[] {
  if (!Array.isArray(raw) || raw.some(r => !r || typeof r !== "object" || Array.isArray(r))) throw Error("incomplete SQL row set");
  return raw;
}
