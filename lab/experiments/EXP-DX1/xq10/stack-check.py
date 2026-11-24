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
pinned = (attempt / "config" / "java-image.txt").read_text().split()[0] if (attempt / "config" / "java-image.txt").exists() else None
bad = 0
for c in s["containers"]:
    now = subprocess.run(["docker", "inspect", "--format", "{{.Image}}", c["name"]], capture_output=True, text=True).stdout.strip()
    datomic = c["name"].endswith(("-tx", "-gw-w", "-gw-r", "-gw-q"))
    ok = now == c["imageId"] and (not datomic or pinned is None or pinned in (c["imageId"], c["imageId"].split(":")[-1]))
    bad += not ok
    print(f"{'ok' if ok else 'DIFFERENT'} {c['name']} image {now}" + (f" (pinned {pinned})" if datomic else ""))
files = {str(p.relative_to(gw)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(gw.rglob("*")) if p.is_file()}
mine = hashlib.sha256(json.dumps(files, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
ok = mine == s["gatewaySourceSha256"]; bad += not ok
print(f"{'ok' if ok else 'DIFFERENT'} gateway source {s['gatewaySourceSha256']} (recomputed {mine})")
if s.get("questionReaderUrl"):
    h = json.loads(urllib.request.urlopen(s["questionReaderUrl"] + "/health", timeout=10).read())
    ok = h.get("gatewaySourceHash") == s["gatewaySourceSha256"]; bad += not ok
    print(f"{'ok' if ok else 'DIFFERENT'} question reader /health source {h.get('gatewaySourceHash')}")
print("XQ10_STACK_CHECK", "pass" if bad == 0 else f"{bad} differences")
sys.exit(1 if bad else 0)
