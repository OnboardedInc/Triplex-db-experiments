/** [DX-N1] Why: native engine CPU needs cumulative CPU-time deltas, including PG workers.
 * Rejected: ps %cpu (lifetime average), and counting quota cores (there is no native quota).
 */
import { execFile } from "node:child_process";
export class NativeCpuSampler {
  private previous = new Map<number, { identity: string; cpuMs: number; wall: number }>();
  private roots: Record<string, number>;
  constructor(roots: Record<string, number>) {
    this.roots = roots;
    if (process.platform !== "darwin") throw Error("TX2_NATIVE_PIDS requires macOS");
    if (Object.values(roots).some(p => !Number.isSafeInteger(p) || p <= 1)) throw Error("invalid native PID");
  }
  async sample(): Promise<Record<string, { cpuPercent: number; memBytes: number }>> {
    const text = await new Promise<string>((resolve, reject) => execFile("ps", ["-axo", "pid=,ppid=,time=,rss=,lstart="], (e, out) => e ? reject(e) : resolve(out)));
    const wall = performance.now();
    const rows = text.trim().split("\n").map(line => {
      const m = /^\s*(\d+)\s+(\d+)\s+([\d:.\-]+)\s+(\d+)\s+(.+)$/.exec(line);
      if (!m) throw Error("unparseable native ps row: " + line);
      const [dayTime, time] = m[3]!.includes("-") ? m[3]!.split("-") : ["0", m[3]!];
      const parts = time!.split(":").map(Number);
      const seconds = parts.reduce((s, n) => s * 60 + n, 0) + Number(dayTime) * 86400;
      return { pid: Number(m[1]), ppid: Number(m[2]), cpuMs: seconds * 1000, memBytes: Number(m[4]) * 1024, identity: m[5]! };
    });
    const result: Record<string, { cpuPercent: number; memBytes: number }> = {};
    for (const [name, pid] of Object.entries(this.roots)) {
      if (!rows.some(r => r.pid === pid)) throw Error(`native engine ${name} PID ${pid} missing`);
      const owned = new Set([pid]);
      for (let changed = true; changed;) { changed = false; for (const r of rows) if (owned.has(r.ppid) && !owned.has(r.pid)) { owned.add(r.pid); changed = true; } }
      let cpuPercent = 0, memBytes = 0;
      for (const r of rows.filter(r => owned.has(r.pid))) {
        const prev = this.previous.get(r.pid);
        if (prev && prev.identity !== r.identity) throw Error("native PID identity changed: " + r.pid);
        // Exited short-lived workers are not observable with ps; report this sampler limitation.
        if (prev) cpuPercent += Math.max(0, r.cpuMs - prev.cpuMs) / (wall - prev.wall) * 100;
        this.previous.set(r.pid, { identity: r.identity, cpuMs: r.cpuMs, wall }); memBytes += r.memBytes;
      }
      result[name] = { cpuPercent, memBytes };
    }
    return result;
  }
}
