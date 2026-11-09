import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { canonical, sha256 } from "./w0-world.ts";
export function equalBytes(gate: string, observed: string, expected: string) {
  if (observed !== expected)
    throw new Error(`${gate}: byte mismatch (${sha256(observed)} != ${sha256(expected)})`);
}
export function requireCounts(observed: Record<string, number>, expected: Record<string, number>) {
  if (
    !Object.keys(expected).length ||
    Object.keys(expected).some(
      (k) => !Number.isSafeInteger(expected[k]) || expected[k]! < 0 || observed[k] !== expected[k],
    )
  )
    throw new Error("G9 store counts mismatch or absent");
}
export { requireW0Fingerprint as requireFingerprint } from "./g0.ts";
export class DomainOracle {
  child: ReturnType<typeof spawn>;
  queue: { resolve: (s: string) => void; reject: (e: any) => void }[] = [];
  error: Error | undefined;
  encode: (input: unknown) => string;
  constructor(script = "./w0-oracle.py", encode: (input: unknown) => string = canonical) {
    this.encode = encode;
    this.child = spawn("python3", ["-I", new URL(script, import.meta.url).pathname], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    this.child.stderr!.on("data", (d) => (stderr += d));
    createInterface({ input: this.child.stdout! }).on("line", (line) => {
      const p = this.queue.shift();
      if (!p) {
        this.fail(new Error("unsolicited oracle result"));
        return;
      }
      p.resolve(line);
    });
    this.child.on("error", (e) => this.fail(e));
    this.child.on("exit", (code) => {
      if (code !== 0 || this.queue.length)
        this.fail(new Error("O-DOMAIN exited " + code + ": " + stderr));
    });
  }
  fail(e: Error) {
    this.error = e;
    for (const p of this.queue.splice(0)) p.reject(e);
  }
  call(op: string, input: unknown): Promise<string> {
    if (this.error) return Promise.reject(this.error);
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      this.child.stdin!.write(this.encode({ op, input }) + "\n");
    });
  }
  close() {
    this.child.stdin!.end();
  }
}
export function wireRecord(r: any) {
  return {
    ...r,
    workItems: r.workItems.map((w: any) => ({ ...w, payload: JSON.parse(w.payload), inputs: [] })),
  };
}
export const emptyWireState = () => ({ items: [], pending: [], subjects: [] });
export function deliveriesWire(deliveries: readonly any[]) {
  return deliveries
    .map((d) => ({
      ...d,
      payload: typeof d.payload === "string" ? JSON.parse(d.payload) : d.payload,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
