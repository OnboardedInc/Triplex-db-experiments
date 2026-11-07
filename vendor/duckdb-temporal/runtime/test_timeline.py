"""Independent endpoint reconstruction of the public timeline relation."""
import unittest

from temporal_store import Assertion,Store,Value

P="answer(?v) :- triple('u','value',?v)."


class TimelineTests(unittest.TestCase):
    def test_coalescing_gaps_corrections_and_point_equivalence(self):
        with Store() as s:
            s.transact('one',[Assertion('a','u','value',Value('i64','1'),0,3),
                              Assertion('b','u','value',Value('i64','1'),2,5),
                              Assertion('c','u','value',Value('i64','1'),7,10)])
            s.transact('two',[Assertion('d','u','value',Value('i64','2'),1,4)],['a'])
            for known in (0,1,2):
                timeline=s.timeline(P,valid_from=-2,valid_to=12,known_at=known)
                self.assertEqual(timeline.known_at,known)
                for point in range(-2,13):
                    reconstructed={r.values for r in timeline.intervals if r.valid_from<=point<r.valid_to}
                    expected=set(s.query(P,valid_at=point,known_at=known).rows) if point<12 else set()
                    self.assertEqual(reconstructed,expected)
            timeline=s.timeline(P,valid_from=-2,valid_to=12,known_at=1)
            self.assertEqual([(r.valid_from,r.valid_to) for r in timeline.intervals],[(0,5),(7,10)])
            self.assertEqual({x.assertion.id for x in timeline.assertions},{'a','b','c'})
            self.assertEqual(s.history()[0].corrected_by,'two')

    def test_negation_and_empty_aggregate_change_at_endpoints(self):
        with Store() as s:
            s.transact('one',[Assertion('a','u','x',Value('i64','1'),2,5)])
            p="source(?e,?a,?v) :- triple(?e,?a,?v). answer(count()) :- source(?e,?a,?v)."
            t=s.timeline(p,valid_from=0,valid_to=7)
            self.assertEqual({(r.values[0].wire,r.valid_from,r.valid_to) for r in t.intervals},
                             {('0',0,2),('1',2,5),('0',5,7)})
            p="answer('absent') :- !triple('u','x',1)."
            t=s.timeline(p,valid_from=0,valid_to=7)
            self.assertEqual([(r.valid_from,r.valid_to) for r in t.intervals],[(0,2),(5,7)])


if __name__=='__main__':unittest.main(verbosity=2)
