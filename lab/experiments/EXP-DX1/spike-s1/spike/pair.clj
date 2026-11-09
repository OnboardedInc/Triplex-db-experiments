(ns spike.pair (:require [spike.main :as s]))
(set! *warn-on-reflection* true)
(defn -main [& _]
  (try
    ;; [DX-S1] Why: bracket the tx-function after longer JVM warmup to expose run-order confounding. Rejected: attributing earlier sequential-size differences entirely to the function.
    (let [c (s/connect "dxs1-write")]
      (dotimes [_ 3000] (s/commit-tx c 40 "mix"))
      (s/closed "dxs1-write" "q1-pair-plain-before" 40 "mix" 200 1000)
      (s/closed "dxs1-write" "q1-pair-fn" 40 "fn" 200 1000)
      (s/closed "dxs1-write" "q1-pair-plain-after" 40 "mix" 200 1000))
    (shutdown-agents) (System/exit 0)
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 1))))
