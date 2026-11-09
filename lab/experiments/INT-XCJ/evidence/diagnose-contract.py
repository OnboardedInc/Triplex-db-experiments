"""Retain generated comparison bytes without changing acceptance artifacts."""
import difflib
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location('contract', 'lab/acceptance/build_contract.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
output = Path('lab/experiments/INT-XCJ/evidence')

def trace(frame, event, arg):
    if frame.f_code.co_name == 'main' and event == 'line' and 'outputs' in frame.f_locals:
        sys.settrace(None)
        for name, generated in frame.f_locals['outputs']:
            original = (module.HERE / name).read_text()
            if original != generated:
                (output / ('generated-' + name)).write_text(generated)
                (output / (name + '.diff')).write_text(''.join(difflib.unified_diff(original.splitlines(True), generated.splitlines(True), fromfile='committed/' + name, tofile='generated/' + name)))
        return None
    return trace

sys.argv = ['build_contract.py', '--verify']
sys.settrace(trace)
module.main()
