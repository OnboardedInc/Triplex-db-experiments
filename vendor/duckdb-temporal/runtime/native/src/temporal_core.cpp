// SPDX-License-Identifier: MIT
#include "temporal_core.hpp"
#include "temporal_typed_core.hpp"
#include "temporal_stratified_core.hpp"
#include "temporal_plan_ir.hpp"
#include "temporal_plan_ir_v2.hpp"
#include "temporal_value_domain.hpp"
#include "temporal_expression.hpp"
#include <algorithm>
#include <array>
#include <charconv>
#include <cmath>
#include <cstring>
#include <functional>
#include <initializer_list>
#include <limits>
#include <numeric>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <utility>

namespace td {
namespace {
constexpr size_t MAX_PROGRAM = 65536;
constexpr size_t MAX_TERM = 16384;
constexpr size_t MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
constexpr size_t MAX_INPUT_ROWS = 100000;
constexpr size_t MAX_RULES = 128;
constexpr size_t MAX_RELATIONS = 128;
constexpr size_t MAX_BODY = 16;
constexpr size_t MAX_VARIABLES = 64;
constexpr size_t MAX_ARITY = 8;
using Id = uint32_t;
// Arity is hard-bounded by the parser; keep small tuples inline, without a
// separately allocated vector buffer for temporary, seen-key and row copies.
class Tuple {
    std::array<Id, MAX_ARITY> values{};
    uint8_t count = 0;
public:
    Tuple() = default;
    Tuple(std::initializer_list<Id> init) {
        if (init.size() > MAX_ARITY) throw Error("internal tuple capacity exceeded");
        count = static_cast<uint8_t>(init.size());
        std::copy(init.begin(), init.end(), values.begin());
    }
    void reserve(size_t arity) const {
        if (arity > MAX_ARITY) throw Error("internal tuple capacity exceeded");
    }
    void push_back(Id id) {
        if (count >= MAX_ARITY) throw Error("internal tuple capacity exceeded");
        values[count++] = id;
    }
    size_t size() const noexcept { return count; }
    const Id &operator[](size_t index) const noexcept { return values[index]; }
    const Id *begin() const noexcept { return values.data(); }
    const Id *end() const noexcept { return values.data() + count; }
    bool operator==(const Tuple &other) const noexcept {
        return count == other.count && std::equal(begin(), end(), other.begin());
    }
};
struct TupleHash {
    size_t operator()(const Tuple &t) const noexcept {
        size_t h = 0x9e3779b9;
        for (auto x : t) h ^= size_t(x) + 0x9e3779b9 + (h << 6) + (h >> 2);
        return h;
    }
};
struct Term { bool variable; Id id; };
struct Atom { size_t relation; std::vector<Term> terms; };
enum class AggregateKind { None, Count, Min, Max, SumI64 };
struct Aggregate {
    AggregateKind kind = AggregateKind::None;
    Id measure = 0;
    std::vector<size_t> key_columns;
    size_t measure_column = 0;
};
struct HeadProjection {
    size_t column;
    detail::Expression expression;
};
struct Rule {
    Atom head;
    std::vector<Atom> body;
    size_t variables;
    std::vector<detail::Expression> filters;
    size_t expression_nodes = 0;
    std::vector<Atom> negative;
    Aggregate aggregate;
    std::vector<HeadProjection> projections;
};
struct Relation {
    std::string name;
    size_t arity;
    bool defined = false;
    std::vector<Tuple> rows;
    std::unordered_set<Tuple, TupleHash> seen;
    // Per-column indexes support constant and bound-variable probes.
    std::vector<std::unordered_map<Id, std::vector<size_t>>> indexes;
    std::vector<bool> indexed;
    std::function<void()> poll;
    size_t delta_begin = 0;
    explicit Relation(std::string n, size_t a, std::function<void()> check)
        : name(std::move(n)), arity(a), indexes(a), indexed(a, false), poll(std::move(check)) {}
    const std::vector<size_t> *lookup(size_t col, Id value) {
        if (!indexed[col]) {
            for (size_t row = 0; row < rows.size(); ++row) {
                if ((row & 1023) == 0 && poll) poll();
                indexes[col][rows[row][col]].push_back(row);
            }
            indexed[col] = true;
        }
        auto it = indexes[col].find(value);
        return it == indexes[col].end() ? nullptr : &it->second;
    }
    void append_unique(const Tuple &tuple) {
        size_t row = rows.size();
        rows.push_back(tuple);
        for (size_t col = 0; col < arity; ++col) if (indexed[col]) indexes[col][tuple[col]].push_back(row);
    }
};
}

template <class Domain, bool Stratified = false> struct Core {
    static_assert(!Stratified || Domain::typed, "stratified mode requires exact typed values");
    Limits limits;
    int64_t valid_at, known_at;
    std::string program;
    size_t pos = 0, input_rows = 0, expression_nodes = 0;
    Domain dictionary;
    std::unordered_map<std::string, size_t> relation_ids;
    std::vector<Relation> relations;
    std::vector<Rule> rules;
    uint64_t total_facts = 0, work = 0, rounds = 0;
    bool has_run = false;
    // Used only by the additive mode. All predicates, including disconnected
    // ones, participate; no answer-reachability pruning can hide an error.
    std::vector<size_t> component_of;
    std::vector<std::vector<size_t>> components;
    std::vector<size_t> component_order;

    Core(const std::string &p, int64_t v, int64_t k, Limits l)
        : limits(l), valid_at(v), known_at(k), program(p) {
        if constexpr (Domain::typed) detail::require_float_environment();
        if (p.empty() || p.size() > MAX_PROGRAM) throw Error("program must contain 1..65536 bytes");
        if (p.find('\0') != std::string::npos) throw Error("NUL is not allowed in programs");
        if (!l.max_facts || l.max_facts > 100000) throw Error("max_facts must be in 1..100000");
        if (!l.max_rounds || l.max_rounds > 2000) throw Error("max_rounds must be in 1..2000");
        if (!l.max_work || l.max_work > 50000000) throw Error("max_work must be in 1..50000000");
        relations.reserve(MAX_RELATIONS);
        relation("triple", 3);
        relations[0].defined = true;
        parse();
    }
    [[noreturn]] void syntax(const std::string &message) const {
        const std::string prefix = Domain::typed ? "TD_E_PROGRAM_SYNTAX: " : "";
        throw Error(prefix + "Datalog parse error at byte " + std::to_string(pos) + ": " + message);
    }
    static bool alpha(char c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_'; }
    static bool digit(char c) { return c >= '0' && c <= '9'; }
    void skip() {
        for (;;) {
            while (pos < program.size() && (program[pos] == ' ' || program[pos] == '\n' || program[pos] == '\t' || program[pos] == '\r')) ++pos;
            if (pos < program.size() && (program[pos] == '%' || program[pos] == '#')) {
                while (pos < program.size() && program[pos] != '\n') ++pos;
            } else break;
        }
    }
    bool take(char ch) { skip(); if (pos < program.size() && program[pos] == ch) { ++pos; return true; } return false; }
    void need(char ch) { if (!take(ch)) syntax(std::string("expected '") + ch + "'"); }
    std::string identifier() {
        skip();
        size_t begin = pos;
        if (pos == program.size() || !alpha(program[pos])) syntax("expected identifier");
        ++pos;
        while (pos < program.size() && (alpha(program[pos]) || digit(program[pos]))) ++pos;
        if (pos - begin > 128) syntax("identifier exceeds 128 bytes");
        return program.substr(begin, pos - begin);
    }
    static void validate_term(const std::string &s) {
        Domain::validate_identifier(s);
    }
    Id intern(const std::string &s) {
        return dictionary.intern_string(s);
    }
    size_t relation(const std::string &name, size_t arity) {
        if (arity == 0 || arity > MAX_ARITY) throw Error("predicate arity must be in 1..8");
        auto it = relation_ids.find(name);
        if (it != relation_ids.end()) {
            if (relations[it->second].arity != arity) throw Error("predicate arity mismatch: " + name);
            return it->second;
        }
        if (relations.size() >= MAX_RELATIONS) throw Error("more than 128 predicates");
        size_t id = relations.size();
        relations.emplace_back(name, arity, limits.poll);
        relation_ids.emplace(name, id);
        return id;
    }
    Term term(std::unordered_map<std::string, Id> &variables, bool expression = false) {
        skip();
        if (take('?')) {
            auto name = identifier();
            auto it = variables.find(name);
            if (it == variables.end()) {
                if (variables.size() >= MAX_VARIABLES) throw Error("more than 64 variables in a rule");
                Id id = static_cast<Id>(variables.size());
                it = variables.emplace(name, id).first;
            }
            return {true, it->second};
        }
        skip();
        if (pos == program.size() || (program[pos] != '\'' && program[pos] != '"')) {
            if constexpr (Domain::typed) return {false, dictionary.intern_value(scalar_literal(expression))};
            else syntax("terms must be ?variables or quoted strings; builtins, negation and functions are unsupported");
        }
        return {false, intern(quoted_text())};
    }
    std::string quoted_text() {
        skip();
        if (pos == program.size() || (program[pos] != '\'' && program[pos] != '"')) syntax("expected quoted string");
        char quote = program[pos++];
        std::string value;
        bool closed = false;
        while (pos < program.size()) {
            char c = program[pos++];
            if (c == quote) {
                if (pos < program.size() && program[pos] == quote) { ++pos; value.push_back(quote); }
                else { closed = true; break; }
            } else if (c == '\\') {
                if (pos == program.size()) syntax("unterminated escape");
                c = program[pos++];
                if (c == 'n') value.push_back('\n');
                else if (c == 'r') value.push_back('\r');
                else if (c == 't') value.push_back('\t');
                else if (c == '\\' || c == '\'' || c == '"') value.push_back(c);
                else syntax("unsupported string escape");
            } else value.push_back(c);
            if (value.size() > MAX_TERM) throw Error("term exceeds 16384 bytes");
        }
        if (!closed) syntax("unterminated string");
        return value;
    }
    bool take_constructor(std::string_view name) {
        skip();
        const auto start = pos;
        if (program.compare(pos, name.size(), name.data(), name.size()) != 0) return false;
        pos += name.size();
        if (take('(')) return true;
        pos = start;
        return false;
    }
    static bool term_delimiter(char ch) {
        return ch == ',' || ch == ')' || ch == ' ' || ch == '\n' || ch == '\r' || ch == '\t' ||
               ch == '%' || ch == '#';
    }
    static bool expression_delimiter(char ch) {
        return term_delimiter(ch) || ch == ']' || ch == '(' || ch == '[' ||
               ch == '+' || ch == '-' || ch == '*' || ch == '/' ||
               ch == '=' || ch == '!' || ch == '<' || ch == '>';
    }
    Value scalar_literal(bool expression = false) {
        if (limits.values != ValueProfile::FourTag) {
            if (take_constructor("ref")) {
                auto id = quoted_text(); need(')');
                return Value::ref(std::move(id));
            }
            if (take_constructor("datetime")) {
                const auto value = detail::finite_binary64_literal(quoted_text()); need(')');
                if (!value) throw Error("TD_E_VALUE_PAYLOAD: datetime literal requires finite binary64 bits");
                return Value::datetime(*value);
            }
        }
        if (limits.values == ValueProfile::AllValues) {
            if (take_constructor("json")) {
                auto source = quoted_text(); need(')');
                return Value::json(std::move(source));
            }
            if (take_constructor("blob")) {
                auto id = quoted_text(); need(')');
                return Value::blob(std::move(id));
            }
        }
        // Called only by the typed parser. A predicate named true/false still
        // goes through identifier(), not through this term-only keyword path.
        for (const auto &keyword : {std::string("true"), std::string("false")}) {
            if (program.compare(pos, keyword.size(), keyword) == 0) {
                const auto end = pos + keyword.size();
                if (end < program.size() && !(expression ? expression_delimiter(program[end]) : term_delimiter(program[end])))
                    syntax("boolean literal must end at a term delimiter");
                pos = end;
                return Value::boolean(keyword == "true");
            }
        }
        const size_t begin = pos;
        if (pos == program.size() || (program[pos] != '-' && !digit(program[pos])))
            syntax("terms must be ?variables, quoted strings, booleans or decimal numbers; unsupported value literal");
        while (pos < program.size()) {
            const auto ch = program[pos];
            if (expression) {
                // An adjacent leading minus belongs to the old signed literal;
                // signs immediately after e/E belong to its exponent. All other
                // expression operators terminate the token, even without spaces.
                const bool sign = (ch == '+' || ch == '-') &&
                    ((pos == begin && ch == '-') ||
                     (pos > begin && (program[pos - 1] == 'e' || program[pos - 1] == 'E')));
                if (expression_delimiter(ch) && !sign) break;
            } else if (term_delimiter(ch)) break;
            if (pos - begin >= 128) syntax("numeric literal exceeds 128 bytes");
            ++pos;
        }
        const auto end = pos;
        size_t at = begin;
        if (at < end && program[at] == '-') ++at;
        if (at == end) syntax("expected decimal digits");
        if (program[at] == '0') {
            ++at;
            if (at < end && digit(program[at])) syntax("leading zero in numeric literal");
        } else {
            if (program[at] < '1' || program[at] > '9') syntax("expected decimal digits");
            do { ++at; } while (at < end && digit(program[at]));
        }
        bool floating = false;
        size_t significand_end = at;
        if (at < end && program[at] == '.') {
            floating = true; ++at;
            const auto fraction_begin = at;
            while (at < end && digit(program[at])) ++at;
            if (at == fraction_begin) syntax("a decimal point requires following digits");
            significand_end = at;
        }
        if (at < end && (program[at] == 'e' || program[at] == 'E')) {
            floating = true; ++at;
            if (at < end && (program[at] == '+' || program[at] == '-')) ++at;
            const auto exponent_begin = at;
            while (at < end && digit(program[at])) ++at;
            if (at == exponent_begin) syntax("an exponent requires decimal digits");
        }
        if (at != end) syntax("invalid decimal literal or suffix");
        const char *first = program.data() + begin, *last = program.data() + end;
        if (!floating) {
            int64_t value = 0;
            const auto converted = std::from_chars(first, last, value, 10);
            if (converted.ec != std::errc() || converted.ptr != last)
                syntax("integer literal is outside signed int64 range");
            return Value::i64(value);
        }
        bool nonzero = false;
        for (size_t i = begin; i < significand_end; ++i)
            if (program[i] >= '1' && program[i] <= '9') nonzero = true;
        // A lexical zero remains zero even with an enormous valid exponent.
        if (!nonzero) return Value::f64(0.0);
        double value = 0;
        const auto converted = std::from_chars(first, last, value, std::chars_format::general);
        const auto bits = detail::float_bits(value);
        if (converted.ec != std::errc() || converted.ptr != last || !detail::finite_float_bits(bits))
            syntax("float literal is outside finite binary64 range");
        if (detail::zero_float_bits(bits)) syntax("nonzero float literal underflows to zero");
        return Value::f64(value);
    }
    [[noreturn]] void expression_limit(const std::string &message) const {
        throw Error("TD_E_EXPR_LIMIT: " + message);
    }
    size_t expression_node(detail::Expression &expression, Rule &rule, detail::ExprOp op,
                           uint32_t operand, size_t height) {
        if (height > detail::MAX_EXPRESSION_HEIGHT) expression_limit("expression AST height exceeds 32");
        if (rule.expression_nodes >= detail::MAX_RULE_EXPRESSION_NODES)
            expression_limit("more than 256 expression AST nodes in a rule");
        if (expression_nodes >= detail::MAX_PROGRAM_EXPRESSION_NODES)
            expression_limit("more than 4096 expression AST nodes in a program");
        ++rule.expression_nodes; ++expression_nodes;
        expression.code.push_back({op, operand});
        return height;
    }
    void expression_descent(size_t nesting) const {
        if (nesting >= detail::MAX_EXPRESSION_NESTING)
            expression_limit("expression syntax nesting exceeds 32");
    }
    size_t expression_unary(std::unordered_map<std::string, Id> &variables,
                            detail::Expression &expression, Rule &rule, size_t nesting) {
        skip();
        if (pos < program.size() && program[pos] == '-' &&
            !(pos + 1 < program.size() && digit(program[pos + 1]))) {
            ++pos; expression_descent(nesting);
            const auto height = expression_unary(variables, expression, rule, nesting + 1);
            return expression_node(expression, rule, detail::ExprOp::Negate, 0, height + 1);
        }
        if (take('(')) {
            expression_descent(nesting);
            const auto height = expression_sum(variables, expression, rule, nesting + 1);
            need(')'); return height;
        }
        if (limits.values != ValueProfile::FourTag && take_constructor("ref_id")) {
            const auto value = term(variables, true); need(')');
            if (!value.variable) syntax("ref_id requires a bound variable");
            expression.dependencies |= uint64_t(1) << value.id;
            expression_node(expression, rule, detail::ExprOp::Variable, value.id, 1);
            return expression_node(expression, rule, detail::ExprOp::RefId, 0, 2);
        }
        const auto value = term(variables, true);
        if (value.variable) expression.dependencies |= uint64_t(1) << value.id;
        return expression_node(expression, rule,
            value.variable ? detail::ExprOp::Variable : detail::ExprOp::Literal, value.id, 1);
    }
    size_t expression_product(std::unordered_map<std::string, Id> &variables,
                              detail::Expression &expression, Rule &rule, size_t nesting) {
        auto height = expression_unary(variables, expression, rule, nesting);
        for (;;) {
            skip();
            if (pos == program.size() || (program[pos] != '*' && program[pos] != '/')) return height;
            const auto op = program[pos++] == '*' ? detail::ExprOp::Multiply : detail::ExprOp::Divide;
            const auto right = expression_unary(variables, expression, rule, nesting);
            height = expression_node(expression, rule, op, 0, 1 + std::max(height, right));
        }
    }
    size_t expression_sum(std::unordered_map<std::string, Id> &variables,
                          detail::Expression &expression, Rule &rule, size_t nesting) {
        auto height = expression_product(variables, expression, rule, nesting);
        for (;;) {
            skip();
            if (pos == program.size() || (program[pos] != '+' && program[pos] != '-')) return height;
            const auto op = program[pos++] == '+' ? detail::ExprOp::Add : detail::ExprOp::Subtract;
            const auto right = expression_product(variables, expression, rule, nesting);
            height = expression_node(expression, rule, op, 0, 1 + std::max(height, right));
        }
    }
    void parse_filter(std::unordered_map<std::string, Id> &variables, Rule &rule) {
        if (rule.filters.size() >= detail::MAX_FILTERS) expression_limit("more than 16 filters in a rule");
        need('[');
        detail::Expression filter;
        const auto left = expression_sum(variables, filter, rule, 0);
        skip();
        detail::ExprOp op;
        if (take('=')) op = detail::ExprOp::Equal;
        else if (take('!')) {
            if (pos == program.size() || program[pos] != '=') syntax("expected adjacent '!='");
            ++pos; op = detail::ExprOp::NotEqual;
        }
        else if (take('<')) {
            const bool equal = pos < program.size() && program[pos] == '=';
            if (equal) ++pos;
            op = equal ? detail::ExprOp::LessEqual : detail::ExprOp::Less;
        }
        else if (take('>')) {
            const bool equal = pos < program.size() && program[pos] == '=';
            if (equal) ++pos;
            op = equal ? detail::ExprOp::GreaterEqual : detail::ExprOp::Greater;
        }
        else syntax("filter requires one comparison (= != < <= > >=)");
        const auto right = expression_sum(variables, filter, rule, 0);
        need(']');
        expression_node(filter, rule, op, 0, 1 + std::max(left, right));
        rule.filters.push_back(std::move(filter));
    }
    Atom atom(std::unordered_map<std::string, Id> &variables) {
        auto name = identifier();
        need('(');
        std::vector<Term> terms;
        do {
            if (terms.size() >= MAX_ARITY) throw Error("predicate arity exceeds 8");
            terms.push_back(term(variables));
        } while (take(','));
        need(')');
        return {relation(name, terms.size()), std::move(terms)};
    }
    Atom stratified_head(std::unordered_map<std::string, Id> &variables, Rule &rule) {
        auto &aggregate = rule.aggregate;
        const auto name = identifier();
        need('(');
        std::vector<Term> terms;
        for (;;) {
            if (terms.size() >= MAX_ARITY) throw Error("predicate arity exceeds 8");
            if (limits.values == ValueProfile::AllValues && take('[')) {
                detail::Expression expression;
                expression_sum(variables, expression, rule, 0);
                need(']');
                rule.projections.push_back({terms.size(), std::move(expression)});
                // This column is produced by the projection, never decoded as
                // an ordinary constant in evaluation or inspection.
                terms.push_back({false, 0});
                if (!take(',')) break;
                continue;
            }
            skip();
            const auto saved = pos;
            if (pos < program.size() && alpha(program[pos])) {
                const auto op = identifier();
                if (take('(')) {
                    if (op == "count") aggregate.kind = AggregateKind::Count;
                    else if (op == "min") aggregate.kind = AggregateKind::Min;
                    else if (op == "max") aggregate.kind = AggregateKind::Max;
                    else if (op == "sum_i64") aggregate.kind = AggregateKind::SumI64;
                    else throw Error("TD_E_AGG_UNSUPPORTED: aggregate must be count/min/max/sum_i64");
                    if (aggregate.kind != AggregateKind::Count) {
                        const auto measure = term(variables);
                        if (!measure.variable) throw Error("TD_E_AGG_DESCRIPTOR: measure must be a source variable");
                        aggregate.measure = measure.id;
                    }
                    need(')');
                    // This sentinel occupies the output cell only. It is never
                    // interned, evaluated as a term or exposed in legacy IR.
                    terms.push_back({false, 0});
                    need(')'); // Aggregate must be the final head term.
                    return {relation(name, terms.size()), std::move(terms)};
                }
                pos = saved;
            }
            terms.push_back(term(variables));
            if (!take(',')) break;
        }
        need(')');
        return {relation(name, terms.size()), std::move(terms)};
    }
    bool negative_prefix() {
        if (take('!')) return true;
        skip();
        // `not(...)` remains an ordinary predicate name. The optional readable
        // alias is `not atom(...)`, with at least one whitespace byte.
        if (program.compare(pos, 3, "not") == 0 && pos + 3 < program.size()) {
            const auto c = program[pos + 3];
            if (c == ' ' || c == '\n' || c == '\r' || c == '\t') {
                pos += 3;
                return true;
            }
        }
        return false;
    }
    void validate_aggregate(Rule &rule) {
        if (rule.aggregate.kind == AggregateKind::None) return;
        if (!rule.projections.empty())
            throw Error("TD_E_AGG_DESCRIPTOR: computed heads and aggregate outputs require separate rules");
        if (rule.body.size() != 1 || !rule.negative.empty() || !rule.filters.empty())
            throw Error("TD_E_AGG_BODY: aggregate body must be one complete positive relation atom");
        const auto &source = rule.body[0];
        std::unordered_map<Id, size_t> columns;
        for (size_t col = 0; col < source.terms.size(); ++col) {
            const auto &t = source.terms[col];
            if (!t.variable || !columns.emplace(t.id, col).second)
                throw Error("TD_E_AGG_BODY: source columns must be distinct variables");
        }
        std::set<Id> keys;
        for (size_t i = 0; i + 1 < rule.head.terms.size(); ++i) {
            const auto &key = rule.head.terms[i];
            if (!key.variable || !keys.insert(key.id).second || !columns.count(key.id))
                throw Error("TD_E_AGG_DESCRIPTOR: keys must be distinct source variables");
            rule.aggregate.key_columns.push_back(columns.at(key.id));
        }
        if (rule.aggregate.kind != AggregateKind::Count) {
            const auto found = columns.find(rule.aggregate.measure);
            if (found == columns.end()) throw Error("TD_E_AGG_DESCRIPTOR: measure is not in source");
            rule.aggregate.measure_column = found->second;
        }
    }
    void plan_completed() {
        struct Edge { size_t from, to; bool strict; };
        const auto n = relations.size();
        std::vector<Edge> edges;
        std::vector<int> producer(n, -1);
        std::vector<bool> ordinary(n, false);
        std::vector<std::vector<size_t>> graph(n);
        for (size_t i = 0; i < rules.size(); ++i) {
            const auto &rule = rules[i];
            const auto head = rule.head.relation;
            const bool aggregate = rule.aggregate.kind != AggregateKind::None;
            if (aggregate) {
                if (producer[head] >= 0) throw Error("TD_E_AGG_PRODUCER: aggregate target has multiple producers");
                producer[head] = static_cast<int>(i);
            } else ordinary[head] = true;
            auto edge = [&](const Atom &atom, bool strict) {
                edges.push_back({atom.relation, head, strict});
                graph[atom.relation].push_back(head);
            };
            for (const auto &atom : rule.body) edge(atom, aggregate);
            for (const auto &atom : rule.negative) edge(atom, true);
        }
        for (size_t i = 0; i < n; ++i)
            if (producer[i] >= 0 && ordinary[i])
                throw Error("TD_E_AGG_PRODUCER: aggregate target also has an ordinary producer");

        // Tarjan over ALL signed edges. At most 128 predicates bounds native
        // recursion depth; a strict edge internal to an SCC is inadmissible.
        std::vector<int> visit(n, -1), low(n, -1);
        std::vector<size_t> stack;
        std::vector<bool> active(n, false);
        component_of.resize(n);
        int next = 0;
        std::function<void(size_t)> dfs = [&](size_t v) {
            visit[v] = low[v] = next++;
            stack.push_back(v); active[v] = true;
            for (const auto w : graph[v]) {
                if (visit[w] < 0) { dfs(w); low[v] = std::min(low[v], low[w]); }
                else if (active[w]) low[v] = std::min(low[v], visit[w]);
            }
            if (low[v] != visit[v]) return;
            const auto id = components.size();
            components.emplace_back();
            for (;;) {
                const auto w = stack.back(); stack.pop_back(); active[w] = false;
                component_of[w] = id;
                components.back().push_back(w);
                if (w == v) break;
            }
            std::sort(components.back().begin(), components.back().end());
        };
        for (size_t v = 0; v < n; ++v) if (visit[v] < 0) dfs(v);
        std::vector<std::pair<size_t, size_t>> arcs;
        for (const auto &edge : edges) {
            const auto a = component_of[edge.from], b = component_of[edge.to];
            if (a == b) {
                if (edge.strict) throw Error("TD_E_STRAT_CYCLE: cycle through negation or aggregation");
            } else arcs.emplace_back(a, b);
        }
        for (const auto &rule : rules) if (!rule.projections.empty())
            for (const auto &atom : rule.body)
                if (component_of[atom.relation] == component_of[rule.head.relation])
                    throw Error("TD_E_EXPR_RECURSIVE: computed head cannot consume its own recursive component");
        std::sort(arcs.begin(), arcs.end());
        arcs.erase(std::unique(arcs.begin(), arcs.end()), arcs.end());
        std::vector<std::vector<size_t>> children(components.size());
        std::vector<size_t> indegree(components.size(), 0);
        for (const auto &arc : arcs) { children[arc.first].push_back(arc.second); ++indegree[arc.second]; }
        std::set<std::pair<size_t, size_t>> ready;
        for (size_t c = 0; c < components.size(); ++c)
            if (!indegree[c]) ready.emplace(components[c][0], c);
        while (!ready.empty()) {
            const auto c = ready.begin()->second; ready.erase(ready.begin());
            component_order.push_back(c);
            for (const auto target : children[c])
                if (--indegree[target] == 0) ready.emplace(components[target][0], target);
        }
        if (component_order.size() != components.size())
            throw Error("TD_E_STRAT_CYCLE: incomplete dependency order");
    }
    void parse() {
        skip();
        while (pos < program.size()) {
            if (rules.size() >= MAX_RULES) throw Error("more than 128 rules");
            std::unordered_map<std::string, Id> vars;
            Rule rule{};
            if constexpr (Stratified) rule.head = stratified_head(vars, rule);
            else rule.head = atom(vars);
            if (rule.head.relation == 0) throw Error("triple/3 is read-only and cannot appear in a rule head");
            relations[rule.head.relation].defined = true;
            if (take(':')) {
                need('-');
                do {
                    skip();
                    if constexpr (Domain::typed) {
                        if (pos < program.size() && program[pos] == '[') {
                            if constexpr (Stratified) {
                                if (rule.aggregate.kind != AggregateKind::None)
                                    throw Error("TD_E_AGG_BODY: aggregate body filters are not supported");
                            }
                            parse_filter(vars, rule);
                            continue;
                        }
                    }
                    if (rule.body.size() + rule.negative.size() >= MAX_BODY) throw Error("more than 16 atoms in a body");
                    if constexpr (Stratified) {
                        if (negative_prefix()) { rule.negative.push_back(atom(vars)); continue; }
                    }
                    rule.body.push_back(atom(vars));
                } while (take(','));
            }
            need('.');
            rule.variables = vars.size();
            std::set<Id> bound;
            for (const auto &a : rule.body) for (const auto &t : a.terms) if (t.variable) bound.insert(t.id);
            if constexpr (Stratified) {
                for (const auto &a : rule.negative) for (const auto &t : a.terms)
                    if (t.variable && !bound.count(t.id))
                        throw Error("TD_E_STRAT_UNSAFE: negative variable is not positively bound");
                validate_aggregate(rule);
            }
            for (const auto &t : rule.head.terms)
                if (t.variable && !bound.count(t.id)) {
                    if constexpr (Stratified)
                        throw Error("TD_E_STRAT_UNSAFE: head variable is not positively bound");
                    if (!rule.filters.empty()) throw Error("TD_E_EXPR_UNBOUND: head variable is not relationally bound");
                    throw Error("unsafe rule: head variable is not bound in the body");
                }
            uint64_t bound_mask = 0;
            for (auto variable : bound) bound_mask |= uint64_t(1) << variable;
            for (const auto &filter : rule.filters)
                if (filter.dependencies & ~bound_mask)
                    throw Error("TD_E_EXPR_UNBOUND: filter variable is not relationally bound");
            for (const auto &projection : rule.projections)
                if (rule.body.empty() || (projection.expression.dependencies & ~bound_mask))
                    throw Error("TD_E_EXPR_UNBOUND: computed head requires a positive body and relationally bound variables");
            rules.push_back(std::move(rule));
            skip();
        }
        auto answer = relation_ids.find("answer");
        if (answer == relation_ids.end() || !relations[answer->second].defined)
            throw Error("program must define answer/1..8");
        for (const auto &rule : rules) for (const auto &a : rule.body)
            if (!relations[a.relation].defined) throw Error("undefined predicate: " + relations[a.relation].name);
        if constexpr (Stratified) {
            for (const auto &rule : rules) for (const auto &a : rule.negative)
                if (!relations[a.relation].defined) throw Error("undefined predicate: " + relations[a.relation].name);
            plan_completed();
        }
    }
    void check_add() {
        if (limits.poll) limits.poll();
        if (total_facts >= limits.max_facts) throw Error("max_facts exceeded; no partial result returned");
    }
    void add_known(size_t relation_id, const Tuple &tuple) {
        auto &r = relations[relation_id];
        // One hash probe on the common path. Any subsequent error terminates
        // this invocation; no partially inserted state is reused or returned.
        if (r.seen.insert(tuple).second) {
            check_add(); r.append_unique(tuple); ++total_facts;
        }
    }
    void add_triple(const std::string &e, const std::string &a, const typename Domain::Input &v,
                    int64_t vf, int64_t vt, int64_t tf, int64_t tt) {
        if constexpr (Domain::typed) {
            detail::require_float_environment();
            if (static_cast<uint8_t>(v.tag()) > static_cast<uint8_t>(limits.values))
                throw Error("TD_E_VALUE_TAG: unknown value tag");
        }
        if (has_run) throw Error("cannot add triples after run");
        if (++input_rows > MAX_INPUT_ROWS) throw Error("input exceeds 100000 temporal rows");
        validate_term(e); validate_term(a); Domain::validate_value(v);
        if (vf >= vt) throw Error("valid interval must satisfy valid_from < valid_to");
        if (tf >= tt) throw Error("transaction interval must satisfy tx_from < tx_to");
        if (vf <= valid_at && valid_at < vt && tf <= known_at && known_at < tt)
            add_known(0, {intern(e), intern(a), dictionary.intern_value(v)});
    }
    void charge() {
        if ((work & 1023) == 0 && limits.poll) limits.poll();
        if (++work > limits.max_work) throw Error("max_work exceeded; no partial result returned");
    }
    void charge_expression(uint64_t units, const char *stage) {
        if (limits.poll) limits.poll();
        if (units > limits.max_work - work)
            throw Error(std::string("TD_E_EXPR_LIMIT: max_work exceeded during ") + stage +
                " evaluation; no partial result returned");
        work += units;
    }
    bool filters_match(const Rule &rule, const std::vector<int64_t> &bindings) {
        if constexpr (Domain::typed) {
            auto charge_filter = [&](uint64_t units) { charge_expression(units, "filter"); };
            bool matches = true;
            for (const auto &filter : rule.filters) {
                const bool passed = detail::evaluate_expression<true>(filter, dictionary, bindings, charge_filter);
                // False is not an error guard: later filters must still run.
                if (!passed) matches = false;
            }
            return matches;
        } else {
            (void)rule; (void)bindings;
            return true;
        }
    }
    Tuple project_head(const Rule &rule, const std::vector<int64_t> &bindings) {
        Tuple output;
        if constexpr (Stratified) if (!rule.projections.empty()) {
            auto charge_projection = [&](uint64_t units) { charge_expression(units, "computed head"); };
            auto projection = rule.projections.begin();
            for (size_t column = 0; column < rule.head.terms.size(); ++column) {
                if (projection != rule.projections.end() && projection->column == column) {
                    const auto result = detail::evaluate_expression<false>(projection++->expression, dictionary, bindings,
                        charge_projection);
                    if (result.tag == ValueTag::Int64) output.push_back(dictionary.intern_value(Value::i64(result.value.i)));
                    else if (result.tag == ValueTag::Float64)
                        output.push_back(dictionary.intern_value(Value::f64(detail::bits_float(result.value.f))));
                    else detail::expression_type_error();
                } else {
                    const auto &term = rule.head.terms[column];
                    output.push_back(term.variable ? static_cast<Id>(bindings[term.id]) : term.id);
                }
            }
            return output;
        }
        for (const auto &term : rule.head.terms)
            output.push_back(term.variable ? static_cast<Id>(bindings[term.id]) : term.id);
        return output;
    }
    using Pending = std::vector<std::unordered_set<Tuple, TupleHash>>;
    bool negatives_absent(const Rule &rule, const std::vector<int64_t> &bindings) {
        for (const auto &atom : rule.negative) {
            Tuple key;
            for (const auto &term : atom.terms) {
                if (term.variable && bindings[term.id] < 0)
                    throw Error("TD_E_STRAT_UNSAFE: internal negative binding is absent");
                key.push_back(term.variable ? static_cast<Id>(bindings[term.id]) : term.id);
            }
            // Exact full-tuple anti-membership. The signed-SCC plan guarantees
            // this relation is complete at precisely this invocation's cut.
            charge();
            if (relations[atom.relation].seen.count(key)) return false;
        }
        return true;
    }
    // A variant chooses exactly one delta atom. Other atoms use the full relation.
    // The union of variants covers every body match containing a new tuple.
    void evaluate(const Rule &rule, size_t delta_atom, Pending &pending, uint64_t &pending_count) {
        std::vector<int64_t> bindings(rule.variables, -1);
        std::array<bool, MAX_BODY> used{};
        std::function<void(size_t)> join = [&](size_t depth) {
            if (depth == rule.body.size()) {
                // A partial filter is legal only on the complete relational
                // candidate, even when its inputs were bound earlier. Check it
                // before seen/pending head deduplication can hide a fault.
                if (!filters_match(rule, bindings)) return;
                if constexpr (Stratified) if (!negatives_absent(rule, bindings)) return;
                const auto output = project_head(rule, bindings);
                auto id = rule.head.relation;
                if (!relations[id].seen.count(output) && pending[id].insert(output).second) {
                    ++pending_count;
                    if (total_facts + pending_count > limits.max_facts)
                        throw Error("max_facts exceeded; no partial result returned");
                }
                return;
            }
            // Greedily choose the smallest available indexed candidate list.
            size_t chosen = rule.body.size(), estimate = std::numeric_limits<size_t>::max();
            const std::vector<size_t> *chosen_index = nullptr;
            for (size_t i = 0; i < rule.body.size(); ++i) {
                if (used[i]) continue;
                const auto &a = rule.body[i];
                auto &r = relations[a.relation];
                size_t n = i == delta_atom ? r.rows.size() - r.delta_begin : r.rows.size();
                const std::vector<size_t> *index = nullptr;
                for (size_t col = 0; col < a.terms.size(); ++col) {
                    const auto &t = a.terms[col];
                    int64_t value = t.variable ? bindings[t.id] : int64_t(t.id);
                    if (value < 0) continue;
                    auto candidates = r.lookup(col, static_cast<Id>(value));
                    if (!candidates) { n = 0; index = nullptr; break; }
                    if (candidates->size() < n) { n = candidates->size(); index = candidates; }
                }
                if (!n) return;
                if (n < estimate) { chosen = i; estimate = n; chosen_index = index; }
            }
            if (chosen == rule.body.size()) return;
            used[chosen] = true;
            const auto &a = rule.body[chosen];
            const auto &r = relations[a.relation];
            auto match = [&](size_t row_id) {
                if (chosen == delta_atom && row_id < r.delta_begin) return;
                charge();
                const auto &tuple = r.rows[row_id];
                std::array<Id, MAX_ARITY> newly_bound{};
                size_t new_count = 0;
                bool matches = true;
                for (size_t col = 0; col < a.terms.size(); ++col) {
                    const auto &t = a.terms[col];
                    if (!t.variable) { if (t.id != tuple[col]) { matches = false; break; } }
                    else if (bindings[t.id] < 0) {
                        bindings[t.id] = tuple[col]; newly_bound[new_count++] = t.id;
                    } else if (bindings[t.id] != tuple[col]) { matches = false; break; }
                }
                if (matches) join(depth + 1);
                for (size_t j = 0; j < new_count; ++j) bindings[newly_bound[j]] = -1;
            };
            if (chosen_index) for (auto row_id : *chosen_index) match(row_id);
            else {
                size_t begin = chosen == delta_atom ? r.delta_begin : 0;
                for (size_t i = begin; i < r.rows.size(); ++i) match(i);
            }
            used[chosen] = false;
        };
        join(0);
    }
    // Compare interned values without decoding/copying strings on every
    // grouping or extremum comparison. Identity remains exact and tag-local.
    int compare_ids(Id left, Id right) const {
        const auto &a = dictionary.entries[left], &b = dictionary.entries[right];
        if (a.tag != b.tag) return a.tag < b.tag ? -1 : 1;
        switch (a.tag) {
        case ValueTag::Reference: case ValueTag::Json: case ValueTag::Blob:
        case ValueTag::String: {
            const auto &x = *a.value.s, &y = *b.value.s;
            const auto n = std::min(x.size(), y.size());
            const auto cmp = std::memcmp(x.data(), y.data(), n);
            if (cmp) return cmp < 0 ? -1 : 1;
            return (x.size() > y.size()) - (x.size() < y.size());
        }
        case ValueTag::Boolean: return int(a.value.b) - int(b.value.b);
        case ValueTag::Int64: return (a.value.i > b.value.i) - (a.value.i < b.value.i);
        case ValueTag::DateTime:
        case ValueTag::Float64: {
            const auto x = detail::ordered_float_bits(a.value.f), y = detail::ordered_float_bits(b.value.f);
            return (x > y) - (x < y);
        }
        }
        throw Error("TD_E_VALUE_TAG: unsupported interned aggregate value");
    }
    bool tuple_less(const Tuple &a, const Tuple &b) const {
        const auto n = std::min(a.size(), b.size());
        for (size_t i = 0; i < n; ++i) {
            const auto cmp = compare_ids(a[i], b[i]);
            if (cmp) return cmp < 0;
        }
        return a.size() < b.size();
    }
    struct WideSum {
        // Separate positive/negative two-limb magnitudes avoid nonportable
        // integer extensions and any signed-prefix overflow. The input bound
        // is <=100000 tuples, so neither magnitude can reach 2^128.
        uint64_t positive_low = 0, positive_high = 0;
        uint64_t negative_low = 0, negative_high = 0;
        static void magnitude_add(uint64_t &low, uint64_t &high, uint64_t value) {
            const auto old = low; low += value;
            if (low < old) ++high;
        }
        void add(int64_t value) {
            if (value >= 0) magnitude_add(positive_low, positive_high, static_cast<uint64_t>(value));
            else magnitude_add(negative_low, negative_high, static_cast<uint64_t>(-(value + 1)) + 1);
        }
        int64_t finish() const {
            const bool nonnegative = positive_high > negative_high ||
                (positive_high == negative_high && positive_low >= negative_low);
            const auto large_low = nonnegative ? positive_low : negative_low;
            const auto small_low = nonnegative ? negative_low : positive_low;
            const auto low = large_low - small_low;
            const auto high = (nonnegative ? positive_high - negative_high : negative_high - positive_high)
                - static_cast<uint64_t>(large_low < small_low);
            const auto negative_limit = uint64_t(1) << 63;
            const auto limit = nonnegative ? static_cast<uint64_t>(std::numeric_limits<int64_t>::max()) : negative_limit;
            if (high || low > limit)
                throw Error("TD_E_AGG_SUM_RANGE: final sum_i64 is outside signed int64 range");
            if (nonnegative) return static_cast<int64_t>(low);
            if (low == negative_limit) return std::numeric_limits<int64_t>::min();
            return -static_cast<int64_t>(low);
        }
    };
    void complete_aggregate(const Rule &rule) {
        const auto &spec = rule.aggregate;
        const auto &source = relations[rule.body[0].relation];
        struct Group {
            Tuple key;
            uint64_t count = 0;
            uint16_t tags = 0;
            Id best = 0;
            bool has_best = false;
            WideSum sum;
        };
        std::vector<Group> groups;
        std::unordered_map<Tuple, size_t, TupleHash> group_ids;
        auto group_key = [&](const Tuple &row) {
            Tuple key;
            for (const auto column : spec.key_columns) key.push_back(row[column]);
            return key;
        };
        // The zero-key form is explicitly global. Only it has an empty-input
        // group; keyed forms contain observed groups only.
        const bool global = spec.key_columns.empty();
        if (global) {
            groups.emplace_back();
        }
        for (const auto &row : source.rows) {
            charge();
            size_t group_id = 0;
            if (!global) {
                const auto key = group_key(row);
                const auto inserted = group_ids.emplace(key, groups.size());
                if (inserted.second) { groups.emplace_back(); groups.back().key = key; }
                group_id = inserted.first->second;
            }
            auto &group = groups[group_id];
            ++group.count;
            if (spec.kind != AggregateKind::Count)
                group.tags |= uint16_t(1u << static_cast<unsigned>(dictionary.entries[row[spec.measure_column]].tag));
        }
        std::vector<size_t> ordered(groups.size());
        std::iota(ordered.begin(), ordered.end(), size_t(0));
        std::sort(ordered.begin(), ordered.end(), [&](size_t a, size_t b) {
            return tuple_less(groups[a].key, groups[b].key);
        });
        // Check EVERY canonical group before any range finalization. A bad tag
        // in a later group therefore wins over an earlier group's overflow.
        for (const auto i : ordered) if (spec.kind != AggregateKind::Count) {
            charge();
            const auto tags = groups[i].tags;
            const auto integer = uint16_t(1u << static_cast<unsigned>(ValueTag::Int64));
            const auto boolean = uint16_t(1u << static_cast<unsigned>(ValueTag::Boolean));
            const auto reference = uint16_t(1u << static_cast<unsigned>(ValueTag::Reference));
            const auto json = uint16_t(1u << static_cast<unsigned>(ValueTag::Json));
            const auto blob = uint16_t(1u << static_cast<unsigned>(ValueTag::Blob));
            if (spec.kind == AggregateKind::SumI64) {
                if (tags & uint16_t(~integer))
                    throw Error("TD_E_AGG_MEASURE_TAG: sum_i64 requires only int64 measures");
            } else {
                if (tags & boolean)
                    throw Error("TD_E_AGG_MEASURE_TAG: min/max do not accept boolean measures");
                if (tags & reference)
                    throw Error("TD_E_AGG_MEASURE_TAG: min/max do not accept reference measures");
                if (tags & json)
                    throw Error("TD_E_AGG_MEASURE_TAG: min/max do not accept JSON measures");
                if (tags & blob)
                    throw Error("TD_E_AGG_MEASURE_TAG: min/max do not accept blob measures");
                if (tags && (tags & uint16_t(tags - 1)))
                    throw Error("TD_E_AGG_MIXED_TAGS: min/max group has multiple measure tags");
            }
        }
        if (spec.kind != AggregateKind::Count) for (const auto &row : source.rows) {
            charge();
            auto &group = groups[global ? 0 : group_ids.at(group_key(row))];
            const auto value = row[spec.measure_column];
            if (spec.kind == AggregateKind::SumI64) group.sum.add(dictionary.entries[value].value.i);
            else if (!group.has_best || (spec.kind == AggregateKind::Min ?
                    compare_ids(value, group.best) < 0 : compare_ids(value, group.best) > 0)) {
                group.best = value; group.has_best = true;
            }
        }
        for (const auto i : ordered) {
            charge();
            const auto &group = groups[i];
            Id value;
            if (spec.kind == AggregateKind::Count)
                value = dictionary.intern_value(Value::i64(static_cast<int64_t>(group.count)));
            else if (spec.kind == AggregateKind::SumI64)
                value = dictionary.intern_value(Value::i64(group.sum.finish()));
            else {
                if (!group.has_best) continue; // Empty-global min/max has no tuple.
                value = group.best;
            }
            auto output = group.key; output.push_back(value);
            add_known(rule.head.relation, output);
        }
    }
    void next_round() {
        if (limits.poll) limits.poll();
        if (rounds >= limits.max_rounds) throw Error("max_rounds exceeded; no partial result returned");
        ++rounds;
    }
    void run_completed() {
        for (const auto component : component_order) {
            std::vector<size_t> selected;
            bool recursive = false;
            for (size_t i = 0; i < rules.size(); ++i) if (component_of[rules[i].head.relation] == component) {
                selected.push_back(i);
                for (const auto &atom : rules[i].body)
                    if (component_of[atom.relation] == component) recursive = true;
            }
            if (selected.empty()) continue; // Read-only triple component.
            if (rules[selected[0]].aggregate.kind != AggregateKind::None) {
                next_round(); complete_aggregate(rules[selected[0]]); continue;
            }
            auto publish = [&](Pending &pending) {
                for (const auto id : components[component]) {
                    relations[id].delta_begin = relations[id].rows.size();
                    for (const auto &tuple : pending[id]) add_known(id, tuple);
                }
            };
            // One full seed pass sees only completed external relations and
            // the component's current facts. New component facts are batched.
            next_round();
            Pending seed(relations.size()); uint64_t seed_count = 0;
            for (const auto i : selected) evaluate(rules[i], rules[i].body.size(), seed, seed_count);
            publish(seed);
            if (!recursive) continue;
            for (;;) {
                bool delta = false;
                for (const auto id : components[component])
                    if (relations[id].delta_begin < relations[id].rows.size()) delta = true;
                if (!delta) break;
                next_round();
                Pending pending(relations.size()); uint64_t pending_count = 0;
                for (const auto i : selected) {
                    const auto &rule = rules[i];
                    // Only in-component positive atoms can be fresh. External
                    // positives and every negative remain completed read-only.
                    for (size_t a = 0; a < rule.body.size(); ++a) {
                        const auto id = rule.body[a].relation;
                        if (component_of[id] == component && relations[id].delta_begin < relations[id].rows.size())
                            evaluate(rule, a, pending, pending_count);
                    }
                }
                publish(pending);
            }
        }
    }
    typename Domain::ResultType run() {
        if (limits.poll) limits.poll();
        if constexpr (Domain::typed) detail::require_float_environment();
        if (has_run) throw Error("engine may only be run once");
        has_run = true;
#if TD_EVALUATOR_PROFILE
        const auto profile=limits.evaluator_timing;
        using ProfileClock=evaluator_profile::Clock;
        const auto evaluation_started=profile?ProfileClock::now():ProfileClock::time_point{};
#endif
        if constexpr (Stratified) run_completed();
        else {
        for (const auto &rule : rules) if (rule.body.empty()) {
            if (!filters_match(rule, {})) continue;
            Tuple tuple; for (const auto &t : rule.head.terms) tuple.push_back(t.id);
            add_known(rule.head.relation, tuple);
        }
        for (;;) {
            bool any_delta = false;
            for (const auto &r : relations) if (r.delta_begin < r.rows.size()) any_delta = true;
            if (!any_delta) break;
            if (rounds >= limits.max_rounds) throw Error("max_rounds exceeded; no partial result returned");
            ++rounds;
            Pending pending(relations.size());
            uint64_t pending_count = 0;
            for (const auto &rule : rules) {
                for (size_t i = 0; i < rule.body.size(); ++i) {
                    const auto &r = relations[rule.body[i].relation];
                    if (r.delta_begin < r.rows.size()) evaluate(rule, i, pending, pending_count);
                }
            }
            for (size_t i = 0; i < relations.size(); ++i) {
                relations[i].delta_begin = relations[i].rows.size();
                for (const auto &tuple : pending[i]) add_known(i, tuple);
            }
        }
        }
#if TD_EVALUATOR_PROFILE
        if (profile) profile->fixed_point_ns=evaluator_profile::elapsed_ns(evaluation_started);
        const auto materialization_started=profile?ProfileClock::now():ProfileClock::time_point{};
#endif
        typename Domain::ResultType result;
        result.rounds = rounds;
        result.derived_facts = total_facts - relations[0].rows.size();
        result.work = work;
        const auto &answer = relations[relation_ids.at("answer")];
        size_t output_bytes = 0;
        result.rows.reserve(answer.rows.size());
        auto charge_output = [&](size_t bytes) {
            if (bytes > MAX_OUTPUT_BYTES - output_bytes)
                throw Error("output exceeds 16MiB; no partial result returned");
            output_bytes += bytes;
        };
        for (const auto &tuple : answer.rows) {
            if (limits.poll) limits.poll();
            charge_output(Domain::output_row_bytes(tuple.size()));
            std::vector<typename Domain::Output> row; row.reserve(tuple.size());
            for (auto id : tuple) {
                charge_output(dictionary.output_extra_bytes(id));
                row.push_back(dictionary.decode(id));
            }
            result.rows.push_back(std::move(row));
        }
        Domain::sort(result, limits.poll);
#if TD_EVALUATOR_PROFILE
        if (profile) profile->materialize_answer_ns=evaluator_profile::elapsed_ns(materialization_started);
#endif
        return result;
    }
};
struct Engine::Impl : Core<detail::LegacyDomain> { using Core::Core; };
struct TypedEngine::Impl : Core<detail::TypedDomain> { using Core::Core; };
struct StratifiedEngine::Impl : Core<detail::TypedDomain, true> { using Core::Core; };

ProgramIR compile_program_ir_v1(const std::string &program) {
    // The very same constructor parses and validates the original program.
    // No add_triple/run call is made: partial expression effects remain opaque.
    Core<detail::TypedDomain> parsed(program, 0, 0, {});
    ProgramIR result;
    result.relations.reserve(parsed.relations.size());
    for (size_t i = 0; i < parsed.relations.size(); ++i) {
        const auto &relation = parsed.relations[i];
        result.relations.push_back({static_cast<uint32_t>(i), relation.name,
            static_cast<uint32_t>(relation.arity), i == 0});
    }
    auto own_atom = [&](const Atom &atom) {
        PlanAtom owned{static_cast<uint32_t>(atom.relation), {}};
        // Fill final known-alternative slots without temporary whole terms.
        owned.terms.resize(atom.terms.size());
        for (size_t t = 0; t < atom.terms.size(); ++t) {
            const auto &term = atom.terms[t];
            auto &value = owned.terms[t].value;
            if (term.variable) value.emplace<0>(term.id);
            else value.emplace<1>(parsed.dictionary.decode(term.id));
        }
        return owned;
    };
    result.rules.reserve(parsed.rules.size());
    for (size_t i = 0; i < parsed.rules.size(); ++i) {
        const auto &rule = parsed.rules[i];
        PlanRule owned{static_cast<uint32_t>(i), static_cast<uint32_t>(rule.variables),
            own_atom(rule.head), {}, static_cast<uint32_t>(rule.filters.size())};
        owned.body.reserve(rule.body.size());
        for (const auto &atom : rule.body) owned.body.push_back(own_atom(atom));
        if (rule.body.empty() && rule.filters.empty()) {
            PlanFact fact{static_cast<uint32_t>(rule.head.relation), {}};
            fact.values.reserve(rule.head.terms.size());
            for (const auto &term : rule.head.terms)
                fact.values.push_back(parsed.dictionary.decode(term.id));
            result.facts.push_back(std::move(fact));
        }
        result.rules.push_back(std::move(owned));
    }
    result.answer_relation = static_cast<uint32_t>(parsed.relation_ids.at("answer"));
    // Export exact parameters of the existing core, not estimates/observations.
    result.budget_model = {MAX_PROGRAM, MAX_TERM, MAX_INPUT_ROWS, MAX_RULES,
        MAX_RELATIONS, MAX_BODY, MAX_VARIABLES, MAX_ARITY, 100000, 2000, 50000000,
        MAX_OUTPUT_BYTES, detail::MAX_DICTIONARY_BYTES, detail::MAX_DICTIONARY_VALUES,
        sizeof(detail::TypedDomain::Entry), {}};
    for (size_t arity = 0; arity <= MAX_ARITY; ++arity)
        result.budget_model.typed_output_row_bytes[arity] =
            detail::TypedDomain::output_row_bytes(arity);
    detail::require_float_environment();
    return result;
}

ProgramIRV2 compile_program_ir_v2(const std::string &program, bool include_simple_comparisons, ValueProfile profile) {
    // This constructor is the authoritative whole-program parser/validator.
    // In particular, it plans ALL signed SCCs; no add_triple/run/evaluation
    // call occurs, and returned values outlive this private dictionary.
    Limits limits;
    limits.values = profile;
    Core<detail::TypedDomain, true> parsed(program, 0, 0, limits);
    ProgramIRV2 result;
    result.relations.reserve(parsed.relations.size());
    for (size_t i = 0; i < parsed.relations.size(); ++i) {
        const auto &relation = parsed.relations[i];
        result.relations.push_back({static_cast<uint32_t>(i), relation.name,
            static_cast<uint32_t>(relation.arity), i == 0});
    }
    auto own_atom = [&](const Atom &atom) {
        PlanAtom owned{static_cast<uint32_t>(atom.relation), {}};
        // Start with final slots, each holding the safe uint32_t alternative.
        // Emplace the selected payload there, not a temporary whole variant.
        owned.terms.resize(atom.terms.size());
        for (size_t t = 0; t < atom.terms.size(); ++t) {
            const auto &term = atom.terms[t];
            auto &value = owned.terms[t].value;
            if (term.variable) value.emplace<0>(term.id);
            else value.emplace<1>(parsed.dictionary.decode(term.id));
        }
        return owned;
    };
    auto aggregate_op = [](AggregateKind kind) {
        switch (kind) {
        case AggregateKind::Count: return PlanAggregateOpV2::Count;
        case AggregateKind::Min: return PlanAggregateOpV2::Min;
        case AggregateKind::Max: return PlanAggregateOpV2::Max;
        case AggregateKind::SumI64: return PlanAggregateOpV2::SumI64;
        case AggregateKind::None: break;
        }
        throw Error("TD_E_PLAN_IR_INTERNAL: ordinary rule has no aggregate output");
    };
    const auto comparison_op = [](detail::ExprOp op) -> std::optional<PlanComparisonOpV2> {
        switch (op) {
        case detail::ExprOp::Equal: return PlanComparisonOpV2::Equal;
        case detail::ExprOp::NotEqual: return PlanComparisonOpV2::NotEqual;
        case detail::ExprOp::Less: return PlanComparisonOpV2::Less;
        case detail::ExprOp::LessEqual: return PlanComparisonOpV2::LessEqual;
        case detail::ExprOp::Greater: return PlanComparisonOpV2::Greater;
        case detail::ExprOp::GreaterEqual: return PlanComparisonOpV2::GreaterEqual;
        default: return std::nullopt;
        }
    };
    const auto is_leaf = [](const detail::ExprNode &node) {
        return node.op == detail::ExprOp::Variable || node.op == detail::ExprOp::Literal;
    };
    const auto own_leaf = [&](const detail::ExprNode &node) {
        PlanTerm owned{};
        if (node.op == detail::ExprOp::Variable) owned.value.emplace<0>(node.operand);
        else owned.value.emplace<1>(parsed.dictionary.decode(node.operand));
        return owned;
    };
    result.rules.reserve(parsed.rules.size());
    for (size_t i = 0; i < parsed.rules.size(); ++i) {
        const auto &rule = parsed.rules[i];
        const bool aggregate = rule.aggregate.kind != AggregateKind::None;
        PlanRuleV2 owned{static_cast<uint32_t>(i), static_cast<uint32_t>(rule.variables),
            {static_cast<uint32_t>(rule.head.relation), {}}, {}, {},
            static_cast<uint32_t>(rule.filters.size()), static_cast<uint32_t>(rule.expression_nodes), {}};
        if (include_simple_comparisons) {
            for (const auto &filter : rule.filters) {
                if (profile == ValueProfile::AllValues && filter.code.size() == 4 &&
                    filter.code[0].op == detail::ExprOp::Variable && filter.code[1].op == detail::ExprOp::RefId &&
                    filter.code[2].op == detail::ExprOp::Variable && filter.code[3].op == detail::ExprOp::Equal) {
                    owned.reference_join = PlanReferenceJoinV2{filter.code[0].operand, filter.code[2].operand};
                    continue;
                }
                if (filter.code.size() != 3 || !is_leaf(filter.code[0]) || !is_leaf(filter.code[1])) continue;
                if (const auto op = comparison_op(filter.code[2].op))
                    owned.simple_comparisons.push_back({*op, own_leaf(filter.code[0]), own_leaf(filter.code[1])});
            }
        }
        owned.head.terms.resize(rule.head.terms.size());
        auto projection = rule.projections.begin();
        for (size_t t = 0; t < rule.head.terms.size(); ++t) {
            auto &value = owned.head.terms[t].value;
            if (projection != rule.projections.end() && projection->column == t) {
                const auto nodes = static_cast<uint32_t>(projection++->expression.code.size());
                value.emplace<PlanComputedOutputV2>(PlanComputedOutputV2{nodes});
                owned.filter_expression_nodes -= nodes;
                continue;
            }
            if (aggregate && t + 1 == rule.head.terms.size()) {
                auto &output = value.emplace<2>(PlanAggregateOutputV2{aggregate_op(rule.aggregate.kind),
                    static_cast<uint32_t>(rule.body[0].relation), {}, std::nullopt});
                for (const auto column : rule.aggregate.key_columns)
                    output.key_columns.push_back(static_cast<uint32_t>(column));
                if (rule.aggregate.kind != AggregateKind::Count)
                    output.measure_column = static_cast<uint32_t>(rule.aggregate.measure_column);
                // Never look at, decode or export the private head sentinel.
                continue;
            }
            const auto &term = rule.head.terms[t];
            if (term.variable) value.emplace<0>(term.id);
            else value.emplace<1>(parsed.dictionary.decode(term.id));
        }
        owned.positive_body.reserve(rule.body.size());
        for (size_t a = 0; a < rule.body.size(); ++a) {
            const auto &atom = rule.body[a];
            owned.positive_body.push_back(own_atom(atom));
            result.dependencies.push_back({static_cast<uint32_t>(i), static_cast<uint32_t>(a),
                static_cast<uint32_t>(atom.relation), static_cast<uint32_t>(rule.head.relation),
                aggregate ? PlanDependencyKindV2::Aggregate : PlanDependencyKindV2::Positive});
        }
        owned.negative_body.reserve(rule.negative.size());
        for (size_t a = 0; a < rule.negative.size(); ++a) {
            const auto &atom = rule.negative[a];
            owned.negative_body.push_back(own_atom(atom));
            result.dependencies.push_back({static_cast<uint32_t>(i), static_cast<uint32_t>(a),
                static_cast<uint32_t>(atom.relation), static_cast<uint32_t>(rule.head.relation),
                PlanDependencyKindV2::Negative});
        }
        if (!aggregate && rule.body.empty() && rule.negative.empty() && rule.filters.empty() && rule.projections.empty()) {
            PlanFactV2 fact{static_cast<uint32_t>(i), {static_cast<uint32_t>(rule.head.relation), {}}};
            fact.fact.values.reserve(rule.head.terms.size());
            for (const auto &term : rule.head.terms) {
                if (term.variable) throw Error("TD_E_PLAN_IR_INTERNAL: unconditional fact is not ground");
                fact.fact.values.push_back(parsed.dictionary.decode(term.id));
            }
            result.facts.push_back(std::move(fact));
        }
        result.rules.push_back(std::move(owned));
    }
    result.components.reserve(parsed.components.size());
    for (size_t c = 0; c < parsed.components.size(); ++c) {
        PlanComponentV2 component{static_cast<uint32_t>(c), PlanComponentKindV2::Ordinary, {}, {}};
        for (const auto id : parsed.components[c]) {
            component.relations.push_back(static_cast<uint32_t>(id));
            if (id == 0) component.kind = PlanComponentKindV2::Base;
        }
        for (size_t r = 0; r < parsed.rules.size(); ++r)
            if (parsed.component_of[parsed.rules[r].head.relation] == c) {
                component.rules.push_back(static_cast<uint32_t>(r));
                if (parsed.rules[r].aggregate.kind != AggregateKind::None)
                    component.kind = PlanComponentKindV2::Aggregate;
            }
        result.components.push_back(std::move(component));
    }
    for (const auto component : parsed.component_order)
        result.schedule.push_back(static_cast<uint32_t>(component));
    result.answer_relation = static_cast<uint32_t>(parsed.relation_ids.at("answer"));
    result.budget_model = {MAX_PROGRAM, MAX_TERM, MAX_INPUT_ROWS, MAX_RULES,
        MAX_RELATIONS, MAX_BODY, MAX_VARIABLES, MAX_ARITY, 100000, 2000, 50000000,
        MAX_OUTPUT_BYTES, detail::MAX_DICTIONARY_BYTES, detail::MAX_DICTIONARY_VALUES,
        sizeof(detail::TypedDomain::Entry), {}};
    for (size_t arity = 0; arity <= MAX_ARITY; ++arity)
        result.budget_model.typed_output_row_bytes[arity] = detail::TypedDomain::output_row_bytes(arity);
    result.expression_budget = {detail::MAX_FILTERS, detail::MAX_RULE_EXPRESSION_NODES,
        detail::MAX_PROGRAM_EXPRESSION_NODES, detail::MAX_EXPRESSION_HEIGHT, detail::MAX_EXPRESSION_NESTING};
    detail::require_float_environment();
    return result;
}

namespace {
void json_string(std::string &out, const std::string &text) {
    constexpr char hex[] = "0123456789abcdef";
    out.push_back('"');
    for (const auto raw : text) {
        const auto ch = static_cast<unsigned char>(raw);
        if (ch == '"' || ch == '\\') { out.push_back('\\'); out.push_back(static_cast<char>(ch)); }
        else if (ch < 0x20) {
            out += "\\u00"; out.push_back(hex[ch >> 4]); out.push_back(hex[ch & 15]);
        } else out.push_back(static_cast<char>(ch));
    }
    out.push_back('"');
}
void json_value(std::string &out, const Value &value) {
    switch (value.tag()) {
    case ValueTag::String:
        out += "{\"t\":\"str\",\"v\":"; json_string(out, value.as_str()); break;
    case ValueTag::Boolean:
        out += value.as_bool() ? "{\"t\":\"bool\",\"v\":true" : "{\"t\":\"bool\",\"v\":false"; break;
    case ValueTag::Int64:
        out += "{\"t\":\"i64\",\"v\":"; json_string(out, std::to_string(value.as_i64())); break;
    case ValueTag::Float64: {
        constexpr char hex[] = "0123456789abcdef";
        const auto bits = detail::canonical_float_bits(detail::float_bits(value.as_f64()));
        if (!detail::finite_float_bits(bits)) throw Error("TD_E_VALUE_PAYLOAD: IR float64 must be finite");
        out += "{\"t\":\"f64\",\"v\":\"";
        for (int shift = 60; shift >= 0; shift -= 4) out.push_back(hex[(bits >> shift) & 15]);
        out.push_back('"'); break;
    }
    default: throw Error("TD_E_VALUE_TAG: unsupported IR value");
    }
    out.push_back('}');
}
void json_atom(std::string &out, const PlanAtom &atom) {
    out += "{\"relation\":" + std::to_string(atom.relation) + ",\"terms\":[";
    bool first = true;
    for (const auto &term : atom.terms) {
        if (!first) out.push_back(',');
        first = false;
        if (const auto *variable = std::get_if<uint32_t>(&term.value))
            out += "{\"var\":" + std::to_string(*variable) + "}";
        else { out += "{\"const\":"; json_value(out, std::get<Value>(term.value)); out.push_back('}'); }
    }
    out += "]}";
}
}

std::string program_ir_json_v1(const ProgramIR &program) {
    detail::require_float_environment();
    std::string out = "{\"schema\":\"td.program_ir/1\",\"language\":\"td.typed/0.3\",\"relations\":[";
    bool first = true;
    for (const auto &relation : program.relations) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"id\":" + std::to_string(relation.id) + ",\"name\":";
        json_string(out, relation.name);
        out += ",\"arity\":" + std::to_string(relation.arity) + ",\"edb\":" +
            (relation.edb ? "true}" : "false}");
    }
    out += "],\"facts\":["; first = true;
    for (const auto &fact : program.facts) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"relation\":" + std::to_string(fact.relation) + ",\"values\":[";
        bool first_value = true;
        for (const auto &value : fact.values) {
            if (!first_value) out.push_back(',');
            first_value = false; json_value(out, value);
        }
        out += "]}";
    }
    out += "],\"rules\":["; first = true;
    for (const auto &rule : program.rules) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"id\":" + std::to_string(rule.id) + ",\"variable_count\":" +
            std::to_string(rule.variable_count) + ",\"head\":";
        json_atom(out, rule.head);
        out += ",\"body\":[";
        bool first_atom = true;
        for (const auto &atom : rule.body) {
            if (!first_atom) out.push_back(',');
            first_atom = false; json_atom(out, atom);
        }
        out += "],\"filter_count\":" + std::to_string(rule.filter_count) + "}";
    }
    out += "],\"answer_relation\":" + std::to_string(program.answer_relation) +
        ",\"budget_model\":{\"schema\":\"td.native_budget/1\"";
    const auto &b = program.budget_model;
    auto number = [&](const char *name, uint64_t value) {
        out += ",\""; out += name; out += "\":" + std::to_string(value);
    };
    number("max_program_bytes", b.max_program_bytes); number("max_term_bytes", b.max_term_bytes);
    number("max_input_rows", b.max_input_rows); number("max_rules", b.max_rules);
    number("max_relations", b.max_relations); number("max_body_atoms", b.max_body_atoms);
    number("max_variables", b.max_variables); number("max_arity", b.max_arity);
    number("max_facts", b.max_facts); number("max_rounds", b.max_rounds); number("max_work", b.max_work);
    number("max_output_bytes", b.max_output_bytes); number("max_dictionary_bytes", b.max_dictionary_bytes);
    number("max_dictionary_values", b.max_dictionary_values); number("dictionary_entry_bytes", b.dictionary_entry_bytes);
    out += ",\"typed_output_row_bytes\":[";
    for (size_t arity = 0; arity < b.typed_output_row_bytes.size(); ++arity) {
        if (arity) out.push_back(',');
        out += std::to_string(b.typed_output_row_bytes[arity]);
    }
    out += "],\"typed_output_string_extra\":\"utf8_bytes\"}}";
    detail::require_float_environment();
    return out;
}

