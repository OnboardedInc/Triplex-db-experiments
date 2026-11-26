;; [DX-S6c fifth pass] Can Datomic itself refuse an older build's new writer under a new ident? Tries an attribute
;; predicate on the system attributes every stored-function install writes (:db/fn, :db/ident), on an in-memory
;; database, and prints what Datomic answers. Diagnostic; nothing here is used by the gateway.
(require '[datomic.api :as d])
(let [uri (str "datomic:mem://system-preds-" (System/nanoTime)) _ (d/create-database uri) conn (d/connect uri)
      try-tx (fn [label tx] (println "DX-S6_SYSPREDS" label
                                     (try @(d/transact conn tx) "accepted"
                                          (catch Exception e (str "refused: " (.getMessage (or (.getCause e) e)))))))]
  (try-tx "a predicate on :db/fn" [[:db/add :db/fn :db.attr/preds 'clojure.core/nil?]])
  (try-tx "a predicate on :db/ident" [[:db/add :db/ident :db.attr/preds 'clojure.core/nil?]])
  (try-tx "then a new function under a new ident"
          [{:db/ident :x/f :db/fn (d/function {:lang :clojure :params '[db] :code '[]})}])
  (shutdown-agents)
  (System/exit 0))
