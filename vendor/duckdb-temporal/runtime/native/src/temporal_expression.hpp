// SPDX-License-Identifier: MIT
// Private bounded postfix IR. Only Core evaluates it, under its checked typed
// entry environment; these helpers are not independently callable public APIs.
#pragma once
#include "temporal_value_domain.hpp"
#include <algorithm>
#include <array>

namespace td {
namespace detail {

constexpr size_t MAX_FILTERS = 16;
constexpr size_t MAX_RULE_EXPRESSION_NODES = 256;
constexpr size_t MAX_PROGRAM_EXPRESSION_NODES = 4096;
constexpr size_t MAX_EXPRESSION_HEIGHT = 32;
constexpr size_t MAX_EXPRESSION_NESTING = 32;

enum class ExprOp : uint8_t {
    Literal, Variable, Negate, Add, Subtract, Multiply, Divide, RefId,
    Equal, NotEqual, Less, LessEqual, Greater, GreaterEqual
};
struct ExprNode { ExprOp op; uint32_t operand = 0; };
struct Expression {
    std::vector<ExprNode> code;
    uint64_t dependencies = 0;
};
using ExprCell = TypedDomain::Entry; // Borrowed string pointer or inline scalar.

[[noreturn]] inline void expression_type_error() {
    throw Error("TD_E_EXPR_TYPE: operator is incompatible with operand tags");
}
[[noreturn]] inline void expression_overflow() {
    throw Error("TD_E_EXPR_OVERFLOW: arithmetic result is outside its finite type");
}
inline ExprCell negate_expression(const ExprCell &input) {
    ExprCell result; result.tag = input.tag;
    if (input.tag == ValueTag::Int64) {
        if (input.value.i == std::numeric_limits<int64_t>::min()) expression_overflow();
        result.value.i = -input.value.i;
    } else if (input.tag == ValueTag::Float64) {
        result.value.f = canonical_float_bits(input.value.f ^ UINT64_C(0x8000000000000000));
    } else expression_type_error();
    return result;
}
inline ExprCell arithmetic_expression(ExprOp op, const ExprCell &left, const ExprCell &right) {
    if (left.tag != right.tag) expression_type_error();
    ExprCell result; result.tag = left.tag;
    if (left.tag == ValueTag::Int64) {
        const int64_t a = left.value.i, b = right.value.i;
        bool overflow = false;
        switch (op) {
        case ExprOp::Add: overflow = __builtin_add_overflow(a, b, &result.value.i); break;
        case ExprOp::Subtract: overflow = __builtin_sub_overflow(a, b, &result.value.i); break;
        case ExprOp::Multiply: overflow = __builtin_mul_overflow(a, b, &result.value.i); break;
        case ExprOp::Divide:
            if (!b) throw Error("TD_E_EXPR_DIV_ZERO: integer division by zero");
            if (a == std::numeric_limits<int64_t>::min() && b == -1) expression_overflow();
            result.value.i = a / b; break;
        default: throw Error("internal invalid arithmetic opcode");
        }
        if (overflow) expression_overflow();
    } else if (left.tag == ValueTag::Float64) {
        if (op == ExprOp::Divide && zero_float_bits(right.value.f))
            throw Error("TD_E_EXPR_DIV_ZERO: float division by zero");
        const double a = bits_float(left.value.f), b = bits_float(right.value.f);
        double computed;
        // One separately checked binary64 result per IR node. Strict build
        // flags disable contraction/reassociation; result bits force storage.
        switch (op) {
        case ExprOp::Add: computed = a + b; break;
        case ExprOp::Subtract: computed = a - b; break;
        case ExprOp::Multiply: computed = a * b; break;
        case ExprOp::Divide: computed = a / b; break;
        default: throw Error("internal invalid arithmetic opcode");
        }
        const auto bits = float_bits(computed);
        if (!finite_float_bits(bits)) expression_overflow();
        if ((op == ExprOp::Multiply || op == ExprOp::Divide) && zero_float_bits(bits) &&
            !zero_float_bits(left.value.f) && !zero_float_bits(right.value.f))
            throw Error("TD_E_EXPR_UNDERFLOW: nonzero float result rounds to zero");
        result.value.f = canonical_float_bits(bits);
    } else expression_type_error();
    return result;
}

template <class Charge> inline bool compare_expression(ExprOp op, const ExprCell &left,
                                                       const ExprCell &right, Charge &charge) {
    const bool equality = op == ExprOp::Equal || op == ExprOp::NotEqual;
    if (left.tag != right.tag) {
        if (!equality) expression_type_error();
        return op == ExprOp::NotEqual;
    }
    int comparison = 0;
    switch (left.tag) {
    case ValueTag::Reference: case ValueTag::Json: case ValueTag::Blob:
        if (!equality) expression_type_error();
        [[fallthrough]];
    case ValueTag::String: {
        const auto &a = *left.value.s, &b = *right.value.s;
        charge((a.size() + b.size() + 63) / 64);
        const auto prefix = std::memcmp(a.data(), b.data(), std::min(a.size(), b.size()));
        comparison = prefix ? (prefix > 0 ? 1 : -1) : (a.size() > b.size()) - (a.size() < b.size());
        break;
    }
    case ValueTag::Boolean:
        if (!equality) expression_type_error();
        comparison = int(left.value.b) - int(right.value.b); break;
    case ValueTag::Int64:
        comparison = (left.value.i > right.value.i) - (left.value.i < right.value.i); break;
    case ValueTag::Float64:
    case ValueTag::DateTime: {
        const auto a = ordered_float_bits(left.value.f), b = ordered_float_bits(right.value.f);
        comparison = (a > b) - (a < b); break;
    }
    default: throw Error("internal invalid expression value tag");
    }
    switch (op) {
    case ExprOp::Equal: return comparison == 0;
    case ExprOp::NotEqual: return comparison != 0;
    case ExprOp::Less: return comparison < 0;
    case ExprOp::LessEqual: return comparison <= 0;
    case ExprOp::Greater: return comparison > 0;
    case ExprOp::GreaterEqual: return comparison >= 0;
    default: throw Error("internal invalid comparison opcode");
    }
}

// The compile-time height bound also bounds the postfix live stack. Evaluation
// borrows dictionary entries; only projection callers intern the final value.
template <bool ComparisonRoot, class Charge>
inline auto evaluate_expression(const Expression &expression, const TypedDomain &dictionary,
                                const std::vector<int64_t> &bindings, Charge &charge) {
    charge(expression.code.size());
    std::array<ExprCell, MAX_EXPRESSION_HEIGHT> stack;
    size_t size = 0;
    for (const auto &node : expression.code) {
        if (node.op == ExprOp::Literal || node.op == ExprOp::Variable) {
            if (size == stack.size()) throw Error("internal expression stack capacity exceeded");
            int64_t id = node.op == ExprOp::Literal ? int64_t(node.operand) : bindings[node.operand];
            if (id < 0) throw Error("TD_E_EXPR_UNBOUND: expression input was not relationally bound");
            stack[size++] = dictionary.entries[static_cast<size_t>(id)];
        } else if (node.op == ExprOp::Negate) {
            if (!size) throw Error("internal invalid unary expression stack");
            stack[size - 1] = negate_expression(stack[size - 1]);
        } else if (node.op == ExprOp::RefId) {
            if (!size) throw Error("internal invalid reference expression stack");
            auto &value = stack[size - 1];
            if (value.tag != ValueTag::Reference) expression_type_error();
            value.tag = ValueTag::String;
        } else {
            if (size < 2) throw Error("internal invalid binary expression stack");
            const auto right = stack[--size];
            auto &left = stack[size - 1];
            if (node.op >= ExprOp::Equal) {
                if constexpr (ComparisonRoot) {
                    if (size != 1) throw Error("internal comparison is not the filter root");
                    return compare_expression(node.op, left, right, charge);
                } else throw Error("internal comparison in computed head");
            }
            left = arithmetic_expression(node.op, left, right);
        }
    }
    if constexpr (ComparisonRoot) throw Error("internal expression has no comparison root");
    else {
        if (size != 1) throw Error("internal invalid computed head stack");
        return stack[0];
    }
}

}
}
