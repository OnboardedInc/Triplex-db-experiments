(ns triplex.compact.mixed
  (:require [datomic.api :as d]
            [triplex.compact.control :as control]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.legacy :as legacy]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store]
            [triplex.gateway.storage :as storage])
  (:import [java.util.concurrent Callable CountDownLatch Executors TimeUnit]))

(def reader-count 64)
(def live-saves 96)
(def import-subjects 24)
(def per-window (+ live-saves reader-count))
(def windows [["corrected" false] ["compact" false] ["corrected" true] ["compact" true]])

(defn reader [scope path person p]
  (if (= "compact" path)
    (store/world scope (d/db (:conn scope)) (f/account person) (f/root person) :pinned p f/now-valid)
    (legacy/world scope person :pinned p)))

(defn current [scope path person]
  (if (= "compact" path)
    (store/world scope (d/db (:conn scope)) (f/account person) (f/root person) :current nil f/now-valid)
    (legacy/world scope person :current nil)))

(defn send! [scope path writer req person kind]
  (let [start (System/nanoTime)]
    (try
      (let [r (if (= "compact" path) (:receipt ((:send writer) req)) (legacy/save! scope req))]
        (cond-> {:person person :kind kind :at (System/nanoTime) :ms (floor/ms (- (System/nanoTime) start))}
          (integer? (:position r)) (assoc :receipt r)
          (not (integer? (:position r))) (assoc :error (or (:error r) "MissingReceipt"))))
      (catch Exception e
        {:person person :kind kind :error (or (:code (ex-data e)) "WriteError")
         :at (System/nanoTime) :ms (floor/ms (- (System/nanoTime) start))}))))

