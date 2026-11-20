import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("seed", Path(__file__).with_name("pristine-seed.py"))
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class SeedProof(unittest.TestCase):
    def test_rejects_occupied_or_incorrect_seed(self):
        with tempfile.TemporaryDirectory() as temp:
            slot, source = "tx2-dxt1-bm1-fixture-seed", "a" * 40
            run = Path(temp) / slot
            run.mkdir()
            scope = "dxt1-w0-100000-" + slot
            manifest = b"fixed test source"
            (run / "source.SHA256SUMS").write_bytes(manifest)
            (run / "head.txt").write_text(source + "\n")
            a = {"run": slot, "slot": slot, "scope": scope, "source": source, "subjects": 100000,
                 "nonce": "11111111-1111-4111-8111-111111111111", "sourceManifestSha256": hashlib.sha256(manifest).hexdigest()}
            seed.write(run / "activation-attempt.json", a)
            resume = {"event": "resume", "scope": scope, "N": 100000, "checkpoint": 0, "head": 0, "recovered": 0}
            done = {"event": "chunk-seeded", "endSubjects": 100000, "throughPosition": seed.CUT}
            verified = {"event": "chunk-readback", "endSubjects": 100000, "N": 100000, "scope": scope,
                        "counts": {"position": seed.CUT}, "fingerprint": {"basisTx": seed.CUT, "worlds": seed.WORLDS},
                        "expected": seed.WORLDS}
            def emit(start, end):
                (run / "driver.log").write_text(json.dumps(start, separators=(",", ":")) + "\n" + json.dumps(done) + "\n")
                (run / "seed-readback.log").write_text(json.dumps(end) + "\n")
            emit(resume, verified)
            proof = seed.seed_proof(run, slot, source)
            self.assertEqual(proof["worlds"], seed.WORLDS)
            self.assertEqual(proof["inputs"]["driver.log"], seed.sha(run / "driver.log"))
            for start, end in [
                    ({**resume, "head": 1}, verified),
                    (resume, {**verified, "counts": {"position": seed.CUT + 1}}),
                    (resume, {**verified, "scope": "another-scope"}),
                    (resume, {**verified, "fingerprint": {"basisTx": seed.CUT, "worlds": "edited"}, "expected": "edited"})]:
                emit(start, end)
                with self.assertRaises(AssertionError):
                    seed.seed_proof(run, slot, source)
            emit(resume, verified)
            with self.assertRaises(AssertionError):
                seed.seed_proof(run, slot, "b" * 40)


if __name__ == "__main__":
    unittest.main()
