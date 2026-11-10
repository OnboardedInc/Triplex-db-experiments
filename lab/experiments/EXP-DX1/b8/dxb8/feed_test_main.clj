(ns dxb8.feed-test-main
  (:require [clojure.test :refer [run-tests]] [clojure.data.json :as json]
            [triplex.gateway.feed-test]))
;; [DX-B8] Why: the pinned bin/run does not preserve a spaced -e form as one argument.
;; Rejected: interpreting its reader error as a feed-test result.
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'triplex.gateway.feed-test)]
    (println (json/write-str result)) (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
