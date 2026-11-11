import { pathToFileURL } from "node:url";
// [DX-S5] Why: generic health does not prove that the retained target database is readable.
// Rejected: a startup sleep or accepting System started before broker publication and peer sync.
export async function waitForTarget(
  prefix,
  db = "",
  minimumText = "0",
  rolesText = "w,r",
  io = {},
) {
  const fetch = io.fetch ?? globalThis.fetch;
  const now = io.now ?? Date.now;
  const sleep = io.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const emit = io.emit ?? ((value) => console.log(JSON.stringify(value)));
  if (!/^tx2-dxs5-[a-z0-9-]+$/.test(prefix) || (db && !/^s2-[A-Za-z0-9_-]+$/.test(db)))
    throw Error("invalid owned target");
  const minimum = BigInt(minimumText);
  for (const role of rolesText.split(",")) {
    if (!["w", "r"].includes(role)) throw Error("invalid role");
    const started = now();
    let ready = false;
    while (now() - started < 600000) {
      try {
        const path = db ? `/v1/db/${db}/basis` : "/health";
        const response = await fetch(`http://${prefix}-gw-${role}:8080${path}`, {
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.text();
        if (!response.ok) throw Error(`HTTP ${response.status}: ${body}`);
        const value = JSON.parse(body);
        if (db && (value.position?.t !== "long" || BigInt(value.position.v) < minimum))
          throw Error("target head behind checkpoint");
        emit({
          event: "target-gateway-ready",
          prefix,
          db,
          role,
          minimumHead: minimumText,
          observed: value,
          elapsedMs: now() - started,
        });
        ready = true;
        break;
      } catch (error) {
        emit({
          event: "target-gateway-wait",
          prefix,
          db,
          role,
          elapsedMs: now() - started,
          error: String(error),
        });
        await sleep(1000);
      }
    }
    if (!ready) throw Error("target database readiness timeout");
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await waitForTarget(...process.argv.slice(2));
