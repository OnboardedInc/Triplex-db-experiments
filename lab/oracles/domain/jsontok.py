"""Token-level JSON for O-DOMAIN (W0-1.1.1), stdlib only.

SPEC 2 and 4.4 step 1 need what a normal JSON parser hides:
- a number keeps its token text (JNum), so `1650.0`, `1.65e3` and `3.0` stay distinguishable from integer tokens
  (SPEC 2 "A JSON integer token", SPEC 14 items 1, 2 and 47);
- an object remembers whether any key appeared twice (JObject.dup), so a duplicate key anywhere in the input is
  W0.E_SHAPE (SPEC 4.4 step 1, SPEC 14 item 34, case C66) instead of a silent last-wins.

`canonical` writes SPEC 9 canonical JSON.
"""

import json
import re

# SPEC 2: a JSON integer token matches -?(0|[1-9][0-9]*) with no fraction and no exponent.
INT_TOKEN_RE = re.compile(r'-?(?:0|[1-9][0-9]*)')
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
    """Parse UTF-8 bytes holding exactly one JSON value. Raises JSONSyntaxError."""
    if isinstance(data, (bytes, bytearray)):
        try:
            text = bytes(data).decode('utf-8')
        except UnicodeDecodeError as exc:
            raise JSONSyntaxError('not UTF-8: %s' % exc) from None
    else:
        text = data
    p = _Parser(text)
    try:
        value = p.value()
    except RecursionError:
        raise JSONSyntaxError('nesting too deep') from None
    p.ws()
    if p.i != len(text):
        raise JSONSyntaxError('trailing data at offset %d' % p.i)
    return value


class _Parser:
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

    def value(self):
        self.ws()
        s, i = self.s, self.i
        if i >= len(s):
            self.fail('unexpected end')
        c = s[i]
        if c == '{':
            return self.obj()
        if c == '[':
            return self.arr()
        if c == '"':
            return self.string()
        if c == 't' and s.startswith('true', i):
            self.i = i + 4
            return True
        if c == 'f' and s.startswith('false', i):
            self.i = i + 5
            return False
        if c == 'n' and s.startswith('null', i):
            self.i = i + 4
            return None
        m = _NUMBER_RE.match(s, i)
        if m and m.end() > i:
            self.i = m.end()
            return JNum(m.group(0))
        self.fail('unexpected character %r' % c)

    def obj(self):
        out = JObject()
        self.i += 1
        self.ws()
        if self.i < len(self.s) and self.s[self.i] == '}':
            self.i += 1
            return out
        while True:
            self.ws()
            if self.i >= len(self.s) or self.s[self.i] != '"':
                self.fail('expected object key')
            key = self.string()
            self.ws()
            if self.i >= len(self.s) or self.s[self.i] != ':':
                self.fail('expected ":"')
            self.i += 1
            val = self.value()
            if key in out:
                out.dup = True
            out[key] = val
            self.ws()
            if self.i >= len(self.s):
                self.fail('unterminated object')
            c = self.s[self.i]
            self.i += 1
            if c == ',':
                continue
            if c == '}':
                return out
            self.i -= 1
            self.fail('expected "," or "}"')

    def arr(self):
        out = []
        self.i += 1
        self.ws()
        if self.i < len(self.s) and self.s[self.i] == ']':
            self.i += 1
            return out
        while True:
            out.append(self.value())
            self.ws()
            if self.i >= len(self.s):
                self.fail('unterminated array')
            c = self.s[self.i]
            self.i += 1
            if c == ',':
                continue
            if c == ']':
                return out
            self.i -= 1
            self.fail('expected "," or "]"')

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


def int_token_value(x):
    """SPEC 2: the integer value of x when x is a JSON integer token, else None.

    A native Python int (never a bool) comes only from O-DOMAIN's own generator and counts as an integer token.
    """
    t = type(x)
    if t is int:
        return x
    if t is JNum and INT_TOKEN_RE.fullmatch(x.text) is not None:
        return int(x.text)
    return None


_DUMPS = json.JSONEncoder(sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode


def canonical(x):
    """SPEC 9 canonical JSON as a str (ASCII): sorted keys, no whitespace, integers in plain decimal.

    Plain Python values go through the json module (SPEC 9 names that exact call). Values that still hold JNum
    tokens (opaque payloads passed through publish and receive) go through the same rules by hand: an integer
    token is written as its integer; any other number token is written as its source text (SPEC-AMBIGUITY A07).
    """
    try:
        return _DUMPS(x)
    except TypeError:
        return _canon(x)


def _canon(x):
    if x is None:
        return 'null'
    if x is True:
        return 'true'
    if x is False:
        return 'false'
    t = type(x)
    if t is int:
        return str(x)
    if t is str:
        return _DUMPS(x)
    if t is JNum:
        v = int_token_value(x)
        return str(v) if v is not None else x.text
    if isinstance(x, dict):
        return '{' + ','.join(_DUMPS(k) + ':' + _canon(x[k]) for k in sorted(x)) + '}'
    if isinstance(x, (list, tuple)):
        return '[' + ','.join(_canon(y) for y in x) + ']'
    raise TypeError('not a W0 JSON value: %r' % (x,))


def to_plain(x):
    """Turn a parsed tree into plain Python values for comparison (integer JNum -> int). Non-integer numbers stay JNum."""
    if isinstance(x, dict):
        return {k: to_plain(v) for k, v in x.items()}
    if isinstance(x, list):
        return [to_plain(v) for v in x]
    if type(x) is JNum:
        v = int_token_value(x)
        return v if v is not None else x
    return x
