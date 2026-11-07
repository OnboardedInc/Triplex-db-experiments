// SPDX-License-Identifier: MIT
// Private pinned-target binary64 primitives; not a public arithmetic API.
#pragma once
#include "temporal_typed_core.hpp"
#include <cfloat>
#include <charconv>
#include <cstring>
#include <limits>
#include <cfenv>
#include <optional>
#include <string_view>
#if defined(__x86_64__)
#include <xmmintrin.h>
#endif

#if !(defined(__linux__) || defined(__APPLE__)) || !(defined(__x86_64__) || defined(__aarch64__))
#error "Typed evaluation supports Linux/macOS x86-64 or AArch64"
#endif
#if FLT_EVAL_METHOD != 0
#error "Typed arithmetic requires binary64 evaluation without excess precision"
#endif
#if defined(__FAST_MATH__) || (defined(__FINITE_MATH_ONLY__) && __FINITE_MATH_ONLY__ != 0)
#error "Typed values require strict finite/subnormal IEEE binary64 semantics"
#endif

namespace td {
namespace detail {

inline uint64_t float_bits(double value) noexcept {
    static_assert(sizeof(double) == sizeof(uint64_t) &&
                  std::numeric_limits<double>::is_iec559 &&
                  std::numeric_limits<double>::radix == 2 &&
                  std::numeric_limits<double>::digits == 53 &&
                  std::numeric_limits<double>::max_exponent == 1024,
                  "Typed values require IEEE 754 binary64");
    uint64_t bits;
    std::memcpy(&bits, &value, sizeof(bits));
    return bits;
}

inline double bits_float(uint64_t bits) noexcept {
    double value;
    std::memcpy(&value, &bits, sizeof(value));
    return value;
}

inline bool finite_float_bits(uint64_t bits) noexcept {
    return (bits & UINT64_C(0x7ff0000000000000)) != UINT64_C(0x7ff0000000000000);
}
inline bool zero_float_bits(uint64_t bits) noexcept {
    return (bits & UINT64_C(0x7fffffffffffffff)) == 0;
}
inline uint64_t canonical_float_bits(uint64_t bits) noexcept {
    return zero_float_bits(bits) ? 0 : bits;
}
inline uint64_t ordered_float_bits(uint64_t bits) noexcept {
    bits = canonical_float_bits(bits);
    return bits >> 63 ? ~bits : bits | UINT64_C(0x8000000000000000);
}

inline std::optional<double> finite_binary64_literal(std::string_view text) noexcept {
    if (text.size() != 16 || text.find_first_not_of("0123456789abcdef") != std::string_view::npos)
        return std::nullopt;
    uint64_t bits = 0;
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), bits, 16);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || !finite_float_bits(bits))
        return std::nullopt;
    return bits_float(canonical_float_bits(bits));
}

// Check controls only: sticky exception flags are deliberately ignored. No
// control or status register is changed. Public typed entries call this before
// parsing/admission/one-shot state changes; no caller callbacks run inside.
inline void require_float_environment() {
#if defined(__aarch64__)
    uint64_t fpcr;
    __asm__ __volatile__("mrs %0, fpcr" : "=r"(fpcr));
    // Reject alternate rounding, flush-to-zero, default-NaN, alternate-half,
    // and enabled exception traps. Read controls only; never alter them.
    constexpr uint64_t forbidden = UINT64_C(7) | (UINT64_C(0x1f) << 8) | (UINT64_C(1) << 15) |
        (UINT64_C(0x3f) << 19) | (UINT64_C(3) << 25);
    if ((fpcr & forbidden) || std::fegetround() != FE_TONEAREST)
        throw Error("TD_E_EXPR_FLOAT_ENV: typed evaluation requires nearest rounding, masked exceptions and gradual underflow");
#else
    uint16_t x87;
    __asm__ __volatile__("fnstcw %0" : "=m"(x87) : : "memory");
    const auto simd = _mm_getcsr();
    if ((x87 & UINT16_C(0x003f)) != UINT16_C(0x003f) ||
        (x87 & UINT16_C(0x0c00)) != 0 ||
        (simd & UINT32_C(0xffc0)) != UINT32_C(0x1f80))
        throw Error("TD_E_EXPR_FLOAT_ENV: typed evaluation requires nearest rounding, masked exceptions and FTZ/DAZ off");
#endif
}

}
}
