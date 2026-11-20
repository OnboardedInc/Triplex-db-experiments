(ns triplex.gateway.retention
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [datomic.index-direct-metrics :as index]
            [triplex.gateway.field-probe :as field] [triplex.gateway.native-cost :as cost]
            [triplex.gateway.journal :as journal] [triplex.gateway.lean :as lean]
            [triplex.gateway.reach :as reach] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.packed-journal :as packed]
            [triplex.gateway.schema :as schema] [triplex.gateway.small-row :as small]
            [triplex.gateway.storage :as storage] [triplex.gateway.selftest :as fixture])
  (:import [java.util Date] [java.util.concurrent.locks LockSupport]))

(def subjects 512)
(def depth 160)
(defn original [i j]
  (field/row (field/identity-id "A" (+ (* i depth) j)) (field/root i)
             (str ":field/f" j) (str "seed/" i "/" j "/" (Integer/toUnsignedString (hash [i j]) 36))
             (str "seed/" (quot i 8)) (inc (quot i 8))))

(defn seed! [conn]
  (doseq [block (partition 8 (range subjects))]
    (let [position (inc (quot (first block) 8))
          rows (mapv (fn [i]
                       {:triplex.entity/id (field/root i) :triplex.entity/rev position
                        :triplex.entity/row (mapv #(fixture/row-text (original i %)) (range depth))}) block)
          tx (conj rows {:db/id "datomic.tx" :triplex.tx/position position
                         :triplex.tx/recorded-at field/clock :triplex.tx/max-recorded-at field/clock})
          report @(d/transact conn tx) a (d/entid (:db-after report) :triplex.entity/row)]
      (assert (= (set (mapcat :triplex.entity/row rows))
                 (set (map :v (filter #(and (:added %) (= a (:a %))) (:tx-data report)))))))))

(defn index! [conn t]
  (d/request-index conn)
  (let [db (deref (d/sync-index conn t) 180000 nil)]
    (assert (and db (>= (.-indexBasisT ^datomic.db.Db db) t)) (str "Index did not adopt through " t))
    db))

(defn stats [db]
  (let [m (index/direct-metrics db)]
    {:t (d/basis-t db) :position (storage/head-position db)
     :indexedT (.-indexBasisT ^datomic.db.Db db) :indexSegments (:IndexSegments m) :indexDatoms (:IndexDatoms m)
     :current (reduce (fn [n _] (inc n)) 0 (d/datoms db :eavt))
     :history (reduce (fn [n _] (inc n)) 0 (d/datoms (d/history db) :eavt))}))

(defn barrier! [dir arm phase data]
  (let [base (str dir "/" arm "-" phase)]
    (spit (str base ".tmp") (json/write-str data))
    (assert (.renameTo (java.io.File. (str base ".tmp")) (java.io.File. (str base ".ready"))))
    (let [deadline (+ (System/nanoTime) 180000000000)]
      (loop []
        (when-not (.isFile (java.io.File. (str base ".release")))
          (assert (< (System/nanoTime) deadline) (str "Observer stopped at " phase))
          (Thread/sleep 25)
          (recur))))))

(defn park-until [due]
  (loop []
    (let [left (- due (System/nanoTime))]
      (when (pos? left) (LockSupport/parkNanos left) (recur)))))

(defn verify-feed! [name conn lo witnesses]
  (loop [after lo]
    (when (< after (+ lo (count witnesses)))
      (let [page (json/read-str (journal/page conn name {"after" after "limit" 100}))
            rows (get page "transactions")]
        (assert (seq rows) (pr-str page))
        (doseq [[j [tx p texts]] (map-indexed vector rows)]
          (assert (= (+ after j 1) p))
          (let [{:keys [op tx-id clock owner changes]} (witnesses (- p lo 1))
                facts (map lean/decode texts)
                observed (map #(json/read-str (:value_json %)) (filter #(= ":_tx/change" (:attribute %)) facts))
                values (fn [attr column] (mapv column (filter #(= (str ":_tx/" attr) (:attribute %)) facts)))]
            (assert (= tx tx-id))
            (assert (= [owner] (values "changed-entity" :value_string)))
            (assert (= [op] (values "command-id" :value_string)))
            (assert (= [(double p)] (values "position" :value_number)))
            (assert (= [clock] (values "instant" :value_datetime)))
            (assert (every? #(and (= tx (:entity_id %)) (= p (:recorded_position %)) (= clock (:recorded_at %))) facts))
            (assert (= (frequencies changes) (frequencies observed)))))
        (recur (+ after (count rows)))))))

(defn workload! [arm name conn base n]
  (let [state (atom (mapv (fn [i] (mapv #(original i %) (range (inc (mod i 3))))) (range subjects)))
        lo (storage/head-position base) start (System/nanoTime)]
    (with-redefs [small/enabled (not= "classic" arm)
                  ledger/enabled (contains? #{"ledger" "packed"} arm)
                  packed/enabled (= "packed" arm)]
      (let [witnesses
            (mapv (fn [serial]
                    (let [i (mod serial subjects) prior (@state i) width (count prior)
                          {:keys [fresh input]} (cost/correction i (+ serial 1) prior width true)
                          due (+ start (* serial 20000000)) _ (park-until due)
                          sent (System/nanoTime)
                          reply (storage/commit! name conn (d/db conn) input)
                          clock (get-in reply [:recordedAt "v"]) t (Long/parseLong (get-in reply [:t "v"]))
                          p (Long/parseLong (get-in reply [:position "v"]))
                          cmd (get input "operationId") tx-id (get-in input ["claims" 0 "txId"])
                          changes (vec (concat
                            (for [r fresh] {"op" "assert" "entityId" (:entity_id r) "attribute" (:attribute r)
                                           "value" {"type" "string" "value" (:value_string r)} "tripleId" (:id r)
                                           "validFrom" (:valid_from r) "validTo" (:valid_to r) "recordedAt" clock})
                            (for [r prior] {"op" "retract" "entityId" (:entity_id r) "attribute" (:attribute r)
                                           "tripleId" (:id r) "recordedAt" (:recorded_at r) "retractedAt" clock})))]
                      (assert (= cmd (:operationId reply)))
                      (assert (= p (+ lo serial 1)))
                      (swap! state assoc i (mapv #(assoc % :recorded_at clock) fresh))
                      {:op cmd :tx-id tx-id :t t :p p :clock clock :width width
                       :datoms (:datoms reply) :owner (field/root i) :changes changes
                       :send-delay-us (quot (- sent due) 1000) :elapsed-us (quot (- (System/nanoTime) sent) 1000)}))
                  (range n))]
        {:witnesses witnesses :duration-ms (/ (- (System/nanoTime) start) 1e6) :state @state}))))

(defn verify! [name conn base db witnesses state]
  (doseq [{:keys [op tx-id t p clock]} witnesses]
    (let [r (storage/operation db op)
          claim (d/entid db [:triplex.claim/command-id op])]
      (assert (= [op t p clock] [(:operationId r) (some-> r :t (get "v") Long/parseLong)
                                (some-> r :position (get "v") Long/parseLong) (get-in r [:recordedAt "v"])]))
      (assert (and claim (= tx-id (ledger/claim-tx-id db claim))))))
  (verify-feed! name conn (storage/head-position base) witnesses)
  (doseq [i (range subjects) [basis expected] [[(d/as-of db (d/basis-t base)) (mapv #(original i %) (range (count (state i))))] [db (state i)]]]
    (let [e (d/entid basis [:triplex.entity/id (field/root i)])
          live (map (comp lean/decode :v) (lean/live-texts basis e))]
      (assert (= depth (count live)))
      (assert (= (set (map (juxt :id :value_string) expected))
                 (set (map (juxt :id :value_string) (filter #(some #{(:attribute %)} (map :attribute expected)) live))))))))

(defn read-cost [name conn db first-p]
  (let [elapsed (fn [f] (let [start (System/nanoTime) bytes (f)]
                         [(quot (- (System/nanoTime) start) 1000) (cost/byte-count bytes)]))
        feed (mapv (fn [_] (elapsed (fn []
                               (let [body (journal/page conn name {"after" (- first-p 1) "limit" 32})]
                                 (assert (string? body))
                                 body)))) (repeat 24 nil))
        pinned (mapv (fn [i] (elapsed #(reach/build-response name db
                                      {"roots" [(field/root i)] "basis" {"recordedPosition" (+ first-p i) "validAt" 1.0} "full" true})))
                     (range 24))]
    {:feed-32 feed :pinned-160 pinned}))

(defn collect! [conn t]
  (let [cutoff (Date.) result (d/gc-storage conn cutoff)
        result (if (instance? clojure.lang.IDeref result) (deref result 180000 ::timeout) result)]
    (assert (not= result ::timeout))
    {:t t :cutoff-ms (.getTime cutoff) :returned (str result)}))

(defn -main [arm dir n-text]
  (let [[name conn] (cost/open arm) n (Long/parseLong n-text)]
    (seed! conn)
    (let [base (index! conn (d/basis-t (d/db conn)))
          _ (barrier! dir arm "seed-gc" (collect! conn (d/basis-t base)))
          baseline (stats (d/db conn))]
      (barrier! dir arm "seed" (assoc baseline :subjects subjects :seed-facts (* subjects depth)))
      (let [{:keys [witnesses duration-ms state]} (workload! arm name conn base n)
            db (d/db conn) t (d/basis-t db) last-t (:t (peek witnesses))
            _ (barrier! dir arm "acked" {:t t :saves n :duration-ms duration-ms})
            log-datoms (reduce + (map #(count (:data %)) (d/tx-range (d/log conn) (:t (first witnesses)) (inc last-t))))]
        (assert (= t last-t))
        (assert (= log-datoms (reduce + (map :datoms witnesses))))
        (barrier! dir arm "written" (assoc (stats db) :saves n :duration-ms duration-ms :log-datoms log-datoms))
        (doseq [{:keys [op p t width]} (subvec witnesses 3 6)]
          (let [data (cost/census conn {:t {"t" "long" "v" (str t)} :position {"t" "long" "v" (str p)} :operationId op}
                                  {"operationId" op})]
            (cost/emit "retention-shape" {:arm arm :width width :t t :p p :op op :data data})))
        (let [indexed (index! conn t) index-stats (stats indexed)]
          (barrier! dir arm "indexed" index-stats)
          (verify! name conn base indexed witnesses state)
          (cost/emit "retention-read-cost" (assoc (read-cost name conn indexed (:p (first witnesses))) :arm arm))
          (barrier! dir arm "gc" (collect! conn t))
          (let [seen (d/db conn)]
            (verify! name conn base seen witnesses state)
            (assert (= (:history index-stats) (:history (stats seen))))
            (cost/emit "retention-done"
              {:arm arm :t t :saves n :history (:history (stats seen))
               :widths (into {} (for [[width ws] (group-by :width witnesses)]
                                  [width {:count (count ws) :datoms (frequencies (map :datoms ws))}]))
               :max-offer-delay-us (reduce max (map :send-delay-us witnesses))
               :ack-sha256 (schema/sha256 (json/write-str witnesses))}))))))
  (shutdown-agents)
  (System/exit 0))
