(ns triplex.gateway.storage
  (:require [triplex.gateway.lean :as lean] [triplex.gateway.stats :as stats] [datomic.api :as d] [triplex.gateway.codec :as codec] [triplex.gateway.reach :as reach])
  (:import [java.util UUID]))

(set! *warn-on-reflection* false)

;; [EXP-DA01] Why: hold an unfiltered immutable db for speculative reads. Rejected: d/with on as-of (filtered db unsupported).
(def snapshots (atom {}))
(def ttl-ms 120000)
(defn begin! [name db]
  (let [handle (str (UUID/randomUUID)) now (System/currentTimeMillis)]
    (swap! snapshots #(assoc (into {} (filter (fn [[_ v]] (> (:expires v) now)) %)) handle
                            {:name name :db db :expires (+ now ttl-ms)}))
    {:handle handle :position (codec/encode-value "long" (:v (first (d/datoms db :eavt (:scope (reach/config name db)) :triplex.scope/position))))}))
(defn release! [name handle]
  (when (= name (:name (@snapshots handle))) (swap! snapshots dissoc handle))
  {:released true})
(defn held-db [name handle]
  (let [entry (@snapshots handle)]
    (when-not (and (= name (:name entry)) (> (:expires entry 0) (System/currentTimeMillis)))
      (throw (ex-info "Snapshot expired or belongs to another database" {:status 409 :code "SnapshotExpired"})))
    (:db entry)))
