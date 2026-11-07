"""Large retained-history and SQL-owned admission tests on actual DuckDB."""
from pathlib import Path
import tempfile
import unittest

from temporal_store import Assertion,Limits,PlanError,Store,Value

COUNT="source(?e,?v) :- triple(?e,'age',?v). answer(count()) :- source(?e,?v)."


class ScaleTests(unittest.TestCase):
    def test_twenty_thousand_rows_sql_native_usage_and_reopen(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'scale.duckdb'
            with Store(path) as s:
                for offset in range(0,20000,2000):
                    s.transact(str(offset),[Assertion(str(n),str(n),'age',Value('i64',str(n%10)))
                        for n in range(offset,offset+2000)])
                # This fails if the SQL or native paths regress to eager
                # retained-history materialization in Python.
                def forbidden():raise AssertionError('eager history must not be used')
                s._history=forbidden
                result=s.query(COUNT)
                self.assertEqual(result.result.plan.route,'sql')
                self.assertEqual(result.rows,((Value('i64','20000'),),))
                self.assertEqual(result.rows,s.query(COUNT,force_native=True).rows)
                self.assertEqual(s._conn.execute('SELECT retained_count FROM storage_usage').fetchone()[0],20000)
                # A duplicate identity rolls back both the command and usage.
                with self.assertRaises(Exception):s.transact('duplicate',[Assertion('0','x','age',Value('i64','1'))])
                self.assertIsNone(s.receipt('duplicate'))
                self.assertEqual(s._conn.execute('SELECT retained_count FROM storage_usage').fetchone()[0],20000)
                s.transact('correct',[Assertion('replacement','0','age',Value('i64','21'))],['0'])
                self.assertEqual(s.query(COUNT).rows,((Value('i64','20000'),),))
                self.assertEqual(s.query(COUNT,known_at=10).rows,((Value('i64','20000'),),))
                first=s.history_page(limit=19)
                second=s.history_page(after_id=first[-1].assertion.id,limit=19)
                self.assertEqual(len(first),19);self.assertEqual(len(second),19)
                self.assertLess(first[-1].assertion.id,second[0].assertion.id)
            with Store(path) as s:
                self.assertEqual(s.query(COUNT).rows,((Value('i64','20000'),),))
                self.assertEqual(s.receipt('correct').position,11)

    def test_inactive_corrupt_carrier_is_not_hidden_by_sql_snapshot(self):
        with Store() as s:
            s.transact('seed',[Assertion('a','u','age',Value('f64','0000000000000001'),0,1)])
            s._conn.execute('UPDATE assertions SET v_f=0.0 WHERE assertion_id=?',['a'])
            with self.assertRaisesRegex(PlanError,'persisted typed'):
                s.query(COUNT,valid_at=10)

    def test_sql_budget_failure_does_not_publish_partial_native_output(self):
        with Store() as s:
            s.transact('seed',[Assertion(str(n),str(n),'age',Value('i64',str(n))) for n in range(600)])
            with self.assertRaisesRegex(PlanError,'output row budget'):
                s.query("answer(?e,?v) :- triple(?e,'age',?v).",limits=Limits(max_output_rows=10))
            self.assertEqual(s.query(COUNT).rows,((Value('i64','600'),),))


if __name__=='__main__':unittest.main(verbosity=2)
