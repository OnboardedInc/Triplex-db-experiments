(ns triplex.compact.legacy
  (:require [datomic.api :as d]
            [clojure.data.json :as json]
            [triplex.compact.floor :as floor]
            [triplex.compact.fixtures :as f]
            [triplex.gateway.main :as main]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.selftest :as fixture]
            [triplex.gateway.storage :as storage]))

(defn tagged [n]
  (let [s (str n)] (str "R" (subs "0000000000000000000000000" (count s)) s)))
(def refs #{"answers" "documents" "decisions" "next" "location" "jurisdiction"})
(defn entity [person e] (str "acct/" (f/account person) "/" e))
(defn type-of [a v] (cond (refs a) "ref" (integer? v) "integer" :else "string"))
(defn value-text [person a v]
  (if (refs a) (entity person v) (str v)))
(def clock 1793793600000.0)
(defn row [id e a value-type v tx pos]
  {:id id :entity_id e :attribute a :value_type value-type :value_string v :valid_from 0.0
   :recorded_at clock :recorded_position pos :schema_version 1 :tx_id tx})
(defn create! []
  (let [scope (json/write-str ["triplex-scope-v1" "test" "compact-control" floor/attempt 0])
        opened (main/create-scope! nil scope "lean" true true)]
    (assert (:created opened))
    {:name (:db opened) :conn (main/connection (main/db-uri (:db opened)))}))
(defn initial-id [person index] (tagged (+ (* person 1000) index)))
(defn seed-rows [person facts]
  (mapv (fn [i [e a v]] (row (initial-id person i) (entity person e) a (type-of a v)
                            (value-text person a v) "seed" 1))
        (range) (f/seed-facts person facts)))
(defn seed! [{:keys [conn]} people facts]
  ;; [DX-COMPACT1] Why: install matched current rows with the incumbent encoder and no application activity during the measurement.
  ;; Rejected: charging one side for seed RPCs in the save timings.
  (loop [cohorts (partition-all 8 (range people)) p 1 identities {}]
    (if-let [group (first cohorts)]
      (let [rows (vec (mapcat #(map (fn [r] (assoc r :recorded_position p)) (seed-rows % facts)) group))
            entities (mapv (fn [[id rs]]
                            {:db/id (str "seed:" id) :triplex.entity/id id :triplex.entity/rev p
                             :triplex.entity/row (mapv fixture/row-text rs)}) (group-by :entity_id rows))
            data (conj entities {:db/id "datomic.tx" :triplex.tx/position p :triplex.tx/max-recorded-at clock
                                :triplex.tx/recorded-at clock :triplex.tx/id (str "seed-" p)})
            report (floor/transact! conn data)
            db (:db-after report)
            a (d/entid db :triplex.entity/row)
            observed (filter #(and (= a (:a %)) (:added %)) (:tx-data report))]
        (assert (= (set (map fixture/row-text rows)) (set (map :v observed))))
        (recur (next cohorts) (inc p) (into identities (map #(vector % p) group))))
      identities)))

(defn field-row [person serial [e a v] index tx]
  (row (tagged (+ 10000000000 (* serial 1000) index)) (entity person e) a (type-of a v) (value-text person a v) tx 1))
(defn change-row [serial tx i change]
  (assoc (row (tagged (+ 10000000000 (* serial 1000) 200 i)) tx ":_tx/change" "json" nil tx 1)
         :value_json (json/write-str change) :entity_type "_Transaction"))
(defn correction [person serial width]
  (let [tx (str "_tx/" (tagged (+ 20000000000 serial))) command (str "write-" serial)
        adds (mapv #(field-row person serial %1 %2 tx) (f/correction person serial width) (range))
        by-id (into {} (map (juxt :id identity) (seed-rows person 160)))
        olds (mapv (fn [index] (assoc (by-id (initial-id person index))
                         :retracted_at clock :retracted_position 1 :retract_tx_id tx)) (f/replace-ordinals width))
        stamp (fn [i a type v] (assoc (row (tagged (+ 10000000000 (* serial 1000) 250 i)) tx a type v tx 1)
                                     :entity_type "_Transaction"))
        journal (concat [(assoc (stamp 0 ":_tx/position" "number" nil) :value_number 1.0)
                         (assoc (stamp 1 ":_tx/instant" "datetime" nil) :value_datetime clock)
                         (stamp 2 ":_tx/changed-entity" "string" (entity person (f/root person)))
                         (stamp 3 ":_tx/command-id" "string" command)]
                       (map (partial change-row serial tx) (range)
                            (concat
                              (for [r adds] {:op "assert" :entityId (:entity_id r) :attribute (:attribute r)
                                             :value {:type (:value_type r) :value (:value_string r)}
                                             :tripleId (:id r) :validFrom (:valid_from r) :validTo nil})
                              (for [r olds] {:op "retract" :entityId (:entity_id r) :attribute (:attribute r)
                                             :tripleId (:id r) :recordedAt (:recorded_at r) :retractedAt clock}))))
        fresh (into adds journal)]
    (fixture/row-input
      {"operationId" command "position" 1 "span" 1 "sourceK" nil "assignRecordTime" true
       "scopeWide" false "entities" (vec (distinct (map :entity_id adds)))
       "groupAccount" (f/account person) "newIds" (mapv :id fresh)
       "claims" [{"commandId" command "txId" tx "timestamp" clock}]
       "rows" (mapv storage/wire-row (concat fresh olds))})))

(defn save! [{:keys [name conn]} in]
  (let [r (storage/commit! name conn (d/db conn) in)]
    (assert (= (get in "operationId") (:operationId r)))
    {:position (Long/parseLong (get-in r [:position "v"]))
     :nativeT (Long/parseLong (get-in r [:t "v"]))
     :command (:operationId r) :nativeMicros (:transactMicros r)}))

(defn collapse [{:keys [entity_id attribute value_type value_string recorded_position]} person]
  (let [prefix (str "acct/" (f/account person) "/")]
    {:e (subs entity_id (count prefix)) :a attribute
     :v (case value_type
          "integer" (Long/parseLong value_string)
          "ref" (subs value_string (count prefix))
          value_string)
     :tx recorded_position}))

(defn world [{:keys [name conn]} person mode position]
  (let [db (d/db conn) root (f/root person)
        entities (vec (distinct (map #(entity person (first %)) (f/seed-facts person 160))))
        rows (if (= :current mode)
               (mapcat (fn [e]
                         (when-let [eid (d/entid db [:triplex.entity/id e])]
                           (map #(lean/decode (:v %)) (lean/live-texts db eid)))) entities)
               (lean/rows name db {"entityIds" entities "basis" {"recordedPosition" position}}))]
    {:subject root :facts (mapv #(collapse % person) rows)}))
