(ns triplex.compact.ablation
  (:require [datomic.api :as d]
            [triplex.compact.control :as control]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.legacy :as legacy]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store]
            [triplex.gateway.group :as group]
            [triplex.gateway.storage :as storage]))

(def modes ["corrected" "compact" "journal" "direct"])
(def per-block 96)

(defn corrected! [{:keys [conn name]} people]
  (let [base (store/sync-view {:conn conn})
        p (storage/head-position name base)
        requests (mapv #(legacy/correction % (+ 10000 %) (inc (mod % 3))) people)
        [prepare-ms entries] (probe/timed #(control/stage base requests))
        [evaluate-ms plans] (probe/timed #(group/evaluate base entries))
        _ (assert (and (= 8 (count plans)) (every? :report plans)))
        [materialize-ms tx] (probe/timed #(group/materialize base plans))
        [append-ms report] (probe/timed #(store/tx! conn [[:triplex.group/apply-v1 (d/basis-t base) tx]]))
        latest (:db-after report) t (d/basis-t latest)
        [receipt-ms settled] (probe/timed #(mapv (fn [i request]
                                                 (control/check-receipt! latest request (+ p i 1) t))
                                               (range) requests))]
    (assert (= (mapv :position plans) (mapv :position settled)))
    {:report report :prepareMs prepare-ms :evaluateMs evaluate-ms :materializeMs materialize-ms
     :appendMs append-ms :receiptMs receipt-ms :reused (reduce + (map :reused plans))
     :speculativeMs (/ (double (reduce + (map :speculative-micros plans))) 1000.0)}))

(defn compact! [current mode people revs]
  (let [base (d/db (:conn current)) account "a0"
        p (store/head-position base account)
        requests (mapv #(probe/correction % (+ 10000 %) (inc (mod % 3)) (revs %)) people)
        [prepare-ms prepared] (probe/timed #(mapv (partial store/prepare current base) requests))
        [materialize-ms materialized] (if (= mode "direct") (probe/timed #(store/append-data base prepared)) [0 nil])
        [append-ms report]
        (probe/timed #(if materialized (store/tx! (:conn current) materialized)
                          (store/tx! (:conn current) [[:compact/append-v1 prepared]])))
        db (:db-after report)
        [receipt-ms settled] (probe/timed #(mapv (fn [i {:keys [command] :as req}]
                                                 (oracle/require-receipt req (+ p i 1) (store/receipt db account command)))
                                               (range) requests))]
    (assert (every? #(= (d/basis-t db) (:nativeT %)) settled))
    (doseq [[idx req] (map-indexed vector requests)
            :let [event (store/event db (store/event-at db account (+ p idx 1)))]]
      (assert (= (:retires req) (:retires event)))
      (assert (= (mapv #(store/encode-add current account (:root req) %) (:adds req)) (:adds event))))
    (when (= mode "journal")
      (doseq [[result req] (map vector settled requests)
              :let [rows (group-by :attribute
                                   (control/journal-rows db (str "_tx/compact/" account "/" (:position result))))
                    changes (count (rows ":_tx/change"))]]
        (assert (= changes (+ (count (:adds req)) (count (:retires req)))))
        (assert (= (count (:adds req)) (count (rows ":_tx/changed-entity"))))))
    {:report report :prepareMs prepare-ms :evaluateMs 0 :materializeMs materialize-ms
     :appendMs append-ms :receiptMs receipt-ms :speculativeMs 0 :reused 0}))

(defn run! []
  (with-redefs [f/account (constantly "a0")]
    (let [people (* 2 per-block)
          incumbent (legacy/create!)
          opts (control/read-options! incumbent)
          _ (legacy/seed! incumbent people 160)
          controls (into {"corrected" incumbent}
                         (for [mode (rest modes)
                               :let [s (probe/open-compact! mode 64)
                                     seeded (probe/compact-seed! s people 160 8 true)]]
                           [mode (assoc (if (= mode "journal") (store/with-journal! s) s)
                                        :revs (:revs seeded))]))
          writers (into {} (map-indexed (fn [i mode]
                                         (let [conn (:conn (controls mode))
                                               witness (probe/writer-witness! conn mode (+ 33 i))]
                                           (floor/index! conn)
                                           [mode witness])) modes))]
      (floor/emit "ablation-start" {:options opts :writers writers :people people})
      (doseq [block [0 1] mode (if (zero? block) modes (rseq modes))
              [batch cohort] (map-indexed vector (partition 8 (range (* block per-block) (* (inc block) per-block))))]
        (let [scope (controls mode)
              result (if (= mode "corrected") (corrected! scope cohort)
                         (compact! scope mode cohort (:revs scope)))
              report (:report result) t (d/basis-t (:db-after report))
              actual (probe/durable-tx! (:conn scope) t)]
          (assert (= (:tx-data report) actual))
          (floor/emit "ablation-group" (merge (dissoc result :report) (probe/census t actual)
                                              {:mode mode :block block :batch batch :members 8 :t t
                                               :apiMs (get-in report [:io-stats :api-ms])}))))
      (floor/emit "ablation-end" {:modes modes :groups (* 2 (count modes) (quot per-block 8))})
      (doseq [[_ {:keys [conn]}] controls] (d/release conn)))))

(defn -main [& _]
  (run!)
  (shutdown-agents)
  (System/exit 0))
