(ns triplex.gateway.main
  (:require [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope] [triplex.gateway.erase :as erase] [triplex.gateway.group :as group] [triplex.gateway.group-prepare :as prepared] [triplex.gateway.trace :as trace] [datomic.api :as d] [clojure.data.json :as json] [ring.adapter.jetty :as jetty] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.recent :as recent] [triplex.gateway.entity-cache :as entity-cache] [triplex.gateway.lean :as lean] [triplex.gateway.journal :as journal] [triplex.gateway.stats :as stats] [triplex.gateway.commit :as commit] [triplex.gateway.feed :as feed] [triplex.gateway.reach :as reach] [triplex.gateway.scope :as scope] [triplex.gateway.query :as query] [triplex.gateway.storage :as storage] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.packed-journal :as packed]
            [triplex.gateway.lean-feed :as lean-feed] [triplex.gateway.lean-query :as lean-query]
            [triplex.gateway.small-row :as small-row] [triplex.gateway.write-policy :as policy])
  (:gen-class))

(set! *warn-on-reflection* false)

;; [EXP-DA00] Why: own bounded HTTP gateway on official Peer API (R29/Jepsen pattern). Rejected: undocumented peer-server wire protocol.
;; [DX-H1] Why: SQL storage places the database before the JDBC query. Rejected: suffix concatenation (dev-only).
(def slim-rows? (= "1" (System/getenv "TX2_SLIM_ROWS")))
(def write-options-attempt (System/getenv "TX2_WRITE_OPTIONS_ATTEMPT"))
(def uri-template (or (System/getenv "DATOMIC_URI_TEMPLATE") "datomic:dev://127.0.0.1:4334/{db}"))
(defn db-uri [name] (clojure.string/replace uri-template "{db}" name))
(def connections (atom {}))
 ;; [EXP-DX1] Why: opening a connection must not introduce a no-argument sync on a read route.
;; Rejected: lazy initial sync inside connection (a cold read would contact the transactor).
 ;; [DX-B7-S3] Why: bind every cached read to its connection generation, even when delete/recreate races an old response.