(defn read-loop [scope path person p gate ready stop]
  (.countDown ready)
  (.await gate)
  (let [expected (probe/expected-world person p 0 0 0 false)]
    (loop [samples (transient [])]
      (if (and @stop (pos? (count samples)))
        (persistent! samples)
        (let [[ms observed] (probe/timed #(reader scope path person p))]
          (assert (= expected (f/sorted-world observed)))
          (recur (conj! samples {:ms ms :at (System/nanoTime)})))))))

(defn request-for [path kind person revision]
  (if (= kind "live")
    (if (= "compact" path)
      (probe/correction person (+ 10000 person) (inc (mod person 3)) revision)
      (legacy/correction person (+ 10000 person) (inc (mod person 3))))
    (if (= "compact" path) (probe/seed-request person 160) (legacy/import-input person))))

(defn verify! [scope path revs before successes requests]
  (let [db (store/sync-view scope)
        compact? (= path "compact")
        key (fn [result] (if compact? (f/account (:person result)) :scope))
        previous (fn [a] (if compact? (store/head-position before a) (storage/head-position (:name scope) before)))
        latest (fn [a] (if compact? (store/head-position db a) (storage/head-position (:name scope) db)))]
    (doseq [a (if compact? f/accounts [:scope])
            :let [entries (filter #(= a (key %)) successes)]]
      (assert (= (range (inc (previous a)) (inc (latest a)))
                 (sort (map (comp :position :receipt) entries)))))
    (doseq [{:keys [person kind receipt]} successes]
      (let [{:keys [position nativeT]} receipt
            req (requests person)
            v (if (= kind "live")
                (probe/expected-world person (revs person) (+ 10000 person) (inc (mod person 3)) position true)
                (probe/expected-world person position 0 0 0 false))]
        (if compact?
          (do (oracle/require-receipt req position receipt)
              (assert (= receipt (store/receipt db (:account req) (:command req)))))
          (control/check-receipt! db req position nativeT))
        (assert (= v (f/sorted-world (current scope path person))))))
    db))

(defn replay-import! [scope path req receipt]
  ;; [DX-COMPACT1] Why: exercise an import client's restarted checkpoint on an already accepted frame.
  ;; Rejected: advancing the load checkpoint from the send count or assuming a resend cannot enter the writer.
  (let [before (store/sync-view scope)]
    (if (= "compact" path)
      (assert (= receipt (store/save! scope req)))
      (do (assert (oracle/rejected? "OperationDuplicate" #(legacy/save! scope req)))
          (control/check-receipt! before req (:position receipt) (:nativeT receipt))))
    (assert (= (d/basis-t before) (d/basis-t (store/sync-view scope))))))

(defn window! [scope path revs block importing? offset]
  (let [before (store/sync-view scope)
        writer (when (= path "compact") (probe/writer scope))
        readers (Executors/newFixedThreadPool reader-count)
        gate (CountDownLatch. 1) started (CountDownLatch. reader-count) stop (volatile! false)
        live-ids (range offset (+ offset live-saves))
        read-ids (range (+ offset live-saves) (+ offset per-window))
        import-ids (if importing? (range (+ 10000 offset) (+ 10000 offset import-subjects)) [])
        kind #(if (< % 10000) "live" "import")
        requests (into {} (map #(vector % (request-for path (kind %) % (get revs %))) (concat live-ids import-ids)))
        submit (fn [i] (send! scope path writer (requests i) i (kind i)))
        background (mapv (fn [i]
                           (.submit readers ^Callable #(read-loop scope path i (revs i) gate started stop))) read-ids)
        bulk (future (.await gate) (mapv submit import-ids))
        start (volatile! 0)]
    (try
      (assert (.await started 30 TimeUnit/SECONDS))
      (vreset! start (System/nanoTime))
      (.countDown gate)
      (let [live (probe/closed-loop 8 (mapv #(fn [] (submit %)) live-ids))
            end (System/nanoTime)
            _ (vreset! stop true)
            load (deref bulk 120000 ::timeout)
            read-values (mapv #(.get % 120 TimeUnit/SECONDS) background)
            _ (assert (not= load ::timeout))
            successes (filter :receipt (concat live load))
            overlap (count (filter #(and (:receipt %) (<= (:at %) end)) load))]
        (verify! scope path revs before successes requests)
        (when-let [r (first (filter :receipt load))] (replay-import! scope path (requests (:person r)) (:receipt r)))
        (floor/emit "mixed-window" {:path path :block block :importing importing? :readers reader-count
                                   :liveOffered (count live) :liveAck (count (filter :receipt live))
                                   :liveMs (mapv :ms live) :readMs (mapv :ms (mapcat identity read-values))
                                   :misses (mapv #(select-keys % [:person :kind :error :ms]) (remove :receipt (concat live load)))
                                   :readerOverlap (count (filter #(some (fn [r] (<= (:at r) end)) %) read-values))
                                   :windowMs (floor/ms (- end @start))
                                   :importOffered (count load) :importAck (count (filter :receipt load))
                                   :importOverlap overlap :factsOverlapped (* 160 overlap)}))
      (finally
        (vreset! stop true)
        (.countDown gate)
        (.shutdownNow readers)
        (when writer ((:close writer)))))))

(defn run! []
  (let [people (* 4 per-window)
        incumbent (legacy/create!)
        opts (control/read-options! incumbent)
        legacy-revs (legacy/seed! incumbent people 160)
        compact (probe/open-compact! "mixed" 384)
        compact-revs (:revs (probe/compact-seed! compact people 160 8 true))
        compact (assoc (store/with-journal! compact) :checkpoint-every 64)
        scopes {"corrected" [incumbent legacy-revs] "compact" [compact compact-revs]}]
    (floor/index! (:conn incumbent))
    (floor/index! (:conn compact))
    (floor/emit "mixed-start" {:people people :readers reader-count :options opts})
    (doseq [block [0 1] [index [path importing?]] (if (zero? block) (map-indexed vector windows)
                                                          (reverse (map-indexed vector windows)))]
      (let [[scope revs] (scopes path)]
        (window! scope path revs block importing? (* per-window (+ (* 2 block) (quot index 2))))))
    (floor/emit "mixed-end" {:windows 8 :people people})
    (d/release (:conn incumbent))
    (d/release (:conn compact))))

(defn -main [& _]
  (run!)
  (shutdown-agents)
  (System/exit 0))
