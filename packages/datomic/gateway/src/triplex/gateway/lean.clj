(ns triplex.gateway.lean
  (:require [triplex.gateway.group-cut :as group-cut] [triplex.gateway.slim :as slim] [datomic.api :as d] [triplex.gateway.reach :as reach]
            [triplex.gateway.owner-root :as owner-root]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.trace :as trace]))
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
(defn erasure-protected? [db]
  (or (and (d/entid db :db/excise) (seq (d/datoms db :aevt :db/excise)))
      (and (d/entid db :triplex.scope/erasure-ledger)
           (some :v (d/datoms db :aevt :triplex.scope/erasure-ledger)))))
(defn unsupported! [route]
  (throw (ex-info (str "Lean layout does not support " route) {:status 409 :code "LayoutUnsupported" :route route})))
(defn prefix [^String id] (str "2" (format "%04x" (.length id)) id))
(defn- decode-column [column value]
  (cond (= column :recorded_position) (Long/parseLong value)
        (and (numbers column) (= value "-0")) -0.0
        :else value))
;; [DX-TAIL1] Why: canonical row texts already decode to a positional vector.
;; Rejected: building a lazy sequence and one key/value vector per column or changing malformed-input behavior.
(defn- decode-columns [values direct?]
   (let [live {:retracted_at nil :retracted_position nil :retract_tx_id nil}
         row (if (and direct? (vector? values) (= (count columns) (count values)))
               (persistent! (reduce-kv (fn [acc i value]
                                         (let [column (nth columns i)]
                                           (assoc! acc column (decode-column column value))))
                                       (transient live) values))
               (into live (map (fn [column value] [column (decode-column column value)]) columns values)))]
     (if (= ":_tx/position" (:attribute row)) (assoc row :value_number (double (:recorded_position row))) row)))
(defn decode
  ([text] (decode text false))
  ([^String text direct?] (decode-columns (slim/row-columns text) direct?)))

(def early-attribute-filter (= "1" (System/getenv "TX2_READ_FILTER_EARLY")))

;; [DX-RD1] Why: the exact attribute is already column 3, so unrelated live rows need no public map.
;; Rejected: filtering substrings in the encoded text (would confuse fields and escaping).
(defn decode-live [attribute ^String text]
  (let [values (slim/row-columns text)]
    (when (or (nil? attribute) (= attribute (nth values 3 nil)))
      (decode-columns values (some? attribute)))))
(defn by-id [db id]
  (let [p (prefix id) datom (first (d/index-range db :triplex.entity/row p nil))]
    (when (and datom (.startsWith ^String (:v datom) p)) datom)))
(defn retirement [^String text]
  (let [end (+ 5 (Integer/parseInt text 1 5 16))]
    {:id (subs text 5 end)
     :retracted_position (Long/parseLong text end (+ end 16) 10)
     :retracted_at (reach/bits text (+ end 16))
     :retract_tx_id (subs text (+ end 32))}))
