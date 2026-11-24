import { generateId } from "@triplex-build/triplex/internal";

const saveToken = /^[0-7][0-9A-HJKMNP-TV-Z]{23}$/;
const wideToken = /^[0-7][0-9A-HJKMNP-TV-Z]{22}$/;
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let lastToken = "";

function advance(token: string): string {
  const digits = token.split("");
  for (let i = digits.length - 1; i >= 0; i--) {
    const next = alphabet.indexOf(digits[i]!) + 1;
    if (next < (i === 0 ? 8 : alphabet.length)) {
      digits[i] = alphabet[next]!;
      return digits.join("");
    }
    digits[i] = "0";
  }
  throw new RangeError("Ordered save identity space exhausted");
}

function nextToken(): string {
  const sampled = generateId().slice(0, 24);
  if (sampled > lastToken) {
    lastToken = sampled;
    return lastToken;
  }
  // [DX-PREP1] Why: reserve the final two characters of the SDK's 26-character TripleId.
  // Rejected: truncating adjacent ULIDs without advancing their block (they share a prefix).
  lastToken = advance(lastToken);
  return lastToken;
}

function nextWideToken(): string {
  // [Opus W2] Why: a wide block owns every ID that starts with its 23 characters, so it must start above every token this
  // process has issued, and later one-byte tokens must start above it. Rejected: sampling 23 characters without a floor.
  const sampled = generateId().slice(0, 23);
  const floor = lastToken.slice(0, 23);
  const token = sampled > floor ? sampled : advance(floor.padEnd(23, "0"));
  lastToken = token + "Z";
  return token;
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
