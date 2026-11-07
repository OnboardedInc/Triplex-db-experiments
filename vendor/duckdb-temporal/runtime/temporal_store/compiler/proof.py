"""Conservative whole-program semantic, scan-work and native-budget admission.

Full relation scan bounds deliberately differ from literal-matching semantic
cardinality. Unsupported/unproved cases select original whole-native execution.
"""
from __future__ import annotations

from dataclasses import dataclass

from .ir2 import MODEL
from .typed_values import Value, MAX_I64


SAT = 50000001  # Above every admitted logical-work limit; never a selected bound.


def _add(a, b):
    return min(SAT, a+b)


def _mul(a, b):
    return min(SAT, a*b)


def _product(values):
    result = 1
    for value in values:
        result = _mul(result, value)
    return result


@dataclass(frozen=True, slots=True)
class Domain:
    tags: frozenset[str] = frozenset()
    string_bytes: int = 0
    i64_low: int | None = None
    i64_high: int | None = None

    def union(self, other):
        lows = [x for x in (self.i64_low,other.i64_low) if x is not None]
        highs = [x for x in (self.i64_high,other.i64_high) if x is not None]
        return Domain(self.tags | other.tags, max(self.string_bytes,other.string_bytes),
                      min(lows) if lows else None, max(highs) if highs else None)


@dataclass(frozen=True, slots=True)
class SnapshotStatistics:
    """Fresh DB-owned set statistics, never a caller-supplied admission claim."""
    rows: int
    domains: tuple[Domain, ...]
    string_bytes: int
    atoms: tuple  # (compiler-owned Atom, set count, per-column domains)

    def atom(self, atom):
        for known,count,domains in self.atoms:
            if known==atom:return count,domains
        raise ValueError('missing complete EAV atom statistics')


def _domain(values):
    result = Domain()
    for value in values:
        result = result.union(Domain(frozenset({value.tag}),
            len(value.wire.encode('utf-8')) if value.tag == 'str' else 0,
            int(value.wire) if value.tag == 'i64' else None,
            int(value.wire) if value.tag == 'i64' else None))
    return result


@dataclass(frozen=True, slots=True)
class Proof:
    row_bounds: tuple[int, ...]
    domains: tuple[tuple[Domain, ...], ...]
    facts: int
    rounds: int
    work: int
    dictionary_values: int
    dictionary_bytes: int
    output_bytes: int
    carrier_bytes: int
    output_cells: int
    candidate_bindings: int
    intermediate_rows: int
    answer_rows: int

    def explanation(self):
        return tuple((name,getattr(self,name)) for name in
            ('facts','rounds','work','dictionary_values','dictionary_bytes','output_bytes',
             'carrier_bytes','output_cells','candidate_bindings','intermediate_rows','answer_rows'))


def _constants(program):
    return frozenset(term.const for rule in program.rules
        for atom in (rule.head,*rule.positive,*rule.negative) for term in atom.terms if term.const is not None)


def _matches(atom, row):
    variables = {}
    for term, value in zip(atom.terms,row):
        if term.const is not None:
            if value != term.const:
                return False
        elif term.var in variables:
            if variables[term.var] != value:
                return False
        else:
            variables[term.var] = value
    return True


def _atom_semantics(atom, active, rows, domains):
    if atom.relation != 0:
        return rows[atom.relation], domains[atom.relation]
    if type(active) is SnapshotStatistics:
        return active.atom(atom)
    matching = tuple(row for row in active if _matches(atom,row))
    # Only semantic rows/domains use this exact pattern. Native work must use
    # FULL relation rows, because a single index can scan rejected candidates.
    return len(matching), tuple(_domain(row[i] for row in matching) for i in range(3))


