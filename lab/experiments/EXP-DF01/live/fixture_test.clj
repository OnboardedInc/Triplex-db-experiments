(ns fixture-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json]
            [triplex.gateway.storage :as storage]))

;; [EXP-DF01] Why: invoke the deployed decode-row/fact-map path, including its long conversion. Rejected: a JS-only non-null check (could diverge from the peer).
(deftest shared-live-fixture-schema-version
  (let [wire (json/read-str (slurp (System/getenv "DF01_WIRE_FIXTURE")))
        metadata {:position 1 :recorded-at 7000.0 :id "tx1"}
        fact (storage/fact-map (storage/decode-row wire) metadata)]
    (is (= 1 (:f/schema-version fact)))
    (is (instance? Long (:f/schema-version fact)))
    (is (= "fact-1" (:f/id fact)))
    (is (= "synthetic-value" (:f.v/string fact)))
    (is (thrown? NullPointerException
                 (storage/fact-map (storage/decode-row (assoc wire "schema_version" nil)) metadata)))
    (is (thrown? NullPointerException
                 (storage/fact-map (storage/decode-row (dissoc wire "schema_version")) metadata)))))

(defn -main [& _]
  (let [result (run-tests 'fixture-test)]
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
