# [EXP-QNODELAY] Why: one schema, even for Python report tools. Rejected: copying
# enum checks into Python, or injecting a command-line mode into old observations.
import json
import os
from pathlib import Path
import subprocess


def read_latency_receipt(file, lane="qlever"):
    cli = Path(__file__).with_name("parse-cli.mjs")
    result = subprocess.run(
        [os.environ.get("NODE", "node"), str(cli), str(file), lane], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=True,
    )
    return json.loads(result.stdout)["data"]
