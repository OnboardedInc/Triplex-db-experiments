#!/usr/bin/env python3
"""Run unchanged prior fixtures with fresh evidence destinations only."""
import importlib
from pathlib import Path
import sys
import unittest
HERE=Path(__file__).resolve().parent
names={'r16':'test_round16_adversarial','r17':'test_round17_review','pipeline':'test_round17_pipeline','recorded':'review_round16'}
key=sys.argv[1];target=importlib.import_module(names[key]);target.OUT=HERE/'round18'/('replay-'+key);target.OUT.mkdir(exist_ok=False)
if key=='recorded':target.prior.OUT=target.OUT;target.main()
else:unittest.main(module=target,argv=[sys.argv[0]],verbosity=2)
