(ns triplex.prep1.observe
  (:require [clojure.data.json :as json]
            [clojure.java.io :as file]
            [clojure.string :as str]
            [datomic.db :as db]
            [datomic.io :as dio]
            [datomic.log :as log]
            [datomic.measure.io-stats :as io]
            [datomic.transaction :as tx])
  (:import [datomic Datom]
           [java.io FileInputStream]
           [java.lang.management ManagementFactory ThreadMXBean]
           [java.nio.charset StandardCharsets]
           [java.util.concurrent ArrayBlockingQueue]
           [java.util.concurrent.atomic AtomicLong]))

;; [DX-PREP1] Why: the pinned writer calls append and then reports the same block's transaction metadata.
;; Rejected: attributing all non-apply peer time or cluster-wide WAL time to the log write.
(def pending (ArrayBlockingQueue. 16384))
(def dropped (AtomicLong. 0))
(def appended (ThreadLocal.))
(def attempt (System/getenv "PREP1_ATTEMPT"))
(def mode (System/getenv "PREP1_MODE"))
(def streaming? (= mode "subject-server"))
(def lookup-every (if-let [n (System/getenv "PREP1_LOOKUP_EVERY")] (Long/parseLong n) 0))
(assert (<= 0 lookup-every 4096))
(def lookup-ordinal (AtomicLong. 0))
(def sampled-lookups? (and (pos? lookup-every) (or streaming? (= mode "rolling-recovery"))))
(def rolling-fixture (when (= mode "rolling-recovery") (file/file (System/getenv "PREP1_ROLLING_FAIL_PATH"))))
(def diagnostic-events (ArrayBlockingQueue. 16384))
(def ^ThreadMXBean cpu-bean (ManagementFactory/getThreadMXBean))
(def ^:dynamic *profile* nil)
(defn cpu [] (.getCurrentThreadCpuTime cpu-bean))
(defn writer-database []
  (second (re-matches #"writer-(.+)-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}" (.getName (Thread/currentThread)))))
(defn retain! [prefix event]
  (when-not (.offer diagnostic-events [prefix (assoc event :attempt attempt)])
    (.incrementAndGet dropped)))

(defn portion! [profile read? check member f]
  (let [start (System/nanoTime) before (cpu)
        stats (when read?
                (io/throw-if-ex!
                  (io/with-io-stats f {:io-context (keyword "prep1" (name check)) :api :guard-section})))
        value (if read? (:ret stats) (f))
        tcpu (- (cpu) before) end (System/nanoTime)]
    (vswap! profile update :checks conj
            {:check check :member member :start start :end end :cpuNs tcpu :io (:io-stats stats)})
    value))

(defn measure-guard [snapshot witness ops f]
  ;; [DX-PREP1] Why: the launcher must initialize the transactor before loading the Peer API.
  ;; Rejected: requiring datomic.api when the observer is preloaded (initializes Peer mode first).
  (let [basis-t (requiring-resolve 'datomic.api/basis-t)
        entid (requiring-resolve 'datomic.api/entid)
        profile (or *profile* (volatile! {:checks []}))
        read? (= "reads" (:profile witness))
        operation (some #(when (= "datomic.tx" (get % :db/id)) (get % :triplex.tx/operation-id)) ops)
        scope (some (fn [[a value]] (when (= a :triplex.scope/key) value)) (:flags witness))]
    ;; [DX-PREP1] Why: transaction function parameters can contain Java collections after transport.
    ;; Rejected: destructuring the outer map correctly but requiring Clojure vectors for its entries.
    (vswap! profile assoc :scope scope
            :operation operation :basis (basis-t snapshot) :mode (:profile witness)
            :members (count (:members witness))
            :witnessCounts {:flags (count (:flags witness))
                            :members (mapv (fn [m] {:revisions (count (:entities m))
                                                   :retirements (count (:retirements m))
                                                   :history (count (:new-prefixes m))})
                                           (:members witness))}
            :validators (into {}
                          (mapcat (fn [[attr key]]
                                    (let [a (entid snapshot attr)]
                                      (map-indexed (fn [i value] [[a value] [key i]]) (keep #(get % attr) ops)))))
                          [[:triplex.claim/command-id :claim] [:triplex.tx/operation-id :operation]]))
    (let [start (System/nanoTime) tcpu (cpu)
          result (f #(portion! profile read? %1 %2 %3))
          cpu-ns (- (cpu) tcpu) end (System/nanoTime)]
      (vswap! profile assoc :start start :end end :cpuNs cpu-ns)
      (when-not *profile* (retain! "PREP1_GUARD" (dissoc @profile :validators)))
      result)))

(defn profile-guard [snapshot witness ops f]
  (try (measure-guard snapshot witness ops f)
       (catch Throwable failure
         (retain! "PREP1_PROFILE_ERROR"
                  {:mode (:profile witness)
                   :causes (mapv #(select-keys % [:type :message :at]) (:via (Throwable->map failure)))})
         (throw failure))))

(defn proc-stat [path]
  ;; [DX-PREP1] Why: Linux PSI files support direct reads but no available-byte ioctl.
  ;; Rejected: slurp through BufferedInputStream (the available-byte probe fails with EINVAL).
  (with-open [input (FileInputStream. ^String path)]
    (let [buffer (byte-array 4096)
          n (.read input buffer)]
      (assert (and (pos? n) (= -1 (.read input))))
      (into {} (map #(str/split % #" " 2))
            (str/split-lines (String. buffer 0 n StandardCharsets/US_ASCII))))))

(when (#{"profile" "cheap" "census" "subject-profile" "lookup-profile"} mode)
  ;; [DX-PREP1] Why: join samples to each native apply on the same VM monotonic clock.
  ;; Rejected: applying a whole-run CPU average to every group.
  (doto (Thread.
          (fn []
            (loop []
              (retain! "PREP1_CPU" {:at (System/nanoTime) :pressure (proc-stat "/proc/pressure/cpu")
                                    :cgroup (proc-stat "/sys/fs/cgroup/cpu.stat")})
              (Thread/sleep 200)
              (recur))))
    (.setDaemon true)
    (.start)))

(def ^:dynamic *lookups* nil)
(def ^:dynamic *inside-lookup* false)
(def ^:dynamic *lookup-count* nil)
(def ^:dynamic *outside-reads* nil)
(def lookup-limit 1024)

(defn lookup! [check f]
  (if (and *lookups* (not *inside-lookup*) (<= (swap! *lookup-count* inc) lookup-limit))
    (let [start (System/nanoTime)
          sample (binding [*inside-lookup* true]
                   (io/throw-if-ex!
                     (io/with-io-stats f {:io-context :prep1/native-lookup :api :native-lookup})))
          elapsed (- (System/nanoTime) start)]
      (swap! *lookups* update check
              (fn [{:keys [calls wallNs reads]}]
                {:calls (inc (or calls 0)) :wallNs (+ (or wallNs 0) elapsed)
                 :reads (merge-with + reads (get-in sample [:io-stats :reads]))}))
      (:ret sample))
    (f)))

(defn wrap-lookup! [v classify realize]
  (alter-var-root v
    (fn [original]
      (fn [& args]
        (if (and *lookups* (not *inside-lookup*))
          (lookup! (apply classify args) #(realize (apply original args)))
          (apply original args))))))

(defn instrument-lookup-api! []
  ;; [DX-PREP1] Why: a seek can defer its first storage fetch until its first result.
  ;; Rejected: timing only creation of an unrealized iterator or eagerly walking a whole range.
  (doseq [op ['datoms 'index-range 'rseek-datoms]]
    (wrap-lookup! (requiring-resolve (symbol "datomic.api" (name op)))
      (fn [_ & args]
        (let [[index key attribute] args]
          (if (= 'index-range op) (str "api/range :avet " index)
            (str "api/" op " " index " " (if (= :eavt index) attribute key)))))
      (fn [rows]
        ;; [DX-PREP1] Why: an Iterable can allocate a fresh seek per traversal.
        ;; Rejected: discarding the realized sequence and observing a duplicate seek.
        (let [result (seq rows)]
          (when result (first result))
          result))))
  (wrap-lookup! (requiring-resolve 'datomic.api/entid)
    (fn [_ k] (if (instance? java.util.List k)
                (str "api/entid :avet " (first k))
                (str "api/entid schema " (if (and (keyword? k) (= "triplex.subject" (namespace k))) "subject-fn" k))))
    identity)
  (wrap-lookup! (requiring-resolve 'datomic.builtins/compare-and-swap)
    (constantly "native/cas :eavt") identity))

(defn outside-read! [index counter n]
  (when (and *outside-reads* (not *inside-lookup*) (= :sql counter))
    (let [frames (into [] (comp (map #(.getClassName ^StackTraceElement %))
                                (filter #(re-find #"^datomic\.(?:db|builtins|index|iter)\$" %))
                                (take 6)) (.getStackTrace (Thread/currentThread)))]
      (swap! *outside-reads* update (str @index " " (str/join " / " frames)) (fnil + 0) n))))

(when (or (= "lookup-profile" mode) sampled-lookups?)
  ;; [DX-PREP1] Why: shared native prefetch can load one leaf for several keys. Measure its real I/O once.
  ;; Rejected: running extra point seeks to split a batch's shared storage reads across individual ids.
  (doseq [op '[prefetch-identity prefetch-redundancy+uniqueness get-hook]]
    (wrap-lookup! (ns-resolve 'datomic.db op) (constantly (str "native/" op)) identity))
  (doseq [[op idx attr-offset] [['find-avet :avet 0] ['find-aevt :aevt 0] ['find-eavt :eavt 1]]]
    (wrap-lookup! (ns-resolve 'datomic.db op)
      (fn [snapshot & args]
        (let [a (nth args attr-offset nil)
              ident (when (number? a) ((requiring-resolve 'datomic.api/ident) snapshot a))]
          (str "native/" op " " idx " " (or ident a "entity"))))
      identity))
  (let [index (ns-resolve 'datomic.measure.io-stats '*io-index*)]
    (alter-var-root #'io/inc!
      (fn [inc-io!]
        (fn
          ;; [DX-PREP1] Why: key remaining physical misses on the calling engine frame.
          ;; Rejected: assigning all unmatched I/O to the last authored check.
          ([counter]
           (outside-read! index counter 1)
           (inc-io! counter))
          ([counter ^long n]
           (outside-read! index counter n)
           (.invokePrim ^clojure.lang.IFn$OLO inc-io! counter n))))))
  (wrap-lookup! (ns-resolve 'datomic.db 'resolve-lookup-ref)
    (constantly "native/resolve-lookup-ref :avet") identity)
  (alter-var-root (ns-resolve 'datomic.db 'create-unique-value-validator)
    (fn [factory]
      (fn [snapshot]
        (let [validate (factory snapshot)]
          (if-not *lookups*
            validate
            (let [ident (requiring-resolve 'datomic.api/ident)]
              (fn [^Datom datom]
                (let [attr (ident snapshot (.a datom))]
                  (if (#{:triplex.entity/id :triplex.tx/operation-id :triplex.claim/command-id
                         :triplex.tx/position :triplex.group/position :triplex.scope/key :triplex.scope/bootstrap} attr)
                    (lookup! (str "native/unique :avet " attr) #(validate datom))
                    (validate datom))))))))))
  (let [api (delay
              (retain! "PREP1_NATIVE_PREFETCH"
                {:setting (System/getProperty "datomic.prefetchProbes")
                 :enabled (boolean ((requiring-resolve 'datomic.config/prefetch-enabled?)))
                 :processors (.availableProcessors (Runtime/getRuntime))})
              (instrument-lookup-api!))]
    (alter-var-root #'db/with-tx
      (fn [apply-tx]
        (fn [snapshot dispatcher data]
          ;; [DX-PREP1] Why: the apply and append can run on different native threads.
          ;; Rejected: requiring the appender's thread name on an apply worker. Join by t and clock containment.
          @api
          (if (and sampled-lookups? (not (zero? (mod (.getAndIncrement lookup-ordinal) lookup-every))))
            (apply-tx snapshot dispatcher data)
            (binding [*lookups* (atom {}) *lookup-count* (atom 0) *outside-reads* (atom {})]
            (let [basis-t (requiring-resolve 'datomic.api/basis-t)
                  start (System/nanoTime) before (cpu)
                  sample (io/throw-if-ex!
                           (io/with-io-stats #(apply-tx snapshot dispatcher data)
                             {:io-context :prep1/native-apply :api :native-apply}))
                  end (System/nanoTime) cpu-ns (- (cpu) before)
                  result (:ret sample)]
              (when-let [after (:db-after result)]
                (retain! "PREP1_LOOKUPS" {:db (writer-database) :t (str (basis-t after))
                                          :beforeT (str (basis-t snapshot)) :sampleEvery lookup-every
                                          :lookupCount @*lookup-count* :lookupLimit lookup-limit
                                          :start start :end end :cpuNs cpu-ns :io (:io-stats sample)
                                          :lookups @*lookups* :outsideSql @*outside-reads*}))
              result))))))))

(when (= "subject-profile" mode)
  ;; [DX-PREP1] Why: sample the native transaction application and bind its CPU time to db-after.
  ;; Rejected: attributing process-wide CPU, storage waits or the gateway's speculative apply to this save.
  (alter-var-root #'db/with-tx
    (fn [apply-tx]
      (fn [db dispatcher txdata]
        (let [start (System/nanoTime) before (cpu)
              result (apply-tx db dispatcher txdata)
              end (System/nanoTime) cpu-ns (- (cpu) before)]
          (when-let [database (writer-database)]
            (if-let [after (:db-after result)]
              (let [basis-t (requiring-resolve 'datomic.api/basis-t)]
                (retain! "PREP1_SUBJECT_APPLY" {:db database :t (str (basis-t after))
                                               :start start :end end :cpuNs cpu-ns}))
              (retain! "PREP1_SUBJECT_APPLY_UNBOUND" {:db database :start start :end end})))
          result)))))

(when (#{"profile" "cheap"} mode)
  ;; [DX-PREP1] Why: measure native uniqueness and its shared prefetch, including reads after the authored function returns.
  ;; Rejected: adding duplicate read traffic inside the guard as a proxy for uniqueness.
  (alter-var-root #'db/with-tx
    (fn [apply-tx]
      (fn [& args]
        (binding [*profile* (volatile! {:checks []})]
          (let [result (apply apply-tx args)]
            (when (:mode @*profile*) (retain! "PREP1_GUARD" (dissoc @*profile* :validators)))
            result)))))
  (alter-var-root (ns-resolve 'datomic.db 'prefetch-redundancy+uniqueness)
    (fn [original]
      (fn [& args]
        (if-let [p (and *profile* (:mode @*profile*) *profile*)]
          (portion! p (= "reads" (:mode @p)) :unique-prefetch nil #(apply original args))
          (apply original args)))))
  (alter-var-root (ns-resolve 'datomic.db 'create-unique-value-validator)
    (fn [factory]
      (fn [snapshot]
        (let [validate (factory snapshot)]
          (if-not *profile*
            validate
            (fn [^Datom datom]
              (if-let [[check member] (get (:validators @*profile*) [(.a datom) (.v datom)])]
                (portion! *profile* (= "reads" (:mode @*profile*)) check member #(validate datom))
                (validate datom)))))))))

(alter-var-root #'log/append
  (fn [append]
    (fn [log cluster block]
      (let [sizes (mapv #(dio/remaining (:fressianed-tx %)) block)
            start (System/nanoTime)
            ;; [DX-PREP1] Why: deny the real append before storage for this fresh fixture scope.
            ;; Rejected: manufacturing a transport error after storage may have committed the transaction.
            _ (when (and rolling-fixture (.isFile rolling-fixture)
                         (= (writer-database) (slurp rolling-fixture)))
                (let [marker (file/file (str rolling-fixture ".observed"))]
                  (when-not (.isFile marker)
                    (spit marker (str (writer-database) "\n"))
                    (println "PREP1_ROLLING_DENIED" (json/write-str {:attempt attempt :db (writer-database)}))))
                (throw (java.io.IOException. "PREP1 rolling fixture denied durable append")))
            result (append log cluster block)
            end (System/nanoTime)]
        (.set appended {:bytes sizes :start start :end end})
        result))))

(alter-var-root #'tx/transactions-completed!
  (fn [complete]
    (fn [metadata]
      (let [append (.get appended)
            db (writer-database)]
        (.remove appended)
        (when (and db append)
          (let [members (mapv (fn [m]
                                (let [m (if (seq? m) (apply hash-map (next m)) m)]
                                  (select-keys m [:t :read-at :started-at :applied-at :datom-count])))
                              metadata)
                event (assoc append :attempt attempt :db db :members members)]
            (when-not (.offer pending event) (.incrementAndGet dropped))))
        (complete metadata)))))

(if streaming?
  (let [stop (atom false)
        drain (Thread.
                (fn []
                  ;; [DX-PREP1] Why: stream the whole arm without blocking the serialized append.
                  ;; Rejected: retaining only the first 16,384 append blocks at shutdown.
                  ;; [DX-W1] Why: a sampled lookup spans the native apply, including the checks after function expansion.
                  ;; Rejected: adding seeks or splitting an actual shared storage fetch across all the probes it served.
                  (with-open [out (file/writer "/trace/prep1-native.ndjson")]
                    (let [lookups (when (pos? lookup-every) (file/writer "/trace/prep1-lookups.ndjson"))]
                      (try
                        (loop []
                          (when lookups
                            (loop []
                              (when-let [[kind event] (.poll diagnostic-events)]
                                (.write lookups (str (json/write-str (assoc event :kind kind)) "\n"))
                                (recur))))
                          (if-let [event (.poll pending 100 java.util.concurrent.TimeUnit/MILLISECONDS)]
                            (do (.write out (str (json/write-str event) "\n")) (recur))
                            (when-not @stop (.flush out) (when lookups (.flush lookups)) (recur))))
                        (let [terminal (str (json/write-str {:attempt attempt :dropped (.get dropped) :end true}) "\n")]
                          (when lookups (.write lookups terminal))
                          (.write out terminal))
                        (finally (when lookups (.close lookups)))))))
                "prep1-native-drain")]
    (.setDaemon drain true)
    (.start drain)
    (.addShutdownHook (Runtime/getRuntime)
      (Thread. (fn [] (reset! stop true) (.join drain 25000)))))
  (.addShutdownHook
    (Runtime/getRuntime)
    (Thread.
      (fn []
      (loop []
        (when-let [event (.poll pending)]
          (println "PREP1_NATIVE" (json/write-str event))
          (recur)))
      (loop []
        (when-let [[prefix event] (.poll diagnostic-events)]
          (println prefix (json/write-str event))
          (recur)))
      (println "PREP1_NATIVE_END" (json/write-str {:attempt attempt :dropped (.get dropped)}))
        (flush)))))