namespace {
void json_indices_v2(std::string &out, const std::vector<uint32_t> &values) {
    out.push_back('[');
    bool first = true;
    for (const auto value : values) {
        if (!first) out.push_back(',');
        first = false; out += std::to_string(value);
    }
    out.push_back(']');
}
const char *aggregate_name_v2(PlanAggregateOpV2 op) {
    switch (op) {
    case PlanAggregateOpV2::Count: return "count";
    case PlanAggregateOpV2::Min: return "min";
    case PlanAggregateOpV2::Max: return "max";
    case PlanAggregateOpV2::SumI64: return "sum_i64";
    }
    throw Error("TD_E_PLAN_IR_INTERNAL: invalid aggregate opcode");
}
const char *dependency_name_v2(PlanDependencyKindV2 kind) {
    switch (kind) {
    case PlanDependencyKindV2::Positive: return "positive";
    case PlanDependencyKindV2::Negative: return "negative";
    case PlanDependencyKindV2::Aggregate: return "aggregate";
    }
    throw Error("TD_E_PLAN_IR_INTERNAL: invalid dependency kind");
}
const char *component_name_v2(PlanComponentKindV2 kind) {
    switch (kind) {
    case PlanComponentKindV2::Base: return "base";
    case PlanComponentKindV2::Ordinary: return "ordinary";
    case PlanComponentKindV2::Aggregate: return "aggregate";
    }
    throw Error("TD_E_PLAN_IR_INTERNAL: invalid component kind");
}
void json_head_v2(std::string &out, const PlanHeadV2 &head) {
    out += "{\"relation\":" + std::to_string(head.relation) + ",\"terms\":[";
    bool first = true;
    for (const auto &term : head.terms) {
        if (!first) out.push_back(',');
        first = false;
        if (const auto *variable = std::get_if<uint32_t>(&term.value))
            out += "{\"var\":" + std::to_string(*variable) + "}";
        else if (const auto *constant = std::get_if<Value>(&term.value)) {
            out += "{\"const\":"; json_value(out, *constant); out.push_back('}');
        } else if (const auto *computed = std::get_if<PlanComputedOutputV2>(&term.value)) {
            out += "{\"computed_output\":{\"expression\":\"opaque\",\"nodes\":" +
                std::to_string(computed->expression_nodes) + "}}";
        } else {
            const auto &aggregate = std::get<PlanAggregateOutputV2>(term.value);
            out += "{\"aggregate_output\":{\"op\":"; json_string(out, aggregate_name_v2(aggregate.op));
            out += ",\"source_relation\":" + std::to_string(aggregate.source_relation) + ",\"key_columns\":";
            json_indices_v2(out, aggregate.key_columns);
            out += ",\"measure_column\":";
            if (aggregate.measure_column) out += std::to_string(*aggregate.measure_column);
            else out += "null";
            out += "}}";
        }
    }
    out += "]}";
}
}

