(ns triplex.prep1.observe
  (:require [clojure.data.json :as json]
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
(def diagnostic-events (ArrayBlockingQueue. 16384))
(def ^ThreadMXBean cpu-bean (ManagementFactory/getThreadMXBean))
(def ^:dynamic *profile* nil)
(defn cpu [] (.getCurrentThreadCpuTime cpu-bean))
(defn retain! [prefix event]
  (when-not (.offer diagnostic-events [prefix (assoc event :attempt attempt)])
    (.incrementAndGet dropped)))

(defn portion! [profile read? check member f]
  (let [start (System/nanoTime) before (cpu)
        stats (when read? (io/throw-if-ex! (io/with-io-stats f {:io-context check :api :guard-section})))
        value (if read? (:ret stats) (f))
        tcpu (- (cpu) before) end (System/nanoTime)]
    (vswap! profile update :checks conj
            {:check check :member member :start start :end end :cpuNs tcpu :io (:io-stats stats)})
    value))

(defn profile-guard [snapshot witness ops f]
  ;; [DX-PREP1] Why: the launcher must initialize the transactor before loading the Peer API.
  ;; Rejected: requiring datomic.api when the observer is preloaded (initializes Peer mode first).
  (let [basis-t (requiring-resolve 'datomic.api/basis-t)
        entid (requiring-resolve 'datomic.api/entid)
        profile (or *profile* (volatile! {:checks []}))
        read? (= "reads" (:profile witness))
        operation (some #(when (and (map? %) (= "datomic.tx" (:db/id %)))
                           (:triplex.tx/operation-id %)) ops)]
    (vswap! profile assoc :scope (get (into {} (:flags witness)) :triplex.scope/key)
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
                                      (map-indexed (fn [i value] [[a value] [key i]]) (keep #(when (map? %) (get % attr)) ops)))))
                          [[:triplex.claim/command-id :claim] [:triplex.tx/operation-id :operation]]))
    (let [start (System/nanoTime) tcpu (cpu)
          result (f #(portion! profile read? %1 %2 %3))
          cpu-ns (- (cpu) tcpu) end (System/nanoTime)]
      (vswap! profile assoc :start start :end end :cpuNs cpu-ns)
      (when-not *profile* (retain! "PREP1_GUARD" (dissoc @profile :validators)))
      result)))

(defn proc-stat [path]
  ;; [DX-PREP1] Why: Linux PSI files support direct reads but no available-byte ioctl.
  ;; Rejected: slurp through BufferedInputStream (the available-byte probe fails with EINVAL).
  (with-open [input (FileInputStream. ^String path)]
    (let [buffer (byte-array 4096)
          n (.read input buffer)]
      (assert (and (pos? n) (= -1 (.read input))))
      (into {} (map #(str/split % #" " 2))
            (str/split-lines (String. buffer 0 n StandardCharsets/US_ASCII))))))

(when (#{"profile" "cheap"} mode)
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
            result (append log cluster block)
            end (System/nanoTime)]
        (.set appended {:bytes sizes :start start :end end})
        result))))

(alter-var-root #'tx/transactions-completed!
  (fn [complete]
    (fn [metadata]
      (let [append (.get appended)
            thread (.getName (Thread/currentThread))
            db (second (re-matches #"writer-(.+)-[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}" thread))]
        (.remove appended)
        (when (and db append)
          (let [members (mapv (fn [m]
                                (let [m (if (seq? m) (apply hash-map (next m)) m)]
                                  (select-keys m [:t :read-at :started-at :applied-at :datom-count])))
                              metadata)
                event (assoc append :attempt attempt :db db :members members)]
            (when-not (.offer pending event) (.incrementAndGet dropped))))
        (complete metadata)))))

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
      (flush))))
