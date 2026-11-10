(ns journal-export
 (:require [datomic.api :as d] [clojure.data.json :as json] [clojure.java.io :as io])
 (:import [java.security MessageDigest] [java.util HexFormat]))
;; [DX-S4] Why: isolate the actual journal strings, including envelopes, rather than a second literal subject-row copy. Rejected: inferring physical journal storage from logical text shares.
(defn decode-text [^String text]
 (let [start (+ 5 (Integer/parseInt text 1 5 16)) refsize (Integer/parseInt text (+ start 32) (+ start 36) 16)]
  (json/read-str (subs text (+ start 37 refsize)))))
(defn -main [base]
 (let [n (atom 0) changes (atom 0) bytes (atom 0) md (MessageDigest/getInstance "SHA-256")]
  (with-open [writer (io/writer "/attempt/journal-rowtexts.jsonl")]
   (doseq [name (d/get-database-names (.replace ^String base "datomic:sql://" "datomic:sql://*")) :when (not= name "tx2-health")]
    (let [jdbc (subs base (inc (.indexOf ^String base "?jdbc:")))
          conn (d/connect (str "datomic:sql://" name "?read-only=true#" jdbc)) db (d/db conn)
          journals (set (concat (map :e (d/datoms db :aevt :triplex.journal/position)) (map :e (d/datoms db :aevt :triplex.tx/position))))]
     (doseq [x (d/datoms db :aevt :triplex.entity/row) :when (journals (:e x))]
      (let [text (:v x) row (decode-text text) line (str (json/write-str [(Long/parseLong (str (nth row 0))) (nth row 2) text] :escape-slash false) "\n")]
       (.write writer line) (.update md (.getBytes line "UTF-8"))
       (swap! n inc) (swap! bytes + (alength (.getBytes ^String text "UTF-8")))
       (when (= (nth row 3) ":_tx/change") (swap! changes inc))))
     (d/release conn))))
  (println (json/write-str {:event "journal-export" :rows @n :changes @changes :row-text-bytes @bytes :sha256 (.formatHex (HexFormat/of) (.digest md))}))
  (when (not= [@n @changes @bytes] [800613 442624 363584827]) (throw (ex-info "unexpected native journal census" {:rows @n :changes @changes :bytes @bytes}))))
 (shutdown-agents))
