(ns triplex.gateway.trace-test
  (:require [clojure.test :refer :all] [triplex.gateway.trace :as trace] [ring.core.protocols :as protocols] [triplex.gateway.main]))
;; [DX-T1] Why: exercise actual Ring response write, parent nesting and counter isolation.
;; Rejected: only testing a regular expression or manufacturing a gateway result in TypeScript.
(deftest propagated-parent-and-written-response
  (let [rows (atom []) parent "00-12345678901234567890123456789012-1234567890123456-01"]
    (with-redefs [trace/enabled true trace/level "full" trace/emit! #(swap! rows conj %)]
      (let [response (trace/handler (fn [_] (trace/span "outer" "gateway" (trace/span "inner" "peer-call" (trace/counter! "hit" 1))) {:status 200 :headers {} :body "{}"}) {:uri "/transact" :headers {"traceparent" parent}})
            output (java.io.ByteArrayOutputStream.)]
        (is (.startsWith (get-in response [:headers "traceparent"]) "00-12345678901234567890123456789012-"))
        (protocols/write-body-to-stream (:body response) response output)
        (is (= "{}" (.toString output "UTF-8")))
        (let [r (first @rows) inner (first (filter #(= "inner" (:name %)) (:spans r))) outer (first (filter #(= "outer" (:name %)) (:spans r)))]
          (is (= "1234567890123456" (:parent r)))
          (is (= (:id outer) (:parent inner)))
          (is (= 1 (get-in r [:counters "hit"])))
          (is (some #(= "gateway.response-write" (:name %)) (:spans r)))
          (is (every? #(<= (:start %) (:end %)) (:spans r))))))))

(defn -main [& _] (let [r (run-tests 'triplex.gateway.trace-test)] (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