std::string program_ir_json_v2(const ProgramIRV2 &program) {
    detail::require_float_environment();
    std::string out = "{\"schema\":\"td.program_ir/2\",\"language\":\"td.stratified/1\",\"inspection_only\":true,\"relations\":[";
    bool first = true;
    for (const auto &relation : program.relations) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"id\":" + std::to_string(relation.id) + ",\"name\":"; json_string(out, relation.name);
        out += ",\"arity\":" + std::to_string(relation.arity) + ",\"edb\":" + (relation.edb ? "true}" : "false}");
    }
    out += "],\"facts\":["; first = true;
    for (const auto &entry : program.facts) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"rule\":" + std::to_string(entry.rule) + ",\"relation\":" +
            std::to_string(entry.fact.relation) + ",\"values\":[";
        bool first_value = true;
        for (const auto &value : entry.fact.values) {
            if (!first_value) out.push_back(',');
            first_value = false; json_value(out, value);
        }
        out += "]}";
    }
    out += "],\"rules\":["; first = true;
    for (const auto &rule : program.rules) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"id\":" + std::to_string(rule.id) + ",\"variable_count\":" +
            std::to_string(rule.variable_count) + ",\"head\":";
        json_head_v2(out, rule.head);
        out += ",\"positive_body\":[";
        bool first_atom = true;
        for (const auto &atom : rule.positive_body) {
            if (!first_atom) out.push_back(',');
            first_atom = false; json_atom(out, atom);
        }
        out += "],\"negative_body\":["; first_atom = true;
        for (const auto &atom : rule.negative_body) {
            if (!first_atom) out.push_back(',');
            first_atom = false; json_atom(out, atom);
        }
        out += "],\"filter_count\":" + std::to_string(rule.filter_count) +
            ",\"filter_expression_nodes\":" + std::to_string(rule.filter_expression_nodes) +
            ",\"effects\":{\"filter_ast\":\"opaque\",\"filter_stage\":\"complete_positive_candidate\"," +
            "\"eager_filters\":true,\"filters_before_negative\":true,\"filters_before_head_dedup\":true,\"filters_may_error\":";
        out += (rule.filter_count ? "true}}" : "false}}");
    }
    out += "],\"dependencies\":["; first = true;
    for (const auto &edge : program.dependencies) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"rule\":" + std::to_string(edge.rule) + ",\"atom_index\":" + std::to_string(edge.atom_index) +
            ",\"source_relation\":" + std::to_string(edge.source_relation) +
            ",\"target_relation\":" + std::to_string(edge.target_relation) + ",\"kind\":";
        json_string(out, dependency_name_v2(edge.kind));
        out += (edge.kind == PlanDependencyKindV2::Positive ? ",\"strict\":false}" : ",\"strict\":true}");
    }
    out += "],\"components\":["; first = true;
    for (const auto &component : program.components) {
        if (!first) out.push_back(',');
        first = false;
        out += "{\"id\":" + std::to_string(component.id) + ",\"kind\":";
        json_string(out, component_name_v2(component.kind));
        out += ",\"relations\":"; json_indices_v2(out, component.relations);
        out += ",\"rules\":"; json_indices_v2(out, component.rules); out.push_back('}');
    }
    out += "],\"schedule_order\":\"producer_first\",\"schedule\":"; json_indices_v2(out, program.schedule);
    out += ",\"answer_relation\":" + std::to_string(program.answer_relation) +
        ",\"budget_model\":{\"schema\":\"td.native_budget/1\"";
    const auto &b = program.budget_model;
    auto number = [&](const char *name, uint64_t value) {
        out += ",\""; out += name; out += "\":" + std::to_string(value);
    };
    number("max_program_bytes", b.max_program_bytes); number("max_term_bytes", b.max_term_bytes);
    number("max_input_rows", b.max_input_rows); number("max_rules", b.max_rules);
    number("max_relations", b.max_relations); number("max_body_atoms", b.max_body_atoms);
    number("max_variables", b.max_variables); number("max_arity", b.max_arity);
    number("max_facts", b.max_facts); number("max_rounds", b.max_rounds); number("max_work", b.max_work);
    number("max_output_bytes", b.max_output_bytes); number("max_dictionary_bytes", b.max_dictionary_bytes);
    number("max_dictionary_values", b.max_dictionary_values); number("dictionary_entry_bytes", b.dictionary_entry_bytes);
    out += ",\"typed_output_row_bytes\":[";
    for (size_t arity = 0; arity < b.typed_output_row_bytes.size(); ++arity) {
        if (arity) out.push_back(',');
        out += std::to_string(b.typed_output_row_bytes[arity]);
    }
    out += "],\"typed_output_string_extra\":\"utf8_bytes\",\"counter_model\":\"td.stratified_counters/1\"},\"expression_budget\":{";
    const auto &e = program.expression_budget;
    out += "\"max_filters\":" + std::to_string(e.max_filters) + ",\"max_rule_nodes\":" + std::to_string(e.max_rule_nodes) +
        ",\"max_program_nodes\":" + std::to_string(e.max_program_nodes) + ",\"max_height\":" + std::to_string(e.max_height) +
        ",\"max_nesting\":" + std::to_string(e.max_nesting) + "}}";
    if (out.size() > MAX_OUTPUT_BYTES)
        throw Error("TD_E_PLAN_IR_LIMIT: IR2 output exceeds 16MiB; no partial result returned");
    detail::require_float_environment();
    return out;
}

