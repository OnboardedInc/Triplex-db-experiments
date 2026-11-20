(ns triplex.age.scale
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.tape :as tape]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as gateway]
            [triplex.gateway.storage :as storage])
  (:import [java.sql DriverManager]
           [java.util.concurrent.locks LockSupport]))

(def GiB (* 1024 1024 1024))
(defn ms [start] (/ (- (System/nanoTime) start) 1e6))

(defn sql [jdbc f]
  (with-open [conn (DriverManager/getConnection jdbc "postgres" (System/getenv "AGE_SQL_PASSWORD"))
              statement (.createStatement conn)]
    (f statement)))

(defn string-query [statement query]
  (with-open [r (.executeQuery statement query)]
    (native/check! (.next r) "Storage query returned no result" {})
    (.getString r 1)))

(defn bytes! []
  (sql (System/getenv "AGE_SQL_JDBC")
    #(Long/parseLong (string-query % "select pg_database_size(current_database())"))))

(defn records! [conn]
  (let [n (:datoms (d/db-stats (d/db conn)))]
    (native/check! (and (integer? n) (pos? n)) "Datomic history record count unavailable" {})
    n))

(defn local-limit! []
  (when-let [limit (some-> (System/getenv "AGE_MAX_SQL_BYTES") Long/parseLong)]
    (native/check! (< (bytes!) limit) "Conservative source SQL byte guard reached" {:limit limit})))

(defn index! [conn]
  (let [t (d/basis-t (d/db conn)) start (System/nanoTime)
        request (d/request-index conn) installed (deref (d/sync-index conn t) 240000 nil)]
    (native/check! installed "Index did not reach requested basis" {:t t})
    {:requestedT t :requestAccepted (boolean request) :observedT (d/basis-t installed)
     :ms (ms start) :started start :finished (System/nanoTime)}))

(defn open-existing [name]
  (native/check! (re-matches #"s2-[A-Za-z0-9_-]+|s-[a-f0-9]{32}" name) "Invalid isolated scope name" {})
  {:name name :conn (gateway/connection (gateway/db-uri name))})

(defn percentiles [samples]
  (let [ordered (vec (sort samples)) n (count ordered)
        p #(ordered (dec (long (Math/ceil (* n %)))))]
    (when (pos? n) {:n n :p50 (p 0.5) :p99 (p 0.99) :max (peek ordered)})))

(defn peer-memory []
  (let [metrics (into {} (map (fn [[_ k n]] [k (Long/parseLong n)])
                             (re-seq #"(?m)^(Rss|Pss):\s+(\d+)" (slurp "/proc/self/smaps_rollup"))))]
    (native/check! (<= 0 (get metrics "Pss") (get metrics "Rss")) "Invalid peer memory sample" {})
    {:rssKiB (get metrics "Rss") :pssKiB (get metrics "Pss")}))

(defn warm-reader [db pop i saves route]
  (let [p (+ (tape/seed-head pop) saves)
        read (case route :current #(gate/person-view db pop i nil)
                         (:pinned :old-cut) #(gate/person-view db pop i p))
        expected (gate/oracle-person pop i saves)]
    (gate/equal! expected (read) "Warm-up returned wrong rows")
    (percentiles (mapv (fn [_] (let [start (System/nanoTime) result (read) duration (ms start)]
                                (gate/equal! expected result "Measured read returned wrong rows") duration))
                      (range 40)))))

(defn read-cells [pop saves]
  (let [hot (tape/owner-index pop 0)
        cold 0
        before-last-hot (* (:active pop) (quot (dec saves) (:active pop)))]
    ;; Match the same 160-field owners across rungs. The near pin precedes the last write on the active owner.
    [["current-recent" hot saves :current]
     ["current-year-idle" cold saves :current]
     ["pinned-recent" hot before-last-hot :pinned]
     ["pinned-year-idle" cold before-last-hot :pinned]
     ["old-cut" hot (min 1 saves) :old-cut]]))

(defn confirm-page! [page pop after count]
  (let [expected (mapv (fn [n] [(tape/tx-id n) (+ (tape/seed-head pop) (inc n))])
                       (range after (+ after count)))]
    (gate/equal! expected (mapv #(subvec % 0 2) (get page "transactions")) "Feed membership differs")
    (gate/equal! (mapv (fn [[_ p]] [p p]) expected) (get page "clockEnds") "Feed boundary differs")
    (doseq [[n [_ _ rows]] (map vector (range after (+ after count)) (get page "transactions"))]
      (let [expected (:journal (tape/command pop n))
            observed (mapv lean/decode rows)]
        (gate/equal! (into {} (map (juxt :id :attribute)) expected)
                     (into {} (map (juxt :id :attribute)) observed) "Feed journal record identities differ")
        (doseq [row observed
                :let [want (first (filter #(= (:id row) (:id %)) expected))]]
          (gate/equal! (if (= ":_tx/change" (:attribute want))
                         (dissoc want :value_json) want)
                       (select-keys row (if (= ":_tx/change" (:attribute want))
                                          (remove #{:value_json} (keys want)) (keys want)))
                       "Feed journal row differs")
          (when (= ":_tx/change" (:attribute want))
            (let [value (json/read-str (:value_json want))]
              (gate/equal! (cond-> value (= "assert" (get value "op")) (assoc "recordedAt" (:recorded_at want)))
                           (json/read-str (:value_json row)) "Feed change payload differs"))))))))

(defn timed-feed [db pop saves]
  (let [count (min 7 saves) after (- saves count) p (+ (tape/seed-head pop) after)]
    (percentiles
      (mapv (fn [_]
              (let [start (System/nanoTime) page (gate/feed db p count nil) elapsed (ms start)]
                (confirm-page! page pop after count) elapsed)) (range 30)))))

(defn park-until [due]
  (loop []
    (let [left (- due (System/nanoTime))]
      (when (pos? left)
        (LockSupport/parkNanos left)
        (recur)))))

(defn saves! [{:keys [name conn]} pop start-count rate samples index-run]
  ;; [DX-AGE1] Why: queue time is measured against predeclared offers even when a single ordered writer falls behind.
  ;; Rejected: resetting each offer timestamp at dispatch or reordering logical clocks in the load driver.
  (let [commands (mapv #(let [c (tape/command pop %)] [c (tape/input c)]) (range start-count (+ start-count samples)))
        origin (+ (System/nanoTime) 100000000)
        index (volatile! nil)
        results (mapv (fn [i [command input]]
                        (let [due (+ origin (long (* i (/ 1e9 rate))))
                              _ (park-until due)
                              started (System/nanoTime)
                              _ (when (and index-run (= i 4)) (vreset! index (future (index! conn))))
                              reply (storage/commit! name conn (d/db conn) input)
                              finished (System/nanoTime)]
                          (gate/equal! [(:operation command) (str (:position command)) (:clock command) (+ 12 (* 4 (:width command)))]
                                       [(:operationId reply) (get-in reply [:position "v"]) (get-in reply [:recordedAt "v"]) (:datoms reply)]
                                       "Timed product save receipt differs")
                          {:started started :finished finished :clock (/ (- finished due) 1e6) :records (:datoms reply)}))
                      (range) commands)
        indexed (when @index @@index)
        overlap (when indexed (filter #(and (< (:started %) (:finished indexed))
                                             (> (:finished %) (:started indexed))) results))]
    {:rate rate :offered samples :observed (count results) :records (reduce + (map :records results))
     :receiptMs (percentiles (map :clock results)) :overlapMs (percentiles (map :clock overlap))
     :index (some-> indexed (dissoc :started :finished))}))

(defn load-to! [db pop from target]
  (loop [at from growth 0 started (System/nanoTime)]
    (if (= at target)
      {:saves target :records growth :seconds (/ (ms started) 1000)
       :recordsPerSecond (if (zero? growth) 0 (/ growth (/ (ms started) 1000)))}
      (let [end (min target (+ at 5000))
            _ (local-limit!)
            segment (native/age! db pop at end (min (:active pop) 64))]
        (native/emit "load-segment" segment)
        (recur end (+ growth (:records segment)) started)))))

(defn init! [pop]
  (let [db (native/open! "scale") start (System/nanoTime)
        records (native/seed! db pop)
        indexing (index! (:conn db))]
    (local-limit!)
    (native/emit "seed" {:name (:name db) :population pop :records records
                         :totalRecords (records! (:conn db)) :seconds (/ (ms start) 1000)
                         :sqlBytes (bytes!) :index (dissoc indexing :started :finished)})))

(defn rung! [db pop from target low-n busy-n]
  (let [growth (load-to! db pop from target)
        settled (index! (:conn db))
        low (saves! db pop target 3.5 low-n nil)
        busy (saves! db pop (+ target low-n) 50 busy-n nil)
        mixed (saves! db pop (+ target low-n busy-n) 50 busy-n true)
        end (+ target low-n busy-n busy-n)
        final-index (index! (:conn db))
        reads (into {} (for [[label i s mode] (read-cells pop end)] [label (warm-reader db pop i s mode)]))
        feed-lat (timed-feed db pop end)
        bytes (bytes!)]
    (local-limit!)
    (native/emit "rung" {:name (:name db) :growth growth :from from :target target :end end :bytes bytes
                         :totalRecords (records! (:conn db))
                         :warmMs reads :feedMs feed-lat :peerMemory (peer-memory)
                         :low low :busy busy :indexMix mixed :settled (dissoc settled :started :finished)
                         :backupT (:requestedT final-index)
                         :head (storage/head-position (d/db (:conn db)))})))

(defn cold! [db pop saves label]
  (let [[_ i s mode] (first (filter #(= label (first %)) (read-cells pop saves)))
        expected (gate/oracle-person pop i s)
        cut (when-not (= mode :current) (+ (tape/seed-head pop) s))
        start (System/nanoTime) result (gate/person-view db pop i cut)
        duration (ms start)]
    (gate/equal! expected result "First-peer read differs from the tape")
    (native/emit "peer-cold-read" {:cell label :saves saves :cut cut :ms duration :count (count result)})))

(defn restored! [db pop end t]
  (let [view (d/db (:conn db))]
    (gate/equal! t (d/basis-t view) "Restore basis differs from the selected backup")
    (gate/equal! (+ (tape/seed-head pop) end) (storage/head-position view) "Restore logical head differs")
    (doseq [[_ i s mode] (read-cells pop end)]
      (gate/equal! (gate/oracle-person pop i s)
                   (gate/person-view db pop i (when-not (= mode :current) (+ (tape/seed-head pop) s)))
                   "Restored rows differ from tape"))
    (let [receipt (gate/read-receipt db (dec end))]
      (gate/equal! (str (storage/head-position view)) (get-in receipt [:position "v"]) "Restore receipt differs"))
    (confirm-page! (gate/feed db (+ (tape/seed-head pop) (- end 7)) 7 nil) pop (- end 7) 7)
    (native/emit "restored-readback" {:saves end :t t})))

(defn -main [mode deep thin & args]
  (try
    (let [pop (tape/population (Long/parseLong deep) (Long/parseLong thin))
          n #(Long/parseLong %)]
      (case mode
        "init" (init! pop)
        "rung" (let [[name from target low-n busy-n] args]
                 (rung! (open-existing name) pop (n from) (n target) (n low-n) (n busy-n)))
        "cold" (let [[name saves label] args] (cold! (open-existing name) pop (n saves) label))
        "restored" (let [[name end t] args
                         jdbc (System/getenv "AGE_RESTORE_JDBC")
                         conn (d/connect (str "datomic:sql://" name "?read-only=true#" jdbc
                                             "?user=postgres&password=" (System/getenv "AGE_SQL_PASSWORD")))]
                     (restored! {:name name :conn conn} pop (n end) (n t)))))
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
