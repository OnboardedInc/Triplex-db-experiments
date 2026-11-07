/**
 * Dates and instants (SPEC 2 and 6.1; SPEC 14 rows 3 to 7).
 *
 * Dates are handled as day numbers (days since 1970-01-01, proleptic Gregorian) with integer arithmetic only, never with a
 * `Date`, so no local time zone and no fractional value can enter (SPEC 14 row 4). Every quotient below is of non-negative
 * integers far below 2^53, so `Math.floor(a / b)` is exact integer division. Instants are never converted: they are compared as
 * strings (SPEC 2, SPEC 14 row 3).
 */

const div = (a: number, b: number): number => Math.floor(a / b);

/** Day number of a proleptic Gregorian civil date (H. Hinnant's days_from_civil). */
export function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = div(yy, 400);
  const yoe = yy - era * 400;
  const mp = m > 2 ? m - 3 : m + 9;
  const doy = div(153 * mp + 2, 5) + d - 1;
  const doe = yoe * 365 + div(yoe, 4) - div(yoe, 100) + doy;
  return era * 146097 + doe - 719468;
}

/** The civil date of a day number (H. Hinnant's civil_from_days), formatted `YYYY-MM-DD` with a four-digit year. */
export function formatDay(z: number): string {
  const zz = z + 719468;
  const era = div(zz, 146097);
  const doe = zz - era * 146097;
  const yoe = div(doe - div(doe, 1460) + div(doe, 36524) - div(doe, 146096), 365);
  const doy = doe - (365 * yoe + div(yoe, 4) - div(yoe, 100));
  const mp = div(5 * doy + 2, 153);
  const d = doy - div(153 * mp + 2, 5) + 1;
  const m = mp < 10 ? mp + 3 : mp - 9;
  const y = yoe + era * 400 + (m <= 2 ? 1 : 0);
  return String(y).padStart(4, "0") + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function digits(s: string, from: number, count: number): number {
  let v = 0;
  for (let k = from; k < from + count; k++) {
    const c = s.charCodeAt(k) - 0x30;
    if (c < 0 || c > 9) return -1;
    v = v * 10 + c;
  }
  return v;
}

/**
 * The day number of a SPEC 2 `date`: `YYYY-MM-DD`, a real proleptic Gregorian date with year 2000 to 2099. Returns -1 for
 * anything else. Every valid date has a positive day number (2000-01-01 is day 10957).
 */
export function parseDate(s: string): number {
  if (s.length !== 10 || s.charCodeAt(4) !== 0x2d || s.charCodeAt(7) !== 0x2d) return -1;
  const y = digits(s, 0, 4);
  const m = digits(s, 5, 2);
  const d = digits(s, 8, 2);
  if (y < 2000 || y > 2099 || m < 1 || m > 12 || d < 1) return -1;
  const dim = m === 2 && isLeap(y) ? 29 : MONTH_DAYS[m - 1]!;
  if (d > dim) return -1;
  return daysFromCivil(y, m, d);
}

/**
 * SPEC 2 `instant`: exactly 27 characters `YYYY-MM-DDTHH:MM:SS.ffffffZ`, the date part a valid `date`, hour 00 to 23, minute
 * and second 00 to 59 (no leap second), six fractional digits.
 */
export function isInstant(s: string): boolean {
  if (s.length !== 27) return false;
  if (
    s.charCodeAt(10) !== 0x54 ||
    s.charCodeAt(13) !== 0x3a ||
    s.charCodeAt(16) !== 0x3a ||
    s.charCodeAt(19) !== 0x2e ||
    s.charCodeAt(26) !== 0x5a
  )
    return false;
  if (parseDate(s.slice(0, 10)) < 0) return false;
  const hh = digits(s, 11, 2);
  const mi = digits(s, 14, 2);
  const ss = digits(s, 17, 2);
  if (hh < 0 || hh > 23 || mi < 0 || mi > 59 || ss < 0 || ss > 59) return false;
  return digits(s, 20, 6) >= 0;
}

/** ISO weekday of a day number, 1 = Monday to 7 = Sunday (SPEC 6.1). Day 0, 1970-01-01, was a Thursday. */
export function weekday(z: number): number {
  return ((((z + 3) % 7) + 7) % 7) + 1;
}

/**
 * SPEC 6.1 `addBusinessDays(d, n)`, n >= 1: step forward one calendar day at a time from d, count each day with weekday 1 to 5,
 * and return the day on which the count reaches n. d itself is never counted; there are no holidays (SPEC 14 row 5).
 */
export function addBusinessDays(z: number, n: number): number {
  let count = 0;
  let d = z;
  while (count < n) {
    d++;
    if (weekday(d) <= 5) count++;
  }
  return d;
}

/** SPEC 6.1 `startOf(d)`: the instant at midnight UTC that starts day d. */
export const startOfDay = (z: number): string => formatDay(z) + "T00:00:00.000000Z";

/** SPEC 6.1 `endOfDay(d) = startOf(addDays(d, 1))`: due by the end of day d means due at the next midnight (SPEC 14 row 6). */
export const endOfDay = (z: number): string => startOfDay(z + 1);

/** SPEC 6.1 `startOf(d)` for a date string that has already been validated. */
export const startOfDate = (d: string): string => d + "T00:00:00.000000Z";
