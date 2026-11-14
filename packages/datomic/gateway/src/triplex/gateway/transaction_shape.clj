(ns triplex.gateway.transaction-shape
  (:require [datomic.api :as d] [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.scope :as scope] [triplex.gateway.schema :as schema]))

;; [DX-T1-5] Why: inspect actual immutable log datoms after measurement, bound to an acknowledged operation and position.
;; Rejected: estimating log contents from the submitted transaction or running a census on the serial commit path.
(defn transaction [db log {:strs [operationId position]}]
  (let [tx (d/entid db [:triplex.tx/operation-id operationId])
        actual (when tx (:v (first (d/datoms db :eavt tx :triplex.tx/position))))]
    (when-not (and tx (integer? position) (= actual position))
      (throw (ex-info "Census native operation/position mismatch" {})))
    (let [t (d/tx->t tx) records (vec (d/tx-range log t (inc t)))]
      (when-not (and (= 1 (count records)) (= t (:t (first records))))
        (throw (ex-info "Census native log transaction missing" {})))
      (let [datoms (:data (first records))
            rows (mapv (fn [datom]
                         (let [attribute (d/ident db (:a datom)) v (:v datom)
                               value (if (string? v) v (pr-str v))]
                           (when-not attribute (throw (ex-info "Census attribute identity missing" {})))
                           {:attribute (str attribute) :added (:added datom)
                            :valueUtf8Bytes (alength (.getBytes ^String value "UTF-8"))
                            :ednUtf8Bytes (alength (.getBytes (pr-str [(:e datom) attribute v (:tx datom) (:added datom)]) "UTF-8"))})) datoms)
            attributes (mapv (fn [[attribute items]]
                               {:attribute attribute :datoms (count items)
                                :added (count (filter :added items)) :retracted (count (remove :added items))
                                :valueUtf8Bytes (reduce + (map :valueUtf8Bytes items))
                                :ednUtf8Bytes (reduce + (map :ednUtf8Bytes items))})
                             (sort-by key (group-by :attribute rows)))]
        {:operationId operationId :position position :t t :datoms (count rows)
         :valueUtf8Bytes (reduce + (map :valueUtf8Bytes rows))
         :ednUtf8Bytes (reduce + (map :ednUtf8Bytes rows)) :attributes attributes}))))

(defn -main [& _]
  (try
    (let [text (slurp *in*) input (json/read-str text)
          {scope-text "scope" commands "commands"} input
          started (System/currentTimeMillis)
          template (System/getenv "DATOMIC_URI_TEMPLATE")]
      (when-not (and template (<= 1 (count commands) 128)
                     (= (get input "run") (System/getenv "TRIPLEX_TRACE_RUN"))
                     (= (get input "source") (System/getenv "TRIPLEX_TRACE_SOURCE"))
                     (= (get input "slot") (System/getenv "TRIPLEX_TRACE_SLOT")))
        (throw (ex-info "Census attempt binding mismatch" {})))
      (let [conn (d/connect (str/replace template "{db}" (scope/name-for scope-text)))
            db (deref (d/sync conn) 30000 ::timeout)
            _ (when (= db ::timeout) (throw (ex-info "Census sync deadline" {})))
            stored (:v (first (d/datoms db :aevt :triplex.scope/key)))]
        (when-not (= stored scope-text) (throw (ex-info "Census source scope mismatch" {})))
        (let [transactions (mapv #(transaction db (d/log conn) %) commands)]
        (println (json/write-str
                   {:schema "triplex.transaction-shape.v1" :run (get input "run") :source (get input "source")
                    :slot (get input "slot") :scope scope-text :requestHash (schema/sha256 text)
                    :startedAt started :endedAt (System/currentTimeMillis)
                    :transactions transactions
                    :units "Actual log datoms; string UTF-8 and nonstring EDN value bytes. EDN datom bytes are an uncompressed representation, not physical Fressian/storage bytes."})))
        (shutdown-agents)
        (System/exit 0)))
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
