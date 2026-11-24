import importlib.util
import unittest
from pathlib import Path

# [DX-INT1] Why: on 2026-11-23 the 32 GiB cache arm at 1 billion was collected with a hand-patched copy of this
# collector (line 281 then asserted the fresh head 87,002; the patch accepted the seed's own head). The repository's
# collector takes the aged head from AGE1's own numbers (seed cut plus replayed saves), which covers that run.
# Rejected: trusting seed["head"] as the patch did, which would accept any head the seed file names.
spec = importlib.util.spec_from_file_location("server_collect", Path(__file__).with_name("server-collect.py"))
collect = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collect)

# The aged fields of that run's seed.json (evidence DX-BM1/bench4/bench4-cache32-aged-r, result/seed.json).
AGED = {"seedCut": 87002, "physicalT": 62888918, "records": 1000251169, "tapeSaves": 28222864}


class SeedHeadTest(unittest.TestCase):
    def test_fresh_seed(self):
        self.assertEqual(collect.seed_head({"head": 87002}), 87002)

    def test_aged_seed_of_the_1b_cache_run(self):
        self.assertEqual(collect.seed_head({"head": 28309866, "aged": AGED}), 28309866)

    def test_aged_seed_with_another_cut_is_refused(self):
        with self.assertRaises(AssertionError):
            collect.seed_head({"head": 28309866, "aged": {**AGED, "seedCut": 87003}})


if __name__ == "__main__":
    unittest.main()
