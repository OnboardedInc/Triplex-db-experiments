#!/usr/bin/env python3
# [EXP-OBS01] Why: evaluator selects and pins a standalone protocol parser before collection.
# Rejected: executing a bundle-selected plugin or trusting source.records supplied by a client.
import json
from pathlib import Path
import sys
root=Path(__file__).resolve().parent

def compile_parser(spec,source_id):
    entry="resident_normalize(sys.stdin.buffer.read(),SPEC,SOURCE_ID)" if spec.get('resident') else "protocol_normalize(sys.stdin.buffer.read(),SPEC,SOURCE_ID)"
    source=(root/'normalize.py').read_text().split("if __name__ == '__main__':",1)[0]
    return (source+'\n'+(root/'protocol_extra.py').read_text()+'\n'+(root/'protocol.py').read_text()+ '\nSPEC='+repr(spec)+'\nSOURCE_ID='+repr(source_id)+
            "\nif __name__ == '__main__':\n    print(json.dumps("+entry+",sort_keys=True,separators=(',', ':'),allow_nan=False))\n").encode()
if __name__=='__main__':
    spec=json.loads(Path(sys.argv[1]).read_bytes());Path(sys.argv[3]).write_bytes(compile_parser(spec,sys.argv[2]))
