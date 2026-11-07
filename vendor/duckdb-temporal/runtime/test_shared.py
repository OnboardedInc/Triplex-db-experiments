"""Cross-language canonical storage, without simultaneous file ownership."""
from pathlib import Path
import subprocess
import tempfile
import unittest
import duckdb

from temporal_store import Assertion,PlanError,Store,StoreError,Value

ROOT=Path(__file__).resolve().parent
AGE="answer(?v) :- triple('u','age',?v)."


class SharedTests(unittest.TestCase):
    def node(self,path,mode,success=True):
        result=subprocess.run(['node','build/adapter/shared-fixture.mjs',str(path),mode],cwd=ROOT,
                              capture_output=True,text=True,timeout=15)
        if success:
            self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(result.stdout.strip(),'PASS')
        return result

    def test_python_native_node_python_roundtrip(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'shared.duckdb'
            with Store(path) as store:
                store.transact('python-command',[Assertion('python-age','u','age',Value('i64','7'))])
            self.node(path,'cycle')
            with Store(path) as store:
                for native in (False,True):
                    result=store.query(AGE,valid_at=2,force_native=native)
                    self.assertEqual(result.position,2)
                    self.assertEqual(set(result.rows),{(Value('i64','7'),),(Value('f64','4023000000000000'),)})
                    self.assertEqual(store.query(AGE,valid_at=1,force_native=native).rows,((Value('i64','7'),),))
                with self.assertRaises(PlanError):store.query("answer(?v) :- triple('u','manager',?v).",valid_at=10)
                with self.assertRaises(StoreError):store.receipt('node-command')
                store.transact('python-correction',[Assertion('replacement','u','age',Value('i64','11'))],['node-age'])
                self.assertEqual(store._conn.execute('SELECT retained_count FROM storage_usage').fetchone()[0],4)
            self.node(path,'inspect')

    def test_native_node_rejects_lossy_integer_projection(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'exact.duckdb'
            with Store(path) as store:
                store.transact('exact',[Assertion('python-age','u','age',Value('i64','9223372036854775807'))])
            result=self.node(path,'cycle',False)
            self.assertNotEqual(result.returncode,0)
            self.assertIn('cannot be represented by Triplex',result.stderr)
            with Store(path) as store:
                self.assertEqual(store.query(AGE).rows,((Value('i64','9223372036854775807'),),))

    def test_legacy_triplex_migration_rollback_and_typed_payloads(self):
        class FailingMigration(Store):
            def _checkpoint(self,phase):
                if phase=='shared_assertion_backfill':raise RuntimeError('shared migration fault')
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'legacy.duckdb'
            with duckdb.connect(str(path)) as connection:
                connection.execute((ROOT/'fixtures/legacy-triplex-v1.sql').read_text())
                connection.execute("INSERT INTO td_triplex_public_v1.scope_identity VALUES (1,'cross-language-fixture','triplex-public-duckdb/1')")
                connection.execute('INSERT INTO td_triplex_public_v1.triplex_commit_position VALUES (1,1)')
                connection.execute("INSERT INTO td_triplex_public_v1.triplex_command_receipts VALUES ('legacy-command','tx',10)")
                for ident,kind,string,number,boolean,extra in [
                    ('bool','boolean',None,None,1,None),('float','number',None,5e-324,None,None),
                    ('blob','blob','blob-key',None,None,'{"mimeType":"text/plain","size":3}')]:
                    connection.execute('INSERT INTO td_triplex_public_v1.triples VALUES ('+','.join(['?']*20)+')',
                        [ident,'u',ident,kind,string,number,boolean,None,extra,10,1,0,None,None,None,None,None,None,1,'tx'])
            with self.assertRaisesRegex(RuntimeError,'shared migration fault'):FailingMigration(path)
            with duckdb.connect(str(path)) as connection:
                self.assertEqual(connection.execute('SELECT version FROM main.store_meta').fetchone()[0],4)
                self.assertEqual(connection.execute('SELECT count(*) FROM td_triplex_public_v1.triples').fetchone()[0],3)
            with Store(path) as store:
                self.assertEqual(store.query("answer(?v) :- triple('u','bool',?v).").rows,((Value('bool',True),),))
                self.assertEqual(store.query("answer(?v) :- triple('u','float',?v).").rows,((Value('f64','0000000000000001'),),))
                expected=store._conn.execute('SELECT sum(octet_length(encode(e))+octet_length(encode(a))+octet_length(encode(payload))+coalesce(octet_length(encode(extra_json)),0)) FROM main.assertions').fetchone()[0]
                self.assertEqual(store._conn.execute('SELECT retained_count,retained_bytes FROM main.storage_usage').fetchone(),(3,expected))


if __name__=='__main__':unittest.main(verbosity=2)
