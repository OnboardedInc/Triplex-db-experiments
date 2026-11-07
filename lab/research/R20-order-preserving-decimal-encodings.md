# R20: order-preserving decimal encodings (prior art, lane fit, scale, exactness, test)

Date 2026-11-07. Agent: R20 research. Nothing in `packages/` or the engines was touched; no Docker, no engine ran.

**North star line.** Correctness floor under Sam's numeric rule ("no silent precision loss", `lab/NORTH-STAR.md` item 3,
`lab/SCOPE.md` section 2 item 4): exact storage and round trip, order-preserving comparison for range-rule attributes, a hard
error and never a silent conversion. It moves none of P1 to P5 directly; the decimal kind (RULINGS Q18, Q22, Q31g, Q33b) cannot be
built until the string encoding for precision above 15 is chosen and proven.

**Labels.** [F] fact with a source. [I] inference, with the reasoning stated.

**Raw material** is in `/Users/sam/Claude/Projects/triplex-db-2/R20/`: `decimal_key_test.py` and its output
`decimal_key_test.out`, `icu_order_check.py` and `icu_order_check.out`, `icu_negative_example.out`, and `evidence-notes.md`
(URLs and paraphrased digests of every external source below).

---

## 0. Verdict table

| # | Question | Answer | Confidence |
| --- | --- | --- | --- |
| 1 | Prior art | Every ordered-key design for arbitrary decimals uses the same four ideas: a class prefix (negative < zero < positive), a magnitude-class field that sorts longer numbers higher, digits that are complemented for negatives with a terminator that keeps prefix order right, and normalization that strips trailing zeros (so 1.10 and 1.1 share a key and the scale is lost). The production encodings are binary (base-100 bytes). Two of them silently round or truncate beyond a size limit (OrderedBytes at 31 digits, Phoenix at 21 bytes, per the fetched source digests), which our rule forbids. | High [F] |
| 2 | Lane fit | **Recommended: TDK1**, a decimal-digit key over the alphabet `[0-9]` plus the letters `n o p z`. Plain codepoint and unsigned-byte order equal numeric order. XTDB 2.2.0 compares VARCHAR as unsigned UTF-8 bytes, so it works as is. QLever's ICU en_US order also equals it, **with no hex wrapping**, because the whole key lies inside `[0-9a-z]`, where ICU order and codepoint order agree. | High for codepoint and XTDB [F]; high for ICU [F] (own check on system ICU 78.1 plus R5's probe on the pinned QLever image for the same alphabet); engine-side run of these exact keys not done [I] |
| 3 | Scale (Q31g) | Yes, a fixed-width key can drop the exponent entirely when (p, s) is declared (offset-binary, TDF). The price: the key depends on (p, s), so every widening rewrites every key. A key that depends on the value alone (TDK1) stays valid under any widening, including growth of integer digits, and keeps correct order across attributes of different scale. | High [F, tested] |
| 4 | Exactness | TDK1 is a bijection between canonical decimal texts at the declared scale and keys. `-0.00` is refused, as RULINGS Q33b R-DEC-2 already rules; the reasons are in section 4. | High [F, tested] |
| 5 | Verification | Property test written and run with `python3 -I`: 0 failures over 6 exhaustive domains (2.62M values), 400k random pairs, 100k adjacent pairs plus every (p, s) boundary up to 38 digits, 200k round trips, 600k decoder-fuzz strings; 5 of 5 mutants caught. Engine-side plan in section 5. | High [F] |

**One conflict to resolve first.** The frozen contract text describes the string as "fixed-width, sign-aware"
(`lab/acceptance/ACCEPTANCE.md:278`, `lab/acceptance/build_contract.py:299`, `lab/acceptance/obligations.json:680`). TDK1 is not
fixed-width. Neither engine needs fixed width (section 2). Either the wording changes (contract version bump) or the fallback TDF
is used, at the cost described in section 3. See open question 1.

---

## 1. Prior art: how others make byte or string order equal numeric order

### 1.1 Comparison table

