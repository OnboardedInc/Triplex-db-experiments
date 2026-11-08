(ns triplex.gateway.main
  (:require [datomic.api :as d] [clojure.data.json :as json] [ring.adapter.jetty :as jetty]
            [triplex.gateway.codec :as codec] [triplex.gateway.schema :as schema])
  (:gen-class))

;; [EXP-DA00] Why: own bounded HTTP gateway on official Peer API (R29/Jepsen pattern). Rejected: undocumented peer-server wire protocol.
(def base-uri "datomic:dev://127.0.0.1:4334/")
(def connections (atom {}))
(defn connection [uri] (or (@connections uri) (get (swap! connections #(if (contains? % uri) % (assoc % uri (d/connect uri)))) uri)))
(defn sync-db [uri] (let [result (deref (d/sync (connection uri)) 2000 ::timeout)]
                     (when (= result ::timeout) (throw (ex-info "Sync deadline exceeded" {:status 503 :code "SyncTimeout"}))) result))
(defn scope-name [scope]
  (let [tuple (json/read-str scope)]
    (when-not (and (vector? tuple) (= 5 (count tuple)) (every? string? tuple)
                   (= "triplex-scope-v1" (first tuple)) (= "test" (second tuple)))
      (codec/invalid "Only test scope tuples may be created or deleted"))
    (str "s-" (subs (schema/sha256 scope) 0 32))))
(defn stored-scope [db] (when (d/entid db :triplex.scope/key) (d/q '[:find ?s . :where [_ :triplex.scope/key ?s]] db)))
(defn assert-scope [db scope]
  (when-let [existing (stored-scope db)]
    (when-not (= existing scope) (throw (ex-info "Database name collision" {:status 409 :code "ScopeCollision"})))))
(defn create-scope! [base scope]
  (let [name (scope-name scope) uri (str base name) created (d/create-database uri) conn (connection uri)]
    (assert-scope (sync-db uri) scope)
    (when-not (stored-scope (sync-db uri))
      @(d/transact conn schema/schema)
      (assert-scope (sync-db uri) scope)
      @(d/transact conn [{:triplex.scope/key scope :triplex.scope/position 0 :triplex.scope/schema-hash schema/schema-hash}]))
    {:db name :created created :schemaHash schema/schema-hash}))
(defn delete-scope! [base scope]
  (let [name (scope-name scope) uri (str base name)]
    (when (some #{name} (d/get-database-names (str base "*"))) (assert-scope (sync-db uri) scope))
    ;; [EXP-DA00] Why: releasing the last mem peer may destroy it before delete. Rejected: release-first (selftest-3 returned false).
    (let [deleted (d/delete-database uri)]
      (when-let [conn (@connections uri)] (d/release conn) (swap! connections dissoc uri))
      {:db name :deleted deleted})))
(defn basis [base name]
  (when-not (re-matches #"s-[0-9a-f]{32}" name) (codec/invalid "Invalid database name"))
  (let [db (sync-db (str base name)) scope (stored-scope db)]
    (when-not scope (throw (ex-info "Scope not initialized" {:status 409 :code "ScopeUninitialized"})))
    (let [entity (d/entity db [:triplex.scope/key scope])]
      {:t (codec/encode-value "long" (d/basis-t db))
       :position (codec/encode-value "long" (:triplex.scope/position entity))
       :recordedAt nil :schemaHash (:triplex.scope/schema-hash entity)})))
(defn response [status data] {:status status :headers {"Content-Type" "application/json; charset=utf-8"} :body (json/write-str data)})
(defn request-json [body]
  (when-not body (codec/invalid "Missing JSON body"))
  (let [bytes (.readNBytes ^java.io.InputStream body 65537)]
    (when (> (alength bytes) 65536) (codec/invalid "Request too large"))
    (json/read-str (String. bytes "UTF-8"))))
(defn handler [{:keys [request-method uri body]}]
  (try
    (cond
      (and (= :get request-method) (= "/health" uri))
      (do (sync-db (str base-uri "tx2-health"))
          (response 200 {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")}))
      (and (= :post request-method) (= "/v1/db/create" uri))
      (response 200 (create-scope! base-uri (get (request-json body) "scope")))
      (and (= :post request-method) (= "/v1/db/delete" uri))
      (response 200 (delete-scope! base-uri (get (request-json body) "scope")))
      (and (= :get request-method) (re-matches #"/v1/db/s-[0-9a-f]{32}/basis" uri))
      (response 200 (basis base-uri (nth (clojure.string/split uri #"/") 3)))
      :else (response 404 {:code "NotFound"}))
    (catch Exception e (response (or (:status (ex-data e)) (if (= uri "/health") 503 400))
                                {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e)}))))
(defn -main [& _]
  (d/create-database (str base-uri "tx2-health"))
  (sync-db (str base-uri "tx2-health"))
  (jetty/run-jetty handler {:port 8080 :host "0.0.0.0" :join? true :min-threads 8 :max-threads 512}))
