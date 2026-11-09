# [EXP-G03] Why: exercise actual SQLite transaction primitives offline; rejected: labelling host SQLite measurements as VM evidence.
import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest
s = importlib.util.spec_from_file_location('probe', Path(__file__).with_name('probe.py'))
p = importlib.util.module_from_spec(s)
s.loader.exec_module(p)

class Primitives(unittest.TestCase):
    def test_commit_new_reader(self):
        with tempfile.TemporaryDirectory() as d:
            p.ROOT = Path(d)
            c = p.db()
            r = p.readonly()
            self.assertEqual(p.read(r), 0)
            self.assertGreater(p.commit(c, 1), 0)
            self.assertEqual(p.read(r), 1)
            self.assertEqual(c.execute('SELECT count(*) FROM facts').fetchone()[0], 10)
            self.assertEqual(c.execute('PRAGMA synchronous').fetchone()[0], 2)
            self.assertEqual(c.execute('PRAGMA journal_mode').fetchone()[0], 'wal')
            with self.assertRaises(sqlite3.OperationalError):
                r.execute('UPDATE marker SET lsn=99')
            r.close()
            c.close()
    def test_quantiles(self):
        self.assertEqual(p.summary(list(range(1, 101))), dict(n=100, p50=50, p99=99, unit='ns'))
        for values in [[], [-1], [float('nan')]]:
            with self.assertRaises(ValueError): p.summary(values)
    def test_missing_barrier_times_out(self):
        with tempfile.TemporaryDirectory() as d:
            p.ROOT = Path(d)
            with self.assertRaises(TimeoutError): p.wait('absent', .001)

if __name__ == '__main__': unittest.main()
