/**
 * Exact int64 sums for the XTDB native task library, one helper per language (EXP-X02).
 *
 * [EXP-X02] Why: XTDB 2.2.0 `SUM` over BIGINT wraps silently in SQL and XTQL alike (three
 * values of 2^62 sum to -4611686018427387904). The aggregate accumulator increments with an
 * unchecked `+`, while scalar `+`, `-` and `*` on BIGINT are checked. Acceptance RULINGS Q8a
 * asks for the exact total, or a typed integer-overflow error only when the final total is
 * outside int64. Inspired by: R12 section 7.3 (32-bit halves); R6; references/xtdb @ c6c1962
 * core/src/main/kotlin/xtdb/arrow/LongVector.kt:30-33 (unchecked increment),
 * core/src/main/clojure/xtdb/expression.clj:877-883, 895-901, 919-925 (Math/addExact,
 * subtractExact, multiplyExact), 1014-1017 (integer `/` truncates toward zero).
 *
 * Algorithm. Each addend n is written n = hi * K + lo with K = 2^32, hi = n / K (truncating)
 * and lo = n - hi * K, so |hi| <= 2^31 and |lo| < 2^32. With fewer than 2^30 addends per side,
 * the engine's unchecked sums of hi and of lo cannot wrap, and H = sum(hi) (minus the refund
 * side's, workload 08) and L = sum(lo) (likewise) stay below 2^62 and 2^63 in magnitude.
 * Normalize L by floor division: q = L / K (truncating), r = L - q * K, carry = q - [r < 0],
 * rem = r + K * [r < 0], so 0 <= rem < K and the total T = (H + carry) * K + rem exactly.
 *
 * Why the floor step (a deviation from R12's `(+ (* shi K) slo)`): R12's form raises an
 * overflow error for some totals inside int64. Example: 2^63-1, 2^32, -(2^32-1), -(2^32-1)
 * sum to 2^63 - 2^32 + 1, but sum(hi) = 2^31 and 2^31 * 2^32 = 2^63 overflows. With
 * rem >= 0, (H + carry) * K = T - rem lies in [T - K + 1, T]; it is a multiple of K and
 * -2^63 is a multiple of K, so it fits int64 whenever T does; adding rem then yields T. If T
 * is outside int64, the checked multiply or the checked add must fail, because without a
 * failure the result would equal T. So the engine's overflow error occurs iff T is outside
 * int64, which is what lets xtdb-native-errors.ts map it to the typed error.
 *
 * Rejected: `SUM(CAST(x AS DECIMAL(38,0)))` for SQL only (exact on the dev slot, but it needs a
 * second, language-specific range check and proof); host-side recombination of (H, L) (also
 * exact, but the brief asks for the recombination in the query's language); `union-all` and
 * window functions (not plannable in 2.2.0, and not needed).
 */

export const SPLIT = "4294967296";

const xtqlName = (name: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new TypeError("Invalid XTQL exact-sum name");
  return name;
};
const sqlName = (name: string) => {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new TypeError("Invalid SQL exact-sum name");
  return name;
};

/** XTQL: append to a view whose int64 addend column is `n`; binds `hi` and `lo`. */
export const xtqlSplit = (n = "n") =>
  `(with {:hi (/ ${xtqlName(n)} ${SPLIT})}) (with {:lo (- ${xtqlName(n)} (* hi ${SPLIT}))})`;

/**
 * XTQL: tail after an aggregate that produced the hi and lo sums.
 * `high` and `low` are lists of [plus, minus] sum columns; `keep` are grouping columns that
 * stay in the returned row; the total is returned as exact decimal text in column `out`.
 */
export const xtqlExactTotal = (
  high: readonly [string, string?],
  low: readonly [string, string?],
  out: string,
  keep: readonly string[] = [],
) => {
  const term = ([plus, minus]: readonly [string, string?]) =>
    minus === undefined
      ? `(coalesce ${xtqlName(plus)} 0)`
      : `(- (coalesce ${xtqlName(plus)} 0) (coalesce ${xtqlName(minus)} 0))`;
  const kept = keep.map((name) => `:${xtqlName(name)} ${name}`).join(" ");
  return [
    `(with {:x02_h ${term(high)} :x02_l ${term(low)}})`,
    `(with {:x02_q (/ x02_l ${SPLIT})})`,
    `(with {:x02_r (- x02_l (* x02_q ${SPLIT}))})`,
    `(return {${kept ? kept + " " : ""}:${xtqlName(out)} (cast (+ (* (+ x02_h (if (< x02_r 0) (- x02_q 1) x02_q)) ${SPLIT}) (if (< x02_r 0) (+ x02_r ${SPLIT}) x02_r)) #xt/type :utf8)})`,
  ].join(" ");
};

const K = `CAST(${SPLIT} AS BIGINT)`;
/** SQL: the hi half of an int64 expression. */
export const sqlHigh = (n: string) => `((${n}) / ${K})`;
/** SQL: the lo half of an int64 expression. */
export const sqlLow = (n: string) => `((${n}) - ((${n}) / ${K}) * ${K})`;

/**
 * SQL: CTEs that turn `aggregate` (a SELECT producing the `keep` columns plus x02_h and x02_l)
 * into the exact decimal text total in column `out`. Use as `WITH f AS ..., ${sqlExactTotal(...)}`.
 */
export const sqlExactTotal = (aggregate: string, out: string, keep: readonly string[] = []) => {
  const kept = keep.map((name) => `${sqlName(name)}, `).join("");
  return `x02_sum AS (${aggregate}), x02_quotient AS (SELECT ${kept}x02_h, x02_l, x02_l / ${K} AS x02_q FROM x02_sum), x02_rest AS (SELECT ${kept}x02_h, x02_q, x02_l - x02_q * ${K} AS x02_r FROM x02_quotient) SELECT ${kept}CAST((x02_h + CASE WHEN x02_r < 0 THEN x02_q - 1 ELSE x02_q END) * ${K} + CASE WHEN x02_r < 0 THEN x02_r + ${K} ELSE x02_r END AS TEXT) AS ${sqlName(out)} FROM x02_rest`;
};

/**
 * The same arithmetic on exact integers with int64-checked operations, for unit tests of the
 * algorithm (not used on the query path). Throws RangeError where the engine raises its
 * `overflow error`; `naive` reproduces R12's recombination for the counterexample above.
 */
export const simulateExactSum = (values: readonly bigint[], naive = false): bigint => {
  const MIN = -(2n ** 63n),
    MAX = 2n ** 63n - 1n,
    k = 2n ** 32n;
  const checked = (value: bigint) => {
    if (value < MIN || value > MAX) throw new RangeError("overflow error");
    return value;
  };
  const trunc = (a: bigint, b: bigint) => a / b; // BigInt division truncates toward zero
  let high = 0n,
    low = 0n;
  for (const n of values) {
    checked(n);
    const hi = trunc(n, k),
      lo = checked(n - checked(hi * k));
    high = BigInt.asIntN(64, high + hi); // the engine's unchecked accumulator
    low = BigInt.asIntN(64, low + lo);
  }
  if (naive) return checked(checked(high * k) + low);
  const q = trunc(low, k),
    r = checked(low - checked(q * k));
  const carry = r < 0n ? checked(q - 1n) : q,
    rem = r < 0n ? checked(r + k) : r;
  return checked(checked(checked(high + carry) * k) + rem);
};
