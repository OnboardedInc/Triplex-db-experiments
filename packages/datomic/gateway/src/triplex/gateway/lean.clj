(ns triplex.gateway.lean
  (:require [triplex.gateway.group-cut :as group-cut] [triplex.gateway.slim :as slim] [datomic.api :as d] [clojure.data.json :as json] [triplex.gateway.reach :as reach]))
(set! *warn-on-reflection* false)
;; [DX-B5-L2] Why: only row text and native history contain lean facts; no reified fallback exists.
;; Rejected: empty answers from :f indexes, or decoding through d/entity/d/pull/d/q.
(def columns [:recorded_position :id :entity_id :attribute :value_type :value_string :value_number
              :value_boolean :value_datetime :value_json :recorded_at :valid_from :valid_to
              :created_by :entity_type :schema_version :tx_id])
(def numbers #{:value_number :value_boolean :value_datetime :recorded_at :valid_from :valid_to :schema_version})
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn enabled? [db]
  (contains? #{3 4} (value db (:e (first (d/datoms db :aevt :triplex.scope/key))) :triplex.scope/rows-version)))
(defn unsupported! [route]
  (throw (ex-info (str "Lean layout does not support " route) {:status 409 :code "LayoutUnsupported" :route route})))
(defn prefix [^String id] (str "2" (format "%04x" (.length id)) id))
(defn- decode-column [column value]
  (cond (= column :recorded_position) (Long/parseLong value)
        (and (numbers column) (= value "-0")) -0.0
        :else value))
;; [DX-TAIL1] Why: canonical row texts already decode to a positional vector.
;; Rejected: building a lazy sequence and one key/value vector per column or changing malformed-input behavior.
(defn decode
  ([text] (decode text false))
  ([^String text direct?]
   (let [start (+ 5 (Integer/parseInt text 1 5 16)) ref-start (+ start 36)
         size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)
         values (json/read-str (slim/body (subs text (+ ref-start size 1))))
         live {:retracted_at nil :retracted_position nil :retract_tx_id nil}
         row (if (and direct? (vector? values) (= (count columns) (count values)))
               (persistent! (reduce-kv (fn [acc i value]
                                         (let [column (nth columns i)]
                                           (assoc! acc column (decode-column column value))))
                                       (transient live) values))
               (into live (map (fn [column value] [column (decode-column column value)]) columns values)))]
     (if (= ":_tx/position" (:attribute row)) (assoc row :value_number (double (:recorded_position row))) row))))
(defn by-id [db id]
  (let [p (prefix id) datom (first (d/index-range db :triplex.entity/row p nil))]
    (when (and datom (.startsWith ^String (:v datom) p)) datom)))
(defn history-entity [db eid]
  (let [history (d/history db)
        markers (into {} (map (fn [datom]
                               (let [^String text (:v datom) end (+ 5 (Integer/parseInt text 1 5 16))]
                                 [(subs text 0 end) text])) (d/datoms db :eavt eid :triplex.entity/retired)))
        grouped (group-by :v (d/datoms history :eavt eid :triplex.entity/row))]
    (map (fn [[text datoms]]
           (let [row (decode text) retired (first (filter #(not (:added %)) datoms))
                 ^String marker (get markers (prefix (:id row)))]
             (cond
               marker (let [start (.length ^String (prefix (:id row)))]
                        (assoc row :retracted_position (Long/parseLong marker start (+ start 16) 10)
                                   :retracted_at (reach/bits marker (+ start 16))
                                   :retract_tx_id (subs marker (+ start 32))))
               retired (let [tx (:tx retired)]
                         (assoc row :retracted_at (value db tx :triplex.tx/recorded-at)
                                    :retracted_position (value db tx :triplex.tx/position)
                                    :retract_tx_id (value db tx :triplex.tx/id)))
               :else row))) grouped)))
(defn live-texts [db eid]
  (let [retired (set (map (fn [datom] (let [^String text (:v datom)] (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))
                          (d/datoms db :eavt eid :triplex.entity/retired)))]
    (remove (fn [datom] (let [^String text (:v datom)] (retired (subs text 0 (+ 5 (Integer/parseInt text 1 5 16))))))
            (d/datoms db :eavt eid :triplex.entity/row))))
(defn rows [name db input]
  (let [history? (true? (get input "history")) basis (get input "basis")
        selection (when-not history?
              (try (reach/select-db name db basis)
                   (catch clojure.lang.ExceptionInfo e (when-not (:declined (ex-data e)) (throw e)))))
        [cut _ _ _ inner] selection
        source (or cut db) id (get input "id") pattern (get input "pattern")
        entities (or (get input "entityIds")
                     (when-let [entity (get pattern "entityId")]
                       (when-not (.startsWith ^String entity "?") [entity])))
        eids (cond id (when-let [datom (by-id (if (and cut (not inner)) source (d/history source)) id)] [(:e datom)])
                   entities (keep #(d/entid source [:triplex.entity/id %]) (distinct entities))
                   :else (distinct (map :e (d/datoms (if (and cut (not inner)) source (d/history source)) :aevt :triplex.entity/row))))]
    (filter #(or (nil? id) (= id (:id %)))
      (mapcat (fn [eid]
                (cond inner (map #(decode (:v %)) (:datoms (group-cut/entity-slice inner eid)))
                      cut (map #(decode (:v %)) (live-texts source eid))
                      :else (history-entity db eid))) eids))))
