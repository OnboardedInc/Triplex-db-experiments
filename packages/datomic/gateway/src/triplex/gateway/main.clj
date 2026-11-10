(ns triplex.gateway.main
  (:require [datomic.api :as d] [clojure.data.json :as json] [ring.adapter.jetty :as jetty]
            [triplex.gateway.lean :as lean] [triplex.gateway.journal :as journal] [triplex.gateway.stats :as stats] [triplex.gateway.commit :as commit] [triplex.gateway.feed :as feed] [triplex.gateway.reach :as reach] [triplex.gateway.scope :as scope] [triplex.gateway.query :as query] [triplex.gateway.storage :as storage] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema])
  (:gen-class))

(set! *warn-on-reflection* false)

;; [EXP-DA00] Why: own bounded HTTP gateway on official Peer API (R29/Jepsen pattern). Rejected: undocumented peer-server wire protocol.
;; [DX-H1] Why: SQL storage places the database before the JDBC query. Rejected: suffix concatenation (dev-only).
(def uri-template (or (System/getenv "DATOMIC_URI_TEMPLATE") "datomic:dev://127.0.0.1:4334/{db}"))
(defn db-uri [name] (clojure.string/replace uri-template "{db}" name))
(def connections (atom {}))
 ;; [EXP-DX1] Why: opening a connection must not introduce a no-argument sync on a read route.
;; Rejected: lazy initial sync inside connection (a cold read would contact the transactor).
(defn connection [uri]
  (or (@connections uri)
      (locking connections
        (or (@connections uri)
            (let [conn (d/connect uri)] (swap! connections assoc uri conn) conn)))))
(defn sync-db [uri] (let [result (deref (d/sync (connection uri)) 2000 ::timeout)]
                     (when (= result ::timeout) (throw (ex-info "Sync deadline exceeded" {:status 503 :code "SyncTimeout"}))) result))
(def scope-name scope/name-for)
(defn stored-scope [db] (when (d/entid db :triplex.scope/key) (:v (first (d/datoms db :aevt :triplex.scope/key)))))
(defn assert-scope [db scope]
  (when-let [existing (stored-scope db)]
    (when-not (= existing scope) (throw (ex-info "Database name collision" {:status 409 :code "ScopeCollision"})))))
(defn initialize-scope! [uri scope layout]
  ;; [EXP-DA01] Why: a stale first opener must never reset a writer's position. Rejected: check-then-upsert of the scope header (concurrent initialization race).
  (try
    @(d/transact (connection uri)
       [{:db/id (d/tempid :db.part/user) :triplex.scope/bootstrap "singleton"}
        {:triplex.scope/key scope :triplex.scope/position 0 :triplex.scope/position-regular true :triplex.scope/rows-version (if (= layout "lean") 3 2) :triplex.scope/feed-version 2 :triplex.scope/schema-hash schema/schema-hash}])
    (catch Exception e
      (let [current (sync-db uri)]
        (assert-scope current scope)
        (when-not (stored-scope current) (throw e))))))
