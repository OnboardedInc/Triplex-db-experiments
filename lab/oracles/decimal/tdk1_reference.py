#!/usr/bin/env python3
"""R20 property test for the recommended decimal order key ("TDK1").

stdlib only.  Run:  python3 -I decimal_key_test.py [seed]

What it checks (plain codepoint / unsigned-byte order only; no engine, no ICU):
  1. Exhaustive: every value of several small (precision, scale) domains, in
     ascending numeric order, gives strictly ascending keys, and decode(encode(v))
     renders back to the exact canonical text with the declared scale.
  2. Random pairs across (precision 1..38, scale 0..precision), including pairs
     with DIFFERENT (precision, scale): sign(key_a ? key_b) == sign(Fraction_a ? Fraction_b).
  3. Adjacent values (v and v + 1 ulp), carry boundaries (99..9 vs 100..0, 0.99..9 vs 1,
     tiny values), domain min and max for every (p, s) up to p = 38.
  4. Normalization: 1.1, 1.10, 1.100 (and any trailing-zero variant) share one key.
  5. Decoder strictness / bijection: random strings over the key alphabet either fail to
     decode or re-encode to themselves, so no two keys decode to the same value.
  6. Negative zero is rejected, never normalized.
  7. Mutation controls: five deliberately broken encoders must FAIL the same suite, so
     the suite is shown able to fail.
  8. Alternatives for the scale question (report Q3): TDF (fixed-width offset-binary,
     key depends on precision and scale) and TDH (fixed-width integer part + stripped fraction,
     key depends on integer digits only).  Both are order-correct inside one declaration;
     the test shows which of them keep their keys when the declaration widens.
"""
import random
import re
import sys
from decimal import Decimal
from fractions import Fraction

MAX_INT_DIGITS = 99          # capacity of the two-digit length field
KERNEL_MAX_PRECISION = 38    # RULINGS Q22 kernel maximum
DIGITS = "0123456789"
_COMP = str.maketrans("0123456789", "9876543210")


class DecimalKeyError(ValueError):
    pass


# ---------------------------------------------------------------- encoding ---

def split(d, strip_frac=True):
    """(negative, I, F): I = integer digits without leading zeros, F = fraction digits
    without trailing zeros.  Rejects NaN, Infinity, negative zero, oversize values.
    strip_frac=False exists only so a mutant can keep trailing zeros."""
    if not isinstance(d, Decimal) or not d.is_finite():
        raise DecimalKeyError("not a finite Decimal")
    sign, digs, exp = d.as_tuple()
    if d.adjusted() >= MAX_INT_DIGITS and any(digs):
        raise DecimalKeyError("integer part has more than 99 digits")
    if exp < -10_000:
        raise DecimalKeyError("too many fractional digits")
    s = "".join(map(str, digs))
    if exp >= 0:
        i, f = s + "0" * exp, ""
    else:
        n = -exp
        if len(s) <= n:
            i, f = "", "0" * (n - len(s)) + s
        else:
            i, f = s[:-n], s[-n:]
    i, f = i.lstrip("0"), (f.rstrip("0") if strip_frac else f)
    if not i and not f.strip("0"):
        if sign:
            raise DecimalKeyError("negative zero is rejected")
        return False, "", ""
    if len(i) > MAX_INT_DIGITS:
        raise DecimalKeyError("integer part has more than 99 digits")
    return bool(sign), i, f


def encode(d):
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    if not neg:
        return "p%02d%s%s" % (len(i), i, f)
    return "n%02d%s%sz" % (99 - len(i), i.translate(_COMP), f.translate(_COMP))


def decode(key):
    """Strict inverse of encode.  Raises DecimalKeyError for anything encode cannot emit."""
    if not isinstance(key, str) or not key:
        raise DecimalKeyError("empty key")
    if key == "o":
        return Decimal(0)
    if key[0] == "p":
        neg, body = False, key[1:]
    elif key[0] == "n":
        if len(key) < 4 or key[-1] != "z":
            raise DecimalKeyError("negative key without terminator")
        neg, body = True, key[1:-1]
    else:
        raise DecimalKeyError("bad class marker")
    if len(body) < 2 or any(c not in DIGITS for c in body):
        raise DecimalKeyError("bad body")
    ll, rest = int(body[:2]), body[2:]
    if neg:
        ll, rest = 99 - ll, rest.translate(_COMP)
    if len(rest) < ll:
        raise DecimalKeyError("length field exceeds body")
    i, f = rest[:ll], rest[ll:]
    if (i and i[0] == "0") or (f and f[-1] == "0") or (not i and not f):
        raise DecimalKeyError("non-canonical digits")
    return Decimal(("-" if neg else "") + (i or "0") + ("." + f if f else ""))


