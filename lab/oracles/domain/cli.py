#!/usr/bin/env python3
"""O-DOMAIN command line (W0-1.1.1). Stdlib only; run with `python3 -I`.

  cli.py run <case.json> [--quiet]          run one golden case: canonical output on stdout; exit 0 when it equals
                                            canonicalJson(expected) byte for byte, 1 when it differs
  cli.py cases [<dir>]                      run every case file in a directory (default: the W0 cases); exit 0 when all pass
  cli.py --test                             unit tests (test_domain.py), which include all golden cases
  cli.py evaluate|reconcile|affected|publish|receive [<input.json>|-]
                                            one operation on an input object (SPEC 4.3 keys); canonical output on stdout
  cli.py release-hash <release.json>        SPEC 5.2 content hash of a release file
  cli.py --population --rung 100k --fingerprint [--out <file.json>] [--expect]
                                            generate the SPEC 12.3 population, stream it, and print the SPEC 12.7
                                            fingerprint plus the measured floors; --expect compares with the accepted values

Common option: --world-dir <dir> (default: lab/world/W0 next to this oracle).
Exit codes: 0 success or match; 1 mismatch; 2 usage or environment error.
"""

import os
import sys

# `python3 -I` does not put the script's directory on sys.path (-P); add this oracle's own directory explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import jsontok  # noqa: E402
import w0  # noqa: E402

CASE_KEYS_REQUIRED = ('id', 'op', 'input', 'expected')


def _usage(msg):
    sys.stderr.write('o-domain: %s\n' % msg)
    sys.stderr.write(__doc__)
    sys.exit(2)


def _pop_opt(args, name, takes_value=True):
    if name not in args:
        return None
    i = args.index(name)
    if takes_value:
        if i + 1 >= len(args):
            _usage('%s needs a value' % name)
        val = args[i + 1]
        del args[i:i + 2]
        return val
    del args[i]
    return True


def load_case(path):
    with open(path, 'rb') as fh:
        data = fh.read()
    case = jsontok.parse_bytes(data)
    if not isinstance(case, dict) or not all(k in case for k in CASE_KEYS_REQUIRED):
        raise ValueError('%s: not a W0 case file (needs %s)' % (path, ', '.join(CASE_KEYS_REQUIRED)))
    if case['op'] not in w0.OPS:
        raise ValueError('%s: unknown op %r' % (path, case['op']))
    return case


def run_case(case, releases):
    """SPEC 11.1: run op on input; conforming when the bytes equal canonicalJson(expected). Returns (ok, got, want)."""
    out = w0.run_op(case['op'], case['input'], releases)
    got = jsontok.canonical(out)
    want = jsontok.canonical(case['expected'])  # integer tokens are written as integers; any depth
    return got == want, got, want


def first_difference(a, b):
    n = min(len(a), len(b))
    for i in range(n):
        if a[i] != b[i]:
            return i
    return n if len(a) != len(b) else -1


def case_files(directory):
    return sorted(os.path.join(directory, f) for f in os.listdir(directory) if f.endswith('.json'))


def cmd_cases(directory, releases, quiet=False):
    files = case_files(directory)
    failed = []
    for path in files:
        try:
            case = load_case(path)
        except ValueError as exc:
            sys.stdout.write('ERROR %s\n' % exc)
            failed.append(os.path.basename(path))
            continue
        try:
            ok, got, want = run_case(case, releases)
        except Exception as exc:  # a crash is a failed case, never the end of the run (V-D01c F1)
            failed.append(case['id'])
            sys.stdout.write('FAIL %s (%s) crashed: %s: %s\n'
                             % (case['id'], os.path.basename(path), type(exc).__name__, exc))
            continue
        if not ok:
            failed.append(case['id'])
            i = first_difference(got, want)
            sys.stdout.write('FAIL %s (%s) first difference at byte %d\n  got  ...%s\n  want ...%s\n'
                             % (case['id'], os.path.basename(path), i, got[max(0, i - 80):i + 80],
                                want[max(0, i - 80):i + 80]))
        elif not quiet:
            sys.stdout.write('PASS %s %s\n' % (case['id'], case['op']))
    sys.stdout.write('%d/%d cases byte-identical%s\n'
                     % (len(files) - len(failed), len(files), '' if not failed else '; failed: ' + ' '.join(map(str, failed))))
    return 0 if not failed else 1


def main(argv):
    args = list(argv)
    world_dir = _pop_opt(args, '--world-dir') or w0.default_world_dir()
    if not args:
        _usage('no command')
    if args[0] == '--test':
        import test_domain
        return test_domain.main(world_dir)
    if args[0] == '--population' or '--population' in args:
        import population
        _pop_opt(args, '--population', takes_value=False)
        rung = _pop_opt(args, '--rung') or '100k'
        out = _pop_opt(args, '--out')
        expect = bool(_pop_opt(args, '--expect', takes_value=False))
        fingerprint = bool(_pop_opt(args, '--fingerprint', takes_value=False))
        stats = not bool(_pop_opt(args, '--no-stats', takes_value=False))
        if args:
            _usage('unexpected arguments %r' % args)
        if not fingerprint:
            _usage('--population needs --fingerprint')
        return population.main(rung, world_dir, out, expect, stats)
    releases = w0.Releases(world_dir)
    cmd = args[0]
    if cmd == 'run':
        quiet = bool(_pop_opt(args, '--quiet', takes_value=False))
        if len(args) != 2:
            _usage('run needs one case file')
        case = load_case(args[1])
        ok, got, want = run_case(case, releases)
        sys.stdout.write(got + '\n')
        if not quiet:
            sys.stderr.write('%s %s\n' % ('PASS' if ok else 'FAIL', case['id']))
        return 0 if ok else 1
    if cmd == 'cases':
        directory = args[1] if len(args) > 1 else os.path.join(world_dir, 'cases')
        return cmd_cases(directory, releases)
    if cmd in w0.OPS:
        if len(args) > 2:
            _usage('%s takes at most one input file' % cmd)
        if len(args) == 1 or args[1] == '-':
            data = sys.stdin.buffer.read()
        else:
            with open(args[1], 'rb') as fh:
                data = fh.read()
        out = w0.run_op_bytes(cmd, data, releases)
        sys.stdout.write(jsontok.canonical(out) + '\n')
        return 0
    if cmd == 'release-hash':
        if len(args) != 2:
            _usage('release-hash needs one file')
        with open(args[1], 'rb') as fh:
            doc = jsontok.parse_bytes(fh.read())
        sys.stdout.write(w0.Release(doc).hash + '\n')
        return 0
    _usage('unknown command %r' % cmd)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
