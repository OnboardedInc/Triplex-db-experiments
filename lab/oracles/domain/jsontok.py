"""Token-level JSON for O-DOMAIN (W0-1.1.1), stdlib only.

SPEC 2 and 4.4 step 1 need what a normal JSON parser hides:
- a number keeps its token text (JNum), so `1650.0`, `1.65e3` and `3.0` stay distinguishable from integer tokens
  (SPEC 2 "A JSON integer token", SPEC 14 items 1, 2 and 47);
- an object remembers whether any key appeared twice (JObject.dup), so a duplicate key anywhere in the input is
  W0.E_SHAPE (SPEC 4.4 step 1, SPEC 14 item 34, case C66) instead of a silent last-wins.

`canonical` writes SPEC 9 canonical JSON.

No input can hit a Python limit (RULINGS-PENDING Q57b and Q57c): the parser and the fallback writer are iterative, so any
nesting depth is a JSON value; integer tokens of any length stay integer tokens. Range-checked integers never call int()
on more than 16 digits (ranged_int_token_value), and Python's 4,300-digit int/str limit is lifted for the fields SPEC
leaves unbounded (publish and receive sequences, positions and inputs).
"""

import json
import re
import sys

if hasattr(sys, 'set_int_max_str_digits'):
    # Q57b: implementations must not fail on their language's integer-parsing limits. Only conversions of more than
    # 4,300 digits are affected, and every one of them raised before, so no other result changes.
    sys.set_int_max_str_digits(0)

# SPEC 2: a JSON integer token matches -?(0|[1-9][0-9]*) with no fraction and no exponent.
INT_TOKEN_RE = re.compile(r'-?(?:0|[1-9][0-9]*)')
# 2^53 - 1 = 9007199254740991 has 16 digits: an integer token with more digits is outside every W0 range.
W0_MAX_DIGITS = 16
_OUT_OF_RANGE = 10 ** W0_MAX_DIGITS  # greater than 2^53 - 1, so every range check rejects it
# RFC 8259 number grammar (ASCII digits only).
_NUMBER_RE = re.compile(r'-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')
# A run of string characters that need no escape handling: anything but '"', '\\' and control characters.
_STR_CHUNK_RE = re.compile(r'[^"\\\x00-\x1f]*')
_WS = ' \t\n\r'
_ESCAPES = {'"': '"', '\\': '\\', '/': '/', 'b': '\b', 'f': '\f', 'n': '\n', 'r': '\r', 't': '\t'}


class JSONSyntaxError(ValueError):
    """The bytes are not one JSON value (RFC 8259)."""


class JNum:
    """A JSON number token kept as its source text (SPEC 2: integer tokens are judged on the token, not the value)."""

    __slots__ = ('text',)

    def __init__(self, text):
        self.text = text

    def is_int_token(self):
        return INT_TOKEN_RE.fullmatch(self.text) is not None

    def __repr__(self):
        return 'JNum(%r)' % self.text

    def __eq__(self, other):
        return type(other) is JNum and other.text == self.text

    def __hash__(self):
        return hash(('JNum', self.text))


class JObject(dict):
    """A JSON object; `dup` is True when the source repeated a key (the last value is kept, but the input is invalid)."""

    __slots__ = ('dup',)

    def __init__(self):
        super().__init__()
        self.dup = False


def parse_bytes(data):
    """Parse UTF-8 bytes holding exactly one JSON value, at any nesting depth. Raises JSONSyntaxError."""
    if isinstance(data, (bytes, bytearray)):
        try:
            text = bytes(data).decode('utf-8')
        except UnicodeDecodeError as exc:
            raise JSONSyntaxError('not UTF-8: %s' % exc) from None
    else:
        text = data
    p = _Parser(text)
    value = p.document()
    p.ws()
    if p.i != len(text):
        raise JSONSyntaxError('trailing data at offset %d' % p.i)
    return value