def parse_text(text):
    """Strict input grammar: -?(0|[1-9][0-9]*)(\\.[0-9]+)?  ; negative zero rejected."""
    if not re.fullmatch(r"-?(0|[1-9][0-9]*)(\.[0-9]+)?", text, re.ASCII):
        raise DecimalKeyError("bad decimal text")
    d = Decimal(text)
    split(d)  # rejects -0
    return d


def render(d, scale):
    """Canonical text with exactly `scale` fractional digits."""
    neg, i, f = split(d)
    if len(f) > scale:
        raise DecimalKeyError("more fractional digits than scale")
    return ("-" if neg else "") + (i or "0") + ("." + f.ljust(scale, "0") if scale else "")


def in_domain(d, p, s):
    neg, i, f = split(d)
    return len(f) <= s and len(i) <= p - s


# -------------------------------------------------------------- generators ---

def make(n, s):
    """Decimal with unscaled integer n and exponent -s (exact)."""
    sign = 1 if n < 0 else 0
    return Decimal((sign, tuple(int(c) for c in str(abs(n))), -s))


def rand_unscaled(p, rng):
    nd = rng.randint(0, p)
    mode = rng.choice(("uniform", "zeros", "nines", "ones", "edge"))
    if mode == "uniform":
        ds = [rng.randrange(10) for _ in range(nd)]
    elif mode == "zeros":
        ds = [0 if rng.random() < 0.8 else rng.randrange(10) for _ in range(nd)]
    elif mode == "nines":
        ds = [9 if rng.random() < 0.8 else rng.randrange(10) for _ in range(nd)]
    elif mode == "ones":
        ds = [1 if rng.random() < 0.8 else rng.randrange(10) for _ in range(nd)]
    else:
        ds = [rng.choice((0, 1, 9)) for _ in range(nd)]
    n = int("".join(map(str, ds))) if ds else 0
    return -n if rng.random() < 0.5 else n


def rand_value(rng):
    p = rng.randint(1, KERNEL_MAX_PRECISION)
    s = rng.randint(0, p)
    return make(rand_unscaled(p, rng), s), p, s


def sgn(x):
    return (x > 0) - (x < 0)


def cmp_str(a, b):
    return sgn((a > b) - (a < b))


def cmp_bytes(a, b):
    x, y = a.encode("utf-8"), b.encode("utf-8")
    return sgn((x > y) - (x < y))


# ------------------------------------------------------------------ suites ---

def check_pair(enc, a, b, fails, tag=""):
    ka, kb = enc(a), enc(b)
    want = sgn((Fraction(a) > Fraction(b)) - (Fraction(a) < Fraction(b)))
    for name, got in (("str", cmp_str(ka, kb)), ("utf8", cmp_bytes(ka, kb))):
        if got != want:
            fails.append((tag, name, str(a), str(b), ka, kb, want, got))
            return False
    return True


def suite_random_pairs(enc, rng, n):
    fails = []
    for _ in range(n):
        (a, _, _), (b, _, _) = rand_value(rng), rand_value(rng)
        check_pair(enc, a, b, fails, "random")
        # equal numeric values with different scale presentation must give equal keys
        if Fraction(a) == Fraction(b) and enc(a) != enc(b):
            fails.append(("random-equal", "key", str(a), str(b), enc(a), enc(b), 0, 1))
    return fails


