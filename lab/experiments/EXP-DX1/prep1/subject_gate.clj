(ns subject-gate
  (:require [clojure.data.json :as json]
            [clojure.test :refer [deftest is testing]]
            [datomic.api :as d]
            [triplex.gateway.group :as group]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject]
            [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as reference]))

(defn deep-seed [input]
  (let [business (for [i (range 256)]
                   (fixture/row (str "deep/" i) fixture/root (str ":depth/" i)
                                (str "value/" i) "_tx/seed"))]
    (rows/row-input (-> input (update "rows" into (map storage/wire-row business))
                             (update "newIds" into (map :id business))))))

(defn native-rows [db]
  (let [v #(scope/value db % :triplex.entity/id)]
    (->> (d/datoms (d/history db) :aevt :triplex.entity/row)
         (map (fn [x] [(v (:e x)) (:v x) (:added x)]))
         frequencies)))

(defn run-replacement [enabled]
  (with-redefs [subject/enabled enabled group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [[seed a b] (reference/edits)
              seed-result (reference/send name (deep-seed seed))
              options (main/write-options name)
              native d/transact-async
              submitted (atom [])
              send-edit (fn [input k] (reference/send name (assoc input "sourceK" k "position" 1)))
              results (with-redefs [d/transact-async (fn [c tx & opts]
                                      (swap! submitted conj (ffirst tx))
                                      (apply native c tx opts))
                                    d/with (fn [& _] (throw (AssertionError. "A replacement speculatively ran a transaction")))]
                        [(send-edit a 1) (send-edit b 2)])
              actual (reference/replay-observations name)
              receipt (get-in results [0 :body])
              native-t (get-in receipt ["t" "v"])
              found (reference/expect-receipt name "edit-a" "_tx/edit-a" "edit-a" 2 1001.0)]
          (is (= [200 nil] (reference/outcome seed-result)))
          (is (= [[200 nil] [200 nil]] (mapv reference/outcome results)) (pr-str results))
          (is (= native-t (get-in found ["t" "v"])))
          (is (= (vec (repeat 2 (if enabled subject/ident :triplex/commit))) @submitted))
          (is (= (if enabled (str subject/ident) nil) (:subjectFunction options)
                 (get receipt "subjectSave") (get-in results [1 :body "subjectSave"])))
          (is (= [409 "OperationDuplicate"] (reference/outcome (send-edit a 1))))
          (is (= [409 "CommandConflict"] (reference/outcome (send-edit (assoc a "operationId" "new-operation") 1))))
          (is (= {"status" "absent"} (reference/operation name "new-operation")))
          (is (= found (get (reference/claim name "edit-a") "receipt")))
          (is (= 3 (storage/head-position (d/db conn))))
          (is (= "intermediate value" (get-in actual [:feed 2 2 "retract" "value" "value"])))
          (is (= 1001.0 (get-in actual [:feed 2 2 "retract" "recordedAt"])))
          (is (= 1002.0 (get-in actual [:feed 2 2 "retract" "retractedAt"])))
          {:nativeRows (native-rows (d/db conn))
           :observations (-> actual (update :receipts #(mapv (fn [r] (update r "receipt" dissoc "t")) %))
                                    (update :operations #(mapv (fn [r] (dissoc r "t")) %)))})))))

(deftest one-field-replacement
  (is (= (run-replacement false) (run-replacement true))))

(defn -main [& _]
  (let [result (clojure.test/run-tests 'subject-gate)]
    (println "DX-PREP1_SUBJECT" (json/write-str (assoc result :attempt (System/getenv "PREP1_SUBJECT_ATTEMPT"))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