class _Parser:
    """An iterative RFC 8259 parser: containers being built live on an explicit stack, never on Python's call stack."""

    __slots__ = ('s', 'i')

    def __init__(self, s):
        self.s = s
        self.i = 0

    def ws(self):
        s, i, n = self.s, self.i, len(self.s)
        while i < n and s[i] in _WS:
            i += 1
        self.i = i

    def fail(self, what):
        raise JSONSyntaxError('%s at offset %d' % (what, self.i))

    def peek(self):
        self.ws()
        if self.i >= len(self.s):
            self.fail('unexpected end')
        return self.s[self.i]

    def key(self):
        if self.peek() != '"':
            self.fail('expected object key')
        k = self.string()
        if self.peek() != ':':
            self.fail('expected ":"')
        self.i += 1
        return k

    def document(self):
        # Each frame is [container, key]; key is None for an array. A completed value is attached to the top frame.
        stack = []
        while True:
            c = self.peek()
            s, i = self.s, self.i
            if c == '{':
                self.i = i + 1
                if self.peek() == '}':
                    self.i += 1
                    val = JObject()
                else:
                    stack.append([JObject(), self.key()])
                    continue
            elif c == '[':
                self.i = i + 1
                if self.peek() == ']':
                    self.i += 1
                    val = []
                else:
                    stack.append([[], None])
                    continue
            elif c == '"':
                val = self.string()
            elif c == 't' and s.startswith('true', i):
                self.i = i + 4
                val = True
            elif c == 'f' and s.startswith('false', i):
                self.i = i + 5
                val = False
            elif c == 'n' and s.startswith('null', i):
                self.i = i + 4
                val = None
            else:
                m = _NUMBER_RE.match(s, i)
                if not (m and m.end() > i):
                    self.fail('unexpected character %r' % c)
                self.i = m.end()
                val = JNum(m.group(0))
            # Attach val to its parents, closing every container that ends here.
            while True:
                if not stack:
                    return val
                frame = stack[-1]
                container, k = frame
                if k is None:
                    container.append(val)
                    close = ']'
                else:
                    if k in container:
                        container.dup = True
                    container[k] = val
                    close = '}'
                c = self.peek()
                self.i += 1
                if c == ',':
                    if k is not None:
                        frame[1] = self.key()
                    break
                if c == close:
                    stack.pop()
                    val = container
                    continue
                self.i -= 1
                self.fail('expected "," or %r' % close)

    def string(self):
        s = self.s
        i = self.i + 1
        parts = []
        while True:
            m = _STR_CHUNK_RE.match(s, i)
            parts.append(m.group(0))
            i = m.end()
            if i >= len(s):
                self.i = i
                self.fail('unterminated string')
            c = s[i]
            if c == '"':
                self.i = i + 1
                return ''.join(parts)
            if c != '\\':
                self.i = i
                self.fail('control character in string')
            if i + 1 >= len(s):
                self.i = i
                self.fail('unterminated escape')
            e = s[i + 1]
            if e in _ESCAPES:
                parts.append(_ESCAPES[e])
                i += 2
                continue
            if e != 'u':
                self.i = i
                self.fail('bad escape')
            code = self._hex4(i + 2)
            i += 6
            if 0xD800 <= code <= 0xDBFF and s.startswith('\\u', i):
                low = self._hex4(i + 2)
                if 0xDC00 <= low <= 0xDFFF:
                    code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00)
                    i += 6
            parts.append(chr(code))

    def _hex4(self, j):
        h = self.s[j:j + 4]
        if len(h) != 4 or any(ch not in '0123456789abcdefABCDEF' for ch in h):
            self.i = j
            self.fail('bad \\u escape')
        return int(h, 16)


def has_duplicate_key(x):
    """True when any object anywhere in x repeated a key (SPEC 4.4 step 1: W0.E_SHAPE)."""
    stack = [x]
    while stack:
        y = stack.pop()
        if isinstance(y, dict):
            if getattr(y, 'dup', False):
                return True
            stack.extend(y.values())
        elif isinstance(y, list):
            stack.extend(y)
    return False


