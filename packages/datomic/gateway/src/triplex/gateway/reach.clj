(ns triplex.gateway.reach
  (:require [datomic.api :as d] [triplex.gateway.storage :as storage])
  (:import [java.util ArrayDeque HashSet] [java.util.concurrent ConcurrentHashMap]))
(set! *warn-on-reflection* true)

;; [EXP-DX1] Why: immutable db plus pre-encoded row datoms removes per-row decoding and allocation.
;; Rejected: entity-map materialization (the gateway CPU bottleneck in R51).
(defn append-string! [^StringBuilder out ^String value]
  (.append out \")
  (dotimes [i (.length value)]
    (let [c (.charAt value i) n (int c)]
      (cond (= n 34) (.append out "\\\"") (= n 92) (.append out "\\\\")
            (or (< n 32) (> n 126)) (.append out (format "\\u%04x" n))
            :else (.append out c))))
  (.append out \") out)
(def ^ConcurrentHashMap ids (ConcurrentHashMap.))
(defn decline! [reason] (throw (ex-info reason {:declined reason})))
(defn entity-id [db name ^String id]
  (let [key [name id]]
    (or (.get ids key)
        (when-let [eid (d/entid db [:triplex.entity/id id])]
          (.putIfAbsent ids key eid) eid))))
(defn select-db [db basis]
  (let [scope (d/entity db (d/q '[:find ?s . :where [?s :triplex.scope/key]] db))
        head (:triplex.scope/position scope) p (get basis "recordedPosition") r (get basis "recordedAt")]
    (when-not (= 1 (:triplex.scope/rows-version scope)) (decline! "rows-version"))
    (when (:triplex.scope/irregular scope) (decline! "irregular"))
    (let [pt (when (and (some? p) (not= p head))
               (if-let [tx (d/entid db [:triplex.tx/position p])]
                 (d/tx->t tx) (decline! "interior-position")))
          rt (when (some? r)
               (let [a (d/entid db :triplex.tx/max-recorded-at)
                     datom (first (d/seek-datoms db :avet :triplex.tx/max-recorded-at (Math/nextUp (double r))))]
                 (when (and datom (= a (:a datom))) (dec (d/tx->t (:e datom))))))
          t (min (long (or pt (d/basis-t db))) (long (or rt (d/basis-t db))))]
      [(if (= t (d/basis-t db)) db (d/as-of db t)) (or p head) t])))
(defn bits [^String text ^long start]
  (Double/longBitsToDouble (Long/parseUnsignedLong (.substring text start (+ start 16)) 16)))
(defn response [name current input]
  (try
    (let [[db position t] (select-db current (get input "basis"))
          valid (double (get-in input ["basis" "validAt"]))
          root (get input "root") queue (ArrayDeque.) seen (HashSet.) out (StringBuilder. 65536)
          rows (volatile! 0) scanned (volatile! 0)]
      (.add queue root) (.add seen root)
      (.append out "{\"position\":") (.append out (long position))
      (.append out ",\"t\":\"") (.append out (long t)) (.append out "\",\"rows\":[")
      (while (not (.isEmpty queue))
        (let [id (.remove queue)]
          (when-let [eid (entity-id db name id)]
            ;; Cached ids must still be checked against this historical db, not the latest value.
            (when (:triplex.entity/row-overflow (d/entity db eid)) (decline! "row-overflow"))
            (let [it (.iterator ^Iterable (d/datoms db :eavt eid :triplex.entity/row))]
              (while (.hasNext it)
                (let [datom (.next it) ^String text (:v datom)
                      start (+ 5 (Integer/parseInt (.substring text 1 5) 16))
                      from (bits text start) end (+ start 16)
                      to (when-not (= "----------------" (.substring text end (+ end 16))) (bits text end))
                      ref-start (+ end 20) ref-size (Integer/parseInt (.substring text (+ end 16) ref-start) 16)]
                  (vswap! scanned inc)
                  (when (> (long @scanned) 100000) (decline! "row-budget"))
                  (when (and (<= from valid) (or (nil? to) (> (double to) valid)))
                    (when (>= (long @rows) 100000) (decline! "row-budget"))
                    (when (pos? (long @rows)) (.append out \,))
                    (.append out text (+ ref-start ref-size) (.length text))
                    (vswap! rows inc)
                    (when (pos? ref-size)
                      (let [ref (.substring text ref-start (+ ref-start ref-size))]
                        (when (.add seen ref)
                          (when (> (.size seen) 5000) (decline! "entity-budget"))
                          (.add queue ref)))))))))))
      (.append out "],\"entities\":") (.append out (.size seen))
      (.append out ",\"visited\":[")
      (let [it (.iterator seen) comma (volatile! false)]
        (while (.hasNext it)
          (when @comma (.append out \,)) (vreset! comma true)
          (append-string! out (.next it))))
      (.append out "]}")
      (.toString out))
    (catch clojure.lang.ExceptionInfo e
      (if-let [reason (:declined (ex-data e))] (str "{\"declined\":\"" reason "\"}") (throw e)))))
