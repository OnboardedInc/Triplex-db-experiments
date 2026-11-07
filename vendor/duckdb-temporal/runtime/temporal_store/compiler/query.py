"""Versioned complete planned reads through an admitted caller-owned session.

Session callbacks are a trusted integration protocol, not a security boundary.
Only an exact-reviewed runtime driver or owned store wrapper may supply them.
The helper never creates or closes a connection and never accepts caller IR.
"""
from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256

from .typed_values import (FACT_TYPE, Limits, PlanError, prepare, decode_sql,
                          decode_native, native_carrier)
from . import ir2, proof as admission, sql as sql_compiler


@dataclass(frozen=True, slots=True)
class Session:
    execute: object
    fetchall: object
    verify_profile: object
    guard: object
    compile_ir: object = None
    control_token: int | None = None
    source_sql: str | None = None

    def __post_init__(self):
        if not all(callable(x) for x in (self.execute,self.fetchall,self.verify_profile,self.guard)):
            raise PlanError('an admitted session requires four trusted callable boundaries')

    def verify(self):
        self.guard()
        try:
            self.verify_profile()
        finally:
            self.guard()

    def fetch(self, statement, parameters, kind):
        self.guard()
        try:
            self.execute(statement,parameters,kind)
        finally:
            self.guard()
        self.guard()
        try:
            return self.fetchall(kind)
        finally:
            self.guard()


@dataclass(frozen=True, slots=True)
class Explanation:
    route: str
    fallback_reason: str | None
    bounds: tuple[tuple[str,int], ...]
    answer_arity: int | None
    sql: str | None
    parameter_types: tuple[str, ...]
    materialization: str

    def to_json(self):
        return {'schema':'td.aggregate_plan/1', 'language':'td.stratified/1',
            'route':self.route, 'route_version':'completed_aggregate_sql/1',
            'fallback_reason':self.fallback_reason, 'proof_bounds':dict(self.bounds),
            'answer_arity':self.answer_arity, 'sql':self.sql,
            'sql_sha256':sha256(self.sql.encode('utf-8')).hexdigest() if self.sql is not None else None,
            'parameter_types':list(self.parameter_types), 'parameter_count':len(self.parameter_types),
            'materialization':self.materialization, 'row_order':'typed_lexicographic/1'}


@dataclass(frozen=True, slots=True)
class Result:
    rows: tuple
    plan: Explanation
    native_counters: tuple[int,int,int] | None

    def to_json(self):
        native = None if self.native_counters is None else dict(zip(
            ('rounds','derived_facts','work'),self.native_counters))
        return {'schema':'td.aggregate_result/1', 'rows':[[cell.to_wire() for cell in row] for row in self.rows],
                'plan':self.plan.to_json(), 'observed_counts':{'output_rows':len(self.rows)},
                'native_counters':native}


@dataclass(frozen=True, slots=True)
class _Prepared:
    program: str
    facts: tuple
    valid_at: int
    known_at: int
    limits: Limits
    native_program: ir2.Program | None
    proof: admission.Proof | None
    sql_plan: sql_compiler.SQLPlan | None
    explanation: Explanation


def _select_guarded(session, program, facts, valid_at, known_at, limits, force_native):
    if type(session) is not Session:
        raise PlanError('planned reads require the exact admitted Session protocol')
    session.verify()
    if type(program) is not str or len(program.encode('utf-8',errors='strict')) > 65536:
        raise PlanError('program must be bounded owned UTF8 text')
    if type(force_native) is not bool:
        raise PlanError('force_native must be exactly bool')
    owned,valid,known,limits = prepare(facts,valid_at,known_at,limits)
    session.guard()
    # Pure caller preparation is not a cached profile or FP permission.
    session.verify()
    native_program,proof,generated = None,None,None
    reason = 'forced_native' if force_native else None
    if reason is None:
        if session.compile_ir is None:
            raw = session.fetch('SELECT main.td_plan_ir_v2(?::VARCHAR)',(program,),'compiler')
            if (type(raw) is not list or len(raw) != 1 or type(raw[0]) is not tuple
                    or len(raw[0]) != 1 or type(raw[0][0]) is not str):
                raise PlanError('malformed genuine native compiler envelope')
            session.guard()
            native_program = ir2.decode(raw[0][0])
        else:
            native_program = session.compile_ir(program)
        proof,reason = admission.analyze(native_program,owned,valid,known,limits)
        session.guard()
        if reason is None:
            generated,reason = sql_compiler.build(native_program,proof,owned,valid,known,session.guard,session.source_sql)
            session.guard()
    arity = native_program.relations[native_program.answer].arity if native_program is not None else None
    route = 'sql' if reason is None else 'native'
    explanation = Explanation(route,reason,proof.explanation() if proof is not None else (),arity,
        generated.sql if generated is not None else None,
        generated.parameter_types if generated is not None else (),
        ('sql_persisted_relation' if session.source_sql is not None else 'sql_parameterized_retained_values') if route == 'sql' else 'native_all_retained_list')
    return _Prepared(program,owned,valid,known,limits,native_program,proof,generated,explanation)



def _select(session, program, facts, valid_at, known_at, limits, force_native):
    if type(session) is not Session:
        raise PlanError('planned reads require the exact admitted Session protocol')
    session.guard()
    try:
        return _select_guarded(session,program,facts,valid_at,known_at,limits,force_native)
    finally:
        # Preparation, IR decoding, proof and SQL/parameter codecs also get
        # postchecks when their own validation or allocation raises.
        session.guard()


def explain(session, program, facts, valid_at, known_at, limits=Limits(), *, force_native=False):
    """Compile/validate and describe a route; do not evaluate the program."""
    selected = _select(session,program,facts,valid_at,known_at,limits,force_native)
    session.guard()
    return selected.explanation


def query(session, program, facts, valid_at, known_at, limits=Limits(), *, force_native=False):
    """One fresh complete planned read; no late fallback, retries or partial rows."""
    selected = _select(session,program,facts,valid_at,known_at,limits,force_native)
    session.guard()
    try:
        session.verify()
        if selected.explanation.route == 'sql':
            generated = selected.sql_plan
            raw = session.fetch(generated.sql,generated.parameters,'planned_sql')
            session.guard()
            rows = decode_sql(raw,selected.explanation.answer_arity,selected.proof.answer_rows,session.guard)
            session.guard()
            result = Result(rows,selected.explanation,None)
        else:
            parameters = (selected.program,native_carrier(selected.facts,session.guard),selected.valid_at,
                selected.known_at,selected.limits.max_facts,selected.limits.max_rounds,selected.limits.max_work)
            function = 'td_query_stratified_controlled_v1' if session.control_token is not None else 'td_query_stratified_v1'
            if session.control_token is not None:
                parameters += (session.control_token,)
            statement = ('SELECT main.'+function+'(?::VARCHAR,?::'+FACT_TYPE
                         +',?::BIGINT,?::BIGINT,?::BIGINT,?::BIGINT,?::BIGINT)')
            if session.control_token is not None:
                statement = statement[:-1]+',?::BIGINT)'
            raw = session.fetch(statement,parameters,'native_fallback')
            session.guard()
            rows,counters = decode_native(raw,session.guard)
            if selected.explanation.answer_arity is not None:
                if any(len(row) != selected.explanation.answer_arity for row in rows):
                    raise PlanError('native fallback output disagrees with genuine compiler arity')
            elif len({len(row) for row in rows}) > 1:
                raise PlanError('native fallback rows have inconsistent arity')
            session.guard()
            result = Result(rows,selected.explanation,counters)
        session.guard()
        return result
    finally:
        session.guard()
