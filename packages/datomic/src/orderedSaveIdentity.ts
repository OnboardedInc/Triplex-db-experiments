import { generateId } from "@triplex-build/triplex/internal";

const saveToken = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

export interface OrderedSaveIdentity {
  readonly token: string;
  readonly transactionId: string;
  readonly assertionId: (ordinal: number) => string;
}

/**
 * Allocate one identity block for a small save. Retain the token and row order
 * with the command so a resend can reconstruct the same identifiers.
 */
export function orderedSaveIdentity(token: string = generateId()): OrderedSaveIdentity {
  if (!saveToken.test(token)) throw new TypeError("Expected a canonical save ULID");
  return {
    token,
    transactionId: `_tx/${token}`,
    // [DX-PREP1] Why: the complete save occupies one range of the full-row AVET index.
    // Rejected: minting one ULID per assertion, since other saves can interleave in that range.
    assertionId: (ordinal) => {
      if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 256)
        throw new RangeError("Ordered save assertion ordinal must be between 0 and 255");
      return token + ordinal.toString(16).toUpperCase().padStart(2, "0");
    },
  };
}
