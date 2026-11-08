(ns triplex.gateway.selftest
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as gateway] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema]))

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
  (let [base "datomic:mem://" scope "[\"triplex-scope-v1\",\"test\",\"tenant\",\"da00\",\"1\"]"
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
    (is (thrown? Exception (gateway/scope-name "[\"triplex-scope-v1\",\"prod\",\"t\",\"d\",\"1\"]")))))
(defn -main [& _]
  (let [{:keys [fail error] :as result} (run-tests 'triplex.gateway.selftest)]
    (println (json/write-str result))
    (shutdown-agents)
    (System/exit (if (zero? (+ fail error)) 0 1))))