Value::Value(Payload payload) : payload_(std::move(payload)) {}
Value Value::str(std::string value) {
    detail::validate_typed_text(value);
    return Value(Payload(std::in_place_index<0>, std::move(value)));
}
Value Value::boolean(bool value) { return Value(Payload(std::in_place_index<1>, value)); }
Value Value::i64(int64_t value) { return Value(Payload(std::in_place_index<2>, value)); }
Value Value::f64(double value) {
    const auto bits = detail::float_bits(value);
    if (!detail::finite_float_bits(bits)) throw Error("TD_E_VALUE_PAYLOAD: float64 must be finite");
    return Value(Payload(std::in_place_index<3>, detail::bits_float(detail::canonical_float_bits(bits))));
}
Value Value::ref(std::string id) {
    detail::validate_typed_text(id);
    if (id.empty()) throw Error("TD_E_VALUE_PAYLOAD: reference ID must not be empty");
    return Value(Payload(std::in_place_index<4>, Reference{std::move(id)}));
}
Value Value::datetime(double epoch_millis) {
    const auto bits = detail::float_bits(epoch_millis);
    if (!detail::finite_float_bits(bits)) throw Error("TD_E_VALUE_PAYLOAD: datetime must be finite");
    return Value(Payload(std::in_place_index<5>, DateTime{detail::bits_float(detail::canonical_float_bits(bits))}));
}
Value Value::json(std::string source) {
    detail::validate_json_source(source);
    return Value(Payload(Json{std::move(source)}));
}
Value Value::blob(std::string id) {
    detail::validate_typed_text(id);
    if (id.empty()) throw Error("TD_E_VALUE_PAYLOAD: blob ID must not be empty");
    return Value(Payload(Blob{std::move(id)}));
}
ValueTag Value::tag() const noexcept {
    return payload_.valueless_by_exception() ? static_cast<ValueTag>(0) :
           static_cast<ValueTag>(payload_.index() + 1);
}
const std::string &Value::as_str() const {
    if (const auto *v = std::get_if<0>(&payload_)) return *v;
    throw Error("TD_E_VALUE_PAYLOAD: expected string");
}
bool Value::as_bool() const {
    if (const auto *v = std::get_if<1>(&payload_)) return *v;
    throw Error("TD_E_VALUE_PAYLOAD: expected boolean");
}
int64_t Value::as_i64() const {
    if (const auto *v = std::get_if<2>(&payload_)) return *v;
    throw Error("TD_E_VALUE_PAYLOAD: expected int64");
}
double Value::as_f64() const {
    if (const auto *v = std::get_if<3>(&payload_)) return *v;
    throw Error("TD_E_VALUE_PAYLOAD: expected float64");
}
const std::string &Value::as_ref() const {
    if (const auto *v = std::get_if<4>(&payload_)) return v->id;
    throw Error("TD_E_VALUE_PAYLOAD: expected reference");
}
double Value::as_datetime() const {
    if (const auto *v = std::get_if<5>(&payload_)) return v->epoch_millis;
    throw Error("TD_E_VALUE_PAYLOAD: expected datetime");
}
const std::string &Value::as_json() const {
    if (const auto *v = std::get_if<Json>(&payload_)) return v->source;
    throw Error("TD_E_VALUE_PAYLOAD: expected serialized JSON");
}
const std::string &Value::as_blob_id() const {
    if (const auto *v = std::get_if<Blob>(&payload_)) return v->id;
    throw Error("TD_E_VALUE_PAYLOAD: expected blob ID");
}
const std::string &Value::carrier_text() const {
    switch (tag()) {
    case ValueTag::String: return as_str();
    case ValueTag::Reference: return as_ref();
    case ValueTag::Json: return as_json();
    case ValueTag::Blob: return as_blob_id();
    default: throw Error("TD_E_VALUE_PAYLOAD: expected text carrier");
    }
}
bool Value::operator==(const Value &other) const {
    if (tag() != other.tag()) return false;
    switch (tag()) {
    case ValueTag::String: return as_str() == other.as_str();
    case ValueTag::Reference: return as_ref() == other.as_ref();
    case ValueTag::Json: return as_json() == other.as_json();
    case ValueTag::Blob: return as_blob_id() == other.as_blob_id();
    case ValueTag::Boolean: return as_bool() == other.as_bool();
    case ValueTag::Int64: return as_i64() == other.as_i64();
    case ValueTag::Float64:
        return detail::canonical_float_bits(detail::float_bits(as_f64())) ==
               detail::canonical_float_bits(detail::float_bits(other.as_f64()));
    case ValueTag::DateTime:
        return detail::float_bits(as_datetime()) == detail::float_bits(other.as_datetime());
    }
    return payload_.valueless_by_exception() && other.payload_.valueless_by_exception();
}
int compare_values(const Value &left, const Value &right) {
    const auto lt = left.tag(), rt = right.tag();
    if (lt != rt) return lt < rt ? -1 : 1;
    switch (lt) {
    case ValueTag::Reference: case ValueTag::Json: case ValueTag::Blob:
    case ValueTag::String: {
        const auto &a = left.carrier_text();
        const auto &b = right.carrier_text();
        const auto n = std::min(a.size(), b.size());
        const auto cmp = std::memcmp(a.data(), b.data(), n);
        if (cmp) return cmp < 0 ? -1 : 1;
        return (a.size() > b.size()) - (a.size() < b.size());
    }
    case ValueTag::Boolean: return int(left.as_bool()) - int(right.as_bool());
    case ValueTag::Int64: {
        const auto a = left.as_i64(), b = right.as_i64();
        return (a > b) - (a < b);
    }
    case ValueTag::DateTime:
    case ValueTag::Float64: {
        const auto a = detail::ordered_float_bits(detail::float_bits(lt == ValueTag::DateTime ? left.as_datetime() : left.as_f64()));
        const auto b = detail::ordered_float_bits(detail::float_bits(lt == ValueTag::DateTime ? right.as_datetime() : right.as_f64()));
        return (a > b) - (a < b);
    }
    }
    throw Error("TD_E_VALUE_TAG: unsupported typed value");
}
Engine::Engine(const std::string &program, int64_t valid_at, int64_t known_at, Limits limits)
    : impl(new Impl(program, valid_at, known_at, limits)) {}
