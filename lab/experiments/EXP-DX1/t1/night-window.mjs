import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const zone = "America/New_York";
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
const day = (ms) => {
  const p = parts(ms);
  return `${p.year}-${p.month}-${p.day}`;
};
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
export function checkNightWindow(window, now = Date.now(), minimumMinutes = 0) {
  const canonical = nightWindow(now, window.date);
  for (const k of ["schema", "timeZone", "startAt", "stopStartingAt", "endAt"])
    if (window[k] !== canonical[k]) throw Error("Invalid night window " + k);
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
    const window = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const result = checkNightWindow(window, Date.now(), Number(process.argv[3] ?? 0));
    console.log(result.remainingMs);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 75;
  }
}
