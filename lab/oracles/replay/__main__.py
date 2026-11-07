"""`python3 -m lab.oracles.replay <case.json>` (without -I, from the repository root).

Under `python3 -I` use the script entry instead: `python3 -I lab/oracles/replay/cli.py`.
"""
from .cli import main

raise SystemExit(main())
