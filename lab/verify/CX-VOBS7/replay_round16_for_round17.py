#!/usr/bin/env python3
"""Execute unchanged R16 adversarial assertions or the explicitly re-pinned data replay into a fresh output directory."""
from pathlib import Path
import sys
import unittest
HERE=Path(__file__).resolve().parent
if sys.argv[1]=='adversarial':
    import test_round16_adversarial as target
    target.OUT=HERE/'round17/replay16-python';target.OUT.mkdir(exist_ok=False)
    unittest.main(module=target,argv=[sys.argv[0]],verbosity=2)
else:
    import review_round16 as target
    target.OUT=HERE/'round17/recorded';target.OUT.mkdir(exist_ok=False);target.prior.OUT=target.OUT
    target.main()
