;; [DX-CARD2] One gateway process start: load the gateway's trace namespace, write one record, flush.
(require '[triplex.gateway.trace :as trace])
(trace/emit! {:type "probe" :start (System/getenv "PROBE_START")})
(trace/flush!)
(println "probe written" (System/getenv "PROBE_START"))
(shutdown-agents)
(System/exit 0)
