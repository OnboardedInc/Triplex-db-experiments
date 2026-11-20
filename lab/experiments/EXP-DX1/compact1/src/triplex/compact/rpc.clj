(ns triplex.compact.rpc
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.compact.floor :as floor]
            [triplex.compact.store :as store]))

(defn request [wire]
  (select-keys (into {} (map (fn [[k v]] [(keyword k) v]) wire))
               [:account :root :command :expected :adds :retires]))

(defn handle [store method args]
  (let [latest (store/sync-view store)]
    (case method
      "save" (store/save! store (request (first args)))
      "save-group" (:outcomes (store/commit-ready! store (mapv #(store/prepare store latest (request %)) (first args))))
      "receipt" (apply store/receipt latest args)
      "current" (let [[account root valid] args] (store/world store latest account root :current nil valid))
      "pinned" (let [[account root p valid] args] (store/world store latest account root :pinned p valid))
      "feed" (apply store/feed store latest args)
      (store/reject :UnknownMethod))))

(defn -main [& _]
  (let [conn (floor/open! (floor/db-name "sdk"))
        store (store/open-store conn nil 16)]
    (store/provision! conn ["sdk-a" "sdk-b"])
    (doseq [line (line-seq (java.io.BufferedReader. *in*))]
      (let [[token method args] (json/read-str line)
            value (try {:value (handle store method args)}
                       (catch clojure.lang.ExceptionInfo e {:error (name (or (:code (ex-data e)) :GatewayFailure))}))]
        (println "COMPACT_RPC" (json/write-str (assoc value :token token :attempt floor/attempt :source floor/source)))
        (flush)))
    (d/release conn))
  (shutdown-agents)
  (System/exit 0))
