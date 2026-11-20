(ns subject-gate
  (:require [clojure.data.json :as json]
            [clojure.test :refer [deftest is testing]]
            [clojure.walk :as walk]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit]
            [triplex.gateway.group :as group]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.selftest :as rows]
            [triplex.gateway.small-row :as small-row]
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
  (with-redefs [subject/enabled enabled subject/prefetch? false group/enabled false
                policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [[seed a b] (reference/edits)
              seed-result (reference/send name (deep-seed seed))
              options (main/write-options name)
              handle (get-in (reference/route name "v1" "snapshot" {}) [:body "handle"])
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
          (let [read (fn [body]
                       (mapv #(get-in % ["id" "v"])
                             (get-in (reference/route name "v1" "read"
                                       (merge {"entityIds" [fixture/root] "pattern" {"attribute" ":v"}
                                               "basis" {"validAt" 5.0}} body)) [:body "rows"])))]
            (is (string? handle))
            (is (= ["old"] (read {"handle" handle})))
            (is (= ["new"] (read {})))
            (is (= [200 nil] (reference/outcome (reference/route name "v1" "release" {"handle" handle})))))
          {:nativeRows (native-rows (d/db conn))
           :observations (-> actual (update :receipts #(mapv (fn [r] (update r "receipt" dissoc "t")) %))
                                    (update :operations #(mapv (fn [r] (dissoc r "t")) %)))})))))

(deftest one-field-replacement
  (is (= (run-replacement false) (run-replacement true))))

(deftest clock-fragments-are-ordinary-row-bytes
  (let [[seed input] (reference/edits)
        prior {"old" (commit/recorded-row (get-in seed ["rowTexts" "old"]))}
        ids (set (input "newIds"))
        template #(commit/rewrite-change %1 %2 ids prior)]
    (doseq [[id raw] (input "rowTexts")
            :when (ids id)
            :let [row (lean/decode raw)
                  offset (+ 44 (count id) (if (= "ref" (:value_type row)) (count (:value_string row)) 0))]
            [position clock] [[1 -0.0] [8 1003.0] [99 1.99e32]]]
      (let [original [:triplex/row raw 1 offset :row]
            staged [:triplex/row (subs raw 0 offset) 1 offset :row
                    (small-row/ordinary-plan raw offset template)]
            reference-stamp (commit/stamp true clock ids 0 1 position false prior)
            subject-stamp (commit/stamp true clock #{} 0 1 position false nil)]
        (is (= (reference-stamp original) (subject-stamp staged)) [id position clock])))))

(deftest disjoint-people
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (reference/in-scope
      (fn [name conn]
        (let [ids (range 96)
              owners (mapv #(str "acct/a" (mod % 10) "/person-" %) ids)
              fact-id #(str "older-" %)
              op #(str "replace-" %)
              old (mapv (fn [i owner] (assoc (fixture/row (fact-id i) owner ":v" (str "before-" i) "shared-seed")
                                            :entity_type nil)) ids owners)
              seed (rows/row-input {"operationId" "shared-seed" "position" 1 "span" 1 "scopeWide" false
                                    "rows" (mapv storage/wire-row old) "newIds" (mapv :id old)})
              _ (is (= [200 nil] (reference/outcome (reference/send name seed))))
              offers (mapv (fn [i owner]
                             (assoc (walk/postwalk-replace {fixture/root owner}
                                      (reference/edit-frame (op i) (str "newer-" i) (str "after-" i)
                                                             0.0 nil (fact-id i)))
                                    "sourceK" 1)) ids owners)
              results (->> offers (partition-all 8)
                           (into [] (mapcat (fn [turn] (mapv deref (mapv #(future (reference/send name %)) turn))))))
              ack (mapv :body results)]
          (is (= 96 (count results)))
          (is (every? #(= [200 nil] (reference/outcome %)) results))
          (is (= #{(str subject/ident)} (into #{} (map #(get % "subjectSave")) ack)))
          (is (not-any? #(get % "subjectReplan") ack))
          (is (= (set (range 2 98)) (into #{} (map #(parse-long (get-in % ["position" "v"]))) ack)))
          (is (= 97 (storage/head-position (d/db conn))))
          (doseq [[i response] (map vector ids ack)]
            (let [receipt (reference/operation name (op i))]
              (is (= (select-keys response ["operationId" "position" "recordedAt" "t"])
                     (dissoc receipt "status")))))
          (let [by-op (into {} (map (juxt #(str "_tx/" (get % "operationId")) identity)) ack)
                journals (reference/feed name 1 100)]
            (is (= 96 (count journals)))
            (doseq [[id p :as page] journals
                    :let [record (by-op id) changes (reference/changes page)
                          i (subs id (count "_tx/replace-"))]]
              (is (= ["newer-" "older-"] (mapv #(subs (get-in changes [% "tripleId"]) 0 6) ["assert" "retract"])))
              (is (= [(str "after-" i) (str "before-" i)]
                     (mapv #(get-in changes [% "value" "value"]) ["assert" "retract"])))
              (is (= p (parse-long (get-in record ["position" "v"]))))
              (is (= (get-in record ["recordedAt" "v"])
                     (get-in changes ["assert" "recordedAt"])
                     (get-in changes ["retract" "retractedAt"]))))))))))

(defn -main [& _]
  (let [result (clojure.test/run-tests 'subject-gate)]
    (println "DX-PREP1_SUBJECT" (json/write-str (assoc result :attempt (System/getenv "PREP1_SUBJECT_ATTEMPT"))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail result) (:error result))) 0 1))))
