(ns triplex.gateway.field-probe
  (:require [datomic.api :as d] [datomic.db :as native] [datomic.log :as log] [datomic.measure.io-stats :as io]
            [clojure.data.json :as json] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.selftest :as fixture] [triplex.gateway.lean :as lean] [triplex.gateway.schema :as schema]))
(def clock 1800000000000.0)
(defn emit [kind data] (println "W1_FIELD" (json/write-str {:kind kind :attempt (System/getenv "W1_ATTEMPT") :data data})) (flush))
(defn pad [n width] (let [v (str n)] (str (subs "00000000000000000000000000" 0 (- width (count v))) v)))
(defn identity-id [prefix n] (str prefix (pad n 25)))
(defn root [i] (str "acct/a" (mod i 10) "/p" i))
(defn row [id owner attr value tx pos]
  {:id id :entity_id owner :attribute attr :value_type "string" :value_string value :valid_from 0.0
   :recorded_at clock :recorded_position pos :schema_version 1 :tx_id tx})
(defn seed-row [i j pos]
  (let [id (identity-id "A" (+ (* i 40) j)) owner (if (or (< j 8) (zero? (mod (quot i 8) 4))) (root i) (str (root i) "/part" (quot j 8))) attr (str ":field/f" j)
        val (str "value-" (Integer/toUnsignedString (hash [i j]) 36) "-" i) tx (str "seed-" pos)]
    (row id owner attr val tx pos)))
(defn source! [seed?]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "field-probe" (System/getenv "W1_ATTEMPT") 0])
        opened (main/create-scope! nil scope "lean" true true)]
    (assert (= seed? (:created opened))) [(:db opened) (main/connection (main/db-uri (:db opened)))]))
