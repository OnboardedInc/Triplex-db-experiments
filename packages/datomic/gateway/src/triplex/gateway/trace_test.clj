(ns triplex.gateway.trace-test
  (:require [clojure.test :refer :all] [triplex.gateway.trace :as trace] [ring.core.protocols :as protocols] [triplex.gateway.main] [triplex.gateway.jfr :as jfr] [clojure.data.json :as json]))
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

(deftest summary-keeps-a-complete-commit-begin-route
  (let [rows (atom [])]
    (with-redefs [trace/enabled true trace/level "summary" trace/emit! #(swap! rows conj %)]
      (let [response (trace/handler (fn [_] (trace/span "commit.tiny" "gateway" nil) {:status 200 :headers {} :body "{}"}) {:uri "/begin" :headers {"x-triplex-trace-kind" "commit"}})]
        (protocols/write-body-to-stream (:body response) response (java.io.ByteArrayOutputStream.))
        (is (= 1 (count @rows)))
        (is (= "commit" (:kind (first @rows))))
        (is (some #(= "commit.tiny" (:name %)) (:spans (first @rows))))))))

(deftest exports-real-jfr-before-shutdown
  (when (= "1" (System/getenv "TRIPLEX_TRACE_TEST_JFR"))
    (let [identity {:run "fixture" :slot "fixture" :source "fixture" :process "test" :clock trace/trace-clock}
          file (str (System/getenv "TRIPLEX_TRACE_DIR") "/test.jfr")]
      (jfr/install! "test" identity)
      (System/gc) (Thread/sleep 50)
      (jfr/finish! "test" identity)
      (is (> (.length (java.io.File. file)) 68))
      (let [completion (json/read-str (slurp (str file "-complete.jsonl")))]
        (is (pos? (get completion "events")))
        (is (>= (get completion "clockSamples") 2))
        (is (<= (get completion "clockMaxUncertaintyMs") 0.1)))
      (is (= (jfr/sha256 file) (get (json/read-str (slurp (str file "-complete.jsonl"))) "fileSha256")))
      (is (seq (slurp (str file ".jsonl")))))))
(defn -main [& _] (let [r (run-tests 'triplex.gateway.trace-test)] (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
