#!/usr/bin/env python3
"""Check a real retained bundle with pinned O-OBS authenticate(); no protocol verdict."""
import importlib.util
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
source = root / 'runs/OBS01/oracle'
sys.path.insert(0, str(source))
spec = importlib.util.spec_from_file_location('observe', source / 'observe.py')
oracle = importlib.util.module_from_spec(spec); spec.loader.exec_module(oracle)
retention = Path(sys.argv[1])
context = json.loads(retention.read_bytes())
context.update(format='obs-context/1', protocol='OBS-RESOURCE', obligation='diagnostic-authentication-only', case='diagnostic',
               witnessKind='RESOURCE', thresholdIds=[], contractSha256='diagnostic-not-semantic', bindings={})
records, uncertainty = oracle.authenticate(retention.parent / 'output/bundle', context, sys.argv[2])
print(json.dumps({'authenticated': True, 'semanticAcceptance': False, 'consumer': '463703d', 'streams': {k: len(v[1]['samples']) for k,v in records.items()}, 'maxUncertaintyMs': uncertainty}, sort_keys=True))
