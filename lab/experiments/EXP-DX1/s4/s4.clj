(ns s4
  (:require [datomic.api :as d] [clojure.data.json :as json] [clojure.java.io :as io] [clojure.string])
  (:import [java.util Date Base64] [java.security MessageDigest] [java.util HexFormat]))
;; [DX-S4] Why: use one peer for census and maintenance, never the live gateway. Rejected: adding an admin route to product code.
(defn emit [x] (println (json/write-str x)) (flush))
(defn attribute-datoms [db attr] (if (d/entid db attr) (d/datoms db :aevt attr) []))
(defn row-proof [db]
 (let [md (MessageDigest/getInstance "SHA-256") n (atom 0)]
  (doseq [x (attribute-datoms db :triplex.entity/row)]
   (.update md (.getBytes (str (:e x) "|" (:tx x) "|" (:added x) "|" (:v x) "\n") "UTF-8"))
   (swap! n inc))
  {:rows @n :sha256 (.formatHex (HexFormat/of) (.digest md))}))
(defn decode-text [^String text]
 (let [start (+ 5 (Integer/parseInt text 1 5 16))
       refsize (Integer/parseInt text (+ start 32) (+ start 36) 16)]
  (json/read-str (subs text (+ start 37 refsize)))))
(defn row-anatomy [db journals]
 (let [domain-ids (set (for [x (attribute-datoms db :triplex.entity/row) :when (not (journals (:e x)))]
                       (let [^String text (:v x)] (subs text 5 (+ 5 (Integer/parseInt text 1 5 16))))))]
  (reduce (fn [m x]
    (let [r (decode-text (:v x)) k (str (if (journals (:e x)) "journal/" "subject/") (nth r 3))
          payload (nth r 9) change (when (and (string? payload) (= (nth r 3) ":_tx/change")) (json/read-str payload))]
     (-> m (update-in [k :rows] (fnil inc 0))
           (update-in [k :row-text-bytes] (fnil + 0) (alength (.getBytes ^String (:v x) "UTF-8")))
           (update-in [k :json-payload-bytes] (fnil + 0) (if (string? payload) (alength (.getBytes ^String payload "UTF-8")) 0))
           (update-in [k :changes-matching-subject-row-id] (fnil + 0) (if (and change (domain-ids (get change "tripleId"))) 1 0)))))
   {} (attribute-datoms db :triplex.entity/row))))