def suite_adjacent_and_boundaries(enc, rng, n):
    fails = []
    for _ in range(n):
        v, p, s = rand_value(rng)
        nxt = make(int(Fraction(v) * 10 ** s) + 1, s)  # exact: v.scaleb(s) rounds to the 28-digit default context (orchestrator fix, Codex round 4 finding 7)
        check_pair(enc, v, nxt, fails, "adjacent")
    for p in range(1, KERNEL_MAX_PRECISION + 1):
        for s in range(0, p + 1):
            top = make(10 ** p - 1, s)
            ulp = make(1, s)
            chain = [make(-(10 ** p - 1), s), make(-(10 ** p - 1) + 1, s), -ulp, make(0, s),
                     ulp, make(10 ** p - 2, s), top]
            for lo, hi in zip(chain, chain[1:]):
                check_pair(enc, lo, hi, fails, "boundary-domain")
            # carry boundaries: 9..9 -> 10..0 in the integer part, 0.9..9 -> 1, 0.0..01 vs 0.0..1
            if p - s >= 1:
                nines = make((10 ** (p - s) - 1) * 10 ** s, s)
                check_pair(enc, nines, make(10 ** p, s), fails, "boundary-carry")
                check_pair(enc, make(-(10 ** p), s), -nines, fails, "boundary-carry-neg")
            if s >= 1:
                check_pair(enc, make(10 ** s - 1, s), make(10 ** s, s), fails, "boundary-fraction-carry")
                check_pair(enc, make(1, s), make(10, s), fails, "boundary-tiny")
    return fails


