(ns triplex.gateway.main
  (:require [datomic.api :as d] [clojure.data.json :as json] [ring.adapter.jetty :as jetty]
            [triplex.gateway.feed :as feed] [triplex.gateway.scope :as scope] [triplex.gateway.query :as query] [triplex.gateway.storage :as storage] [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema])
  (:gen-class))

;; [EXP-DA00] Why: own bounded HTTP gateway on official Peer API (R29/Jepsen pattern). Rejected: undocumented peer-server wire protocol.
(def base-uri (or (System/getenv "DATOMIC_BASE_URI") "datomic:dev://127.0.0.1:4334/"))
(def connections (atom {}))
(defn connection [uri] (or (@connections uri) (get (swap! connections #(if (contains? % uri) % (assoc % uri (d/connect uri)))) uri)))
(defn sync-db [uri] (let [result (deref (d/sync (connection uri)) 2000 ::timeout)]
                     (when (= result ::timeout) (throw (ex-info "Sync deadline exceeded" {:status 503 :code "SyncTimeout"}))) result))
(def scope-name scope/name-for)
(defn stored-scope [db] (when (d/entid db :triplex.scope/key) (d/q '[:find ?s . :where [_ :triplex.scope/key ?s]] db)))
(defn assert-scope [db scope]
  (when-let [existing (stored-scope db)]
    (when-not (= existing scope) (throw (ex-info "Database name collision" {:status 409 :code "ScopeCollision"})))))
(defn initialize-scope! [uri scope]
  ;; [EXP-DA01] Why: a stale first opener must never reset a writer's position. Rejected: check-then-upsert of the scope header (concurrent initialization race).
  (try
    @(d/transact (connection uri)
       [{:db/id (d/tempid :db.part/user) :triplex.scope/bootstrap "singleton"}
        {:triplex.scope/key scope :triplex.scope/position 0 :triplex.scope/schema-hash schema/schema-hash}])
    (catch Exception e
      (let [current (sync-db uri)]
        (assert-scope current scope)
        (when-not (stored-scope current) (throw e))))))
(defn create-scope! [base scope]
  (let [name (scope-name scope) uri (str base name) created (d/create-database uri) conn (connection uri)]
    (assert-scope (sync-db uri) scope)
    (when-not (stored-scope (sync-db uri))
      @(d/transact conn schema/schema)
      (assert-scope (sync-db uri) scope)
      (initialize-scope! uri scope))
    (when-not (= schema/schema-hash (:triplex.scope/schema-hash (d/entity (sync-db uri) [:triplex.scope/key scope])))
      @(d/transact conn schema/schema)
      @(d/transact conn [{:triplex.scope/key scope :triplex.scope/schema-hash schema/schema-hash}]))
    {:db name :created created :schemaHash schema/schema-hash}))
(defn delete-scope! [base scope]
  (let [name (scope-name scope) uri (str base name)]
    (when (some #{name} (d/get-database-names (str base "*"))) (assert-scope (sync-db uri) scope))
    ;; [EXP-DA00] Why: releasing the last mem peer may destroy it before delete. Rejected: release-first (selftest-3 returned false).
    (let [deleted (d/delete-database uri)]
      (when-let [conn (@connections uri)] (d/release conn) (swap! connections dissoc uri))
        {:db name :deleted deleted})))
(defn basis [base name]
  (when-not (re-matches #"(s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)" name) (codec/invalid "Invalid database name"))
  (let [db (sync-db (str base name)) scope (stored-scope db)]
    (when-not scope (throw (ex-info "Scope not initialized" {:status 409 :code "ScopeUninitialized"})))
    (let [entity (d/entity db [:triplex.scope/key scope])]
      {:t (codec/encode-value "long" (d/basis-t db))
       :position (codec/encode-value "long" (:triplex.scope/position entity))
       :recordedAt nil :schemaHash (:triplex.scope/schema-hash entity)})))
(defn response [status data] {:status status :headers {"Content-Type" "application/json; charset=utf-8"} :body (json/write-str data)})
(defn request-json [body]
  (when-not body (codec/invalid "Missing JSON body"))
  (let [bytes (.readNBytes ^java.io.InputStream body 4194305)]
    (when (> (alength bytes) 4194304) (codec/invalid "Request too large"))
    (json/read-str (String. bytes "UTF-8"))))
(defn handler [{:keys [request-method uri body query-string]}]
  (try
    (cond
      (and (= :get request-method) (= "/health" uri))
      (do (sync-db (str base-uri "tx2-health"))
          (response 200 {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")}))
      (and (= :post request-method) (= "/v1/db/create" uri))
      (response 200 (create-scope! base-uri (get (request-json body) "scope")))
      (and (= :post request-method) (= "/v1/db/delete" uri))
      (response 200 (delete-scope! base-uri (get (request-json body) "scope")))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/basis" uri))
      (response 200 (basis base-uri (nth (clojure.string/split uri #"/") 3)))
      (and (= :get request-method) (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/log" uri))
      (let [name (nth (clojure.string/split uri #"/") 3)
            params (into {} (map (fn [part] (let [[k v] (clojure.string/split part #"=" 2)]
                                             [k (java.net.URLDecoder/decode (or v "") "UTF-8")]))
                                  (remove empty? (clojure.string/split (or query-string "") #"&"))))]
        (response 200 (assoc (feed/log-page (connection (str base-uri name)) params) :database name)))
      (re-matches #"/v1/db/(?:s-[0-9a-f]{32}|s2-[A-Za-z0-9_-]+)/(snapshot|release|transact|read|q|claim|operation/[^/]+)" uri)
      (let [[_ _ _ name action id] (clojure.string/split uri #"/") db-uri (str base-uri name)
            input (when (= request-method :post) (request-json body))
            conn (when-not (or (get input "handle") (= action "release")) (connection db-uri))
            ;; [EXP-DA01] Why: held queries need no transactor sync and must never substitute a new db between requests (Q89d). Rejected: unconditional per-request sync.
            db (when conn
                 (storage/await-position (sync-db db-uri)
                   (if (= action "claim") (get input "position") (get-in input ["basis" "recordedPosition"]))
                   (get input "basisWaitMs")
                   (fn [remaining] (deref (d/sync conn) remaining :triplex.gateway.storage/timeout))))]
        (response 200
          (case action
            "snapshot" (storage/begin! name db)
            "release" (storage/release! name (get input "handle"))
            "transact" (storage/commit! conn db input)
            "read" (storage/read-rows name db input)
            "q" (query/run name db input)
            "operation" (storage/operation db id)
            "claim" (let [cut (storage/at-position db (get input "position"))
                          claim (d/entity cut [:triplex.claim/command-id (get input "commandId")])]
                      {:txId (:triplex.claim/tx-id claim)}))))
      :else (response 404 {:code "NotFound"}))
    (catch Exception e (response (or (:status (ex-data e)) (if (= uri "/health") 503 400))
                                {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e)}))))
(defn -main [& _]
  (d/create-database (str base-uri "tx2-health"))
  (sync-db (str base-uri "tx2-health"))
  (jetty/run-jetty handler {:port 8080 :host "0.0.0.0" :join? true :min-threads 8 :max-threads 512}))
