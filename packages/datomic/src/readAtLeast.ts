// [DX-RD4] Why: a reader that holds a write receipt reads "at least" the receipt's position on every unpinned read, so a
// read after an acknowledged write is never answered from before it, on any gateway. The gateway waits on its own peer
// (no transactor round trip) and answers at its head. The holder only rises; pinned reads and the feed ignore it.
// Rejected: the caller repeating the position on every call; a sync with the transactor on every unpinned read.

/** What one unpinned read asks the gateway for. */
export interface ReadAtLeastRequest {
  readonly position: number;
  /** Bound on the gateway's wait, 1 to 2,000 ms (the gateway's default is 500). */
  readonly waitMs?: number;
}

const checkPosition = (position: number) => {
  if (!Number.isSafeInteger(position) || position < 0) throw new RangeError("Invalid at-least position");
  return position;
};
export const checkAtLeastRequest = (request: ReadAtLeastRequest): ReadAtLeastRequest => {
  checkPosition(request.position);
  if (
    request.waitMs !== undefined &&
    (!Number.isSafeInteger(request.waitMs) || request.waitMs < 1 || request.waitMs > 2000)
  )
    throw new RangeError("At-least wait must be 1..2000 ms");
  return request;
};

/** The lowest position this reader accepts on an unpinned read. Built from a receipt, raised by later receipts. */
export class ReadAtLeast {
  #position: number;
  readonly waitMs: number | undefined;
  constructor(position = 0, options: { readonly waitMs?: number } = {}) {
    this.#position = checkPosition(position);
    this.waitMs = options.waitMs;
    checkAtLeastRequest({ position, ...(options.waitMs === undefined ? {} : { waitMs: options.waitMs }) });
  }
  static fromReceipt(receipt: { readonly position: number }, options?: { readonly waitMs?: number }) {
    return new ReadAtLeast(receipt.position, options);
  }
  get position() {
    return this.#position;
  }
  /** Raise the floor to a later receipt or position; a lower one leaves it unchanged. */
  raise(to: number | { readonly position: number }): this {
    this.#position = Math.max(this.#position, checkPosition(typeof to === "number" ? to : to.position));
    return this;
  }
  /** The request for one unpinned read, or undefined while the floor is 0 (every head satisfies it). */
  request(): ReadAtLeastRequest | undefined {
    if (this.#position === 0) return undefined;
    return this.waitMs === undefined
      ? { position: this.#position }
      : { position: this.#position, waitMs: this.waitMs };
  }
}
