(ns triplex.gateway.trace-test
  (:require [clojure.test :refer :all] [triplex.gateway.trace :as trace] [ring.core.protocols :as protocols] [triplex.gateway.main] [triplex.gateway.jfr :as jfr] [triplex.gateway.commit :as commit] [clojure.data.json :as json]))
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

;; [DX-T1-2] Why: a retained peer step must keep each gateway ancestor even when the route is short.
;; Rejected: pruning parents solely by duration (breaks nesting and causal attribution).
(deftest summary-read-keeps-retained-child-parents
  (let [rows (atom [])]
    (with-redefs [trace/enabled true trace/level "summary" trace/emit! #(swap! rows conj %) trace/sampled? (constantly true)]
      (let [response (trace/handler (fn [_] (trace/span "tiny-parent" "gateway" (trace/span "d/db" "peer-call" nil)) {:status 200 :headers {} :body "{}"}) {:uri "/transactions" :headers {}})]
        (protocols/write-body-to-stream (:body response) response (java.io.ByteArrayOutputStream.))
        (let [r (first @rows) ids (set (cons (:root r) (map :id (:spans r))))]
          (is (= 1 (count @rows)))
          (is (some #(= "tiny-parent" (:name %)) (:spans r)))
          (is (every? #(contains? ids (:parent %)) (:spans r))))))))

;; [DX-T1-2] Why: a faster formatter must preserve 64-bit wire identity across the sign boundary and skip the invalid all-zero ID.
;; Rejected: timing assertions (host-dependent) or checking only an ordinary positive counter.
(deftest fixed-width-nonzero-span-ids
  (with-redefs [trace/ids (java.util.concurrent.atomic.AtomicLong. -2)]
    (is (= ["ffffffffffffffff" "0000000000000001" "0000000000000002"] (repeatedly 3 trace/id))))
  (with-redefs [trace/ids (java.util.concurrent.atomic.AtomicLong. (dec Long/MAX_VALUE))]
    (is (= ["7fffffffffffffff" "8000000000000000"] (repeatedly 2 trace/id)))))

(deftest transaction-observer-cannot-change-results-or-errors
  (let [f (eval (list 'fn '[db payload] (commit/instrument-code '(:result payload))))
        fail (eval (list 'fn '[db payload] (commit/instrument-code '(throw (ex-info "operation-sentinel" {})))))]
    (is (= 42 (f nil {:result 42})))
    (with-redefs [jfr/start-transaction! (fn [_] (throw (Exception. "observer-start")))]
      (is (= 42 (f nil {:result 42 :triplex-trace {}}))))
    (with-redefs [jfr/start-transaction! (fn [_] (Object.))]
      (is (= 42 (f nil {:result 42 :triplex-trace {}}))))
    (is (thrown-with-msg? Exception #"operation-sentinel" (fail nil {})))))
(deftest transaction-context-keeps-the-exact-submission-parent
  (with-redefs [trace/tx-jfr-enabled true]
    (binding [trace/*request* (atom {:traceId "12345678901234567890123456789012" :run "r" :slot "s" :source "h"}) trace/*parent* "1234567890123456"]
      (is (= {:traceId "12345678901234567890123456789012" :run "r" :slot "s" :source "h" :parent "1234567890123456"} (trace/transaction-context))))))
(deftest exports-real-jfr-before-shutdown
  (when (= "1" (System/getenv "TRIPLEX_TRACE_TEST_JFR"))
    (let [identity {:run "fixture" :slot "fixture" :source "fixture" :process "test" :clock trace/trace-clock}
          file (str (System/getenv "TRIPLEX_TRACE_DIR") "/test.jfr")]
      (jfr/install! "test" identity)
      (with-redefs [jfr/installed (atom (assoc identity :process "tx"))]
        (let [context {:run "fixture" :slot "fixture" :source "fixture" :traceId "12345678901234567890123456789012" :parent "1234567890123456"}
              event (jfr/start-transaction! context)]
          (is (some? event)) (Thread/sleep 2) (.commit event)
          (is (nil? (jfr/start-transaction! (assoc context :source "foreign"))))
          (is (nil? (jfr/start-transaction! (assoc context :parent "0000000000000000"))))))
      (System/gc) (Thread/sleep 50)
      (jfr/finish! "test" identity)
      (is (> (.length (java.io.File. file)) 68))
      (let [completion (json/read-str (slurp (str file "-complete.jsonl")))]
        (is (pos? (get completion "events")))
        (is (>= (get completion "clockSamples") 2))
        (is (<= (get completion "clockMaxUncertaintyMs") 0.1)))
      (is (= (jfr/sha256 file) (get (json/read-str (slurp (str file "-complete.jsonl"))) "fileSha256")))
      (is (seq (slurp (str file ".jsonl"))))
      (let [events (map json/read-str (clojure.string/split-lines (slurp (str file ".jsonl"))))
            event (first (filter #(= "triplex.TransactionFunction" (get % "nativeType")) events))]
        (is (= "12345678901234567890123456789012" (get event "traceId")))
        (is (= "1234567890123456" (get event "parent")))
        (is (<= (get event "start") (get event "end")))))))
(defn -main [& _] (let [r (run-tests 'triplex.gateway.trace-test)] (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
