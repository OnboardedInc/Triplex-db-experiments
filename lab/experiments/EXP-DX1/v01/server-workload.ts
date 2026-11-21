import assert from "node:assert/strict";
import { offers } from "../w1/field/schedule.ts";
import { creditModes, defaultCreditMode, type CreditMode } from "../jvm1/launch.mjs";
export { creditModeSelection as writerAdmission } from "../prep1/rolling-credits.ts";
export type { CreditMode } from "../jvm1/launch.mjs";
import { ceilingSeconds, widePeople } from "../prep1/server-tape.ts";

export const serverRates = [50, 235, 394, 620] as const;
export const replaySeconds = ceilingSeconds;
export const serverCellSeconds = 300;
export type WindowSeconds = 90 | 300;
export function parseWindow(text: string | undefined): WindowSeconds {
  assert(text === undefined || text === "90" || text === "300", "Choose --window-seconds 90 or 300");
  return text === "90" ? 90 : serverCellSeconds;
}
export function parseCredits(value = defaultCreditMode): CreditMode {
  const mode = creditModes.find(mode => mode === value);
  assert(mode, "Choose --credit-mode barrier6|rolling6|rolling8|rolling12|rolling16");
  return mode;
}
export { widePeople };
export type ServerCell = { rate: (typeof serverRates)[number]; loaded: boolean };
export const cellPath = (cell: ServerCell) => "p6-" + cell.rate + "-" + (cell.loaded ? "loaded" : "alone");
export const serverCells = serverRates.flatMap((rate) => [false, true].map((loaded): ServerCell => ({rate, loaded})));
export const lastServerCell = cellPath(serverCells.at(-1)!);

export function ratedTape(people: number, cell: ServerCell, seconds: WindowSeconds = serverCellSeconds) {
  assert(people === 100_000 && serverRates.includes(cell.rate));
  const quiet = offers(3.5, seconds, [0]);
  const other = cell.rate * seconds - quiet.length;
  const band = serverRates.indexOf(cell.rate);
  // [DX-V01] Why: use PREP1's scattered 1,900-person bands and matching quiet offsets.
  // Rejected: repeating the hot 200 people or allowing one treatment to choose different subjects.
  const streams = cell.loaded ? [quiet, ...Array.from({ length: 9 }, (_, neighbor) => {
    const count = Math.floor(other / 9) + Number(neighbor < other % 9);
    return offers(count / seconds, seconds, [neighbor + 1]);
  })] : [quiet];
  const tape = streams.flatMap((stream) => stream.map((offer, i) => ({
    account: offer.account,
    ordinal: i,
    subject: ((band * widePeople + (i % widePeople)) * 7919 + offer.account * 1291) % people,
    ms: offer.ms,
    width: offer.extra ? 2 : 1,
    version: [cellPath(cell), offer.account, i].join("/"),
  }))).sort((a, b) => a.ms - b.ms || a.account - b.account || a.ordinal - b.ordinal);
  assert.equal(tape.length, cell.loaded ? cell.rate * seconds : quiet.length);
  return tape;
}
