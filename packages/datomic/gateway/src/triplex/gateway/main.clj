(ns triplex.gateway.main
  (:require [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope] [triplex.gateway.erase :as erase]
            [triplex.gateway.group :as group] [triplex.gateway.group-prepare :as prepared] [triplex.gateway.trace :as trace] [datomic.api :as d] [clojure.data.json :as json] [ring.adapter.jetty :as jetty] [triplex.gateway.save-ledger :as ledger] [triplex.gateway.pinned :as pinned] [triplex.gateway.group-cut :as group-cut]
            [triplex.gateway.recent :as recent] [triplex.gateway.entity-cache :as entity-cache] [triplex.gateway.lean :as lean] [triplex.gateway.journal :as journal] [triplex.gateway.stats :as stats] [triplex.gateway.commit :as commit] [triplex.gateway.feed :as feed] [triplex.gateway.reach :as reach] [triplex.gateway.scope :as scope] [triplex.gateway.query :as query] [triplex.gateway.storage :as storage] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.packed-journal :as packed]
            [triplex.gateway.write-wire :as write-wire]
            [triplex.gateway.lean-feed :as lean-feed] [triplex.gateway.lean-query :as lean-query]
            [triplex.gateway.small-row :as small-row] [triplex.gateway.write-policy :as policy]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.owner-layout :as owner-layout]
            [triplex.gateway.at-least :as at-least]
            [triplex.gateway.general-prefetch :as general-prefetch] [triplex.gateway.admission :as admission]
            [triplex.gateway.subject-hints :as subject-hints]
            [triplex.gateway.ids :as ids] [triplex.gateway.sweep :as sweep]
            ;; [DX-ACT9] Last, after every namespace whose stored function text carries generated names (DX-ERA2's code
            ;; renumbered 17 of 58 of them when it loaded first).
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.removal-erase :as removal-erase])
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
        current (subject/install! conn (group/install! conn (commit/install! conn scope schema-ready)))
        current (owner-layout/install! conn current)
        ;; [DX-W3] Why: the lookup-only hint function is installed only when its option is on (default off).
        current (general-prefetch/install! conn current)
        ;; [DX-W4] Why: the per-subject writer's lookup-only hint function, installed only when its option is on.
        current (subject-hints/install! conn current)]
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
(defn basis
  ([base name] (basis base name nil))
  ;; [DX-RD4] Why: with `atLeast` the head answered is at or after the reader's receipt; the reply echoes the request.
  ;; Rejected: a new route (every reader already resolves its head here) or answering at the asked position.
  ([base name wanted]
  (when-not (re-matches #"(s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)" name) (codec/invalid "Invalid database name"))
  (let [conn (connection (db-uri name)) current (trace/span "d/db" "peer-call" (d/db conn)) scope (stored-scope current)]
    (when-not scope (throw (ex-info "Scope not initialized" {:status 409 :code "ScopeUninitialized"})))
    (let [{:keys [db waitMicros]} (if wanted (at-least/await! name conn current wanted) {:db current})
          entity (d/entid db [:triplex.scope/key scope])]
      (cond-> {:t (codec/encode-value "long" (d/basis-t db))
               :position (codec/encode-value "long" (storage/head-position name db))
               :recordedAt nil :schemaHash (storage/value db entity :triplex.scope/schema-hash)}
        wanted (assoc :atLeast (:position wanted) :atLeastWaitMicros waitMicros))))))
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
        guard-id (when guard (d/entid db guard))
        subject-t (when subject/enabled (subject/installed db))]
    (cond-> {:database name :attempt write-options-attempt
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
                       :packedJournal (boolean packed/enabled) :fastReply (boolean group/fast-reply)
                       :pinnedShortcut pinned/enabled :pinnedCutLookup group-cut/current-lookup}}
      ;; [DX-W3] Why: report the option only when it is on, so default readbacks stay byte-identical.
      general-prefetch/enabled (assoc-in [:options :generalPrefetch] (general-prefetch/installed? db))
      ;; [DX-W4] Why: report the option only when it is on, so default readbacks stay byte-identical.
      subject-hints/enabled (assoc-in [:options :subjectHints] (subject-hints/installed? db))
      ;; [DX-IMP2] Why: report the option only when it is on, so default readbacks stay byte-identical.
      policy/import-whole? (update :options assoc :importWholeSubject true :importCommitMicros policy/import-commit-us)
      subject/enabled (assoc :subjectSave true :subjectFunction (when subject-t (str subject/ident))
                             :subjectNumericOwner subject/numeric-owner?
                             :subjectOrderedIds subject/ordered-ids?
                             :subjectNarrowRevision subject/narrow-revision?
                             :subjectReusePredecessor subject/reuse-predecessor?
                             :subjectAppendRetirement subject/append-retirement?
                             :subjectOwnerHead (boolean (and owner-layout/enabled (owner-layout/installed? db)))
                             :subjectOwnerHeadFunction (when (and owner-layout/enabled (owner-layout/installed? db))
                                                         (str owner-layout/ident))
                             :subjectPrefetch (boolean (and subject/prefetch? (d/entid db subject/prefetch-ident)))
                             :subjectFunctionTx (some-> subject-t str))
      ;; [Opus W2] Why: launchers read back the actual wide-save switch; the reply is unchanged with the option off.
      subject/wide? (assoc :subjectWide true :subjectWideFacts subject/wide-facts))))