def suite_exhaustive(enc, p, s):
    fails = []
    prev_key = None
    top = 10 ** p - 1
    for n in range(-top, top + 1):
        v = make(n, s)
        k = enc(v)
        if prev_key is not None and not (prev_key < k and prev_key.encode() < k.encode()):
            fails.append(("exhaustive-order", p, s, n, prev_key, k))
            if len(fails) > 5:
                break
        prev_key = k
        if enc is encode:  # decode checks apply to the real encoder only
            text = ("-" if n < 0 else "") + (str(abs(n) // 10 ** s)) + (
                "." + str(abs(n) % 10 ** s).rjust(s, "0") if s else "")
            if render(decode(k), s) != text or render(v, s) != text:
                fails.append(("exhaustive-roundtrip", p, s, n, text, render(decode(k), s)))
                if len(fails) > 5:
                    break
    return fails


# ---------------------------------------------------------------- mutants ----

def _mut_no_terminator(d):
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    return ("n%02d%s%s" % (99 - len(i), i.translate(_COMP), f.translate(_COMP))) if neg \
        else "p%02d%s%s" % (len(i), i, f)


def _mut_length_not_complemented(d):
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    return ("n%02d%s%sz" % (len(i), i.translate(_COMP), f.translate(_COMP))) if neg \
        else "p%02d%s%s" % (len(i), i, f)


def _mut_digits_not_complemented(d):
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    return ("n%02d%s%sz" % (99 - len(i), i, f)) if neg else "p%02d%s%s" % (len(i), i, f)


def _mut_no_length_prefix(d):
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    return ("n%s%sz" % (i.translate(_COMP), f.translate(_COMP))) if neg else "p%s%s" % (i, f)


def _mut_keep_trailing_zeros(d):
    # key depends on the presentation scale of the Decimal, not just on its value
    neg, i, f = split(d, strip_frac=False)
    if not i and not f.strip("0"):
        return "o"
    return ("n%02d%s%sz" % (99 - len(i), i.translate(_COMP), f.translate(_COMP))) if neg \
        else "p%02d%s%s" % (len(i), i, f)


MUTANTS = {
    "negatives without terminator": _mut_no_terminator,
    "negative length field not complemented": _mut_length_not_complemented,
    "negative digits not complemented": _mut_digits_not_complemented,
    "no length prefix": _mut_no_length_prefix,
    "trailing zeros kept (1.10 != 1.1)": _mut_keep_trailing_zeros,
}



# ---------------------------------------------------- alternatives (report Q3) ---

def tdf_encode(n, p):
    """TDF: offset-binary on the scaled integer n, fixed width p+1 digits.  Depends on p and s."""
    assert -(10 ** p) < n < 10 ** p
    return str(n + 10 ** p).rjust(p + 1, "0")


def tdh_encode(d, w):
    """TDH: class marker + integer part zero-padded to the fixed width w + stripped fraction.
    Negatives complemented and terminated like TDK1.  Depends on w = p - s only."""
    neg, i, f = split(d)
    if not i and not f:
        return "o"
    if len(i) > w:
        raise DecimalKeyError("integer part wider than w")
    i = i.rjust(w, "0")
    if not neg:
        return "p" + i + f
    return "n" + i.translate(_COMP) + f.translate(_COMP) + "z"


def alternatives(rng):
    bad = 0
    # order inside one declaration, exhaustive
    for p, s in ((4, 2), (5, 0), (5, 3)):
        top = 10 ** p - 1
        prev_f = prev_h = None
        for n in range(-top, top + 1):
            kf, kh = tdf_encode(n, p), tdh_encode(make(n, s), p - s)
            if prev_f is not None and not (prev_f < kf and prev_h < kh):
                bad += 1
            prev_f, prev_h = kf, kh
    print("alternatives, exhaustive order inside one declaration (TDF, TDH) failures=%d" % bad)
    # widening: scale s -> s2 >= s, precision p -> p2 >= p + (s2 - s)  (Q31g metadata-only case)
    same_f = same_h = same_k = grow_h = total = nonzero = 0
    for _ in range(50_000):
        p = rng.randint(1, 30)
        s = rng.randint(0, p)
        n = rand_unscaled(p, rng)
        s2 = s + rng.randint(1, 8)
        p2 = p + (s2 - s)                      # integer digits preserved
        n2 = n * 10 ** (s2 - s)
        total += 1
        same_f += tdf_encode(n, p) == tdf_encode(n2, p2)
        same_h += tdh_encode(make(n, s), p - s) == tdh_encode(make(n2, s2), p2 - s2)
        same_k += encode(make(n, s)) == encode(make(n2, s2))
        p3 = p2 + rng.randint(1, 5)            # integer digits grow as well
        if n != 0:
            nonzero += 1
            grow_h += tdh_encode(make(n, s), p - s) == tdh_encode(make(n2, s2), p3 - s2)
    print("widening with integer digits preserved, %d values:" % total)
    print("  key unchanged  TDK1=%d  TDH=%d  TDF=%d" % (same_k, same_h, same_f))
    print("widening where integer digits also grow (nonzero values): TDH key unchanged for %d of %d; TDK1 key is a function of the value alone, so unchanged for all" % (grow_h, nonzero))
    # TDF keys of values stored under different (p, s) must not be compared in the engine
    a, b = make(5, 0), make(50, 2)              # 5 (attribute p=3,s=0) and 0.50 (attribute p=3,s=2)
    ka, kb = tdf_encode(5, 3), tdf_encode(50, 3)
    print("cross-declaration compare 5 (p=3,s=0) vs 0.50 (p=3,s=2): TDF keys %s vs %s -> engine says 5 %s 0.50 (value says >); TDK1 says 5 %s 0.50"
          % (ka, kb, "<" if ka < kb else ">", ">" if encode(a) > encode(b) else "<"))
    return bad


# -------------------------------------------------------------------- main ---

def main(argv):
    seed = int(argv[1]) if len(argv) > 1 else 20261107
    rng = random.Random(seed)
    print("seed", seed, "python", sys.version.split()[0])
    total_fail = 0

    # 1. exhaustive domains
    for p, s in ((3, 0), (4, 2), (5, 0), (5, 2), (5, 5), (6, 6)):
        f = suite_exhaustive(encode, p, s)
        n = 2 * (10 ** p - 1) + 1
        print("exhaustive  p=%d s=%d  values=%d  failures=%d" % (p, s, n, len(f)))
        total_fail += len(f)

    # 2. random pairs (also cross-scale, cross-precision)
    f = suite_random_pairs(encode, rng, 400_000)
    print("random pairs 400000 (mixed p,s, precision 1..38)  failures=%d" % len(f))
    total_fail += len(f)

    # 3. adjacent values and boundaries
    f = suite_adjacent_and_boundaries(encode, rng, 100_000)
    print("adjacent 100000 + boundaries p<=38,s<=p  failures=%d" % len(f))
    total_fail += len(f)

    # 4. normalization
    bad = 0
    for _ in range(20_000):
        v, p, s = rand_value(rng)
        for extra in (1, 3, 7):
            w = Decimal((v.as_tuple().sign, v.as_tuple().digits + (0,) * extra, v.as_tuple().exponent - extra))
            if Fraction(w) != Fraction(v) or encode(w) != encode(v):
                bad += 1
    assert encode(Decimal("1.1")) == encode(Decimal("1.10")) == encode(Decimal("1.100"))
    print("normalization (20000 values x 3 zero-extended forms)  failures=%d" % bad)
    total_fail += bad

    # 5. decoder strictness and injectivity of decode on the valid set
    alpha = "0123456789nopz"
    seen = {}
    valid = invalid = bad = 0
    for _ in range(600_000):
        k = "".join(rng.choice(alpha) for _ in range(rng.randint(1, 9)))
        if rng.random() < 0.5:
            k = rng.choice("nop") + k
        try:
            d = decode(k)
        except DecimalKeyError:
            invalid += 1
            continue
        valid += 1
        if encode(d) != k:
            bad += 1
        if d in seen and seen[d] != k:
            bad += 1
        seen[d] = k
    print("decoder strictness 600000 random strings: valid=%d rejected=%d  failures=%d" % (valid, invalid, bad))
    total_fail += bad

    # 6. negative zero and malformed text
    rej = 0
    for t in ("-0", "-0.0", "-0.00", "-0.000000000000000000000000000000000000"):
        try:
            parse_text(t)
        except DecimalKeyError:
            rej += 1
    for dz in (Decimal("-0"), Decimal("-0.00")):
        try:
            encode(dz)
        except DecimalKeyError:
            rej += 1
    for t in ("+1", "01", "1.", ".5", "1e3", " 1", "1 ", "1,5", "0x10", "١٢"):
        try:
            parse_text(t)
            print("  ACCEPTED malformed text", repr(t))
            total_fail += 1
        except DecimalKeyError:
            rej += 1
    assert encode(Decimal("0")) == encode(Decimal("0.00")) == "o"
    print("negative zero / malformed text rejected: %d of 16 expected  (%s)" % (rej, "ok" if rej == 16 else "FAIL"))
    total_fail += 0 if rej == 16 else 1

    # 7. key shape: alphabet and length
    maxlen = 0
    rt_bad = 0
    for _ in range(200_000):
        p = rng.randint(1, KERNEL_MAX_PRECISION)
        s = rng.randint(0, p)
        n = rand_unscaled(p, rng)
        v = make(n, s)
        k = encode(v)
        if not re.fullmatch(r"[0-9a-z]+", k):
            total_fail += 1
        maxlen = max(maxlen, len(k))
        text = ("-" if n < 0 else "") + str(abs(n) // 10 ** s) + ("." + str(abs(n) % 10 ** s).rjust(s, "0") if s else "")
        back = decode(k)
        if back != v or render(back, s) != text or encode(parse_text(text)) != k or not in_domain(v, p, s):
            rt_bad += 1
    print("round trip text -> key -> text with declared scale, 200000 random (p,s,n)  failures=%d" % rt_bad)
    total_fail += rt_bad
    k38 = encode(make(-(10 ** 38 - 1), 0))
    print("alphabet [0-9a-z] ok; max key length seen %d; worst case 38-digit negative integer key length %d" % (maxlen, len(k38)))
    assert len(k38) == 42

    # 8. mutation controls
    print("mutation controls (each must FAIL the suite):")
    for name, enc in MUTANTS.items():
        mrng = random.Random(seed + 1)
        fails = suite_random_pairs(enc, mrng, 20_000)
        fails += suite_adjacent_and_boundaries(enc, mrng, 2_000)
        for p, s in ((3, 0), (4, 2)):
            fails += suite_exhaustive(enc, p, s)
        verdict = "caught" if fails else "NOT CAUGHT"
        print("  %-42s failures=%-7d %s" % (name, len(fails), verdict))
        if not fails:
            total_fail += 1

    # 9. alternatives
    total_fail += alternatives(random.Random(seed + 2))

    print("TOTAL REAL-ENCODER FAILURES:", total_fail)
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