(defn seed! [subjects facts]
  (let [[name conn] (source! true) per (quot facts subjects) extra (mod facts subjects) chunk (max 1 (quot 1800 (inc per)))
        started (System/nanoTime)]
    (loop [first 0 p 1 total 0 encoded 0]
      (if (= first subjects)
        (let [t (d/basis-t (d/db conn)) _ (d/request-index conn) indexed (deref (d/sync-index conn t) 300000 nil)]
          (assert (and indexed (= total facts)))
          (emit :seed {:db name :t t :subjects subjects :facts total :encodedBytes encoded :commits (dec p) :wallMs (/ (- (System/nanoTime) started) 1e6)}))
        (let [last (min subjects (+ first chunk))
              entities (vec (mapcat (fn [i]
                    (for [[owner rows] (group-by :entity_id (map #(seed-row i % p) (range (+ per (if (< i extra) 1 0)))))]
                      {:db/id (str "e:" owner) :triplex.entity/id owner :triplex.entity/rev p
                       :triplex.entity/row (mapv fixture/row-text rows)})) (range first last)))
              tx (conj entities {:db/id "datomic.tx" :triplex.tx/position p :triplex.tx/max-recorded-at clock :triplex.tx/recorded-at clock :triplex.tx/id (str "seed-" p)})
              result @(d/transact conn tx) a (d/entid (:db-after result) :triplex.entity/row)
              observed (filter #(and (:added %) (= (:a %) a)) (:tx-data result))
              expected (set (mapcat :triplex.entity/row entities))]
          (assert (= expected (set (map :v observed))))
          (let [by-owner (group-by :e observed)]
            (doseq [entity entities] (assert (= (set (:triplex.entity/row entity))
                     (set (map :v (by-owner (get (:tempids result) (:db/id entity)))))))))
          (when (zero? (mod p 100)) (emit :seed-progress {:people last :position p}))
          (recur last (inc p) (+ total (count expected)) (+ encoded (reduce + (map count expected)))))))))
(defn correction [i serial old-id width]
  (let [owner (root i) cmd (str "correction-" serial) tx (str "_tx/" (identity-id "T" serial))
        fresh (mapv (fn [j] (row (identity-id "Z" (+ (* serial 20) j)) owner (str ":field/f" j) (str "edit" serial "-" j) tx 1)) (range width))
        olds (mapv (fn [j id] (assoc (row id owner (str ":field/f" j) "prior" "original" 1)
                                     :retract_tx_id tx :retracted_at clock :retracted_position 1)) (range) old-id)
        jr (fn [j a v] (assoc (row (identity-id "Z" (+ (* serial 20) j)) tx a v tx 1) :entity_type "_Transaction"))
        journal [(assoc (jr 10 ":_tx/position" nil) :value_type "number" :value_number 1.0)
                 (assoc (jr 11 ":_tx/instant" nil) :value_type "datetime" :value_datetime clock)
                 (assoc (jr 12 ":_tx/changed-entity" owner) :value_type "ref") (jr 13 ":_tx/command-id" cmd)]
        new (into fresh journal) ids (mapv :id new)]
    {:fresh fresh :old olds :input (fixture/row-input {"operationId" cmd "position" 1 "span" 1 "sourceK" nil "assignRecordTime" true
           "scopeWide" false "entities" [owner] "newIds" ids "claims" [{"commandId" cmd "txId" tx "timestamp" clock}]
           "rows" (mapv storage/wire-row (concat new olds))})}))
(defn stats! [conn name subjects facts]
  (let [start-pos (storage/head-position (d/db conn)) arms [[false false] [false true] [true false] [true true]
                                                           [true true] [true false] [false true] [false false]]
        ;; [DX-W1] Why: disjoint owner cohorts have the same locality ranks, size distribution and replacement pattern. Reread each predecessor on its second pass.
        ;; Rejected: replaying identifiers that the control has already retired.
        n (min 160 (quot subjects 8)) ranks (fn [b j] (mod (+ (* (+ (* j 8) b) 7919) 117) subjects))
        check (fn [fresh old db] (let [id (:entity_id (first fresh)) e (d/entid db [:triplex.entity/id id]) live (set (map :id (map #(lean/decode (:v %)) (lean/live-texts db e))))]
                  (assert (every? live (map :id fresh))) (assert (not-any? live (map :id old)))))]
    (let [db (d/db conn) i (dec subjects) cmd (correction i 999999 [(identity-id "A" (* i 40))] 1)
          data (storage/tx-data db (assoc (:input cmd) "readProfile" true "predecessorLookup" false))]
      (dotimes [iteration 2]
        (let [m (io/throw-if-ex! (io/with-io-stats #(native/with-tx db (native/get-prefetch-dispatcher) data) {:io-context :w1/repeated :api :with}))]
          (emit :same-basis {:iteration iteration :db name :basis (d/basis-t db) :io (:io-stats m)}))))
    (doseq [[b [opt range?]] (map-indexed vector arms)]
      (let [seen (atom {})]
        (doseq [pass [0 1] j (range n)]
          (let [i (ranks b j) w (inc (mod j 3)) serial (+ 1 (* b 2 n) (* pass n) j)
                ids (or (@seen i) (mapv #(identity-id "A" (+ (* i 40) %)) (range w)))
                {:keys [fresh old input]} (correction i serial ids w) sorted-ids (sort (get input "newIds"))
                body (cond-> (assoc input "readProfile" true "predecessorLookup" opt) range? (assoc "historyIdentityBounds" [(first sorted-ids) (last sorted-ids)]))
                encoded (alength (.getBytes ^String (json/write-str body) "UTF-8"))
                before (d/db conn) receipt (storage/commit! name conn before body) after (d/db conn)
                pos (Long/parseLong (get-in receipt [:position "v"])) t (Long/parseLong (get-in receipt [:t "v"]))]
            (assert (= (+ start-pos serial) pos)) (assert (= (get body "operationId") (:operationId receipt)))
            (assert (= (get-in (storage/operation after (get body "operationId")) [:t "v"]) (str t)))
            (check fresh old after) (check old fresh before)
            (swap! seen assoc i (mapv :id fresh))
            (emit :correction {:block b :index j :pass pass :subject i :width w :optimized opt :range range?
                   :op (:operationId receipt) :db name :position pos :t t :bytes encoded :datoms (:datoms receipt)
                   :nativeMicros (:transactMicros receipt) :timeline (:timeline receipt) :io (:readProfile receipt)})))))
    (emit :growth-done {:db name :subjects subjects :seedFacts facts :commits (* 16 n) :head (storage/head-position (d/db conn))})))
(defn -main [mode subjects facts]
  (let [n (Long/parseLong subjects) f (Long/parseLong facts)]
    (if (= mode "seed") (seed! n f) (let [[name conn] (source! false)] (stats! conn name n f))))
  (shutdown-agents) (System/exit 0))
