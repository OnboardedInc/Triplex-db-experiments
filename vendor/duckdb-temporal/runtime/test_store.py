"""Real-engine public-path regression tests; no recording DB or substituted oracle."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import random
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from temporal_store import Assertion, Cancellation, Limits, QueryCanceled, QueryDeadline, Store, StoreError, Value


def i(n):
    return Value('i64', str(n))


P = "answer(?e,?v) :- triple(?e,'age',?v)."


class PublicStoreTests(unittest.TestCase):
    def test_typed_roundtrip_and_sql_native(self):
        values = [Value('str', '1'), Value('bool', True), i(1), i(-(1 << 63)),
                  i((1 << 63) - 1), Value('f64', '3ff0000000000000'),
                  Value('f64', '0000000000000001'), Value('f64', '7fefffffffffffff'),
                  Value('str', 'é🙂')]
        with Store() as s:
            s.transact('typed', [Assertion(str(n), 'u', 'age', v) for n, v in enumerate(values)])
            sql = s.query(P)
            native = s.query(P, force_native=True)
            self.assertEqual(sql.result.plan.route, 'sql')
            self.assertEqual(sql.rows, native.rows)
            self.assertEqual({row[1] for row in sql.rows}, set(values))

    def test_corrections_receipts_and_reopen(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'store.duckdb'
            a, b = Assertion('a', 'u', 'age', i(17), 0, 10), Assertion('b', 'u', 'age', i(21), 3, 9)
            with Store(path) as s:
                first = s.transact('one', [a])
                self.assertEqual(first, s.transact('one', [a]))
                s.transact('two', [b], ['a'])
                before = s.history()
                self.assertEqual(s.query(P, known_at=1, valid_at=4).rows, ((Value('str','u'), i(17)),))
                self.assertEqual(s.query(P, known_at=2, valid_at=4).rows, ((Value('str','u'), i(21)),))
                self.assertEqual(s.query(P, known_at=2, valid_at=9).rows, ())
            with Store(path) as s:
                self.assertEqual(s.history(), before)
                self.assertEqual(s.receipt('one'), first)
                self.assertEqual(s.transact('one', [a]), first)
                with self.assertRaisesRegex(StoreError, 'different request'):
                    s.transact('one', [b])

    def test_failure_rolls_back_command_clock_and_partial_retraction(self):
        with Store() as s:
            a = Assertion('a', 'u', 'age', i(2))
            s.transact('one', [a])
            for kwargs in ({'assertions':[a], 'retract':['a']},
                           {'retract':['a','missing']},
                           {'assertions':[a]}):
                with self.assertRaises(Exception):
                    s.transact('bad', **kwargs)
                self.assertIsNone(s.receipt('bad'))
                self.assertEqual(s.query(P).position, 1)
                self.assertEqual(s.query(P).rows, ((Value('str','u'), i(2)),))
            s.transact('good', retract=['a'])
            self.assertEqual(s.query(P).position, 2)

    def test_expressions_eager_faults_and_reuse(self):
        with Store() as s:
            s.transact('one', [Assertion('a','u','age',i(21))])
            self.assertEqual(s.query("answer(?e) :- triple(?e,'age',?v),[?v*2+1 = 43].").rows,
                             ((Value('str','u'),),))
            for p, code in [("answer('x') :- [false = true],[1/0 = 0].", 'TD_E_EXPR_DIV_ZERO'),
                            ("answer('x') :- [9223372036854775807+1 = 0].", 'TD_E_EXPR_OVERFLOW'),
                            ("answer('x') :- ['1'+1 = 2].", 'TD_E_EXPR_TYPE')]:
                with self.assertRaisesRegex(Exception, code):
                    s.query(p)
                self.assertEqual(len(s.query(P).rows), 1)

    def test_stratified_negation_shared_cut_and_reordering(self):
        programs = ["answer(?e) :- triple(?e,'age',?v),!triple(?e,'blocked',true).",
                    "answer(?e) :- !triple(?e,'blocked',true),triple(?e,'age',?v)."]
        with Store() as s:
            s.transact('one', [Assertion('a','u','age',i(21)), Assertion('b','u','blocked',Value('bool',True),5,10)])
            s.transact('two', retract=['b'])
            for known in (1,2):
                for valid in (0,4,5,9,10):
                    expected = () if known == 1 and 5 <= valid < 10 else ((Value('str','u'),),)
                    for p in programs:
                        self.assertEqual(s.query(p, known_at=known, valid_at=valid).rows, expected)
            for p in ("a(?x) :- !b(?x). b(?x) :- !a(?x). answer('x').",
                      "answer(?x) :- !triple(?x,'age',?v)."):
                with self.assertRaises(Exception):
                    s.query(p)
            self.assertEqual(len(s.query(P).rows), 1)

    def test_aggregates_set_identity_empty_and_overflow(self):
        base = "source(?e,?v) :- triple(?e,'age',?v). "
        with Store() as s:
            s.transact('a', [Assertion('a','u','age',i(2)),Assertion('b','u','age',i(2)),
                             Assertion('c','v','age',i(2))])
            for op, expected in [('count()',2),('sum_i64(?v)',4),('min(?v)',2),('max(?v)',2)]:
                p = base + f'answer({op}) :- source(?e,?v).'
                sql, native = s.query(p), s.query(p, force_native=True)
                self.assertEqual(sql.rows, ((i(expected),),))
                self.assertEqual(sql.rows, native.rows)
                self.assertEqual(sql.result.plan.route, 'sql')
            grouped = s.query(base + 'answer(?v,count()) :- source(?e,?v).')
            self.assertEqual(grouped.rows, ((i(2),i(2)),))
            s.transact('b', retract=['a','b','c'])
            self.assertEqual(s.query(base+'answer(count()) :- source(?e,?v).').rows, ((i(0),),))
            self.assertEqual(s.query(base+'answer(min(?v)) :- source(?e,?v).').rows, ())
            s.transact('overflow', [Assertion('d','u','age',i((1<<63)-1)),Assertion('e','v','age',i(1))])
            with self.assertRaises(Exception):
                s.query(base+'answer(sum_i64(?v)) :- source(?e,?v).')
            self.assertEqual(len(s.query(P).rows),2)

    def test_recursive_native_and_limits(self):
        with Store() as s:
            s.transact('edges', [Assertion(str(n),str(n),'edge',Value('str',str(n+1))) for n in range(30)])
            p = "r(?x,?y) :- triple(?x,'edge',?y). r(?x,?z) :- r(?x,?y),triple(?y,'edge',?z). answer(?y) :- r('0',?y)."
            result = s.query(p)
            self.assertEqual(result.result.plan.route,'native')
            self.assertEqual({r[0].wire for r in result.rows},{str(n) for n in range(1,31)})
            with self.assertRaisesRegex(Exception,'max_work'):
                s.query(p, limits=Limits(max_work=10))
            self.assertEqual(s.query("answer('healthy').").rows, ((Value('str','healthy'),),))

    def test_serialized_concurrent_duplicate_commands(self):
        with Store() as s, ThreadPoolExecutor(max_workers=8) as pool:
            a = Assertion('a','u','age',i(1))
            receipts = list(pool.map(lambda _: s.transact('same',[a]),range(16)))
            self.assertEqual(len(set(receipts)),1)
            receipts = list(pool.map(lambda n: s.transact('c'+str(n)),range(16)))
            self.assertEqual({r.position for r in receipts},set(range(2,18)))

    def test_randomized_temporal_raw_input_oracle(self):
        rng = random.Random(41031)
        history = []
        with Store() as s:
            for pos in range(1,31):
                active = [h for h in history if h[4] is None]
                retract = rng.sample(active,min(len(active),rng.randrange(3)))
                adds=[]
                for n in range(rng.randrange(1,4)):
                    start=rng.randrange(-3,9)
                    a=Assertion(f'{pos}-{n}',str(rng.randrange(4)),'age',i(rng.randrange(5)),start,start+rng.randrange(1,6))
                    adds.append(a)
                s.transact(str(pos),adds,[h[0].id for h in retract])
                for h in retract: h[4]=pos
                for a in adds: history.append([a,pos,a.valid_from,a.valid_to,None])
                for known in sorted({0,pos,rng.randrange(pos+1)}):
                    for valid in (-3,0,3,8,13):
                        expected={(Value('str',h[0].e),h[0].value) for h in history
                            if h[1]<=known and (h[4] is None or known<h[4]) and h[2]<=valid<h[3]}
                        actual=s.query(P,known_at=known,valid_at=valid)
                        self.assertEqual(set(actual.rows),expected)
                        self.assertEqual(actual.rows,s.query(P,known_at=known,valid_at=valid,force_native=True).rows)

    def test_templates_do_not_cache_facts_cuts_or_failed_results(self):
        with Store() as s:
            self.assertEqual(s.query(P).rows, ())
            self.assertEqual(s.cache_stats['compilations'],1)
            s.transact('one',[Assertion('a','u','age',i(5))])
            self.assertEqual(s.query(P).rows, ((Value('str','u'),i(5)),))
            self.assertEqual(s.query(P,known_at=0).rows, ())
            self.assertEqual(s.cache_stats['compilations'],1)
            s.transact('two',retract=['a'])
            self.assertEqual(s.query(P).rows, ())
            self.assertEqual(s.query(P,known_at=1).rows, ((Value('str','u'),i(5)),))
            for n in range(40): s.query(f"answer({n}).")
            self.assertLessEqual(s.cache_stats['entries'],32)
            self.assertLessEqual(s.cache_stats['wire_bytes'],1024*1024)

    def test_native_loop_cancellation_deadline_and_healthy_reuse(self):
        p = "answer(?a,?b,?c,?d) :- triple(?a,'n',?v),triple(?b,'n',?w),triple(?c,'n',?x),triple(?d,'n',?y),[?v+?w+?x+?y = -1]."
        with Store() as s, ThreadPoolExecutor(max_workers=1) as pool:
            s.transact('values',[Assertion(str(n),str(n),'n',i(n)) for n in range(100)])
            token=Cancellation()
            future=pool.submit(lambda:s.query(p,force_native=True,cancellation=token))
            # Let execution enter the real native callback, then request stop.
            time.sleep(0.03)
            requested=time.monotonic();token.cancel()
            with self.assertRaises(QueryCanceled):future.result(timeout=2)
            self.assertLess(time.monotonic()-requested,1)
            with self.assertRaises(QueryDeadline):s.query(p,force_native=True,timeout_ms=10)
            for _ in range(3):
                self.assertEqual(s.query("answer('healthy').").rows,((Value('str','healthy'),),))
            token=Cancellation();token.cancel()
            with self.assertRaises(QueryCanceled):s.query(P,cancellation=token)

    def test_late_deadline_delivery_cannot_interrupt_read_transaction_cleanup(self):
        from temporal_store.control import Invocation
        invocations=[]
        class CapturedInvocation(Invocation):
            def __init__(self,*args):
                super().__init__(*args)
                invocations.append(self)
        with Store() as s:
            connection=s._conn
            class ObservedConnection:
                cleanup=False
                cleanup_interrupts=0
                cleanup_commands=[]
                def __getattr__(self,name):
                    return getattr(connection,name)
                def interrupt(self):
                    if self.cleanup:self.cleanup_interrupts+=1
                    connection.interrupt()
                def execute(self,sql,*args):
                    if sql not in ('COMMIT','ROLLBACK'):return connection.execute(sql,*args)
                    self.cleanup=True
                    try:
                        # Deliver a queued deadline exactly at the cleanup seam.
                        # The real owned connection still executes/acks cleanup.
                        invocations[-1]._expire()
                        result=connection.execute(sql,*args)
                        self.cleanup_commands.append(sql)
                        return result
                    finally:self.cleanup=False
            observed=ObservedConnection();s._conn=observed
            with patch('temporal_store.store.Invocation',CapturedInvocation):
                self.assertEqual(s.query("answer('ok').").rows,((Value('str','ok'),),))
                with self.assertRaisesRegex(Exception,'TD_E_EXPR_DIV_ZERO'):
                    s.query("answer('x') :- [1/0 = 0].",force_native=True)
                self.assertEqual(s.timeline("answer('timeline').",valid_from=0,valid_to=1).intervals[0].values,
                                 (Value('str','timeline'),))
                self.assertEqual(s.query("answer('healthy').").rows,((Value('str','healthy'),),))
            self.assertEqual(observed.cleanup_interrupts,0)
            self.assertEqual(observed.cleanup_commands,['COMMIT','ROLLBACK','COMMIT','COMMIT'])

    def test_materialized_projection_support_identity_and_external_commit(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'views.duckdb'
            with Store(path) as s,Store(path) as other:
                view=s.materialize('age',valid_at=3)
                with self.assertRaises(AttributeError):view.attribute='other'
                s.transact('one',[Assertion('a','u','age',i(1)),Assertion('b','u','age',i(1))])
                s.transact('two',retract=['a'])
                self.assertEqual(view.read().rows,((Value('str','u'),i(1)),))
                self.assertEqual(view.read().update_route,'incremental_supports')
                with self.assertRaises(StoreError):s.transact('failed',retract=['b','missing'])
                self.assertEqual(view.read().position,2)
                other.transact('external',[Assertion('c','u','age',i(2))],['b'])
                self.assertEqual(view.read().rows,((Value('str','u'),i(2)),))
                self.assertEqual(view.read().update_route,'fresh_after_external_commit')
                s.transact('next',retract=['c'])
                self.assertEqual(view.read().rows,())
            with Store(path) as s:self.assertEqual(s.materialize('age',valid_at=3).read().rows,())

    def test_materialized_projection_randomized_deltas_match_fresh_sql_and_native(self):
        rng=random.Random(81044)
        active=[]
        with Store() as s:
            views=[s.materialize('age',valid_at=cut) for cut in (0,3,8)]
            for pos in range(30):
                retract=rng.sample(active,min(len(active),rng.randrange(3)))
                active=[x for x in active if x not in retract]
                assertions=[]
                for n in range(rng.randrange(1,4)):
                    ident=f'{pos}-{n}';start=rng.randrange(-2,9)
                    assertions.append(Assertion(ident,str(rng.randrange(3)),'age',i(rng.randrange(3)),start,start+4))
                    active.append(ident)
                s.transact(str(pos),assertions,retract)
                for view in views:
                    actual=view.read()
                    self.assertEqual(actual.update_route,'incremental_supports')
                    self.assertEqual(actual.rows,s.query(P,valid_at=view.valid_at).rows)
                    self.assertEqual(actual.rows,s.query(P,valid_at=view.valid_at,force_native=True).rows)


if __name__ == '__main__':
    unittest.main(verbosity=2)
