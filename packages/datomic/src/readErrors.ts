import { ReadError } from "@triplex-build/triplex/runtime";
import { DatomicHttpError } from "./DatomicClient.js";

// [EXP-DA01] Why: preserve the SPI ReadError contract while exposing a matchable unavailable-basis reason (Q89c). Rejected: returning empty rows or hiding availability under an untyped exception.
export class DatomicBasisNotAvailable extends ReadError {
  readonly code = "BasisNotAvailable";
  readonly reason = "basis-not-available";
}
// [DX-RD4] Why: a reader that asked for at least a position learns that the gateway's peer did not reach it in time,
// and which head it had. Rejected: reporting it as an unavailable pinned basis (a different contract).
export class DatomicAtLeastTimeout extends ReadError {
  readonly code = "AtLeastTimeout";
  readonly reason = "at-least-timeout";
  get head() {
    return this.cause instanceof DatomicHttpError ? this.cause.maximum : undefined;
  }
}
// [DX-B5-L2] Why: unsupported native routes must be distinguishable from empty answers.
// Rejected: a generic HTTP error which callers cannot match as a ReadError.
export class DatomicLayoutUnsupported extends ReadError {
  readonly code = "LayoutUnsupported";
  get route() {
    return this.cause instanceof DatomicHttpError ? this.cause.route : undefined;
  }
}
export const readFailure = (cause: unknown, message: string): ReadError =>
  cause instanceof ReadError
    ? cause
    : cause instanceof DatomicHttpError && cause.code === "AtLeastTimeout"
      ? new DatomicAtLeastTimeout({ message, cause })
    : cause instanceof DatomicHttpError && cause.code === "LayoutUnsupported"
      ? new DatomicLayoutUnsupported({ message, cause })
      : cause instanceof DatomicHttpError &&
          ["BasisNotAvailable", "SnapshotExpired"].includes(cause.code)
        ? new DatomicBasisNotAvailable({ message, cause })
        : new ReadError({ message, cause });
