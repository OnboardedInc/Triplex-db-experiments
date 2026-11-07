// SPDX-License-Identifier: MIT
#pragma once
#include <string>

#ifndef TD_CURRENT_UNIQUE_FAST_PATH
#define TD_CURRENT_UNIQUE_FAST_PATH 0
#endif
#ifndef TD_ALL_CUT_UNIQUE_FAST_PATH
#define TD_ALL_CUT_UNIQUE_FAST_PATH 0
#endif

namespace td::integrity {
// This additional capability assumes private native writes after activation.
// Raw dispatch must drain owned readers and invalidate before mutation.
inline std::string current_unique_sql() {
    return R"TD_UNIQUE(
WITH current_cut AS MATERIALIZED (SELECT position FROM main.clock WHERE singleton),
frontier AS MATERIALIZED (SELECT (SELECT count(*) FROM current_cut)<>1 OR EXISTS(
 SELECT 1 FROM main.assertions CROSS JOIN current_cut
 WHERE tx_to>position AND (tx_from>position OR tx_to<>9223372036854775807)
) invalid),
intervals AS (
 SELECT valid_from,max(valid_to) OVER (
  PARTITION BY e,a,v_tag,v_s,v_b,v_i,v_f ORDER BY valid_from,valid_to
  ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
 ) prior_end
 FROM main.assertions CROSS JOIN current_cut CROSS JOIN frontier
 WHERE NOT frontier.invalid AND tx_from<=position AND position<tx_to AND valid_from<valid_to
)
SELECT CASE WHEN (SELECT invalid FROM frontier) THEN 0
 WHEN EXISTS(SELECT 1 FROM intervals WHERE valid_from<prior_end) THEN 0 ELSE 1 END::BIGINT
)TD_UNIQUE";
}

// Distinct transaction intervals must be disjoint. Inside each identical
// transaction interval, the valid intervals must be disjoint. Any overlap in
// start order implies an adjacent overlap, so one typed sort suffices for both
// checks. Native put/patch preserve geometric uniqueness after activation even
// if a later audit cannot prove it by this sufficient test.
inline std::string all_cut_unique_sql() {
    return R"TD_ALL_UNIQUE(
WITH current_cut AS MATERIALIZED (SELECT position FROM main.clock WHERE singleton),
frontier AS MATERIALIZED (SELECT (SELECT count(*) FROM current_cut)<>1 OR EXISTS(
 SELECT 1 FROM main.assertions CROSS JOIN current_cut
 WHERE valid_from<valid_to AND tx_from<tx_to AND tx_to>position
 AND (tx_from>position OR tx_to<>9223372036854775807)
) invalid),
intervals AS (
 SELECT tx_from,tx_to,valid_from,lag(tx_from) OVER typed_order prior_tx_from,
  lag(tx_to) OVER typed_order prior_tx_to,lag(valid_to) OVER typed_order prior_valid_to
 FROM main.assertions CROSS JOIN frontier
 WHERE NOT frontier.invalid AND valid_from<valid_to AND tx_from<tx_to
 WINDOW typed_order AS (
  PARTITION BY e,a,v_tag,v_s,v_b,v_i,v_f ORDER BY tx_from,tx_to,valid_from,valid_to
 )
)
SELECT CASE WHEN (SELECT invalid FROM frontier) THEN 0
 WHEN EXISTS(SELECT 1 FROM intervals WHERE CASE
  WHEN tx_from=prior_tx_from AND tx_to=prior_tx_to THEN valid_from<prior_valid_to
  ELSE tx_from<prior_tx_to END) THEN 0 ELSE 1 END::BIGINT
)TD_ALL_UNIQUE";
}
}
