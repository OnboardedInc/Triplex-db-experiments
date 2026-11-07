// SPDX-License-Identifier: MIT
// Invocation-owned cancellation; no client-context or borrowed-buffer access.
#pragma once
#include "temporal_core.hpp"
#include <atomic>
#include <chrono>
#include <mutex>
#include <unordered_map>

namespace td::control {
#if TD_EVALUATOR_PROFILE
enum class ProfileState : uint8_t { Armed, Running, Complete, Invalid };
struct EvaluatorProfileSlot {
    std::atomic<ProfileState> state{ProfileState::Armed};
    evaluator_profile::Sample sample;
};
#endif
struct Invocation {
    std::atomic<bool> canceled{false};
    std::chrono::steady_clock::time_point deadline;
#if TD_EVALUATOR_PROFILE
    std::unique_ptr<EvaluatorProfileSlot> profile;
#endif
    explicit Invocation(uint64_t millis)
        : deadline(std::chrono::steady_clock::now() + std::chrono::milliseconds(millis)) {}
    Invocation():deadline(std::chrono::steady_clock::time_point::max()){}
    void poll() const {
        if (canceled.load(std::memory_order_relaxed))
            throw Error("TD_E_CANCELED: invocation canceled; no partial result returned");
        if (std::chrono::steady_clock::now() >= deadline)
            throw Error("TD_E_DEADLINE: invocation deadline exceeded; no partial result returned");
    }
};
#if TD_EVALUATOR_PROFILE
// Only the first evaluator row can publish. Other uses retire the sample
// without changing SQL behavior, including if two connections share a token.
class EvaluatorCapture {
public:
    EvaluatorCapture() = default;
    EvaluatorCapture(const EvaluatorCapture &) = delete;
    EvaluatorCapture &operator=(const EvaluatorCapture &) = delete;
    ~EvaluatorCapture() {
        if (!owner) return;
        auto expected=ProfileState::Running;
        owner->profile->state.compare_exchange_strong(expected,ProfileState::Invalid);
    }
    void claim(const std::shared_ptr<Invocation> &invocation) noexcept {
        if (!invocation->profile) return;
        auto &state=invocation->profile->state;
        auto expected=ProfileState::Armed;
        if (state.compare_exchange_strong(expected,ProfileState::Running)) owner=invocation;
        else state.store(ProfileState::Invalid,std::memory_order_release);
    }
    evaluator_profile::Sample *timing() noexcept { return owner?&sample:nullptr; }
    void complete() noexcept {
        auto &slot=*owner->profile;
        slot.sample=sample;
        auto expected=ProfileState::Running;
        slot.state.compare_exchange_strong(expected,ProfileState::Complete);
        owner.reset();
    }
private:
    std::shared_ptr<Invocation> owner;
    evaluator_profile::Sample sample;
};
#endif
inline std::mutex mutex;
inline std::unordered_map<int64_t, std::shared_ptr<Invocation>> invocations;
inline int64_t next = 1;
inline int64_t insert(std::shared_ptr<Invocation> invocation){
    std::lock_guard<std::mutex> lock(mutex);
    if(invocations.size()>=1024||next==INT64_MAX)return 0;
    const auto token=next++;invocations.emplace(token,std::move(invocation));return token;
}
inline std::shared_ptr<Invocation> acquire(int64_t token) {
    std::lock_guard<std::mutex> lock(mutex);
    auto found = invocations.find(token);
    if (found == invocations.end()) throw Error("TD_E_CONTROL: invocation token is retired or unknown");
    return found->second;
}
}

extern "C" __attribute__((visibility("default"))) int64_t td_control_create(uint64_t millis) noexcept {
    try {
        if (!millis || millis > 3600000) return 0;
        return td::control::insert(std::make_shared<td::control::Invocation>(millis));
    } catch (...) { return 0; }
}
extern "C" __attribute__((visibility("default"))) int64_t td_control_create_unbounded() noexcept {
    try{return td::control::insert(std::make_shared<td::control::Invocation>());}catch(...){return 0;}
}
#if TD_EVALUATOR_PROFILE
extern "C" __attribute__((visibility("default"))) int64_t td_control_create_profiled_v1(uint64_t millis) noexcept {
    try {
        if (!millis || millis > 3600000) return 0;
        auto invocation=std::make_shared<td::control::Invocation>(millis);
        invocation->profile=std::make_unique<td::control::EvaluatorProfileSlot>();
        return td::control::insert(std::move(invocation));
    } catch (...) { return 0; }
}
extern "C" __attribute__((visibility("default"))) int td_control_evaluator_profile_v1(int64_t token,
        uint64_t *out,size_t count) noexcept {
    try {
        if (!out || count!=6) return 0;
        const auto invocation=td::control::acquire(token);
        invocation->poll();
        const auto *profile=invocation->profile.get();
        if (!profile || profile->state.load(std::memory_order_acquire)!=td::control::ProfileState::Complete) return 0;
        const auto &sample=profile->sample;
        out[0]=sample.build_and_load_ns; out[1]=sample.fixed_point_ns;
        out[2]=sample.materialize_answer_ns; out[3]=sample.encode_result_vector_ns;
        out[4]=sample.input_rows; out[5]=sample.answer_rows;
        return 1;
    } catch (...) { return 0; }
}
#endif
// Status is transport metadata only: 0 live, 1 canceled, 2 expired, 3 retired.
extern "C" __attribute__((visibility("default"))) int td_control_status(int64_t token) noexcept {
    try{
        const auto invocation=td::control::acquire(token);
        if(invocation->canceled.load(std::memory_order_relaxed))return 1;
        return std::chrono::steady_clock::now()>=invocation->deadline?2:0;
    }catch(...){return 3;}
}
extern "C" __attribute__((visibility("default"))) int td_control_cancel(int64_t token) noexcept {
    try { td::control::acquire(token)->canceled.store(true, std::memory_order_relaxed); return 1; }
    catch (...) { return 0; }
}
extern "C" __attribute__((visibility("default"))) void td_control_release(int64_t token) noexcept {
    std::lock_guard<std::mutex> lock(td::control::mutex);
    td::control::invocations.erase(token);
}
