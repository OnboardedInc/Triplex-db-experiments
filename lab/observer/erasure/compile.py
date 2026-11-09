#!/usr/bin/env python3
"""Freeze all decoder/decryptor bytes and evaluator case into one O-OBS parser."""
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
import sys


def compile_normalizer(spec, node_path=None):
    root = Path(__file__).resolve().parent
    # [EXP-ER01-S] Why: Python subprocess parsers are independently replayed by O-OBS.
    # Rejected: importing mutable adjacent code or a case chosen by observed bytes.
    source = (root / 'fsst.py').read_text() + '\n' + (root / 'scanners.py').read_text()
    source += '\nDECRYPT_JS = ' + repr((root / 'decrypt.mjs').read_text())
    node = Path(node_path or shutil.which('node')).resolve(strict=True)
    source += '\nNODE_PATH = ' + repr(str(node))
    source += '\nNODE_SHA256 = ' + repr(hashlib.sha256(node.read_bytes()).hexdigest())
    source += '\nNODE_VERSION = ' + repr(subprocess.check_output([str(node), '--version']).decode().strip())
    source += '\nSPEC = ' + repr(spec)
    source += "\nif __name__ == '__main__':\n    import sys\n    print(json.dumps(normalize_erasure(sys.stdin.buffer.read(), SPEC), sort_keys=True, separators=(',', ':'), allow_nan=False))\n"
    return source.encode()


if __name__ == '__main__':
    Path(sys.argv[2]).write_bytes(compile_normalizer(json.loads(Path(sys.argv[1]).read_bytes())))
