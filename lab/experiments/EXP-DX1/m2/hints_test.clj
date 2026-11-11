(ns hints-test
  (:require [clojure.test :refer :all] [datomic.api :as d]
            [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [triplex.gateway.scope :as scope] [triplex.gateway.commit-order-test]))
;; [DX-M2] Why: prove forwarding and stale speculation fallback, independently of perf.
;; Rejected: testing only an option string (would miss accidentally submitting expanded data).
(deftest forwarding
  (let [seen (atom []) data [[:opaque :payload]] timeline (atom {})]
    (with-redefs [storage/commit-hints? true d/db (constantly :db)
                  d/with (fn [& args] (swap! seen conj args) {:hints :opaque-hints :tx-data [:wrong]})
                  d/transact-async (fn [& args] (swap! seen conj args) (delay :ok))]
      (is (= :ok @(storage/submit! :conn data {} timeline)))
      (is (= [[:db data :return-hints true] [:conn data :hints :opaque-hints]] @seen)))))
(deftest stale-hint-fallback
  (let [seen (atom nil) timeline (atom {})]
    (with-redefs [storage/commit-hints? true d/db (constantly :db)
                  d/with (fn [& _] (throw (ex-info "speculative conflict" {})))
                  d/transact-async (fn [& args] (reset! seen args) (delay :ok))]
      (is (= :ok @(storage/submit! :conn [:original] {} timeline)))
      (is (= [:conn [:original]] @seen))
      (is (number? (:hintsDeclined @timeline))))))
(deftest disabled-does-no-speculation
  (with-redefs [storage/commit-hints? false d/with (fn [& _] (throw (Error. "must not speculate")))
                d/transact-async (fn [& args] (is (= [:conn [:original]] args)) (delay :ok))]
    (is (= :ok @(storage/submit! :conn [:original] {} (atom {}))))))
(deftest real-hints-equivalent
  (let [key (str "[\"triplex-scope-v1\",\"test\",\"test\",\"m2-" (java.util.UUID/randomUUID) "\",0]")
        name (:db (main/create-scope! main/uri-template key "lean" true))
        conn (main/connection (main/db-uri name)) e (d/entid (d/db conn) [:triplex.scope/key key])]
    (try
      (doseq [p (range 1 101)]
        (let [data [[:triplex/commit {:scope e :source nil :provisional 1 :span 1
                                     :lean true :live [] :entities [] :ops [{:db/id "datomic.tx" :triplex.tx/position [:triplex/position 1]}]
                                     :times [(double p)] :replay-safe true :journal-entities []}]]
              db (d/db conn) plain (d/with db data) hinted (d/with db data :return-hints true)
              signature (fn [r] (mapv #(vector (:e %) (:a %) (:v %) (:added %)) (remove #(= (:a %) (d/entid db :db/txInstant)) (:tx-data r))))]
          (is (some? (:hints hinted)) "This stored commit function must produce real prefetch hints")
          (is (= (signature plain) (signature hinted)))
          (if (odd? p) @(d/transact-async conn data :hints (:hints hinted)) @(d/transact-async conn data))
          (is (= p (storage/head-position name (d/db conn))))
          (is (= (double p) (scope/max-recorded-at (d/db conn) e)))))
      ;; Hints from an earlier basis must not freeze the transaction function's head.
      (let [data [[:triplex/commit {:scope e :source nil :provisional 1 :span 1
                                   :lean true :live [] :entities [] :ops [{:db/id "datomic.tx" :triplex.tx/position [:triplex/position 1]}]
                                   :times [1000.0] :replay-safe true :journal-entities []}]]
            hints (:hints (d/with (d/db conn) data :return-hints true))]
        @(d/transact conn (assoc-in data [0 1 :times] [500.0]))
        @(d/transact-async conn data :hints hints)
        (is (= 102 (storage/head-position name (d/db conn))))
        (is (= 1000.0 (scope/max-recorded-at (d/db conn) e))))
      (finally (main/delete-scope! main/uri-template key)))))
(defn -main [& _]
  (let [r (run-tests 'hints-test 'triplex.gateway.commit-order-test)]
    (println r) (shutdown-agents) (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
