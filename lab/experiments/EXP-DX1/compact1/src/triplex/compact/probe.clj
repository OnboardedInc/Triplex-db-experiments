(ns triplex.compact.probe
  (:require [clojure.string :as str]
            [datomic.api :as d]
            [datomic.log :as log]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.legacy :as legacy]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.store :as store])
  (:import [java.lang.management ManagementFactory]
           [java.nio ByteBuffer]
           [java.util Date UUID]
           [java.util.concurrent ArrayBlockingQueue Callable Executors TimeUnit TimeoutException]))

(defn open-compact! [suffix limit]
  (let [conn (floor/open! (floor/db-name suffix))]
    (store/provision! conn f/accounts)
    (store/open-store conn nil limit)))

(defn census [t datoms]
  (let [fressian (.remaining ^ByteBuffer
                    (log/fressianed-tx {:id (UUID. 0 1) :t t :data datoms}))
        bytes (reduce + (map (fn [x]
                               (let [v (:v x)]
                                 (cond (string? v) (store/utf8 v)
                                       (or (number? v) (instance? Date v)) 8
                                       :else (store/utf8 (pr-str v))))) datoms))]
    {:datoms (count datoms) :valueBytes bytes :fressianBytes fressian}))

(defn seed-request [i n]
  (f/input (f/account i) (f/root i) (str "seed-" i) 0 (f/seed-facts i n) []))

