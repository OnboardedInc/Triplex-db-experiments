(ns triplex.gateway.ha-observer
  (:require [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [clojure.string :as str] [ring.adapter.jetty :as jetty]))

;; [DX-HA1] Why: observe the live peer's own index and native receipts at one immutable cut. Rejected: opening a second peer and reporting its cache or log as the serving peer's.
(defn observation [req db-name op]
  (let [conn (main/connection (main/db-uri db-name)) db (d/db conn)
        body (when (= :post (:request-method req)) (main/request-json (:body req)))]
    (case op
      "state" (main/response 200 {:database db-name :basis (str (d/basis-t db))
                    :indexBasis (some-> (:indexBasisT db) str)
                    :position (str (storage/head-position db-name db))})
      "sync" (let [v (deref (d/sync conn) 250 ::timeout)]
               (main/response (if (= v ::timeout) 503 200) (if (= v ::timeout)
                 {:code "SyncTimeout"} {:database db-name :basis (str (d/basis-t v))})))
      "operations" (let [ids (get body "ids")]
                     (assert (and (vector? ids) (<= 1 (count ids) 512) (every? string? ids)))
                     (main/response 200 {:database db-name :operations (mapv #(storage/operation db %) ids)})))))
(defn -main [& _]
  (let [base main/handler fleet? (= "1" (System/getenv "HA1_FLEET_HTTP"))]
    (with-redefs [main/handler (fn [req]
      (if (and fleet? (= :get (:request-method req)) (= "/health" (:uri req)))
        (main/response 200 {:datomicVersion "1.0.7745" :gatewaySourceHash (System/getenv "GATEWAY_SOURCE_SHA256")})
        (if-let [[_ name op] (re-matches #"/ha1/(s2-[A-Za-z0-9_-]+)/(state|sync|operations)" (:uri req))]
          (try (observation req name op)
               (catch Exception e (main/response 503 {:code "ObservationUnavailable" :message ((requiring-resolve 'triplex.gateway.reply/hidden) "ha1-observation" name e)})))
          (base req))))]
      ;; [DX-HASYNC1] Why: fleet URIs each have their own SQL account, and each cell proves data readiness separately.
      ;; Rejected: creating a health database and listing every database through one nonexistent SQL account.
      (if fleet?
        (jetty/run-jetty main/handler {:port 8080 :host "0.0.0.0" :join? true :min-threads 8 :max-threads 512})
        (main/-main)))))
