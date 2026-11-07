// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"
#include <string_view>

namespace td::detail {

// Check grammar without materializing a DOM or converting numeric literals.
// The caller validates UTF-8 and the term byte limit before this pass.
class JsonSyntax {
public:
    explicit JsonSyntax(std::string_view source) : source(source) {}
    bool complete() {
        if (!value(0)) return false;
        whitespace();
        return pos == source.size();
    }

private:
    std::string_view source;
    size_t pos = 0;

    bool take(char ch) {
        if (pos == source.size() || source[pos] != ch) return false;
        ++pos;
        return true;
    }
    void whitespace() {
        while (pos < source.size()) {
            const char ch = source[pos];
            if (ch != ' ' && ch != '\t' && ch != '\n' && ch != '\r') break;
            ++pos;
        }
    }
    bool literal(std::string_view expected) {
        if (source.compare(pos, expected.size(), expected) != 0) return false;
        pos += expected.size();
        return true;
    }
    bool hex_unit(unsigned &unit) {
        if (source.size() - pos < 4) return false;
        unit = 0;
        for (unsigned i = 0; i < 4; ++i) {
            const char ch = source[pos++];
            unsigned digit;
            if (ch >= '0' && ch <= '9') digit = static_cast<unsigned>(ch - '0');
            else if (ch >= 'a' && ch <= 'f') digit = static_cast<unsigned>(ch - 'a') + 10;
            else if (ch >= 'A' && ch <= 'F') digit = static_cast<unsigned>(ch - 'A') + 10;
            else return false;
            unit = unit * 16 + digit;
        }
        return true;
    }
    bool unicode_escape() {
        unsigned unit;
        if (!hex_unit(unit)) return false;
        if (unit < 0xd800 || unit > 0xdfff) return true;
        if (unit >= 0xdc00 || !take('\\') || !take('u') || !hex_unit(unit)) return false;
        return unit >= 0xdc00 && unit <= 0xdfff;
    }
    bool string() {
        if (!take('"')) return false;
        while (pos < source.size()) {
            const auto ch = static_cast<unsigned char>(source[pos++]);
            if (ch == '"') return true;
            if (ch < 0x20) return false;
            if (ch != '\\') continue;
            if (pos == source.size()) return false;
            switch (source[pos++]) {
            case '"': case '\\': case '/': case 'b': case 'f': case 'n': case 'r': case 't':
                break;
            case 'u':
                if (!unicode_escape()) return false;
                break;
            default: return false;
            }
        }
        return false;
    }
    bool digits() {
        const auto start = pos;
        while (pos < source.size() && source[pos] >= '0' && source[pos] <= '9') ++pos;
        return pos != start;
    }
    bool number() {
        take('-');
        if (!take('0') && !digits()) return false;
        if (take('.') && !digits()) return false;
        if (take('e') || take('E')) {
            if (!take('+')) take('-');
            if (!digits()) return false;
        }
        return true;
    }
    bool array(size_t depth) {
        whitespace();
        if (take(']')) return true;
        do {
            if (!value(depth)) return false;
            whitespace();
        } while (take(','));
        return take(']');
    }
    bool object(size_t depth) {
        whitespace();
        if (take('}')) return true;
        do {
            whitespace();
            if (!string()) return false;
            whitespace();
            if (!take(':') || !value(depth)) return false;
            whitespace();
        } while (take(','));
        return take('}');
    }
    bool value(size_t depth) {
        whitespace();
        if (pos == source.size()) return false;
        const char token = source[pos];
        if (token == '{' || token == '[') {
            if (depth == 64) throw Error("TD_E_VALUE_PAYLOAD: JSON nesting exceeds 64 levels");
            ++pos;
            return token == '{' ? object(depth + 1) : array(depth + 1);
        }
        switch (token) {
        case '"': return string();
        case 't': return literal("true");
        case 'f': return literal("false");
        case 'n': return literal("null");
        default: return number();
        }
    }
};

inline void validate_json_syntax(std::string_view source) {
    if (!JsonSyntax(source).complete()) throw Error("TD_E_VALUE_PAYLOAD: invalid serialized JSON");
}
}
