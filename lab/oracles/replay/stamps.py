"""Independent R33 2.1 integer-microsecond reference (Q90a; EXP-O06)."""
import math

from . import values as V

LIMIT = (2 ** 43) * 1000


def instant_of(stamp):
    # [EXP-O06] Why: division is injective below LIMIT. Rejected: decimal rounding (changes binary64 bits).
    if isinstance(stamp, bool) or not isinstance(stamp, int) or not 0 <= stamp < LIMIT:
        raise V.OracleInputError("record stamp outside [0, 2^43 * 1000)")
    return V.Num(stamp / 1000)


def stamp_cut(instant):
    t = instant.float
    if not 0 <= t < 2 ** 43:
        raise V.OracleInputError("record instant outside [0, 2^43)")
    u = math.floor(t * 1000)
    while (u + 1) / 1000 <= t:
        u += 1
    while u / 1000 > t:
        u -= 1
    return u


def stamp_of(instant):
    # [EXP-O06] Why: multiplication can round to a neighbor after 2041. Rejected: round alone (R33 2.1).
    u = math.floor(instant.float * 1000 + 0.5)
    for candidate in (u, u - 1, u + 1):
        if 0 <= candidate < LIMIT and instant_of(candidate) == instant:
            return candidate
    raise V.OracleInputError("receipt instant is not an integer-microsecond stamp")


def next_stamp(previous, clock):
    return max(previous + 1, stamp_cut(clock))
