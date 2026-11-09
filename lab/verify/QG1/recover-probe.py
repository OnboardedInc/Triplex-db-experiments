#!/usr/bin/env python3
import hashlib
import json
from pathlib import Path
import re
import shlex

# [CX-VQG1] Why: recover the original source bytes from the logged heredoc and
# require the observed source hash. Rejected: calling a later formatted copy the
# measured preimage. This does not manufacture an original Git snapshot.
log = Path('/Users/sam/Claude/Projects/triplex-db-2/agents/CX-QG1/codex-2026-11-09T02-29-38-409Z.log')
receipt = Path('/Users/sam/Claude/Projects/triplex-db-2/evidence/CX-QG1/phase0-attempt1/receipt.json')
out = Path(__file__).resolve().parent
text = log.read_text()
pattern = r'^exec\n(/bin/zsh -lc [\s\S]*?) in /Users/sam/projects/triplex-db-2/\.claude/worktrees/qg1\n'
commands = [m for m in re.finditer(pattern, text, re.M)
            if 'cat > lab/experiments/EXP-QG1-qlever-generations/probe.mjs' in m.group(1)]
assert len(commands) == 1
parts = shlex.split(commands[0].group(1))
assert parts[:2] == ['/bin/zsh', '-lc'] and len(parts) == 3
body = parts[2].split("<<'EOF'\n", 1)[1].split('\nEOF\n', 1)[0] + '\n'
digest = hashlib.sha256(body.encode()).hexdigest()
assert digest == json.loads(receipt.read_bytes())['source']['probe']
with (out/'phase0-probe-recovered.mjs').open('x') as f:
    f.write(body)
with (out/'source-reconstruction.json').open('x') as f:
    json.dump(dict(sourceLog=str(log), sourceLogSha256=hashlib.sha256(log.read_bytes()).hexdigest(),
                   commandLine=text[:commands[0].start()].count('\n')+1,
                   recoveredSourceSha256=digest, receiptSha256=hashlib.sha256(receipt.read_bytes()).hexdigest(),
                   result='Logged heredoc bytes match observed phase-0 source hash; recovered, not original Git proof.'), f, indent=2)
    f.write('\n')
