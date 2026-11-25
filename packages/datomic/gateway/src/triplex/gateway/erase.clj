(ns triplex.gateway.erase
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.envelope :as envelope]
            [triplex.gateway.lean :as lean] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.scope :as scope])
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
    ;; [DX-ERA2 sixth pass, V1] a database guarded per account is declared through removal-commit/protect! (its policy
    ;; is in the database); a gateway without the option must not write its log's policy
    (when (contains? #{-1 -2} (scope/value db (scope/entity db) :triplex.scope/erasure-seq)) (privacy/unavailable!))
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
      ;; [DX-ERA2 sixth pass] a value of an attribute added to the policy later may be stored in clear
      (when (and (:sealed policy) (nil? private-id)) (when-not (contains? (:added policy) (:attribute row)) (privacy/unavailable!)))
      [row])
    (let [attribute (get selector "attribute") owner (get selector "entityId")]
      (when (and attribute (not ((:attrs policy) attribute)))
        (privacy/failure! 400 "EraseNotProtected" "The attribute is outside the protected policy"))
      ;; [DX-ERASE1] Why: erase seeks the detached protected history for this owner.
      ;; Rejected: decoding the owner's ordinary rows and traversing their retired value history.
      (let [rows (if (:sealed policy)
                   ;; [DX-ERA2 sixth pass] and, guarded per account, the values of attributes added to the policy later
                   ;; that are stored in clear (removal-commit/clear-rows): masked by identity like every removed value
                   (concat (map #(envelope/assertion-identity db (:e %)) (d/datoms db :avet :triplex.private/entity owner))
                           (when (seq (:added policy))
                             ((requiring-resolve 'triplex.gateway.removal-commit/clear-rows) db owner policy attribute)))
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
        ;; [DX-ERA2 fifth pass, Z1] the removal's record as published, when a restore's replay carries it (metadata
        ;; :published): the replay lands at the next free position (its journal and transaction say so) but keeps the
        ;; published record, so the data's records and the log stay one chain and the commit boundary sees the same
        ;; removal. One arity, so a caller that wraps this function keeps working.
        raw (get (meta entry) :published (json/write-str entry))
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
                    ((requiring-resolve 'triplex.gateway.removal-scope/per-account?) current)
                    ;; [DX-ERA2 fifth pass] on the value this removal's view read (-1, or -2 with the commit boundary)
                    (into (cons [:db/cas head :triplex.scope/erasure-seq (scope/value current head :triplex.scope/erasure-seq)
                                 (scope/value current head :triplex.scope/erasure-seq)]
                                (cons [:db/cas head :triplex.scope/removal-seq (dec (get entry "seq")) (get entry "seq")]
                                      ((requiring-resolve 'triplex.gateway.removal-scope/entry-ops) entry))))
                    (not ((requiring-resolve 'triplex.gateway.removal-scope/per-account?) current))
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

;; [DX-ERA2 seventh pass, identities] the per-account helpers this file used (selector-buckets, the account locks, the
;; tries line, request-cut, per-account!) live in removal_scope.clj, which loads after every installed function's code
;; is read; this file calls them through requiring-resolve and keeps the base's generated names.
(defn erase! [name conn input]
  ;; Nested if, not `and`: `and` generates a name, which would renumber the installed functions loaded after this file.
  (if ((requiring-resolve 'triplex.gateway.removal-scope/per-account?) (d/db conn))
    ((requiring-resolve 'triplex.gateway.removal-commit/erase!) name conn input)
  (let [selectors (selectors! input)
        started (System/nanoTime)
        command (get input "commandId")
        db (d/db conn)
        ;; [DX-ERA2] Per account, a removal also holds the locks of the accounts it can touch, which is what a derived
        ;; write naming those accounts holds instead of the database's lock.
        buckets (when ((requiring-resolve 'triplex.gateway.removal-scope/per-account?) db) ((requiring-resolve 'triplex.gateway.removal-scope/selector-buckets) db selectors))]
    (when-not (privacy/cut name db true)
      (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
    (privacy/guard name
      ((requiring-resolve 'triplex.gateway.removal-scope/bucket-guarded) name buckets (fn []
        (let [db (sync! conn)
              current (privacy/cut name db true)]
          (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          ;; [DX-ERA3 F3] A database guarded per account that this gateway cannot treat as such (it runs without the
          ;; option): refuse before anything is written, so no intent is left for the fleet to trip over.
          (when (contains? #{-1 -2} (scope/value db (scope/entity db) :triplex.scope/erasure-seq)) (privacy/unavailable!))
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
              (loop [view db prepared pending tries 1]
                (let [entry (or prepared (make-entry name view current command selectors))
                      ;; [DX-ERA2] The selection cannot reach an account whose lock this removal does not hold.
                      _ (when buckets (when-not (every? buckets ((requiring-resolve 'triplex.gateway.removal-scope/entry-buckets) entry))
                                        (privacy/unavailable!)))
                      _ (when-not prepared (privacy/prepare! name entry))
                      moved (try (apply-native! conn view entry) false
                                  (catch Exception error
                                    (if (some #(= cut-moved (ex-message %)) (take-while some? (iterate ex-cause error)))
                                      true
                                      (throw error))))]
                  (if moved
                    (let [next (sync! conn)
                          committed (d/entid next [:triplex.tx/operation-id (operation-id entry)])]
                      (recur next (when committed entry) (inc tries)))
                    (do (privacy/publish! name current entry)
                        ((requiring-resolve 'triplex.gateway.removal-scope/log-tries!) entry tries buckets started)
                        (response (d/db conn) entry))))))))))))))

(defn replay-after-restore! [name conn]
  ;; [DX-ERASE1] Why: data rollback must replay the external prefix before any route becomes eligible.
  ;; Rejected: restoring the old authority alongside the old data (it would make the removed bytes available again).
  (privacy/guard name
    (fn []
      ;; [DX-ERA2 sixth pass, F4 of the B2 review] a removal left pending does not stop the replay of the published log
      ;; (its intent is not a published removal); it is completed afterwards by its resend or the gateway
      (let [db (sync! conn)
            state (privacy/cut name db true)
            entries (sort-by #(get % "seq") (vals (:commands state)))]
        (when-not state (privacy/unavailable!))
        (doseq [entry entries]
          (let [data (sync! conn)
                eid (d/entid data [:triplex.tx/operation-id (operation-id entry)])]
            (if eid
              (let [native (json/read-str (scope/value data eid :triplex.tx/erasure-record))]
                ;; [DX-ERA2 fifth pass, Z1] the published record itself (a replay by this build), or one an earlier
                ;; build replayed with its new position written into the record
                (if (= entry native) nil
                  (when-not (and (= (dissoc entry "position") (dissoc native "position"))
                                 (= (get native "position") (scope/value data eid :triplex.tx/position)))
                    (privacy/unavailable!))))
              (apply-native! conn data (with-meta (assoc entry "position" (inc (scope/head-position data (scope/entity data))))
                                         {:published (json/write-str entry)})))))
        ;; [DX-ERA3] A restored copy guarded per account: counters, declaration and held accounts from the log.
        (when ((requiring-resolve 'triplex.gateway.removal-scope/per-account?) (sync! conn))
          ((requiring-resolve 'triplex.gateway.removal-commit/rebuild!) conn (sync! conn) state))
        (privacy/verify-data! state (sync! conn))
        {:database name :erasure {:seq (:seq state)}}))))
