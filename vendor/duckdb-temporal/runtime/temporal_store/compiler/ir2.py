"""Strict owned native-IR2 decoding for a conservative new consumer.

The query helper supplies only genuine compiler output. This private decoder
does not grant authority to caller JSON or turn opaque filters into SQL ASTs.
"""
from __future__ import annotations

from dataclasses import dataclass
import json
import re

from .typed_values import Value, PlanError, IRDecodeError


MODEL = {
    'schema':'td.native_budget/1', 'max_program_bytes':65536, 'max_term_bytes':16384,
    'max_input_rows':100000, 'max_rules':128, 'max_relations':128, 'max_body_atoms':16,
    'max_variables':64, 'max_arity':8, 'max_facts':100000, 'max_rounds':2000,
    'max_work':50000000, 'max_output_bytes':16777216, 'max_dictionary_bytes':16777216,
    'max_dictionary_values':300000, 'dictionary_entry_bytes':16,
    'typed_output_row_bytes':[24,56,88,120,152,184,216,248,280],
    'typed_output_string_extra':'utf8_bytes', 'counter_model':'td.stratified_counters/1',
}
EXPRESSION = {'max_filters':16, 'max_rule_nodes':256, 'max_program_nodes':4096,
              'max_height':32, 'max_nesting':32}
EFFECTS = {'filter_ast':'opaque', 'filter_stage':'complete_positive_candidate',
           'eager_filters':True, 'filters_before_negative':True, 'filters_before_head_dedup':True}
NAME = re.compile(r'[A-Za-z_][A-Za-z_0-9]*\Z', re.ASCII)


@dataclass(frozen=True, slots=True)
class Aggregate:
    op: str
    source: int
    keys: tuple[int, ...]
    measure: int | None


@dataclass(frozen=True, slots=True)
class Term:
    var: int | None = None
    const: Value | None = None
    aggregate: Aggregate | None = None


@dataclass(frozen=True, slots=True)
class Atom:
    relation: int
    terms: tuple[Term, ...]


@dataclass(frozen=True, slots=True)
class Rule:
    id: int
    variable_count: int
    head: Atom
    positive: tuple[Atom, ...]
    negative: tuple[Atom, ...]
    filter_count: int
    filter_nodes: int

    @property
    def aggregate(self):
        return self.head.terms[-1].aggregate if self.head.terms else None


@dataclass(frozen=True, slots=True)
class Relation:
    id: int
    name: str
    arity: int
    edb: bool


@dataclass(frozen=True, slots=True)
class Component:
    id: int
    kind: str
    relations: tuple[int, ...]
    rules: tuple[int, ...]


@dataclass(frozen=True, slots=True)
class Program:
    relations: tuple[Relation, ...]
    rules: tuple[Rule, ...]
    dependencies: tuple[tuple[int,int,int,int,str,bool], ...]
    components: tuple[Component, ...]
    schedule: tuple[int, ...]
    answer: int


def _keys(value, expected):
    if type(value) is not dict or any(type(k) is not str for k in value) or set(value) != set(expected):
        raise IRDecodeError('malformed compiler-owned IR2 object keys')


def _int(value, low, high):
    if type(value) is not int or not low <= value <= high:
        raise IRDecodeError('malformed compiler-owned IR2 integer')
    return value


def _array(value, maximum):
    if type(value) is not list or len(value) > maximum:
        raise IRDecodeError('malformed compiler-owned IR2 array')
    return value


def _same(value, expected):
    if type(value) is not type(expected) or value != expected:
        raise IRDecodeError('incompatible compiler-owned IR2 model/effects')


def _literal(raw):
    _keys(raw, {'t','v'})
    try:
        value = Value(raw['t'], raw['v'])
    except (PlanError, UnicodeError) as error:
        raise IRDecodeError('malformed compiler-owned IR2 literal') from error
    if value.to_wire() != raw:
        raise IRDecodeError('noncanonical compiler-owned IR2 literal')
    return value


