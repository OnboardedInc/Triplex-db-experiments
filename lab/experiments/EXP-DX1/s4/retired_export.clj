(ns retired-export
 (:require [datomic.api :as d] [clojure.data.json :as json]))
;; [DX-S4] Why: 442,410 counts historical assertions, whereas the pages contain 442,196 current rows. Read the missing 214 values without a transactor. Rejected: inventing rows to meet the requested denominator.
(defn -main [base]
 (let [n (atom 0)]
  (doseq [name (d/get-database-names (.replace ^String base "datomic:sql://" "datomic:sql://*")) :when (not= name "tx2-health")]
   (let [jdbc (subs base (inc (.indexOf ^String base "?jdbc:")))
         conn (d/connect (str "datomic:sql://" name "?read-only=true#" jdbc)) db (d/db conn)
         journals (set (map :e (d/datoms db :aevt :triplex.journal/position)))]
    (doseq [x (d/datoms (d/history db) :aevt :triplex.entity/row)
            :when (and (not (:added x)) (not (journals (:e x))))]
     (let [^String text (:v x) start (+ 5 (Integer/parseInt text 1 5 16)) refsize (Integer/parseInt text (+ start 32) (+ start 36) 16)
           row (json/read-str (subs text (+ start 37 refsize)))]
      (println (json/write-str [(nth row 2) text] :escape-slash false)) (swap! n inc)))
    (d/release conn)))
  (binding [*out* *err*] (println (json/write-str {:exported @n :kind "retracted-subject-assertion-values"})))
  (when (not= @n 214) (throw (ex-info "unexpected retraction count" {:rows @n}))))
 (shutdown-agents))
