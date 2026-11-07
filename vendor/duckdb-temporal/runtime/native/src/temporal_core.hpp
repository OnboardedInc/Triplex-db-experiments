// SPDX-License-Identifier: MIT
#pragma once
#include <cstdint>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>
#include <functional>
#if TD_EVALUATOR_PROFILE
#include <chrono>
#endif

namespace td {
struct Error : std::runtime_error { using std::runtime_error::runtime_error; };
enum class ValueProfile : uint8_t { FourTag = 4, AllValues = 8 };
#if TD_EVALUATOR_PROFILE
namespace evaluator_profile {
using Clock = std::chrono::steady_clock;
inline uint64_t elapsed_ns(Clock::time_point start) noexcept {
    return static_cast<uint64_t>(std::chrono::duration_cast<std::chrono::nanoseconds>(Clock::now()-start).count());
}
struct Sample {
    uint64_t build_and_load_ns=0, fixed_point_ns=0, materialize_answer_ns=0, encode_result_vector_ns=0;
    uint64_t input_rows=0, answer_rows=0;
};
}
#endif
struct Limits {
    uint64_t max_facts = 100000;
    uint64_t max_rounds = 1000;
    uint64_t max_work = 5000000;
    std::function<void()> poll;
    ValueProfile values = ValueProfile::FourTag;
#if TD_EVALUATOR_PROFILE
    evaluator_profile::Sample *evaluator_timing = nullptr;
#endif
};
struct Result {
    std::vector<std::vector<std::string>> rows;
    uint64_t rounds = 0;
    uint64_t derived_facts = 0;
    uint64_t work = 0;
};
// One Engine is private to one scalar invocation: no process-global query state.
class Engine {
public:
    Engine(const std::string &program, int64_t valid_at, int64_t known_at, Limits limits);
    ~Engine();
    Engine(const Engine &) = delete;
    Engine &operator=(const Engine &) = delete;
    void add_triple(const std::string &e, const std::string &a, const std::string &v,
                    int64_t valid_from, int64_t valid_to, int64_t tx_from, int64_t tx_to);
    Result run();
private:
    struct Impl;
    std::unique_ptr<Impl> impl;
};
}
