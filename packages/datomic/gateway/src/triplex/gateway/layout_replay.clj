(ns triplex.gateway.layout-replay
  (:refer-clojure :exclude [run!])
  (:require [datomic.api :as d] [datomic.db :as native] [datomic.log :as log]
            [datomic.measure.io-stats :as io-stats] [clojure.data.json :as json]
            [clojure.edn :as edn] [clojure.walk :as walk] [clojure.java.io :as io] [clojure.set :as set]
            [triplex.gateway.commit :as commit] [triplex.gateway.schema :as schema]
            [triplex.gateway.lean :as lean])
  (:import [java.util UUID] [java.nio ByteBuffer]))

;; [DX-T1-11] Why: these shapes exist only as pure peer replays, never as stored schemas or gateway route switches.
;; Rejected: rebuilding seeds or treating a speculative codec check as a complete query/oracle verdict.
(def shapes ["A" "B" "C" "D" "E"])
(def replay-schema
  [(assoc (schema/attr :triplex.replay/packed :db.type/string) :db/cardinality :db.cardinality/many)
   (schema/attr :triplex.replay/command-id :db.type/string :db.unique/value)
   (schema/attr :triplex.replay/max-row-id :db.type/string)
   (schema/attr :triplex.replay/owner :db.type/string)
   (assoc (schema/attr :triplex.replay/row :db.type/string) :db/cardinality :db.cardinality/many)
   (assoc (schema/attr :triplex.replay/retired :db.type/string) :db/cardinality :db.cardinality/many)])
(defn value [db e a] (:v (first (d/datoms db :eavt e a))))
(defn id-key [^String id] (str (format "%04x" (.length id)) id))
(defn text-id [^String text] (let [n (Integer/parseInt text 1 5 16)] (subs text 5 (+ 5 n))))
(defn id-max [a b] (if (pos? (compare (id-key a) (id-key b))) a b))

;; [DX-T1-11] Why: splice complete JSON column tokens, respecting quotes, escapes and nested values.
;; Rejected: split on commas (change JSON, strings and arrays can contain commas).
(defn column-ranges [^String text start]
  (loop [i (inc start) begin (inc start) depth 0 quoted false escaped false out []]
    (when (>= i (.length text)) (throw (ex-info "Unterminated replay row" {})))
    (let [ch (.charAt text i)]
      (cond
        quoted (recur (inc i) begin depth (not (and (= ch \u0022) (not escaped)))
                      (and (= ch \\) (not escaped)) out)
        (= ch \u0022) (recur (inc i) begin depth true false out)
        (or (= ch \[) (= ch \{)) (recur (inc i) begin (inc depth) false false out)
        (and (= ch \]) (zero? depth)) (conj out [begin i])
        (or (= ch \]) (= ch \})) (recur (inc i) begin (dec depth) false false out)
        (and (= ch \,) (zero? depth)) (recur (inc i) (inc i) depth false false (conj out [begin i]))
        :else (recur (inc i) begin depth false false out)))))
(defn splice-row [^String text offset clock assign-change]
  (let [ranges (column-ranges text (- offset 2))
        _ (when-not (= 17 (count ranges)) (throw (ex-info "Replay row column count" {})))
        token (fn [i] (let [[a b] (nth ranges i)] (subs text a b)))
        attribute (json/read-str (token 3)) journal (= "\"_Transaction\"" (token 14))
        changes (cond-> {10 (json/write-str clock)}
                  (and journal (= attribute ":_tx/instant")) (assoc 8 (json/write-str clock))
                  (and journal (= attribute ":_tx/change"))
                  (assoc 9 (json/write-str (assign-change (json/read-str (token 9))))))]
    (reduce (fn [s [i replacement]] (let [[a b] (nth ranges i)] (str (subs s 0 a) replacement (subs s b))))
            text (sort-by key > changes))))
