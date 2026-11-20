(ns triplex.compact.floor
  (:require [clojure.data.json :as json]
            [clojure.string :as str]
            [datomic.api :as d])
  (:import [java.nio.charset StandardCharsets]
           [java.sql DriverManager]
           [java.util Random]))

(def attempt (System/getenv "COMPACT_ATTEMPT"))
(def source (System/getenv "COMPACT_SOURCE"))

(defn emit [kind row]
  (println "COMPACT" (json/write-str (assoc row :kind kind :attempt attempt :source source)))
  (flush))

(defn ms [nanos] (/ nanos 1e6))
(defn utf8 [^String s] (alength (.getBytes s StandardCharsets/UTF_8)))
(defn transact! [conn data]
  (let [report (deref (d/transact-async conn data) 60000 ::timeout)]
    (assert (not= ::timeout report))
    report))

(defn db-name [suffix]
  (str "compact-" (subs (str/replace attempt "-" "") 0 16) "-" suffix))

(defn open! [name]
  (let [uri (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" name)]
    (assert (d/create-database uri))
    (d/connect uri)))

(defn pg-sample []
  (with-open [conn (DriverManager/getConnection
                     (System/getenv "COMPACT_JDBC") "postgres" (System/getenv "COMPACT_SQL_PASSWORD"))
              statement (.createStatement conn)
              result (.executeQuery statement
                       (str "SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(),'0/0'),"
                            " pg_wal_lsn_diff(pg_current_wal_flush_lsn(),'0/0'),"
                            " wal_records, wal_fpi, wal_write, wal_write_time FROM pg_stat_wal"))]
    (assert (.next result))
    {:inserted (.getLong result 1) :flushed (.getLong result 2)
     :records (.getLong result 3) :fullPages (.getLong result 4)
     :writes (.getLong result 5) :writeMs (.getDouble result 6)}))

(defn index! [conn]
  (let [t (d/basis-t (d/db conn))]
    (d/request-index conn)
    (let [indexed (deref (d/sync-index conn t) 60000 nil)]
      (assert indexed "index did not catch up")
      t)))

(def schema
  [{:db/ident :floor/text :db/valueType :db.type/string :db/cardinality :db.cardinality/many}
   {:db/ident :floor/key :db/valueType :db.type/long :db/cardinality :db.cardinality/one
    :db/unique :db.unique/identity}
   {:db/ident :floor/lookups
    :db/fn (d/function
             '{:lang "clojure" :params [db keys ops] :requires [[datomic.api :as d]]
               :code (do
                       ;; [DX-COMPACT1] Why: vary serial seeks while holding the committed datoms fixed.
                       ;; Rejected: varying uniqueness and lookup count in the same treatment.
                       (doseq [k keys]
                         (when-not (= k (:v (first (d/datoms db :avet :floor/key k))))
                           (throw (ex-info "Floor lookup did not hit its witness" {:key k}))))
                       ops)})}])

(defn texts [serial n bytes]
  (let [rng (Random. serial)]
    (mapv
      (fn [i]
        (let [length (+ (quot bytes n) (if (< i (mod bytes n)) 1 0))
              chars (char-array length)]
          (aset-char chars 0 (char (+ 33 (mod i 94))))
          (dotimes [j (dec length)]
            (aset-char chars (inc j) (char (+ 33 (.nextInt rng 94)))))
          (String. chars)))
      (range n))))

(defn input [serial n bytes lookups members]
  (let [values (texts serial n bytes)
        ops (mapv (fn [i value] [:db/add (if (= 1 members) "datomic.tx" (str "m" (mod i members))) :floor/text value])
                  (range) values)]
    {:values values :bytes bytes :datoms n :members members
     :tx (if (nil? lookups)
           ops
           [[:floor/lookups (mapv #(mod (+ serial %) 64) (range lookups)) ops]])}))

(defn observed [report input]
  (let [db (:db-after report) datoms (:tx-data report)
        text-id (d/entid db :floor/text) instant-id (d/entid db :db/txInstant)
        text (filter #(= text-id (:a %)) datoms)
        t (d/basis-t db)]
    ;; [DX-COMPACT1] Why: confirm the durable result's exact value multiset and membership before counting it.
    ;; Rejected: counting futures that return successfully without checking the committed data.
    (assert (= (frequencies (:values input)) (frequencies (map :v text))))
    (assert (= (:bytes input) (reduce + (map (comp utf8 :v) text))))
    (assert (= (inc (:datoms input)) (count datoms)))
    (assert (= (:members input) (count (distinct (map :e text)))))
    (assert (every? #(and (:added %) (= (d/t->tx t) (:tx %))) datoms))
    (assert (= 1 (count (filter #(= instant-id (:a %)) datoms))))
    t))

(defn tuple [d] [(:e d) (:a d) (:v d) (:tx d) (:added d)])

(defn check-log! [conn checked]
  (let [by-t (into {} (map (fn [[t report]] [t (set (map tuple (:tx-data report)))]) checked))
        log (into {} (map (fn [tx] [(:t tx) (set (map tuple (:data tx)))])
                           (d/tx-range (d/log conn) (apply min (keys by-t)) (inc (apply max (keys by-t))))))]
    (assert (= (count checked) (count by-t)))
    (assert (= by-t log) "durable log differs from the acknowledged probes")))

(defn submit [conn input]
  (let [start (System/nanoTime)
        future (d/transact-async conn (:tx input) :io-context :compact-floor)]
    [start future input]))

(defn await [[start future input]]
  (let [report (deref future 60000 ::timeout)
        ack (System/nanoTime)]
    (assert (not= ::timeout report))
    {:start start :ack ack :report report :input input}))

(defn checked [row]
  (let [{:keys [report input start ack]} row
        t (observed report input)
        io (:io-stats report)]
    (assert (number? (:api-ms io)))
    {:t t :report report :peerMs (ms (- ack start)) :io io}))

(defn factorial! [conn]
  (let [cells (vec (for [n [1 4 8 16 32 64] bytes [100 1024 4096 16384] lookups [0 1 4 16 64]]
                     [n bytes lookups]))
        size (count cells)]
    ;; [DX-COMPACT1] Why: every block contains every cell and reverses order on alternate blocks.
    ;; Rejected: running the large payloads only after the JVM and indexes warm up.
    (doseq [block (range 12)]
      (let [before (pg-sample)
            rows (mapv (fn [column]
                         (let [cell (mod (+ (* 17 block) (if (even? block) column (- column))) size)
                               [n bytes lookups] (cells cell)
                               in (input (+ 10000 (* block size) cell) n bytes lookups 1)
                               row (checked (await (submit conn in)))]
                           (assoc row :cell cell :datoms (inc n) :valueBytes bytes :lookups lookups)))
                         (range size))
            after (pg-sample)]
        (check-log! conn (mapv (juxt :t :report) rows))
        (doseq [row rows] (emit "floor-cell" (-> row (dissoc :report) (assoc :block block))))
        (emit "floor-block" {:block block :before before :after after :cells (count rows)})))))

(defn burst [conn inputs depth]
  (let [start (System/nanoTime)
        n (count inputs)
        pending (into clojure.lang.PersistentQueue/EMPTY (map #(submit conn %) (take depth inputs)))
        rows (loop [pending pending i (min n depth) rows []]
               (if (empty? pending)
                 rows
                 (let [row (await (peek pending)) rest (pop pending)]
                   (recur (if (< i n) (conj rest (submit conn (nth inputs i))) rest)
                          (inc i) (conj rows row)))))
        wall (ms (- (:ack (peek rows)) start))]
    {:wallMs wall :rows rows}))

(defn quantile [x q]
  (let [v (vec (sort x))]
    (nth v (dec (int (Math/ceil (* (count v) q)))))))

(defn ceiling! [conn]
  (let [cells (vec (for [d [1 64] k [1 2 4 8 16 32 64 128]] [d k]))]
    (doseq [block (range 2) [depth members] (if (even? block) cells (rseq cells))]
      (let [n 120
            inputs (mapv #(input (+ 40000 (* block 100000) (* 200 members) %) members (* 100 members) nil members)
                         (range n))
            before (pg-sample)
            {:keys [wallMs rows]} (burst conn inputs depth)
            after (pg-sample)
            checked (mapv checked rows)]
        (check-log! conn (mapv (juxt :t :report) checked))
        (emit "floor-ceiling" {:block block :depth depth :members members :transactions n
                               :wallMs wallMs :before before :after after
                               :t (mapv :t checked)
                               :peerP50 (quantile (map :peerMs checked) 0.5)
                               :peerP99 (quantile (map :peerMs checked) 0.99)
                               :applyP50 (quantile (map (comp :api-ms :io) checked) 0.5)})))))

(defn -main [& _]
  (let [name (db-name "floor") conn (open! name)]
    (transact! conn schema)
    (transact! conn (mapv #(hash-map :db/id (str "key" %) :floor/key (long %)) (range 64)))
    (let [indexed (index! conn)]
      (emit "floor-start" {:database name :indexedThrough indexed :profile (System/getenv "COMPACT_PROFILE")}))
    (dotimes [i 500] (await (submit conn (input i 8 1024 (mod i 8) 1))))
    (factorial! conn)
    (ceiling! conn)
    (emit "floor-end" {:head (d/basis-t (d/db conn)) :database name})
    (d/release conn))
  (shutdown-agents)
  (System/exit 0))