(defn decode-row [row] (into {} (map (fn [[k v]] [(keyword k) (when (some? v) (codec/decode-value v))]) row)))
(def long-fields #{:recorded_position :retracted_position :schema_version})
(defn wire-row [row]
  (into {} (map (fn [[k v]] [(name k) (when (some? v) (codec/encode-value (cond (long-fields k) "long" (number? v) "double" :else "string") v))]) row)))
(defn finite! [x] (when-not (and (number? x) (Double/isFinite (double x))) (codec/invalid "Expected finite double")) (double x))
(defn safe-position [x] (when-not (and (integer? x) (<= 0 x 9007199254740991)) (codec/invalid "Unsafe position")) (long x))
;; [DX-B5-L1] Why: the scope version is immutable; only lean scopes omit reified facts.
;; Rejected: migrating existing scopes in place (changes legacy read/storage contracts).
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn lean? [db] (= 3 (value db (:e (first (d/datoms db :aevt :triplex.scope/key))) :triplex.scope/rows-version)))
(defn upserts [rows]
  (let [subjects (set (concat (map :entity_id rows) (keep #(when (= "ref" (:value_type %)) (:value_string %)) rows)))
        attributes (set (map :attribute rows))]
    (concat (map (fn [s] {:db/id (str "e:" s) :triplex.entity/id s}) subjects)
            (map (fn [a] {:db/id (str "a:" a) :triplex.attr/key a}) attributes))))
;; [EXP-DA01] Why: the dev transactor normalizes signed zero on persistence (live-2). Rejected: silent +0 conversion (AMB-04).
(defn negative-zero? [v] (and (number? v) (= Long/MIN_VALUE (Double/doubleToRawLongBits (double v)))))
(defn zero-signs [row] (set (keep (fn [[k v]] (when (negative-zero? v) k)) row)))
(defn fact-map [row metadata]
  (let [kind (:value_type row) subject (str "e:" (:entity_id row))
        value (case kind
                "string" {:f.v/string (:value_string row)}
                "integer" {:f.v/long (codec/decode-value {"t" "long" "v" (:value_string row)})}
                "ref" {:f.v/ref (str "e:" (:value_string row))}
                "number" {:f.v/double (finite! (:value_number row))}
                "datetime" {:f.v/double (finite! (:value_datetime row))}
                "boolean" {:f.v/boolean (== 1 (:value_boolean row))}
                "json" {:f.v/json (:value_json row)}
                "blob" {:f.v/blob (.getBytes ^String (:value_string row) "UTF-8") :f.v/blob-meta (:value_json row)}
                (codec/invalid "Unknown value family"))]
    (merge {:db/id (str "f:" (:id row)) :f/id (:id row) :f/subject subject
            :f/attr (str "a:" (:attribute row)) :f/type (keyword kind)
            :f/valid-from (finite! (:valid_from row))}
           ;; [DX-B2-N5] Why: schema 1 is the default, and the immutable f/id datom already names its asserting tx.
           ;; Rejected: duplicate attributes on every fact (measured d/transact median 7.46 ms).
           (when (not= 1 (:schema_version row)) {:f/schema-version (long (:schema_version row))})
           (when (not= (:recorded_at row) (:recorded-at metadata)) {:f/recorded-at (finite! (:recorded_at row))})
           (when (not= (:recorded_position row) (:position metadata)) {:f/position (safe-position (:recorded_position row))})
           (when (and (nil? (:tx_id row)) (:id metadata)) {:f/null-tx-id true})
           (when (seq (zero-signs row)) {:f/negative-zero (zero-signs row)})
           (when (nil? (:retracted_at row)) {:f/live subject})
           (when (:retracted_at row) {:f/retracted-in "datomic.tx" :f/retracted-at (finite! (:retracted_at row))
                                      :f/retracted-position (safe-position (:retracted_position row)) :f/retract-tx-id (:retract_tx_id row)})
           (when (and (:tx_id row) (not= (:tx_id row) (:id metadata))) {:f/tx-id (:tx_id row)})
           (when (:valid_to row) {:f/valid-to (finite! (:valid_to row))})
           (when (:created_by row) {:f/created-by (:created_by row)})
           (when (:entity_type row) {:f/entity-type (:entity_type row)}) value)))
 ;; [EXP-DX1] Why: live row datoms are exact write-time wire values. Rejected: rebuilding values on every pull.
(defn row-prefix [^String id] (str "2" (format "%04x" (.length id)) id))
(defn row-datom [db eid ^String prefix]
  (let [datom (first (d/seek-datoms db :eavt eid :triplex.entity/row prefix))]
    (when (and datom (= eid (:e datom)) (= (d/entid db :triplex.entity/row) (:a datom))
               (.startsWith ^String (:v datom) prefix)) (:v datom))))
 ;; [DX-B3-M2] Why: prepare all row encoding and fact maps off the transactor's serial point.
;; Rejected: resolving row retractions in the gateway (stale exact row text after another commit).
(defn tx-data
  ([db input] (tx-data db input (:e (first (d/datoms db :aevt :triplex.scope/key)))))
  ([db input scope]
   (let [lean (lean? db) rows (mapv decode-row (get input "rows")) new-ids (set (get input "newIds"))
         fresh (filter #(new-ids (:id %)) rows) old (remove #(new-ids (:id %)) rows)
         source (when-some [p (get input "sourceK")] (safe-position p)) position (safe-position (get input "position"))
         span (safe-position (or (get input "span") (when source (- position source))))
         lower (- position span) claims (get input "claims") sample (or (first fresh) (first old))
         metadata {:position position
                   :recorded-at (cond (seq fresh) (:recorded_at sample) (seq old) (:retracted_at sample)
                                      (seq claims) (get (first claims) "timestamp") :else (double (System/currentTimeMillis)))
                   :id (cond (seq fresh) (:tx_id sample) (seq old) (:retract_tx_id sample)
                             (seq claims) (get (first claims) "txId") :else (get input "operationId"))}
         marker (fn [p] [:triplex/position (safe-position p)])
         times (vec (mapcat (fn [row] (concat (when (new-ids (:id row)) [(:recorded_at row)])
                                             (when (:retracted_at row) [(:retracted_at row)]))) rows))
         irregular (boolean (some (fn [p] (not (< lower p (inc position))))
                                  (concat (map :recorded_position fresh) (keep :retracted_position rows))))
         ops (vec (remove nil? (concat
               [{:db/id "datomic.tx" :triplex.tx/position (marker position)
                 :triplex.tx/operation-id (get input "operationId") :triplex.tx/id (or (:id metadata) "")
                 :triplex.tx/recorded-at (finite! (:recorded-at metadata))}]
               ;; [DX-B4-T1] Why: one physical commit can contain several logical journals.
               ;; Rejected: using only tx/id (drops nested transacts at interior cursors).
               (mapcat (fn [[entity rs]]
                         (let [existing (d/entid db [:triplex.entity/id entity])
                               position-row (first (filter #(= ":_tx/position" (:attribute %)) rs))
                               instant-row (first (filter #(= ":_tx/instant" (:attribute %)) rs))
                               commands (filter #(= ":_tx/command-id" (:attribute %)) rs)
                               claims-valid (every? (fn [r] (some #(and (= entity (get % "txId")) (= (:value_string r) (get % "commandId"))) claims)) commands)]
                           (if (and position-row (= "datetime" (:value_type instant-row))
                                    (= 1 (count (filter #(= ":_tx/position" (:attribute %)) rs)))
                                    (= 1 (count (filter #(= ":_tx/instant" (:attribute %)) rs)))
                                    claims-valid (nil? existing))
                             [[:db/add "datomic.tx" :triplex.tx/journals (str "e:" entity)]
                              [:db/add (str "e:" entity) :triplex.journal/position (marker (:recorded_position position-row))]]
                             [[:db/add scope :triplex.scope/feed-irregular true]])))
                       (group-by :entity_id (filter #(= "_Transaction" (:entity_type %)) fresh)))
               ;; [DX-B4-T1] Why: malformed SPI journals can share a position; their portable tie order is not the tx-link order.
               ;; Rejected: accepting duplicate journal positions and guessing their order.
               (let [ps (map :recorded_position (filter #(and (= "_Transaction" (:entity_type %)) (= ":_tx/position" (:attribute %))) fresh))]
                 (when (not= (count ps) (count (distinct ps))) [[:db/add scope :triplex.scope/feed-irregular true]]))
               ;; [DX-B4-T2] Why: the portable command query also sees untyped SPI rows.
               ;; Rejected: proving claim completeness only for rows tagged _Transaction.
               (when (some (fn [r]
                             (and (= ":_tx/command-id" (:attribute r))
                                  (not (some #(and (= (:entity_id r) (get % "txId"))
                                                   (= (:value_string r) (get % "commandId"))) claims)))) fresh)
                 [[:db/add scope :triplex.scope/feed-irregular true]])
               ;; Retiring or extending a published journal invalidates the append-only proof.
               (when (some #(= "_Transaction" (:entity_type %)) old)
                 [[:db/add scope :triplex.scope/feed-irregular true]])
               (if lean
                 (map (fn [entity] {:db/id (str "e:" entity) :triplex.entity/id entity}) (distinct (map :entity_id fresh)))
                 (upserts fresh))
               (map (fn [row]
                      (cond-> (fact-map row metadata)
                        (not= (:recorded_position row) position) (assoc :f/position (marker (:recorded_position row)))
                        (= ":_tx/position" (:attribute row)) (assoc :f.v/double [:triplex/double-position (:recorded_position row)])
                        (:retracted_position row) (assoc :f/retracted-position (marker (:retracted_position row))))) (if lean [] fresh))
               (mapcat (fn [row]
                         (when (or lean (nil? (:retracted_at row)))
                           (let [text (get-in input ["rowTexts" (:id row)])]
                             (when-not (and (string? text) (.startsWith ^String text (row-prefix (:id row))))
                               (codec/invalid "Missing or mismatched row text"))
                             [(if (and (not lean) (> (.length ^String text) 8000))
                                [:db/add (str "e:" (:entity_id row)) :triplex.entity/row-overflow true]
                                [(if lean :triplex/assert :db/add) (str "e:" (:entity_id row)) :triplex.entity/row [:triplex/row text (:recorded_position row)
                                  (+ 44 (.length ^String (:id row)) (if (= "ref" (:value_type row)) (.length ^String (:value_string row)) 0))]])]))) fresh)
               ;; [DX-B5-L2] Why: Datomic cancels add/retract pairs in one physical tx; preserve born-retired rows with a marker.
               ;; Rejected: dropping their history, or assigning their retirement to a later synthetic transaction.
               (when lean
                 (for [row fresh :when (:retracted_at row)]
                   [:db/add (str "e:" (:entity_id row)) :triplex.entity/retired
                    [:triplex/row (str (row-prefix (:id row)) (format "%016d" (:retracted_position row))
                                      (format "%016x" (Double/doubleToRawLongBits (double (:retracted_at row))))
                                      (or (:retract_tx_id row) ""))
                     (:retracted_position row) (.length ^String (row-prefix (:id row)))]]))
               (mapcat (fn [row]
                         (when-not (:retracted_at row) (codec/invalid "Invalid retraction"))
                         (let [eid [:f/id (:id row)] subject [:triplex.entity/id (:entity_id row)]]
                           (if lean
                             [[:triplex/retract (:entity_id row) (:id row)]
                              (when (or (negative-zero? (:retracted_at row))
                                        (not= (:retracted_at row) (:recorded-at metadata))
                                        (not= (:retracted_position row) position)
                                        (not= (:retract_tx_id row) (:id metadata)))
                                [:db/add (str "e:" (:entity_id row)) :triplex.entity/retired
                                 [:triplex/row (str (row-prefix (:id row)) (format "%016d" (:retracted_position row))
                                                   (format "%016x" (Double/doubleToRawLongBits (double (:retracted_at row))))
                                                   (or (:retract_tx_id row) ""))
                                  (:retracted_position row) (.length ^String (row-prefix (:id row)))]])]
                           [[:triplex/retract (:entity_id row) (:id row)]
                            [:db/retract eid :f/live subject]
                            [:db/add eid :f/retracted-in "datomic.tx"]
                            [:db/add eid :f/retracted-at (finite! (:retracted_at row))]
                            [:db/add eid :f/retracted-position (marker (:retracted_position row))]
                            [:db/add eid :f/retract-tx-id (:retract_tx_id row)]
                            (when (negative-zero? (:retracted_at row)) [:db/add eid :f/negative-zero :retracted_at])]))) old)
               (map (fn [entity] [:db/add (str "e:" entity) :triplex.entity/rev (marker position)]) (distinct (map :entity_id rows)))
               ;; Existing-only subjects need their identity tempids too (retractions can contain no assertions).
               (map (fn [entity] {:db/id (str "e:" entity) :triplex.entity/id entity}) (distinct (map :entity_id old)))
               (map (fn [claim] {:db/id (str "c:" (get claim "commandId"))
                                :triplex.claim/command-id (get claim "commandId") :triplex.claim/tx "datomic.tx"
                                :triplex.claim/tx-id (get claim "txId")}) claims))))]
     [[:triplex/commit {:scope scope :source source :provisional position :span span
                       :scope-wide (get input "scopeWide" true) :entities (get input "entities" [])
                       :live (vec (distinct (concat (get input "live" []) (map :id old))))
                       :lean lean :ops ops :times times :replay-safe (true? (get input "replaySafe")) :irregular irregular :position-irregular irregular
                       :journal-entities (vec (distinct (map :entity_id (filter #(= "_Transaction" (:entity_type %)) fresh))))}]])))
;; [DX-B5-L0] Why: HTTP connections can overtake ordered client sends; serialize submission only.
;; Rejected: waiting for the transaction result under this monitor (queues acknowledgements).
(def submissions (atom {}))
(defn submit! [conn data input]
  (if-let [client (get input "clientId")]
    (let [sequence (get input "sendSequence")
          _ (when-not (and (string? client) (<= 1 (count client) 64) (integer? sequence) (pos? sequence))
              (codec/invalid "Invalid send sequence"))
          state (or (@submissions client)
                    (get (swap! submissions #(if (contains? % client) % (assoc % client (atom 0)))) client))
          deadline (+ (System/nanoTime) 20000000)]
      (locking state
        (loop []
          (when (and (< @state (dec sequence)) (< (System/nanoTime) deadline))
            (.wait ^Object state 1) (recur)))
        (when (< @state (dec sequence)) (stats/bump! [:commitOrder :timeouts] 1))
        (when (<= sequence @state) (stats/bump! [:commitOrder :late] 1))
        (let [future (d/transact-async conn data)]
          (swap! state max sequence) (.notifyAll ^Object state) future)))
    (d/transact-async conn data)))
(defn commit! [name conn db input]
  (when (d/entid db [:triplex.tx/operation-id (get input "operationId")])
    (throw (ex-info "Operation already committed" {:status 409 :code "OperationDuplicate"})))
  (try
    (let [data (tx-data db input (:scope (reach/config name db)))
          start (System/nanoTime)
          report (deref (submit! conn data input) 5000 ::timeout)
          transact-micros (quot (- (System/nanoTime) start) 1000)]
      (when (= report ::timeout) (throw (ex-info "Commit outcome unknown" {:status 503 :code "OutcomeUnknown"})))
      {:t (codec/encode-value "long" (d/basis-t (:db-after report)))
       :transactMicros transact-micros
       :operationId (get input "operationId")
       :position (codec/encode-value "long" (:v (first (filter #(= (:a %) (d/entid (:db-after report) :triplex.tx/position)) (:tx-data report)))))
       :delta (- (:v (first (filter #(= (:a %) (d/entid (:db-after report) :triplex.tx/position)) (:tx-data report)))) (get input "position"))
       :datoms (count (:tx-data report))})
    (catch Exception e
      (let [text (str e)]
        (when (= "OutcomeUnknown" (:code (ex-data e))) (throw e))
        (throw (ex-info (.getMessage e)
                       {:status (if (re-find #"TRIPLEX_CLOCK|TRIPLEX_CONFLICT|cas-failed|unique-conflict" text) 409 400)
                        :maximum (when-let [[_ maximum] (re-find #"TRIPLEX_CLOCK ([0-9.Ee+-]+)" text)] (Double/parseDouble maximum))
                        :code (cond (re-find #"TRIPLEX_CLOCK" text) "ClockConflict"
                                    (re-find #"TRIPLEX_CONFLICT|cas-failed|triplex.tx/position" text) "CasConflict"
                                    (re-find #"triplex.claim/command-id" text) "CommandConflict"
                                    (re-find #"triplex.tx/operation-id" text) "OperationDuplicate"
                                    (re-find #"f/id" text) "IdentityConflict" :else "TransactionRejected")} e))))))
(defn operation [db id]
  (if-let [entity (d/entid db [:triplex.tx/operation-id id])]
    (if-let [p (value db entity :triplex.tx/position)]
      {:status "committed" :position (codec/encode-value "long" p) :t (codec/encode-value "long" (d/tx->t entity))}
      {:status "absent"}) {:status "absent"}))
(defn head-position
  ([db]
   (let [^datomic.Datom scope (first (d/datoms db :aevt :triplex.scope/key))
         ^datomic.Datom position (first (d/datoms db :eavt (.e scope) :triplex.scope/position))]
     (.v position)))
  ([name db]
   (let [cfg (reach/config name db)
         ^datomic.Datom position (first (d/datoms db :eavt (:scope cfg) (:position cfg)))]
     (.v position))))
(defn unavailable! [message]
  (throw (ex-info message {:status 409 :code "BasisNotAvailable"})))
;; [EXP-DA01] Why: future cuts must wait for publication, never silently answer from the head (Q89c/d). Rejected: treating P >= head as latest.
(defn await-position [db p wait-ms refresh]
  (if (nil? p) db
    (let [p (safe-position p) wait-ms (or wait-ms 500)
          _ (when-not (and (integer? wait-ms) (<= 1 wait-ms 2000)) (codec/invalid "Basis wait must be 1..2000 ms"))
          deadline (+ (System/nanoTime) (* wait-ms 1000000))]
      (loop [current db]
        (if (<= p (head-position current)) current
          (let [remaining (quot (- deadline (System/nanoTime)) 1000000)]
            (when (<= remaining 0) (unavailable! "Requested position is beyond the available snapshot"))
            (Thread/sleep 1)
            (let [remaining (max 1 (quot (- deadline (System/nanoTime)) 1000000)) next (refresh remaining)]
              (when (= next ::timeout) (unavailable! "Requested position did not become available before the deadline"))
              (recur next))))))))
;; [EXP-DA01] Why: sparse logical positions map to the first containing physical transaction in logarithmic index work (Q89d). Rejected: rebuilding an O(commits) host map at each basis.
(defn at-position [db p]
  (if (nil? p) db
    (let [p (safe-position p) head (head-position db)]
      (when (> p head) (unavailable! "Requested position is beyond the available snapshot"))
      (if (= p head) db
        (let [tx (if (zero? p)
                   (:tx (first (d/datoms db :aevt :triplex.scope/key)))
                   (:e (first (d/index-range db :triplex.tx/position p nil))))]
          (when-not tx (unavailable! "No physical transaction covers the requested position"))
          (d/as-of db (d/tx->t tx)))))))
(defn read-db [name current input]
  (let [db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)]
               (if-let [staged (get input "staged")] (:db-after (d/with held (tx-data held staged))) held))
             current)
        p (get-in input ["basis" "recordedPosition"])]
    ;; [EXP-DA01] Why: a held value cannot advance even if another writer commits; refuse future requests against that exact pin. Rejected: replacing a held db with a newer one mid-query.
    (at-position (await-position db p (get input "basisWaitMs") (fn [_] db)) p)))
(defn raw-row [db eid]
  (let [f (d/entity db eid)
        tx (or (:f/asserted-in f)
               (let [^datomic.Datom identity (first (d/datoms db :eavt eid :f/id))]
                 (when identity (d/entity db (.tx identity)))))
        rtx (:f/retracted-in f) kind (name (:f/type f))]
    {:id (:f/id f) :entity_id (:triplex.entity/id (:f/subject f)) :attribute (:triplex.attr/key (:f/attr f))
     :value_type kind
     :value_string (case kind "integer" (str (:f.v/long f)) "ref" (:triplex.entity/id (:f.v/ref f))
                         "blob" (String. ^bytes (:f.v/blob f) "UTF-8") "string" (:f.v/string f) nil)
     :value_number (when (= kind "number") (:f.v/double f))
     :value_datetime (when (= kind "datetime") (:f.v/double f))
     :value_boolean (when (= kind "boolean") (if (:f.v/boolean f) 1.0 0.0))
     :value_json (case kind "json" (:f.v/json f) "blob" (:f.v/blob-meta f) nil)
     :recorded_at (or (:f/recorded-at f) (:triplex.tx/recorded-at tx)) :recorded_position (or (:f/position f) (:triplex.tx/position tx))
     :tx_id (when-not (:f/null-tx-id f) (or (:f/tx-id f) (not-empty (:triplex.tx/id tx)))) :valid_from (:f/valid-from f) :valid_to (:f/valid-to f)
     :created_by (:f/created-by f) :entity_type (:f/entity-type f) :schema_version (or (:f/schema-version f) 1)
     :retracted_at (:f/retracted-at f) :retracted_position (:f/retracted-position f) :retract_tx_id (:f/retract-tx-id f)}))
(defn row [db eid]
  (let [r (raw-row db eid) signs (:f/negative-zero (d/entity db eid))]
    (reduce (fn [result field] (if (contains? result field) (assoc result field -0.0) result)) r signs)))
(defn visible? [row basis history]
  (let [p (get basis "recordedPosition") r (get basis "recordedAt") v (get basis "validAt")]
    (and (or (nil? p) (<= (:recorded_position row) p)) (or (nil? r) (<= (:recorded_at row) r))
         (or history
             (and (not (and (:retracted_at row) (or (nil? p) (<= (:retracted_position row) p))
                            (or (nil? r) (<= (:retracted_at row) r))))
                  (or (nil? v) (and (<= (:valid_from row) v) (or (nil? (:valid_to row)) (> (:valid_to row) v)))))))))
(defn assert-subject-route! [db basis attribute]
  ;; [EXP-DA01] Why: position retirement loses T-shaped rows and interior logical cuts of a multi-position transaction (Q89b). Rejected: filtering after :f/live has already omitted eligible facts.
  (when-not (#{:f/subject :f/live} attribute) (codec/invalid "Unknown subject route"))
  (when (= attribute :f/live)
    (when (some? (get basis "recordedAt"))
      (unavailable! "Position-retired subject route cannot answer a record-time basis"))
    (when-let [p (get basis "recordedPosition")]
      (when (and (pos? p) (nil? (d/entid db [:triplex.tx/position p])))
        (unavailable! "Position-retired subject route cannot answer an interior logical cut")))))
(defn subject-facts [db entity-id basis attribute]
  (assert-subject-route! db basis attribute)
  (if-let [subject (d/entid db [:triplex.entity/id entity-id])]
    (map :e (d/datoms db :vaet subject attribute)) []))
(defn mask-retirement [r basis]
  ;; [EXP-DA01] Why: native row metadata must describe the requested cut on every route (R31 HE-1). Rejected: exposing future retirement fields from a held or record-time source read.
  (if (and (:retracted_at r)
           (or (and (some? (get basis "recordedPosition")) (> (:retracted_position r) (get basis "recordedPosition")))
               (and (some? (get basis "recordedAt")) (> (:retracted_at r) (get basis "recordedAt")))))
    (assoc r :retracted_at nil :retracted_position nil :retract_tx_id nil) r))
(defn legacy-read-rows [name current input]
  (let [basis (get input "basis") history (get input "history")
        db (read-db name current input)
        route (get input "route" "history")
        _ (when-not (#{"history" "live"} route) (codec/invalid "Unknown read route"))
        attribute (if (= route "live") :f/live :f/subject)
        _ (assert-subject-route! db basis attribute)
        _ (when (and (= route "live") history) (unavailable! "Position-retired route cannot enumerate history"))
        pattern (into {} (remove (fn [[_ v]] (and (string? v) (.startsWith ^String v "?"))) (get input "pattern"))) id (get input "id") entities (get input "entityIds")
        subject-ids #(subject-facts db % basis attribute)
        ids (cond id (if-let [eid (d/entid db [:f/id id])] [eid] [])
                  (some? entities) (mapcat subject-ids (distinct entities))
                  (get pattern "entityId") (subject-ids (get pattern "entityId"))
                  ;; [EXP-DA01] Why: refs have VAET and AEVT but no AVET without an explicit index; whole live scans must enumerate the actual attribute index. Rejected: a shape-dependent attribute-not-indexed failure hidden by subject-only fixtures.
                  :else (map :e (if (= route "live") (d/datoms db :aevt :f/live) (d/datoms db :avet :f/id))))
        branch (cond id "id" (some? entities) "entities" (get pattern "entityId") "entity" :else "scan")
        _ (stats/bump! [:branches branch :calls] 1)
        visited (volatile! 0)
        scan-key (pr-str (select-keys pattern ["attribute" "entityType"]))
        rows (map #(do (when (= branch "scan") (vswap! visited inc) (stats/bump! [:branches branch :datoms] 1)) (row db %)) ids)
        result {:route (cond (= route "live") "live" (get input "staged") "staged" (get input "handle") "held"
                  (and (some? (get basis "recordedPosition")) (< (get basis "recordedPosition") (head-position current))) "as-of" :else "source")
     :basis basis :subjectAttribute (str attribute)
     :rows (mapv #(wire-row (mask-retirement % basis))
                 (filter (fn [r] (and (visible? r basis history)
                                     (or (not= route "live") (nil? (:retracted_at r)))
                                     (or (nil? entities) (some #{(:entity_id r)} entities))
                                     (every? (fn [[k field]] (or (nil? (get pattern k)) (.startsWith ^String (str (get pattern k)) "?")
                                                               (= (get pattern k) (get r field))))
                                             [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]]))) rows))}]
    (when (= branch "scan")
      (stats/bump! [:scanPatterns scan-key :calls] 1)
      (stats/bump! [:scanPatterns scan-key :datoms] @visited)
      (swap! stats/counts update-in [:scanPatterns scan-key :maxDatoms] (fnil max 0) @visited))
    result))

;; [DX-B5-L2] Why: retain one visibility/masking rule for both physical layouts.
;; Rejected: interpreting interior logical positions as physical transaction cuts.
(defn read-rows [name current input]
  (let [db (if-let [handle (get input "handle")]
             (let [held (held-db name handle)]
               (if-let [staged (get input "staged")] (:db-after (d/with held (tx-data held staged))) held)) current)]
    (if-not (lean/enabled? db) (legacy-read-rows name current input)
      (let [basis (get input "basis") history (get input "history") route (get input "route" "history")
            pattern (get input "pattern") entities (when-let [ids (get input "entityIds")] (set ids))
            _ (when-not (#{"history" "live"} route) (codec/invalid "Unknown read route"))
            _ (assert-subject-route! db basis (if (= route "live") :f/live :f/subject))
            _ (when (and (= route "live") history) (unavailable! "Position-retired route cannot enumerate history"))
            _ (await-position db (get basis "recordedPosition") (get input "basisWaitMs") (fn [_] db))]
        {:route (cond (= route "live") "live" (get input "staged") "staged" (get input "handle") "held"
                      (and (some? (get basis "recordedPosition")) (< (get basis "recordedPosition") (head-position current))) "as-of" :else "source") :basis basis
         :subjectAttribute (str (if (= route "live") :f/live :f/subject))
         :rows (mapv #(wire-row (mask-retirement % basis))
                     (filter (fn [row]
                               (and (visible? row basis history)
                                    (or (not= route "live") (nil? (:retracted_at row)))
                                    (or (nil? entities) (entities (:entity_id row)))
                                    (every? (fn [[key column]]
                                              (let [v (get pattern key)]
                                                (or (nil? v) (.startsWith ^String (str v) "?") (= v (get row column)))))
                                            [["entityId" :entity_id] ["attribute" :attribute] ["entityType" :entity_type]])))
                             ;; [DX-B5-L2] Why: an explicit imported row position cannot move its physical publication into an older snapshot.
                             ;; Rejected: filtering full head history only by row position (differs from legacy read-db).
                             (lean/rows name (at-position db (get basis "recordedPosition")) input)))}))))

;; [EXP-DX1] Why: snapshot, claim and known by-id rows share one immutable prefetch cut.
;; Rejected: separate claim/read HTTP calls (R51's six-round-trip commit).
(defn begin-command! [name db input]
  (let [snapshot (begin! name db) command (get input "commandId") ids (get input "ids" [])]
    (try
      (merge snapshot
        {:t (codec/encode-value "long" (d/basis-t db))
         :claim (when command (when-let [eid (d/entid db [:triplex.claim/command-id command])] (value db eid :triplex.claim/tx-id)))
         :rows (if (lean/enabled? db)
                 (vec (mapcat #(:rows (read-rows name db {"id" %})) ids))
                 (mapv wire-row
                 (keep (fn [id]
                         (when-let [eid (d/entid db [:f/id id])]
                           (let [r (row db eid)] (when (visible? r nil false) r)))) ids)))})
      (catch Exception e (release! name (:handle snapshot)) (throw e)))))
