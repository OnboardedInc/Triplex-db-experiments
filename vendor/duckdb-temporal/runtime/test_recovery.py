"""Real new-database crash/WAL and versioned migration acceptance controls."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess
import sys
import tempfile
import threading
import unittest

import duckdb

from temporal_store import Assertion, Store, Value

ROOT=Path(__file__).resolve().parent
P="answer(?v) :- triple('u','age',?v)."
CRASH=r'''
import os,sys
from temporal_store import Assertion,Store,Value
s=Store(sys.argv[1])
stage=sys.argv[2]
def checkpoint(phase):
    if phase==stage: os._exit(73)
s._checkpoint=checkpoint
s.transact('correction',[Assertion('b','u','age',Value('i64','2'))],['a'])
raise RuntimeError('fault did not execute')
'''


class RecoveryTests(unittest.TestCase):
    def test_two_connections_conflict_then_whole_command_retry(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'contention.duckdb'
            with Store(path) as left,Store(path) as right,ThreadPoolExecutor(max_workers=2) as pool:
                barrier=threading.Barrier(2)
                def checkpoint(phase):
                    if phase=='command_header':barrier.wait(timeout=3)
                left._checkpoint=right._checkpoint=checkpoint
                commands=[('left',Assertion('a','u','age',Value('i64','1'))),
                          ('right',Assertion('b','v','age',Value('i64','2')))]
                futures=[pool.submit(s.transact,command,[assertion])
                         for s,(command,assertion) in zip((left,right),commands)]
                failures=[]
                for index,future in enumerate(futures):
                    try:future.result(timeout=5)
                    except duckdb.TransactionException:failures.append(index)
                self.assertEqual(len(failures),1)
                left._checkpoint=right._checkpoint=lambda phase:None
                loser=failures[0]
                self.assertIsNone(left.receipt(commands[loser][0]))
                # The store has acknowledged rollback; retry the whole exact
                # command, never a subset of its statements.
                receipt=(left,right)[loser].transact(commands[loser][0],[commands[loser][1]])
                self.assertEqual(receipt.position,2)
                self.assertEqual({left.receipt(x[0]).position for x in commands},{1,2})
                self.assertEqual(len(left.history()),2)

    def test_crash_before_and_after_commit_preserves_complete_command(self):
        for phase in ('command_header','retraction','assertion','clock','after_commit'):
            with self.subTest(phase=phase),tempfile.TemporaryDirectory() as d:
                path=Path(d)/'store.duckdb'
                with Store(path) as s:
                    s.transact('seed',[Assertion('a','u','age',Value('i64','1'))])
                    before=s.history()
                child=subprocess.run([sys.executable,'-c',CRASH,str(path),phase],cwd=ROOT,
                                     capture_output=True,timeout=10)
                self.assertEqual(child.returncode,73)
                self.assertEqual(child.stdout,b'')
                self.assertEqual(child.stderr,b'')
                # No checkpoint/close occurred in the crashed writer. This
                # is a fresh reader resolving both history and receipt state.
                with Store(path) as s:
                    committed=phase=='after_commit'
                    receipt=s.receipt('correction')
                    self.assertEqual(receipt is not None,committed)
                    self.assertEqual(s.query(P).position,2 if committed else 1)
                    self.assertEqual(s.query(P).rows,((Value('i64','2' if committed else '1'),),))
                    self.assertEqual(s.query(P,known_at=1).rows,((Value('i64','1'),),))
                    if not committed:self.assertEqual(s.history(),before)
                    retried=s.transact('correction',[Assertion('b','u','age',Value('i64','2'))],['a'])
                    self.assertEqual(retried.position,2)
                    self.assertEqual(len(s.history()),2)

    def _legacy(self,path):
        with duckdb.connect(str(path)) as connection:
            connection.execute((ROOT/'temporal_store/schema.sql').read_text())
            connection.execute("INSERT INTO commands VALUES ('seed','original-hash',1,?)",
                ['{"command_id":"seed","position":1,"asserted":["a"],"retracted":[]}'])
            connection.execute("INSERT INTO assertions VALUES ('a','u','age','i64','\"1\"',0,99,1,9223372036854775807,'seed',NULL)")
            connection.execute('UPDATE clock SET position=1')

    def test_actual_v1_migration_preserves_history_receipts_and_constraints(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'legacy.duckdb';self._legacy(path)
            with Store(path) as s:
                self.assertEqual(s._conn.execute('SELECT version FROM store_meta').fetchall(),[(5,)])
                self.assertEqual(s.query(P).rows,((Value('i64','1'),),))
                self.assertEqual(s.receipt('seed').position,1)
                self.assertEqual(s.history()[0].command_id,'seed')
                s.transact('two',[Assertion('b','u','age',Value('i64','2'))],['a'])
                expected=s.history()
            with Store(path) as s:self.assertEqual(s.history(),expected)

    def test_migration_failure_rolls_back_schema_and_backfill(self):
        class FailingMigration(Store):
            def _checkpoint(self,phase):
                if phase=='migration_backfill':raise RuntimeError('injected migration fault')
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'legacy.duckdb';self._legacy(path)
            with self.assertRaisesRegex(RuntimeError,'injected migration fault'):FailingMigration(path)
            with duckdb.connect(str(path)) as c:
                self.assertEqual(c.execute('SELECT version FROM store_meta').fetchall(),[(1,)])
                self.assertNotIn('payload_hash',{r[1] for r in c.execute("PRAGMA table_info('assertions')").fetchall()})
                self.assertEqual(c.execute('SELECT count(*) FROM assertions').fetchone()[0],1)
            with Store(path) as s:self.assertEqual(s.query(P).rows,((Value('i64','1'),),))


if __name__=='__main__':unittest.main(verbosity=2)