(def base-code (commit/expand-code 'identity))
(def c-code
  (walk/postwalk
    (fn [form]
      (cond
        (and (seq? form) (= 'assign-row (first form)) (vector? (second form)))
        '(assign-row [text offset clock new-ids prior-rows]
           ;; [DX-THIN1] Why: splicing uses the checked predecessor metadata from the serial writer.
           ;; Rejected: reconstructing a retraction from the proposed journal text.
           (triplex.gateway.layout-replay/splice-row text offset clock
             #(assign-change % clock new-ids prior-rows)))
        (and (seq? form) (= 'identity-row (first form)) (vector? (second form)))
        '(identity-row [id]
           (let [high (:replay/watermark payload)
                 key (str (format "%04x" (.length ^String id)) id)]
             (when (or (nil? high) (not (pos? (compare key high))))
               (let [prefix (str "2" key) datom (first (d/index-range (d/history db) :triplex.entity/row prefix nil))]
                 (when (and datom (.startsWith ^String (:v datom) prefix)) datom)))))
        :else form)) base-code))
(def expand-a (delay (binding [*ns* (the-ns 'triplex.gateway.layout-replay)] (eval (list 'fn '[db payload] base-code)))))
(def expand-c (delay (binding [*ns* (the-ns 'triplex.gateway.layout-replay)] (eval (list 'fn '[db payload] c-code)))))
(defn pack-rows [rows] (apply str (map #(str (.length ^String %) ":" %) rows)))
(defn unpack-rows [^String text]
  (loop [i 0 out []]
    (if (= i (.length text)) out
      (let [colon (.indexOf text ":" (int i))
            _ (when (= -1 colon) (throw (ex-info "Replay frame length missing" {})))
            n (Long/parseLong (subs text i colon)) start (inc colon) end (+ start n)]
        (when-not (<= 0 n (- (.length text) start)) (throw (ex-info "Replay frame outside bounds" {})))
        (recur end (conj out (subs text start end)))))))
(defn pack [ops journals]
  (let [journal? (fn [op] (and (vector? op) (= :db/add (first op)) (= :triplex.entity/row (nth op 2 nil))
                              (journals (second op))))
        rows (group-by second (filter journal? ops))]
    (vec (concat (remove journal? ops)
                 (for [[e xs] (sort-by key rows)] [:db/add e :triplex.replay/packed (pack-rows (mapv #(nth % 3) xs))])))))
(defn expand [shape db payload]
  (let [journals (set (map #(str "e:" %) (:journal-entities payload)))
        ;; [DX-THIN1] Why: preserve the writer's serial checks for every claimed live assertion.
        ;; Rejected: stripping untimed predecessors from the replay payload before validating it.
        payload (if (= shape "C")
                  (assoc payload :replay/watermark (when (:replay/head payload)
                                                    (value db (:replay/head payload) :triplex.replay/max-row-id)))
                  payload)
        base ((if (= shape "C") @expand-c @expand-a) db payload)
        packed (if (contains? #{"B" "C"} shape) (pack base journals) base)]
    (case shape
      "C" (let [claims (filter #(and (map? %) (:triplex.claim/command-id %)) packed)
                packed (if (= 1 (count claims))
                         (conj (vec (remove #(and (map? %) (:triplex.claim/command-id %)) packed))
                               [:db/add "datomic.tx" :triplex.replay/command-id (:triplex.claim/command-id (first claims))]) packed)
                old (:replay/watermark payload)
                high (reduce #(if (pos? (compare %1 %2)) %1 %2) (or old "") (map id-key (:new-ids payload)))]
            (conj packed [:db/add "datomic.tx" :triplex.replay/max-row-id high]))
      "D" base
      "E" (let [row? (fn [op] (and (vector? op) (contains? #{:db/add :db/retract} (first op))
                                   (= :triplex.entity/row (nth op 2 nil))))
                owners (set (map second (filter row? base)))
                owner-id (fn [e] (if (string? e) (subs e 2) (value db e :triplex.entity/id)))
                new-id #(str "replay:" (owner-id %))]
            (vec (concat
                   (map (fn [op] (if (row? op)
                                  [:db/add (new-id (second op)) (if (= :db/retract (first op)) :triplex.replay/retired :triplex.replay/row) (nth op 3)] op)) base)
                   (for [e (sort-by str owners)] [:db/add (new-id e) :triplex.replay/owner (owner-id e)]))))
      packed)))
(defn functions []
  (mapv (fn [shape]
          {:db/ident (keyword "triplex.replay" (str "apply-" shape))
           :db/fn (d/function {:lang :clojure :params '[db payload]
                               :requires '[[triplex.gateway.layout-replay :as replay]]
                               :code (list 'replay/expand shape 'db 'payload)})}) shapes))
(defn current-head [db]
  (:e (first (d/rseek-datoms db :aevt :triplex.tx/position (d/t->tx (d/basis-t db))))))
(defn history-high [db]
  (reduce (fn [m datom] (let [s (:v datom)] (if (and (string? s) (.startsWith ^String s "2"))
                                           (let [id (text-id s)] (if m (id-max m id) id)) m)))
          nil (d/datoms (d/history db) :aevt :triplex.entity/row)))
(defn logical-delta [report]
  (let [db (:db-after report) attrs (into {} (for [a [:triplex.entity/row :triplex.replay/packed :triplex.replay/row :triplex.replay/retired]] [a (d/entid db a)]))
        owner (fn [e] (or (value db e :triplex.entity/id) (value db e :triplex.replay/owner)))
        entries (mapcat (fn [x]
                          (let [a (:a x) e (:e x) v (:v x) add (:added x)]
                            (cond
                              (= a (:triplex.entity/row attrs)) [[(owner e) v add]]
                              (= a (:triplex.replay/packed attrs)) (mapv #(vector (owner e) % add) (unpack-rows v))
                              (= a (:triplex.replay/row attrs)) [[(owner e) v add]]
                              (= a (:triplex.replay/retired attrs)) [[(owner e) v (not add)]]
                              :else []))) (:tx-data report))]
    ;; [DX-T1-11] Why: clock splicing preserves logical strings while retaining their submitted JSON escape spelling.
    ;; Rejected: require identical JSON source bytes, or equate positive and negative zero in a value check.
    (set (map (fn [[owner text added]]
                [owner (into (sorted-map) (map (fn [[k v]] [k (if (or (double? v) (float? v))
                                                               {:doubleBits (Long/toHexString (Double/doubleToRawLongBits (double v)))} v)])
                                               (lean/decode text))) added]) entries))))
(defn utf8 [s] (alength (.getBytes ^String s "UTF-8")))
(defn shape-payload [shape payload]
  ;; [DX-T1-11] Why: N1's omitted rows would not be generated or sent, so filtering is input preparation, not serial apply work.
  ;; Rejected: decode and discard their full text after the original serial rewrite (prices work the proposed layout removes).
  (if (= shape "D")
    (update payload :ops #(vec (remove (fn [op]
                                       (and (vector? op) (= :triplex/assert (first op))
                                            (contains? #{":_tx/change" ":_tx/changed-entity"}
                                                       (:attribute (lean/decode (get-in op [3 1])))))) %))) payload))
(defn apply-one [db shape payload]
  ;; [DX-T1-11] Why: native with-tx is public d/with's implementation before it discards :tx-stats.
  ;; Rejected: treating peer replay wall time as durable end-to-end commit latency.
  (let [payload (shape-payload shape payload) start (System/nanoTime)
        measured (io-stats/throw-if-ex!
                   (io-stats/with-io-stats #(native/with-tx db (native/get-prefetch-dispatcher)
                                          [[(keyword "triplex.replay" (str "apply-" shape)) payload]])
                                          {:io-context :triplex/replay :api :with}))
        report (:ret measured) elapsed (/ (- (System/nanoTime) start) 1e6) datoms (:tx-data report)
        bytes (.remaining ^ByteBuffer (log/fressianed-tx {:id (UUID. 0 1) :t (d/basis-t (:db-after report)) :data datoms}))]
    {:report report :stats {:wallMs elapsed :txStats (:tx-stats report) :ioStats (:io-stats measured)
                           :datoms (count datoms) :fressianBytes bytes
                           :valueUtf8Bytes (reduce + (map #(utf8 (if (string? (:v %)) (:v %) (pr-str (:v %)))) datoms))}}))

(defn run! [captured root]
  (let [selection-text (slurp (io/file root "layout-selection.json"))
        selection (json/read-str selection-text)
        _ (when-not (= (select-keys selection ["run" "source" "slot"])
                        {"run" (System/getenv "TRIPLEX_TRACE_RUN") "source" (System/getenv "TRIPLEX_TRACE_SOURCE")
                         "slot" (System/getenv "TRIPLEX_TRACE_SLOT")})
            (throw (ex-info "Replay selection belongs to another source/attempt" {})))
        commands (into {} (map #(vector (get % "operationId") %) (get selection "commands")))
        eligible (filter #(when-let [w (commands (:operationId %))]
                            (when-not (and (= (:facts %) (get w "facts"))
                                           (= (get-in % [:data 0 1 :triplex-trace :traceId]) (get w "traceId")))
                              (throw (ex-info "Replay payload/primary trace mismatch" {}))) true) captured)
        samples (vec (mapcat (fn [b] (take 100 (filter #(= b (:band %)) (sort-by :datomicT eligible)))) ["small" "medium" "large"]))
        started (System/currentTimeMillis) out (io/file root "layout-replay.jsonl")
        captures (mapv #(dissoc % :db :conn) samples)
        _ (spit (io/file root "layout-payloads.edn") (pr-str captures))
        _ (spit (io/file root "layout-captures.jsonl")
                (apply str (map #(str (json/write-str (assoc (dissoc % :data)
                                                           :schema "triplex.layout-capture.v1"
                                                           :run (System/getenv "TRIPLEX_TRACE_RUN")
                                                           :source (System/getenv "TRIPLEX_TRACE_SOURCE")
                                                           :slot (System/getenv "TRIPLEX_TRACE_SLOT")
                                                           :dataEdn (pr-str (:data %)))) "\n") captures)))
        counts (frequencies (map :band samples))
        _ (when-not (= {"small" 100 "medium" 100 "large" 100} counts)
            (throw (ex-info "Replay requires exactly 100 captured payloads per band" {:counts counts})))
        conn (:conn (first samples)) before (d/basis-t (d/db conn))
        additions (vec (concat replay-schema (functions)))
        ;; [DX-T1-11] Why: bootstrap the hypothetical watermark by an exhaustive history scan outside measured replay.
        ;; Rejected: trusting the largest id in this sample or using a watermark that omits older/retired rows.
        sorted (vec (sort-by :basisT samples)) high (atom nil) previous (atom nil)]
    (with-open [writer (io/writer out)]
      (doseq [[index sample] (map-indexed vector sorted)]
        (let [raw (:db sample) t (:basisT sample)
              _ (if (nil? @previous) (reset! high (history-high raw))
                    (doseq [tx (d/tx-range (d/log conn) (inc @previous) (inc t))
                            x (:data tx) :when (= (:a x) (d/entid raw :triplex.entity/row))]
                      (when (and (:added x) (.startsWith ^String (:v x) "2"))
                        (swap! high #(if % (id-max % (text-id (:v x))) (text-id (:v x)))))))
              _ (reset! previous t) head (current-head raw)
              prepared (:db-after (d/with raw additions))
              db (if (and head @high)
                   (:db-after (d/with prepared [[:db/add head :triplex.replay/max-row-id (id-key @high)]])) prepared)
              payload (assoc (get-in sample [:data 0 1]) :replay/head head)
              expected (:report (apply-one db "A" payload))
              logical (logical-delta expected)
              ;; [DX-T1-11] Why: rotate every payload's shape order, warm each shape, then measure forward/reverse rounds.
              ;; Rejected: always give one shape the cold cache/JIT or compare unrelated payload populations.
              order (vec (concat (drop (mod index 5) shapes) (take (mod index 5) shapes)))]
          (doseq [shape order] (apply-one db shape payload))
          (doseq [round (range 2) shape (if (zero? round) order (reverse order))]
            (let [{:keys [report stats]} (apply-one db shape payload)
                  actual (logical-delta report) dropped (set/difference logical actual) equal (= logical actual)]
              (when (and (not= shape "D") (not equal))
                (throw (ex-info "Speculative logical delta differs" {:shape shape :operation (:operationId sample)
                                                                    :missing (count dropped) :extra (count (set/difference actual logical))})))
              (.write writer (str (json/write-str
                (merge stats {:schema "triplex.layout-replay.v1" :run (System/getenv "TRIPLEX_TRACE_RUN")
                              :source (System/getenv "TRIPLEX_TRACE_SOURCE") :slot (System/getenv "TRIPLEX_TRACE_SLOT")
                              :operationId (:operationId sample) :facts (:facts sample) :band (:band sample)
                              :basisT t :datomicT (:datomicT sample) :capturedAt (:capturedAt sample) :shape shape :round round
                              :logicalDeltaEqual equal :omittedLogicalRows (count dropped)
                              :payloadSha256 (schema/sha256 (pr-str (:data sample))) :startedAt started})) "\n"))))))
      (.flush writer))
    (let [after (d/basis-t (d/db conn))]
      (when-not (= before after) (throw (ex-info "Engine advanced during pure replay" {:before before :after after})))
      (spit (io/file root "layout-replay-complete.json")
            (json/write-str {:schema "triplex.layout-replay-complete.v1" :run (System/getenv "TRIPLEX_TRACE_RUN")
                             :source (System/getenv "TRIPLEX_TRACE_SOURCE") :slot (System/getenv "TRIPLEX_TRACE_SLOT")
                             :startedAt started :endedAt (System/currentTimeMillis) :counts counts :records 3000
                             :basisBefore before :basisAfter after
                             :payloadSha256 (schema/sha256 (slurp (io/file root "layout-payloads.edn")))
                             :selectionSha256 (schema/sha256 selection-text)
                             :capturedCount (count captured) :eligibleCount (count eligible)
                             :capturesSha256 (schema/sha256 (slurp (io/file root "layout-captures.jsonl")))
                             :recordsSha256 (schema/sha256 (slurp out))})))))
