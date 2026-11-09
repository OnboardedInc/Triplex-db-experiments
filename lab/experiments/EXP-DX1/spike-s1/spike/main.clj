(ns spike.main
  (:require [datomic.api :as d] [clojure.data.json :as json] [clojure.java.io :as io] [clojure.string :as str])
  (:import [java.lang.management ManagementFactory ThreadMXBean]
           [java.util Random UUID ArrayDeque HashSet ArrayList Arrays]
           [java.util.concurrent ConcurrentHashMap Semaphore Executors TimeUnit Callable]
           [java.io ByteArrayOutputStream BufferedWriter]
           [java.time Instant]))
(set! *warn-on-reflection* true)
(def ^ThreadMXBean mx (ManagementFactory/getThreadMXBean))
(defn cpu [] (.getCurrentThreadCpuTime mx))
(defn usage [] (Long/parseLong (second (re-find #"usage_usec (\d+)" (slurp "/sys/fs/cgroup/cpu.stat")))))
(defn emit [x] (println (json/write-str x)) (flush))
(defn uri [db] (str "datomic:sql://" db "?jdbc:postgresql://tx2-dxs1-pg:5432/datomic?user=datomic&password=datomic"))
(defn connect [db] (d/connect (uri db)))
(defn stats [xs]
  (let [a (double-array xs) n (alength a)]
    (Arrays/sort a)
    (if (zero? n) {:n 0} (merge {:n n :mean (/ (areduce a i ret 0.0 (+ ret (aget a i))) n)}
      (into {} (for [[k p] [[:p50 0.5] [:p90 0.9] [:p99 0.99] [:max 1.0]]]
                 [k (aget a (min (dec n) (max 0 (dec (int (Math/ceil (* p n)))))))]))))))
(defn save-csv [path header rows]
  (with-open [^BufferedWriter w (io/writer (str "/evidence/" path))]
    (.write w (str header "\n"))
    (doseq [r rows] (.write w (str (str/join "," r) "\n")))))
(def schema
  (mapv (fn [[ident type many unique]]
          (cond-> {:db/ident ident :db/valueType type :db/cardinality (if many :db.cardinality/many :db.cardinality/one)}
            unique (assoc :db/unique unique)))
        [[:e/id :db.type/string false :db.unique/identity]
         [:e/row :db.type/string true nil]
         [:f/id :db.type/string false :db.unique/value]
         [:f/n :db.type/long false nil]
         [:f/s :db.type/string false nil]
         [:f/ref :db.type/ref false nil]]))
(defn init [db]
  (d/create-database (uri db))
  (let [c (connect db)] @(d/transact c schema)
    @(d/transact c [{:e/id "anchor" :f/n 0}]) c))
(def ^String run-id (subs (str/replace (str (UUID/randomUUID)) "-" "") 0 10))
(def counter (atom 0))
(defn uid [] (format "%s%016d" run-id (swap! counter inc)))
(def ^String short-s (apply str (repeat 40 "s")))
(def ^String row-s (apply str (repeat 270 "r")))
;; [DX-S1] Why: independent new entities permit six scalar and two reference datoms per ten despite cardinality-one attributes. Rejected: repeated :f/n on one entity (not six persistent datoms).
(defn tx [n mode]
  (if (= mode "rows")
    (mapv (fn [_] [:db/add [:e/id "anchor"] :e/row (str (uid) "rrrr" row-s)]) (range n))
    (mapv (fn [i]
            (let [e (d/tempid :db.part/user) k (mod i 10)]
              (case k
                0 [:db/add e :f/id (uid)]
                7 [:db/add e :f/ref [:e/id "anchor"]]
                8 [:db/add e :f/ref [:e/id "anchor"]]
                9 [:db/add e :e/row (str (uid) "rrrr" row-s)]
                (if (even? k) [:db/add e :f/n (swap! counter inc)] [:db/add e :f/s short-s])))) (range n))))
(defn install-fn [c]
  @(d/transact c [{:db/ident :spike/check
    :db/fn (d/function {:lang "clojure" :params '[db expected datoms]
      :code '(do (when-not (= expected (:f/n (datomic.api/entity db [:e/id "anchor"])))
                    (throw (ex-info "expected value mismatch" {}))) datoms)})}]))
(defn commit-tx [c n mode]
  (let [t (tx n mode)] @(d/transact c (if (= mode "fn") [[:spike/check 0 t]] t))))
(defn closed [db label n mode warm samples]
  (let [c (connect db)]
    (when (= mode "fn") (install-fn c))
    (dotimes [_ warm] (commit-tx c n mode))
    (let [u (usage) t (System/nanoTime)
          rows (mapv (fn [i] (let [a (System/nanoTime) b (cpu) r (commit-tx c n mode)]
                              [i (/ (- (System/nanoTime) a) 1e6) (/ (- (cpu) b) 1e6)
                               (count (:tx-data r))])) (range samples))]
      (save-csv (str label ".csv") "i,wall_ms,writer_thread_cpu_ms,observed_tx_datoms" rows)
      (emit {:label label :latency_ms (stats (map second rows)) :thread_cpu_ms (stats (map #(nth % 2) rows))
             :observed_tx_datoms (stats (map #(nth % 3) rows)) :wall_s (/ (- (System/nanoTime) t) 1e9)
             :container_cpu_s (/ (- (usage) u) 1e6)}))))
(defn sleep-to [^long deadline]
  (loop [] (let [delta (- deadline (System/nanoTime))]
             (when (pos? delta) (java.util.concurrent.locks.LockSupport/parkNanos (min delta 1000000)) (recur)))))
;; [DX-S1] Why: completion workers wait on futures while scheduler offers independently; semaphore caps in-flight at 256. Rejected: deref in arrival loop (coordinated omission).
(defn open-loop [db label n rate seconds]
  (let [c (connect db) rng (Random. 5151) sem (Semaphore. 256)
        pool (Executors/newFixedThreadPool 16) rows (ConcurrentHashMap.) pending (ArrayList.)]
    (dotimes [_ 200] (commit-tx c n "mix"))
    (let [u (usage) start (+ (System/nanoTime) 100000000) end (+ start (long (* seconds 1e9)))]
      (spit (str "/evidence/" label "-go") "go")
      (loop [i 0 deadline start]
        (when (< deadline end)
          (sleep-to deadline)
          (.acquire sem)
          (let [offered (System/nanoTime) f (d/transact-async c (tx n "mix")) idx i due deadline]
            (.add pending (.submit pool ^Callable
              (fn [] (try @f (.put rows idx [idx (/ (- (System/nanoTime) due) 1e6) (/ (- offered due) 1e6)])
                       (catch Throwable e (.put rows idx [idx "ERROR" (.getMessage e)]))
                       (finally (.release sem)))))))
          (recur (inc i) (+ deadline (long (* 1e9 (/ (- (Math/log (- 1 (.nextDouble rng)))) rate)))))))
      (doseq [^java.util.concurrent.Future f pending] (.get f))
      (.shutdown pool)
      (spit (str "/evidence/" label "-done") "done")
      (let [rs (mapv #(.get rows %) (range (.size rows))) good (filter #(number? (second %)) rs)]
        (save-csv (str label ".csv") "i,scheduled_to_ack_ms,scheduler_lateness_ms" rs)
        (emit {:label label :rate rate :seconds seconds :latency_ms (stats (map second good)) :errors (- (count rs) (count good))
               :scheduler_lateness_ms (stats (map #(nth % 2) good)) :container_cpu_s (/ (- (usage) u) 1e6)
               :elapsed_s (/ (- (System/nanoTime) start) 1e9)})))))

;; Fixed-width envelope; every JSON body is exactly 250 ASCII bytes.
(defn row [id ref version]
  (let [body (str "{\"id\":\"" id "\",\"v\":" version ",\"pad\":\"")
        body (str body (apply str (repeat (- 248 (count body)) "x")) "\"}")]
    (str (format "%04x" (count id)) id "4278bcfe56800000" "----------------" (format "%04x" (count ref)) ref body)))
(defn decode-row [^String s]
  (let [n (Integer/parseInt (.substring s 0 4) 16) at (+ 4 n)
        from (Double/longBitsToDouble (Long/parseUnsignedLong (.substring s at (+ at 16)) 16))
        until-s (.substring s (+ at 16) (+ at 32))
        until (if (= until-s "----------------") Double/POSITIVE_INFINITY (Double/longBitsToDouble (Long/parseUnsignedLong until-s 16)))
        rn (Integer/parseInt (.substring s (+ at 32) (+ at 36)) 16) ra (+ at 36)]
    [(.getBytes (.substring s (+ ra rn)) "UTF-8") from until (.substring s ra (+ ra rn))]))
(defn own-id [i k] (str "s" i "/" k))
(defn account [i] (mod (quot i 20) 20))
(def reqs [2 5 8 11 14 17 20 23 25 27 33 52 71 90 109 128 147 153 270 387])
(defn entity-tx [id refs total]
  (into [[:db/add (d/tempid :db.part/user) :e/id id]]
        (map-indexed (fn [j ref] [:db/add [:e/id id] :e/row (row (str id "/r" j) ref 0)])
          (concat refs (repeat (max 0 (- total (count refs))) "")))))
;; [DX-S1] Why: literal standalone synthetic shape, matching bucket ranges and 28/40/50 own rows without importing Triplex. Rejected: invoking the TS generator (spike prohibits Triplex code).
(defn world-txs []
  (concat
    (mapcat (fn [a]
      (let [acct (str "a" a) rel (str "r" a) pol (str "p" a) rs (mapv #(str "q" a "/" %) (range (nth reqs a)))]
        (concat (entity-tx acct [rel] 6) (entity-tx rel (into [pol] rs) (+ 3 (count rs)))
                (entity-tx pol [] 3) (mapcat #(entity-tx % [] 4) rs)))) (range 20))
    (mapcat (fn [i]
      (let [id #(own-id i %) n (cond (< (mod i 20) 8) 28 (< (mod i 20) 15) 40 :else 50)
            refs {0 [(id 1) (id 2) (str "a" (account i))] 2 [(id 3) (id 4)]
                  3 [(id 5) (id 6)] 4 [(id 7) (id 8)] 5 [(id 9)] 6 [(id 10)] 7 [(id 11)]}
            counts (mapv #(+ (quot n 12) (if (< % (mod n 12)) 1 0)) (range 12))]
        (mapcat (fn [k] (entity-tx (id k) (get refs k []) (nth counts k))) (range 12)))) (range 10000))))
(defn seed [db]
  (let [c (init db) start (System/nanoTime)]
    ;; IDs first: row lookup refs require previously resolved identities. Split deliberately.
    (doseq [batch (partition-all 1000 (filter #(= :e/id (nth % 2)) (world-txs)))] @(d/transact c (vec batch)))
    (doseq [[i batch] (map-indexed vector (partition-all 1000 (filter #(= :e/row (nth % 2)) (world-txs))))]
      @(d/transact c (vec batch)) (when (zero? (mod i 50)) (emit {:seed_batch i})))
    (emit {:seeded true :basis (d/basis-t (d/db c)) :seconds (/ (- (System/nanoTime) start) 1e9) :requirements reqs})))
(defn cache-record [rs]
  (let [decoded (mapv #(decode-row (:v %)) rs)
        lengths (int-array (map #(alength ^bytes (first %)) decoded))
        offsets (int-array (butlast (reductions + 0 lengths)))
        joined (byte-array (reduce + lengths))]
    (doseq [i (range (count decoded))]
      (let [^bytes bs (first (nth decoded i))]
        (System/arraycopy bs 0 joined (aget offsets i) (alength bs))))
    [joined offsets lengths (double-array (map second decoded))
     (double-array (map #(nth % 2) decoded)) (object-array (map #(nth % 3) decoded))]))
(defn caches [db variant]
  (let [m (ConcurrentHashMap.)]
    (when-not (= variant "a")
      (doseq [datom (d/datoms db :avet :e/id)]
        (let [id (:v datom) eid (:e datom)]
          (.put m id (if (= variant "b") eid
            (cache-record (d/datoms db :eavt eid :e/row))))))) m))
(def instant 1700000000001.0)
;; [DX-S1] Why: copy bytes into one owned buffer and traverse unseen refs at one immutable db. Rejected: counting datoms without constructing the output (understates work).
(defn pull-world [db variant ^ConcurrentHashMap cache root]
  (let [q (ArrayDeque.) seen (HashSet.) out (byte-array 524288) state (long-array [1 0])]
    (.add q root) (.add seen root) (aset-byte out 0 (byte 91))
    (loop [entities 0]
      (if (.isEmpty q)
        (let [pos (aget state 0)] (aset-byte out pos (byte 93))
          [(Arrays/copyOf out (int (inc pos))) (aget state 1) entities])
        (let [id (.remove q)]
          (if (= variant "c")
            (let [[^bytes joined ^ints offsets ^ints lengths ^doubles froms ^doubles untils ^objects refs] (.get cache id)]
              (dotimes [i (alength lengths)]
                (when (and (<= (aget froms i) (double instant)) (< (double instant) (aget untils i)))
                  (let [pos (aget state 0) pos (if (pos? (aget state 1)) (do (aset-byte out pos (byte 44)) (inc pos)) pos)
                        len (aget lengths i) ^String ref (aget refs i)]
                    (System/arraycopy joined (aget offsets i) out pos len)
                    (aset state 0 (+ pos len)) (aset state 1 (inc (aget state 1)))
                    (when (and (not (.isEmpty ref)) (.add seen ref)) (.add q ref))))))
            (let [eid (if (= variant "b") (.get cache id) (d/entid db [:e/id id]))]
              (doseq [datom (d/datoms db :eavt eid :e/row)]
                (let [[^bytes bs from until ^String ref] (decode-row (:v datom))]
                  (when (and (<= (double from) (double instant)) (< (double instant) (double until)))
                    (let [pos (aget state 0) pos (if (pos? (aget state 1)) (do (aset-byte out pos (byte 44)) (inc pos)) pos)]
                      (System/arraycopy bs 0 out pos (alength bs))
                      (aset state 0 (+ pos (alength bs))) (aset state 1 (inc (aget state 1)))
                      (when (and (not (.isEmpty ref)) (.add seen ref)) (.add q ref))))))))
          (recur (inc entities)))))))
(defn warm [db variant cache subjects] (dotimes [i subjects] (pull-world db variant cache (own-id i 0))))
(defn read-run [db variant cache label subjects samples]
  (warm db variant cache subjects)
  (let [rng (Random. 4242) u (usage) start (System/nanoTime)
        rs (mapv (fn [i]
                   (let [subject (.nextInt rng subjects) a (System/nanoTime) b (cpu)
                         [^bytes bs rows ents] (pull-world db variant cache (own-id subject 0))
                         cp (- (cpu) b) wall (- (System/nanoTime) a)]
                     [i subject (/ wall 1e6) (/ cp 1000.0) rows ents (alength bs)])) (range samples))
        cpu-us (map #(nth % 3) rs)]
    (save-csv (str label ".csv") "i,subject,wall_ms,thread_cpu_us,rows,entities,bytes" rs)
    (emit {:label label :latency_ms (stats (map #(nth % 2) rs)) :cpu_us (stats cpu-us)
           :pulls_per_thread_cpu_s (/ (* samples 1e6) (reduce + cpu-us))
           :rows (stats (map #(nth % 4) rs)) :entities (stats (map #(nth % 5) rs)) :bytes (stats (map #(nth % 6) rs))
           :wall_s (/ (- (System/nanoTime) start) 1e9) :container_cpu_s (/ (- (usage) u) 1e6)})))
(defn reads [db variant label]
  (let [c (connect db) v (d/db c) cache (caches v variant)] (read-run v variant cache label 10000 20000)))
(defn cold [db]
  (let [c (connect db) v (d/db c) u (usage) a (System/nanoTime) b (cpu)
        rs (mapv (fn [i] (let [s (System/nanoTime) [^bytes bs rows ents] (pull-world v "a" nil (own-id i 0))]
                          [i (/ (- (System/nanoTime) s) 1e6) rows ents (alength bs)])) (range 10000))]
    (save-csv "q2-cold.csv" "subject,wall_ms,rows,entities,bytes" rs)
    (emit {:label "q2-cold" :wall_s (/ (- (System/nanoTime) a) 1e9) :thread_cpu_s (/ (- (cpu) b) 1e9)
           :container_cpu_s (/ (- (usage) u) 1e6) :latency_ms (stats (map second rs))})))
(defn parallel-reads [db variant label threads seconds]
  (let [c (connect db) v (d/db c) cache (caches v variant)]
    (warm v variant cache 10000)
    (let [pool (Executors/newFixedThreadPool threads) u (usage) start (System/nanoTime) end (+ start (long (* seconds 1e9)))
          fs (mapv (fn [k] (.submit pool ^Callable
                     (fn [] (let [rng (Random. (+ 900 k)) b (cpu)]
                       (loop [n 0 bytes 0]
                         (if (< (System/nanoTime) end)
                           (let [[^bytes bs _ _] (pull-world v variant cache (own-id (.nextInt rng 10000) 0))]
                             (recur (inc n) (+ bytes (alength bs))))
                           [n bytes (- (cpu) b)])))))) (range threads))
          rs (mapv #(.get ^java.util.concurrent.Future %) fs) elapsed (/ (- (System/nanoTime) start) 1e9)
          cp (/ (- (usage) u) 1e6) n (reduce + (map first rs))]
      (.shutdown pool)
      (emit {:label label :threads threads :pulls n :wall_s elapsed :container_cpu_s cp
             :pulls_per_s (/ n elapsed) :pulls_per_container_cpu_s (/ n cp) :worker_results rs}))))
(defn verify-variants [db]
  (let [v (d/db (connect db)) b (caches v "b") c (caches v "c")]
    (dotimes [i 10000]
      (let [[^bytes x nx ex] (pull-world v "a" nil (own-id i 0))
            [^bytes y ny ey] (pull-world v "b" b (own-id i 0))
            [^bytes z nz ez] (pull-world v "c" c (own-id i 0))]
        (when-not (and (Arrays/equals x y) (Arrays/equals x z) (= nx ny nz) (= ex ey ez)
                        (= nx (+ (cond (< (mod i 20) 8) 28 (< (mod i 20) 15) 40 :else 50)
                                 12 (* 5 (nth reqs (account i)))))
                        (= ex (+ 15 (nth reqs (account i))))
                        (= (alength x) (inc (* 251 nx))))
          (throw (ex-info "variant output mismatch" {:subject i})))))
    (emit {:equivalent_subjects 10000 :basis (d/basis-t v)})))
(defn reader-load [db label]
  (let [c (connect db) v (d/db c) cache (caches v "b") pool (Executors/newFixedThreadPool 8)]
    (warm v "b" cache 10000)
    (spit (str "/evidence/" label "-reader-ready") "ready")
    (while (not (.exists (io/file (str "/evidence/" label "-go")))) (Thread/sleep 5))
    (let [u (usage) start (System/nanoTime)
          fs (mapv (fn [k] (.submit pool ^Callable
            (fn [] (let [rng (Random. (+ 600 k)) b (cpu)]
              (loop [n 0]
                (if (.exists (io/file (str "/evidence/" label "-done"))) [n (- (cpu) b)]
                  (do (pull-world v "b" cache (own-id (.nextInt rng 10000) 0)) (recur (inc n))))))))) (range 8))
          rs (mapv #(.get ^java.util.concurrent.Future %) fs) elapsed (/ (- (System/nanoTime) start) 1e9)
          cp (/ (- (usage) u) 1e6) n (reduce + (map first rs))]
      (.shutdown pool)
      (emit {:label label :reader_pulls n :reader_wall_s elapsed :reader_container_cpu_s cp
             :reader_pulls_per_s (/ n elapsed) :reader_pulls_per_cpu_s (/ n cp) :worker_results rs}))))
(defn epoch-ns [] (let [^Instant x (Instant/now)] (+ (* (.getEpochSecond x) 1000000000) (.getNano x))))
(defn feed-reader [db label count]
  (let [c (connect db) q (d/tx-report-queue c) before (d/basis-t (d/db c)) attr (d/entid (d/db c) :f/id)]
    (spit (str "/evidence/" label "-ready") "ready")
    (with-open [^BufferedWriter w (io/writer (str "/evidence/" label "-seen.csv"))]
      (.write w "marker,seen_epoch_ns,t\n") (.flush w)
      (loop [n 0]
        (when (< n count)
          (let [r (.poll ^java.util.concurrent.BlockingQueue q 180 TimeUnit/SECONDS)]
            (when-not r (throw (ex-info "feed timed out" {:seen n})))
            (let [now (epoch-ns) markers (filter #(and (:added %) (= attr (:a %)) (str/starts-with? (:v %) label)) (:tx-data r))]
              (doseq [x markers] (.write w (str (:v x) "," now "," (d/basis-t (:db-after r)) "\n"))) (.flush w)
              (recur (+ n (clojure.core/count markers))))))))
    (let [v (d/db c) t (d/basis-t v)]
      (dotimes [_ 200] @(d/sync c t))
      (let [rs (mapv (fn [_] (let [s (System/nanoTime) r (deref (d/sync c t) 1000 :timeout)]
                               (when (= r :timeout) (throw (ex-info "local sync timed out" {})))
                               (/ (- (System/nanoTime) s) 1e6))) (range 2000))]
        (save-csv (str label "-sync.csv") "latency_ms" (map vector rs))
        (emit {:label label :basis_before before :basis_after_without_sync t :sync_already_seen_ms (stats rs)})))))
(defn marker-writer [db label count rate]
  (let [c (connect db) _ (when (pos? rate) (dotimes [_ 200] (commit-tx c 40 "mix"))) start (+ (System/nanoTime) 100000000)]
    (with-open [^BufferedWriter w (io/writer (str "/evidence/" label "-ack.csv"))]
      (.write w "marker,ack_epoch_ns\n") (.flush w)
      (dotimes [i count]
        (when (pos? rate) (sleep-to (+ start (long (* i (/ 1e9 rate))))))
        (let [marker (str label "-" i)]
          @(d/transact c [{:f/id marker}])
          (.write w (str marker "," (epoch-ns) "\n")) (.flush w))))
    (emit {:label label :acknowledged count})))
(defn check-markers [db label]
  (let [v (d/db (connect db)) markers (map #(first (str/split % #",")) (rest (str/split-lines (slurp (str "/evidence/" label "-ack.csv")))))
        missing (filter #(nil? (d/entid v [:f/id %])) markers)]
    (emit {:label label :acknowledged (count markers) :missing (count missing) :missing_markers (vec missing) :basis (d/basis-t v)})))
(defn history [db]
  (let [c (connect db) t0 (d/basis-t (d/db c))]
    (doseq [round (range 1 11)]
      (doseq [batch (partition-all 250 (range 1000))]
        (let [v (d/db c) datoms (mapcat (fn [i]
                   (mapcat (fn [k]
                      (let [id (own-id i k) eid (d/entid v [:e/id id]) old (:v (first (d/datoms v :eavt eid :e/row)))
                            [_ _ _ ref] (decode-row old) new (row (str id "/history") ref round)]
                        [[:db/retract eid :e/row old] [:db/add eid :e/row new]])) [0 2])) batch)]
          @(d/transact c (vec datoms))))
      (when (#{1 3 10} round)
        (let [v (d/db c) cache (caches v "b")]
          (read-run v "b" cache (str "q3-current-" round) 1000 10000)
          (read-run (d/as-of v t0) "b" cache (str "q3-asof-" round) 1000 10000))))
    (let [v (d/db c) target (d/basis-t v) a (System/nanoTime)]
      (emit {:request_index (d/request-index c) :target target})
      @(d/sync-index c target)
      (emit {:index_wait_s (/ (- (System/nanoTime) a) 1e9)})
      (let [v (d/db c) cache (caches v "b")]
        (read-run v "b" cache "q3-current-indexed" 1000 10000)
        (read-run (d/as-of v t0) "b" cache "q3-asof-indexed" 1000 10000)))))
(defn -main [& args]
  (try
    (let [[cmd db & xs] args]
      (case cmd
        "init" (do (init db) (emit {:initialized db}))
        "seed" (seed db)
        "q1-closed" (do (doseq [n [12 40 100 260 600]] (closed db (str "q1-mix-" n) n "mix" 200 1000)) (closed db "q1-rows-40" 40 "rows" 200 1000) (closed db "q1-fn-40" 40 "fn" 200 1000))
        "closed" (let [[label n mode warm samples] xs] (closed db label (parse-long n) mode (parse-long warm) (parse-long samples)))
        "open" (let [[label n rate seconds] xs] (open-loop db label (parse-long n) (parse-double rate) (parse-double seconds)))
        "read" (apply reads db xs)
        "cold" (cold db)
        "verify" (verify-variants db)
        "parallel" (let [[variant label threads seconds] xs] (parallel-reads db variant label (parse-long threads) (parse-double seconds)))
        "feed" (let [[label count] xs] (feed-reader db label (parse-long count)))
        "markers" (let [[label count rate] xs] (marker-writer db label (parse-long count) (parse-double rate)))
        "check" (apply check-markers db xs)
        "load" (apply reader-load db xs)
        "history" (history db)))
    (shutdown-agents) (System/exit 0)
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 1))))
