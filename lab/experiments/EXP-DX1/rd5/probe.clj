;; [DX-RD5] Why: count what a pinned read of a subject the reader does not hold loads, on a toy made cold on purpose (a
;; 32 MB object cache against a toy of several hundred MB), by calling the gateway's own `storage/read-rows` in a peer
;; JVM with Datomic's public io-stats around every read. Counts are exact; times are diagnostic (Mac).
;; Rejected: inferring loads from throughput, and growing the toy instead of shrinking the cache.
;;
;; Usage (inside the gate container, gateway source on DATOMIC_EXT_CLASSPATH, options in the environment and JVM flags):
;;   java ... clojure.main probe.clj CONFIG.json OUT.ndjson LABEL
;; CONFIG: {"uriTemplate": ..., "db": NAME, "pin": P, "validAt": V, "attribute": ":task/field-0",
;;          "subjects": ["acct/.../i9:00000001", ...], "single": 600, "exchanges": 150, "threads": 16,
;;          "seconds": 20, "layout": true, "seed": 7}
(require '[datomic.api :as d] '[clojure.data.json :as json] '[triplex.gateway.storage :as storage]
         '[triplex.gateway.uncached :as uncached] '[triplex.gateway.lean :as lean]
         '[datomic.measure.io-stats :as io-stats])
(import '[java.lang.management ManagementFactory] '[java.util.concurrent Executors TimeUnit]
        '[java.util.concurrent.atomic AtomicInteger AtomicLong] '[java.util Random])

(let [[config-file out-file label] *command-line-args*
      config (json/read-str (slurp config-file))
      out (java.io.FileWriter. ^String out-file true)
      emit (fn [m] (locking out (.write out (str (json/write-str (assoc m :label label)) "\n")) (.flush out)))
      threads (ManagementFactory/getThreadMXBean)
      os (ManagementFactory/getOperatingSystemMXBean)
      process-cpu #(.getProcessCpuTime ^com.sun.management.OperatingSystemMXBean os)
      gc-ms #(reduce + (map (fn [b] (.getCollectionTime ^java.lang.management.GarbageCollectorMXBean b))
                            (ManagementFactory/getGarbageCollectorMXBeans)))
      name (get config "db")
      conn (d/connect (clojure.string/replace (get config "uriTemplate") "{db}" name))
      db (d/db conn)
      pin (long (get config "pin")) attribute (get config "attribute") valid-at (get config "validAt")
      subjects (vec (get config "subjects"))
      rng (Random. (long (+ (get config "seed" 7) (hash label))))
      pick (fn [] (nth subjects (.nextInt rng (count subjects))))
      read (fn [entities] (storage/read-rows name db {"entityIds" (vec entities) "pattern" {"attribute" attribute}
                                                      "basis" {"recordedPosition" pin "validAt" valid-at}}))
      ;; Every storage get of this JVM, read-ahead threads included: PostgreSQL's index fetches on Datomic's table
      ;; (the readers and writers are idle while a probe runs). An idle backend flushes its statistics within 10 s.
      pg-url (get config "pgUrl")
      pg-gets (fn [] (when pg-url
                       (Thread/sleep 11000)
                       (with-open [c (java.sql.DriverManager/getConnection ^String pg-url)
                                   s (.createStatement c)]
                         (.execute s "select pg_stat_clear_snapshot()")
                         (with-open [rs (.executeQuery s "select coalesce(sum(idx_tup_fetch),0) from pg_stat_user_tables where relname = 'datomic_kvs'")]
                           (.next rs) (.getLong rs 1)))))
      totals (atom {})
      add-io! (fn [m] (swap! totals (fn [t] (merge-with + t (into {} (filter (comp number? val) m))))))
      measured (fn [arm entities]
                 (let [cpu0 (.getCurrentThreadCpuTime threads) t0 (System/nanoTime)
                       tid (.getId (Thread/currentThread))
                       alloc0 (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid)
                       r (io-stats/throw-if-ex! (io-stats/with-io-stats #(read entities) {:io-context (keyword "rd5" arm) :api :read-rows}))
                       wall (/ (- (System/nanoTime) t0) 1e6)
                       io (:reads (:io-stats r))]
                   (add-io! io)
                   (emit {:kind "read" :arm arm :subjects (count entities) :wallMs wall
                          :threadCpuMs (/ (- (.getCurrentThreadCpuTime threads) cpu0) 1e6)
                          :allocMB (/ (- (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid) alloc0) 1048576.0)
                          :rows (count (:rows (:ret r))) :io io})
                   (:ret r)))
      arm! (fn [arm n body]
             (reset! totals {})
             (let [g0 (pg-gets) cpu0 (process-cpu) gc0 (gc-ms) t0 (System/nanoTime) subjects-read (body)
                   wall (/ (- (System/nanoTime) t0) 1e6) cpu (/ (- (process-cpu) cpu0) 1e6) gc (- (gc-ms) gc0)]
               (emit {:kind "arm" :arm arm :exchanges n :subjects subjects-read :wallMs wall
                      :processCpuMs cpu :gcMs gc :io @totals :storageGets (when g0 (- (pg-gets) g0))})))]
  (emit {:kind "start" :db name :pin pin :basisT (d/basis-t db) :subjects (count subjects)
         :objectCacheMax (System/getProperty "datomic.objectCacheMax")
         :readAheadPool (System/getProperty "datomic.readAheadPool") :prefetch uncached/prefetch?
         :prefetchThreads uncached/prefetch-threads :permits (System/getenv "TX2_READ_PERMITS")
         :shortcut (System/getenv "TX2_PINNED_SHORTCUT") :filter lean/early-attribute-filter
         :processors (.availableProcessors (Runtime/getRuntime)) :maxHeap (.maxMemory (Runtime/getRuntime))})
  ;; 1. Layout: every entity of the scope in EAVT order, cold, one entity at a time. With read-ahead off, each new load
  ;;    is one more leaf, so loads over the walk count the leaves and give datoms, row bytes and subjects per leaf.
  (when (get config "layout")
    (let [id-a (d/entid db :triplex.entity/id) row-a (d/entid db :triplex.entity/row)
          entities (sort (map :e (d/datoms db :aevt id-a)))
          subject-set (set subjects)
          per (atom []) cpu0 (process-cpu) t0 (System/nanoTime)
          tid (.getId (Thread/currentThread)) g0 (pg-gets)
          alloc0 (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid)
          r (io-stats/with-io-stats
              (fn []
                (doseq [e entities]
                  (let [datoms (vec (d/datoms db :eavt e))
                        rows (filter #(= row-a (:a %)) datoms)
                        id (some #(when (= id-a (:a %)) (:v %)) datoms)]
                    (swap! per conj {:e e :datoms (count datoms) :rows (count rows)
                                     :rowChars (reduce + (map #(count ^String (:v %)) rows))
                                     :subject (contains? subject-set id)}))))
              {:io-context :rd5/layout :api :walk})
          io (:reads (:io-stats r)) leaves (get io :eavt-load 0)
          all @per sub (filter :subject all)
          sum (fn [k xs] (reduce + (map k xs)))]
      (emit {:kind "layout" :entities (count all) :datoms (sum :datoms all) :rows (sum :rows all)
             :rowChars (sum :rowChars all) :eavtLeaves leaves :io io :storageGets (when g0 (- (pg-gets) g0))
             :allocMB (/ (- (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid) alloc0) 1048576.0)
             :processCpuMs (/ (- (process-cpu) cpu0) 1e6) :wallMs (/ (- (System/nanoTime) t0) 1e6)
             :readSubjects (count sub) :readSubjectDatoms (sum :datoms sub) :readSubjectRows (sum :rows sub)
             :readSubjectRowChars (sum :rowChars sub)
             ;; Runs of read subjects next to each other in entity order: how the writer's frames placed them.
             :readSubjectRuns (count (filter (fn [[a b]] (and (:subject b) (not (:subject a)))) (partition 2 1 (cons {} all))))
             :datomsPerLeaf (when (pos? leaves) (/ (double (sum :datoms all)) leaves))
             :rowCharsPerLeaf (when (pos? leaves) (/ (double (sum :rowChars all)) leaves))
             :readSubjectsPerLeaf (when (pos? leaves) (/ (double (count sub)) leaves))})))
  ;; 2. One subject per read, cold (random subjects across the toy; the 32 MB cache holds a small share of it).
  (let [n (long (get config "single" 600))]
    (arm! "single" n (fn [] (dotimes [_ n] (measured "single" [(pick)])) n)))
  ;; 3. Exchanges of eight distinct random subjects, one at a time (the ladder's batch).
  (let [n (long (get config "exchanges" 150))]
    (arm! "batch8" n (fn [] (dotimes [_ n] (measured "batch8" (take 8 (distinct (repeatedly pick))))) (* 8 n))))
  ;; 4. Closed loop: `threads` clients, exchanges of eight, through the gateway's read permits (TX2_READ_PERMITS).
  (let [n (long (get config "threads" 16)) seconds (long (get config "seconds" 20))
        pool (Executors/newFixedThreadPool n) done (AtomicInteger. 0) deadline (+ (System/nanoTime) (* seconds 1000000000))
        local-rng (ThreadLocal/withInitial (reify java.util.function.Supplier (get [_] (Random. (.nextLong rng)))))
        _ (reset! totals {})
        g0 (pg-gets) cpu0 (process-cpu) gc0 (gc-ms) t0 (System/nanoTime)]
    (dotimes [_ n]
      (.submit pool ^Runnable
               (fn [] (let [^Random r (.get local-rng)]
                        (loop []
                          (when (< (System/nanoTime) deadline)
                            (let [entities (take 8 (distinct (repeatedly #(nth subjects (.nextInt r (count subjects))))))
                                  res (io-stats/throw-if-ex! (io-stats/with-io-stats #(read entities) {:io-context :rd5/concurrent :api :read-rows}))]
                              (add-io! (:reads (:io-stats res)))
                              (.incrementAndGet done))
                            (recur)))))))
    (.shutdown pool) (.awaitTermination pool (+ seconds 120) TimeUnit/SECONDS)
    (let [wall (/ (- (System/nanoTime) t0) 1e6) exchanges (.get done) cpu (/ (- (process-cpu) cpu0) 1e6) gc (- (gc-ms) gc0)]
      (emit {:kind "arm" :arm "concurrent" :threads n :exchanges exchanges :subjects (* 8 exchanges) :wallMs wall
             :readsPerSecond (/ (* 8 exchanges) (/ wall 1000)) :processCpuMs cpu
             :gcMs gc :io @totals :storageGets (when g0 (- (pg-gets) g0))})))
  (emit {:kind "end" :prefetchStats (uncached/stats)})
  (.close out)
  (shutdown-agents)
  (System/exit 0))