| System | Representation | Sign, zero, negatives | Magnitude class (exponent or length) | Digits | Trailing zeros (1.10 vs 1.1) | Max precision | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HBase `OrderedBytes` numeric | bytes | header byte per class: NEG_INF 0x07, NEG_LARGE 0x08, NEG_MED 0x09 to 0x13, NEG_SMALL 0x14, ZERO 0x15, POS_SMALL 0x16, POS_MED 0x17 to 0x21, POS_LARGE 0x22, POS_INF 0x23, NaN 0x26 in code (0x25 in its Javadoc). Negatives: ones' complement of mantissa (and of exponent for large) | base-100 exponent; 0 to 10 folded into the header byte, otherwise a varint after the header | base-100 digit X as byte 2X+1, last byte 2X (even byte marks the end) | stripped; decode of 1.10 returns 1.1, scale lost | **31 significant digits; `normalize()` rounds HALF_UP beyond that** | `hbase-common/.../util/OrderedBytes.java`, class Javadoc "Variable-length Numeric Encoding", `normalize`, `encodeNumeric` [F, remote digest] |
| SQLite4 key encoding | bytes | NaN 0x06, -inf 0x07, zero 0x15, +inf 0x23, same layout as above | same | same | stripped | not stated | `sqlite.org/src4/doc/trunk/www/key_encoding.wiki` [F]. OrderedBytes uses the same constants; that it derives from this design is [I] |
| CockroachDB DECIMAL in keys | bytes | tags: large-neg 0x1a, medium-neg 0x25-E, small-neg 0x26, zero, small-pos 0x28, medium-pos 0x29+E, large-pos 0x34; negatives: ones' complement of mantissa, terminator not complemented; **+0 and -0 share one encoding** | base-100 exponent; 0 to 10 in the tag, else uvarint (descending form for negatives) | base-100, 2X+1 / 2X, terminator | stripped; 1.0 and 1.000 share one key | not bounded in the digest | `pkg/util/encoding/decimal.go` (`EncodeDecimalAscending`, `encodeDecimal`, `decimalEandM`, `encodeEandM`); `docs/tech-notes/encoding.md` "Composite encoding" [F, remote digest] |
| Apache Cassandra byte-comparable | bytes | zero is the single byte 0x80; sign byte 0x80 positive, 0x00 negative; negatives via inverted exponent sign and mantissa rounding rules | "modulated" exponent with a length byte | base-100, 0x00 terminator so no key is a prefix of another | digest does not say | not bounded in the digest | `utils/bytecomparable/ByteComparable.md`, section "Variable-length floating-point decimals" [F, remote digest] |
| Apache Phoenix `PDecimal` | bytes | zero byte 0x80; first byte carries sign and exponent; negatives use digit 101 minus the digit and a terminator byte 102 | base-100 exponent in the first byte; odd scale needs a parity correction | base-100 pairs, +1 offset for positives | normalized (`NumberUtil.normalize`) | **38 digits; 21 bytes max, longer values drop the terminator and are truncated** | `PDataType.toBytes(BigDecimal, ...)`, `PDecimal.getLength` [F, remote digest] |
| FoundationDB tuple layer | bytes | integers: zero 0x14, negatives one's complement, length in the type code; doubles: sign-bit transform | n/a | n/a | n/a | **no ordered decimal.** Codes 0x23/0x24 are reserved for an arbitrary-precision decimal stored as scale plus integer, "no ordering guarantees", discouraged | `design/tuple.md` [F, remote digest] |
| PostgreSQL `numeric` | no byte key; base-10000 digit array with weight, sign, dscale; `cmp_var_common` compares sign, then weight, then digits (reversed for two negatives); the sort abbreviation is a lossy 64-bit hint | zero has no digits and is forced positive (`make_result_safe`); NaN sorts above all | weight | NBASE 10000 | value order ignores trailing zeros; `dscale` is kept for display; `hash_numeric` ignores scale | 1000 declared; 131072 integer and 16383 fractional digits unconstrained; **input is rounded to the declared scale** | `utils/adt/numeric.c` (`cmp_var_common`, `numeric_abbrev_convert`, `hash_numeric`, `make_result_safe`); docs `datatype-numeric` [F, remote digest] |
| MySQL / TiDB DECIMAL binary | fixed-width bytes: length depends only on (precision, frac) | first bit flipped; negatives: all bytes inverted; zero encodes as positive | none (point position is fixed by the declaration) | 9 digits per 4 bytes | not applicable (width fixed) | MySQL 65 digits, scale 30; TiDB `WriteBin` limit 81 | TiDB `pkg/types/mydecimal.go` (`WriteBin`, `DecimalBinSize`): "memcmp comparable only among encodings of the same {precision, frac}"; MySQL decimal docs [F, remote digest] |
| Google Spanner NUMERIC | fixed type: precision 38, scale 9 | n/a | n/a | n/a | n/a | 29 integer plus 9 fractional digits; "cannot store arbitrary precision", strings recommended | docs.cloud.google.com/spanner/docs/storing-numeric-data; **its key encoding is not documented there** [F] |
| Cloud Bigtable | no decimal type found | n/a | n/a | n/a | n/a | integer encodings `BigEndianBytes` or `OrderedCodeBytes` only | Bigtable V2 `Type.Int64.Encoding` reference [F]. Nothing for decimals was found [I: absent, not proven absent] |
| Lucene `NumberTools` (legacy), Solr, Elasticsearch | string (legacy Lucene): fixed-length base-36 long, prefix `-` for negatives and `0` otherwise, negatives offset by Long.MAX+1; deprecated | prefix characters | fixed width | base 36 | n/a (integers) | 64-bit. Elasticsearch `scaled_float` stores `round(value x factor)` as a long and **saturates at Long.MAX**; `unsigned_long` is 0 to 2^64-1; no arbitrary-precision decimal field in the page read | Lucene.Net 3.0.3 `NumberTools` docs (port of the Java class); Elastic `number` mapping docs [F, remote digest; the Java original was not fetched] |

### 1.2 What the table says

1. **Class prefix.** Every design puts the sign and zero in the first byte or bytes, ordered negative, zero, positive. Zero is its own
   class with no digits, so it has no sign (OrderedBytes, CockroachDB and Postgres collapse -0 to 0) [F].
