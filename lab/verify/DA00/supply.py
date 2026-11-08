import hashlib
import json
import pathlib
import subprocess
import zipfile

# [CX-VDA00] Why: independently compare retained payloads and image metadata. Rejected: trusting builder PASS text.
root = pathlib.Path(__file__).resolve().parents[3]
out = pathlib.Path(__file__).parent / 'evidence'
download = pathlib.Path('/Users/sam/Claude/Projects/triplex-db-2/downloads/datomic-pro-1.0.7745')
receipt = json.loads((root / 'lab/experiments/EXP-DA00-datomic-bringup/receipts/build-5.json').read_text())
pins = json.loads((root / 'lab/config/slots.json').read_text())['lanes']['datomic']
digest = lambda b: hashlib.sha256(b).hexdigest()
archive_path = download / 'datomic-pro-1.0.7745.zip'
with zipfile.ZipFile(archive_path) as archive:
    prefix = 'datomic-pro-1.0.7745/'
    expected = {n[len(prefix):]: digest(archive.read(n)) for n in archive.namelist() if n.startswith(prefix) and not n.endswith('/')}
dist = download / 'extracted/datomic-pro-1.0.7745'
actual = {str(p.relative_to(dist)): digest(p.read_bytes()) for p in dist.rglob('*') if p.is_file()}
assert actual == expected
assert {p['path']: p['sha256'] for p in receipt['distribution']} == expected
zip_sha = digest(archive_path.read_bytes())
assert zip_sha == receipt['verification']['zipSha256']
peer = (dist / 'peer-1.0.7745.jar').read_bytes()
peer_sha1 = hashlib.sha1(peer).hexdigest()
assert peer_sha1 == (download / 'peer.jar.sha1').read_text().strip() == receipt['verification']['peerSha1']
assert peer == (download / 'peer-1.0.7745.jar').read_bytes()
assert (download / 'peer.jar.asc').read_bytes() == (root / 'lab/config/datomic/peer.jar.asc').read_bytes()
for kind, directory in [('config', root / 'lab/config/datomic'), ('gateway', root / 'packages/datomic/gateway')]:
    for item in receipt['sources'][kind]:
        assert digest((directory / item['path']).read_bytes()) == item['sha256'], item['path']
compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode()
assert digest(compact({'sources': receipt['sources'], 'distribution': receipt['distribution']})) == pins['buildInputsSha256']
assert digest(compact({'config': receipt['sources']['config'], 'gateway': receipt['sources']['gateway']})) == pins['sourceInputsSha256']
assert digest(compact({'config': receipt['sources']['config'], 'gateway': receipt['sources']['gateway']})) == receipt['sources']['sha256']
image = json.loads(subprocess.check_output(['docker', '-H', 'unix:///Users/sam/.colima/triplex2/docker.sock', 'image', 'inspect', pins['imageId']]))[0]
assert image['Id'] == pins['imageId'] == receipt['imageId']
assert image['Config']['Labels']['tx2.build-inputs-sha256'] == pins['buildInputsSha256']
(out / 'image-inspect.json').write_text(json.dumps(image, indent=2) + '\n')
result = {'zipSha256': zip_sha, 'zipBytes': archive_path.stat().st_size, 'peerSha1': peer_sha1,
          'distributionFiles': len(expected), 'extractionMatchesZip': True, 'receiptMatchesExtraction': True,
          'sourcesMatchReceipt': True, 'inputHashesRecomputed': True, 'imageId': image['Id'], 'imageLabelMatches': True}
(out / 'supply.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
