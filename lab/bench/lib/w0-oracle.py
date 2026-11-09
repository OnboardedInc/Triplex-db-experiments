"""EXP-P5: streaming boundary to the independent O-DOMAIN implementation; no expected values from the TS kernel."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'oracles' / 'domain'))
import jsontok
import w0
releases = w0.Releases(str(Path(__file__).resolve().parents[2] / 'world' / 'W0'))
for line in sys.stdin.buffer:
    try:
        request = jsontok.parse_bytes(line)
        result = w0.run_op(request['op'], request['input'], releases)
        print(jsontok.canonical(result), flush=True)
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        sys.exit(1)