def analyze(program, facts, valid_at, known_at, limits, *, statistics=None):
    """Return (complete conservative proof, None) or (None, fallback reason).

    Saturated values are not upper-bound evidence and can never select SQL.
    All input facts have already been independently validated/owned.
    """
    if any(rule.filter_count for rule in program.rules):
        return None, 'opaque_expression_native_only'
    if any(rule.negative for rule in program.rules):
        return None, 'negative_relation_native_only'
    if (any(len(c.relations) != 1 for c in program.components)
            or any(source == target for _,_,source,target,_,_ in program.dependencies)):
        return None, 'positive_recursive_component_native_only'
    constants = _constants(program)
    if any(v.tag == 'str' and len(v.wire.encode('utf-8')) > 512 for v in constants):
        return None, 'sql_text_domain_unproved'
    if statistics is not None and type(statistics) is not SnapshotStatistics:
        raise TypeError('exact transaction-owned SnapshotStatistics required')
    active = statistics if statistics is not None else frozenset(fact.triple() for fact in facts if fact.active(valid_at,known_at))
    rows = [0 for _ in program.relations]
    domains = [tuple(Domain() for _ in range(r.arity)) for r in program.relations]
    rows[0] = statistics.rows if statistics is not None else len(active)
    domains[0] = statistics.domains if statistics is not None else tuple(_domain(row[i] for row in active) for i in range(3))
    work, candidate_bound, rounds, aggregate_values = 0, 0, 0, 0
    for component_id in program.schedule:
        component = program.components[component_id]
        if not component.rules:
            continue
        rounds += 1  # Empty data still gets this rule-bearing component round.
        relation = component.relations[0]
        for rule_id in component.rules:
            rule = program.rules[rule_id]
            aggregate = rule.aggregate
            if aggregate is not None:
                source = aggregate.source
                source_rows = rows[source]
                work_groups = source_rows if aggregate.keys else 1
                group_rows = (0 if aggregate.op in ('min','max') and source_rows == 0
                              else work_groups)
                if aggregate.op == 'count':
                    result_domain = Domain(frozenset({'i64'}),0,0,source_rows)
                    aggregate_work = _add(source_rows,work_groups)
                else:
                    measure = domains[source][aggregate.measure]
                    if source_rows == 0:
                        result_domain = (Domain(frozenset({'i64'}),0,0,0)
                                         if aggregate.op == 'sum_i64' else Domain())
                    elif aggregate.op == 'sum_i64':
                        if measure.tags != frozenset({'i64'}):
                            return None, 'aggregate_measure_tags_unproved'
                        if measure.i64_low is None or measure.i64_high is None:
                            return None, 'aggregate_integer_domain_unproved'
                        magnitude = max(abs(measure.i64_low),abs(measure.i64_high))
                        maximum = magnitude*source_rows
                        if maximum > MAX_I64:
                            return None, 'aggregate_final_range_unproved'
                        result_domain = Domain(frozenset({'i64'}),0,-maximum,maximum)
                    else:
                        if len(measure.tags) != 1 or 'bool' in measure.tags:
                            return None, 'aggregate_measure_tags_unproved'
                        result_domain = measure
                    aggregate_work = _add(_mul(2,source_rows),_mul(2,work_groups))
                rows[relation] = group_rows
                domains[relation] = tuple(domains[source][i] for i in aggregate.keys)+(result_domain,)
                aggregate_values = _add(aggregate_values,group_rows)
                work = _add(work,aggregate_work)
                candidate_bound = max(candidate_bound,source_rows)
                continue
            semantic = [_atom_semantics(atom,active,rows,domains) for atom in rule.positive]
            candidates = _product(count for count,_ in semantic)
            # No exact full-atom match count enters this scan-work expression.
            scan = _mul(len(rule.positive),_product(max(1,rows[atom.relation]) for atom in rule.positive))
            work = _add(work,scan)
            candidate_bound = max(candidate_bound,candidates)
            variables = {}
            for atom, (_,column_domains) in zip(rule.positive,semantic):
                for term, domain in zip(atom.terms,column_domains):
                    if term.var is not None:
                        variables[term.var] = variables.get(term.var,Domain()).union(domain)
            output = tuple(_domain((term.const,)) if term.const is not None else variables[term.var]
                           for term in rule.head.terms)
            rows[relation] = _add(rows[relation],candidates)
            domains[relation] = tuple(a.union(b) for a,b in zip(domains[relation],output))
        if work >= SAT or any(bound >= SAT for bound in rows) or candidate_bound >= SAT:
            return None, 'native_logical_proof_saturated'
    facts_bound = 0
    for bound in rows:
        facts_bound = _add(facts_bound,bound)
    intermediate = 0
    for bound in rows[1:]:
        intermediate = _add(intermediate,bound)
    # Repeated values/strings deliberately overcount; MIN/MAX may reuse values.
    base_count=statistics.rows if statistics is not None else len(facts)
    dictionary_values = _add(_add(len(constants),3*base_count),aggregate_values)
    string_bytes = sum(len(v.wire.encode('utf-8')) for v in constants if v.tag == 'str')
    string_bytes += (statistics.string_bytes if statistics is not None else
        sum(len(f.e.encode('utf-8'))+len(f.a.encode('utf-8'))
            +(len(f.value.wire.encode('utf-8')) if f.value.tag == 'str' else 0) for f in facts))
    dictionary_bytes = _add(_mul(dictionary_values,MODEL['dictionary_entry_bytes']),string_bytes)
    answer = program.answer
    answer_rows = rows[answer]
    arity = program.relations[answer].arity
    extra = sum(domain.string_bytes for domain in domains[answer])
    output_bytes = _mul(answer_rows,MODEL['typed_output_row_bytes'][arity]+extra)
    carrier_bytes = _mul(answer_rows,40*arity+extra)
    cells = _mul(answer_rows,arity)
    all_bounds = (facts_bound,work,dictionary_values,dictionary_bytes,output_bytes,carrier_bytes,
                  cells,candidate_bound,intermediate)
    if any(bound >= SAT for bound in all_bounds):
        return None, 'native_logical_proof_saturated'
    checks = (
        (facts_bound,limits.max_facts,'native_fact_budget_unproved'),
        (rounds,limits.max_rounds,'native_round_budget_unproved'),
        (work,limits.max_work,'native_work_budget_unproved'),
        (dictionary_values,MODEL['max_dictionary_values'],'native_dictionary_values_unproved'),
        (dictionary_bytes,MODEL['max_dictionary_bytes'],'native_dictionary_bytes_unproved'),
        (output_bytes,MODEL['max_output_bytes'],'native_output_bytes_unproved'),
        (answer_rows,100000,'native_carrier_rows_unproved'),
        (cells,800000,'native_carrier_cells_unproved'),
        (carrier_bytes,32*1024*1024,'native_carrier_bytes_unproved'),
        (candidate_bound,limits.max_candidate_bindings,'planner_candidate_budget_unproved'),
        (intermediate,limits.max_intermediate_rows,'planner_intermediate_budget_unproved'),
        (answer_rows,limits.max_output_rows,'planner_output_budget_unproved'),
    )
    for value, maximum, reason in checks:
        if value > maximum:
            return None, reason
    return Proof(tuple(rows),tuple(domains),facts_bound,rounds,work,dictionary_values,dictionary_bytes,
                 output_bytes,carrier_bytes,cells,candidate_bound,intermediate,answer_rows), None
