// [DX-INT1] Why: AGE1's aging loader wrote its journal position rows with the gateway's test fixture encoder
// (the "-" header marker and the row's own position as payload). Tools pointed at a loader-built database may read
// them; the product reader stays strict.
// Rejected: accepting them by default, which would let any writer store a non-canonical position row unnoticed.
let accepted = process.env["TRIPLEX_DATOMIC_LOADER_POSITION_ROWS"] === "1";

/** True only when a tool has opted in, by `acceptLoaderPositionRows(true)` or TRIPLEX_DATOMIC_LOADER_POSITION_ROWS=1. */
export const loaderPositionRowsAccepted = () => accepted;

/** Opt in (or back out) of reading the aging loader's fixture-encoded journal position rows. Off by default. */
export function acceptLoaderPositionRows(accept: boolean) {
  accepted = accept;
}