(defn create-scope! [base scope layout]
  (when-not (#{"legacy" "lean"} layout) (codec/invalid "Unknown layout"))
  (let [name (scope-name scope) uri (db-uri name) created (d/create-database uri) conn (connection uri)]
    (assert-scope (sync-db uri) scope)
    (when-not (stored-scope (sync-db uri))
      @(d/transact conn schema/schema)
      (assert-scope (sync-db uri) scope)
      (initialize-scope! uri scope layout))
    (when-not (= schema/schema-hash (:triplex.scope/schema-hash (d/entity (sync-db uri) [:triplex.scope/key scope])))
      @(d/transact conn schema/schema)
      @(d/transact conn [{:triplex.scope/key scope :triplex.scope/schema-hash schema/schema-hash}]))
    (commit/install! conn scope)
    {:db name :created created :schemaHash schema/schema-hash}))
(defn delete-scope! [base scope]
  (let [name (scope-name scope) uri (db-uri name)]
    (when (some #{name} (d/get-database-names (db-uri "*"))) (assert-scope (sync-db uri) scope))
    ;; [EXP-DA00] Why: releasing the last mem peer may destroy it before delete. Rejected: release-first (selftest-3 returned false).
    (let [deleted (d/delete-database uri)]
      (reach/forget! name)
      (when-let [conn (@connections uri)] (d/release conn) (swap! connections dissoc uri))
        {:db name :deleted deleted})))
(defn basis [base name]
  (when-not (re-matches #"(s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)" name) (codec/invalid "Invalid database name"))
  (let [db (d/db (connection (db-uri name))) scope (stored-scope db)]
    (when-not scope (throw (ex-info "Scope not initialized" {:status 409 :code "ScopeUninitialized"})))
    (let [entity (d/entid db [:triplex.scope/key scope])]
      {:t (codec/encode-value "long" (d/basis-t db))
       :position (codec/encode-value "long" (storage/value db entity :triplex.scope/position))
       :recordedAt nil :schemaHash (storage/value db entity :triplex.scope/schema-hash)})))
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
    (let [t (d/basis-t (d/db conn)) requested (System/currentTimeMillis) job (str (java.util.UUID/randomUUID))]
      (d/request-index conn)
      (let [result (deref (d/sync-index conn t) wait-ms ::timeout) completed (not= result ::timeout)]
        {:job job :database name :requestedT (str t) :requestedAtMs requested :completed completed
         :completedAtMs (when completed (System/currentTimeMillis))}))))
(defn request-json [body]
  (when-not body (codec/invalid "Missing JSON body"))
  (let [bytes (.readNBytes ^java.io.InputStream body 4194305)]
    (when (> (alength bytes) 4194304) (codec/invalid "Request too large"))
    (let [start (System/nanoTime) input (json/read-str (String. bytes "UTF-8"))]
      (.set request-parse-micros (quot (- (System/nanoTime) start) 1000)) input)))
(defn handler [{:keys [request-method uri body query-string]}]
  (stats/bump! [:routes (str (name request-method) " " (clojure.string/replace uri #"/s2?-[^/]+/" "/{db}/"))] 1)
  (try
    (cond
      (= uri "/v2/admin/scan-stats") (response 200 @stats/counts)
      (and (= :post request-method) (= uri "/v2/admin/scan-stats/reset")) (do (reset! stats/counts {}) (response 200 {}))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(transactions|command|journal)" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)
            conn (connection (db-uri name))]
        (timed start {:status 200 :headers {"Content-Type" "application/json; charset=utf-8"}
                     :body (if (.endsWith ^String uri "transactions")
                             (journal/page conn name input)
                             (if (.endsWith ^String uri "journal")
                               (journal/entity (d/db conn) name input)
                               (journal/command (d/db conn) name input)))}))
      (and (= :get request-method) (= "/health" uri))
      (do (d/db (connection (db-uri "tx2-health")))
          (response 200 {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")}))
      (and (= :post request-method) (= "/v1/db/create" uri))
      (response 200 (let [input (request-json body)] (create-scope! uri-template (get input "scope") (get input "layout" "legacy"))))
      (and (= :post request-method) (= "/v1/db/delete" uri))
      (response 200 (delete-scope! uri-template (get (request-json body) "scope")))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/basis" uri))
      (response 200 (basis uri-template (nth (clojure.string/split uri #"/") 3)))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/log" uri))
      (let [name (nth (clojure.string/split uri #"/") 3)
            params (into {} (map (fn [part] (let [[k v] (clojure.string/split part #"=" 2)]
                                             (let [^String encoded (or v "")] [k (java.net.URLDecoder/decode encoded "UTF-8")])))
                                  (remove empty? (clojure.string/split (or query-string "") #"&"))))]
        (let [conn (connection (db-uri name))]
          (when (lean/enabled? (d/db conn)) (lean/unsupported! "log"))
          (response 200 (assoc (feed/log-page conn params) :database name))))
      (and (= :post request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/transact" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime) db-uri (db-uri name)]
        (try (timed start (response 200 (storage/commit! name (connection db-uri) (d/db (connection db-uri)) input)))
             (finally (when (get input "release") (storage/release! name (get input "handle"))))))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/request-index" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body)]
        (response 200 (request-index! name (connection (db-uri name)) input)))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/begin" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)]
        (timed start (response 200 (storage/begin-command! name (d/db (connection (db-uri name))) input))))
      (and (= :post request-method) (re-matches #"/v2/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(reach|reach-many)" uri))
      (let [name (nth (clojure.string/split uri #"/") 3) input (request-json body) start (System/nanoTime)
            conn (connection (db-uri name))
            initial (d/db conn) p (get-in input ["basis" "recordedPosition"])
            waited (and (some? p) (> p (storage/head-position name initial)))
            db (if waited (storage/await-position initial p
                 (get input "basisWaitMs")
                 (fn [remaining] (if-let [t (get input "basisT")]
                                   (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout)
                                   (d/db conn)))) initial)]
        (timed start {:status 200 :headers {"Content-Type" "application/json; charset=utf-8" "x-tx2-waited" (str (boolean waited))}
         :body (reach/response name db (if (.endsWith ^String uri "reach-many") input (assoc input "roots" [(get input "root")])) )}))
      (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(snapshot|release|transact|read|q|claim|operation/[^/]+)" uri)
      (let [[_ _ _ name action id] (clojure.string/split uri #"/") db-uri (db-uri name)
            input (when (= request-method :post) (request-json body))
            conn (when (and (not= action "release") (or (= action "transact") (not (get input "handle")))) (connection db-uri))
            ;; [EXP-DA01] Why: held queries need no transactor sync and must never substitute a new db between requests (Q89d). Rejected: unconditional per-request sync.
            db (when conn
                 (storage/await-position (d/db conn)
                   (if (= action "claim") (get input "position") (get-in input ["basis" "recordedPosition"]))
                   (get input "basisWaitMs")
                   (fn [remaining] (if-let [t (get input "basisT")]
                                     (deref (d/sync conn (Long/parseLong ^String t)) remaining :triplex.gateway.storage/timeout)
                                     (d/db conn)))))]
        (response 200
          (case action
            "snapshot" (storage/begin! name db)
            "release" (storage/release! name (get input "handle"))
            "transact" (try (storage/commit! name conn db input)
                         (finally (when (get input "release") (storage/release! name (get input "handle")))))
            "read" (storage/read-rows name db input)
            "q" (do (when (lean/enabled? (or db (storage/held-db name (get input "handle")))) (lean/unsupported! "q")) (query/run name db input))
            "operation" (storage/operation db id)
            "claim" (let [cut (storage/at-position db (get input "position"))
                          claim (d/entid cut [:triplex.claim/command-id (get input "commandId")])]
                      {:txId (when claim (storage/value cut claim :triplex.claim/tx-id))}))))
      :else (response 404 {:code "NotFound"}))
    (catch Exception e (response (or (:status (ex-data e)) (if (= uri "/health") 503 400))
                                {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e) :maximum (:maximum (ex-data e)) :route (:route (ex-data e))}))))
(defn -main [& _]
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
