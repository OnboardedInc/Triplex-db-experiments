import assert from "node:assert/strict";
import { offers } from "../w1/field/schedule.ts";
import { ceilingSeconds, widePeople } from "../prep1/server-tape.ts";

export const serverRates = [50, 235, 394, 620] as const;
export const serverCellSeconds = ceilingSeconds;
export const fairCredits = 6;
export { widePeople };
export type ServerCell = { rate: (typeof serverRates)[number]; loaded: boolean };
export const cellPath = (cell: ServerCell) => "p6-" + cell.rate + "-" + (cell.loaded ? "loaded" : "alone");
export const serverCells = serverRates.flatMap((rate) => [false, true].map((loaded): ServerCell => ({rate, loaded})));
export const lastServerCell = cellPath(serverCells.at(-1)!);

export function ratedTape(people: number, cell: ServerCell) {
  assert(people === 100_000 && serverRates.includes(cell.rate));
  const quiet = offers(3.5, serverCellSeconds, [0]);
  const other = cell.rate * serverCellSeconds - quiet.length;
  const band = serverRates.indexOf(cell.rate);
  // [DX-V01] Why: use PREP1's scattered 1,900-person bands and matching quiet offsets.
  // Rejected: repeating the hot 200 people or allowing one treatment to choose different subjects.
  const streams = cell.loaded ? [quiet, ...Array.from({ length: 9 }, (_, neighbor) => {
    const count = Math.floor(other / 9) + Number(neighbor < other % 9);
    return offers(count / serverCellSeconds, serverCellSeconds, [neighbor + 1]);
  })] : [quiet];
  const tape = streams.flatMap((stream) => stream.map((offer, i) => ({
    account: offer.account,
    ordinal: i,
    subject: ((band * widePeople + (i % widePeople)) * 7919 + offer.account * 1291) % people,
    ms: offer.ms,
    width: offer.extra ? 2 : 1,
    version: [cellPath(cell), offer.account, i].join("/"),
  }))).sort((a, b) => a.ms - b.ms || a.account - b.account || a.ordinal - b.ordinal);
  assert.equal(tape.length, cell.loaded ? cell.rate * serverCellSeconds : quiet.length);
  return tape;
}
