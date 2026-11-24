#!/usr/bin/env python3
# [DX-XQ9] Start a twin of a stack's read gateway that runs another gateway source (the base commit), on the same
# network, storage and environment, published on 127.0.0.1:PORT. Used by gate.sh's twin arms: the same sweep request
# goes to both read gateways and the answers are compared (twin-proxy.mjs).
#   python3 twin.py PREFIX BASE_SOURCE_DIR PORT
import json, subprocess, sys
prefix, source, port = sys.argv[1], sys.argv[2], sys.argv[3]
info = json.loads(subprocess.check_output(["docker", "inspect", prefix + "-gw-r"]))[0]
cfg, host = info["Config"], info["HostConfig"]
args = ["docker", "run", "-d", "--pull", "never", "--name", prefix + "-gw-b", "--network", host["NetworkMode"],
        "--memory", str(host["Memory"]), "--memory-swap", str(host["Memory"]), "-p", "127.0.0.1:%s:8080" % port]
if host.get("CpusetCpus"):
    args += ["--cpuset-cpus", host["CpusetCpus"]]
for k, v in (cfg.get("Labels") or {}).items():
    args += ["--label", "%s=%s" % (k, v)]
for e in cfg["Env"]:
    # The twin's process names itself; everything else (secrets, options, database template) is the read gateway's.
    if e.startswith("TRIPLEX_TRACE_PROCESS="):
        e = "TRIPLEX_TRACE_PROCESS=gw-b"
    args += ["-e", e]
swapped = False
for m in info["Mounts"]:
    src, dst = m.get("Source") or m.get("Name"), m["Destination"]
    if dst == "/opt/gateway":
        src, swapped = source, True
    mode = "" if m.get("RW", True) else ":ro"
    if m["Type"] == "volume":
        args += ["-v", "%s:%s%s" % (m["Name"], dst, mode)]
    else:
        args += ["-v", "%s:%s%s" % (src, dst, mode)]
assert swapped, "the read gateway has no /opt/gateway mount"
ep = cfg.get("Entrypoint") or []
if ep:
    args += ["--entrypoint", ep[0]]
args += [info["Image"]] + ep[1:] + (cfg.get("Cmd") or [])
print(subprocess.check_output(args).decode().strip())
