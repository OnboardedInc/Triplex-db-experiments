(ns wfix1-policy
  (:require [clojure.test :refer [deftest is]]
            [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.selftest :as rows] [triplex.gateway.storage :as storage]
            [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as w]))

(defn frame [id kind hint facts fresh]
  (rows/row-input
   (cond-> {"operationId" id "sourceK" nil "scopeWide" false "position" 1 "span" 1
            "writeClass" kind "newIds" fresh "rows" (mapv storage/wire-row facts)
            "claims" [{"commandId" id "txId" (str "_tx/" id) "timestamp" 1000.0}]}
     hint (assoc "groupAccount" hint))))

(defn fact [id owner attr kind value tx]
  (assoc (fixture/row id owner attr nil tx) :entity_type nil :value_type kind
    (if (= "number" kind) :value_number :value_string) value))

(deftest hinted-runtime-publishes-scope-maintenance
  (with-redefs [policy/priority? true group/enabled true]
    (w/in-scope
     (fn [name conn]
       (let [checkpoint "_triplex/consumer-checkpoint/synthetic"
             position ":triplex/consumer-checkpoint-position"
             cursor (fact "cursor-0" checkpoint position "number" 0.0 "_tx/init")
             init [(fact "consumer" checkpoint ":triplex/consumer-checkpoint-name" "string" "synthetic" "_tx/init") cursor]
             advance [(fact "cursor-1" checkpoint position "number" 1.0 "_tx/advance")
                      (assoc cursor :retracted_at 1000.0 :retracted_position 1 :retract_tx_id "_tx/advance")]
             config "_triplex/config/snapshot/release"
             ref "_triplex/config/ref/current"
             release [(fact "snapshot" config ":triplex/config-data" "string" "release-data" "_tx/release")
                      (fact "reference" ref ":triplex/ref-target" "ref" config "_tx/release")]
             send #(w/outcome (w/send name %))
             system #(frame %1 %2 "a" %3 %4)]
         (is (= [200 nil] (send (assoc (w/save "live" "acct/a/person" "a-value" nil) "groupAccount" "a"))))
         (is (= [200 nil] (send (system "init" "notice" init ["consumer" "cursor-0"]))))
         (is (= [200 nil] (send (system "advance" "notice" advance ["cursor-1"]))))
         (is (= [200 nil] (send (system "release" "activation" release ["snapshot" "reference"]))))
         (is (= [409 "CasConflict"] (send (system "stale" "notice" advance ["cursor-1"]))))
         (is (= [400 "InvalidValue"] (send (assoc (w/save "wrong" "acct/b/person" "b-value" nil) "groupAccount" "a"))))
         (let [illegal (conj release (fact "foreign" "acct/b/person" ":v" "string" "b" "_tx/mixed"))]
           (is (= [400 "InvalidValue"] (send (system "mixed" "activation" illegal ["snapshot" "reference" "foreign"])))))
         (is (= 4 (storage/head-position (d/db conn))))
         (let [stored (fn [owner]
                        (get-in (w/route name "v1" "read" {"entityIds" [owner]}) [:body "rows"]))]
           (is (= #{["consumer" "synthetic"] ["cursor-1" 1.0]}
                  (set (map #(vector (get-in % ["id" "v"]) (or (get-in % ["value_string" "v"])
                                                               (get-in % ["value_number" "v"]))) (stored checkpoint)))))
           (is (= ["reference" config] (mapv #(get-in (first (stored ref)) [% "v"]) ["id" "value_string"])))
           (is (= "release-data" (get-in (first (stored config)) ["value_string" "v"])))))))))
