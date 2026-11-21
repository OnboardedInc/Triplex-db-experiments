"""Derive a trace-only adapter for the pinned PostgreSQL append producer."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

pin = "df1b45d6bca9013dfc7a6adc79c961242dfc5a03"
directory = Path("lab/experiments/EXP-DX1/prep1")
repo = Path(sys.argv[1]).resolve()
assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == pin

proof = {}
for filename in ("server.sh", "tail-observe.py", "tail-postgres.bt"):
    path = directory / filename
    original = (repo/path).read_bytes()
    assert original == subprocess.check_output(["git", "show", f"{pin}:{path}"], cwd=repo)
    source = original.decode()

    def replace(before, after, count=1):
        global source
        assert source.count(before) == count, (filename, before)
        source = source.replace(before, after)

    if filename == "server.sh":
        replace("git status --porcelain", "git status --porcelain --untracked-files=no")
        replace('bash "$here/server.sh"', 'bash "$here/.bm1-server.sh"', 5)
        replace('"$here/tail-observe.py"', '"$here/.bm1-tail-observe.py"', 2)
    elif filename == "tail-observe.py":
        replace('with_name("tail-postgres.bt")', 'with_name(".bm1-tail-postgres.bt")')
    else:
        start = source.index("uprobe:@PG@:issue_xlog_fsync")
        end = source.index("uprobe:@PG@:CreateCheckPoint")
        block = source[start:end]
        assert block.count("issue_xlog_fsync") == 2
        # [DX-BM1] Why: the binary saw no entry to the exported fsync helper.
        # Rejected: accepting a commit without a successful same-backend fdatasync inside XLogFlush.
        replace(block, r'''tracepoint:syscalls:sys_enter_fdatasync /@flush[tid]/ {
  @wal[tid] = nsecs(monotonic);
  @walfd[tid] = (uint64)args.fd;
}
tracepoint:syscalls:sys_exit_fdatasync /@wal[tid]/ {
  if (args.ret == 0) {
    @emitted = count();
    printf("W\t%d\t%llu\t%llu\t%llu\n", pid, @wal[tid], nsecs(monotonic), @walfd[tid]);
  }
  delete(@wal[tid]);
  delete(@walfd[tid]);
}

''')
    data = source.encode()
    with (repo/directory/(".bm1-"+filename)).open("xb") as output:
        output.write(data)
    proof[filename] = {"original": hashlib.sha256(original).hexdigest(),
                       "adapted": hashlib.sha256(data).hexdigest()}

print(json.dumps({"source": pin, "observer": "fdatasync-within-XLogFlush", "files": proof}, indent=2))
