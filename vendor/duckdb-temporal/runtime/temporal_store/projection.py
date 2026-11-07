"""Bounded incrementally maintained EAV projection with assertion supports."""
from collections import Counter
from dataclasses import dataclass

from .compiler import Value
from .compiler.typed_values import canonical_rows


@dataclass(frozen=True, slots=True)
class ProjectionSnapshot:
    position: int
    valid_at: int
    rows: tuple
    update_route: str


class MaterializedProjection:
    """Latest-knowledge `answer(?e,?v) :- triple(?e,attribute,?v)`.

    A projection has one fixed valid cut. Assertion identities supply support
    counts, so retracting one duplicate never deletes another's contribution.
    General derived joins, recursion and other cuts are recomputed normally.
    """
    def __init__(self, store, attribute, valid_at):
        self._store=store
        self._attribute=attribute
        self._valid_at=valid_at
        self._position=-1
        self._supports={}
        self._rows=()
        self._route='fresh'

    @property
    def attribute(self):return self._attribute

    @property
    def valid_at(self):return self._valid_at

    def _fresh(self, history, position):
        supports={x.assertion.id:(Value('str',x.assertion.e),x.assertion.value)
            for x in history if x.tx_from<=position<x.tx_to and x.assertion.a==self.attribute
            and x.assertion.valid_from<=self.valid_at<x.assertion.valid_to}
        return supports,canonical_rows(Counter(supports.values()))

    def _delta(self, asserted, retracted):
        supports=dict(self._supports)
        for ident in retracted:supports.pop(ident,None)
        for x in asserted:
            if x.a==self.attribute and x.valid_from<=self.valid_at<x.valid_to:
                supports[x.id]=(Value('str',x.e),x.value)
        # Full assertion support identity is retained; tuple publication is set
        # semantics. Work is bounded by the declared 512-row retained profile.
        return supports,canonical_rows(Counter(supports.values()))

    def _publish(self, position, supports, rows, route):
        self._position=position
        self._supports=supports
        self._rows=rows
        self._route=route

    def read(self):
        store=self._store
        with store._lock:
            store._profile()
            with store._transaction():
                position=store._position()
                if self._position!=position:
                    supports,rows=self._fresh(store._history(),position)
                    self._publish(position,supports,rows,'fresh_after_external_commit')
                return ProjectionSnapshot(position,self.valid_at,self._rows,self._route)
