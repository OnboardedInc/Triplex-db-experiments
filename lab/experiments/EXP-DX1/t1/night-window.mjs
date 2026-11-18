import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hostGateLine, waitForArmHost } from "../../../trace/host-admission.mjs";
const zone = "America/New_York";
/** @param {number} ms */
const parts = (ms) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(ms)
      .map((p) => [p.type, p.value]),
  );
/** @param {number} ms */
const day = (ms) => {
  const p = parts(ms);
  return `${p.year}-${p.month}-${p.day}`;
};
/** @param {string} date @param {number} hour @param {number} minute */
const localEpoch = (date, hour, minute) => {
  const target = Date.parse(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  );
  let result = target;
  for (let i = 0; i < 3; i++) {
    const p = parts(result);
    result +=
      target - Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`);
  }
  return result;
};
// [DX-T1-13] Why: each physical arm rechecks the local cutoff after any lease wait; an end watchdog aborts rather than relabels a shortened arm.
// Rejected: checking only when the outer pair starts, or silently running into daytime.
/** @param {number} [now] @param {string} [date] */
export function nightWindow(now = Date.now(), date) {
  const p = parts(now),
    chosen = date ?? day(Number(p.hour) < 7 ? now - 12 * 3600000 : now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chosen) || !Number.isFinite(Date.parse(chosen)))
    throw Error("Invalid night date");
  const next = day(localEpoch(chosen, 12, 0) + 24 * 3600000);
  return {
    schema: "triplex.night-window/1",
    date: chosen,
    timeZone: zone,
    startAt: localEpoch(chosen, 19, 30),
    stopStartingAt: localEpoch(next, 6, 15),
    endAt: localEpoch(next, 6, 45),
  };
}
/** @param {ReturnType<typeof nightWindow>} window @param {number} [now] @param {number} [minimumMinutes] */
export function checkNightWindow(window, now = Date.now(), minimumMinutes = 0) {
  const canonical = nightWindow(now, window.date);
  /** @type {(keyof typeof canonical)[]} */
  const fields = ["schema", "timeZone", "startAt", "stopStartingAt", "endAt"];
  for (const k of fields) if (window[k] !== canonical[k]) throw Error("Invalid night window " + k);
  if (!Number.isFinite(now) || !Number.isFinite(minimumMinutes) || minimumMinutes < 0)
    throw Error("Invalid night clock or duration");
  if (now < window.startAt) throw Error("Night arm refused: before 19:30 local");
  if (now >= window.stopStartingAt)
    throw Error("Night arm refused: no new arms at or after 06:15 local");
  if (now + minimumMinutes * 60000 > window.endAt)
    throw Error("Night arm refused: insufficient time to finish before 06:45 local");
  return { allowed: true, remainingMs: window.endAt - now };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [file, minutes = "0", operation, tag, source, output] = process.argv.slice(2);
    const window = JSON.parse(fs.readFileSync(file, "utf8"));
    if (operation === "--admit-arm") {
      if (
        !/^tx2-dxt1-[a-z0-9-]+$/.test(tag) ||
        !/^[a-f0-9]{40}$/.test(source) ||
        path.basename(output ?? "") !== tag ||
        window.source !== source ||
        !tag.startsWith(window.tag + "-")
      )
        throw Error("Night arm admission identity differs from this session");
      /** @param {string} name @param {unknown} value */
      const save = (name, value) =>
        fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + "\n", {
          flag: "wx",
        });
      const identity = { tag, source, nightTag: window.tag, nightStartedAt: window.startedAt };
      const result = await waitForArmHost({
        checkTime: (now) => checkNightWindow(window, now, Number(minutes)),
        onSample: (gate, sample) => {
          save(`night-host-gate-${String(sample).padStart(2, "0")}.json`, {
            ...gate,
            ...identity,
            sample,
          });
          console.log(`${tag} sample ${sample} — ${hostGateLine(gate)}`);
        },
      }).catch((error) => ({ gate: null, attempts: 0, reason: error.message }));
      if (result.gate)
        save("night-host-gate.json", { ...result.gate, ...identity, sample: result.attempts });
      if (result.reason) {
        const reason = `Refused before ${tag.split("-").at(-1)}: ${result.reason}`;
        save("night-host-refusal.json", { ...identity, reason });
        console.error(reason);
        process.exitCode = 75;
      }
    } else {
      if (operation !== undefined) throw Error("Invalid night window operation");
      const result = checkNightWindow(window, Date.now(), Number(minutes));
      console.log(result.remainingMs);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 75;
  }
}