(defn compact-seed! [store people facts width collect?]
  (let [conn (:conn store) start (System/nanoTime)]
    (loop [next 0 revs [] counts (zipmap f/accounts (repeat 0)) txs 0 sizes 0]
      (if (= next people)
        {:revs revs :txs txs :bytes sizes :wallMs (floor/ms (- (System/nanoTime) start))}
        (let [cohort (vec (range next (min people (+ next width))))
              db (d/db conn)
              requests (mapv #(seed-request % facts) cohort)
              before (mapv #(store/prepare store db %) requests)
              {:keys [report outcomes]} (store/commit-ready! store before)
              last (:db-after report)
              _ (assert (= (count outcomes) (count cohort)))
              p (reduce (fn [p [i req r]]
                          (let [account (f/account i) pos (inc (p account))]
                            (oracle/require-receipt req pos r)
                            (assert (= (mapv #(store/encode-add store account (f/root i) %) (:adds req))
                                       (:adds (store/event last (store/claim last account (:command req))))))
                            (assoc p account pos)))
                        counts (map vector cohort requests outcomes))]
          (when (and (>= people 10000) (zero? (mod (+ next (count cohort)) 10000)))
            (floor/emit "seed-progress" {:people (+ next (count cohort)) :txs (inc txs)
                                          :wallMs (floor/ms (- (System/nanoTime) start))}))
          ;; [DX-COMPACT1] Why: revision index i must refer to subject i across every cohort.
          ;; Rejected: assuming assoc! keeps the transient array-map after its first eight entries.
          (recur (+ next (count cohort)) (if collect? (into revs (map :position outcomes)) revs) p (inc txs)
                 (+ sizes (reduce + (map (comp store/utf8 :body) before)))))))))

(defn correction [i serial width p]
  (f/input (f/account i) (f/root i) (str "write-" serial) p
           (f/correction i serial width) (mapv #(vector p %) (f/replace-ordinals width))))

(defn durable-tx! [conn t]
  (let [rows (vec (d/tx-range (d/log conn) t (inc t)))]
    (assert (= [t] (mapv :t rows)))
    (:data (first rows))))

(defn writer-witness! [conn name n]
  ;; [DX-COMPACT1] Why: bind the native processor thread to this database before the measured arms.
  ;; Rejected: treating peer io-context as a persistent transactor label (the native log normalizes it to :db/tx).
  (let [values (mapv #(str "compact-witness-" name "-" %) (range n))
        report (store/tx! conn (mapv #(vector :db/add % :db/doc %) values))
        db (:db-after report) t (d/basis-t db) actual (durable-tx! conn t)
        attr (d/entid db :db/doc) api (get-in report [:io-stats :api-ms])]
    (assert (= (:tx-data report) actual))
    (assert (= (set values) (set (map :v (filter #(= attr (:a %)) actual)))))
    (assert (= (inc n) (count actual)))
    (assert (number? api))
    {:t t :datoms (count actual) :apiMs api}))

(defn layout! []
  (let [store (open-compact! "layout" 32) conn (:conn store)
        {revs :revs} (compact-seed! store 16 160 8 true)]
    (doseq [[i width] (map-indexed vector [1 3 25])]
      (let [req (correction i (+ 10000 i) width (revs i))
            prepared (store/prepare store (d/db conn) req)
            {:keys [report outcomes view]} (store/commit-ready! store [prepared])
            r (oracle/require-receipt req (inc (store/head-position (:db-before report) (:account req))) (first outcomes))
            actual (durable-tx! conn (:nativeT r))
            event (store/event view (store/claim view (:account r) (:command r)))
            size (census (:nativeT r) actual)]
        (assert (= (:tx-data report) actual))
        (assert (= 11 (:datoms size)))
        (assert (= (:adds event) (mapv #(store/encode-add store (:account req) (:root req) %) (:adds req))))
        (assert (= (:retires event) (:retires req)))
        (floor/emit "layout-census" (merge size {:facts width :bodyBytes (store/utf8 (:body prepared)) :receipt r}))))
    (d/release conn)))

(defn writer [store]
  (let [q (ArrayBlockingQueue. 256)
        running (future
                  (loop []
                    (when-let [entry (.take q)]
                      (when-not (= ::stop entry)
                        (let [rest (java.util.ArrayList.)]
                          ;; [DX-COMPACT1] Why: share an append only with already-ready work, with a bounded frame.
                          ;; Rejected: introducing a keep-warm or batch collection delay.
                          (.drainTo q rest 7)
                          (let [batch (into [entry] rest)]
                            (try
                              (let [{:keys [outcomes nativeNanos report]} (store/commit-ready! store (mapv first batch))]
                                (doseq [[[request response] r] (map vector batch outcomes)]
                                  (deliver response {:receipt r :nativeNanos nativeNanos
                                                     :applyMs (get-in report [:io-stats :api-ms])
                                                     :fingerprint (:fingerprint request)})))
                              (catch Throwable e (doseq [[_ response] batch] (deliver response {:failure e}))))))
                        (recur)))))]
    {:send (fn [request]
             (let [candidate (store/prepare store (d/db (:conn store)) request)
                   reply (promise)]
               (when-not (.offer q [candidate reply] 5 TimeUnit/SECONDS) (throw (TimeoutException. "compact queue saturated")))
               (let [r (deref reply 60000 ::timeout)]
                 (assert (not= r ::timeout))
                 (when-let [e (:failure r)] (throw e))
                 r)))
     :close (fn [] (.put q ::stop) (deref running 60000 nil))}))

(defn timed [f]
  (let [start (System/nanoTime) result (f)]
    [(floor/ms (- (System/nanoTime) start)) result]))
(defn quantiles [xs]
  {:p50 (floor/quantile xs 0.50) :p99 (floor/quantile xs 0.99)})

(defn closed-loop [depth input-fs]
  (let [jobs (vec input-fs) next (atom -1) pool (Executors/newFixedThreadPool depth)]
    (try
      (let [workers (mapv (fn [_] (.submit pool ^Callable
                                (fn []
                                  (loop [rows (transient [])]
                                    (let [i (swap! next inc)]
                                      (if (< i (count jobs))
                                        (let [[ms value] (timed (nth jobs i))]
                                          (recur (conj! rows (assoc value :ackMs ms :index i))))
                                        (persistent! rows))))))) (range depth))]
        (vec (sort-by :index (mapcat #(.get % 180 TimeUnit/SECONDS) workers))))
      (finally (.shutdownNow pool)))))

(defn expected-world [person seed-pos serial width receipt-pos new?]
  (let [rows (f/seed-facts person 160)
        edits (zipmap (f/replace-ordinals width) (f/correction person serial width))]
    (f/sorted-world {:subject (f/root person)
                     :facts (mapv (fn [i [e a v]]
                                    (if-let [[entity attr val] (when new? (edits i))]
                                      {:e entity :a attr :v val :tx receipt-pos}
                                      {:e e :a a :v v :tx seed-pos}))
                                  (range) rows)})))

(defn compact-world [compact i mode p]
  (store/world compact (d/db (:conn compact)) (f/account i) (f/root i) mode p f/now-valid))
(defn world [compact legacy treatment i mode p]
  (if (= "compact" treatment) (compact-world compact i mode p) (legacy/world legacy i mode p)))

(defn read-prices! [compact legacy treatment cohort revs outcomes]
  (let [reads (mapv
                (fn [[i serial width r]]
                  (let [p (revs i)
                        pull (fn [mode pos] (world compact legacy treatment i mode pos))
                        new (expected-world i p serial width (:position r) true)
                        old (expected-world i p serial width (:position r) false)
                        _ (assert (= new (f/sorted-world (pull :current nil))))
                        [current value] (timed #(pull :current nil))
                        [pinned past] (timed #(pull :pinned p))]
                    (assert (= new (f/sorted-world value)))
                    (assert (= old (f/sorted-world past)))
                    {:current current :pinned pinned}))
                (take-nth 5 (map vector cohort (map :serial outcomes) (map :width outcomes) (map :receipt outcomes))))]
    {:current (quantiles (map :current reads)) :pinned (quantiles (map :pinned reads)) :count (count reads)}))

(defn cold! [compact legacy compact-revs legacy-revs first]
  (doseq [block [0 1]
          treatment (if (zero? block) ["legacy" "compact"] ["compact" "legacy"])]
    (let [subjects (range (+ first (* block 32)) (+ first (* (inc block) 32)))
          positions (if (= treatment "compact") compact-revs legacy-revs)
          ms (mapv (fn [i]
                     (when (= treatment "compact")
                       (assert (not (.containsKey ^java.util.LinkedHashMap (:cache compact) [(f/account i) (f/root i)]))))
                     (let [[ms w] (timed #(world compact legacy treatment i :current nil))]
                       (assert (= (expected-world i (positions i) 0 0 0 false) (f/sorted-world w)))
                       ms)) subjects)]
      (floor/emit "cold-prices" {:arm treatment :block block :count (count ms) :current (quantiles ms)}))))

(defn arm! [compact legacy writer treatment depth block cohort revs]
  (let [jobs (mapv (fn [i]
                     (let [serial (+ 10000 i) width (inc (mod i 3))
                           request (if (= "compact" treatment) (correction i serial width (revs i))
                                       (legacy/correction i serial width))]
                       {:subject i :width width :serial serial :request request})) cohort)
        funcs (mapv (fn [{:keys [request] :as job}]
                      (fn []
                        (let [reply (if (= "compact" treatment)
                                      ((:send writer) request)
                                      {:receipt (legacy/save! legacy request)})]
                          (merge (dissoc job :request) reply)))) jobs)
        before (floor/pg-sample)
        [elapsed outcomes] (timed #(closed-loop depth funcs))
        after (floor/pg-sample)
        conn (:conn (if (= "compact" treatment) compact legacy))
        db (d/db conn)
        by-t (group-by (comp :nativeT :receipt) outcomes)
        counts (mapv (fn [[t members]] (assoc (census t (durable-tx! conn t)) :t t :members (count members)
                                             :applyMs (:applyMs (first members))))
                     (sort-by key by-t))
        reads (read-prices! compact legacy treatment cohort revs outcomes)]
    (assert (= (set cohort) (set (map :subject outcomes))))
    (assert (= (count cohort) (count (set (map (comp :command :receipt) outcomes)))))
    (doseq [[job {:keys [receipt fingerprint]}] (map vector jobs outcomes)]
      (let [{:keys [request]} job]
        (if (= "compact" treatment)
          (do (oracle/require-receipt request (:position receipt) receipt)
              (assert (= fingerprint (:fingerprint receipt)))
              (assert (= receipt (store/receipt db (:account receipt) (:command receipt)))))
          (let [stored (triplex.gateway.storage/operation db (get request "operationId"))]
            (assert (= (str (:position receipt)) (get-in stored [:position "v"])))
            (assert (= (str (:nativeT receipt)) (get-in stored [:t "v"])))))))
    (floor/emit "arm" {:arm treatment :depth depth :block block :wallMs elapsed :before before :after after
                       :observed (count outcomes) :facts (reduce + (map :width outcomes))
                       :native counts :reads reads :ack (quantiles (map :ackMs outcomes))
                       :receipts (mapv (fn [r] (select-keys r [:subject :width :receipt])) outcomes)})))

(defn compare! []
  (let [n 120 blocks 2 depths [1 8 32 64] sampled (* n blocks (count depths)) people (+ sampled 64)
        compact (open-compact! "test" 512) legacy (legacy/create!)
        {compact-revs :revs} (compact-seed! compact people 160 8 true)
        legacy-revs (legacy/seed! legacy people 160)
        compact-writer (writer-witness! (:conn compact) "compact" 13)
        incumbent-writer (writer-witness! (:conn legacy) "legacy" 17)
        start-c (floor/index! (:conn compact)) start-l (floor/index! (:conn legacy))
        w (writer compact)]
    (try
      (floor/emit "benchmark-start" {:people people :factsPerPerson 160 :compactT start-c :legacyT start-l
                                     :compactWriter compact-writer :incumbentWriter incumbent-writer})
      (cold! compact legacy compact-revs legacy-revs sampled)
      (doseq [block (range blocks)
              [di depth] (if (zero? block) (map-indexed vector depths) (reverse (map-indexed vector depths)))
              arm (if (even? (+ block di)) ["legacy" "compact"] ["compact" "legacy"])]
        (let [start (* n (+ (* block (count depths)) di))
              cohort (range start (+ start n))]
          (arm! compact legacy w arm depth block cohort (if (= arm "compact") compact-revs legacy-revs))))
      (floor/emit "benchmark-end" {:people people :compactT (d/basis-t (d/db (:conn compact)))
                                    :legacyT (d/basis-t (d/db (:conn legacy)))})
      (finally ((:close w)) (d/release (:conn compact)) (d/release (:conn legacy))))))

(defn heap-used [] (.getUsed (.getHeapMemoryUsage (ManagementFactory/getMemoryMXBean))))
(defn load! [people]
  (assert (#{2000 100000} people))
  (let [facts 160 store (open-compact! "load" 128) conn (:conn store)
        before (floor/pg-sample)
        rows (compact-seed! store people facts 8 false)
        after (floor/pg-sample)
        [index-ms indexed] (timed #(floor/index! conn))
        view (store/sync-view store)]
    (assert (every? #(= (quot people (count f/accounts)) (store/head-position view %)) f/accounts))
    (assert (zero? (.size ^java.util.LinkedHashMap (:cache store))))
    (floor/emit "load" (assoc (dissoc rows :revs) :people people :facts (* people facts)
                              :indexedThrough indexed :indexCatchupMs index-ms :before before :after after
                              :afterIndex (floor/pg-sample)))
    (doseq [i (range 0 people (max 23 (quot people 87)))]
      (let [p (inc (quot i (count f/accounts)))
            [ms w] (timed #(store/world store view (f/account i) (f/root i) :current nil f/now-valid))]
        (assert (= (expected-world i p 0 0 0 false) (f/sorted-world w)))
        (floor/emit "load-read" {:person i :facts (count (:facts w)) :ms ms})))
    (let [reader (store/open-store conn nil 128)
          gc (fn [] (System/gc) (Thread/sleep 100) (heap-used))
          before (gc)
          projections (mapv (fn [i] (store/current-projection reader view (f/account i) (f/root i))) (range 128))
          after (gc)]
      (assert (= (* 128 facts) (reduce + (map (comp count :facts) projections))))
      (assert (= 128 (.size ^java.util.LinkedHashMap (:cache reader))))
      (floor/emit "projection-heap" {:subjects 128 :facts (* 128 facts) :heapBefore before :heapAfter after}))
    (d/release conn)))

(defn recovery! []
  (let [uri (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" (floor/db-name "oracle"))
        conn (d/connect uri) store (store/open-store conn nil 16)
        view (store/sync-view store) receipt (store/receipt view "time-a" "edit")
        world (f/sorted-world (store/world store view "time-a" "pl:p" :pinned 1 "2026-10-31T22:00:00.000001Z"))
        erased (store/world store view "erase-a" "pl:a" :pinned 1 f/now-valid)]
    (assert (= 2 (:position receipt)))
    (assert (= 2000 (get-in world [:facts 0 :v])))
    (assert (string? (get-in erased [:facts 0 :v :erasedAt])))
    (floor/emit "recovery" {:receipt receipt :world world :erased erased :head (d/basis-t view)})
    (d/release conn)))

(defn -main [mode & args]
  (case mode
    "layout" (layout!)
    "oracle" (oracle/run!)
    "benchmark" (compare!)
    "load" (load! (Long/parseLong (or (first args) "2000")))
    "recovery" (recovery!))
  (shutdown-agents)
  (System/exit 0))
