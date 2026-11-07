/** Deterministic randomness and hashing for the NS driver (no dependencies). */

/** mulberry32: small, fast, deterministic 32-bit PRNG. Returns floats in [0, 1). */
export class Rng {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  /** Exponential inter-arrival with the given rate (events per unit). */
  exp(rate: number): number {
    return -Math.log(1 - this.next()) / rate;
  }
}

/** Two independent 32-bit hashes of a string (cyrb53 construction). */
export function hash2(text: string, seed = 0): [number, number] {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}

/** Seed number derived from a label, so every stream is named and reproducible. */
export const seedOf = (label: string): number => hash2(label)[0];

/**
 * Order-independent multiset digest: the sum of member hashes modulo 2^32 in two lanes.
 * Adding a member and removing it again returns to the same digest, so expected worlds can be
 * computed as a seed digest plus per-commit deltas.
 */
export class Digest {
  a = 0;
  b = 0;
  n = 0;
  add(member: string): this {
    const [x, y] = hash2(member);
    this.a = (this.a + x) >>> 0;
    this.b = (this.b + y) >>> 0;
    this.n++;
    return this;
  }
  remove(member: string): this {
    const [x, y] = hash2(member);
    this.a = (this.a - x) >>> 0;
    this.b = (this.b - y) >>> 0;
    this.n--;
    return this;
  }
  plus(other: { a: number; b: number; n: number }): this {
    this.a = (this.a + other.a) >>> 0;
    this.b = (this.b + other.b) >>> 0;
    this.n += other.n;
    return this;
  }
  hex(): string {
    return `${this.a.toString(16).padStart(8, "0")}${this.b.toString(16).padStart(8, "0")}:${this.n}`;
  }
}
