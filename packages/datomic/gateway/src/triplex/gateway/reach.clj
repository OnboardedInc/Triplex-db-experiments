(ns triplex.gateway.reach
  (:require [datomic.api :as d])
  (:import [java.util ArrayDeque HashSet] [java.util.concurrent ConcurrentHashMap]))
(set! *warn-on-reflection* true)

;; [DX-B2-N1] Why: immutable datoms and cached numeric identifiers keep the reach path at index cost.
;; Rejected: entity maps, per-row keyword lookup and a second seek for overflow.
(defn append-string! [^StringBuilder out ^String value]
  (.append out \" )
  (dotimes [i (.length value)]
    (let [c (.charAt value i) n (int c)]
      (cond (= n 34) (.append out "\\\"") (= n 92) (.append out "\\\\")
            (or (< n 32) (> n 126)) (.append out (format "\\u%04x" n))
            :else (.append out c))))
  (.append out \" ) out)
(def ^ConcurrentHashMap ids (ConcurrentHashMap.))
(def ^ConcurrentHashMap configs (ConcurrentHashMap.))
(defn forget! [name] (.remove ids name) (.remove configs name))
(defn decline! [reason] (throw (ex-info reason {:declined reason})))
(defn config [name db]
  (or (.get configs name)
      (let [^datomic.Datom scope (first (d/datoms db :aevt :triplex.scope/key))
            value {:scope (.e scope)
                   :row (d/entid db :triplex.entity/row)
                   :overflow (d/entid db :triplex.entity/row-overflow)
                   :rev (d/entid db :triplex.entity/rev)
                   :id (d/entid db :triplex.entity/id)
                   :position (d/entid db :triplex.scope/position)
                   :version (d/entid db :triplex.scope/rows-version)
                   :irregular (d/entid db :triplex.scope/irregular)}]
        (or (.putIfAbsent configs name value) value))))
(defn entity-id [db name ^String id]
  (let [^ConcurrentHashMap cache (or (.get ids name)
                                    (let [m (ConcurrentHashMap.)] (or (.putIfAbsent ids name m) m)))]
    (or (.get cache id)
        (when-let [eid (d/entid db [:triplex.entity/id id])]
          (.putIfAbsent cache id eid) eid))))
(defn select-db [name db basis]
  (let [cfg (config name db) header (long-array 3)
        it (.iterator ^Iterable (d/datoms db :eavt (:scope cfg)))
        p (get basis "recordedPosition") r (get basis "recordedAt")]
    (while (.hasNext it)
      (let [^datomic.Datom datom (.next it) a (.a datom)]
        (cond (= a (:position cfg)) (aset header 0 (long (.v datom)))
              (= a (:version cfg)) (aset header 1 (long (.v datom)))
              (= a (:irregular cfg)) (when (.v datom) (aset header 2 1)))))
    (when-not (= 1 (aget header 1)) (decline! "rows-version"))
    (when (= 1 (aget header 2)) (decline! "irregular"))
    (let [head (aget header 0)
          pt (when (and (some? p) (not= p head))
               (if-let [tx (d/entid db [:triplex.tx/position p])]
                 (d/tx->t tx) (decline! "interior-position")))
          rt (when (some? r)
               (let [a (d/entid db :triplex.tx/max-recorded-at)
                     ^datomic.Datom datom (first (d/seek-datoms db :avet :triplex.tx/max-recorded-at (Math/nextUp (double r))))]
                 (when (and datom (= a (.a datom))) (dec (d/tx->t (.e datom))))))
          t (min (long (or pt (d/basis-t db))) (long (or rt (d/basis-t db))))]
      [(if (= t (d/basis-t db)) db (d/as-of db t)) (or p head) t])))
(defn bits [^String text ^long start]
  (Double/longBitsToDouble (Long/parseUnsignedLong text (int start) (int (+ start 16)) 16)))
(defn response [name current input]
  (try
    (let [[db position t] (select-db name current (get input "basis"))
          cfg (config name current) row-a (long (:row cfg)) overflow-a (long (:overflow cfg))
          valid (double (get-in input ["basis" "validAt"]))
          root (get input "root") queue (ArrayDeque.) seen (HashSet.) out (StringBuilder. 65536)
          counts (long-array 2)]
      (.add queue root) (.add seen root)
      (.append out "{\"position\":") (.append out (long position))
      (.append out ",\"t\":\"") (.append out (long t)) (.append out "\",\"rows\":[")
      (while (not (.isEmpty queue))
        (let [id (.remove queue)]
          (when-let [eid (entity-id db name id)]
            (let [it (.iterator ^Iterable (d/datoms db :eavt eid))]
              (while (.hasNext it)
                (let [^datomic.Datom datom (.next it) a (.a datom)]
                  (when (and (= a overflow-a) (.v datom)) (decline! "row-overflow"))
                  (when (= a row-a)
                    (let [^String text (.v datom)
                          start (+ 5 (Integer/parseInt text 1 5 16))
                          from (bits text start) end (+ start 16)
                          to (when-not (= \- (.charAt text (int end))) (bits text end))
                          ref-start (+ end 20) ref-size (Integer/parseInt text (int (+ end 16)) (int ref-start) 16)]
                      (aset counts 1 (inc (aget counts 1)))
                      (when (> (aget counts 1) 100000) (decline! "row-budget"))
                      (when (and (<= from valid) (or (nil? to) (> (double to) valid)))
                        (when (>= (aget counts 0) 100000) (decline! "row-budget"))
                        (when (pos? (aget counts 0)) (.append out \,))
                        (.append out text (int (+ ref-start ref-size)) (.length text))
                        (aset counts 0 (inc (aget counts 0)))
                        (when (pos? ref-size)
                          (let [ref (.substring text (int ref-start) (int (+ ref-start ref-size)))]
                            (when (.add seen ref)
                              (when (> (.size seen) 5000) (decline! "entity-budget"))
                              (.add queue ref)))))))))))))
      (.append out "],\"entities\":") (.append out (.size seen))
      (.append out ",\"visited\":[")
      (let [it (.iterator seen) counts (long-array 1)]
        (while (.hasNext it)
          (when (pos? (aget counts 0)) (.append out \,)) (aset counts 0 1)
          (append-string! out (.next it))))
      (.append out "]}")
      (.toString out))
    (catch clojure.lang.ExceptionInfo e
      (if-let [reason (:declined (ex-data e))] (str "{\"declined\":\"" reason "\"}") (throw e)))))
