(ns triplex.compact.history
  (:require [clojure.string :as str]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store])
  (:import [java.lang.management ManagementFactory]))

(def account "history")
(def subjects (vec (mapcat (fn [[i depth]] (map #(vector % depth) (range (* i 6) (* (inc i) 6))))
                          (map-indexed vector [1 64 415 2000]))))
(def interval 64)
(defn uri [] (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" (floor/db-name "history")))

(defn request [person generation p]
  (let [root (f/root person)]
    (if (= generation 1)
      (f/input account root (str "seed-" person) 0 (f/seed-facts person 160) [])
      (f/input account root (str "generation-" person "-" generation) p
               (f/correction person generation 1) [[p (if (= generation 2) 5 0)]]))))

(defn seed! []
  (let [conn (floor/open! (floor/db-name "history"))
        writer (assoc (store/open-store conn nil (count subjects)) :checkpoint-every interval)
        _ (store/provision! conn [account])
        totals (volatile! {:events 0 :checkpoints 0 :bytes 0})
        end (volatile! 0)
        start (System/nanoTime)]
    (doseq [generation (range 1 2001)
            cohort (partition-all 8 (filter #(<= generation (second %)) subjects))]
      (let [db (d/db conn)
            requests (mapv (fn [[person]] (request person generation (store/revision db account (f/root person)))) cohort)
            before (mapv #(store/prepare writer db %) requests)
            {:keys [report outcomes view]} (store/commit-ready! writer before)
            cp (mapv :v (filter #(= (d/entid view :compact/checkpoint) (:a %)) (:tx-data report)))]
        (assert (= (count requests) (count outcomes)))
        (doseq [[row idx receipt] (map vector requests (range) outcomes)]
          (oracle/require-receipt row (inc (+ idx @end)) receipt))
        (vswap! end + (count outcomes))
        (assert (= (count cp) (if (zero? (mod generation interval)) (count cohort) 0)))
        (assert (= (set cp) (set (keep :checkpoint before))))
        (vswap! totals #(-> % (update :events + (count outcomes)) (update :checkpoints + (count cp))
                            (update :bytes + (reduce + (map store/utf8 cp)))))))
    (let [v (store/sync-view writer)]
      (assert (= @end (:events @totals) (store/head-position v account)))
      (assert (= (:checkpoints @totals) (reduce + (map #(quot (second %) interval) subjects))))
      (floor/emit "history-seed" (assoc @totals :position @end :wallMs (floor/ms (- (System/nanoTime) start))
                                       :nativeT (d/basis-t v) :interval interval)))
    (d/release conn)))

(defn gc-count []
  (reduce + (filter #(not (neg? %)) (map #(.getCollectionCount %) (ManagementFactory/getGarbageCollectorMXBeans)))))

(defn timed-read! [reader view person depth mode tag]
  (let [root (f/root person) p (store/revision view account root)
        pinned? (= mode "pinned")
        before (gc-count)
        [ms projection]
        (probe/timed #(let [at (if pinned? (store/history-cut view account p) view)
                            pr (if pinned? (store/pinned-projection reader at account root p)
                                           (store/current-projection reader at account root))]
                        (assoc pr :visible (store/rows-at reader view account root pr f/now-valid))))
        gc (- (gc-count) before)
        want (probe/expected-world person (inc person) depth (if (> depth 1) 1 0) p (> depth 1))]
    (assert (= (:depth projection) depth))
    (assert (= want (f/sorted-world {:subject root :facts (:visible projection)})))
    (let [folded (cond
                   (and (= tag "warm") (not pinned?)) 0
                   (:ignore-checkpoints reader) depth
                   (< depth interval) depth
                   :else (inc (mod depth interval)))]
      (assert (= folded (:folded projection))))
    (floor/emit "history-read" {:person person :depth depth :position p :mode mode :cache tag :ms ms :gc gc
                               :strategy (if (:ignore-checkpoints reader) "chain" "checkpoint")
                               :folded (:folded projection)})))

(defn boundaries! [reader view]
  (let [root (f/root 23)
        {:keys [events]} (store/chain view (store/head view (store/subject-id view account root)) nil)
        events (vec events)]
    (doseq [ordinal [1 63 64 65 127 128 129 415 2000]]
      (let [p (:p (events (dec ordinal)))
            at (store/history-cut view account p)
            rows (store/pinned-projection reader at account root p)
            raw (store/pinned-projection (assoc reader :ignore-checkpoints true) at account root p)]
        (assert (= (:depth rows) (:depth raw) ordinal))
        (assert (= (:facts raw) (:facts rows)))
        (assert (<= (:folded rows) interval))))
    (let [{:keys [eid]} (events (dec interval))
          text (store/value view eid :compact/checkpoint)]
      (assert (oracle/rejected? :InvalidCheckpoint #(store/restore-checkpoint view account root eid (str "!" (subs text 1))))))
    (floor/emit "checkpoint-boundaries" {:cuts [1 63 64 65 127 128 129 415 2000] :verified true})))

(defn sample! [strategy mode]
  (assert (and (#{"chain" "checkpoint"} strategy) (#{"current" "pinned"} mode)))
  (let [conn (d/connect (uri))
        reader (cond-> (store/open-store conn nil 4) (= strategy "chain") (assoc :ignore-checkpoints true))
        view (store/sync-view reader)]
    (doseq [[person depth] (if (= strategy "chain") subjects (rseq subjects))]
      (timed-read! reader view person depth mode "cold")
      (timed-read! reader view person depth mode "warm"))
    (when (and (= strategy "checkpoint") (= mode "pinned")) (boundaries! reader view))
    (floor/emit "history-reader-end" {:strategy strategy :mode mode :nativeT (d/basis-t view)
                                    :position (store/head-position view account) :samples (* 2 (count subjects))})
    (d/release conn)))

(defn -main [mode & [strategy query]]
  (case mode "seed" (seed!) "sample" (sample! strategy query))
  (shutdown-agents)
  (System/exit 0))
