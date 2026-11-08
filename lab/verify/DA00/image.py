import hashlib
import io
import json
import pathlib
import subprocess
import tarfile
import tempfile

# [CX-VDA00] Why: inspect actual image layers without starting another container. Rejected: labels alone as proof of payload bytes.
here = pathlib.Path(__file__).resolve().parent
repo = here.parents[2]
receipt = json.loads((repo / 'lab/experiments/EXP-DA00-datomic-bringup/receipts/build-5.json').read_text())
docker = ['docker', '-H', 'unix:///Users/sam/.colima/triplex2/docker.sock']
expected = {}
for prefix, entries in [('opt/datomic', receipt['distribution']), ('opt/gateway', receipt['sources']['gateway']), ('config', receipt['sources']['config'])]:
    expected.update({prefix + '/' + e['path']: e['sha256'] for e in entries})
actual = {}
with tempfile.TemporaryFile(dir=here / 'evidence') as saved:
    subprocess.run(docker + ['image', 'save', receipt['imageId']], stdout=saved, check=True)
    saved.seek(0)
    with tarfile.open(fileobj=saved) as archive:
        manifest = json.load(archive.extractfile('manifest.json'))[0]
        for layer in manifest['Layers']:
            with tarfile.open(fileobj=archive.extractfile(layer), mode='r|*') as contents:
                for entry in contents:
                    name = entry.name.removeprefix('./').lstrip('/')
                    if not name.startswith(('opt/datomic/', 'opt/gateway/', 'config/')):
                        continue
                    if entry.isfile():
                        actual[name] = hashlib.sha256(contents.extractfile(entry).read()).hexdigest()
                    elif not entry.isdir():
                        raise AssertionError('Unexpected non-file payload: ' + name)
assert actual == expected, {'extra': sorted(actual.keys() - expected.keys()), 'missing': sorted(expected.keys() - actual.keys()), 'changed': [p for p in actual.keys() & expected.keys() if actual[p] != expected[p]]}
image = json.loads((here / 'evidence/image-inspect.json').read_text())
base = json.loads(subprocess.check_output(docker + ['image', 'inspect', 'eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830ed7b669abc246a8dc520ea8a23cab06f9a8d4b6964109e2f2394e46f']))[0]
assert image['RootFS']['Layers'][:len(base['RootFS']['Layers'])] == base['RootFS']['Layers']
result = {'imageId': image['Id'], 'actualPayloadFiles': len(actual), 'payloadMatchesVerifiedDistributionAndSource': True, 'baseLayerPrefixMatchesPinnedBase': True, 'baseRepoDigests': base['RepoDigests'], 'layerCount': len(manifest['Layers'])}
(here / 'evidence/image-payload.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