(defn export-subject-rows [db]
 (let [journals (set (concat (map :e (attribute-datoms db :triplex.journal/position)) (map :e (attribute-datoms db :triplex.tx/position))))
       retired (reduce (fn [m x] (let [^String text (:v x)] (update m (:e x) (fnil conj #{}) (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))) {} (attribute-datoms db :triplex.entity/retired))
       n (atom 0) seen (atom #{}) historical (atom 0)]
  (with-open [writer (io/writer "/attempt/subject-rowtexts.jsonl")]
   (doseq [x (attribute-datoms db :triplex.entity/row) :when (not (journals (:e x)))
           :let [^String text (:v x) prefix (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))]
           :when (not (contains? (get retired (:e x) #{}) prefix))]
    (.write writer (str (json/write-str [(nth (decode-text text) 2) text] :escape-slash false) "\n"))
    (swap! seen conj prefix)
    (swap! n inc)))
  (with-open [writer (io/writer "/attempt/retired-subject-rowtexts.jsonl")]
   (doseq [x (attribute-datoms (d/history db) :triplex.entity/row)
           :when (and (:added x) (not (journals (:e x))))
           :let [^String text (:v x) prefix (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))]
           :when (not (contains? @seen prefix))]
    (.write writer (str (json/write-str [(nth (decode-text text) 2) text] :escape-slash false) "\n"))
    (swap! historical inc)))
  (emit {:event "subject-export" :rows @n :retired-historical-assertions @historical :path "/attempt/subject-rowtexts.jsonl"})))
(defn census [db]
 (let [idents (into {} (map (fn [x] [(:e x) (str (:v x))]) (d/datoms db :aevt :db/ident)))
       journal-ids (set (map :e (attribute-datoms db :triplex.journal/position)))
       txids (set (map :e (attribute-datoms db :triplex.tx/position)))
       stats (fn [view]
        (reduce (fn [m x]
          (let [a (get idents (:a x) (str (:a x)))
                k (if (= a ":triplex.entity/row") (str a (if (or (journal-ids (:e x)) (txids (:e x))) "/journal" "/subject")) a)
                n (if (string? (:v x)) (alength (.getBytes ^String (:v x) "UTF-8")) 0)]
           (-> m (update-in [k :datoms] (fnil inc 0))
                 (update-in [k :string-bytes] (fnil + 0) n)
                 (update-in [k (if (:added x) :assertions :retractions)] (fnil inc 0)))))
         {} (d/datoms view :eavt)))]
  {:basis-t (d/basis-t db) :current-row-proof (row-proof db) :history-row-proof (row-proof (d/history db)) :row-anatomy (row-anatomy db (into journal-ids txids)) :current (stats db) :history (stats (d/history db))}))
(defn maintain [conn]
 ;; [DX-S4] Why: physical clones can return a connection while their transactor is still loading the database. Rejected: a fixed startup sleep (anatomy3 observed request-index/no database).
 (let [synced (deref (d/sync conn) 120000 ::timeout)
       _ (when (= ::timeout synced) (throw (ex-info "transactor sync timeout" {})))
       t (d/basis-t synced)]
  (loop [i 0]
   (let [result (try {:requested (d/request-index conn)} (catch Throwable e {:error e}))]
    (if (:error result)
     (if (< i 30) (do (emit {:event "index-retry" :attempt i :error (str (:error result))}) (Thread/sleep 1000) (recur (inc i))) (throw (:error result)))
     (emit {:event "request-index" :t t :requested (:requested result)}))))
  (let [db (deref (d/sync-index conn t) 180000 ::timeout)]
   (when (= ::timeout db) (throw (ex-info "index timeout" {:t t})))
   (emit {:event "index-complete" :basis-t (d/basis-t db)}))
  (Thread/sleep 2000)
  (let [cutoff (Date.) result (d/gc-storage conn cutoff)
        done (if (instance? clojure.lang.IDeref result) (deref result 180000 ::timeout) result)]
   (when (= ::timeout done) (throw (ex-info "gc timeout" {})))
   (emit {:event "gc-scheduled" :older-than (str cutoff) :result (str done)}))))
;; [DX-S4] Why: measurement is bound to the exact multiset of stored values, including entity ownership. Rejected: row counts alone (a truncated or substituted load could have the same count).
(defn digest [^String s] (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") (.getBytes s "UTF-8"))))
(defn value-proof [db variant]
 (let [grouped (.startsWith ^String variant "e")
       values (mapcat (fn [x]
          (let [id (:v (first (d/datoms db :eavt (:e x) :s4/id)))
                vs (if grouped (json/read-str (:v x)) [(:v x)])]
           (for [v vs] (digest (str id "\n" (if (= variant "d") (.encodeToString (Base64/getEncoder) ^bytes v) v))))))
          (d/datoms db :aevt :s4/row))
       sorted-values (sort values)]
  {:rows (count values) :sha256 (digest (clojure.string/join "\n" sorted-values))
   ;; [DX-S4] Why: enumerate dictionary datoms explicitly; cont6 caught map receiving only a function and yielding a transducer. Rejected: trusting compilation without exercising the binary proof branch.
   :dictionary-sha256
   (when (= variant "d")
    (digest
     (clojure.string/join "\n"
      (sort
       (for [x (d/datoms db :aevt :s4/dictionary)]
        (let [id (:v (first (d/datoms db :eavt (:e x) :s4/id)))]
         (digest (str id "\n" (String. ^bytes (:v x) "UTF-8")))))))))}))
;; [DX-S4] Why: reproduce H6 gateway-floor.mjs eight-cell projection exactly for its size-only variant. Rejected: calling metadata removal lossless.
(defn compact-projection [text]
 (let [r (json/read-str text) kind (nth r 4)
       value (case kind ("string" "ref" "integer") (nth r 5) "boolean" (nth r 7) "json" (nth r 9) "number" (nth r 6) "datetime" (nth r 8) (throw (ex-info "unsupported compact type" {:kind kind})))]
  (json/write-str [(Long/parseLong (nth r 0)) (nth r 1) (nth r 3) kind value (nth r 10) (nth r 11) (nth r 12)] :escape-slash false)))
(defn connect-retry [uri]
 (loop [attempt 0]
  (let [result (try {:conn (d/connect uri)} (catch Throwable e {:error e}))]
   (if-let [conn (:conn result)] conn
    (if (< attempt 12)
     (do (emit {:event "connect-retry" :attempt attempt :error (str (:error result))}) (Thread/sleep 3000) (recur (inc attempt)))
     (throw (:error result)))))))
(defn -main [& args]
 (let [[mode base variant] args]
  (emit {:event "api-docs" :gc-storage (:doc (meta #'d/gc-storage)) :request-index (:doc (meta #'d/request-index)) :sync-index (:doc (meta #'d/sync-index)) :gc-tool-source (some-> (io/resource "datomic/tools/gc_db.clj") slurp)})
  (case mode
   "clone" (let [names (d/get-database-names (.replace ^String base "datomic:sql://" "datomic:sql://*"))]
     (emit {:event "databases" :names names})
     (doseq [name (sort-by #(if (= % "tx2-health") 1 0) names)]
      (let [uri (.replace ^String base "datomic:sql://" (str "datomic:sql://" name))
            jdbc (subs base (inc (.indexOf ^String base "?jdbc:")))
            ro (d/connect (str "datomic:sql://" name "?read-only=true#" jdbc))]
       (emit {:event "census-before" :database name :census (census (d/db ro))})
       (when (not= name "tx2-health") (export-subject-rows (d/db ro)))
       (d/release ro)
       (let [conn (connect-retry uri)]
        (maintain conn)
        (emit {:event "census-after" :database name :census (census (d/db conn))})
        (d/release conn)))))
   "variant" (let [uri (.replace ^String base "datomic:sql://" (str "datomic:sql://s4"))
         _ (when-not (d/create-database uri) (throw (ex-info "scratch database already exists" {}))) conn (d/connect uri)
         packed (= variant "d") grouped (.startsWith ^String variant "e")
         schema (cond-> {:db/ident :s4/row :db/valueType (if packed :db.type/bytes :db.type/string)
                         :db/cardinality (if grouped :db.cardinality/one :db.cardinality/many)}
                   (#{"a" "f"} variant) (assoc :db/index true)
                   (= variant "e-nohistory") (assoc :db/noHistory true))
         states (atom {}) n (atom 0) txs (atom 0)]
    @(d/transact conn [schema {:db/ident :s4/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}])
    (when packed
     @(d/transact conn [{:db/ident :s4/dictionary :db/valueType :db.type/bytes :db/cardinality :db.cardinality/one}])
     (with-open [r (io/reader "/input/dictionary.json")]
      (let [dict (json/read r)]
       (doseq [[i chunk] (map-indexed vector (partition-all 1000 dict))]
        @(d/transact conn [{:s4/id (str "dictionary/" i) :s4/dictionary (.getBytes (json/write-str chunk :escape-slash false) "UTF-8")}])))))
    (with-open [reader (io/reader "/input/variants.jsonl")
                journal-reader (io/reader (if (= variant "f") "/journals/variants.jsonl" (java.io.StringReader. ""))) ]
     (doseq [line (line-seq reader)]
      (let [[position rows] (json/read-str line)
            entities (group-by first rows)
            maps (mapv (fn [[id rr]]
              (let [values (mapv #(case variant "c" (compact-projection (nth % 2)) "c-full" (nth % 2) "d" (.decode (Base64/getDecoder) ^String (nth % 3)) (nth % 1)) rr)]
               (if grouped
                (let [all (get (swap! states update id (fnil into []) values) id)] {:s4/id id :s4/row (json/write-str all :escape-slash false)})
                {:s4/id id :s4/row values}))) entities)
            ;; [DX-S4] Why: f must use the actual journal change objects/envelopes from this sealed clone. Rejected: a literal second copy (different compression and size).
            maps (if (= variant "f")
                   (let [[journal-position journal-rows] (json/read-str (.readLine ^java.io.BufferedReader journal-reader))]
                    (when (not= position journal-position) (throw (ex-info "journal command mismatch" {:subject position :journal journal-position})))
                    (into maps (map (fn [[id rr]] {:s4/id id :s4/row (mapv second rr)}) (group-by first journal-rows)))) maps)]
       @(d/transact conn maps)
       (swap! n + (count rows)); (swap! txs inc)
       (swap! txs inc)
       (when (zero? (mod @txs 1000)) (emit {:event "progress" :variant variant :commands @txs :rows @n}))))
     (when (and (= variant "f") (.readLine ^java.io.BufferedReader journal-reader)) (throw (ex-info "extra journal command" {}))))
    (emit {:event "loaded" :variant variant :commands @txs :rows @n :basis-t (d/basis-t (d/db conn))})
    (maintain conn)
    (emit {:event "value-proof" :variant variant :proof (value-proof (d/db conn) variant)})
    (emit {:event "census-final" :variant variant :census (census (d/db conn))})
    (d/release conn))
   (throw (ex-info "unknown mode" {:mode mode}))))
 ;; [DX-S4] Why: scratch creation retained a non-daemon Artemis notifier after shutdown-agents alone (cont4 thread dump). Rejected: blessing a hung peer or forcing a success exit.
 (emit {:event "peer-shutdown-begin"})
 (d/shutdown true)
 (emit {:event "peer-shutdown-complete"}))
