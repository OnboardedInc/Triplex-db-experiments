// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_core.hpp"

namespace td::sql {
inline std::string literal(const std::string &value) {
    if(value.find('\0')!=std::string::npos)throw Error("TD_E_SQL_LITERAL: NUL in SQL data");
    std::string out="'";
    for(const auto c:value){out+=c;if(c=='\'')out+=c;}
    return out+'\'';
}
}
