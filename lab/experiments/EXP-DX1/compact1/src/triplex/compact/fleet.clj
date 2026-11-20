(ns triplex.compact.fleet
  (:require [clojure.string :as str]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store])
  (:import [java.sql DriverManager]
           [java.util.concurrent ArrayBlockingQueue Callable CountDownLatch Executors RejectedExecutionException ThreadPoolExecutor TimeUnit]
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

(defn history-cohort [offset span]
  (let [n (min 512 span)]
    (map #(long (+ offset (quot (* % span) n))) (range n))))

(defn live-request [store person width]
  (let [seed (basis-of-seed person)
        p (get (:aged store) person seed)]
    (assoc (probe/correction person (+ 100000 person) width p)
           :retires (mapv #(vector seed %) (f/replace-ordinals width)))))

(defn age! [store people]
  ;; [DX-COMPACT1] Why: expose per-subject history while leaving the measured replacement's original field identity available.
  ;; Rejected: treating a one-event seed as representative of 415 edits.
  (let [conn (:conn store) revisions (volatile! {})]
    (doseq [ordinal (range 2 416) cohort (partition-all 8 people)]
      (let [before (d/db conn)
            requests (mapv (fn [person]
                             (let [seed (basis-of-seed person)
                                   p (get @revisions person seed)
                                   root (f/root person)]
                               (f/input (f/account person) root (str "age-" person "-" ordinal) p
                                        [[root "weeklyMinutes" (+ 1600 ordinal) nil nil]]
                                        [[p (if (= ordinal 2) 1 0)]])))
                           cohort)
            result (store/commit-ready! store (mapv (partial store/prepare store before) requests))]
        (doseq [[i request receipt] (map vector cohort requests (:outcomes result))]
          (oracle/require-receipt request (:position receipt) receipt)
          (assert (= receipt (store/receipt (:view result) (:account request) (:command request))))
          (vswap! revisions assoc i (:position receipt)))))
    @revisions))

(defn neighbor-read [store person stop armed]
  (let [scope (f/account person) owner (f/root person) p (get (:aged store) person)
        view (store/sync-view store)
        want (update (probe/expected-world person (basis-of-seed person) 0 0 0 false) :facts
                     (fn [rows] (mapv #(if (= "weeklyMinutes" (:a %)) (assoc % :v 2015 :tx p) %) rows)))]
    (.countDown armed)
    (loop [n 0 maximum 0.0]
      (if @stop
        {:count n :maxMs maximum}
        (let [[ms world] (probe/timed #(store/world store view scope owner :pinned p f/now-valid))]
          (assert (= (f/sorted-world want) (f/sorted-world world)))
          (LockSupport/parkNanos 20000000)
          (recur (inc n) (max maximum ms)))))))

(defn neighbor-import [store writer offset stop]
  (let [start (System/nanoTime)]
    (loop [i 0 n 0]
      (if @stop
        {:offers i :writtenFacts (* n 160) :elapsedMs (floor/ms (- (System/nanoTime) start))}
        (let [person (+ i offset)
              request (probe/seed-request person 160)
              reply ((:send writer) request)
              receipt (:receipt reply)]
          (oracle/require-receipt request (:position receipt) receipt)
          (assert (= receipt (store/receipt (d/db (:conn store)) (:account request) (:command request))))
          (wait-until (+ start (quot (* 160000000000 (inc i)) 3000)))
          (recur (inc i) (inc n)))))))

(defn with-neighbors! [store writer readers offset workload]
  (let [threads (Executors/newFixedThreadPool 64) stop (volatile! false) armed (CountDownLatch. 64)
        jobs (mapv (fn [person] (.submit threads ^Callable #(neighbor-read store person stop armed))) readers)
        loader (future (.await armed) (neighbor-import store writer offset stop))]
    (try
      (assert (.await armed 60 TimeUnit/SECONDS))
      (workload #(vreset! stop true))
      (let [reads (mapv #(.get % 30 TimeUnit/SECONDS) jobs)
            imports (deref loader 120000 ::timeout)]
        (assert (not= ::timeout imports))
        (assert (every? (comp pos? :count) reads))
        (floor/emit "fleet-neighbors" {:readers (count reads) :reads (reduce + (map :count reads))
                                        :maxReadMs (reduce max (map :maxMs reads)) :import imports}))
      (finally (vreset! stop true) (.shutdownNow threads) (future-cancel loader)))))

(defn offered! [store writer offset rate seconds stop-neighbors]
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
              req (live-request store person (inc (mod i 3)))]
          (wait-until due)
          (try
            (.execute pool
                      (fn []
                        (try
                          (let [result ((:send writer) req)
                                ack (System/nanoTime)]
                            (aset results i {:request req :receipt (:receipt result) :ack ack :nativeApiMs (:applyMs result)
                                             :ms (floor/ms (- ack due))}))
                          (catch Exception e (aset results i {:error (str (class e))}))
                          (finally (.countDown complete)))))
            (catch RejectedExecutionException _
              (aset results i {:error "queue-full"})
              (.countDown complete)))))
      (assert (.await complete 120 TimeUnit/SECONDS) "open-loop phase did not drain")
      (stop-neighbors)
      (let [after (floor/pg-sample) db (store/sync-view store)
            committed (filter #(some? (get-in % [:receipt :position])) results)
            errors (- total (count committed))
            last-ack (reduce max start (map :ack committed))
            scopes (group-by (comp :account :request) committed)
            window-end (+ start (* seconds 1000000000))
            in-window (count (filter #(< (:ack %) window-end) committed))
            native (vals (group-by (comp :nativeT :receipt) committed))]
        (doseq [{:keys [request receipt]} committed]
          (oracle/require-receipt request (:position receipt) receipt)
          (assert (= receipt (store/receipt db (:account request) (:command request)))))
        (floor/emit "fleet-open" {:rate rate :seconds seconds :offered total :acknowledged (count committed)
                                 :errors errors :allOfferP99 (when (zero? errors) (:p99 (probe/quantiles (map :ms committed))))
                                 :perAccount (into {} (map (fn [[a xs]] [a (assoc (probe/quantiles (map :ms xs)) :count (count xs))]) scopes))
                                 :physical (count native) :occupancy (frequencies (map count native))
                                 :nativeApiMs (when (seq native) (probe/quantiles (map (comp :nativeApiMs first) native)))
                                 :inWindowPerSecond (/ (double in-window) seconds)
                                 :lateOrMissing (+ errors (count (filter #(> (:ms %) 50.0) committed)))
                                 :drainMs (floor/ms (max 0 (- last-ack window-end)))
                                 :wallMs (floor/ms (- last-ack start)) :before before :after after})
        (assert (zero? errors) "open-loop phase did not acknowledge every offer"))
      (finally (.shutdownNow pool)))))

(defn saturation! [store writer offset n stop-neighbors]
  (let [jobs (mapv (fn [i]
                     (let [person (+ offset i)
                           request (live-request store person (inc (mod i 3)))]
                       (fn [] {:request request :receipt (:receipt ((:send writer) request))}))) (range n))
        [ms rows] (probe/timed #(probe/closed-loop 64 jobs))
        _ (stop-neighbors)
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
    (assert (<= (+ (* (+ lower higher) seconds) saturated 64) people))
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
      (let [staged (assoc (store/with-journal! store) :checkpoint-every 64)
            first-span (* lower seconds)
            both (* (+ lower higher) seconds)
            readers (range (+ both saturated) (+ both saturated 64))
            aged (vec (concat (history-cohort 0 first-span)
                              (history-cohort first-span (* higher seconds))
                              (history-cohort both saturated) readers))
            stage (assoc staged :aged (age! staged aged))
            writer (probe/writer stage)]
        (try
          (floor/emit "fleet-retained" {:subjectEvents 415 :subjects (count (:aged stage)) :journal true :checkpoint 64})
          (with-neighbors! stage writer readers people #(offered! stage writer 0 lower seconds %))
          (with-neighbors! stage writer readers (+ people 100000) #(offered! stage writer first-span higher seconds %))
          (with-neighbors! stage writer readers (+ people 200000) #(saturation! stage writer both saturated %))
          (finally ((:close writer)) (d/release conn)))))))

(defn -main [& sizes]
  (assert (= 5 (count sizes)) "people per account, seconds per rate, two rates, saturated count")
  (apply run! (map #(Long/parseLong %) sizes))
  (shutdown-agents)
  (System/exit 0))
