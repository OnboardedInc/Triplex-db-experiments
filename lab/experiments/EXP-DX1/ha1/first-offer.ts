// [DX-INT1] Why: Saturday's dry run stopped every launcher at its first stack container, so it never reached the checks
// that run after the stack starts (scope functions, native census, seed positions, ladder seals), and five queued runs
// stopped on the server. With DX_DRY_RUN_FIRST_OFFER=1 a launcher runs all of its checks for real, prints one line
// here, and throws, so its own cleanup removes the stack and copy. Without the variable this function does nothing.
// Rejected: a mode in each launcher that skips its cleanup, or stand-in Docker replies after the stack (they cannot
// show a census or a function name).
export class FirstOfferReached extends Error {}

export function firstOffer(launcher: string) {
  if (process.env.DX_DRY_RUN_FIRST_OFFER !== "1") return;
  const frame = new Error().stack?.split("\n")[2] ?? "";
  const where = /\(?((?:\/|file:\/\/)[^():]+):(\d+):\d+\)?$/.exec(frame.trim());
  const at = where ? where[1]!.replace(/^file:\/\//, "").replace(/^.*\/(lab\/experiments\/)/, "$1") + ":" + where[2] : "unknown";
  console.log(`DX-DRY-RUN first offer reached: ${launcher} ${at}`);
  throw new FirstOfferReached(`Dry run stopped ${launcher} before its first offer at ${at}`);
}