def is_int_token(x):
    """SPEC 2: x is a JSON integer token (a native Python int, never a bool, counts as one)."""
    t = type(x)
    return t is int or (t is JNum and INT_TOKEN_RE.fullmatch(x.text) is not None)


def int_token_value(x):
    """SPEC 2: the exact integer value of x when x is a JSON integer token, else None. Any length (Q57b).

    A native Python int (never a bool) comes only from O-DOMAIN's own generator and counts as an integer token.
    """
    t = type(x)
    if t is int:
        return x
    if t is JNum and INT_TOKEN_RE.fullmatch(x.text) is not None:
        return int(x.text)
    return None


def ranged_int_token_value(x):
    """int_token_value for the range-checked integers (cents, minutes, every tx and basis.tx), else None.

    A token with more than 16 digits lies outside every W0 range, so it maps to +/-10^16 (out of range on either side)
    without calling int() (RULINGS-PENDING Q57b): W0.E_VALUE for a value, W0.E_BASIS for a tx.
    """
    if type(x) is JNum:
        text = x.text
        if INT_TOKEN_RE.fullmatch(text) is None:
            return None
        neg = text.startswith('-')
        if len(text) - neg > W0_MAX_DIGITS:
            return -_OUT_OF_RANGE if neg else _OUT_OF_RANGE
        return int(text)
    return int_token_value(x)


_DUMPS = json.JSONEncoder(sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode


def canonical(x):
    """SPEC 9 canonical JSON as a str (ASCII): sorted keys, no whitespace, integers in plain decimal.

    Plain Python values go through the json module (SPEC 9 names that exact call). Values that still hold JNum tokens
    (opaque payloads passed through publish and receive), or nest deeper than the json module's recursion guard, go
    through the same rules in an iterative writer: an integer token is written as its integer; any other number token
    as its source text (SPEC-AMBIGUITY A07).
    """
    try:
        return _DUMPS(x)
    except (TypeError, RecursionError):
        return _canon(x)


class _Lit(str):
    """Text already in canonical form, pushed on the writer's stack between values."""

    __slots__ = ()


def _canon(x):
    out = []
    stack = [x]
    while stack:
        y = stack.pop()
        t = type(y)
        if t is _Lit:
            out.append(y)
        elif y is None:
            out.append('null')
        elif y is True:
            out.append('true')
        elif y is False:
            out.append('false')
        elif t is int:
            out.append(str(y))
        elif t is str:
            out.append(_DUMPS(y))
        elif t is JNum:
            text = y.text
            if INT_TOKEN_RE.fullmatch(text) is not None:
                # An integer token has no leading zeros, so its integer is its text, except that -0 is 0.
                out.append('0' if text == '-0' else text)
            else:
                out.append(text)
        elif isinstance(y, dict):
            keys = sorted(y)
            if not keys:
                out.append('{}')
                continue
            stack.append(_Lit('}'))
            for n, k in enumerate(reversed(keys)):
                stack.append(y[k])
                stack.append(_Lit(('{' if n == len(keys) - 1 else ',') + _DUMPS(k) + ':'))
        elif isinstance(y, (list, tuple)):
            if not y:
                out.append('[]')
                continue
            stack.append(_Lit(']'))
            last = len(y) - 1
            for n in range(last, -1, -1):
                stack.append(y[n])
                stack.append(_Lit('[' if n == 0 else ','))
        else:
            raise TypeError('not a W0 JSON value: %r' % (y,))
    return ''.join(out)


def to_plain(x):
    """Turn a trusted parsed tree (release files) into plain Python values (integer JNum -> int)."""
    if isinstance(x, dict):
        return {k: to_plain(v) for k, v in x.items()}
    if isinstance(x, list):
        return [to_plain(v) for v in x]
    if type(x) is JNum:
        v = int_token_value(x)
        return v if v is not None else x
    return x