(defn response [status data] {:status status :headers {"Content-Type" "application/json; charset=utf-8"}
                             :body (trace/read-span "gateway.json-encode" "gateway" (json/write-str data))})
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
;; [DX-W3] Why: Jetty's own pool says how many web threads are busy and how many requests wait for one.
;; Rejected: inferring thread starvation from client latency alone (the 2026-11-23 runs recorded no thread counts).
(def http-max-threads
  (let [n (Integer/parseInt (or (not-empty (System/getenv "TX2_HTTP_MAX_THREADS")) "512"))]
    (when-not (<= 8 n 4096) (throw (IllegalArgumentException. "TX2_HTTP_MAX_THREADS must be 8..4096"))) n))
(defonce jetty-server (atom nil))
(defonce thread-peaks (atom {:busyPeak 0 :queuedPeak 0 :samples 0 :samplesWithQueue 0 :samplesNoIdle 0}))
(defn- pool-now []
  (when-let [^org.eclipse.jetty.server.Server server @jetty-server]
    (let [^org.eclipse.jetty.util.thread.QueuedThreadPool pool (.getThreadPool server)]
      {:maxThreads (.getMaxThreads pool) :threads (.getThreads pool) :idleThreads (.getIdleThreads pool)
       :busyThreads (.getBusyThreads pool) :queuedRequests (.getQueueSize pool)})))
(defn thread-stats []
  (merge {:http (pool-now) :peaks @thread-peaks :sampling (= "1" (System/getenv "TX2_THREAD_COUNTERS"))
          :atMs (System/currentTimeMillis)}
         (admission/read-stats)))
(defn reset-thread-peaks! []
  (reset! thread-peaks {:busyPeak 0 :queuedPeak 0 :samples 0 :samplesWithQueue 0 :samplesNoIdle 0})
  (admission/reset-peaks!))
;; [DX-W3] Why: a starved gateway cannot answer the stats route, so peaks are sampled from inside, every 50 ms.
;; Default off (TX2_THREAD_COUNTERS=1): no background thread unless asked for.
(defn start-thread-sampler! []
  (when (= "1" (System/getenv "TX2_THREAD_COUNTERS"))
    (doto (Thread. (fn []
                     (loop []
                       (when-let [{:keys [busyThreads queuedRequests idleThreads]} (pool-now)]
                         (swap! thread-peaks (fn [p] (-> p (update :samples inc)
                                                         (update :busyPeak max busyThreads)
                                                         (update :queuedPeak max queuedRequests)
                                                         (cond-> (pos? queuedRequests) (update :samplesWithQueue inc)
                                                                 (zero? idleThreads) (update :samplesNoIdle inc))))))
                       (Thread/sleep 50)
                       (recur)))
                   "tx2-thread-sampler")
      (.setDaemon true) (.start))))
