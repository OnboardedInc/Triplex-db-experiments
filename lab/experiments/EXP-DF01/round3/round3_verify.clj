(ns round3-verify
  (:require [clojure.test :refer :all] [triplex.gateway.feed-test] [offline-verify] [deadline-cut-verify]))
;; [EXP-DF01-R3] Why: preserve the exact deadline counterexample alongside all previous feed probes.
;; Rejected: suppressing a timing-window failure or substituting old successful output for a fresh run.
(defn -main [& _]
  (let [result (run-tests 'triplex.gateway.feed-test 'offline-verify 'deadline-cut-verify)]
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
