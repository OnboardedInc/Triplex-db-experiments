;; [DX-INT1] Why: a fold has no logical position, so no product route shows it; read the folds and roots natively.
;; Rejected: inferring folds from gaps in t (new entities also advance t).
(ns owner-census
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.owner-root :as root]))

(defn -main [name out]
  (let [conn (d/connect (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" name))
        db (deref (d/sync conn) 60000 nil)
        folds (d/q '[:find ?id ?tx :where [?tx :triplex.owner/folded ?o] [?o :triplex.entity/id ?id]] db)
        roots (d/q '[:find ?id ?raw :where [?o :triplex.owner/root ?raw] [?o :triplex.entity/id ?id]] db)]
    (spit out (json/write-str {:folds (sort-by (juxt :owner :t) (map (fn [[id tx]] {:owner id :t (d/tx->t tx)}) folds))
                               :roots (sort-by :owner (map (fn [[id raw]] {:owner id :texts (count (:texts (root/decode raw)))
                                                                         :mask (count (:mask (root/decode raw)))}) roots))}))
    (println "owner-census folds" (count folds) "roots" (count roots))
    (shutdown-agents)
    (System/exit 0)))