;; Rejected: database name or a lazily recreated config token alone (an old request can republish either).
(defn connection-view [uri]
  (or (@connections uri)
      (locking connections
        (or (@connections uri)
            (let [conn (d/connect uri) watch (feed/subscribe! conn (when recent/enabled #(recent/make-state (d/basis-t (trace/span "d/db" "peer-call" (d/db conn)))))) view {:conn conn :generation (Object.) :recent (:recent watch)}]
              (swap! connections assoc uri view) view)))))
(defn connection [uri] (:conn (connection-view uri)))
(defn sync-db [uri] (let [result (trace/span "d/sync" "peer-wait" (deref (d/sync (connection uri)) 2000 ::timeout))]
                     (when (= result ::timeout) (throw (ex-info "Sync deadline exceeded" {:status 503 :code "SyncTimeout"}))) result))
(def scope-name scope/name-for)
(defn stored-scope [db] (when (d/entid db :triplex.scope/key) (:v (first (d/datoms db :aevt :triplex.scope/key)))))
(defn assert-scope [db scope]
  (when-let [existing (stored-scope db)]
    (when-not (= existing scope) (throw (ex-info "Database name collision" {:status 409 :code "ScopeCollision"})))))
(defn initialize-scope!
  ;; [DX-B8] Why: direct legacy gateway fixtures still exercise the old scope-CAS contract.
  ;; Rejected: silently marking an existing scope v2 during schema installation.
  ([uri scope] (initialize-scope! uri scope "legacy" false))
  ([uri scope layout] (initialize-scope! uri scope layout true))
  ([uri scope layout head-v2] (initialize-scope! uri scope layout head-v2 false))
  ([uri scope layout head-v2 strict-clocks]
  ;; [EXP-DA01] Why: a stale first opener must never reset a writer's position. Rejected: check-then-upsert of the scope header (concurrent initialization race).
  (try
    (:db-after (trace/span "d/transact" "peer-wait" @(d/transact (connection uri)
       [{:db/id (d/tempid :db.part/user) :triplex.scope/bootstrap "singleton"}
        (cond-> {:triplex.scope/key scope :triplex.scope/strict-record-clocks (boolean strict-clocks) :triplex.scope/position 0 :triplex.scope/position-regular true :triplex.scope/rows-version (if (= layout "lean") (if slim-rows? 4 3) 2) :triplex.scope/feed-version 2 :triplex.scope/schema-hash schema/schema-hash}
          head-v2 (assoc :triplex.scope/head-version 2))])))
    (catch Exception e
      (let [current (sync-db uri)]
        (assert-scope current scope)
        (if (stored-scope current) current (throw e)))))))
(defn create-scope!
  ([base scope] (create-scope! base scope "legacy" false))
  ([base scope layout] (create-scope! base scope layout true))
  ([base scope layout head-v2] (create-scope! base scope layout head-v2 false))
  ([base scope layout head-v2 strict-clocks]
  ;; [DX-R3] Why: clock policy is written only by the unique bootstrap winner, never on reopen.
  ;; Rejected: upgrading existing scopes (older/importing writers may regress their clocks).
  (when-not (instance? Boolean strict-clocks) (codec/invalid "strictRecordClocks must be boolean"))
  (when-not (#{"legacy" "lean"} layout) (codec/invalid "Unknown layout"))
  ;; [DX-T1-15] Why: a follower reopen needs one fresh peer cut, and schema or function writes already return their exact db-after.
  ;; Rejected: a no-argument sync for each metadata lookup (the third timed out on the populated 100k scope), or using a stale peer value without sync.
  (let [name (scope-name scope)
        uri (db-uri name)
        created (d/create-database uri)
        conn (connection uri)
        initial (sync-db uri)
        _ (assert-scope initial scope)
        existing (some? (stored-scope initial))
        _ (trace/attribute! :scopeReopen existing)
        initialized (if existing
                      initial
                      (let [after-schema (:db-after (trace/span "d/transact" "peer-wait" @(d/transact conn schema/schema)))]
                        (assert-scope after-schema scope)
                        (if (stored-scope after-schema)
                          after-schema
                          (initialize-scope! uri scope layout head-v2 strict-clocks))))
        schema-ready (if (= schema/schema-hash (:triplex.scope/schema-hash (d/entity initialized [:triplex.scope/key scope])))
                       initialized
                       (do
                         (trace/span "d/transact" "peer-wait" @(d/transact conn schema/schema))
                         (:db-after (trace/span "d/transact" "peer-wait" @(d/transact conn [{:triplex.scope/key scope :triplex.scope/schema-hash schema/schema-hash}])))))
        current (group/install! conn (commit/install! conn scope schema-ready))]
    (cond-> {:db name :created created :schemaHash schema/schema-hash
             :strictRecordClocks (true? (:triplex.scope/strict-record-clocks (d/entity current [:triplex.scope/key scope])))}
      (lean/enabled? current) (assoc :layout "lean" :orderedRowTexts true :journalCuts true)))))
(defn delete-scope! [base scope]
  (let [name (scope-name scope) uri (db-uri name)]
    (when (some #{name} (d/get-database-names (db-uri "*"))) (assert-scope (sync-db uri) scope))
    ;; [EXP-DA00] Why: releasing the last mem peer may destroy it before delete. Rejected: release-first (selftest-3 returned false).
    (let [deleted (d/delete-database uri)]
      (reach/forget! name)
      (when-let [view (@connections uri)] (let [conn (:conn view)] (feed/unsubscribe! conn) (d/release conn) (swap! connections dissoc uri)))
        {:db name :deleted deleted})))
(defn basis [base name]
  (when-not (re-matches #"(s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)" name) (codec/invalid "Invalid database name"))
  (let [db (trace/span "d/db" "peer-call" (d/db (connection (db-uri name)))) scope (stored-scope db)]
    (when-not scope (throw (ex-info "Scope not initialized" {:status 409 :code "ScopeUninitialized"})))
    (let [entity (d/entid db [:triplex.scope/key scope])]
      {:t (codec/encode-value "long" (d/basis-t db))
       :position (codec/encode-value "long" (storage/head-position name db))
       :recordedAt nil :schemaHash (storage/value db entity :triplex.scope/schema-hash)})))
(defn write-options [name]
  ;; [DX-WFIX1] Why: an enabled launcher option can still select the base function on an unopened scope.
  ;; Rejected: an environment listing or a readback from a different database.
  (let [db (sync-db (db-uri name))
        entity (scope/entity db)
        selected (commit/entry db {} (lean/enabled? db))
        selected-id (d/entid db selected)
        installed? (and selected-id (some? (storage/value db selected-id :db/fn)))
        guard (when prepared/enabled
                (if prepared/basis-enabled prepared/basis-ident (prepared/active-guard)))
        guard-id (when guard (d/entid db guard))]
    {:database name :attempt write-options-attempt
     :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")
     :t (str (d/basis-t db)) :position (storage/head-position name db)
     :strictRecordClocks (true? (storage/value db entity :triplex.scope/strict-record-clocks))
     :rowsVersion (storage/value db entity :triplex.scope/rows-version)
     :commitFunction (str selected) :commitFunctionInstalled (boolean installed?)
     :baseFunctionHash (storage/value db entity :triplex.scope/commit-fn-hash)
     :preparedWriter (when guard {:mode (if prepared/basis-enabled "basis" "full")
                                  :guard (str guard)
                                  :installed (boolean (and guard-id (storage/value db guard-id :db/fn)))})
     :options {:predecessorLookup pred/enabled :groupCommit group/enabled
               :livePriority policy/priority? :fieldCoalesce policy/field-only?
               :queueClock group/queue-clock :stageClock group/stage-clock
               :smallRows small-row/enabled :reusePrepared group/reuse-prepared
               :maxMembers group/batch-limit :budgetMicros policy/budget-us
               :bulkRows policy/bulk-rows :bulkBytes policy/bulk-bytes
               :ledger (boolean (or ledger/enabled packed/enabled))
               :packedJournal (boolean packed/enabled) :fastReply (boolean group/fast-reply)}}))
(defn response [status data] {:status status :headers {"Content-Type" "application/json; charset=utf-8"} :body (json/write-str data)})
;; [DX-B2-N3] Why: include UTF-8 encoding before the elapsed header is captured.
;; Rejected: timing the StringBuilder alone (response bytes are not ready yet).
(def ^ThreadLocal request-parse-micros (ThreadLocal.))
(defn timed [start response]
  (let [body (:body response)
        response (if (string? body) (assoc response :body (.getBytes ^String body "UTF-8")) response)]
    (-> response
        (assoc-in [:headers "x-tx2-request-parse-micros"] (str (.get request-parse-micros)))
        (assoc-in [:headers "x-tx2-gateway-micros"] (str (quot (- (System/nanoTime) start) 1000))))))
(defn request-index! [name conn input]
  (let [wait-ms (get input "waitMs")]
    (when-not (and (integer? wait-ms) (<= 1 wait-ms 600000)) (codec/invalid "waitMs must be 1..600000"))
    (let [t (d/basis-t (trace/span "d/db" "peer-call" (d/db conn))) requested (System/currentTimeMillis) job (str (java.util.UUID/randomUUID))]
      (d/request-index conn)
      (let [result (deref (d/sync-index conn t) wait-ms ::timeout) completed (not= result ::timeout)]
        {:job job :database name :requestedT (str t) :requestedAtMs requested :completed completed
         :completedAtMs (when completed (System/currentTimeMillis))}))))
(defn request-json [body]
  (when-not body (codec/invalid "Missing JSON body"))
  (let [bytes (.readNBytes ^java.io.InputStream body 4194305)]
    (when (> (alength bytes) 4194304) (codec/invalid "Request too large"))
    (let [start (System/nanoTime) input (trace/span "gateway.request-parse" "gateway" (json/read-str (String. bytes "UTF-8")))]
      (.set request-parse-micros (quot (- (System/nanoTime) start) 1000)) (if (map? input) (with-meta input {:wire-bytes (alength bytes)}) input))))
(defn writer-definition [function]
  ;; [DX-W1] Why: the stored function exposes the normalized source fields as data.
  ;; Rejected: Object.toString on a compiled function (its display can depend on the instance).
  (pr-str (mapv #(get function %) [:lang :imports :requires :params :code])))
(defn write-layout-options [db database]
  (let [selected (commit/entry db {} (lean/enabled? db))
        [variant body] (commit/variants [true false])
        actual (:db/fn (d/entity db selected))
        source (when actual (writer-definition actual))
        expected (d/function {:lang :clojure :params '[db payload]
                               :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                               :code (if (= selected variant) body commit/code)})]
    {:database database :scope (stored-scope db) :basis (str (d/basis-t db))
     :predecessorRequested (boolean pred/enabled) :predecessorSelected (= selected variant)
     :selectedFunction (str selected) :selectedDefinitionSha256 (when source (schema/sha256 source))
     :installedDefinitionMatches (and (some? source) (= source (writer-definition expected)))
     :ledger (boolean (or ledger/enabled packed/enabled)) :packedJournal (boolean packed/enabled)
     :packedJournalCount (if (d/entid db :triplex.journal/packed)
                           (reduce (fn [n _] (inc n)) 0 (d/datoms db :aevt :triplex.journal/packed)) 0)
     :fastReply (boolean group/fast-reply)
     :leanNativeQuery (boolean lean-query/enabled) :leanNativeLog (boolean lean-feed/enabled)}))
(defn route-handler-base [{:keys [request-method uri body query-string privacy-input]}]
  (stats/bump! [:routes (str (name request-method) " " (clojure.string/replace uri #"/s2?-[^/]+/" "/{db}/"))] 1)
  (try
    (cond
      (and (= :get request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/write-options" uri))
      (let [name (nth (clojure.string/split uri #"/") 3)]
        (response 200 (write-layout-options (sync-db (db-uri name)) name)))
      (= uri "/v2/admin/scan-stats") (response 200 (assoc @stats/counts :idMemo (reach/id-memo-stats) :entityCache (let [base (entity-cache/stats) extra (recent/stats)] (assoc (merge base extra) :bytes (+ (:bytes base) (:recentBytes extra))))))
      (and (= :post request-method) (= uri "/v2/admin/scan-stats/reset")) (do (reset! stats/counts {}) (response 200 {}))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(transactions|command|journal|entity-transactions)" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)
            conn (connection (db-uri name))]
        (timed start {:status 200 :headers {"Content-Type" "application/json; charset=utf-8"}
                     :body (case (last (clojure.string/split uri #"/"))
                             "transactions"
                             (trace/span "journal/page" "gateway" (journal/page conn name input))
                             "journal"
                             (trace/span "journal/entity" "gateway" (journal/entity (trace/span "d/db" "peer-call" (d/db conn)) name input))
                             "entity-transactions"
                             (trace/span "journal/entity-positions" "gateway" (journal/entity-positions (d/db conn) name input))
                             "command"
                             (trace/span "journal/command" "gateway" (journal/command (trace/span "d/db" "peer-call" (d/db conn)) name input)))}))
      (and (= :get request-method) (= "/health" uri))
      (do (trace/span "d/db" "peer-call" (d/db (connection (db-uri "tx2-health"))))
          (response 200 (cond-> {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")}
            (= "1" (System/getenv "TX2_LOAD2_TIMING"))
            (assoc :loadClock {:bootId (get-in trace/identity-fields [:clock :bootId])
                               :run (:run trace/identity-fields) :monoMs (/ (double (System/nanoTime)) 1000000.0)}))))
      (and (= :post request-method) (= "/v1/db/create" uri))
      (response 200 (let [input (request-json body)] (create-scope! uri-template (get input "scope") (get input "layout" "legacy") true (get input "strictRecordClocks" false))))
      (and (= :post request-method) (= "/v1/db/delete" uri))
      (response 200 (delete-scope! uri-template (get (request-json body) "scope")))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/basis" uri))
      (response 200 (basis uri-template (nth (clojure.string/split uri #"/") 3)))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/write-options" uri))
      (response 200 (write-options (nth (clojure.string/split uri #"/") 3)))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/log" uri))
      (let [name (nth (clojure.string/split uri #"/") 3)
            params (into {} (map (fn [part] (let [[k v] (clojure.string/split part #"=" 2)]
                                             (let [^String encoded (or v "")] [k (java.net.URLDecoder/decode encoded "UTF-8")])))
                                  (remove empty? (clojure.string/split (or query-string "") #"&"))))]
        (let [conn (connection (db-uri name)) lean? (lean/enabled? (trace/span "d/db" "peer-call" (d/db conn)))
              protected? (some? privacy/*cut*)]
          ;; [DX-THIN1] Why: protected log requests must use the verified current erasure sequence even at an earlier native t.
          ;; Rejected: choosing the unprotected projector when the native log option is also enabled.
          (when (and lean? (not protected?) (not lean-feed/enabled)) (lean/unsupported! "log"))
          (response 200 (assoc (feed/log-page conn params (cond protected? feed/project-protected
                                                              lean? lean-feed/project
                                                              lean-feed/enabled feed/project-application
                                                              :else feed/project)
                                             (when (and lean? (not protected?)) lean-feed/assert-unprotected!)) :database name))))
      (and (= :post request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/transact" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (or privacy-input (request-json body)) start (System/nanoTime) db-uri (db-uri name)]
        (try (timed start (response 200 (trace/span "storage/commit!" "gateway" (storage/commit! name (connection db-uri) (trace/span "d/db" "peer-call" (d/db (connection db-uri))) input))))
             (finally (when (get input "release") (storage/release! name (get input "handle"))))))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/request-index" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body)]
        (response 200 (request-index! name (connection (db-uri name)) input)))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/begin" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)]
        (timed start (response 200 (trace/span "storage/begin-command!" "gateway" (storage/begin-command! name (trace/span "d/db" "peer-call" (d/db (connection (db-uri name)))) input)))))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(reach|reach-many)" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)
            view (connection-view (db-uri name)) conn (:conn view)
            initial (trace/span "d/db" "peer-call" (d/db conn)) p (get-in input ["basis" "recordedPosition"])
            waited (and (some? p) (> p (storage/head-position name initial)))
            db (if waited (trace/span "storage/await-position" "gateway" (storage/await-position initial p
                 (get input "basisWaitMs")
                 (fn [remaining] (if-let [t (get input "basisT")]
                                   (trace/span "d/sync" "peer-wait" (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout))
                                   (trace/span "d/db" "peer-call" (d/db conn)))) conn)) initial)
            db (trace/span "storage/await-record-time" "gateway" (storage/await-record-time name conn db input))]
        (timed start {:status 200 :headers {"Content-Type" "application/json; charset=utf-8" "x-tx2-waited" (str (boolean waited))}
         :body (trace/span "reach/response" "gateway" (reach/response name db (if (.endsWith ^String uri "reach-many") input (assoc input "roots" [(get input "root")])) (:generation view) (:recent view)))}))
      (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(snapshot|release|transact|read|q|claim|operation/[^/]+)" uri)
      (let [[_ _ _ name action id] (clojure.string/split uri #"/") db-uri (db-uri name)
            input (when (= request-method :post) (request-json body))
            conn (when (and (not= action "release") (or (= action "transact") (not (get input "handle")))) (connection db-uri))
            ;; [EXP-DA01] Why: held queries need no transactor sync and must never substitute a new db between requests (Q89d). Rejected: unconditional per-request sync.
            db (when conn
                 (trace/span "storage/await-position" "gateway" (storage/await-position (trace/span "d/db" "peer-call" (d/db conn))
                   (if (= action "claim") (get input "position") (get-in input ["basis" "recordedPosition"]))
                   (get input "basisWaitMs")
                   (fn [remaining] (if-let [t (get input "basisT")]
                                     (trace/span "d/sync" "peer-wait" (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout))
                                     (trace/span "d/db" "peer-call" (d/db conn)))) conn)))
            db (when conn (trace/span "storage/await-record-time" "gateway" (storage/await-record-time name conn db input)))]
        (response 200
          (case action
            "snapshot" (storage/begin! name db)
            "release" (storage/release! name (get input "handle"))
            "transact" (try (trace/span "storage/commit!" "gateway" (storage/commit! name conn db input))
                         (finally (when (get input "release") (storage/release! name (get input "handle")))))
            "read" (trace/span "storage/read-rows" "gateway" (storage/read-rows name db input))
            "q" (trace/span "query/run" "gateway"
                  (do (when privacy/*cut*
                        (throw (ex-info "Lean queries need current erasure-aware value semantics"
                                        {:status 409 :code "ErasureQueryUnsupported" :route "q"})))
                      (when (and lean-query/enabled (lean/enabled? (or db (storage/held-db name (get input "handle")))))
                        (lean-query/assert-unprotected! (or db (d/db (connection db-uri)))))
                      (query/run name db input)))
            "operation" (storage/operation db id)
            "claim" (let [cut (storage/at-position db (get input "position"))
                          id (get input "commandId") claim (d/entid cut [:triplex.claim/command-id id])
                          tx (when claim (ledger/claim-tx cut claim))
                          pos (when (and tx (d/entid cut :triplex.group/position)) (storage/value cut tx :triplex.group/position))
                          visible (and claim (or (nil? pos) (nil? (get input "position")) (<= pos (get input "position"))))
                          tx-id (when visible (ledger/claim-tx-id cut claim))]
                      (cond-> {:txId tx-id}
                        (and visible (true? (get input "receipt"))) (assoc :commandId id
                          :receipt (storage/operation cut (storage/value cut tx :triplex.tx/operation-id))))))))
      :else (response 404 {:code "NotFound"}))
    (catch Exception e (response (or (:status (ex-data e)) (if (= uri "/health") 503 400))
                                (cond-> {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e) :maximum (or (:maximum (ex-data e)) (:expectedSequence (ex-data e))) :route (:route (ex-data e))}
                                  (:expectedSequence (ex-data e)) (assoc :expectedSequence (:expectedSequence (ex-data e))))))))
(defn- with-privacy-guards [scopes work]
  (if-let [[scope & more] (seq scopes)]
    (privacy/guard scope #(with-privacy-guards more work))
    (work)))

(defn route-handler [{:keys [uri request-method body] :as request}]
  (if-let [[_ name action] (re-matches #"/v[12]/db/(s2-[A-Za-z0-9_-]+)/(.+)" uri)]
    (try
      (let [[conn db] (trace/span "privacy/current-data" "gateway"
                        (let [conn (connection (db-uri name))] [conn (d/db conn)]))]
        (cond
          (and (= :post request-method) (= action "protection"))
          (response 200 (erase/declare! name conn db (request-json body)))
          (and (= :post request-method) (= action "erase"))
          (response 200 (erase/erase! name conn (request-json body)))
          (and (= :post request-method) (= action "restore-erasure"))
          (response 200 (erase/replay-after-restore! name conn))
          :else
          (let [input (when (and (= :post request-method) (= action "transact")) (request-json body))
                managed-write? (and input (trace/span "privacy/write-policy" "gateway" (privacy/managed? name db)))
                source (get input "erasureSourceDatabase")
                _ (when (and source (not (and (string? source) (re-matches #"s2-[A-Za-z0-9_-]+" source))))
                    (codec/invalid "Invalid source scope for protected delivery"))
                request (cond-> request input (assoc :privacy-input input))
                run (fn [cut]
                      (trace/attribute! :erasureGuarded (boolean cut))
                      (binding [privacy/*cut* cut privacy/*database* name privacy/*data* db
                                privacy/*unseal* (fn [id e a value] (envelope/decode! name (d/db conn) id e a value))]
                        (let [answer (if (and (= :get request-method) (= action "erasure-frontier"))
                                       (response 200 {:database name :protected (boolean cut)
                                                      :seq (or (:seq cut) 0) :erased (or (:erased cut) {})})
                                       (route-handler-base request))]
                          (cond-> answer cut (assoc-in [:headers "x-triplex-erasure-seq"] (str (:seq cut)))))))]
            (if (and input (or managed-write? source))
              ;; [DX-ERASE1] Why: the source cannot publish an erasure between validation and recipient commit.
              ;; Rejected: an HTTP recheck followed by an independent recipient write.
              (with-privacy-guards (sort (cond-> #{} managed-write? (conj name) source (conj source)))
                (fn []
                  (let [[current next] (trace/span "privacy/write-frontier" "gateway"
                                         (let [current (d/db conn)] [current (privacy/cut name current)]))]
                    (when (and managed-write? (nil? next)) (privacy/unavailable!))
                    (trace/span "privacy/verify-write" "gateway" (privacy/verify-data! next current))
                    (when (or source (contains? input "erasureSeq"))
                      (if source
                        (let [source-db (d/db (connection (db-uri source)))
                              source-cut (privacy/cut source source-db)]
                          (privacy/verify-data! source-cut source-db)
                          (privacy/ensure-seq! source-cut (get input "erasureSeq")))
                        (privacy/ensure-seq! next (get input "erasureSeq"))))
                    (run next))))
              ;; [DX-ERASE1] Why: a guarded write only needs the cut verified inside the writer lock.
              ;; Rejected: reading and hashing the authority twice on every guarded save.
              (let [read-cut (when-not input
                               (trace/span "privacy/frontier" "gateway" (privacy/cut name db)))]
                (when read-cut (trace/span "privacy/verify-data" "gateway" (privacy/verify-data! read-cut db)))
                (when (contains? input "erasureSeq") (privacy/ensure-seq! read-cut (get input "erasureSeq")))
                (run read-cut))))))
      (catch Exception e
        (let [info (ex-data e)]
          (response (or (:status info) 400) {:code (or (:code info) "GatewayError") :message (.getMessage e)}))))
    (route-handler-base request)))

(defn handler [request] (trace/handler route-handler request))
(defn -main [& _]
  (envelope/start!)
  (d/create-database (db-uri "tx2-health"))
  ;; [EXP-DX1] Why: synchronize existing databases before accepting HTTP, not from their first read.
  ;; Rejected: per-read initialization barriers.
  ;; [DX-B2-N3] Why: a scope may be deleted after catalog enumeration during startup.
  ;; Rejected: swallowing all startup failures (would hide a storage outage).
  (doseq [name (d/get-database-names (db-uri "*"))]
    (try (sync-db (db-uri name))
         (catch Exception e
           (when (some #{name} (d/get-database-names (db-uri "*"))) (throw e)))))
  (jetty/run-jetty handler {:port 8080 :host "0.0.0.0" :join? true :min-threads 8 :max-threads 512}))
