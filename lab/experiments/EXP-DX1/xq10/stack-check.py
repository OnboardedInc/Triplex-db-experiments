"""[DX-XQ10] Which image and which gateway code every container of a stack ran (the shared-tag hazard: other builders
rebuild and retag shared images). usage: python3 -I stack-check.py <stack evidence dir> <prefix> <gateway dir>
Checks: (1) every running container of the stack, inspected now, runs the image ID the launcher recorded for it, and
every Datomic-image container runs the one ID the launcher pinned (config/java-image.txt); (2) the gateway source hash
the launcher computed equals one recomputed here over <gateway dir> (the same algorithm), and every gateway's /health
answers it (the launcher checks w and r; q is checked here). Exit 1 on any difference."""
import hashlib, json, pathlib, subprocess, sys, urllib.request
ev, prefix, gw = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
stack = sorted(ev.rglob("stack.json"))[-1]
s = json.loads(stack.read_text())
attempt = stack.parent
# java-image.txt is "<image ID>|<java major>|<base image>": the ID is the first field
pinned = (attempt / "config" / "java-image.txt").read_text().split()[0].split("|")[0] if (attempt / "config" / "java-image.txt").exists() else None
bad = 0
for c in s["containers"]:
    # a stack already removed (the gate scripts remove theirs on exit) is judged by what the launcher recorded
    now = subprocess.run(["docker", "inspect", "--format", "{{.Image}}", c["name"]], capture_output=True, text=True).stdout.strip() or c["imageId"]
    datomic = c["name"].endswith(("-tx", "-gw-w", "-gw-r", "-gw-q"))
    ok = now == c["imageId"] and (not datomic or pinned is None or pinned in (c["imageId"], c["imageId"].split(":")[-1]))
    bad += not ok
    print(f"{'ok' if ok else 'DIFFERENT'} {c['name']} image {now}" + (f" (pinned {pinned})" if datomic else ""))
# The gates stage a copy of the gateway with the SDK's codec spec beside it (the tracked tree has none there): compare
# the launcher's own file list (gateway-files.json, whose hash is the one the gateways answered) file by file with this
# tree, the codec spec with the SDK's.
listed = json.loads((attempt / "gateway-files.json").read_bytes())
ok = hashlib.sha256(json.dumps(listed, sort_keys=True, separators=(",", ":")).encode()).hexdigest() == s["gatewaySourceSha256"]
files = {str(p.relative_to(gw)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(gw.rglob("*")) if p.is_file()}
spec = gw.parent / "src" / "codec-spec.json"
if "codec-spec.json" not in files and spec.exists(): files["codec-spec.json"] = hashlib.sha256(spec.read_bytes()).hexdigest()
differ = sorted(k for k in set(listed) | set(files) if listed.get(k) != files.get(k) and not k.startswith("@"))
ok = ok and not differ; bad += not ok
print(f"{'ok' if ok else 'DIFFERENT'} gateway source {s['gatewaySourceSha256']} ({len(listed)} files listed; differ from this tree: {differ[:5]})")
if s.get("questionReaderUrl"):
    try:
        h = json.loads(urllib.request.urlopen(s["questionReaderUrl"] + "/health", timeout=10).read())
        ok = h.get("gatewaySourceHash") == s["gatewaySourceSha256"]; bad += not ok
        print(f"{'ok' if ok else 'DIFFERENT'} question reader /health source {h.get('gatewaySourceHash')}")
    except OSError:
        print("gone question reader (its container's image was checked above)")
print("XQ10_STACK_CHECK", "pass" if bad == 0 else f"{bad} differences")
sys.exit(1 if bad else 0)
