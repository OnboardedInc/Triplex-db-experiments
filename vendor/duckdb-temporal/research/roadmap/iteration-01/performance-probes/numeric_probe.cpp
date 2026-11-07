// SPDX-License-Identifier: MIT
// Observe the actual pinned C++17 numeric conversion behavior, not a parser.
#include <charconv>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <iomanip>
#include <iostream>
#include <limits>
#include <sstream>
#include <string>

int main() {
    static_assert(sizeof(double) == 8 && std::numeric_limits<double>::is_iec559
                  && std::numeric_limits<double>::digits == 53, "binary64 required");
    std::cout << "{\"metadata\":{\"compiler\":\"" << __VERSION__
              << "\",\"language\":\"C++17\"}}\n";
    for (const std::string text : {"1", "1.0", "-0.0", "5e-324", "2.2250738585072014e-308",
                                  "1.7976931348623157e308", "1.7976931348623159e308", "1e309",
                                  "1e-9999", "NaN", "Infinity", "1junk", "+1.0"}) {
        double value = 123.0;
        auto result = std::from_chars(text.data(), text.data() + text.size(), value);
        uint64_t bits; std::memcpy(&bits, &value, sizeof(bits));
        std::ostringstream hex; hex << std::hex << std::setw(16) << std::setfill('0') << bits;
        std::cout << "{\"kind\":\"float\",\"input\":\"" << text
                  << "\",\"error\":" << static_cast<int>(result.ec)
                  << ",\"consumed\":" << result.ptr - text.data()
                  << ",\"finite\":" << (std::isfinite(value) ? "true" : "false")
                  << ",\"bits_after_attempt\":\"" << hex.str() << "\"}\n";
    }
    for (const std::string text : {"-9223372036854775808", "9223372036854775807",
                                  "-9223372036854775809", "9223372036854775808"}) {
        int64_t value = 123;
        auto result = std::from_chars(text.data(), text.data() + text.size(), value);
        std::cout << "{\"kind\":\"int64\",\"input\":\"" << text
                  << "\",\"error\":" << static_cast<int>(result.ec)
                  << ",\"consumed\":" << result.ptr - text.data()
                  << ",\"decimal_after_attempt\":\"" << value << "\"}\n";
    }
    std::cout << "{\"kind\":\"to_string_collision\",\"left\":\"" << std::to_string(0.10000001)
              << "\",\"right\":\"" << std::to_string(0.10000002) << "\"}\n";
}