def _term(raw, variables, relations, allow_aggregate):
    if type(raw) is not dict or len(raw) != 1:
        raise IRDecodeError('malformed compiler-owned IR2 term')
    if set(raw) == {'var'}:
        return Term(var=_int(raw['var'], 0, variables-1))
    if set(raw) == {'const'}:
        return Term(const=_literal(raw['const']))
    if not allow_aggregate or set(raw) != {'aggregate_output'}:
        raise IRDecodeError('unexpected aggregate/unknown IR2 term')
    a = raw['aggregate_output']
    _keys(a, {'op','source_relation','key_columns','measure_column'})
    op = a['op']
    if type(op) is not str or op not in ('count','min','max','sum_i64'):
        raise IRDecodeError('unknown IR2 aggregate opcode')
    source = _int(a['source_relation'], 0, len(relations)-1)
    keys = tuple(_int(i, 0, relations[source].arity-1) for i in _array(a['key_columns'], 7))
    if len(keys) != len(set(keys)):
        raise IRDecodeError('duplicate IR2 aggregate key columns')
    measure = a['measure_column']
    if op == 'count':
        if measure is not None:
            raise IRDecodeError('COUNT IR2 must have no measure column')
    else:
        measure = _int(measure, 0, relations[source].arity-1)
    return Term(aggregate=Aggregate(op, source, keys, measure))


def _atom(raw, variables, relations, *, head=False):
    _keys(raw, {'relation','terms'})
    relation = _int(raw['relation'], 0, len(relations)-1)
    terms = tuple(_term(t, variables, relations, head) for t in _array(raw['terms'], 8))
    if len(terms) != relations[relation].arity:
        raise IRDecodeError('IR2 atom arity mismatch')
    return Atom(relation, terms)


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise IRDecodeError('duplicate JSON object key in compiler IR2')
        result[key] = value
    return result


def _strong_classes(size, edges):
    graph = {i:set() for i in range(size)}
    for _, _, source, target, _, _ in edges:
        graph[source].add(target)
    reach = []
    for source in range(size):
        seen, todo = {source}, [source]
        while todo:
            node = todo.pop()
            for child in graph[node]-seen:
                seen.add(child); todo.append(child)
        reach.append(seen)
    classes, pending = set(), set(range(size))
    while pending:
        first = min(pending)
        members = frozenset(i for i in pending if i in reach[first] and first in reach[i])
        classes.add(members); pending -= members
    return classes


def _reject_constant(value):
    raise IRDecodeError("nonfinite IR2 JSON constant")


