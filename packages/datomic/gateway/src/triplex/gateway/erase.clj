(ns triplex.gateway.erase
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.lean :as lean] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.scope :as scope])
  (:import [java.util UUID]))

;; [DX-ERASE1] Why: an independent prepared save may advance the database after removal selects its rows.
;; Rejected: a peer-only head check (it cannot prove the selection on the serialized transaction cut).
(def ^:private cut-guard :triplex.erase/check-position-v1)
(def ^:private cut-moved "TRIPLEX_ERASE_HEAD_MOVED")
(def ^:private cut-guard-code
  '(let [value (fn [e a] (:v (first (d/datoms db :eavt e a))))
         v2 (and (d/entid db :triplex.scope/head-version) (= 2 (value scope :triplex.scope/head-version)))
         tx (d/t->tx (d/basis-t db))
         row (when v2 (first (d/rseek-datoms db :aevt :triplex.tx/position tx)))
         position (if v2
                    (if (= (:a row) (d/entid db :triplex.tx/position)) (:v row) 0)
                    (value scope :triplex.scope/position))]
     (when-not (= previous position) (throw (ex-info "TRIPLEX_ERASE_HEAD_MOVED" {})))
     []))

(defn- install-cut-guard! [conn db]
  (if (d/entid db cut-guard) db
    (let [report (deref (d/transact conn [{:db/ident cut-guard
                :db/fn (d/function {:lang "clojure" :params '[db scope previous]
                                    :requires '[[datomic.api :as d]] :code cut-guard-code})}]) 5000 ::timeout)]
      (when (= ::timeout report) (privacy/unavailable!))
      (:db-after report))))

(defn sync! [conn]
  (let [db (deref (d/sync conn) 2000 ::timeout)]
    (when (= db ::timeout) (privacy/unavailable!))
    db))

(def declare-code
  ;; [DX-W1] Why: deciding that a scope has no plaintext history belongs at Datomic's serial cut.
  ;; Rejected: relying on the gateway's earlier empty-head check during a concurrent first save.
  '(let [value (fn [attr] (:v (first (d/datoms db :eavt entity attr))))
          native (d/t->tx (d/basis-t db))
          pos-a (d/entid db :triplex.tx/position)
          latest (first (d/rseek-datoms db :aevt pos-a native))
          position (max (or (value :triplex.scope/position) 0)
                        (if (= pos-a (:a latest)) (:v latest) 0))]
     (cond
       (true? (value :triplex.scope/erasure-ledger)) []
       (not= (or staged-position 0) position)
       (throw (ex-info "TRIPLEX_PROTECTION_MIGRATION_REQUIRED" {}))
       :else [[:db/add entity :triplex.scope/erasure-ledger true]
              [:db/add entity :triplex.scope/erasure-seq 0]])))

(defn declare!
  ([name conn db input] (declare! name conn db input nil))
  ;; [DX-ERASE2] Why: trusted staging uses the same serial cut check with its stopped-copy position.
  ;; Rejected: letting the public request claim an occupied scope has no plaintext history.
  ([name conn db input staged-position]
  (let [attrs (get input "attributes") sealed? (true? (get input "sealed"))]
    (when-not (and (lean/enabled? db) (or (privacy/enabled? db) (= (or staged-position 0) (scope/head-position db (scope/entity db)))))
      (privacy/failure! 409 "ProtectedScopeNeedsMigration" "Declare protection before saving into the scope"))
    (privacy/register! name attrs sealed?
      (fn []
        (let [current (sync! conn) ident :triplex.privacy/declare-v2]
          (when-not (privacy/enabled? current)
            (try
              (install-cut-guard! conn current)
              (when-not (d/entid current ident)
                (when (= ::timeout (deref (d/transact conn [{:db/ident ident
                        :db/fn (d/function {:lang :clojure :params '[db entity staged-position]
                                           :requires '[[datomic.api :as d]] :code declare-code})}]) 5000 ::timeout))
                  (privacy/unavailable!)))
              (when (= ::timeout (deref (d/transact conn [[ident (scope/entity current) (or staged-position 0)]]) 5000 ::timeout))
                (privacy/unavailable!))
              (catch Exception e
                (if (re-find #"TRIPLEX_PROTECTION_MIGRATION_REQUIRED" (str e))
                  (privacy/failure! 409 "ProtectedScopeNeedsMigration" "Declare protection before saving into the scope")
                  (throw e))))))))
    (envelope/provision! name sealed?)
    {:database name :attributes attrs :sealed sealed? :erasure {:seq (:seq (privacy/cut name (sync! conn)))}})))

(defn identity [row]
  (cond-> {"assertionId" (:id row) "entity" (:entity_id row) "attribute" (:attribute row)
           "valueType" (:value_type row) "validFrom" (:valid_from row) "validTo" (:valid_to row)}
    (:key_handle row) (assoc "keyHandle" (:key_handle row))))

(defn- invalid! []
  (privacy/failure! 400 "InvalidEraseCommand" "Provide a bounded erase-only command and identity selectors"))

(defn selectors! [input]
  (let [selectors (get input "selectors") command (get input "commandId")]
    (when-not (and (= #{"commandId" "selectors"} (set (keys input))) (string? command)
                   (re-matches #"[a-zA-Z0-9_:/.-]{1,160}" command)
                   (vector? selectors) (<= 1 (count selectors) 100)
                   (every? (fn [s]
                             (and (map? s)
                               (contains? #{#{"id"} #{"entityId"} #{"entityId" "attribute"}} (set (keys s)))
                               (every? #(and (string? %) (seq %) (<= (count %) 1024)) (vals s))))
                           selectors))
      (invalid!))
    selectors))

(defn- matches [db policy selector]
  (if-let [id (get selector "id")]
    (let [private-id (when (:sealed policy) (d/entid db [:triplex.private/id id]))
          row (if private-id (envelope/assertion-identity db private-id)
                (when-let [record (lean/by-id (d/history db) id)] (lean/decode (:v record))))]
      (when-not row (privacy/failure! 404 "UnknownAssertion" "No assertion matches this identity"))
      (when-not ((:attrs policy) (:attribute row))
        (privacy/failure! 400 "EraseNotProtected" "The assertion attribute is outside the protected policy"))
      (when (and (:sealed policy) (nil? private-id)) (privacy/unavailable!))
      [row])
    (let [attribute (get selector "attribute") owner (get selector "entityId")]
      (when (and attribute (not ((:attrs policy) attribute)))
        (privacy/failure! 400 "EraseNotProtected" "The attribute is outside the protected policy"))
      ;; [DX-ERASE1] Why: erase seeks the detached protected history for this owner.
      ;; Rejected: decoding the owner's ordinary rows and traversing their retired value history.
      (let [rows (if (:sealed policy)
                   (map #(envelope/assertion-identity db (:e %)) (d/datoms db :avet :triplex.private/entity owner))
                   (when-let [e (d/entid db [:triplex.entity/id owner])] (lean/history-entity db e)))]
        (filter #(and ((:attrs policy) (:attribute %)) (or (nil? attribute) (= attribute (:attribute %)))) rows)))))

(defn make-entry [name db state command selectors]
  (let [position (inc (scope/head-position db (scope/entity db)))
        stamp (max (System/currentTimeMillis) (inc (long (or (scope/max-recorded-at db (scope/entity db)) 0))))
        ids (->> selectors (mapcat #(matches db state %)) (map identity)
                 (remove #(contains? (:erased state) (get % "assertionId")))
                 (reduce (fn [m r] (assoc m (get r "assertionId") r)) (sorted-map))
                 vals vec)]
    {"database" name "seq" (inc (:seq state)) "previous" (:seal state) "commandId" command
     "selectors" selectors "txId" (str "_tx/erase-" (UUID/randomUUID)) "position" position
     "erasedAt" stamp "identities" ids}))

(defn- journal-rows [entry]
  (let [tx (get entry "txId") ids (get entry "identities") stamp (get entry "erasedAt")
        position (get entry "position")
        template (zipmap privacy/columns (repeat nil))
        row (fn [i [attr type key v]]
              (privacy/encode
                (assoc template :id (str tx "/row/" i) :attribute attr :value_type type key v
                       :entity_id tx :entity_type "_Transaction" :schema_version 0
                       :recorded_position position :recorded_at (double stamp) :valid_from 0.0 :tx_id tx)))]
    (mapv row (range)
      (concat
       [[":_tx/position" "number" :value_number (double position)]
        [":_tx/instant" "datetime" :value_datetime (double stamp)]
        [":_tx/actor" "string" :value_string "privacy-erasure"]
        [":_tx/command-id" "string" :value_string (get entry "commandId")]]
       (map (fn [id] [":_tx/changed-entity" "ref" :value_string id]) (distinct (map #(get % "entity") ids)))
       (map (fn [r]
              [":_tx/change" "json" :value_json
               (json/write-str {"op" "erase" "entityId" (get r "entity") "attribute" (get r "attribute")
                                "tripleId" (get r "assertionId") "validFrom" (get r "validFrom")
                                "validTo" (get r "validTo") "erasureSeq" (get entry "seq")})])
            ids)))))

(defn- operation-id [entry]
  (str "privacy-" (privacy/sha256 (get entry "commandId"))))

(defn apply-native! [conn current entry]
  (let [current (install-cut-guard! conn current)
        eid (d/entid current [:triplex.tx/operation-id (operation-id entry)])
        raw (json/write-str entry)
        position (get entry "position")
        tx (get entry "txId")
        stamp (double (get entry "erasedAt"))
        head (scope/entity current)]
    (if eid
      (do
        (when-not (= raw (scope/value current eid :triplex.tx/erasure-record)) (privacy/unavailable!))
        (d/tx->t eid))
      (do
        (when-not (= position (inc (scope/head-position current head))) (throw (ex-info cut-moved {})))
        (let [ops (cond->
                   [[cut-guard head (dec position)]
                    {:db/id "datomic.tx" :triplex.tx/position position :triplex.tx/operation-id (operation-id entry)
                     :triplex.tx/id tx :triplex.tx/recorded-at stamp :triplex.tx/max-recorded-at stamp
                     :triplex.tx/erasure-record raw :triplex.tx/journals ["privacy-journal"]}
                    {:db/id "privacy-journal" :triplex.entity/id tx :triplex.journal/position position
                     :triplex.entity/rev position :triplex.entity/row (journal-rows entry)}
                    {:db/id "privacy-claim" :triplex.claim/command-id (get entry "commandId") :triplex.claim/tx "datomic.tx"
                     :triplex.claim/tx-id tx}]
                    ;; [DX-ERA2] Guarded per account: the global removal sequence moves on its own attribute (the
                    ;; database-wide one keeps the sentinel every write fences on), and each account that lost a value
                    ;; takes this removal's sequence. Rejected: moving the database-wide sequence (it refuses every save).
                    (removal-scope/per-account? current)
                    (into (cons [:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel removal-scope/sentinel]
                                (cons [:db/cas head :triplex.scope/removal-seq (dec (get entry "seq")) (get entry "seq")]
                                      (removal-scope/entry-ops entry))))
                    (not (removal-scope/per-account? current))
                    (conj [:db/cas head :triplex.scope/erasure-seq (dec (get entry "seq")) (get entry "seq")])
                    (not (scope/head-v2? current head))
                    (conj [:db/cas head :triplex.scope/position (dec position) position]))
              report (deref (d/transact conn ops) 5000 ::timeout)]
          (when (= ::timeout report) (privacy/unavailable!))
          (let [db (:db-after report) t (d/basis-t db)]
            (when-not (= raw (scope/value db (d/t->tx t) :triplex.tx/erasure-record)) (privacy/unavailable!))
            t))))))

(defn response [db entry]
  (let [native (d/entid db [:triplex.tx/operation-id (operation-id entry)])]
    (when-not native (privacy/unavailable!))
    {:seq (get entry "seq") :erasedAt (get entry "erasedAt") :txId (get entry "txId")
     :t (str (d/tx->t native)) :position (get entry "position") :identities (mapv #(dissoc % "keyHandle") (get entry "identities"))}))

(defn- selector-buckets
  "The accounts whose values these selectors can reach: an entity selector names its entity; an assertion selector
  names the entity that assertion belongs to (fixed for its whole life)."
  [db selectors]
  (into (sorted-set)
        (map (fn [s]
               (removal-scope/bucket
                 (or (get s "entityId")
                     (let [id (get s "id")
                           private-id (when (d/entid db :triplex.private/id) (d/entid db [:triplex.private/id id]))]
                       (if private-id (scope/value db private-id :triplex.private/entity)
                         (some-> (lean/by-id (d/history db) id) :v lean/decode :entity_id)))))))
        selectors))

(defn- with-bucket-guards [name buckets work]
  (if-let [[b & more] (seq buckets)]
    (privacy/guard (removal-scope/lock-name name b) #(with-bucket-guards name more work))
    (work)))

(defn erase! [name conn input]
  (let [selectors (selectors! input)
        command (get input "commandId")
        db (d/db conn)
        ;; [DX-ERA2] Per account, a removal also holds the locks of the accounts it can touch, which is what a derived
        ;; write naming those accounts holds instead of the database's lock.
        buckets (when (removal-scope/per-account? db) (selector-buckets db selectors))]
    (when-not (privacy/cut name db true)
      (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
    (privacy/guard name
      (fn [] (with-bucket-guards name buckets (fn []
        (let [db (sync! conn)
              current (privacy/cut name db true)]
          (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          (privacy/clear-completed! name current)
          (if-let [before (get-in current [:commands command])]
            (do (when-not (= selectors (get before "selectors"))
                  (privacy/failure! 409 "EraseCommandConflict" "The command already used different selectors"))
                (response db before))
            (let [pending (privacy/pending name)
                  _ (when (and pending (not= [command selectors] (mapv #(get pending %) ["commandId" "selectors"])))
                      (privacy/unavailable!))
                  _ (when (and (not pending) (d/entid db [:triplex.claim/command-id command]))
                      (privacy/failure! 409 "EraseCommandConflict" "The command identity is already claimed"))]
              (loop [view db prepared pending]
                (let [entry (or prepared (make-entry name view current command selectors))
                      ;; [DX-ERA2] The selection cannot reach an account whose lock this removal does not hold.
                      _ (when (and buckets (not (every? buckets (removal-scope/entry-buckets entry))))
                          (privacy/unavailable!))
                      _ (when-not prepared (privacy/prepare! name entry))
                      moved (try (apply-native! conn view entry) false
                                  (catch Exception error
                                    (if (some #(= cut-moved (ex-message %)) (take-while some? (iterate ex-cause error)))
                                      true
                                      (throw error))))]
                  (if moved
                    (let [next (sync! conn)
                          committed (d/entid next [:triplex.tx/operation-id (operation-id entry)])]
                      (recur next (when committed entry)))
                    (do (privacy/publish! name current entry)
                        (response (d/db conn) entry))))))))))))))

(defn replay-after-restore! [name conn]
  ;; [DX-ERASE1] Why: data rollback must replay the external prefix before any route becomes eligible.
  ;; Rejected: restoring the old authority alongside the old data (it would make the removed bytes available again).
  (privacy/guard name
    (fn []
      (let [db (sync! conn)
            state (privacy/cut name db)
            entries (sort-by #(get % "seq") (vals (:commands state)))]
        (when-not state (privacy/unavailable!))
        (doseq [entry entries]
          (let [data (sync! conn)
                eid (d/entid data [:triplex.tx/operation-id (operation-id entry)])]
            (if eid
              (let [native (json/read-str (scope/value data eid :triplex.tx/erasure-record))]
                (when-not (and (= (dissoc entry "position") (dissoc native "position"))
                               (= (get native "position") (scope/value data eid :triplex.tx/position)))
                  (privacy/unavailable!)))
              (apply-native! conn data (assoc entry "position" (inc (scope/head-position data (scope/entity data))))))))
        (privacy/verify-data! state (sync! conn))
        {:database name :erasure {:seq (:seq state)}}))))

;; [DX-ERA2] Why: a request on a database guarded per account uses the last published cut while another removal is
;; prepared or natively committed but unpublished: a write is fenced at the serial point on its own accounts, and a
;; read is then a read that started before that removal's publication (TARGETS section 7.1). A native value behind
;; the published log is synced once (another gateway's removal not yet seen by this peer), then refused (a restore
;; must replay first, as before).
;; Rejected: refusing every request of every account while any removal is pending (the database-wide rule).
(defn request-cut [name conn db]
  (loop [db db synced? false]
    (let [state (privacy/cut name db true)]
      (cond
        (nil? state) [nil db]
        (removal-scope/consistent? db (:seq state) (:pending-seq state)) [(assoc state :per-account true) db]
        (and (not synced?) (let [native (removal-scope/native-seq db)] (and (integer? native) (< native (:seq state)))))
        (recur (sync! conn) true)
        :else (privacy/unavailable!)))))

;; [DX-ERA2] Why: move an existing protected database to removal sequences per account (or back), online: under the
;; removal lock, one small transaction (the global sequence moves to its own attribute, the database-wide one takes the
;; sentinel, and each account that ever lost a value gets its sequence from the published log). A save prepared under
;; the other mode fails its fence once and is sent again under the new one.
;; Rejected: rewriting the removal log or the stored rows (neither changes; the log is the same ordered log).
(defn per-account! [name conn input]
  (when-not removal-scope/enabled
    (privacy/failure! 404 "NotFound" "Removal per account is off on this gateway"))
  (when-not (and (map? input) (every? #{"back"} (keys input)) (contains? #{nil true false} (get input "back")))
    (privacy/failure! 400 "InvalidValue" "Expected {} or {\"back\": true}"))
  (let [back? (true? (get input "back"))]
    (privacy/guard name
      (fn []
        (let [db (sync! conn)
              state (privacy/cut name db)]
          (when-not state (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          (privacy/verify-data! state db)
          (let [head (scope/entity db) n (:seq state) per? (removal-scope/per-account? db)
                buckets (:buckets state)
                ops (cond
                      (= back? (not per?)) nil
                      back? [[:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel n]
                             [:db/retract head :triplex.scope/removal-seq n]]
                      :else [[:db/cas head :triplex.scope/erasure-seq n removal-scope/sentinel]
                             [:db/add head :triplex.scope/removal-seq n]])
                counters (when (and ops (not back?))
                           (partition-all 1000 (removal-scope/counter-ops (:entities state) buckets)))
                transact! #(when (= ::timeout (deref (d/transact conn (vec %)) 5000 ::timeout)) (privacy/unavailable!))]
            (when (and ops (not back?)) (removal-scope/install! conn db))
            ;; Counters first (nothing reads them before the mode moves), in parts of 1,000; the move itself last.
            (doseq [part counters] (transact! part))
            (when ops (transact! ops))
            (let [after (sync! conn)]
              {:database name :perAccount (removal-scope/per-account? after) :seq n
               :accounts (count buckets) :entities (count (:entities state)) :changed (boolean ops)})))))))
