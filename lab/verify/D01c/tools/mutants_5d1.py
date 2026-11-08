"""V-D01c delta check: the 276a280 mutants ported to O-DOMAIN 5d1fd1a, plus X-mutants of the fix itself.

Ported (the edited text moved in the fix; the mutation is the same):
- M07, M08, M11, M15: `int_token_value(` became `ranged_int_token_value(` at the tx checks.
- M51: the old edit was in int_token_value; the same misreading (integral non-integer tokens read as integers, as a
  JSON.parse reader would) is now planted where the new parser makes number tokens.
- M52: duplicate-key flag in the new iterative parser.  M55: non-integer token text in the new iterative writer.
"""
import copy
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mutants import MUTANTS as OLD  # noqa: E402

PORT = {
    'M07': lambda e: [(o.replace("int_token_value(a['tx'])", "ranged_int_token_value(a['tx'])"),
                       n.replace("int_token_value(a['tx'])", "ranged_int_token_value(a['tx'])")) for o, n in e],
    'M08': lambda e: [(o.replace('int_token_value(txtok)', 'ranged_int_token_value(txtok)'),
                       n.replace('int_token_value(txtok)', 'ranged_int_token_value(txtok)')) for o, n in e],
    'M11': lambda e: [(o.replace('int_token_value(txtok)', 'ranged_int_token_value(txtok)'),
                       n.replace('int_token_value(txtok)', 'ranged_int_token_value(txtok)')) for o, n in e],
    'M15': lambda e: [(o.replace("int_token_value(a['tx'])", "ranged_int_token_value(a['tx'])"),
                       n.replace("int_token_value(a['tx'])", "ranged_int_token_value(a['tx'])")) for o, n in e],
    'M51': lambda e: [("                val = JNum(m.group(0))",
                       "                val = JNum(str(int(float(m.group(0)))) if float(m.group(0)).is_integer() else m.group(0))")],
    'M52': lambda e: [("                    if k in container:\n                        container.dup = True",
                       "                    if k in container:\n                        pass")],
    'M55': lambda e: [("            else:\n                out.append(text)\n", "            else:\n                out.append(repr(float(text)))\n")],
}
PORTED = set(PORT)

MUTANTS = []
for m in OLD:
    m = copy.deepcopy(m)
    if m['id'] in PORT:
        m['edits'] = PORT[m['id']](m['edits'])
        m['what'] += ' [ported to 5d1fd1a]'
    MUTANTS.append(m)

NA_INT = 'na: population facts are Python ints, which never reach the JNum branch'
NA_PARSE = 'na: population.run parses only the three release files'
NA_JNUM = 'na: the population never writes a JNum or a value deeper than the json module limit'
NA_PUBLISH = 'na: population.run never calls op_publish or op_receive'
MUTANTS += [
    dict(id='X01', file='w0.py', spec='F1', what='is_date without its type check (F1 reverted)',
         edits=[("    return type(s) is str and len(s) == 10 and _is_date_str(s)", "    return _is_date_str(s)")], fp='run'),
    dict(id='X02', file='w0.py', spec='F1', what='is_instant without its type check (F1 reverted)',
         edits=[("    return type(s) is str and len(s) == 27 and _is_instant_str(s)", "    return _is_instant_str(s)")], fp='run'),
    dict(id='X03', file='jsontok.py', spec='F2', what='a token over 16 digits maps to 0 (inside the range)',
         edits=[("            return -_OUT_OF_RANGE if neg else _OUT_OF_RANGE", "            return 0")], fp=NA_INT),
    dict(id='X04', file='jsontok.py', spec='F2', what='digit bound 15 (rejects 16-digit values such as 2^53 - 1)',
         edits=[("W0_MAX_DIGITS = 16", "W0_MAX_DIGITS = 15")], fp=NA_INT),
    dict(id='X05', file='jsontok.py', spec='A11', what='the int/str digit limit is not lifted',
         edits=[("    sys.set_int_max_str_digits(0)", "    pass")], fp=NA_PUBLISH),
    dict(id='X06', file='jsontok.py', spec='F3 parser', what='a container may close with the other bracket ([1} and {"a":1] parse)',
         edits=[("                if c == close:", "                if c in '}]':")], fp=NA_PARSE),
    dict(id='X07', file='jsontok.py', spec='F3 writer', what='the iterative writer keeps object keys in input order',
         edits=[("            keys = sorted(y)", "            keys = list(y)")], fp=NA_JNUM),
    dict(id='X08', file='jsontok.py', spec='F3 writer', what='the iterative writer writes the integer token -0 as -0',
         edits=[("                out.append('0' if text == '-0' else text)", "                out.append(text)")], fp=NA_JNUM),
    dict(id='X09', file='jsontok.py', spec='F3 writer', what='no fallback when the json module hits its recursion guard',
         edits=[("    except (TypeError, RecursionError):", "    except TypeError:")], fp=NA_JNUM),
    dict(id='X10', file='jsontok.py', spec='F3 parser', what='a duplicate key is detected only when the object closes after one member',
         edits=[("                    if k in container:\n                        container.dup = True",
                 "                    if k in container and len(container) == 1:\n                        container.dup = True")],
         fp=NA_PARSE),
]