def decode(raw):
    if type(raw) is not str or len(raw.encode('utf-8')) > 16777216:
        raise IRDecodeError('compiler IR2 must be bounded owned text')
    try:
        root = json.loads(raw, object_pairs_hook=_unique,
                          parse_constant=_reject_constant)
    except (json.JSONDecodeError, UnicodeError) as error:
        raise IRDecodeError('malformed compiler IR2 JSON') from error
    _keys(root, {'schema','language','inspection_only','relations','facts','rules','dependencies',
                 'components','schedule_order','schedule','answer_relation','budget_model','expression_budget'})
    _same(root['schema'], 'td.program_ir/2'); _same(root['language'], 'td.stratified/1')
    _same(root['inspection_only'], True); _same(root['schedule_order'], 'producer_first')
    _keys(root['budget_model'], MODEL)
    for key, expected in MODEL.items():
        _same(root['budget_model'][key], expected)
        if type(expected) is list:
            for item, value in zip(root['budget_model'][key], expected):
                _same(item, value)
    _keys(root['expression_budget'], EXPRESSION)
    for key, expected in EXPRESSION.items():
        _same(root['expression_budget'][key], expected)
    relations, names = [], set()
    for i, entry in enumerate(_array(root['relations'], 128)):
        _keys(entry, {'id','name','arity','edb'})
        _same(entry['id'], i)
        name = entry['name']
        if type(name) is not str or len(name) > 128 or NAME.fullmatch(name) is None or name in names:
            raise IRDecodeError('invalid or duplicate IR2 relation name')
        names.add(name)
        _same(entry['edb'], i == 0)
        relations.append(Relation(i, name, _int(entry['arity'], 1, 8), entry['edb']))
    if not relations or relations[0] != Relation(0, 'triple', 3, True):
        raise IRDecodeError('IR2 requires the exact triple/3 base relation')
    answer = _int(root['answer_relation'], 1, len(relations)-1)
    if relations[answer].name != 'answer':
        raise IRDecodeError('IR2 answer relation name mismatch')
    rules, derived_edges, derived_facts = [], [], []
    aggregate_targets, ordinary_targets = set(), set()
    for i, entry in enumerate(_array(root['rules'], 128)):
        _keys(entry, {'id','variable_count','head','positive_body','negative_body',
                      'filter_count','filter_expression_nodes','effects'})
        _same(entry['id'], i)
        variables = _int(entry['variable_count'], 0, 64)
        head = _atom(entry['head'], variables, relations, head=True)
        if head.relation == 0:
            raise IRDecodeError('IR2 base relation cannot have a producer')
        positive = tuple(_atom(a, variables, relations) for a in _array(entry['positive_body'], 16))
        negative = tuple(_atom(a, variables, relations) for a in _array(entry['negative_body'], 16))
        if len(positive)+len(negative) > 16:
            raise IRDecodeError('IR2 body exceeds admitted atom count')
        filters = _int(entry['filter_count'], 0, 16)
        nodes = _int(entry['filter_expression_nodes'], 0, 256)
        if (filters == 0) != (nodes == 0) or nodes < 3*filters:
            raise IRDecodeError('IR2 filter/node counts disagree')
        _keys(entry['effects'], {*EFFECTS, 'filters_may_error'})
        for key, expected in EFFECTS.items():
            _same(entry['effects'][key], expected)
        _same(entry['effects']['filters_may_error'], filters > 0)
        aggregates = [t.aggregate for t in head.terms if t.aggregate is not None]
        aggregate = aggregates[0] if aggregates else None
        bound = {t.var for a in positive for t in a.terms if t.var is not None}
        if bound != set(range(variables)):
            raise IRDecodeError('IR2 variable count/IDs disagree with relational bindings')
        if any(t.var is not None and t.var not in bound for a in (head, *negative) for t in a.terms):
            raise IRDecodeError('IR2 contains a relationally unsafe variable')
        if aggregate is not None:
            if (len(aggregates) != 1 or head.terms[-1].aggregate is None or len(positive) != 1
                    or negative or filters or aggregate.source != positive[0].relation):
                raise IRDecodeError('IR2 aggregate structure mismatch')
            terms = positive[0].terms
            source_variables = [t.var for t in terms]
            if None in source_variables or len(set(source_variables)) != len(source_variables):
                raise IRDecodeError('IR2 aggregate source must have distinct variable columns')
            if len(head.terms) != len(aggregate.keys)+1:
                raise IRDecodeError('IR2 aggregate key/output arity mismatch')
            if any(t.var != source_variables[col] or t.const is not None or t.aggregate is not None
                   for t, col in zip(head.terms[:-1], aggregate.keys)):
                raise IRDecodeError('IR2 aggregate head keys disagree with descriptor')
            if head.relation in aggregate_targets:
                raise IRDecodeError('IR2 aggregate target has multiple producers')
            aggregate_targets.add(head.relation)
        else:
            ordinary_targets.add(head.relation)
        rule = Rule(i, variables, head, positive, negative, filters, nodes)
        rules.append(rule)
        for j, atom in enumerate(positive):
            kind = 'aggregate' if aggregate is not None else 'positive'
            derived_edges.append((i,j,atom.relation,head.relation,kind,aggregate is not None))
        derived_edges.extend((i,j,a.relation,head.relation,'negative',True) for j,a in enumerate(negative))
        if aggregate is None and not positive and not negative and not filters:
            if any(t.const is None for t in head.terms):
                raise IRDecodeError('IR2 unconditional fact is not ground')
            derived_facts.append((i,head.relation,tuple(t.const for t in head.terms)))
    if aggregate_targets & ordinary_targets:
        raise IRDecodeError('IR2 aggregate target also has ordinary producers')
    if aggregate_targets | ordinary_targets != set(range(1,len(relations))):
        raise IRDecodeError('IR2 relation has no defined producer')
    if sum(r.filter_nodes for r in rules) > 4096:
        raise IRDecodeError('IR2 program expression-node limit exceeded')
    facts = []
    for entry in _array(root['facts'], 128):
        _keys(entry, {'rule','relation','values'})
        facts.append((_int(entry['rule'],0,len(rules)-1), _int(entry['relation'],1,len(relations)-1),
                      tuple(_literal(v) for v in _array(entry['values'],8))))
    if facts != derived_facts:
        raise IRDecodeError('IR2 redundant facts disagree with complete rules')
    edges = []
    for entry in _array(root['dependencies'], 2048):
        _keys(entry, {'rule','atom_index','source_relation','target_relation','kind','strict'})
        if type(entry['kind']) is not str or entry['kind'] not in ('positive','negative','aggregate'):
            raise IRDecodeError('unknown IR2 dependency kind')
        if type(entry['strict']) is not bool:
            raise IRDecodeError('invalid IR2 dependency strictness')
        edges.append((_int(entry['rule'],0,len(rules)-1), _int(entry['atom_index'],0,15),
                      _int(entry['source_relation'],0,len(relations)-1),
                      _int(entry['target_relation'],1,len(relations)-1),entry['kind'],entry['strict']))
    if edges != derived_edges:
        raise IRDecodeError('IR2 signed dependencies disagree with full rule bodies')
    components, owner, assigned_rules = [], {}, set()
    for i, entry in enumerate(_array(root['components'], 128)):
        _keys(entry, {'id','kind','relations','rules'}); _same(entry['id'], i)
        members = tuple(_int(x,0,len(relations)-1) for x in _array(entry['relations'],128))
        selected = tuple(_int(x,0,len(rules)-1) for x in _array(entry['rules'],128))
        if not members or tuple(sorted(set(members))) != members or tuple(sorted(set(selected))) != selected:
            raise IRDecodeError('IR2 component membership/order mismatch')
        if any(x in owner for x in members) or any(x in assigned_rules for x in selected):
            raise IRDecodeError('IR2 duplicate component membership')
        if selected != tuple(r.id for r in rules if r.head.relation in members):
            raise IRDecodeError('IR2 component rule membership mismatch')
        expected_kind = 'base' if 0 in members else ('aggregate' if any(rules[j].aggregate for j in selected) else 'ordinary')
        _same(entry['kind'], expected_kind)
        owner.update((x,i) for x in members); assigned_rules.update(selected)
        components.append(Component(i,entry['kind'],members,selected))
    if set(owner) != set(range(len(relations))) or assigned_rules != set(range(len(rules))):
        raise IRDecodeError('IR2 components do not cover the whole program')
    if {frozenset(c.relations) for c in components} != _strong_classes(len(relations), edges):
        raise IRDecodeError('IR2 components disagree with whole signed graph')
    schedule = tuple(_int(x,0,len(components)-1) for x in _array(root['schedule'],128))
    if set(schedule) != set(range(len(components))) or len(schedule) != len(components):
        raise IRDecodeError('IR2 schedule is not a complete component permutation')
    rank = {component:i for i,component in enumerate(schedule)}
    for _, _, source, target, _, strict in edges:
        a, b = owner[source], owner[target]
        if (a == b and strict) or (a != b and rank[a] >= rank[b]):
            raise IRDecodeError('IR2 schedule/strict-edge inconsistency')
    return Program(tuple(relations),tuple(rules),tuple(edges),tuple(components),schedule,answer)
