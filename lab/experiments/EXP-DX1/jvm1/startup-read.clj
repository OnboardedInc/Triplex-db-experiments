(ns triplex.startup-read
  (:require [clojure.data.json :as json]
            [clojure.java.io :as file])
  (:import [java.io File]
           [java.util Date LinkedHashSet]
           [java.util.concurrent ExecutorService Executors ThreadFactory TimeUnit]
           [java.util.concurrent.atomic AtomicBoolean AtomicInteger]))

;; [DX-JVM1] Why: one bounded read, before admission, of the index leaves that the restart's active set will touch,
;; into this transactor's own object cache (the subject save function reads there). Owner approval 2026-11-23.
;; Rejected: any periodic or background reader after admission, replaying saves, synthetic saves, and a full index
;; sweep (it cannot fit the 60-second restart budget or the object cache at full size).

(def directory (or (System/getenv "TRIPLEX_STARTUP_READ_DIR") (System/getenv "TRIPLEX_TRACE_DIR")))
;; tx (the transactor, whose cache the save function reads) or gw-w (the write peer, which resolves owners)
(def role (or (System/getenv "TRIPLEX_STARTUP_READ_ROLE") "tx"))
(def ^File enabled-file (file/file directory (str "startup-read-" role ".enabled")))
(def ^File request-file (file/file directory (str "startup-read-" role ".request.json")))
(def ^File taken-file (file/file directory (str "startup-read-" role ".request.taken.json")))
(def ^File report-file (file/file directory (str "startup-read-" role ".report.json")))
(def wait-for-request-ms 900000)
(def prefix "tx2-sread-")

(defn- write-json! [^File target value]
  (let [tmp (file/file (.getParentFile target) (str "." (.getName target) ".tmp"))]
    (spit tmp (str (json/write-str value) "\n"))
    (when-not (.renameTo tmp target)
      (throw (ex-info "Could not publish the start-up read report" {:file (str target)})))))

(defn- reader-threads []
  (sort (keep (fn [^Thread t] (let [n (.getName t)] (when (and (.startsWith n prefix) (.isAlive t)) n)))
              (keys (Thread/getAllStackTraces)))))

(defn- api [name] (requiring-resolve (symbol "datomic.api" name)))

