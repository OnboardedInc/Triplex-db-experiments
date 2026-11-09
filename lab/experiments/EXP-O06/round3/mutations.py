"""EXP-O06 round 3: exact reviewer's in-memory substitutions, isolated diagnostic processes."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[4]
sys.path.insert(0,str(ROOT))
# Execute only the retained apply/witness definitions; do not invoke the historical runner.
SOURCE=Path(__file__).parent/'reviewer/coverage.original.py'
scope={'__file__':str(ROOT/'lab/verify/O06/round2_coverage.py'),'__name__':'review_variants'}
exec(compile(SOURCE.read_text().split("names=['Q70E-unfiltered-prefixes'")[0],str(SOURCE),'exec'),scope)
name=sys.argv[1];out=Path(sys.argv[2]);out.mkdir(exist_ok=False,parents=True)
scope['apply'](name)
suite=unittest.defaultTestLoader.discover(str(ROOT/'lab/oracles/replay/tests'),top_level_dir=str(ROOT))
with (out/'unit.log').open('w') as f:
 result=unittest.TextTestRunner(stream=f,verbosity=1).run(suite)
row={'variant':name,'scope':'in-memory diagnostic; runtime source hashes alone do not identify substituted behavior',
 'variantSourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
 'testsRun':result.testsRun,'failures':[t.id() for t,_ in result.failures],'errors':[t.id() for t,_ in result.errors]}
(out/'result.json').write_text(json.dumps(row,indent=2)+'\n')
print(json.dumps(row))
