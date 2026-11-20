(ns triplex.compact.fleet
  (:require [clojure.string :as str]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store])
  (:import [java.sql DriverManager]
           [java.util.concurrent ArrayBlockingQueue CountDownLatch RejectedExecutionException ThreadPoolExecutor TimeUnit]
           [java.util.concurrent.locks LockSupport]))

(defn durability! []
  (with-open [sql (DriverManager/getConnection (System/getenv "COMPACT_JDBC")
                                               (or (System/getenv "COMPACT_SQL_USER") "postgres")
                                               (System/getenv "COMPACT_SQL_PASSWORD"))
              stmt (.createStatement sql)
              values (.executeQuery stmt
                                   "select current_setting('fsync'),current_setting('synchronous_commit'),current_setting('full_page_writes')")]
    (assert (.next values))
    (assert (every? #(= "on" (.getString values %)) [1 2 3]))))

(defn wait-until [target]
  (loop []
    (let [left (- target (System/nanoTime))]
      (when (pos? left)
        (LockSupport/parkNanos left)
        (recur)))))

(defn basis-of-seed [person] (inc (quot person (count f/accounts))))

(defn offered! [store writer offset rate seconds]
  (let [total (* rate seconds)
        pool (ThreadPoolExecutor. 32 32 0 TimeUnit/SECONDS (ArrayBlockingQueue. 128))
        complete (CountDownLatch. total)
        results (object-array total)
        before (floor/pg-sample)
        start (+ (System/nanoTime) 100000000)]
    (.prestartAllCoreThreads pool)
    (try
      ;; [DX-COMPACT1] Why: timestamp each scheduled offer before it enters the bounded queue.
      ;; Rejected: measuring from worker start, which hides the overload tail.
      (dotimes [i total]
        (let [due (+ start (quot (* 1000000000 i) rate)) person (+ offset i)
              req (probe/correction person (+ 100000 person) (inc (mod i 3)) (basis-of-seed person))]
          (wait-until due)
          (try
            (.execute pool
                      (fn []
                        (try
                          (let [result ((:send writer) req)
                                ack (System/nanoTime)]
                            (aset results i {:request req :receipt (:receipt result) :ack ack
                                             :ms (floor/ms (- ack due))}))
                          (catch Exception e (aset results i {:error (str (class e))}))
                          (finally (.countDown complete)))))
            (catch RejectedExecutionException _
              (aset results i {:error "queue-full"})
              (.countDown complete)))))
      (assert (.await complete 120 TimeUnit/SECONDS) "open-loop phase did not drain")
      (let [after (floor/pg-sample) db (store/sync-view store)
            committed (filter #(some? (get-in % [:receipt :position])) results)
            errors (- total (count committed))
            last-ack (reduce max start (map :ack committed))
            scopes (group-by (comp :account :request) committed)
            window-end (+ start (* seconds 1000000000))
            in-window (count (filter #(< (:ack %) window-end) committed))]
        (doseq [{:keys [request receipt]} committed]
          (oracle/require-receipt request (:position receipt) receipt)
          (assert (= receipt (store/receipt db (:account request) (:command request)))))
        (floor/emit "fleet-open" {:rate rate :seconds seconds :offered total :acknowledged (count committed)
                                 :errors errors :allOfferP99 (when (zero? errors) (:p99 (probe/quantiles (map :ms committed))))
                                 :perAccount (into {} (map (fn [[a xs]] [a (assoc (probe/quantiles (map :ms xs)) :count (count xs))]) scopes))
                                 :physical (count (set (map (comp :nativeT :receipt) committed)))
                                 :inWindowPerSecond (/ (double in-window) seconds)
                                 :lateOrMissing (+ errors (count (filter #(> (:ms %) 50.0) committed)))
                                 :drainMs (floor/ms (max 0 (- last-ack window-end)))
                                 :wallMs (floor/ms (- last-ack start)) :before before :after after})
        (assert (zero? errors) "open-loop phase did not acknowledge every offer"))
      (finally (.shutdownNow pool)))))

(defn saturation! [store writer offset n]
  (let [jobs (mapv (fn [i]
                     (let [person (+ offset i)
                           request (probe/correction person (+ 100000 person) (inc (mod i 3)) (basis-of-seed person))]
                       (fn [] {:request request :receipt (:receipt ((:send writer) request))}))) (range n))
        [ms rows] (probe/timed #(probe/closed-loop 64 jobs))
        db (store/sync-view store)]
    (assert (= n (count rows)))
    (doseq [{:keys [request receipt]} rows]
      (oracle/require-receipt request (:position receipt) receipt)
      (assert (= receipt (store/receipt db (:account request) (:command request)))))
    (floor/emit "fleet-saturated" {:offered n :acknowledged n :depth 64 :wallMs ms
                                  :savesPerSecond (/ (* n 1000.0) ms) :ack (probe/quantiles (map :ackMs rows))})))

(defn run! [people-per-account seconds lower higher saturated]
  (let [people (* people-per-account (count f/accounts))]
    (assert (and (pos? people-per-account) (pos? seconds) (pos? lower) (< lower higher) (pos? saturated)))
    (assert (<= (+ (* (+ lower higher) seconds) saturated) people))
    (assert (str/starts-with? (System/getenv "DATOMIC_URI_TEMPLATE") "datomic:sql://"))
    (durability!)
    (let [store (probe/open-compact! "fleet" 1024)
          conn (:conn store)
          seed-before (floor/pg-sample)
          seed (probe/compact-seed! store people 160 8 false)
          seed-after (floor/pg-sample)
          view (store/sync-view store)]
      (assert (every? #(= people-per-account (store/head-position view %)) f/accounts))
      (floor/emit "fleet-seed" (assoc (dissoc seed :revs) :facts (* people 160) :people people :accounts 10
                                     :head (d/basis-t view) :before seed-before :after seed-after))
      (let [writer (probe/writer store)]
        (try
          (offered! store writer 0 lower seconds)
          (offered! store writer (* lower seconds) higher seconds)
          (saturation! store writer (* (+ lower higher) seconds) saturated)
          (finally ((:close writer)) (d/release conn)))))))

(defn -main [& sizes]
  (assert (= 5 (count sizes)) "people per account, seconds per rate, two rates, saturated count")
  (apply run! (map #(Long/parseLong %) sizes))
  (shutdown-agents)
  (System/exit 0))
