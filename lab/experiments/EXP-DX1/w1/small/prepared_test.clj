(ns small-prepared-test
  (:require [clojure.test :refer :all] [clojure.data.json :as json] [clojure.walk :as walk]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as gt]
            [triplex.gateway.selftest :as fixture] [triplex.gateway.small-row :as small-row]))

(deftest view-dependent-preparation
  (with-redefs [group/reuse-prepared true small-row/enabled true main/uri-template "datomic:mem://{db}"]
    (let [scope (json/write-str ["triplex-scope-v1" "test" "prepared" (str (java.util.UUID/randomUUID)) 0])
          db (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri db))
          view (d/db conn)
          first-write (gt/input {:id "first" :add "one"})
          second-write (fixture/row-input (walk/postwalk-replace {"_tx/second" "_tx/first"} (gt/input {:id "second" :add "two"})))
          data (storage/tx-data view second-write)
          p (second (first data))
          prepare (storage/prepared-for data second-write p)]
      (try
        (is (identical? data (prepare view)))
        (is (= :ok (:outcome (gt/invoke db conn first-write))))
        (let [after (d/db conn) rebuilt (prepare after)]
          (is (not (identical? data rebuilt)))
          (is (= (storage/tx-data after second-write) rebuilt))
          (is (some #(and (vector? %) (= :triplex.scope/feed-irregular (nth % 2 nil)))
                    (:ops (second (first rebuilt))))))
        (finally (main/delete-scope! nil scope))))
    (is (= (gt/run-arm false) (gt/run-arm true)))))

(let [r (run-tests 'small-prepared-test)]
  (println "W1_PREPARED" (json/write-str (assoc r :attempt (System/getenv "W1_ATTEMPT"))))
  (shutdown-agents)
  (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1)))
