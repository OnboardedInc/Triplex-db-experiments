import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

BASE = Path(__file__).resolve().parent


def module(name):
    spec = importlib.util.spec_from_file_location(name, BASE / (name + ".py"))
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


night, archive, collector = (module(name) for name in ("overnight", "night-archive", "night-client"))


class OvernightEvidence(unittest.TestCase):
    def test_foreign_request_paths_never_select_a_cleanup_target(self):
        tag, root, unit = night.coordinates(3, 1)
        r = dict(item=3, attempt=1, tag=tag, root=str(root), unit=unit, source="a"*40, start=1,
                 deadline=10801, repo=str(night.NIGHT/("source-"+"a"*40)), directory=str(night.NIGHT/"i3/1"))
        self.assertEqual(night.bind(r), r)
        for key,value in {"tag":"grpw1a","root":"/var/tmp/unrelated","unit":"unrelated","source":"other",
                          "repo":"/tmp/other","directory":"/tmp/other","deadline":99999}.items():
            with self.assertRaises(AssertionError):
                night.bind({**r,key:value})

    def test_archive_checks_summary_and_terminal_on_the_mac(self):
        with tempfile.TemporaryDirectory() as temp:
            top=Path(temp)
            directory=top/"control";directory.mkdir()
            native=top/"native";(native/"results").mkdir(parents=True)
            now=int(time.time())-10
            r=dict(item=3, attempt=1, source="c"*40, tag="w1trial01", start=now, directory=str(directory),root=str(native))
            terminal=dict(source=r["source"],tag=r["tag"],ended=night.stamp(now+2),clean=True)
            for name,doc in (("request.json",r),("terminal.json",terminal)):
                (directory/name).write_text(json.dumps(doc))
            (native/"results/trace.bin").write_bytes(b"private trace record")
            (native/"results/result.json").write_text('{"measurements":4}')
            with patch.object(archive,"NIGHT",top):
                archive.seal(r,terminal)
            bundle=top/"bundles/i3-1"
            transfer=json.loads((bundle/"TRANSFER.json").read_bytes())
            self.assertGreater(transfer["raw"]["bytes"],0)
            self.assertLess(transfer["raw"]["bytes"],2**30)
            output=top/"mac";output.mkdir()
            collector.unpack(bundle/"summary.tar.zst",output,transfer)
            self.assertEqual(collector.hashfile(output/"control/request.json"),transfer["requestSha256"])
            with self.assertRaises(AssertionError):
                collector.unpack(bundle/"summary.tar.zst",output,{**transfer,"source":"b"*40})
            with self.assertRaises(AssertionError):
                collector.unpack(bundle/"summary.tar.zst",output,{**transfer,"terminalSha256":"0"*64})
            with self.assertRaises(AssertionError):
                archive.seal(r,{**terminal,"tag":"wrong"})

    def test_thin_boundary_precedes_the_first_out_of_scope_arm(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/"results").mkdir()
            r=dict(item=3,tag="w1trial01",root=str(root))
            night.restrict_scope(r)
            self.assertEqual((root/"results/arm-5").read_text(),"BM1 thin-only boundary w1trial01\n")
            with self.assertRaises(FileExistsError):
                (root/"results/arm-5").mkdir()
            self.assertFalse((root/"active-slot").exists())


if __name__ == "__main__":
    unittest.main()
