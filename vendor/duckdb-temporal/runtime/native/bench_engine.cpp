// Direct native-engine measurements; each attempt checks the complete answer.
#include "src/temporal_stratified_core.hpp"
#include <chrono>
#include <iostream>
#include <stdexcept>
#include <string>

using Clock = std::chrono::steady_clock;
int main() {
    for (const auto &kind : {std::string("count"), std::string("grouped_count"), std::string("sum"), std::string("join")}) {
        const bool join = kind == "join";
        const std::string prefix = "source(?e,?v) :- triple(?e,'age',?v). ";
        const std::string program = join ? "answer(?e,?v,?n) :- triple(?e,'age',?v),triple(?e,'name',?n)." :
            prefix + (kind == "count" ? "answer(count()) :- source(?e,?v)." : kind == "sum" ?
                "answer(sum_i64(?v)) :- source(?e,?v)." : "answer(?v,count()) :- source(?e,?v).");
        for (int attempt = 0; attempt < 12; ++attempt) {
            const auto start = Clock::now();
            td::StratifiedEngine engine(program, 0, 1, {});
            for (int i = 0; i < 20000; ++i) {
                engine.add_triple(std::to_string(i), "age", td::Value::i64(i % 10), 0, 100, 1, 100);
                if (join) engine.add_triple(std::to_string(i), "name", td::Value::str("person-" + std::to_string(i)), 0, 100, 1, 100);
            }
            const auto loaded = Clock::now();
            const auto answer = engine.run();
            const auto finished = Clock::now();
            if (join) {
                if (answer.rows.size() != 20000) throw std::runtime_error("join cardinality differs");
                for (const auto &row : answer.rows) {
                    const auto n = std::stoi(row[0].as_str());
                    if (row.size() != 3 || row[1].as_i64() != n % 10 || row[2].as_str() != "person-" + std::to_string(n))
                        throw std::runtime_error("join values differ");
                }
            } else if (kind == "grouped_count") {
                if (answer.rows.size() != 10) throw std::runtime_error("group count differs");
                for (size_t i = 0; i < 10; ++i)
                    if (answer.rows[i][0].as_i64() != static_cast<int64_t>(i) || answer.rows[i][1].as_i64() != 2000)
                        throw std::runtime_error("group values differ");
            } else if (answer.rows.size() != 1 || answer.rows[0][0].as_i64() != (kind == "count" ? 20000 : 90000))
                throw std::runtime_error("global aggregate differs");
            if (attempt >= 3) std::cout << "{\"workload\":\"" << kind << "\",\"attempt\":" << attempt - 3
                << ",\"load_ms\":" << std::chrono::duration<double,std::milli>(loaded-start).count()
                << ",\"evaluate_ms\":" << std::chrono::duration<double,std::milli>(finished-loaded).count()
                << ",\"total_ms\":" << std::chrono::duration<double,std::milli>(finished-start).count()
                << ",\"work\":" << answer.work << ",\"rows\":" << answer.rows.size() << "}\n";
        }
    }
}
