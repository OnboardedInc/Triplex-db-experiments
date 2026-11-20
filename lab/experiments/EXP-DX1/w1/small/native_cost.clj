(ns triplex.gateway.native-cost
  (:require [clojure.data.json :as json]
            [datomic.api :as d] [triplex.gateway.main :as main]
            [triplex.gateway.storage :as storage] [triplex.gateway.lean :as lean]
            [triplex.gateway.small-row :as small-row] [triplex.gateway.selftest :as fixture] [triplex.gateway.slim :as slim]
            [triplex.gateway.field-probe :as field]))

(defn emit [kind data]
  (println "W1_SMALL" (json/write-str {:attempt (System/getenv "W1_ATTEMPT") :kind kind :data data}))
  (flush))

(defn open [suffix]
  (let [scope (json/write-str ["triplex-scope-v1" "test" "small" (str (System/getenv "W1_ATTEMPT") "-" suffix) 0])
        opened (main/create-scope! nil scope "lean" true true) db (:db opened)]
    (assert (:created opened))
    [db (main/connection (main/db-uri db))]))

(defn byte-count [^String text] (alength (.getBytes text "UTF-8")))
(defn census [db report input]
  (let [t (Long/parseLong (get-in report [:t "v"])) view (d/db db)
        tx (first (d/tx-range (d/log db) t (inc t)))]
    (assert (= t (:t tx)))
    (assert (= (get input "operationId") (:operationId report)))
    (assert (= (select-keys report [:t :position :operationId])
               (select-keys (storage/operation view (:operationId report)) [:t :position :operationId])))
    (mapv (fn [x]
            (let [a (d/ident view (:a x)) v (:v x)
                  row (when (= a :triplex.entity/row) (lean/decode v))
                  as-text (if (string? v) v (pr-str v))]
              {:attribute a :field (:attribute row) :add (:added x) :packed (and row (not= v (slim/row-text v)))
               :valueBytes (byte-count as-text)
               :ednBytes (byte-count (pr-str [(:e x) a v (:tx x) (:added x)]))}))
          (:data tx))))

(defn correction
  ([subject serial old width] (correction subject serial old width false))
  ([subject serial old width run?]
  (let [{:keys [fresh input]} (field/correction subject serial (mapv :id old) width)
        tx (:tx_id (first fresh))
        run-id (fn [i] (str "Y" (field/pad serial 24) (char (+ (int \A) i))))
        owner-id (field/identity-id "Z" (+ (* serial 20) 12))
        input (if run?
                (-> input (update "newIds" #(mapv (fn [id] (if (= owner-id id) (run-id 0) id)) %))
                          (update "rows" #(mapv (fn [r] (if (= owner-id (get-in r ["id" "v"]))
                                                        (assoc-in r ["id" "v"] (run-id 0)) r)) %)))
                input)
        changes (concat
                  (for [r fresh] {:op "assert" :entityId (:entity_id r) :attribute (:attribute r)
                                  :value {:type "string" :value (:value_string r)} :tripleId (:id r)
                                  :validFrom (:valid_from r) :validTo (:valid_to r)})
                  (for [r old] {:op "retract" :entityId (:entity_id r) :attribute (:attribute r)
                                :tripleId (:id r) :recordedAt (:recorded_at r) :retractedAt field/clock}))
        jr (mapv (fn [i change]
                   (assoc (field/row (if run? (run-id (inc i)) (field/identity-id "Y" (+ (* serial 20) i))) tx ":_tx/change" nil tx 1)
                          :entity_type "_Transaction" :value_type "json" :value_json (json/write-str change)))
                 (range) changes)]
    {:fresh fresh :input (fixture/row-input (-> input
                                               (dissoc "rowTexts")
                                               (update "newIds" into (map :id jr))
                                               (update "rows" into (map storage/wire-row jr))))})))

(defn shape [width name conn input reply]
  (let [payload (dissoc input "readProfile")
        request (byte-count (json/write-str payload))
        pieces (into {} (map (fn [[k v]] [k (byte-count (json/write-str v))]) payload))]
    {:width width :db name :t (get-in reply [:t "v"]) :operation (:operationId reply) :position (get-in reply [:position "v"])
     :requestBytes request :requestByKey pieces :requestFramingBytes (- request (reduce + (vals pieces)))
     :data (census conn reply input)}))

