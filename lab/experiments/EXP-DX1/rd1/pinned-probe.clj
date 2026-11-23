;; [DX-RD2] Why: measure where a pinned read's time goes on a real database by calling the gateway's own
;; `storage/read-rows` in a peer JVM shaped like the reader (one core, same heap and object cache), with Datomic's
;; public io-stats around every read and process CPU around every arm.
;; Rejected: inferring storage against compute from ladder throughput (one read permit hides the difference).
;;
;; Usage, inside a container that has the Datomic peer classpath and the gateway source on DATOMIC_EXT_CLASSPATH:
;;   java ... -cp "$(bin/classpath)" clojure.main pinned-probe.clj CONFIG.json OUT.ndjson
;; CONFIG: {"uriTemplate": "datomic:sql://{db}?jdbc:...", "db": "s2-..." (or "dbContains": SCOPE), "pin": 87002, "validAt": 0, "attribute": ":task/field-0",
;;          "subjects": [{"entity": "...", "account": 0, "subject": 7919}, ...], "arm": 600, "threads": 16,
;;          "concurrentSeconds": 60, "recentBack": 1000}
;; Each arm uses its own subjects (taken in order), so no arm warms the next one's segments, except "pinned-repeat".
(require '[datomic.api :as d] '[clojure.data.json :as json] '[triplex.gateway.storage :as storage]
         '[datomic.measure.io-stats :as io-stats])
(import '[java.lang.management ManagementFactory] '[java.util.concurrent Executors TimeUnit]
        '[java.util.concurrent.atomic AtomicInteger])

(let [[config-file out-file] *command-line-args*
      config (json/read-str (slurp config-file))
      out (java.io.FileWriter. ^String out-file true)
      emit (fn [m] (locking out (.write out (str (json/write-str m) "\n")) (.flush out)))
      threads (ManagementFactory/getThreadMXBean)
      os (ManagementFactory/getOperatingSystemMXBean)
      process-cpu #(.getProcessCpuTime ^com.sun.management.OperatingSystemMXBean os)
      gc-ms #(reduce + (map (fn [b] (.getCollectionTime ^java.lang.management.GarbageCollectorMXBean b))
                            (ManagementFactory/getGarbageCollectorMXBeans)))
      template (get config "uriTemplate")
      ;; [DX-RD2] Why: the Mac gate knows only its scope text; the server passes the exact database name.
      name (or (get config "db")
               (let [found (filter #(.contains (String. (.decode (java.util.Base64/getUrlDecoder) (subs % 3)) "UTF-8")
                                               ^String (get config "dbContains"))
                                   (filter #(.startsWith ^String % "s2-")
                                           (d/get-database-names (clojure.string/replace template "{db}" "*"))))]
                 (assert (= 1 (count found)) (str "Expected one database for the gate scope: " (vec found)))
                 (first found)))
      pin (long (get config "pin")) attribute (get config "attribute")
      valid-at (get config "validAt") arm-size (long (get config "arm" 600))
      subjects (vec (get config "subjects"))
      started (System/nanoTime)
      conn (d/connect (clojure.string/replace template "{db}" name))
      connect-ms (/ (- (System/nanoTime) started) 1e6)
      db (d/db conn)
      head (long (storage/head-position name db))
      recent-pin (max pin (- head (long (get config "recentBack" 1000))))
      rev-a (d/entid db :triplex.entity/rev)
      ;; Current revision: the position of the last save that changed this owner (AGE1 and the product writers set it).
      revision (fn [entity] (when-let [e (d/entid db [:triplex.entity/id entity])]
                              (:v (first (d/datoms db :eavt e rev-a)))))
      read (fn [p entity]
             (storage/read-rows name db {"entityIds" [entity] "pattern" {"attribute" attribute}
                                         "basis" {"recordedPosition" p "validAt" valid-at}}))
      value-of (fn [result] (vec (sort-by #(get % "id") (:rows result))))
      measured (fn [arm f entity extra]
                 (let [cpu0 (.getCurrentThreadCpuTime threads) t0 (System/nanoTime)
                       tid (.getId (Thread/currentThread))
                       alloc0 (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid)
                       r (io-stats/throw-if-ex! (io-stats/with-io-stats f {:io-context (keyword "rd2" arm) :api :read-rows}))
                       wall (/ (- (System/nanoTime) t0) 1e6) cpu (/ (- (.getCurrentThreadCpuTime threads) cpu0) 1e6)]
                   (emit (merge {:kind "read" :arm arm :entity entity :wallMs wall :threadCpuMs cpu
                                 :allocMB (/ (- (.getThreadAllocatedBytes ^com.sun.management.ThreadMXBean threads tid) alloc0) 1048576.0)
                                 :rows (count (:rows (:ret r))) :route (:route (:ret r)) :io (:reads (:io-stats r))}
                                extra))
                   (:ret r)))
      arm! (fn [arm people body]
             (let [cpu0 (process-cpu) gc0 (gc-ms) t0 (System/nanoTime)]
               (doseq [s people] (body s))
               (let [wall (/ (- (System/nanoTime) t0) 1e6)]
                 (emit {:kind "arm" :arm arm :reads (count people) :wallMs wall
                        :processCpuMs (/ (- (process-cpu) cpu0) 1e6) :gcMs (- (gc-ms) gc0)}))))
      edited? (fn [entity] (let [r (revision entity)] {:revision r :editedAfterPin (boolean (and r (> r pin)))}))
      slice (fn [i] (subvec subjects (min (count subjects) (* i arm-size)) (min (count subjects) (* (inc i) arm-size))))]
  (emit {:kind "start" :db name :pin pin :head head :recentPin recent-pin :connectMs connect-ms
         :objectCacheMax (System/getProperty "datomic.objectCacheMax") :processors (.availableProcessors (Runtime/getRuntime))
         :maxHeap (.maxMemory (Runtime/getRuntime)) :basisT (d/basis-t db) :subjects (count subjects)})
  ;; 1. The ladder's read, cold: the gateway's route at the pin.
  (arm! "pinned" (slice 0) (fn [s] (let [e (get s "entity")] (measured "pinned" #(read pin e) e (edited? e)))))
  ;; 2. The same people again: storage-bound reads become cache hits; compute-bound reads stay slow.
  (arm! "pinned-repeat" (slice 0) (fn [s] (let [e (get s "entity")] (measured "pinned-repeat" #(read pin e) e (edited? e)))))
  ;; 3. Current reads (pin = head), new people.
  (arm! "current" (slice 1) (fn [s] (let [e (get s "entity")] (measured "current" #(read head e) e (edited? e)))))
  ;; 4. A pin near the head, new people: does the cost depend on the distance to the head?
  (arm! "pinned-recent" (slice 2) (fn [s] (let [e (get s "entity")] (measured "pinned-recent" #(read recent-pin e) e (edited? e)))))
  ;; 5. Revision short-cut, new people: unchanged since the pin, answer from the current database. Then check
  ;;    exactness against the product's as-of route for the same person (untimed).
  (let [mismatches (AtomicInteger. 0) shortcut (AtomicInteger. 0) empty (AtomicInteger. 0)]
    (arm! "shortcut" (slice 3)
          (fn [s] (let [e (get s "entity") ed (edited? e)
                        fast? (and (:revision ed) (<= (:revision ed) pin))
                        got (measured "shortcut" #(read (if fast? head pin) e) e (assoc ed :shortcut fast?))]
                    (when fast? (.incrementAndGet shortcut))
                    (when (empty? (:rows got)) (.incrementAndGet empty))
                    (when-not (= (value-of got) (value-of (read pin e))) (.incrementAndGet mismatches)))))
    (emit {:kind "shortcut-check" :reads (count (slice 3)) :answeredFromCurrent (.get shortcut) :mismatches (.get mismatches)
           :emptyAnswers (.get empty)}))
  ;; 6. Each new person read twice in a row: a second read that is fast means the first read's cost was loading
  ;;    and decoding what it needed; a second read as slow as the first means work the cache cannot remove.
  (arm! "pinned-twice" (slice 4)
        (fn [s] (let [e (get s "entity") ed (edited? e)]
                  (measured "pinned-twice" #(read pin e) e (assoc ed :second false))
                  (measured "pinned-twice" #(read pin e) e (assoc ed :second true)))))
  ;; 7. Concurrency on the same one core: `threads` readers, as TX2_READ_PERMITS would allow, new people.
  (let [n (long (get config "threads" 16)) seconds (long (get config "concurrentSeconds" 60))
        pool (Executors/newFixedThreadPool n)
        people (subvec subjects (min (count subjects) (* 5 arm-size)) (min (count subjects) (+ (* 5 arm-size) 25000)))
        next (AtomicInteger. 0) done (AtomicInteger. 0) deadline (+ (System/nanoTime) (* seconds 1000000000))
        cpu0 (process-cpu) gc0 (gc-ms) t0 (System/nanoTime)]
    (dotimes [_ n]
      (.submit pool ^Runnable (fn [] (loop []
                                       (let [i (.getAndIncrement next)]
                                         (when (and (< (System/nanoTime) deadline) (< i (count people)))
                                           (let [e (get (nth people i) "entity")]
                                             (measured "concurrent" #(read pin e) e {:threads n}) (.incrementAndGet done))
                                           (recur)))))))
    (.shutdown pool) (.awaitTermination pool (+ seconds 120) TimeUnit/SECONDS)
    (let [wall (/ (- (System/nanoTime) t0) 1e6)]
      (emit {:kind "arm" :arm "concurrent" :threads n :reads (.get done) :wallMs wall :readsPerSecond (/ (.get done) (/ wall 1000))
             :processCpuMs (/ (- (process-cpu) cpu0) 1e6) :gcMs (- (gc-ms) gc0)})))
  (emit {:kind "end" :elapsedMs (/ (- (System/nanoTime) started) 1e6)})
  (.close out)
  (shutdown-agents)
  (System/exit 0))