Engine::~Engine() = default;
void Engine::add_triple(const std::string &e, const std::string &a, const std::string &v,
                       int64_t vf, int64_t vt, int64_t tf, int64_t tt) {
    impl->add_triple(e, a, v, vf, vt, tf, tt);
}
Result Engine::run() { return impl->run(); }
TypedEngine::TypedEngine(const std::string &program, int64_t valid_at, int64_t known_at, Limits limits)
    : impl(new Impl(program, valid_at, known_at, limits)) {}
TypedEngine::~TypedEngine() = default;
void TypedEngine::add_triple(const std::string &e, const std::string &a, const Value &v,
                            int64_t vf, int64_t vt, int64_t tf, int64_t tt) {
    impl->add_triple(e, a, v, vf, vt, tf, tt);
}
TypedResult TypedEngine::run() { return impl->run(); }
StratifiedEngine::StratifiedEngine(const std::string &program, int64_t valid_at, int64_t known_at, Limits limits)
    : impl(new Impl(program, valid_at, known_at, limits)) {}
StratifiedEngine::~StratifiedEngine() = default;
void StratifiedEngine::add_triple(const std::string &e, const std::string &a, const Value &v,
                                int64_t vf, int64_t vt, int64_t tf, int64_t tt) {
    impl->add_triple(e, a, v, vf, vt, tf, tt);
}
TypedResult StratifiedEngine::run() { return impl->run(); }
}
