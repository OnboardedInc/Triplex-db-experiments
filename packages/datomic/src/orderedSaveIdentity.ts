import { reserveIdPrefix } from "@triplex-build/triplex/internal";

const saveToken = /^[0-7][0-9A-HJKMNP-TV-Z]{23}$/;
const wideToken = /^[0-7][0-9A-HJKMNP-TV-Z]{22}$/;

// [DX-ACT8, third review U1] A block is reserved from the same allocator as every other ID the SDK makes
// (`reserveIdPrefix`, packages/core `utils/id.ts`): no ID the process issued before starts with the token and none it
// issues after does, so no write of this process can take one of the block's assertion IDs. Before, the token was the
// first 24 characters of an ID the ULID factory then continued in the same millisecond. Tokens are also increasing.
function nextToken(): string {
  return reserveIdPrefix(24);
}

function nextWideToken(): string {
  // [Opus W2] A wide block owns every ID that starts with its 23 characters (reserved the same way).
  return reserveIdPrefix(23);
}

export interface OrderedSaveIdentity {
  readonly token: string;
  readonly transactionId: string;
  /** How many assertion IDs the block holds: 256 (one-byte ordinal) or 4,096 (wide). */
  readonly capacity: number;
  readonly assertionId: (ordinal: number) => string;
}

/**
 * Allocate one identity block for a small save. Retain the token and row order
 * with the command so a resend can reconstruct the same identifiers. A 23-character
 * token (from `wideOrderedSaveIdentity`) reconstructs the wide block.
 */
export function orderedSaveIdentity(token: string = nextToken()): OrderedSaveIdentity {
  if (wideToken.test(token)) return wideOrderedSaveIdentity(token);
  if (!saveToken.test(token)) throw new TypeError("Expected a canonical 24-character save token");
  return {
    token,
    transactionId: `_tx/${token}00`,
    capacity: 256,
    // [DX-PREP1] Why: the complete save occupies one range of the full-row AVET index.
    // Rejected: minting one ULID per assertion, since other saves can interleave in that range.
    assertionId: (ordinal) => {
      if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 256)
        throw new RangeError("Ordered save assertion ordinal must be between 0 and 255");
      return token + ordinal.toString(16).toUpperCase().padStart(2, "0");
    },
  };
}

/**
 * Allocate one identity block for a wide save (up to 4,096 assertions): a 23-character
 * token and a three-hex-digit ordinal, so every ID keeps the 26-character TripleId form.
 * Its journal ID ends in "W00", which no one-byte block can produce for these IDs.
 * The gateway takes it on the per-subject writer only with `TX2_SUBJECT_WIDE=1`.
 */
export function wideOrderedSaveIdentity(token: string = nextWideToken()): OrderedSaveIdentity {
  if (!wideToken.test(token)) throw new TypeError("Expected a canonical 23-character wide save token");
  return {
    token,
    transactionId: `_tx/${token}W00`,
    capacity: 4096,
    assertionId: (ordinal) => {
      if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 4096)
        throw new RangeError("Wide ordered save assertion ordinal must be between 0 and 4095");
      return token + ordinal.toString(16).toUpperCase().padStart(3, "0");
    },
  };
}
