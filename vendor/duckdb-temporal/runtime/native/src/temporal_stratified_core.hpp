// SPDX-License-Identifier: MIT
#pragma once
#include "temporal_typed_core.hpp"

namespace td {

// Additive, bounded td.stratified/1 mode. Legacy TypedEngine and its IR do not
// accept this syntax. State and all dictionary payloads are invocation-local.
class StratifiedEngine {
public:
    StratifiedEngine(const std::string &program, int64_t valid_at, int64_t known_at,
                     Limits limits);
    ~StratifiedEngine();
    StratifiedEngine(const StratifiedEngine &) = delete;
    StratifiedEngine &operator=(const StratifiedEngine &) = delete;
    void add_triple(const std::string &e, const std::string &a, const Value &v,
                    int64_t valid_from, int64_t valid_to,
                    int64_t tx_from, int64_t tx_to);
    TypedResult run();

private:
    struct Impl;
    std::unique_ptr<Impl> impl;
};

}
