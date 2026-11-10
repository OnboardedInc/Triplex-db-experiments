(ns triplex.gateway.stats)
;; [DX-B4-T3] Why: count actual lazy traversal, not an estimated store size. Rejected: counting an unconsumed sequence.
(def counts (atom {}))
(defn bump! [path n] (swap! counts update-in path (fnil + 0) n))