(defn history-entity
  ([db eid] (history-entity db eid nil))
  ([db eid visit-text!]
  (let [history (d/history db)
        ;; [Opus W1] Why: a migrated owner's versions hold its newer rows and their retirement markers.
        ;; Rejected: reading only the owner entity (a covered person's history would lose every save since migration).
        versions? (owner-root/installed? db)
        scan (fn [source a]
               (let [datoms (cond-> (d/datoms source :eavt eid a)
                              versions? (concat (owner-root/version-datoms source eid a)))]
                 (if visit-text!
                   (map (fn [datom] (visit-text! (:v datom)) datom) datoms)
                   datoms)))
        markers (into {} (map (fn [datom]
                               (let [^String text (:v datom) end (+ 5 (Integer/parseInt text 1 5 16))]
                                 [(subs text 0 end) text])) (scan db :triplex.entity/retired)))
        grouped (group-by :v (scan history :triplex.entity/row))]
    (map (fn [[text datoms]]
           ;; [Opus W1] Why: a fold moves a live row from its version to the owner (one retraction, two assertions).
           ;; Rejected: treating the first retraction as the row's end (a moved row would read as retracted).
           (let [row (decode text)
                 retracts (filter #(not (:added %)) datoms)
                 retired (when (and (seq retracts) (>= (count retracts) (- (count datoms) (count retracts))))
                           (apply max-key :tx retracts))
                 ^String marker (get markers (prefix (:id row)))]
             (cond
               marker (merge row (retirement marker))
               retired (let [tx (:tx retired)]
                         (assoc row :retracted_at (ledger/clock db tx)
                                    :retracted_position (value db tx :triplex.tx/position)
                                    :retract_tx_id (ledger/tx-id db tx)))
               :else row))) grouped))))
(declare legacy-live-texts)
(defn live-texts
  ([db eid] (live-texts db eid nil))
  ([db eid visit-text!]
   (if (owner-root/installed? db)
     (owner-root/live db eid visit-text!)
     (legacy-live-texts db eid visit-text!))))
(defn legacy-live-texts
  ([db eid] (legacy-live-texts db eid nil))
  ([db eid visit-text!]
   (let [key-for (fn [datom]
                   (let [^String text (:v datom)]
                     (when visit-text! (visit-text! text))
                     (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))
         retired (set (map key-for (d/datoms db :eavt eid :triplex.entity/retired)))]
     (remove (comp retired key-for) (d/datoms db :eavt eid :triplex.entity/row)))))
(defn rows
  ([name db input] (rows name db input nil))
  ([name db input visit-text!]
  (let [history? (true? (get input "history")) basis (get input "basis")
        selection (when-not history?
              (try (trace/read-span "read.select-db" "peer-call" (reach/select-db name db basis))
                   (catch clojure.lang.ExceptionInfo e (when-not (:declined (ex-data e)) (throw e)))))
        [cut _ _ _ inner] selection
        source (or cut db) id (get input "id") pattern (get input "pattern")
        attr (get pattern "attribute")
        attribute (when (and early-attribute-filter cut (not inner) (string? attr) (not (.startsWith ^String attr "?"))) attr)
        sampled (trace/read-sample?)
        entities (or (get input "entityIds")
                     (when-let [entity (get pattern "entityId")]
                       (when-not (.startsWith ^String entity "?") [entity])))
        decode-datom (fn [x] (when visit-text! (visit-text! (:v x))) (decode (:v x)))
        view (if (and cut (not inner)) source (d/history source))
        ;; [Opus W1] Why: a covered row's datom sits on a version entity whose owner is the person read.
        owner-of (if (owner-root/installed? source) #(owner-root/owner-of view %) identity)
        eids (cond id (when-let [datom (by-id view id)] [(owner-of (:e datom))])
                   entities (keep #(d/entid source [:triplex.entity/id %]) (distinct entities))
                   :else (distinct (map (comp owner-of :e) (d/datoms view :aevt :triplex.entity/row))))]
    (filter #(or (nil? id) (= id (:id %)))
      (mapcat (fn [eid]
                (cond inner (let [slice (group-cut/entity-slice inner eid)]
                              (map decode-datom (if-let [at (:root-db slice)] (live-texts at eid nil) (:datoms slice))))
                      cut (if sampled
                            (let [datoms (trace/span "read.peer-entity" "peer-call" (vec (live-texts source eid visit-text!)))]
                              (trace/span "read.row-decode" "gateway"
                                (trace/counter! :rowTexts (count datoms))
                                (into [] (keep #(if attribute (decode-live attribute (:v %)) (decode (:v %)))) datoms)))
                            (let [datoms (live-texts source eid visit-text!)]
                              (if attribute (keep #(decode-live attribute (:v %)) datoms) (map #(decode (:v %)) datoms))))
                      :else (history-entity db eid visit-text!))) eids)))))
