"""Point the shared image tags back at the images a given build made (BUILD-v0.1.json or results/images.json)."""
# [DX-BM1] Why: every build retags tx2-datomic:*; a launcher verifies its own receipt, so restore its tags just before it runs.
# Rejected: rebuilding again (minutes) when the exact image IDs are still present locally.
import json
import subprocess
import sys

path = sys.argv[1]
data = json.load(open(path))
if isinstance(data, dict):
    pairs = [(ref.split("@")[0], image) for ref, image in data["images"].items()]
else:
    pairs = [(tag, image["Id"]) for image in data for tag in image.get("RepoTags", []) if "@" not in tag]
for tag, image in pairs:
    subprocess.run(["docker", "tag", image, tag], check=True)
    now = subprocess.run(["docker", "image", "inspect", "--format", "{{.Id}}", tag], check=True,
                         capture_output=True, text=True).stdout.strip()
    assert now == image, (tag, now, image)
    print(tag, image)
