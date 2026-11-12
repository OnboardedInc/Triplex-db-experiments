(ns id-lookup-probe (:require [datomic.api :as d] [clojure.data.json :as json] [triplex.gateway.scope :as scope]))
;; [DX-S5] Why: isolate historical lookup-ref CPU on the retained source without changing a datom.
;; Rejected: inferring the cause from HTTP wall time or mistaking this 32-key diagnostic for full-world qualification.
(defn -main [uri position prefix]
 (let [conn (d/connect uri) current @(d/sync conn) e (scope/entity current)
       head (scope/head-position current e) p (Long/parseLong position)
       tx (d/entid current [:triplex.tx/position p]) _ (assert tx)
       old (d/as-of current (d/tx->t tx))
       ids (mapv #(str "p5:outbox:" prefix ":pl:s" (format "%08d" %)) (range 32))
       measure (fn [db]
         (let [start (System/nanoTime) values (mapv #(d/entid db [:triplex.entity/id %]) ids)]
           (assert (every? nil? values) "diagnostic namespace already exists")
           {:lookups (count values) :milliseconds (/ (- (System/nanoTime) start) 1000000.0)}))
       historical (measure old) latest (measure current) historical-warm (measure old) current-warm (measure current)
       final-head (scope/head-position @(d/sync conn) e)]
  (assert (= head final-head) "read-only diagnostic observed a concurrent logical write")
  (println (json/write-str {:event "id-lookup-diagnostic" :seedPosition p :initialHead head :finalHead final-head
                            :nativeBasis (d/basis-t current) :historical historical :current latest :historicalWarm historical-warm :currentWarm current-warm :qualifiedWorlds 0}))
  (d/release conn))
 (d/shutdown true) (shutdown-agents))
