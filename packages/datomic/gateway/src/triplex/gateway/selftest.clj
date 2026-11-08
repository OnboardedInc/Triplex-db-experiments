(ns triplex.gateway.selftest
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.storage :as storage] [triplex.gateway.query :as query] [triplex.gateway.main :as gateway] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema]))

;; [EXP-DA00] Why: execute actual Peer API and codec offline. Rejected: mocked Datomic (cannot prove schema installation).
(deftest codec-vectors
  (doseq [wire (json/read-str (slurp "/opt/gateway/codec-vectors.json"))]
    (let [decoded (codec/decode-value wire) encoded (codec/encode-value (get wire "t") decoded)]
      (is (= wire encoded))
      (when (and (= "double" (get wire "t")) (zero? (get wire "v")))
        (is (= (Double/doubleToRawLongBits (double (get wire "v"))) (Double/doubleToRawLongBits (double (get encoded "v"))))))))
  (doseq [x [Double/NaN Double/POSITIVE_INFINITY Double/NEGATIVE_INFINITY]]
    (is (thrown? Exception (codec/decode-value {"t" "double" "v" x}))))
  (doseq [wire [{"t" "long" "v" "9223372036854775808"} {"t" "long" "v" 1} {"t" "bool" "v" "true"} {"t" "ref" "v" "01"}]]
    (is (thrown? Exception (codec/decode-value wire)))))
(deftest database-lifecycle
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"da00\",1]"
        result (gateway/create-scope! base scope) name (:db result) db (d/db (gateway/connection (str base name)))]
    (is (= schema/schema-hash (:schemaHash result)))
    (is (= scope (gateway/stored-scope db)))
    (is (= :db.type/long (:db/valueType (d/entity db :triplex.tx/position))) )
    (is (false? (:created (gateway/create-scope! base scope))))
    (is (= {"t" "long" "v" "0"} (:position (gateway/basis base name))))
    @(d/transact (gateway/connection (str base name)) [{:triplex.scope/key scope :triplex.scope/position 7}])
    (is (false? (:created (gateway/create-scope! base scope))))
    (is (= {"t" "long" "v" "7"} (:position (gateway/basis base name))))
    (is (thrown? Exception (gateway/assert-scope db "other")))
    (is (:deleted (gateway/delete-scope! base scope)))
    (is (thrown? Exception (gateway/scope-name "[\"triplex-scope-v1\",\"prod\",\"t\",\"d\",1]")))))
(deftest speculative-fact-store
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"da01-speculation\",1]"
        name (:db (gateway/create-scope! base scope)) uri (str base name) conn (gateway/connection uri)
        db (d/db conn) handle (:handle (storage/begin! name db))
        row {:id "support-1" :entity_id "subject" :attribute ":value" :value_type "number"
             :value_number -0.0 :recorded_at 1.5 :recorded_position 1 :valid_from 1.0 :schema_version 1 :tx_id "tx-1"}
        input {"sourceK" 0 "position" 1 "operationId" "operation-1" "rows" [(storage/wire-row row)] "newIds" ["support-1"] "claims" []}]
    (try
      (let [speculative (:db-after (d/with db (storage/tx-data db input)))]
        (is (some? (d/entid speculative [:f/id "support-1"])))
        (is (nil? (d/entid (d/db conn) [:f/id "support-1"])))
        (is (= Long/MIN_VALUE (Double/doubleToRawLongBits (double (query/scalar speculative (d/entid speculative [:f/id "support-1"])))))))
      (is (= 1 (count (:rows (storage/read-rows name db {"handle" handle "staged" input "pattern" {} "basis" {"validAt" 2.0}})))))
      (let [commit (storage/commit! conn db input) current (gateway/sync-db uri)]
        (is (pos? (:datoms commit)))
        (is (= "committed" (:status (storage/operation current "operation-1"))))
        (is (= 1 (count (:rows (query/run name current {"edn" "[:find ?id :in $ $rules :where [?f :f/id ?id] [(triplex.gateway.query/visible $ ?f 2.0 nil nil)]]" "relations" [] "timeoutMs" 1000}))))))
      (is (thrown? Exception (query/check-query! '[:find ?x :where [(clojure.core/slurp "/etc/passwd") ?x]])))
      (finally (storage/release! name handle) (gateway/delete-scope! base scope)))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'triplex.gateway.selftest)]
    (println (json/write-str result))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