(defn- measured [f]
  ;; [DX-JVM1] Why: count storage gets and per-index segment loads with the same io-stats call the gateway uses.
  ;; Rejected: inferring the read from process-wide cache gauges shared with the transactor's own work.
  (let [sample ((requiring-resolve 'datomic.measure.io-stats/throw-if-ex!)
                ((requiring-resolve 'datomic.measure.io-stats/with-io-stats)
                 f {:io-context :triplex/startup-read :api :startup-read}))]
    [(:ret sample) (get-in sample [:io-stats :reads])]))

(defn- loads [reads]
  (reduce-kv (fn [n k v] (if (and (number? v) (.endsWith (name k) "-load")) (+ n (long v)) n)) 0 reads))

(defn- active-owners
  "Owners named by transactions in the last window of the log, most recent first."
  [log db window-ms max-transactions max-owners attrs deadline]
  (let [tx-range (api "tx-range") entity (api "entity") t->tx (api "t->tx") basis-t (api "basis-t")
        newest (.getTime ^Date (:db/txInstant (entity db (t->tx (basis-t db)))))
        start (Date. (- newest (long window-ms)))
        order (LinkedHashSet.)
        scanned (volatile! 0)
        stopped (volatile! nil)]
    ;; The window bounds the scan. The transaction cap and the deadline end it early and are reported.
    (loop [txs (seq (tx-range log start nil))]
      (when-let [{:keys [t data]} (first txs)]
        (cond
          (>= @scanned max-transactions) (vreset! stopped "transaction-cap")
          (>= (System/currentTimeMillis) deadline) (vreset! stopped "time-limit")
          :else
          (let [tx (t->tx t)]
            (vswap! scanned inc)
            (doseq [datom data]
              (let [e (:e datom)]
                (when (and (not= e tx) (contains? attrs (:a datom)))
                  ;; keep the latest touch last
                  (.remove order e)
                  (.add order e))))
            (recur (rest txs))))))
    {:newestTxInstantMs newest :windowStartMs (.getTime start) :transactions @scanned :scanStopped @stopped
     :owners (vec (take max-owners (reverse (vec order))))}))

(defn- read-owner [db e reads-spec]
  (let [datoms (api "datoms")]
    (reduce (fn [n [index attr]]
              (+ n (case index
                     :eavt (count (datoms db :eavt e))
                     :aevt (count (datoms db :aevt attr e))
                     ;; the owner's public ID in AVET, as the write peer resolves it
                     :avet (reduce + 0 (map #(count (datoms db :avet attr (:v %))) (datoms db :eavt e attr))))))
            0 reads-spec)))

(defn- run [request started]
  (let [{:keys [uri attempt windowSeconds maxTransactions maxOwners maxSegments timeLimitMs threads aevt avetId releaseConnection]} request
        deadline (+ started (long timeLimitMs))
        _ (assert (and (string? uri) (string? attempt) (pos? windowSeconds) (pos? maxOwners) (pos? maxSegments)
                       (< 0 timeLimitMs 600000) (<= 1 threads 32)))
        connect (api "connect") db-of (api "db") log-of (api "log") entid (api "entid") release (api "release")
        conn (connect uri)
        connected (System/currentTimeMillis)
        db (db-of conn)
        attr-ids (into {} (keep (fn [a] (when-let [id (entid db (keyword (subs a 1)))] [a id])))
                       [":triplex.entity/row" ":triplex.entity/rev" ":triplex.entity/id" ":triplex.entity/retired"])
        owner-attrs (set (vals (select-keys attr-ids [":triplex.entity/row" ":triplex.entity/rev"])))
        reads-spec (cond-> (into [[:eavt nil]] (keep (fn [a] (when-let [id (attr-ids a)] [:aevt id]))) aevt)
                     avetId (conj [:avet (attr-ids ":triplex.entity/id")]))
        [selection log-reads] (measured #(active-owners (log-of conn) db (* 1000 (long windowSeconds))
                                                         (long maxTransactions) (long maxOwners) owner-attrs deadline))
        selected (System/currentTimeMillis)
        owners (:owners selection)
        stop (AtomicBoolean. false)
        reason (atom nil)
        totals (atom {})
        datoms (atom 0)
        done (AtomicInteger. 0)
        counter (AtomicInteger. 0)
        pool (Executors/newFixedThreadPool
               (int threads)
               (reify ThreadFactory
                 (newThread [_ r] (doto (Thread. ^Runnable r (str prefix (.incrementAndGet counter))) (.setDaemon true)))))
        chunks (partition-all 16 owners)
        stop! (fn [why] (when (.compareAndSet stop false true) (reset! reason why)))]
    (doseq [chunk chunks]
      (.submit ^ExecutorService pool
               ^Runnable (fn []
                           (doseq [e chunk]
                             (when-not (.get stop)
                               (if (>= (System/currentTimeMillis) deadline)
                                 (stop! "time-limit")
                                 (let [[n reads] (measured #(read-owner db e reads-spec))
                                       merged (swap! totals #(merge-with + % (select-keys reads (filter (comp number? reads) (keys reads)))))]
                                   (swap! datoms + n)
                                   (.incrementAndGet done)
                                   (when (>= (loads merged) (long maxSegments)) (stop! "segment-budget")))))))))
    (.shutdown pool)
    (when-not (.awaitTermination pool (max 1 (- deadline (System/currentTimeMillis))) TimeUnit/MILLISECONDS)
      (stop! "time-limit")
      (.shutdownNow pool)
      (.awaitTermination pool 5000 TimeUnit/MILLISECONDS))
    ;; The write peer's connection URI can name its serving connection, so only the transactor releases.
    (when (not= false releaseConnection) (release conn))
    (let [ended (System/currentTimeMillis)]
      {:status (or @reason "complete") :attempt attempt :role role :request request
       :startedWallMs started :connectedWallMs connected :selectedWallMs selected :endedWallMs ended
       :elapsedMs (- ended started) :connectMs (- connected started) :selectMs (- selected connected)
       :readMs (- ended selected)
       :basisT ((api "basis-t") db)
       :log (assoc (dissoc selection :owners) :reads log-reads :ownersFound (count owners))
       :owners {:selected (count owners) :read (.get done)}
       :datoms @datoms :reads @totals :segmentLoads (loads @totals)
       :indexes (mapv (fn [[i a]] [(name i) a]) reads-spec)
       :poolTerminated (.isTerminated pool)})))

(defn- main []
  (let [deadline (+ (System/currentTimeMillis) wait-for-request-ms)]
    (loop []
      (cond
        (.exists request-file)
        (let [started (System/currentTimeMillis)]
          (when-not (.renameTo request-file taken-file)
            (throw (ex-info "Could not take the start-up read request" {})))
          (let [request (json/read-str (slurp taken-file) :key-fn keyword)
                report (try (run request started)
                            (catch Throwable failure
                              {:status "error" :attempt (:attempt request) :startedWallMs started
                               :endedWallMs (System/currentTimeMillis)
                               :causes (mapv (fn [c] {:type (str (:type c)) :message (str (:message c))})
                                             (:via (Throwable->map failure)))}))]
            (write-json! report-file (assoc report :readerThreadsAtReport
                                            (vec (remove #{(.getName (Thread/currentThread))} (reader-threads)))))))

        (< (System/currentTimeMillis) deadline)
        (do (Thread/sleep 100) (recur))

        :else (write-json! report-file {:status "not-requested" :role role :endedWallMs (System/currentTimeMillis)})))))

;; [DX-JVM1] Why: default off. The launcher loads this file only for a start-up-read arm, and the thread starts only
;; for a boot that the runner marked before starting it, so a first boot that carries traffic has no reader thread.
;; Rejected: starting the read on a timer or leaving a waiting reader once the read has finished.
(when (and directory (.exists enabled-file))
  (doto (Thread. ^Runnable main (str prefix "main"))
    (.setDaemon true)
    (.start)))
