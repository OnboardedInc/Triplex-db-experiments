(ns s5-attack3-era
  "[DX-S5 third review] R2-2's scenarios on the removal branch's build (DX-ERA2, 03bb49cd3), which has its own rule
  for a save framed before a removal (removal_commit.clj removal-after-source, decline!, decline-check!, after-refusal):
  judged by the save's own sourceK, else `removalSeen`, else declined; a framed save's declined commands are recorded.
  The same scenarios as s5/attack3_gate.clj's r2-2 tests, so the two rules can be compared case by case. Standalone
  (the removal branch has neither the several-owners nor the creation writer, which s5/fuzz.clj loads). Run by
  s5/clj-run3.sh (mode era) on the image's /opt/builds/era2 tree. Each case prints one DX-S5R3_ERA line."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.selftest :as rows]
            [triplex.gateway.subject-save :as subject]
            [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 31000000))
(defn- line [m] (println "DX-S5R3_ERA" (json/write-str m)))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- general [f] (with-redefs [subject/plan (fn [& _] nil)] (f)))

(defn- row [id e entity-type attr tx]
  {:id id :entity_id e :entity_type entity-type :attribute attr :value_type "string" :value_string nil
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn frame
  "One save as the SDK frames it (s5/fuzz.clj's frame, string values only). facts: {:owner :field :value :pred} with
  :pred the current {:id :value} or nil."
  [{:keys [command source facts]}]
  (let [{:keys [tx id]} (wide/identity-block :wide (swap! counter inc))
        n (volatile! -1) next-id #(id (vswap! n inc))
        business (mapv (fn [f] (assoc (row (next-id) (:owner f) nil (:field f) tx) :value_string (:value f))) facts)
        retired (vec (keep (fn [f] (when (:pred f) [(:owner f) (:field f) (:pred f)])) facts))
        old (mapv (fn [[owner field pred]] (assoc (row (:id pred) owner nil field "_tx/earlier") :value_string (:value pred)
                                                  :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx)) retired)
        written (vec (distinct (map :owner facts)))
        j (fn [attr] (row (next-id) tx "_Transaction" attr tx))
        changes (concat (map (fn [r f] {"op" "assert" "tripleId" (:id r) "entityId" (:entity_id r) "attribute" (:attribute r)
                                        "value" {"type" "string" "value" (:value f)} "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
                             business facts)
                        (map (fn [[owner field pred]] {"op" "retract" "tripleId" (:id pred) "entityId" owner "attribute" field
                                                       "value" {"type" "string" "value" (:value pred)} "validFrom" 0.0 "recordedAt" 1000.0
                                                       "assertionTxId" "_tx/earlier" "retractedAt" 1000.0 "retractionTxId" tx}) retired))
        journal (-> [(assoc (j ":_tx/position") :value_type "number" :value_number 1.0)
                     (assoc (j ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)]
                    (into (map #(assoc (j ":_tx/changed-entity") :value_string %) written))
                    (conj (assoc (j ":_tx/command-id") :value_string command))
                    (into (map (fn [c] (assoc (j ":_tx/change") :value_type "json" :value_json (json/write-str c))) changes)))
        fresh (into business journal)]
    (rows/row-input
      {"sourceK" source "span" 1 "position" 1 "entities" written "operationId" (str command "/" (swap! counter inc))
       "rows" (mapv storage/wire-row (into fresh old)) "newIds" (mapv :id fresh)
       "claims" [{"commandId" command "txId" tx "timestamp" 1000.0}]})))

(defn- cur [name owner field]
  (let [r (reference/route name "v1" "read" {"entityIds" [owner] "basis" {"validAt" 5.0}})]
    (some (fn [row] (when (= field (get-in row ["attribute" "v"])) {:id (get-in row ["id" "v"]) :value (get-in row ["value_string" "v"])}))
          (get-in r [:body "rows"]))))
(defn- protected! [name] (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false}))
(defn- erase! [name cmd selectors] (reference/route name "v1" "erase" {"commandId" cmd "selectors" selectors}))
(defn- at-submit [name input competing]
  (let [orig storage/submit! fired (atom false) id (get input "operationId")]
    (with-redefs [storage/submit! (fn [conn data request timeline & more]
                                    (when (and (= id (get request "operationId")) (compare-and-set! fired false true)) (competing))
                                    (apply orig conn data request timeline more))]
      (reference/send name input))))
(defn- stamp [name] (let [r (reference/route name "v2" "erasure-frontier" nil)] (or (get-in r [:body "removalStamp"]) (get-in r [:body "seq"]))))

(deftest r2-2-replays-across-a-removal
  (doseq [[label path] [["one owner" :fast] ["general" :general]]]
    (reference/in-scope
      (fn [name conn]
        (protected! name)
        (let [S "acct/p11/subject/s" wrap (if (= path :general) general (fn [f] (f)))
              _ (wrap #(reference/send name (frame {:command (str "seed-" (swap! counter inc)) :source (head conn)
                                                    :facts [{:owner S :field ":p/secret" :value "old secret"} {:owner S :field ":a/f" :value "x"}]})))
              cmd (str "c-" (swap! counter inc))
              first-source (head conn)
              attempt (frame {:command cmd :source first-source :facts [{:owner S :field ":p/secret" :value "value chosen before" :pred (cur name S ":p/secret")}]})
              ;; A concurrent edit of the same field refuses the first attempt (CasConflict), before the removal.
              _ (wrap #(reference/send name (frame {:command (str "other-" (swap! counter inc)) :source (head conn)
                                                    :facts [{:owner S :field ":p/secret" :value "y" :pred (cur name S ":p/secret")}]})))
              refused (wrap #(reference/send name attempt))
              removed (erase! name "remove-s" [{"entityId" S "attribute" ":p/secret"}])
              ;; The SDK's replay on this branch: a fresh read, its own fresh source, the same command and values.
              replay (wrap #(reference/send name (frame {:command cmd :source (head conn) :facts [{:owner S :field ":p/secret" :value "value chosen before" :pred (cur name S ":p/secret")}]})))
              stored (:value (cur name S ":p/secret"))
              r {:case "a save refused before a removal, replayed after it" :build "era2" :writer label
                 :firstAttempt (reference/outcome refused) :removal (:status removed) :sdkReplay (reference/outcome replay)
                 :storedAfter stored}]
          (line r)
          (is (= 200 (:removal r)))
          (is (not= "value chosen before" stored) [label "a value chosen before the removal is not stored by the replay"]))))))

(deftest r2-2-race-then-a-resend-of-the-same-command
  (doseq [[label path creates?] [["one owner" :fast false] ["general" :general false] ["general, a new entity" :general true]]]
    (reference/in-scope
      (fn [name conn]
        (protected! name)
        (let [S (str "acct/p13/subject/" (if creates? (str "new" (swap! counter inc)) "s"))
              wrap (if (= path :general) general (fn [f] (f)))
              _ (when-not creates? (wrap #(reference/send name (frame {:command (str "seed-" (swap! counter inc)) :source (head conn) :facts [{:owner S :field ":p/secret" :value "old"}]}))))
              cmd (str "race-" (swap! counter inc))
              input (frame {:command cmd :source (head conn) :facts [{:owner S :field ":p/secret" :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})
              removed (atom nil)
              reply (wrap #(at-submit name input (fn [] (reset! removed (erase! name "remove-race" [{"entityId" S "attribute" ":p/secret"}])))))
              resend (wrap #(reference/send name (frame {:command cmd :source (head conn) :facts [{:owner S :field ":p/secret" :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})))
              new-command (wrap #(reference/send name (frame {:command (str "new-" (swap! counter inc)) :source (head conn) :facts [{:owner S :field ":p/secret" :value "chosen before" :pred (when-not creates? (cur name S ":p/secret"))}]})))
              r {:case "a save racing a removal, then a fresh resend of the same command, then the same values under a new command" :build "era2"
                 :writer label :removal (:status @removed) :race (reference/outcome reply) :resendSameCommand (reference/outcome resend)
                 :newCommand (reference/outcome new-command)}]
          (line r)
          (is (= 409 (first (:race r))) label))))))

(deftest r2-2-an-optimistic-save-against-an-old-removal
  (reference/in-scope
    (fn [name conn]
      (protected! name)
      (let [S "acct/p12/subject/s"
            _ (reference/send name (frame {:command (str "seed-" (swap! counter inc)) :source (head conn) :facts [{:owner S :field ":p/secret" :value "first"}]}))
            removed (erase! name "remove-early" [{"entityId" S "attribute" ":p/secret"}])
            seen (stamp name)
            no-source (reference/send name (dissoc (frame {:command (str "opt-" (swap! counter inc)) :source nil :facts [{:owner S :field ":p/secret" :value "new value after the removal"}]}) "sourceK"))
            with-stamp (reference/send name (assoc (dissoc (frame {:command (str "opt-" (swap! counter inc)) :source nil :facts [{:owner S :field ":p/secret" :value "new value after the removal"}]}) "sourceK")
                                                   "removalSeen" (if (string? seen) (Long/parseLong seen) seen)))
            r {:case "an optimistic save (no source) of a new value long after a removal of its family" :build "era2"
               :removal (:status removed) :stamp seen :noSourceNoStamp (reference/outcome no-source) :withTheStamp (reference/outcome with-stamp)}]
        (line r)
        (is (= [200 nil] (:withTheStamp r)))))))

(defn main []
  (let [r (clojure.test/run-tests 's5-attack3-era)]
    (println "DX-S5R3_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                     :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