(defn step [name conn serial width prior measured?]
  (let [{:keys [fresh input]} (correction width serial prior width)
        body (cond-> input measured? (assoc "readProfile" true))
        k (storage/head-position (d/db conn))
        reply (storage/commit! name conn (d/db conn) body)]
    (assert (= (:operationId reply) (get input "operationId")))
    (assert (= (inc k) (Long/parseLong (get-in reply [:position "v"]))))
    [(mapv #(assoc % :recorded_at (get-in reply [:recordedAt "v"])) fresh) body reply]))

(defn layout []
  ;; Alternate within each period so ordering bias cannot masquerade as an encoding gain.
  (let [arms (mapv (fn [arm packed?]
                     (let [[name conn] (open (str "layout-" arm))]
                       {:arm arm :packed packed? :name name :conn conn
                        :old (atom (into {} (for [width [1 3]] [width (first (step name conn width width [] false))])))}))
                   (range) [false true true false])]
    (doseq [i (range 160)
            a (if (zero? (mod (quot i 2) 2)) arms (rseq arms))]
      (let [{:keys [arm packed name conn old]} a width (if (even? i) 1 3)
            [fresh input reply] (with-redefs [small-row/enabled packed] (step name conn (+ 10 i) width (@old width) true))
            ms (:readProfile reply)]
        (assert (number? (:api-ms ms)))
        (when (>= i 32)
          (emit "layout" {:arm arm :packed packed :width width :index i :db name :op (:operationId reply)
                          :t (get-in reply [:t "v"]) :position (get-in reply [:position "v"])
                          :datoms (:datoms reply) :nativeMs (:api-ms ms) :io ms
                          :awaitMicros (:transactMicros reply) :timeline (:timeline reply)}))
        (when (< i 2)
          (let [s (shape width name conn input reply)]
            (assert (= packed (boolean (some (fn [r] (and (:add r) (:packed r))) (:data s)))))
            (emit "shape" (assoc s :arm arm :packed packed))))
        (swap! old assoc width fresh)))))

(defn candidates [serial n total]
  (mapv (fn [i]
          (let [prefix (str (field/pad serial 8) "/" (field/pad i 3) "/")
                len (+ (quot total n) (if (< i (mod total n)) 1 0))]
            (assert (>= len (count prefix)))
            (str prefix (apply str (repeat (- len (count prefix)) (char (+ 97 (mod (+ serial i) 26))))))))
        (range n)))

(defn factorial []
  (let [[name conn] (open "factorial")
        attr :w1.small/text
        cells (vec (for [n [4 16 48] bytes [2048 8192 24576]] [n bytes]))
        alone 60 blocks 32
        total (+ alone (* blocks (count cells)))]
    @(d/transact conn [{:db/ident attr :db/cardinality :db.cardinality/many :db/valueType :db.type/string :db/index true}])
    (loop [serial 0 previous (d/basis-t (d/db conn))]
      (when (< serial total)
        (let [j (- serial alone)
              block (quot (max j 0) (count cells))
              cell (mod (+ (if (even? block) j (- j)) block) (count cells))
              [n bytes] (cells cell)
              values (candidates serial n bytes)
              data (mapv #(vector :db/add "datomic.tx" attr %) values)
              start (System/nanoTime)
              reply @(d/transact-async conn data :io-context :w1.small/factorial)
              elapsed (/ (- (System/nanoTime) start) 1e6)
              view (:db-after reply) e (d/entid view attr) t (d/basis-t view)
              actual (filter #(= (:a %) e) (:tx-data reply))
              native (get-in reply [:io-stats :api-ms])]
          (assert (and (> t previous) (= n (count actual)) (every? :added actual)
                       (= (set values) (set (map :v actual))) (= bytes (reduce + (map (comp byte-count :v) actual)))
                       (number? native)))
          (when (>= serial alone)
            (emit "cost" {:db name :serial serial :block block :cell cell :t t :datoms (count (:tx-data reply))
                           :valueBytes bytes :nativeMs native :roundTripMs elapsed :io (:io-stats reply)}))
          (recur (inc serial) t))))))

(defn -main [mode]
  (if (= "layout" mode) (layout) (factorial))
  (shutdown-agents)
  (System/exit 0))
