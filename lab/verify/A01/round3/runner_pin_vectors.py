"""Pure differential tests for the round-3 runner-pin admission delta."""
import copy
import json
from pathlib import Path
import runpy
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE / 'scratch'
M = runpy.run_path(str(ROOT / 'lab/acceptance/build_contract.py'))
vectors = []


def case(label, id='O-REPLAY', edit=lambda p, r: None):
    pins, runners = copy.deepcopy(M['ORACLE_PINS']), copy.deepcopy(M['ORACLE_RUNNERS'])
    edit(pins, runners)
    vectors.append({'label': label, 'id': id, 'pins': pins, 'runners': runners,
                    'expected': M['runner_pinned'](id, pins, runners)})


def main():
    case('accepted replay full 29-file map')
    case('compiled contract output maps', 'O-CONTRACT')
    case('production O-ERR remains unpinned', 'O-ERR')
    case('entrypoint alone is insufficient', edit=lambda p, r: p['O-REPLAY'].update(sha256={'lab/oracles/replay/cli.py': 'c' * 64}))
    case('one imported file loses hash', edit=lambda p, r: p['O-REPLAY']['sha256'].pop('lab/oracles/replay/views.py'))
    case('empty accepted map without fallback', edit=lambda p, r: p['O-REPLAY'].update(sha256={}))
    case('null accepted map without fallback', edit=lambda p, r: p['O-REPLAY'].update(sha256=None))
    case('invalid accepted hash', edit=lambda p, r: p['O-REPLAY']['sha256'].update({'lab/oracles/replay/views.py': 'wrong'}))
    case('undeclared argv dependency', edit=lambda p, r: r['O-REPLAY']['argv'].append('lab/oracles/new.py'))
    case('declared dependency missing hash', edit=lambda p, r: r['O-REPLAY']['files'].append('lab/oracles/new.py'))
    case('runner entry missing', edit=lambda p, r: r.pop('O-REPLAY'))
    case('empty runner argv', edit=lambda p, r: r['O-REPLAY'].update(argv=[]))
    case('compiled projection hash missing', 'O-CONTRACT', lambda p, r: r['O-CONTRACT']['sha256'].pop('lab/acceptance/oracle-contract.json'))
    case('compiled map empty', 'O-CONTRACT', lambda p, r: r['O-CONTRACT'].update(sha256={}))
    case('compiled malformed hash', 'O-CONTRACT', lambda p, r: r['O-CONTRACT']['sha256'].update({'lab/acceptance/build_contract.py': 'bad'}))
    case('compiled undeclared argv file', 'O-CONTRACT', lambda p, r: r['O-CONTRACT']['argv'].append('lab/acceptance/extra.py'))
    case('empty pin map falls back to complete compiled map', 'O-CONTRACT', lambda p, r: p.update({'O-CONTRACT': {'sha256': {}}}))
    case('nonempty partial pin cannot borrow compiled fallback', 'O-CONTRACT', lambda p, r: p.update({'O-CONTRACT': {'sha256': {'lab/acceptance/build_contract.py': 'c' * 64}}}))
    proc = subprocess.run(['node', str(HERE / 'pin_predicate_probe.mjs')], input=json.dumps(vectors), text=True, capture_output=True)
    (HERE / 'pin-predicate-results.json').write_text(proc.stdout)
    if proc.stderr:
        print(proc.stderr)
    results = json.loads(proc.stdout)
    print(f"pin predicate vectors: {sum(r['match'] for r in results)}/{len(results)} match Python")
    raise SystemExit(proc.returncode)


if __name__ == '__main__':
    main()
