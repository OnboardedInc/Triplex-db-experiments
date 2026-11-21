"""Derive a trace-only adapter for the pinned PostgreSQL append producer."""

import hashlib
import json
from pathlib import Path
import subprocess
import sys

pin = "df1b45d6bca9013dfc7a6adc79c961242dfc5a03"
directory = Path("lab/experiments/EXP-DX1/prep1")
repo = Path(sys.argv[1]).resolve()
remaining = sys.argv[2:] == ["remaining"]
assert remaining or len(sys.argv) == 2
assert subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip() == pin

proof = {}
names = ("prep1/server.sh", "prep1/tail-observe.py", "prep1/tail-postgres.bt")
for name in (*names, "stack/up.sh") if remaining else names:
    path = directory.parent / name
    filename = path.name
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
        if remaining:
            replace('cells=(1-tail-control-S 1-tail-wal-S 1-tail-zgc-S 1-tail-fair-S)',
                    'cells=(1-tail-zgc-S 1-tail-fair-S)')
            replace('bash "$stack/up.sh"', 'bash "$stack/.bm1-up.sh"', 2)
    elif filename == "up.sh":
        # [DX-BM1] Why: the mixed-runtime arm checks each actual JVM against its own pinned image.
        # Rejected: expecting Java 21 from the verified Java 25 transactor or disabling the version check.
        replace('  grep -F "Version: $(node "$runtime_tool" version)" "$attempt/config/$role.gc-init.txt" >/dev/null',
                '''  if [[ $role == tx && ${DX_PREP1_TAIL_TX_ZGC:-0} == 1 ]]; then
    expected_version=$(j25 version)
  else
    expected_version=$(node "$runtime_tool" version)
  fi
  grep -F "Version: $expected_version" "$attempt/config/$role.gc-init.txt" >/dev/null''')
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
    with (repo/path.with_name(".bm1-"+filename)).open("xb") as output:
        output.write(data)
    proof[name] = {"original": hashlib.sha256(original).hexdigest(),
                   "adapted": hashlib.sha256(data).hexdigest()}

print(json.dumps({"source": pin, "observer": "fdatasync-within-XLogFlush",
                  "remaining": remaining, "files": proof}, indent=2))
