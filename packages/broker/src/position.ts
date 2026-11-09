/**
 * Broker positions (RULINGS Q31c, TARGETS 4.1 item 3).
 *
 * A position is (stream, epoch, offset, ordinal), ordered lexicographically: the stream is the broker
 * log (one per scope), the offset is the frame's LSN, and the ordinal is a Triplex transact's place
 * inside that frame (a commit group holds several commands, and nested transacts take consecutive
 * ordinals). Triplex positions are one safe integer, so the broker packs `lsn * ORDINALS + ordinal`.
 *
 * Why the epoch is not packed: LSNs never restart. An EPOCH_BEGIN frame takes the next LSN (and burns
 * the in-flight LSN after a torn tail, frame.ts), so LSN order equals (epoch, LSN) order and the packed
 * number is order preserving without epoch bits. The feed and every receipt report the epoch alongside.
 *
 * Why 1,024 ordinals: the applier and the decision loop cap a commit group at 64 commands (EXP-P2Q brief
 * point 2, R17 2.3); 1,024 leaves 16 nested transacts per command on average and the broker closes a
 * group early rather than exceed it. 2^53 / 1,024 is about 8.8e12 frames.
 *
 * Positions are not dense: the ordinals a frame does not use and the LSNs of non-commit frames hold no
 * transact. Every position at or below the durable watermark is either a committed transact or known
 * not to exist (Q31c "fully resolved prefix").
 */
export const ORDINALS = 1024;
export const MAX_LSN = Math.floor(Number.MAX_SAFE_INTEGER / ORDINALS) - 1;

export const packPosition = (lsn: number, ordinal: number): number => {
  if (!Number.isSafeInteger(lsn) || lsn < 0 || lsn > MAX_LSN)
    throw new RangeError("LSN out of range");
  if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= ORDINALS)
    throw new RangeError("Ordinal out of range");
  return lsn * ORDINALS + ordinal;
};
export const lsnOf = (position: number): number => Math.floor(position / ORDINALS);
export const ordinalOf = (position: number): number => position % ORDINALS;
/** The highest position a frame can hold; a basis at or above it covers the whole frame. */
export const lastPositionOf = (lsn: number): number => lsn * ORDINALS + (ORDINALS - 1);

export interface BrokerPosition {
  readonly stream: string;
  readonly epoch: number;
  readonly lsn: number;
  readonly ordinal: number;
  readonly packed: number;
}
