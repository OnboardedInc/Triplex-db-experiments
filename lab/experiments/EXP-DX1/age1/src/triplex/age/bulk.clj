(ns triplex.age.bulk
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.rung :as rung]
            [triplex.age.scale :as scale]
            [triplex.age.tape :as tape]
            [triplex.gateway.group :as group]
            [triplex.gateway.storage :as storage])
  (:import [datomic.db Db]
           [datomic.peer Connection]))

(defn now [] (System/currentTimeMillis))

(defn index-t [conn] (.-indexBasisT ^Db (d/db conn)))

(defn sql-counters []
  (scale/sql (System/getenv "AGE_SQL_JDBC")
    #(scale/string-query %
       (str "select json_build_object('trackWalIoTiming', current_setting('track_wal_io_timing'), "
            "'wal', (select row_to_json(w) from pg_stat_wal w), "
            "'database', (select row_to_json(s) from pg_stat_database s where datname=current_database()))"))))

(def ref-attrs #{:triplex.group/members :triplex.group/touched :triplex.group/physical})

(defn grouped-ack [commands data {:keys [db-after tx-data]} prev id-attr owner-id]
  ;; [DX-AGE1] Why: compare the actual native log multiset and resolve each member/owner independently.
  ;; Rejected: accepting a returned member count or counting the duplicated revision retraction twice.
  (let [t (or (d/as-of-t db-after) (d/basis-t db-after))
        physical (d/t->tx t)
        entity-attr (d/entid db-after :triplex.entity/id)
        member-ids (into {} (keep #(when (= entity-attr (:a %)) [(:v %) (:e %)])) tx-data)
        temps (into {"datomic.tx" physical}
                    (for [c (butlast commands)]
                      [(str "age/member/" (:position c)) (member-ids (:tx c))]))
        entity (fn [x] (if (string? x) (get temps x) (owner-id (second x))))
        expected (into [[physical :db/txInstant :engine-time true]]
                       (concat
                         (mapcat (fn [entry]
                                   (if (map? entry)
                                     (for [[a value] (dissoc entry :db/id)
                                           v (if (= a :triplex.entity/row) value [value])]
                                       [(entity (:db/id entry)) a v true])
                                     (let [[op e a v] entry]
                                       [[(entity e) a (if (ref-attrs a) (entity v) v) (= op :db/add)]])))
                                 data)
                         (map (fn [{:keys [owner prior-rev]}]
                                [(owner-id owner) :triplex.entity/rev prior-rev false]) commands)))
        observed (mapv (fn [{:keys [e a v added]}]
                         (let [attr (id-attr a)]
                           [e attr (if (and (= attr :db/txInstant) (instance? java.util.Date v))
                                     :engine-time v) added]))
                       tx-data)
        want (frequencies expected)
        got (frequencies observed)]
    (native/check! (and (< prev t) (every? #(= physical (:tx %)) tx-data)
                        (every? (comp some? first) expected) (= want got))
                   "Grouped log differs from the authored saves"
                   {:first-position (:position (first commands)) :t t :records (count observed)
                    :expected-only (->> want (remove #(= (val %) (get got (key %)))) (take 4) vec)
                    :observed-only (->> got (remove #(= (val %) (get want (key %)))) (take 4) vec)})
    {:t t :records (count got) :log-records (count observed)}))

(defn attr-map [db]
  (into {} (map (fn [a] [(d/entid db a) a]))
        (concat native/attrs [:triplex.entity/retired :triplex.tx/recorded-at] (map :db/ident group/group-schema))))

(defn phase-policy! [pop size depth]
  (native/check! (and (<= 1 size 32) (<= 1 depth 256) (<= (* size depth) (:active pop)))
                 "Pipeline may submit multiple revisions of the same owner" {:size size :depth depth}))

(defn sync-and-bind! [state db]
  (let [view (rung/verify-state! state db)]
    (gate/equal! (:t state) (d/basis-t view) "Native cut contains foreign writes")
    view))

(def empty-counts {:records 0 :log-records 0 :transactions 0})

(defn commit-series! [{:keys [conn]} pop view state size depth stop soft-ms]
  (let [ids (attr-map view)
        owner-id (memoize #(d/entid view [:triplex.entity/id %]))
        records (fn [from through] (mapv #(tape/command pop %) (range from through)))
        render #(if (= 1 size) (native/render (first %)) (native/grouped-render %))
        clock (long-array 5)
        add! (fn [i a b] (aset-long clock i (+ (aget clock i) (- b a))))
        bind (fn [from through]
               (let [a (System/nanoTime) commands (records from through)
                     b (System/nanoTime) data (render commands) c (System/nanoTime)]
                 (add! 0 a b) (add! 1 b c)
                 [commands data]))
        acknowledge (fn [previous commands data result]
                      (if (= 1 size)
                        (let [[t count] (native/acknowledge! (first commands) data result previous ids)]
                          {:t t :records count :log-records count})
                        (grouped-ack commands data result previous ids owner-id)))
        sent (fn [from through]
               (let [[cs data] (bind from through)
                     a (System/nanoTime) reply (d/transact-async conn data)]
                 (add! 2 a (System/nanoTime))
                 [through cs data reply]))
        accept (fn [last [to cs data reply]]
                 (let [a (System/nanoTime) report (deref reply 120000 ::timeout) b (System/nanoTime)
                       _ (native/check! (not= ::timeout report) "Bulk future outcome unknown" {:to to})
                       next (acknowledge (:t last) cs data report)]
                   (add! 3 a b) (add! 4 b (System/nanoTime))
                   (-> (merge-with + (select-keys last [:transactions :records :log-records])
                                   next {:transactions 1})
                       (assoc :observed to))))
        summary
        (loop [next (:observed state)
               pending clojure.lang.PersistentQueue/EMPTY
               last (merge empty-counts (select-keys state [:observed :t]))]
          (cond
            (and (< next stop) (< (count pending) depth) (< (now) soft-ms))
            (let [through (min stop (+ next size))]
              (recur through (conj pending (sent next through)) last))

            (seq pending)
            (recur next (clojure.core/pop pending) (accept last (peek pending)))

            :else last))]
    (assoc summary :stage-ms (zipmap [:tape :encode :enqueue :blockedAwait :ackValidate]
                                    (map #(/ % 1e6) clock)))))

(defn finish-chunk [state result]
  (-> state
      (assoc :t (:t result) :observed (:observed result))
      (update-in [:bulk :records] + (:records result))
      (update-in [:bulk :log-records] + (:log-records result))
      (update-in [:bulk :transactions] + (:transactions result))
      (dissoc :bulk-pending)))

(defn reconcile! [file state db]
  (if-let [{:keys [through size]} (:bulk-pending state)]
    (let [view (rung/current! db)
          from (:observed state)
          pop (:population state)
          end (- (storage/head-position view) (tape/seed-head pop))
          ids (attr-map view)
          owner-id (memoize #(d/entid view [:triplex.entity/id %]))
          _ (gate/equal! (:t state) (adopt/exact-position-t view (+ (tape/seed-head pop) from)) "Bulk checkpoint cut differs")
          _ (native/check! (<= from end through) "Unadmitted bulk writes" {:from from :end end :through through})
          result
          (reduce (fn [last batch]
                    (let [cs (mapv #(tape/command pop %) batch)
                          n (inc (peek batch))
                          t (adopt/exact-position-t view (:position (peek cs)))
                          entry (first (d/tx-range (d/log (:conn db)) t (inc t)))
                          report {:db-after (d/as-of view t) :tx-data (:data entry)}
                          next (if (= 1 size)
                                 (let [[_ count] (native/acknowledge! (first cs) (native/render (first cs)) report (:t last) ids)]
                                   {:t t :records count :log-records count})
                                 (grouped-ack cs (native/grouped-render cs) report (:t last) ids owner-id))]
                      (gate/equal! t (:t entry) "Reconciliation log entry differs")
                      (merge (merge-with + (dissoc last :t :observed) next {:transactions 1}) {:observed n})))
                  (merge empty-counts (select-keys state [:observed :t]))
                  (map vec (partition-all size (range from end))))
          done (finish-chunk state result)]
      (gate/equal! (:t done) (d/basis-t view) "Bulk reconciliation found a foreign transaction")
      (rung/save-state! file done true)
      done)
    state))

(defn enroll! [file state db]
  (if (:bulk state) state
    (let [conn (:conn db)
          view (rung/verify-state! state db)
          pop (:population state)
          prefix-t (:t state)
          pending (:bulk-enrolling state)
          before (+ (:seed-records pop) (rung/count-records pop 0 (:observed state)))
          missing (filterv #(not (d/entid view (:db/ident %))) group/group-schema)
          wanted (or pending (mapv :db/ident missing))
          _ (when-not pending
              (sync-and-bind! state db)
              (rung/save-state! file (assoc state :bulk-enrolling wanted) true))
          attrs (filterv (comp (set wanted) :db/ident) group/group-schema)
          _ (when (= prefix-t (d/basis-t view))
              (gate/equal! attrs missing "Unexpected pre-enrollment schema")
              (when (seq missing) @(d/transact conn missing)))
          after (rung/current! db)
          schema-t (d/basis-t after)]
      (if (seq attrs)
        (let [written (vec (d/tx-range (d/log conn) (inc prefix-t) (inc schema-t)))
              tx (d/t->tx schema-t)
              schema-tags #{:db/ident :db/valueType :db/cardinality :db/unique}
              expected (into #{} (for [spec attrs
                                      [k v] spec
                                      :let [e (d/entid after (:db/ident spec))]]
                                  [e k (if (= k :db/ident) v (d/entid after v))]))
              observed (into #{} (for [x (:data (first written))
                                      :let [a (d/ident after (:a x))]
                                      :when (schema-tags a)]
                                  [(:e x) a (:v x)]))]
          (native/check! (and (= 1 (count written)) (= schema-t (:t (first written)))
                              (every? #(and (:added %) (= tx (:tx %))
                                            (contains? (into schema-tags #{:db/txInstant :db.install/attribute})
                                                       (d/ident after (:a %))))
                                      (:data (first written))))
                         "Native writes outside the planned schema frame" {:t schema-t})
          (gate/equal! expected observed "Group schema log differs from the planned definitions"))
        (gate/equal! prefix-t schema-t "Native writes during empty schema enrollment"))
      ;; [DX-AGE1] Why: pin the historical count before accepting any grouped member.
      ;; Rejected: extrapolating history size from raw log frames with duplicate retractions.
      (scale/index! conn)
      (let [actual (scale/records! conn)
            state (-> state (dissoc :bulk-enrolling)
                      (assoc :bulk (merge empty-counts
                                     {:prefix-t prefix-t :prefix-saves (:observed state)
                                      :prefix-records before :schema-t schema-t :base-records actual})))]
        (native/check! (<= before actual (+ before 100)) "Bulk enrollment census differs" {:expected before :observed actual})
        (rung/save-state! file state true)
        state))))

(defn validate-cut! [state db]
  (let [view (rung/verify-state! state db)
        expected (if (= (:observed state) (get-in state [:bulk :prefix-saves]))
                   (get-in state [:bulk :schema-t]) (:t state))]
    (gate/equal! expected (d/basis-t view) "Bulk live basis differs from checkpoint")
    view))

(defn phase! [file state db size depth target soft-ms hard-ms sample-seconds]
  (let [pop (:population state)
        conn (:conn db)
        _ (phase-policy! pop size depth)
        view (validate-cut! state db)
        start (now)
        begin-t (:t state)
        prior (:bulk state)
        wal (sql-counters)
        _ (gate/equal! "on" (:trackWalIoTiming (json/read-str wal :key-fn keyword))
                       "Enable PostgreSQL track_wal_io_timing before bulk admission")
        index-start (index-t conn)
        min-rate (some-> (System/getenv "AGE_BULK_MIN_RATE") Long/parseLong)
        first-save (:observed state)]
    (loop [state state
           stage {}
           checked 0
           sampled start
           previous-records 0
           samples []]
      (let [current (now)
            added (- (get-in state [:bulk :records]) (:records prior))
            total (+ (get-in state [:bulk :base-records]) (get-in state [:bulk :records]))
            stop? (or (>= current soft-ms) (>= total target))
            sample? (or stop? (>= (- current sampled) (* 1000 sample-seconds)))
            samples (if sample?
                      (conj samples {:wall current :t (:t state) :indexedT (index-t conn)
                                     :records added :seconds (/ (- current sampled) 1000.0)
                                     :intervalRecords (- added previous-records)})
                      samples)]
        (when sample?
          (rung/guard! hard-ms)
          (native/emit "bulk-progress" (assoc (peek samples) :size size :depth depth))
          (when (and min-rate (not stop?) (>= (- current start) 1200000))
            (let [window (filter #(>= (:wall %) (- current 1200000)) samples)
                  oldest (first window)
                  recent-rate (/ (- added (:records oldest)) (/ (- current (:wall oldest)) 1000.0))
                  remaining (- target total)
                  seconds-left (/ (- soft-ms current) 1000.0)]
              (native/check! (and (>= recent-rate min-rate) (< (/ remaining recent-rate) seconds-left))
                             "Observed rate cannot reach 1B before the loading deadline"
                             {:remaining remaining :seconds-left seconds-left :recent-rate recent-rate}))))
        (if stop?
          [state {:size size :depth depth :from first-save :to (:observed state) :fromT begin-t :t (:t state)
                  :nativeId (str (.-db_id ^Connection conn))
                  :wallStart start :wallEnd current :seconds (/ (- current start) 1000.0)
                  :indexStartT index-start :indexEndT (index-t conn) :samples samples
                  :records added :historyEstimate total :logRecords (- (get-in state [:bulk :log-records]) (:log-records prior))
                  :transactions (- (get-in state [:bulk :transactions]) (:transactions prior))
                  :walStart wal :walEnd (sql-counters) :stageMs stage}]
          (let [at (:observed state)
                bound (+ at (* size (max depth (min 2048 (quot (- target total) (* size 20))))))
                pending (assoc state :bulk-pending {:through bound :size size})
                _ (rung/save-state! file pending true)
                observed (commit-series! db pop view state size depth bound soft-ms)
                state (finish-chunk state observed)]
            (rung/save-state! file state true)
            (when (zero? (mod checked 24)) (validate-cut! state db))
            (recur state (merge-with + stage (:stage-ms observed)) (inc checked)
                   (if sample? current sampled) (if sample? added previous-records) samples)))))))

(defn settle! [file state db result ready?]
  (let [job (scale/index! (:conn db))
        actual (scale/records! (:conn db))
        expected (:historyEstimate result)]
    (gate/equal! expected actual "Indexed census differs from verified unique log datoms")
    (validate-cut! state db)
    (let [state (cond-> state ready?
                  (assoc :bulk-loaded true :settle job :aged-records actual)
                      ready? (assoc-in [:bulk :loaded-at] (:observed state)))]
      (rung/save-state! file state true)
      (assoc result :indexedRecords actual :settle job :bulkLoaded ready?))))

(defn assert-durability! []
  (gate/equal! "on|on|on|0"
                       (scale/sql (System/getenv "AGE_SQL_JDBC")
                         #(scale/string-query %
                            (str "select current_setting('fsync') || '|' || current_setting('synchronous_commit') || '|' "
                                 "|| current_setting('full_page_writes') || '|' || (select count(*) "
                                 "from pg_db_role_setting, unnest(setconfig) as c(value) "
                                 "where setdatabase in (0, (select oid from pg_database where datname=current_database())) "
                                 "and value like 'synchronous_commit=%' and value <> 'synchronous_commit=on')")))
                       "Bulk SQL durability or role override differs"))

(defn begin! [file manifest prefix-t prefix-head]
  (let [state (rung/load-state! file)
        db (rung/db-for (:population state))
        prefix-save (- prefix-head (tape/seed-head (:population state)))
        _ (gate/equal! manifest (:manifest-sha state) "Bulk seed manifest differs")
        _ (gate/equal! [prefix-t prefix-save]
                       (if-let [bulk (:bulk state)] [(:prefix-t bulk) (:prefix-saves bulk)]
                         [(:t state) (:observed state)]) "Held prefix differs")
        _ (native/check! (not (or (:pending-end state) (:finished state) (seq (:closed-rungs state))))
                         "Bulk cannot run across in-progress or sealed measurements" {})
        _ (assert-durability!)
        state (->> (enroll! file state db) (#(reconcile! file % db)))]
    (validate-cut! state db)
    [state db]))

(defn main! [file manifest prefix-t prefix-head mode size depth target soft-ms hard-ms]
  (let [[prefix-t prefix-head size depth target soft-ms hard-ms]
        (mapv #(Long/parseLong %) [prefix-t prefix-head size depth target soft-ms hard-ms])
        [state db] (begin! file manifest prefix-t prefix-head)
        [final result] (phase! file state db size depth target soft-ms hard-ms 30)
        out (settle! file final db result (and (= "load" mode) (>= (:historyEstimate result) target)))]
    (native/emit "bulk-phase" (assoc out :database (:name db) :manifestSha manifest :mode mode))))
