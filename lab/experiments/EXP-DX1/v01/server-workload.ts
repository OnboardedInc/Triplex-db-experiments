import assert from "node:assert/strict";
import { offers } from "../w1/field/schedule.ts";
import { creditModes, defaultCreditMode, type CreditMode } from "../jvm1/launch.mjs";
export { creditModeSelection as writerAdmission } from "../prep1/rolling-credits.ts";
export type { CreditMode } from "../jvm1/launch.mjs";
import { ceilingSeconds, widePeople } from "../prep1/server-tape.ts";

export const serverRates = [50, 235, 394, 620] as const;
export const replaySeconds = ceilingSeconds;
export const serverCellSeconds = 300;
// [DX-CARD2] Why: the quiet-account gate (P6) wants 500 verified commits per side, and the quiet account offers 3.5
// saves/s in every cell at every load, so 90 s cells give 315 and the gate can only be PARTIAL. The cell length is a
// setting: 90 or 300 as before, or any multiple of 30 from 90 to 600 s; 150 s is the shortest that offers 500 or more
// (525). Rejected: a free length (3.5 × seconds must be whole and the tapes are built per 30 s), and changing the 90 s
// or 300 s cells the earlier cards measured.
export type WindowSeconds = number;
export const quietPerSecond = 3.5, quietGateCommits = 500;
export const shortestGateSeconds = Math.ceil(quietGateCommits / quietPerSecond / 30) * 30;
export function parseWindow(text: string | undefined): WindowSeconds {
  const seconds = text === undefined ? serverCellSeconds : Number(text);
  assert(text === undefined || (/^[1-9][0-9]*$/.test(text) && seconds % 30 === 0 && seconds >= 90 && seconds <= 600),
    "Choose --window-seconds 90 or 300 (or a multiple of 30 from 90 to 600)");
  return seconds;
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
