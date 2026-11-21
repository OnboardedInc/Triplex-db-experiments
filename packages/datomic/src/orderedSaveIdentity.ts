import { generateId } from "@triplex-build/triplex/internal";

const saveToken = /^[0-7][0-9A-HJKMNP-TV-Z]{23}$/;
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
let lastToken = "";

function nextToken(): string {
  const sampled = generateId().slice(0, 24);
  if (sampled > lastToken) {
    lastToken = sampled;
    return lastToken;
  }
  // [DX-PREP1] Why: reserve the final two characters of the SDK's 26-character TripleId.
  // Rejected: truncating adjacent ULIDs without advancing their block (they share a prefix).
  const digits = lastToken.split("");
  for (let i = digits.length - 1; i >= 0; i--) {
    const next = alphabet.indexOf(digits[i]!) + 1;
    if (next < (i === 0 ? 8 : alphabet.length)) {
      digits[i] = alphabet[next]!;
      lastToken = digits.join("");
      return lastToken;
    }
    digits[i] = "0";
  }
  throw new RangeError("Ordered save identity space exhausted");
}

export interface OrderedSaveIdentity {
  readonly token: string;
  readonly transactionId: string;
  readonly assertionId: (ordinal: number) => string;
}

/**
 * Allocate one identity block for a small save. Retain the token and row order
 * with the command so a resend can reconstruct the same identifiers.
 */
export function orderedSaveIdentity(token: string = nextToken()): OrderedSaveIdentity {
  if (!saveToken.test(token)) throw new TypeError("Expected a canonical 24-character save token");
  return {
    token,
    transactionId: `_tx/${token}00`,
    // [DX-PREP1] Why: the complete save occupies one range of the full-row AVET index.
    // Rejected: minting one ULID per assertion, since other saves can interleave in that range.
    assertionId: (ordinal) => {
      if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= 256)
        throw new RangeError("Ordered save assertion ordinal must be between 0 and 255");
      return token + ordinal.toString(16).toUpperCase().padStart(2, "0");
    },
  };
}
