(ns triplex.age.maintenance
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.rung :as rung]
            [triplex.age.scale :as scale]
            [triplex.age.tape :as tape])
  (:import [datomic.db Db]))

(defn sql-sample []
  (json/read-str
    (scale/sql (System/getenv "AGE_SQL_JDBC")
      #(scale/string-query %
         (str "select json_build_object('databaseBytes',pg_database_size(current_database()),"
              "'directory',current_setting('data_directory'),"
              "'heapBytes',pg_relation_size(c.oid),'toastBytes',pg_total_relation_size(c.reltoastrelid),"
              "'indexBytes',pg_indexes_size(c.oid),"
              "'walBytes',(select coalesce(sum(size),0) from pg_ls_waldir()),"
              "'deleted',pg_stat_get_tuples_deleted(c.oid),"
              "'dead',pg_stat_get_dead_tuples(c.oid),"
              "'toastDeleted',pg_stat_get_tuples_deleted(c.reltoastrelid)) "
              "from pg_class c where c.oid='public.datomic_kvs'::regclass")))
    :key-fn keyword))

(defn vacuum! []
  ;; [DX-AGE1] Why: put deleted segment pages on PostgreSQL's free space map between write epochs.
  ;; Rejected: VACUUM FULL, which requires a second heap and would reallocate the held volume.
  (scale/sql (System/getenv "AGE_SQL_JDBC")
    (fn [stmt]
      (.execute stmt "set statement_timeout='20min'")
      (.execute stmt "vacuum (index_cleanup on, truncate off, parallel 2) public.datomic_kvs"))))

(defn inspect-cut! [file manifest phase]
  (let [state (rung/load-state! file)
        pop (:population state)
        name (get-in pop [:seal :name])
        db (if-let [clone (System/getenv "AGE_CLONE_URI")]
             {:name name :conn (d/connect clone)}
             (rung/db-for pop))
        _ (gate/equal! manifest (:manifest-sha state) "Maintenance is not on the admitted population")
        view (rung/verify-state! state db)
        basis (d/basis-t view)
        count (:datoms (d/db-stats view))]
    (gate/equal! (:t state) basis "Maintenance found a different native cut")
    (native/check! (>= (.-indexBasisT ^Db view) basis) "Cut must already be fully indexed" {:t basis})
    (native/check! (contains? #{"sample" "vacuum" "fixture-verify"} phase) "Unknown maintenance mode" {})
    (when (= "vacuum" phase) (vacuum!))
    (let [after (rung/verify-state! state db)]
      (gate/equal! [basis count] [(d/basis-t after) (:datoms (d/db-stats after))]
                   "The maintenance cut or indexed history count changed"))
    (when (= "fixture-verify" phase)
      ((requiring-resolve 'triplex.age.scorecard/observe!)
        state db basis (+ (tape/seed-head pop) (:observed state)) count))
    (native/emit "maintenance" {:operation phase :t basis :records count :sql (sql-sample)})))
