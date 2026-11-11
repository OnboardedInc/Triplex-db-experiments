(ns triplex.gateway.commit-order-test
  (:require [clojure.test :refer :all] [triplex.gateway.commit-order :as order])
  (:import [java.util UUID] [java.lang Thread$State]))
(defn client [] (str (UUID/randomUUID)))
(defn until [pred]
  (loop [n 0]
    (cond (pred) true (> n 5000) (throw (ex-info "Pending entry never arrived" {}))
          :else (do (Thread/sleep 1) (recur (inc n))))))
(defn buffered? [id seq]
  (when-let [lane (.get order/lanes id)]
    (locking lane (.containsKey ^java.util.TreeMap (:pending @lane) (long seq)))))
(defn submitter [seen n]
  #(let [position (count (swap! seen conj n))] (doto (promise) (deliver position))))
(defn result [job]
  (try (deref job 5000 ::timeout)
       (catch Throwable e
         (loop [e e] (if-let [cause (.getCause e)] (recur cause) e)))))
(defn ack [id seq seen & [timeout limit]]
  @(order/enqueue! id seq (str seq) (submitter seen seq) (or timeout 2000) (or limit 256)))
;; [DX-B9-B] Why: test deadlines and buffer boundaries against actual delivered promises and submitted order.
;; Rejected: counting callbacks without checking which sequence reached the submission function.
(deftest suffix-deadline-and-resend
  (let [id (client) seen (atom []) late (future (ack id 2 seen 50))]
    (until #(buffered? id 2))
    (let [error (result late)]
      (is (= "CommitOrderGap" (:code (ex-data error))))
      (is (= 1 (:expectedSequence (ex-data error))))
      (is (empty? @seen)))
    (let [again (future (ack id 2 seen))]
      (until #(buffered? id 2))
      (is (= 1 (ack id 1 seen)))
      (is (= 2 (result again)))
      (is (= [1 2] @seen)))))
(deftest full-buffer-admits-the-missing-predecessor
  (let [id (client) seen (atom []) two (future (ack id 2 seen 2000 1))]
    (until #(buffered? id 2))
    (is (= 1 (ack id 1 seen 2000 1)))
    (is (= 2 (result two)))
    (is (= [1 2] @seen))))
(deftest full-buffer-fails-the-whole-buffered-suffix
  (let [id (client) seen (atom []) two (future (ack id 2 seen 2000 1))]
    (until #(buffered? id 2))
    (let [error (try (ack id 3 seen 2000 1) (catch Exception e e))]
      (is (= "CommitOrderBufferFull" (:code (ex-data error))))
      (is (= 1 (:expectedSequence (ex-data error)))))
    (is (= "CommitOrderBufferFull" (:code (ex-data (result two)))))
    (is (empty? @seen))
    (is (= [1 2 3] (mapv #(ack id % seen) [1 2 3])))
    (is (= [1 2 3] @seen))))
(deftest duplicate-buffered-sequence-is-submitted-once
  (let [id (client) seen (atom []) two (future (ack id 2 seen))]
    (until #(buffered? id 2))
    (let [entered (promise) same (future (deliver entered (Thread/currentThread)) (ack id 2 seen))
          ^Thread thread @entered]
      (until #(and (= Thread$State/WAITING (.getState thread))
                   (some (fn [^StackTraceElement frame] (.contains (.getClassName frame) "commit_order$enqueue")) (.getStackTrace thread))))
      (is (= 1 (ack id 1 seen)))
      (is (= 2 (result two)))
      (is (= 2 (result same)))
      (is (= [1 2] @seen)))))
(deftest duplicate-sequence-cannot-replace-another-operation
  (let [id (client) seen (atom []) two (future (ack id 2 seen))]
    (until #(buffered? id 2))
    (let [error (try (order/enqueue! id 2 "different" (submitter seen 99)) (catch Exception e e))]
      (is (= "CommitOrderSequenceConflict" (:code (ex-data error)))))
    (is (= 1 (ack id 1 seen)))
    (is (= 2 (result two)))
    (is (= [1 2] @seen))))
(deftest handover-does-not-wait-for-acknowledgement
  (let [id (client) first-ack (promise) seen (atom [])
        first (order/enqueue! id 1 "1" #(do (swap! seen conj 1) first-ack))]
    (is (identical? first first-ack))
    (is (= 2 (ack id 2 seen)))
    (is (= [1 2] @seen))
    (is (not (realized? first-ack)))
    (deliver first-ack 1)))
(defn -main [& _]
  (let [r (run-tests 'triplex.gateway.commit-order-test)]
    (println r)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