;; [DX-ERA2 fifth pass] A failure of the PostgreSQL removal authority itself (its session killed or closed mid-way, the
;; server unreachable), anywhere in an exception's causes. It is the authority's state, not the request's fault: the
;; answer is a typed 503, and on a database guarded per account the gateway completes any removal the failure left
;; pending (with a fresh session) once the request has released its locks.
(defn- authority-fault? [^Throwable e]
  (boolean (some #(instance? java.sql.SQLException %) (take 8 (take-while some? (iterate #(.getCause ^Throwable %) e))))))
(defn- authority-refusal [^Throwable e]
  (ex-info "The removal authority failed mid-way (its session was lost); this gateway completes what it left pending. Send the request again."
           {:status 503 :code "ErasureFrontierUnavailable" :removal-pending true :authority-fault true} e))

(defn route-handler-base [{:keys [request-method uri body query-string privacy-input]}]
  (stats/bump! [:routes (str (name request-method) " " (clojure.string/replace uri #"/s2?-[^/]+/" "/{db}/"))] 1)
  (try
    (cond
      (and (= :get request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/write-options" uri))
      (let [name (nth (clojure.string/split uri #"/") 3)]
        (response 200 (write-layout-options (sync-db (db-uri name)) name)))
      ;; [DX-W3] Why: say whether reads, the web thread pool or the permit queue hold a request back.
      (and (= :get request-method) (= uri "/v2/admin/threads")) (response 200 (thread-stats))
      (and (= :post request-method) (= uri "/v2/admin/threads/reset")) (do (reset-thread-peaks!) (response 200 (thread-stats)))
      (= uri "/v2/admin/scan-stats") (response 200 (cond-> (assoc @stats/counts :idMemo (reach/id-memo-stats) :pinnedShortcut (pinned/stats) :entityCache (let [base (entity-cache/stats) extra (recent/stats)] (assoc (merge base extra) :bytes (+ (:bytes base) (:recentBytes extra)))))
                                                     ;; [DX-SCALE2] Accounts holding a sweep gate (only when the sweep is on).
                                                     sweep/enabled (assoc :sweepGates (sweep/gate-count))))
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
      (let [start (System/nanoTime)]
        (timed start (response 200 (basis uri-template (nth (clojure.string/split uri #"/") 3) (at-least/from-query query-string)))))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/write-options" uri))
      (response 200 (write-options (nth (clojure.string/split uri #"/") 3)))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/log" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) start (System/nanoTime)
            params (into {} (map (fn [part] (let [[k v] (clojure.string/split part #"=" 2)]
                                             (let [^String encoded (or v "")] [k (java.net.URLDecoder/decode encoded "UTF-8")])))
                                  (remove empty? (clojure.string/split (or query-string "") #"&"))))]
        (let [conn (connection (db-uri name)) lean? (lean/enabled? (trace/span "d/db" "peer-call" (d/db conn)))
              protected? (some? privacy/*cut*)]
          ;; [DX-THIN1] Why: protected log requests must use the verified current erasure sequence even at an earlier native t.
          ;; Rejected: choosing the unprotected projector when the native log option is also enabled.
          (when (and lean? (not protected?) (not lean-feed/enabled)) (lean/unsupported! "log"))
          ;; [DX-DEMO1] Why: report the gateway's own time on the feed, as on journal pages. Rejected: client wall time through a tunnel.
          (timed start (response 200 (assoc (feed/log-page conn params (cond protected? feed/project-protected
                                                              lean? lean-feed/project
                                                              lean-feed/enabled feed/project-application
                                                              :else feed/project)
                                             (when (and lean? (not protected?)) lean-feed/assert-unprotected!)) :database name)))))
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
      (let [name (nth (clojure.string/split uri #"/") 3) input (trace/read-span "gateway.request-decode" "gateway" (request-json body)) start (System/nanoTime)
            view (connection-view (db-uri name)) conn (:conn view)
            initial (trace/span "d/db" "peer-call" (d/db conn)) p (get-in input ["basis" "recordedPosition"])
            wanted (at-least/from-body input)
            waited (and (some? p) (> p (storage/head-position name initial)))
            db (if waited (trace/span "storage/await-position" "gateway" (storage/await-position initial p
                 (get input "basisWaitMs")
                 (fn [remaining] (if-let [t (get input "basisT")]
                                   (trace/span "d/sync" "peer-wait" (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout))
                                   (trace/span "d/db" "peer-call" (d/db conn)))) conn)) initial)
            ;; [DX-RD4] An unpinned reach with atLeastPosition answers at the peer's head once it has that position.
            {db :db at-least-micros :waitMicros} (if wanted (at-least/await! name conn db wanted) {:db db})
            db (trace/span "storage/await-record-time" "gateway" (storage/await-record-time name conn db input))]
        (timed start {:status 200 :headers (cond-> {"Content-Type" "application/json; charset=utf-8" "x-tx2-waited" (str (boolean waited))}
                                             wanted (assoc "x-tx2-at-least" (str (:position wanted)) "x-tx2-at-least-wait-micros" (str at-least-micros)))
         :body (trace/span "reach/response" "gateway" (reach/response name db (if (.endsWith ^String uri "reach-many") input (assoc input "roots" [(get input "root")])) (:generation view) (:recent view)))}))
      (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(snapshot|release|transact|read|q|claim|operation/[^/]+)" uri)
      (let [[_ _ _ name action id] (clojure.string/split uri #"/") db-uri (db-uri name) start (System/nanoTime)
            input (when (= request-method :post) (trace/read-span "gateway.request-decode" "gateway" (request-json body)))
            conn (when (and (not= action "release") (or (= action "transact") (not (get input "handle")))) (connection db-uri))
            ;; [EXP-DA01] Why: held queries need no transactor sync and must never substitute a new db between requests (Q89d). Rejected: unconditional per-request sync.
            db (when conn
                 (trace/span "storage/await-position" "gateway" (storage/await-position (trace/span "d/db" "peer-call" (d/db conn))
                   (if (= action "claim") (get input "position") (get-in input ["basis" "recordedPosition"]))
                   (get input "basisWaitMs")
                   (fn [remaining] (if-let [t (get input "basisT")]
                                     (trace/span "d/sync" "peer-wait" (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout))
                                     (trace/span "d/db" "peer-call" (d/db conn)))) conn)))
            ;; [DX-RD4] Why: snapshot, read and q resolve an unpinned basis from the peer's head; atLeastPosition makes
            ;; that head at least the reader's receipt. Rejected: accepting it silently on routes that never read a head.
            wanted (when (contains? input "atLeastPosition")
                     (when-not (#{"snapshot" "read" "q"} action)
                       (codec/invalid "atLeastPosition is accepted only on basis, snapshot, read, q, reach and reach-many"))
                     (at-least/from-body input))
            {db :db at-least-micros :waitMicros} (if wanted (at-least/await! name conn db wanted) {:db db})
            db (when conn (trace/span "storage/await-record-time" "gateway" (storage/await-record-time name conn db input)))]
        ;; [DX-DEMO1] Why: every read route reports the gateway's own time beside the reply.
        ;; Rejected: inferring server time from the client's round trip.
        (timed start (let [result (case action
            "snapshot" (storage/begin! name db)
            "release" (storage/release! name (get input "handle"))
            "transact" (try (trace/span "storage/commit!" "gateway" (storage/commit! name conn db input))
                         (finally (when (get input "release") (storage/release! name (get input "handle")))))
            "read" (trace/span "storage/read-rows" "gateway" (storage/read-rows name db input))
            "q" (trace/span "query/run" "gateway"
                  (do (when (and privacy/*cut* (not (lean/enabled? (or db (storage/held-db name (get input "handle"))))))
                        (throw (ex-info "Lean queries need current erasure-aware value semantics"
                                        {:status 409 :code "ErasureQueryUnsupported" :route "q"})))
                      (when (and (nil? privacy/*cut*) lean-query/enabled (lean/enabled? (or db (storage/held-db name (get input "handle")))))
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
                          :receipt (storage/operation cut (storage/value cut tx :triplex.tx/operation-id))))))]
          (cond-> (response 200 (cond-> result (and wanted (map? result)) (assoc :atLeast (:position wanted))))
            wanted (assoc-in [:headers "x-tx2-at-least-wait-micros"] (str at-least-micros))))))
      ;; [DX-XQ3] The ID list route (questions across subjects, step 0); absent unless TX2_ID_LISTS=1.
      (and ids/enabled (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/ids" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)]
        (try (timed start (response 200 (trace/span "ids/page" "gateway" (ids/page name (connection (db-uri name)) input))))
             (catch clojure.lang.ExceptionInfo e
               (let [{:keys [status code maximum retryAfterMs]} (ex-data e)]
                 (if (and status code)
                   (timed start (response status (cond-> {:code code :message (.getMessage e) :route "ids"}
                                                   (some? maximum) (assoc :maximum maximum)
                                                   (some? retryAfterMs) (assoc :retryAfterMs retryAfterMs))))
                   (throw e))))))
      ;; [DX-XQ6] The exact sweep (questions across subjects, read subject by subject); absent unless TX2_SWEEP=1.
      (and sweep/enabled (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/sweep" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)
            protected (or (:attrs privacy/*cut*) #{})]
        (try (timed start (response 200 (trace/span "sweep/page" "gateway" (sweep/page name (connection (db-uri name)) protected input))))
             (catch clojure.lang.ExceptionInfo e
               (let [{:keys [status code maximum retryAfterMs]} (ex-data e)]
                 (if (and status code)
                   (timed start (response status (cond-> {:code code :message (.getMessage e) :route "sweep"}
                                                   (some? maximum) (assoc :maximum maximum)
                                                   (some? retryAfterMs) (assoc :retryAfterMs retryAfterMs))))
                   (throw e))))))
      :else (response 404 {:code "NotFound"}))
    (catch Exception e0
      ;; [DX-ERA2 fifth pass] the PostgreSQL authority's session lost mid-way: a typed 503, never a 400; on a database
      ;; route with the completion tag, so route-handler completes what it left pending
      (let [db-route? (boolean (re-matches #"/v[12]/db/s2-[A-Za-z0-9_-]+/.+" uri))
            e (if (authority-fault? e0)
                (do ((requiring-resolve 'triplex.gateway.failures/note!) "authority" uri e0)
                    (if db-route? (authority-refusal e0)
                      (ex-info "The removal authority is unavailable" {:status 503 :code "ErasureFrontierUnavailable"} e0)))
                e0)]
      ;; [DX-ERA2 fifth pass, Z3] a refusal that starts a completion (a pending removal, a missing log) leaves with its
      ;; tag: route-handler completes it once the request's locks are released
      (when (:removal-pending (ex-data e)) (throw e))
      (when (:removal-log-missing (ex-data e)) (throw e))
      ;; [DX-ERA2 fifth pass] an exception that is not a typed refusal is a fault: counted and logged (the commit
      ;; boundary's restore defect was answered 400 GatewayError with no message and no log line)
      (when-not (instance? clojure.lang.ExceptionInfo e) ((requiring-resolve 'triplex.gateway.failures/note!) "gateway-error" uri e))
      (response (or (:status (ex-data e)) (if (= uri "/health") 503 400))
                                (cond-> {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e) :maximum (or (:maximum (ex-data e)) (:expectedSequence (ex-data e))) :route (:route (ex-data e))}
                                  (:expectedSequence (ex-data e)) (assoc :expectedSequence (:expectedSequence (ex-data e)))
                                  (:retryAfterMs (ex-data e)) (assoc :retryAfterMs (:retryAfterMs (ex-data e)))
                                  (:estimatedMicros (ex-data e)) (assoc :estimatedMicros (:estimatedMicros (ex-data e)))))))))
;; [DX-ACT9] TX2_ACCOUNT_TICKETS=1 (default off; effective only with TX2_REMOVAL_PER_ACCOUNT=1): a cross-database ticket
;; (a delivery into a recipient database) that names its source accounts is checked under the source's account locks
;; instead of the source database's lock; the removal frontier reports which entities of an account were touched after
;; a sequence. Why: one database holds every account, so a delivery of any account waited for and was then refused by
;; every removal of the source, and a recorded notice can be checked per subject only if the client can tell which
;; subjects a removal touched. Unset: both routes answer exactly as before. ACCOUNT-TICKETS.md sections 3.2 and 4.
;; Rejected: checking a cross-database ticket against the source's published sequence alone (a removal committed in
;; Datomic and not yet published would pass it); a fence in the recipient's transaction (it cannot see the source's
;; counters).
(def ^:private account-tickets (if removal-scope/enabled (= "1" (System/getenv "TX2_ACCOUNT_TICKETS")) false))
(def ^:private touched-limit 1024)

(defn- query-param [query-string k]
  (some (fn [part]
          (let [[a v] (clojure.string/split part #"=" 2)]
            (when (= a k) (java.net.URLDecoder/decode (or v "") "UTF-8"))))
        (clojure.string/split (or query-string "") #"&")))

(defn- touched-fields
  "With ?account=A&since=S: the entities of account A whose removal counter in this published cut is above S, sorted, at
  most touched-limit, and whether that is all of them."
  [cut query-string]
  (let [account (query-param query-string "account") since (query-param query-string "since")]
    (when (and (seq account) since (re-matches #"0|[1-9][0-9]{0,15}" since))
      (let [s (Long/parseLong since)
            hits (sort (keep (fn [[e n]] (when (and (> n s) (= account (removal-scope/bucket e))) e)) (:entities cut)))]
        {:since s :touched (vec (take touched-limit hits)) :touchedComplete (<= (count hits) touched-limit)}))))

(defn- source-accounts
  "The source accounts a cross-database ticket names, when the option is on and the source is guarded per account."
  [input source]
  (when (if account-tickets (if source (contains? input "erasureAccounts") false) false)
    (when (removal-scope/per-account? (d/db (connection (db-uri source))))
      (removal-scope/ticket-accounts input))))

(defn- source-ticket!
  "Under the source's locks of the named accounts and the unscoped account (held from here through the recipient's
  commit): refused 503 while the source has a pending removal that can touch one of them; refused 409 unless the ticket
  is current for them in the source's published cut and their native removal counters are at most the ticket's
  sequence. Every removal holds those locks from before its native commit to its end, so none of theirs can commit
  between this check and the recipient's commit."
  [source input accounts]
  (let [;; [DX-ERA4, Z6 as merged] a source that does not exist answers as a stale ticket, not with Datomic's text
        sconn (try (let [c (connection (db-uri source))] (d/db c) c)
                   (catch Exception e
                     ((requiring-resolve 'triplex.gateway.failures/note!) "delivery-source" source e)
                     (privacy/stale!)))
        [scut sdb] (removal-erase/request-cut source sconn (d/db sconn))
        offered (get input "erasureSeq")
        named (conj (set accounts) removal-scope/unscoped)]
    (when-not (:per-account scut) (privacy/unavailable!))
    ;; a removal in flight that can reach them: its intent (DX-ERA2's rule for every ticket), and its native declaration
    ;; (a negated counter, written in its first transaction, before its intent)
    (when ((requiring-resolve 'triplex.gateway.removal-commit/pending-touches?) scut input) (privacy/unavailable!))
    (when-let [pending (privacy/pending source)]
      (when (some (removal-scope/entry-buckets pending) named) (privacy/unavailable!)))
    (when (some #(neg? (removal-scope/native-account-seq sdb %)) named) (privacy/unavailable!))
    (when-not (removal-scope/ticket-current? scut offered accounts) (privacy/stale!))
    (when-not (every? #(<= (removal-scope/native-account-seq sdb %) offered) named) (privacy/stale!))))

(defn- with-privacy-guards [scopes work]
  (if-let [[scope & more] (seq scopes)]
    (privacy/guard scope #(with-privacy-guards more work))
    (work)))

;; [DX-ERA4] TX2_DERIVED_SEAL=1: the derived-record routes (derived_seal.clj, resolved at call time so that with the option
;; off nothing new is loaded). Written with `if`, `let` and calls only, as the rest of this file's late additions.
(def derived-seal-on (= "1" (System/getenv "TX2_DERIVED_SEAL")))
(defn- derived-action? [action] (if (= action "derived-seal") true (= action "derived-open")))
(defn- derived-seal! [name conn db per-account action input]
  (let [cut (if per-account (first (removal-erase/request-cut name conn db)) (privacy/cut name db))]
    (if per-account nil (privacy/verify-data! cut db))
    ;; [DX-ERA4, after DX-ERA5's M2] the key re-sweep starts with the first derived call on this gateway
    ((requiring-resolve 'triplex.gateway.derived-seal/start-resweep!))
    ((requiring-resolve 'triplex.gateway.derived-seal/handle!) name db cut action input)))

(defn- derived-preview-ok? [input] ((requiring-resolve 'triplex.gateway.derived-seal/preview-ok?) input))
(if derived-seal-on (alter-var-root #'privacy/derived-preview (constantly derived-preview-ok?)) nil)
(defn- removal-tx-id [] ((requiring-resolve 'triplex.gateway.derived-seal/removal-tx-id)))
;; [DX-ERA4, after DX-ERA5's B1 and M3] the database's one-way setting that its derived documents are sealed: a gateway
;; with the option checks every write against it; a gateway of this build without the option refuses the database.
(defn- derived-check-rows [db rows new-ids] ((requiring-resolve 'triplex.gateway.derived-seal/check-rows!) db rows new-ids))
(if derived-seal-on (alter-var-root #'privacy/derived-check (constantly derived-check-rows)) nil)
(defn- derived-required? [db]
  ;; a database value this cannot read (a test's fake peer) is left to the request path, exactly as before the option
  (try
    (if (d/entid db :triplex.scope/derived-sealed)
      (true? (:v (first (d/datoms db :eavt (:e (first (d/datoms db :aevt :triplex.scope/key))) :triplex.scope/derived-sealed))))
      false)
    (catch Exception _ false)))
(if derived-seal-on (alter-var-root #'privacy/derived-tx-id (constantly removal-tx-id)) nil)

(defn route-handler [{:keys [uri request-method body query-string] :as request}]
  (if-let [[_ name action] (re-matches #"/v[12]/db/(s2-[A-Za-z0-9_-]+)/(.+)" uri)]
    ;; [DX-ERA2 fifth pass] a delivery's source database, kept for the refusal handler below
    (let [delivery-source (volatile! nil)]
    (try
      (let [[conn db] (trace/span "privacy/current-data" "gateway"
                        (let [conn (connection (db-uri name))] [conn (d/db conn)]))
            ;; [DX-ERA2] A database guarded per account (TX2_REMOVAL_PER_ACCOUNT=1 and the database moved): requests use
            ;; the published cut while another removal is prepared, and writes are fenced on their own accounts.
            per-account (removal-scope/per-account? db)]
        (cond
          (if derived-seal-on false (derived-required? db))
          (response 503 {:code "DerivedSealRequired"
                         :message "This database requires sealed derived documents: this gateway runs without TX2_DERIVED_SEAL"})
          (if (= :post request-method) (if derived-seal-on (= action "derived-seal-required") false) false)
          (response 200 ((requiring-resolve 'triplex.gateway.derived-seal/require!) name conn))
          (and (= :post request-method) (= action "protection"))
          (response 200 (erase/declare! name conn db (request-json body)))
          (and (= :post request-method) (= action "erase"))
          (response 200 (erase/erase! name conn (request-json body)))
          (and (= :post request-method) (= action "restore-erasure"))
          (response 200 (erase/replay-after-restore! name conn))
          (and removal-scope/enabled (= :post request-method) (= action "removal-per-account"))
          (let [input (request-json body) moved (removal-erase/per-account! name conn input)
                ;; [DX-ERA2 fifth pass, Z2] a database guarded per account holds its own protection policy
                _ (when (:perAccount moved) ((requiring-resolve 'triplex.gateway.removal-commit/adopt-policy!) name conn (d/db conn)))]
            ;; [DX-ERA2 fifth pass] a process allowed to turns the commit boundary on once the database is per account
            (response 200 (if (and (:perAccount moved) @(requiring-resolve 'triplex.gateway.removal-commit/may-turn-on))
                            (assoc moved :boundary (:boundary ((requiring-resolve 'triplex.gateway.removal-commit/turn-on!) name conn)))
                            moved)))
          ;; [DX-ERA2 fifth pass] the one-way move to the commit boundary (a process allowed to: TX2_REMOVAL_COMMIT_BOUNDARY=1)
          (and removal-scope/enabled (= :post request-method) (= action "removal-commit-boundary"))
          (response 200 ((requiring-resolve 'triplex.gateway.removal-commit/turn-on!) name conn))
          (if (= :post request-method) (if derived-seal-on (derived-action? action) false) false)
          (response 200 (derived-seal! name conn db per-account action (request-json body)))
          ;; [DX-ERA2 fifth pass] the operator's way out of RemovalLogConflict (records that differ only in position)
          (and removal-scope/enabled (= :post request-method) (= action "removal-log-reconcile"))
          (response 200 ((requiring-resolve 'triplex.gateway.removal-commit/reconcile!) name conn (request-json body)))
          ;; [DX-ERA2 fourth pass] the removal log rebuilt from the data (behind, a pending copy, or missing)
          (and removal-scope/enabled (= :post request-method) (= action "removal-log-rebuild"))
          (response 200 ((requiring-resolve 'triplex.gateway.removal-commit/rebuild-log!) name conn (request-json body)))
          :else
          (let [[protected-wire input] (when (and (= :post request-method) (= action "transact"))
                                        (write-wire/open name (request-json body)))
                managed-write? (and input (trace/span "privacy/write-policy" "gateway" (privacy/managed? name db)))
                source (get input "erasureSourceDatabase")
                _ (when (and source (not (and (string? source) (re-matches #"s2-[A-Za-z0-9_-]+" source))))
                    (codec/invalid "Invalid source scope for protected delivery"))
                _ (vreset! delivery-source source)
                ;; [DX-ERA2] Per account, a ticket naming its source accounts holds those accounts' locks only.
                ticket-accounts (when (and per-account managed-write? (nil? source)) (removal-scope/ticket-accounts input))
                ;; [DX-ACT9] A cross-database ticket naming its source accounts (TX2_ACCOUNT_TICKETS=1).
                source-named (source-accounts input source)
                [independent db] (if (and managed-write? (or subject/enabled per-account) (nil? source)
                                          (not (contains? input "erasureSeq"))
                                          (not (true? (get input "erasureReplay"))))
                                   (let [[cut db] (if per-account (removal-erase/request-cut name conn db) [(privacy/cut name db) db])]
                                     ;; [DX-ERA2 fourth pass] a write waits while the data is behind the log
                                     (when per-account ((requiring-resolve 'triplex.gateway.removal-commit/check-writes!) cut))
                                     [(when (or (not (:sealed cut)) (envelope/shared?)) cut) db])
                                   [nil db])
                request (cond-> request input (assoc :privacy-input input))
                run (fn [cut]
                      (trace/attribute! :erasureGuarded (boolean cut))
                      (binding [privacy/*cut* cut privacy/*database* name privacy/*data* db
                                privacy/*unseal* (fn [id e a value] (envelope/decode! name (d/db conn) id e a value))]
                        (let [answer (if (and (= :get request-method) (= action "erasure-frontier"))
                                       (response 200 (cond-> {:database name :protected (boolean cut)
                                                              :seq (or (:seq cut) 0) :erased (or (:erased cut) {})
                                                              ;; [DX-ERA2 fifth pass, B5] what a cache keys on
                                                              :removalStamp (or (:stamp cut) (:seq cut) 0)}
                                                       (:per-account cut)
                                                       (merge (removal-scope/frontier-fields cut query-string))
                                                       ;; [DX-ACT9] Only with TX2_ACCOUNT_TICKETS=1 and ?since=.
                                                       (if account-tickets (:per-account cut) false)
                                                       (merge (touched-fields cut query-string))
                                                       ;; [DX-IMP2] The removed families an importer must leave out.
                                                       policy/import-whole? (assoc :families (vec (sort (:families cut))))))
                                       (route-handler-base request))]
                          (cond-> answer
                            cut (assoc-in [:headers "x-triplex-erasure-seq"] (str (:seq cut)))
                            ;; [DX-ERA2 fifth pass, B5] the value that changes at the commit with the commit boundary
                            cut (assoc-in [:headers "x-triplex-removal-stamp"] (str (or (:stamp cut) (:seq cut))))))))]
            (cond
              independent
              ;; [DX-ERA2] Per account the cut was checked by request-cut; the fence decides at the serial point.
              (do (when-not per-account (privacy/verify-data! independent db))
                  ;; [DX-ERA2 fifth pass, R2-2] a save framed before a removal of its subject, or under a declined command
                  ((requiring-resolve 'triplex.gateway.removal-commit/decline-check!) name conn db input)
                  ((requiring-resolve 'triplex.gateway.removal-commit/after-refusal) name conn input (run independent)))

              (and input (or managed-write? source))
              ;; [DX-ERASE1] Why: the source cannot publish an erasure between validation and recipient commit.
              ;; Rejected: an HTTP recheck followed by an independent recipient write.
              (with-privacy-guards (cond
                                     ticket-accounts (sort (map #(removal-scope/lock-name name %) ticket-accounts))
                                     source-named (sort (concat (when managed-write? [name])
                                                                (map #(removal-scope/lock-name source %)
                                                                     (conj (set source-named) removal-scope/unscoped))))
                                     :else (sort (cond-> #{} managed-write? (conj name) source (conj source))))
                (fn []
                  (let [[current next] (trace/span "privacy/write-frontier" "gateway"
                                         (let [current (d/db conn)]
                                           (if (and per-account managed-write?)
                                             (let [[cut current] (removal-erase/request-cut name conn current)]
                                               ((requiring-resolve 'triplex.gateway.removal-commit/check-writes!) cut)
                                               [current cut])
                                             [current (privacy/cut name current)])))]
                    (when (and managed-write? (nil? next)) (privacy/unavailable!))
                    (when (and (:sealed next) (write-wire/required?) (not protected-wire))
                      (privacy/failure! 400 "ProtectedWriteRequired" "Use the configured protected save transport"))
                    (when-not (:per-account next) (trace/span "privacy/verify-write" "gateway" (privacy/verify-data! next current)))
                    (when (or source (contains? input "erasureSeq"))
                      (if source
                        (if source-named
                          (source-ticket! source input source-named)
                          ;; [DX-ERA2 fifth pass, Z6, merged] a source that does not exist is refused like a source
                          ;; whose ticket is stale: the answer does not tell whether a database of that name exists
                          (let [source-db (try (d/db (connection (db-uri source)))
                                               (catch Exception e
                                                 ((requiring-resolve 'triplex.gateway.failures/note!) "delivery-source" source e)
                                                 (privacy/stale!)))]
                            (if removal-scope/enabled
                              ;; [DX-ERA3 M4] a pending removal in the source refuses with the tagged 503 naming it
                              ((requiring-resolve 'triplex.gateway.removal-commit/check-source!) source source-db (get input "erasureSeq"))
                              (let [source-cut (privacy/cut source source-db)]
                                (privacy/verify-data! source-cut source-db)
                                (privacy/ensure-seq! source-cut (get input "erasureSeq"))))))
                        (removal-scope/ensure-ticket! next input)))
                    ;; [DX-ERA2 fifth pass, R2-2] the same on the general writer's path
                    (if managed-write?
                      (do ((requiring-resolve 'triplex.gateway.removal-commit/decline-check!) name conn current input)
                          ((requiring-resolve 'triplex.gateway.removal-commit/after-refusal) name conn input (run next)))
                      (run next)))))
              ;; [DX-ERASE1] Why: a guarded write only needs the cut verified inside the writer lock.
              ;; Rejected: reading and hashing the authority twice on every guarded save.
              :else
              (let [read-cut (when-not input
                               (trace/span "privacy/frontier" "gateway"
                                 (if per-account (first (removal-erase/request-cut name conn db)) (privacy/cut name db))))]
                (when (and read-cut (not per-account)) (trace/span "privacy/verify-data" "gateway" (privacy/verify-data! read-cut db)))
                ;; [DX-ERA3 M1] on the log's boundary a read never serves a pending removal already committed in the data
                ;; from the log before it: that removal is published first
                (let [read-cut (if (:committed-pending read-cut)
                                 ((requiring-resolve 'triplex.gateway.removal-commit/publish-for-read!) name conn)
                                 read-cut)]
                (when (contains? input "erasureSeq") (removal-scope/ensure-ticket! read-cut input))
                (run read-cut)))))))
      (catch Exception e0
        (let [;; [DX-ERA2 fifth pass] the PostgreSQL authority's session lost mid-way (the removal route, or anything
              ;; else that reached the authority here): a typed 503 with the completion tag, never a 400
              e (if (and (authority-fault? e0) (not (:authority-fault (ex-data e0))))
                  (do ((requiring-resolve 'triplex.gateway.failures/note!) "authority" name e0) (authority-refusal e0))
                  e0)
              info (ex-data e)
              per-account? (fn [db-name] (try (removal-scope/per-account? (d/db (connection (db-uri db-name))))
                                              (catch Exception _ false)))
              source @delivery-source]
          ;; [DX-ERA3 N1] a write refused by a pending removal: this gateway completes that removal (its locks released)
          ;; [DX-ERA3 M4] or the delivery's source database, when its pending removal refused the delivery
          ;; [DX-ERA2 fifth pass] after an authority fault only on a database guarded per account (under today's
          ;; database-wide rule completing a removal without its client is the owner's decision)
          (when (and (:removal-pending info) (or (not (:authority-fault info)) (per-account? name)))
            (let [target (or (:removal-database info) name)]
              ((requiring-resolve 'triplex.gateway.removal-commit/complete-pending!) target (connection (db-uri target)))))
          ;; [DX-ERA2 fifth pass] a delivery refused with an untagged 503 while its source database has a removal pending
          ;; (a source check that does not carry the tag, as the account-ticket line's source-ticket! did): this gateway
          ;; completes the source's removal as the tag would have, so the delivery's next try can pass
          (when (and source (not (:removal-pending info)) (= 503 (:status info)) (= "ErasureFrontierUnavailable" (:code info))
                     (per-account? source) (some? (privacy/pending source)))
            (try ((requiring-resolve 'triplex.gateway.removal-commit/complete-pending!) source (connection (db-uri source)))
                 (catch Exception x ((requiring-resolve 'triplex.gateway.failures/note!) "source-completion" source x))))
          ;; [DX-ERA2 fifth pass, Z2] a missing removal log is rebuilt from the data and the database's policy (locks
          ;; released); this request answers 503 and the next one is served
          (when (:removal-log-missing info)
            (try ((requiring-resolve 'triplex.gateway.removal-commit/rebuild-log!) name (connection (db-uri name)) {})
                 (catch Exception x ((requiring-resolve 'triplex.gateway.failures/note!) "log-rebuild" name x))))
          (response (or (:status info) 400) {:code (or (:code info) "GatewayError") :message (.getMessage e)})))))
    (route-handler-base request)))

(defn handler [request] (trace/handler route-handler request))
(defn serve! [serve-handler port]
  (envelope/start!)
  ;; [DX-ERA4, after DX-ERA5's M2] with the option the key re-sweep runs from the start, not only after a derived call
  (if derived-seal-on ((requiring-resolve 'triplex.gateway.derived-seal/start-resweep!)) nil)
  (d/create-database (db-uri "tx2-health"))
  ;; [EXP-DX1] Why: synchronize existing databases before accepting HTTP, not from their first read.
  ;; Rejected: per-read initialization barriers.
  ;; [DX-B2-N3] Why: a scope may be deleted after catalog enumeration during startup.
  ;; Rejected: swallowing all startup failures (would hide a storage outage).
  (doseq [name (d/get-database-names (db-uri "*"))]
    (try (sync-db (db-uri name))
         (catch Exception e
           (when (some #{name} (d/get-database-names (db-uri "*"))) (throw e)))))
  ;; [DX-ERA3 N5] report every database guarded per account whose data and removal log disagree
  (when removal-scope/enabled
    ((requiring-resolve 'triplex.gateway.removal-commit/start-check!) (d/get-database-names (db-uri "*"))
                                                                      (fn [name] (connection (db-uri name)))))
  (start-thread-sampler!)
  (jetty/run-jetty serve-handler {:port port
                           :host "0.0.0.0" :join? true :min-threads 8 :max-threads http-max-threads
                           :configurator (fn [server] (reset! jetty-server server))}))

(defn -main [& [port]]
  (serve! handler (if port (Integer/parseInt port) 8080)))