2. **Negatives are the complement of the magnitude.** Larger magnitude must sort lower, so digit bytes are complemented. The
   terminator is not complemented, because a shorter magnitude (a prefix of a longer one) must sort higher among negatives
   (CockroachDB digest, Phoenix terminator 102) [F].
3. **Magnitude class before digits.** The exponent, or the integer-digit count, comes first so that a number with more integer digits
   sorts higher. For negatives it is complemented too [F].
4. **Trailing zeros are stripped, so the scale is lost.** OrderedBytes decodes 1.10 as 1.1. CockroachDB cannot decode primary-key
   decimals from the key alone and stores the full value again in the value part ("composite encoding") [F]. For us the scale comes
   from the attribute declaration, so the key can be decoded to the declared-scale text without a second copy [I].
5. **Size limits are silent in two designs.** OrderedBytes rounds beyond 31 digits; Phoenix truncates beyond 21 bytes [F, remote
   digest]. Elasticsearch `scaled_float` rounds and saturates [F]. These are the exact failure Sam's rule forbids. Our kernel
   limit is 38 digits (Q22), above OrderedBytes' 31, so OrderedBytes cannot be adopted as is. The encoder must have no rounding
   path: a value it cannot hold is a typed error [I].
6. **They are all binary.** Bytes 0x00 and above 0x7F are not valid VARCHAR content in XTDB and fall under ICU weights in QLever.
   Using one of them means lowercase-hex wrapping (2 hex digits per byte, like the lab's 6 hex digits per codepoint). A 38-digit
   value is about 21 bytes, 42 hex characters, the same length as TDK1's 41 or 42 characters [I], so binary buys no length.
7. **Fixed width exists in one family.** MySQL and TiDB use a fixed-width layout whose length depends only on (precision, scale),
   with no exponent, and are comparable only inside one (precision, scale) [F]. This is the model for TDF in section 3.

---

## 2. Fit for the two lanes

### 2.1 (a) Plain codepoint or byte comparison

TDK1 (section 6) equals numeric order under plain codepoint and unsigned-byte comparison. Order argument, in full:

- Class marker `n` < `o` < `p` at index 0.
- Positive keys: after `p` comes a two-digit integer-digit count L (compares numerically because it is fixed-width), then exactly L
  digits (fixed length, compares numerically), then the fraction digits. Fraction digits have no trailing zero, so a longer fraction
  that extends a shorter one is strictly larger, and it also sorts later because the shorter string ends first.
- Negative keys: the same fields applied to the magnitude with every digit mapped d to 9-d and L mapped to 99-L, which reverses the
  order. The terminator `z` is greater than every digit, so a shorter magnitude (a prefix) gets the **larger** key, as it must.
- Characters that are ever compared against each other at the same index: `n`/`o`/`p` at index 0, digit against digit, digit against
  `z` (negative keys only, at the terminator), and end-of-string against anything. That list is the whole set of facts a collation
  must preserve for the key to work (used in 2.3).

Tested: section 7. [F]

### 2.2 (b) XTDB 2.2.0 VARCHAR

- XTDB 2.2.0 has no collation. `<`, `<=`, `>`, `>=` on utf8 call `util/compare-nio-buffers-unsigned`
  (`references/xtdb/core/src/main/clojure/xtdb/expression.clj:803-806`), the `compare` used for ORDER BY does the same
  (`.../expression/comparator.clj:62-66`), and the function compares unsigned bytes left to right and returns the length difference
  on a shared prefix, so the shorter string sorts first (`.../xtdb/util.clj:352-366`) [F]. `COLLATE` is not implemented (R14 line 263,
  upstream #4020) [F]. R12 line 802 records a probe: `B a b é` sorts as `B, a, b, é` [F].
- For ASCII, UTF-8 byte order, UTF-16 code-unit order and codepoint order are identical [F, standard], so any other code path that
  used a Java `String` compare would agree [I]. XTDB prunes pages with min/max only for numeric and date-time columns and uses bloom
  filters for strings (R1 line 372) [F], so there is no second string comparator in pushdown [I].
- Verdict: TDK1 works on XTDB unchanged. Byte equality gives key equality, which equals value equality (section 4).

### 2.3 (c) QLever 0.6.0 ICU

- The comparator is ICU en_US at IDENTICAL strength, alternate handling non-ignorable: default locale `src/global/Constants.h:266-268`,
  collator setup `src/index/vocabulary/LocaleManager.h:110-111, 312-328, 343`, compare pipeline (first character, then ICU on the
  inner text, then bytes, then language tag) `src/index/vocabulary/StringSortComparator.h:308-332` [F]. R5 section 5.3 gives the same
  analysis and a probe on the pinned image [F].
- Where ICU differs from codepoint order (own run on system ICU 78.1, `icu_order_check.out`) [F]:

```
ICU en_US order of the 95 printable ASCII characters:
  _-,;:!?.'"()[]{}@*/\&#%`^+<=>|~$0123456789aAbBcCdD ... yYzZ
codepoint order:
  !"#$%&'()*+,-./0123456789:;<=>?@ABC ... XYZ[\]^_`abc ... xyz{|}~
```

  Punctuation and symbols all sort below the digits in ICU, but `:;<=>?@[\]^_`{|}~` sort above them in ASCII; punctuation order
  differs inside itself (`,` before `-` in ASCII, after it in ICU); `a` and `A` tie at the primary level. Of the 4,465 ASCII
  character pairs, 1,099 are ordered differently by ICU than by codepoint, and 94 of the 95 characters take part in at least one.
  **Inside `[0-9a-z]` there are 0 disagreements** in single characters and in 300,000 random multi-character pairs including pairs
  where one string is a prefix of the other.
- The same alphabet was proven on the pinned engine image by R5: all 47,988 strings of length 1 to 3 over `[0-9a-z]` ORDER BY equal
  bytewise order, and the same test with uppercase added fails (`lab/research/R5-probe/probe3.out:2-3`) [F].
- TDK1 uses only `[0-9]` and the letters `n o p z`, and (2.1) only compares digit/digit, digit/`z`, `n`/`o`/`p`, and
  end-of-string. All of those are inside the verified alphabet. Result under ICU: 0 failures in 300,000 random pairs against exact
  rational order, 0 non-ascending pairs in a sorted chain of 121,005 distinct keys, 0 failures in two exhaustive chains [F].
- **Negative control (ICU can break a natural design).** Same grammar with terminator `~` (the largest ASCII character) passes
  codepoint order and fails ICU: 44 failures in 100,000 random pairs, for example key(-0.5) = `n994~` against key(-0.55) = `n9944~`
  (`icu_negative_example.out`). `|` and `:` fail the same way. Uppercase `Z` happens to pass because it is only compared with digits,
  but it would break the moment another key shares that position with a lowercase letter, so TDK1 uses lowercase only [F, I].
- **Fix if a different design were chosen.** Keep every character in `[0-9a-z]`; if a binary encoding is adopted, wrap it as
  lowercase hex, 2 characters per byte, which keeps it inside the same alphabet and fixed-width per byte (the lab's string keys use
  6 hex digits per codepoint for the same reason, `lab/research/R5-qlever-semantic-blockers.md` 5.3) [I].
- Caveat. I tested system ICU 78.1 through `ucol_strcollUTF8`, not the engine's bundled ICU. Digits before letters and Latin
  letters in alphabetical order are Unicode collation invariants, and R5's probe covers the pinned image for this alphabet [I]. The
  engine-side gate in section 5 (V3) closes the remaining gap.

### 2.4 Consequence

The same key string, byte for byte, is correct on both lanes. There is no lane-specific encoding, no hex wrapping and no second
oracle [I].

---

## 3. Interaction with declared scale (Q18, Q22, Q31g)

**Q31g, as ruled.** Increasing scale is metadata only when precision grows by at least the same amount (integer digits p - s never
shrink) and the order-key encoding is proven unchanged for every existing value; otherwise it is a migration (`lab/acceptance/RULINGS.md:134`).

### 3.1 Can a fixed-width encoding drop the exponent? Yes

With (p, s) declared, the decimal point sits at a fixed place, so the stored value is the integer n = v x 10^s with |n| < 10^p.
Offset-binary needs no sign handling, no complement and no exponent:

```
TDF(n, p) = decimal digits of (n + 10^p), left-padded with zeros to p + 1 digits
```

It is order-correct (exhaustive test in section 7), the key is p + 1 digits, zero is `1000...0`, and -0 cannot exist. MySQL and TiDB
use the binary analogue (fixed width from precision and scale, comparable only inside one declaration) [F].

### 3.2 What happens to existing keys when scale widens

Measured on 50,000 random values widened with the integer digits preserved (s to s + 1..8, p to p + same):

| Encoding | Depends on | Key unchanged by widening with p - s preserved | Key unchanged when p - s also grows | Correct engine comparison across attributes of different scale |
| --- | --- | --- | --- | --- |
| TDF (fixed-width offset-binary) | p and s | 0 of 50,000 | 0 | no |
| TDH (class + integer part zero-padded to W = p - s + stripped fraction) | W = p - s only | 50,000 of 50,000 | 0 of 41,362 nonzero values | no (needs equal W) |
| **TDK1 (recommended)** | the value only | **50,000 of 50,000** | **all (it is a function of the value)** | **yes** |

- [F, tested] TDF keys all change on any widening, because both n and the offset change. Under TDF, Q31g's "metadata only" case can never
  hold; every widening is a key rewrite.
- [F, tested] The hybrid TDH is the answer to "which encoding keeps keys valid when integer digits are preserved": a fixed-width
  integer part plus a stripped fraction keeps the key when only the scale grows. It breaks as soon as p - s grows, which Q31g's "at
  least the same amount" wording allows as metadata only. Only a key that does not contain the integer width at all (TDK1) satisfies the
  ruling as worded.
- [F, tested] **Cross-attribute comparison.** A rule comparing two decimal attributes of different scale, or an index range probed with a
  bound of a different scale, is silently wrong inside the engine under TDF: 5 under (p=3, s=0) is `1005` and 0.50 under (p=3, s=2) is
  `1050`, so the engine says 5 < 0.50. TDK1 gives 5 > 0.50. Under TDF a preflight rule would have to forbid every decimal comparison
  between different declarations, or the kernel would have to re-encode one side [I].
- **Range bounds with extra digits.** `x >= 16.505` on a scale-2 attribute is exact under TDK1 because any decimal encodes. Under TDF the
  kernel must round the bound in the correct direction (ceil for `>=` and `>`, floor for `<=` and `<`), a valid transformation but one
  more place for an off-by-one [I].

### 3.3 The scaled-integer path (precision 15 or less) cannot satisfy Q31g's metadata-only clause

[F, Q18] Values with p <= 15 are stored as the scaled integer n. Any scale increase changes n (times 10^delta), so the stored value
itself changes. [I] Therefore "order-key encoding unchanged for every existing value" can hold only on the string path. Widening
precision across 15/16 also changes the representation (integer to string). Both are migrations under Q18 as written. If Sam wants
Q31g's metadata-only promise to apply to every decimal attribute, the string key (TDK1) must be used for all precisions, with the scaled
integer as an optional shadow. See open question 2.

### 3.4 Recommendation

Use TDK1. Keep TDF as the documented fallback only if the frozen contract's "fixed-width" wording is kept; then state in the contract
that every change of (p, s) is a key-rewriting migration and add a preflight rule for cross-declaration decimal comparison.

---

## 4. Exactness and round trip

### 4.1 Domain and bijection

- Domain D(p, s): values v = n / 10^s for integer n with |n| < 10^p, with p at most 38 (Q22 kernel maximum), 0 <= s <= p.
  The key encoder itself accepts up to 99 integer digits (two-digit length field), so raising the kernel maximum later changes no
  key [F, by construction].
- Canonical text at scale s: `-?(0|[1-9][0-9]*)` followed, when s > 0, by `.` and exactly s digits. No leading zeros, no `+`, no
  exponent, no whitespace, and `-` only on nonzero values.
- Claim: `text -> value -> key -> value -> text` is the identity on canonical texts of D(p, s), and `key -> value -> key` is the identity
  on every key the encoder emits, and the decoder rejects every other string.
  - The key determines class, L, I and F uniquely (the length field says where I ends; negatives decode by complementing).
  - I has no leading zero and F no trailing zero, so (I, F) determines the value and the value determines (I, F).
  - Rendering pads F with zeros to the declared scale, restoring the text. The check len(F) <= s and len(I) <= p - s is the domain test.
  - The decoder is strict: leading zero in I, trailing zero in F, empty I and F, missing `z`, bad length field and extra characters
    are all errors. So a corrupted stored key raises instead of decoding to a wrong value, which is the "hard error" rule applied to reads.
- [F, tested] 200,000 random (p, s, n) round trips and six exhaustive domains pass; 600,000 random strings over the key alphabet gave
  2,811 valid keys, every one re-encoded to itself, and no two keys decoded to the same value (so no alias keys).

### 4.2 Equal values, different presentation

`1.1`, `1.10`, `1.100` give the same key `p0111` [F, tested]. This matches RULINGS Q33b R-DEC-3 (fractional digits are counted on the value,
so `16.500` fits scale 2 and is returned as `16.50`, `lab/acceptance/RULINGS.md:154`) and ACCEPTANCE (`1.50 and 1.5 are one value`). The key
discards presentation, so the writer must capture the caller's original input before encoding, as Q22 already requires [F].

### 4.3 Decision: decimal -0.00

**Refuse it with a typed error. This is already ruled** (Q33b R-DEC-2: "`-0.00` refused, consistent with Q30b") and TDK1 agrees. Reasons:

1. **Hard error, never silent conversion.** Accepting `-0.00` and storing `o` makes two inputs share one key, and decode returns `0.00`, which is not
   the input. That is a conversion the caller did not ask for. Q30a and Q30b refuse -0 for the same reason.
2. **No information is gained by accepting it.** For binary64, -0 is observable (1 / -0), which is why Q30 had to decide. A decimal -0 has
   no meaning in exact arithmetic, so refusal costs the caller nothing but a clearer input.
3. **Bijection stays total.** Every accepted text has exactly one key and decodes to itself; there is no accepted text without a
   canonical form.
4. **The other systems already collapse it** (CockroachDB and OrderedBytes give -0 and 0 one key, Postgres forces a positive sign; CockroachDB
   needs a composite re-encoding precisely because the key loses it) [F]. We avoid the re-encoding by never admitting the second form.
5. **Kernel arithmetic cannot produce it if the representation has no sign on zero.** A kernel decimal of (BigInt unscaled value, scale) has no -0.
   `decimal.js` and `big.js` both carry a sign on zero (`valueOf` prints `-0`, per their documentation), and their docs do not say whether
   rounding a small negative value yields -0 [F]. If either is chosen, the kernel must test results for a negative zero; a computed zero is
   +0, and that is not a silent conversion because no information is lost. The refusal applies to caller-supplied input [I].
6. Tested: `parse_text` refuses `-0`, `-0.0`, `-0.00` and a 37-digit variant; `encode(Decimal('-0.00'))` raises (fail closed).

NaN and infinities are outside the domain and raise.

---

## 5. Verification plan

### 5.1 What was run (this report, no engine)

| Id | Check | Oracle |
| --- | --- | --- |
| V1 | property test `decimal_key_test.py`, plain codepoint and UTF-8 byte order | Python `fractions.Fraction(Decimal)` (exact rationals) |
| V2 | supplementary ICU check `icu_order_check.py` (system libicucore via `ctypes`, en_US, IDENTICAL, non-ignorable) | the same Fraction order |

### 5.2 Property-test design (V1, run)

1. **Exhaustive small domains**, ascending in value: keys strictly ascending; decode renders the independently built canonical text.
   Domains (p, s): (3,0), (4,2), (5,0), (5,2), (5,5), (6,6).
2. **Random pairs** across precision 1 to 38, scale 0 to p, with digit patterns biased toward zeros, nines, ones and 0/1/9 mixes, and
   with the two sides drawn from **different** (p, s) so cross-scale order is tested. Equal values must give equal keys.
3. **Adjacent values**: v against v + 1 ulp, 100,000 random cases.
4. **Boundaries for every (p, s) up to 38 digits (779 declarations)**: domain minimum, minimum + 1 ulp, -1 ulp, 0, +1 ulp, maximum - 1 ulp,
   maximum; the carry from 99..9 to 10..0 in the integer part and the same for negatives; 0.9..9 against 1; 0.0..01 against 0.0..1.
5. **Negatives and zero** appear in all of the above; zero is also compared at the sign boundary.
6. **Normalization**: 20,000 values each zero-extended three ways must keep the same key.
7. **Decoder strictness and injectivity**: random strings over `0123456789nopz`.
8. **Round trip**: text to key to text with the declared scale, 200,000 random (p, s, n), with an independent text builder.
9. **-0 and malformed text**: 16 inputs must be refused.
10. **Mutation controls**: five wrong encoders must fail the suite (no terminator, length field not complemented, digits not
    complemented, no length prefix, trailing zeros kept). If a mutant passes, the suite is blind.

### 5.3 Engine-side plan (not run; the brief forbids engines)

| Id | Check | Pass criterion |
| --- | --- | --- |
| V3 | **Per-image admission probe**, next to R5's `probe1.py` T2/T3 gate: load the same key set (the 121,005-key sorted chain, all boundary keys, 20,000 prefix pairs such as `p0212`/`p02125`, and negatives such as `n9944z`/`n994z`) as VARCHAR on XTDB and as plain literals in a new order predicate on QLever (include a post-index `INSERT DATA` delta for QLever's local vocabulary, and both flushed and compacted L0 blocks plus bloom pages on XTDB) | `ORDER BY key` returns exactly the Python Fraction order; the two engines return byte-identical orders |
| V4 | Range probes: 1,000 random closed and half-open ranges with bounds that are not in the set and have more fractional digits than any scale | count, first key and last key equal the oracle; keyset and `LIMIT/OFFSET` pagination concatenate to the full order |
| V5 | Differential test: the TypeScript encoder (`packages/core`) against the Python reference on a pinned vector file (seeded generation of the V1 sets plus expected keys, hash recorded in the contract) | byte-for-byte equal keys and equal decode results; mutants of the TS encoder fail |
| V6 | Serialization paths (Q22 "every query and serialization path"): key through the pg wire, JSON export, SPARQL result export, ledger and projection | the key string is unchanged; no case change, trimming or numeric coercion. All-ASCII lowercase alphanumerics survive NFC/NFD and case folding; TDK1 always begins with a letter, so it is never a digit-only string that a CSV or JSON tool would coerce [I] |
| V7 | Writer negative tests: values outside (p, s), excess fractional digits (per Q33b R-DEC-3 only excess nonzero digits), `-0`, more than 38 digits, malformed text | typed error, no residue, no rounding anywhere on the path |

Constraint to put in the contract: **keys must not be concatenated into a composite string and must not be used for prefix
queries.** Positive keys are not self-delimiting (`p0212` is a prefix of `p02125`), which is correct for a separate sort column
(`ORDER BY ?key ?entity`, as R5 5.3 does) and wrong inside a single concatenated string [I].

---

## 6. Recommended encoding: TDK1 (Triplex decimal key, version 1)

### 6.1 Grammar

```
key        = zero / positive / negative

zero       = "o"                                   ; the value 0, any scale, never negative
positive   = "p" LL I F                            ; LL = two digits, the number of digits in I
negative   = "n" LC IC FC "z"                      ; magnitude encoded as for positive, then:
                                                   ;   LC = 99 - L as two digits
                                                   ;   IC = I with each digit d replaced by 9 - d
                                                   ;   FC = F with each digit d replaced by 9 - d
                                                   ;   "z" terminator, greater than every digit

LL         = 2DIGIT                                ; 00 to 99 ; L = integer value of LL
I          = [ %x31-39 *DIGIT ]                    ; exactly L digits, no leading zero; empty iff L = 0
F          = [ *DIGIT %x31-39 ]                    ; no trailing zero; may be empty
DIGIT      = %x30-39

constraint = I and F are not both empty             ; that value is "o"
alphabet   = DIGIT / "n" / "o" / "p" / "z"          ; a subset of [0-9a-z]
width      = positive: 3 + L + len(F)               ; negative: 4 + L + len(F)
             38 digits: 41 (positive), 42 (negative); zero: 1
```

Value `v = ± I.F`: `I` is the integer part without leading zeros, `F` is the fraction without trailing zeros. The key does not contain the scale,
the precision or any declaration.

Text to value (input grammar for a caller-supplied string): `-?(0|[1-9][0-9]*)(\.[0-9]+)?`. Refused: `+1`, `01`, `1.`, `.5`, `1e3`, any whitespace,
non-ASCII digits, and negative zero in any spelling. The declared checks are len(I) <= p - s and len(F) <= s (digits counted on the value, per
Q33b R-DEC-3).

Decode(key, s): parse as above (strict), then render sign, `I` or `0`, and when s > 0 a `.` followed by `F` right-padded with zeros to s digits.

### 6.2 Layout

```
 positive   p | L L | I (L digits)      | F (0..n digits, last one nonzero)
 zero       o
 negative   n | 99-L | 9-complement(I) | 9-complement(F)                   | z
              ^class   ^length class      ^digits, reversed order           ^terminator beats any digit

 ascending key space:
   n99... (tiny negatives)                                           n00... (huge negatives)
   <------------------------------------------------------------------------------------
   huge negative ... small negative  <  o  <  tiny positive ... small positive ... huge positive
```

### 6.3 Worked examples (generated by the reference encoder)

| Value | I | F | L | Key |
| --- | --- | --- | --- | --- |
| 0, 0.00 | | | | `o` |
| 1 | 1 | | 1 | `p011` |
| 1.1, 1.10, 1.100 | 1 | 1 | 1 | `p0111` |
| 0.01 | | 01 | 0 | `p0001` |
| 0.05 | | 05 | 0 | `p0005` |
| 0.5 | | 5 | 0 | `p005` |
| 12 | 12 | | 2 | `p0212` |
| 12.25 | 12 | 25 | 2 | `p021225` |
| 12.5 | 12 | 5 | 2 | `p02125` |
| 16.50 (scale 2), 16.5 | 16 | 5 | 2 | `p02165` |
| 16.499999 | 16 | 499999 | 2 | `p0216499999` |
| 125 | 125 | | 3 | `p03125` |
| -0.01 | | 01 | 0 | `n9998z` |
| -0.5 | | 5 | 0 | `n994z` |
| -0.55 | | 55 | 0 | `n9944z` |
| -12 | 12 | | 2 | `n9787z` |
| -12.5 | 12 | 5 | 2 | `n97874z` |
| -16.50 | 16 | 5 | 2 | `n97834z` |
| -125 | 125 | | 3 | `n96874z` |
| 12345678901234567890.12 | 12345678901234567890 | 12 | 20 | `p201234567890123456789012` |
| -99999999999999999999.99 | 99999999999999999999 | 99 | 20 | `n790000000000000000000000z` |
| 38 nines | | | 38 | `p3899999999999999999999999999999999999999` |
| -(38 nines) | | | 38 | `n6100000000000000000000000000000000000000z` |

Sorted ascending, these keys are in value order: `n96874z` (-125), `n97874z` (-12.5), `n9787z` (-12), `n9944z` (-0.55), `n994z` (-0.5),
`n9998z` (-0.01), `o`, `p0001` (0.01), `p0005`, `p005`, `p011`, `p0111`, `p0212`, `p021225`, `p02125`, `p03125` (checked with the reference encoder).

### 6.4 Alternatives kept on file

| Name | Form | Use only if |
| --- | --- | --- |
| TDF | `str(n + 10^p).rjust(p + 1, "0")` over the scaled integer n | the contract keeps "fixed-width"; every change of (p, s) is then a key-rewriting migration and cross-declaration comparison needs a preflight rule |
| TDH | class + integer part padded to W = p - s + stripped fraction, negatives complemented with `z` | never preferred: keeps keys only for scale growth with p - s unchanged, which is a narrower promise than Q31g's wording |
| Binary base-100 (OrderedBytes, CockroachDB family), lowercase-hex wrapped | 2 hex characters per byte | an external tool needs a standard binary format; same length as TDK1, less readable, 31-digit limit in OrderedBytes |

---

## 7. Test results

Files and commands (all stdlib; `-I` isolated mode):

```
cd /Users/sam/Claude/Projects/triplex-db-2/R20
python3 -I decimal_key_test.py          # seed 20261107, about 40 s
python3 -I decimal_key_test.py 7        # second seed, also 0 failures
python3 -I icu_order_check.py           # about 22 s, macOS system ICU 78.1 through ctypes
```

`decimal_key_test.out` (seed 20261107, Python 3.14.6):

```
exhaustive  p=3 s=0  values=1999     failures=0
exhaustive  p=4 s=2  values=19999    failures=0
exhaustive  p=5 s=0  values=199999   failures=0
exhaustive  p=5 s=2  values=199999   failures=0
exhaustive  p=5 s=5  values=199999   failures=0
exhaustive  p=6 s=6  values=1999999  failures=0
random pairs 400000 (mixed p,s, precision 1..38)                  failures=0
adjacent 100000 + boundaries p<=38,s<=p                           failures=0
normalization (20000 values x 3 zero-extended forms)              failures=0
decoder strictness 600000 random strings: valid=2811 rejected=597189  failures=0
negative zero / malformed text rejected: 16 of 16 expected        ok
round trip text -> key -> text, 200000 random (p,s,n)             failures=0
alphabet [0-9a-z] ok; max key length 42 (38-digit negative)
mutation controls: no terminator 175 | length not complemented 3946 | digits not complemented 2421
                   | no length prefix 3283 | trailing zeros kept 45   (all caught)
alternatives: order inside one declaration (TDF, TDH) failures=0
  widening with p - s preserved: unchanged TDK1=50000 TDH=50000 TDF=0 (of 50000)
  widening with p - s growing:   TDH unchanged 0 of 41362
  5 (p=3,s=0) vs 0.50 (p=3,s=2): TDF keys 1005 vs 1050 -> engine says 5 < 0.50 (wrong); TDK1 5 > 0.50
TOTAL REAL-ENCODER FAILURES: 0
```

`icu_order_check.out` (system ICU 78.1, en_US, IDENTICAL, non-ignorable):

```
pairs inside [0-9a-z], single characters, disagreeing with codepoint order: 0
all printable ASCII: 1099 of 4465 pairs ordered differently by ICU; 94 of 95 characters involved
random [0-9a-z] strings, 300000 pairs (half share a prefix): ICU != codepoint in 0
TDK1, 300000 random pairs vs exact Fraction order under ICU: failures=0
TDK1, sorted chain of 121005 distinct values: adjacent pairs not ascending under ICU: 0
TDK1, exhaustive (5,2) and (4,4) chains under ICU: failures=0
negative controls (terminator): '~' 44, '|' 44, ':' 44 ICU failures (0 under codepoint); 'Z' 0; 'z' 0
```

Limits of this evidence [I]: the generators are seeded and biased toward edges but are samples; exhaustive coverage stops at 6 digits; the
ICU run is not the engine's ICU; nothing ran on XTDB or QLever. The engine-side items V3 to V7 are the remaining proof.

---

## 8. Open questions

**Decide now (block the build of the decimal kind):**

1. **Fixed-width wording.** `ACCEPTANCE.md:278`, `build_contract.py:299` and `obligations.json:680` say the string is "fixed-width, sign-aware". TDK1 is variable-width (3 to 42
   characters). Change the wording (and bump the contract version) to "order-preserving decimal string whose bytewise order equals numeric order", or
   choose TDF and accept section 3.4. My recommendation: change the wording.
2. **One representation or two?** Q18 stores p <= 15 as a scaled integer and p >= 16 as a string. Under that rule, scale growth on a p <= 15 attribute and
   precision growth across 15/16 are always rewrites, so Q31g's "metadata only" can hold only for string attributes. Options: (a) keep two
   representations and state that rule in Q31g; (b) use TDK1 for all decimals and treat the scaled integer as an optional XTDB or QLever shadow. My
   recommendation: (b) if schema widening is a common operation, else (a).
3. **Version the channel.** The key has no version marker. Name the stored channel with a version (for example a `decimal_order_v1` predicate on QLever, as
   R5 5.3 advises for string keys) so a future encoder is a new column, not a silent reinterpretation.

**Decide before the writer is built:**

4. **Which fields are stored.** The key alone decodes to the exact text. Storing the canonical text as well (the QLever "lexical channel") costs one
   triple and keeps explain output readable; XTDB could store the key only. I recommend key authoritative, text derived, lexical channel kept on QLever for parity with other kinds.
5. **Native XTDB DECIMAL as an option for the XTDB lane.** XTDB has Arrow decimal arithmetic (`expression.clj:938-961`, casts 1820-1835) but no min/max page
   pruning for it (`MetadataFlavour.kt:77`), and the type is fixed per column [I: not tested]. One shared string key means one oracle and one
   verification path, so I do not recommend a lane-specific representation.

**Later:**

- Error names: the contract uses `E-DECIMAL-UNREPRESENTABLE` (`ACCEPTANCE.md:177, 278`) while Q29d lists `E-DECIMAL-OVERFLOW`, `-FRACTION`, `-NARROWING`. The encoder needs
  one typed error; I did not reconcile names.
- Raising the kernel maximum above 38: no key changes up to 99 integer digits; beyond that the length field needs a third digit and a new version.
- If the kernel decimal library is `decimal.js` or `big.js`, test whether rounding a negative value to zero yields negative zero before trusting it (docs silent).
- Run V3 on both pinned images before any comparative claim; the system ICU used here is not the engine's.

Next action: decide open question 1 (change the contract wording or choose TDF); everything else follows from it.
