// [DX-DEMO1] Why: AGE1's aging loader wrote the journal position row of each of its 28,222,864 saves on the one billion
// database with the gateway's test fixture encoder (the "-" marker with the position as payload) instead of the product's
// "P" marker with a null payload. The product reader refuses those rows. A reader opened on that database may opt in to
// reading them, and only them: the payload must equal the row's own position, under the "-" marker.
// Rejected: relaxing the product's default reader (any other non-null payload is still refused either way).
let loaderPositionRows = false;
/** Opt in, for this process, to reading loader-written journal position rows (off by default). */
export function setLoaderPositionRowCompatibility(enabled: boolean) {
  loaderPositionRows = enabled === true;
}
export const loaderPositionRowCompatibility = () => loaderPositionRows;
