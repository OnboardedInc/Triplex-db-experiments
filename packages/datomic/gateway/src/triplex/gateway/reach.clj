(ns triplex.gateway.reach
  (:require [datomic.api :as d])
  (:import [java.util ArrayDeque ArrayList HashSet LinkedHashMap Map$Entry] [java.util.concurrent ConcurrentHashMap]))
(set! *warn-on-reflection* false)

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
(declare sessions)
(defn forget! [name] (.remove ids name) (.remove configs name) (.remove ^ConcurrentHashMap sessions name))
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
                   :irregular (d/entid db :triplex.scope/irregular)
                   :position-regular (d/entid db :triplex.scope/position-regular)}]
        (or (.putIfAbsent configs name value) value))))
(defn entity-id [db name ^String id]
  (let [^ConcurrentHashMap cache (or (.get ids name)
                                    (let [m (ConcurrentHashMap.)] (or (.putIfAbsent ids name m) m)))]
    (or (.get cache id)
        (when-let [eid (d/entid db [:triplex.entity/id id])]
          (.putIfAbsent cache id eid) eid))))
(defn select-db [name db basis]
  (let [cfg (config name db) header (long-array 4)
        it (.iterator ^Iterable (d/datoms db :eavt (:scope cfg)))
        p (get basis "recordedPosition") r (get basis "recordedAt")]
    (while (.hasNext it)
      (let [^datomic.Datom datom (.next it) a (.a datom)]
        (cond (= a (:position cfg)) (aset header 0 (long (.v datom)))
              (= a (:version cfg)) (aset header 1 (long (.v datom)))
              (= a (:irregular cfg)) (when (.v datom) (aset header 2 1))
              (= a (:position-regular cfg)) (when (.v datom) (aset header 3 1)))))
    (when-not (#{2 3} (aget header 1)) (decline! "rows-version"))
    ;; [DX-B3-M3] Why: parallel commits can reorder timestamps while positions remain an exact prefix.
    ;; Rejected: declining position-only/current pulls after a timestamp regression (needless history scans).
    ;; Older scopes without the explicit position proof retain the conservative fallback.
    (when (and (= 1 (aget header 2)) (or (some? r) (zero? (aget header 3)))) (decline! "irregular"))
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
(defn bits ^double [^String text ^long start]
  (Double/longBitsToDouble (Long/parseUnsignedLong text (int start) (int (+ start 16)) 16)))
 ;; [DX-B2-N2] Why: a session remembers only immutable entity revisions; concurrent references may retry full.
;; Rejected: a cache keyed only by entity (historical cuts need their own revision).
(def ^ConcurrentHashMap sessions (ConcurrentHashMap.))
(def session-entry-limit
  (min 1000000 (Long/parseLong (or (System/getenv "TX2_REACH_SESSION_ENTRIES") "1000000"))))
(defn session-map [name session]
  (when session
    (when-not (and (string? session) (<= 1 (.length ^String session) 64)) (decline! "session"))
    (let [^LinkedHashMap lru (or (.get sessions name)
                                (let [m (LinkedHashMap. 64 0.75 true)] (or (.putIfAbsent sessions name m) m)))]
      (locking lru
        (or (.get lru session)
            (let [m (ConcurrentHashMap.)]
              (when (>= (.size lru) 64)
                (let [it (.iterator (.keySet lru))] (.next it) (.remove it)))
              (.put lru session m) m))))))
(defn read-entity [name db cfg id valid ^longs counts]
  (let [valid (double valid) eid (entity-id db name id) texts (ArrayList.) refs (ArrayList.) rev (long-array 1)
        retired (set (map (fn [datom] (let [^String text (:v datom)] (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))
                          (d/datoms db :eavt (or eid 0) :triplex.entity/retired)))
        row-a (long (:row cfg)) overflow-a (long (:overflow cfg)) rev-a (long (:rev cfg))]
    (when eid
      (let [it (.iterator ^Iterable (d/datoms db :eavt eid))]
        (while (.hasNext it)
          (let [^datomic.Datom datom (.next it) a (.a datom)]
            (cond
              (= a overflow-a) (when (.v datom) (decline! "row-overflow"))
              (= a rev-a) (aset rev 0 (long (.v datom)))
              (and (= a row-a) (not (let [^String text (.v datom)] (retired (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))))
              (let [^String text (.v datom)
                    start (+ 5 (Integer/parseInt text 1 5 16))
                    ref-start (+ start 36) ref-size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)]
                (aset counts 0 (inc (aget counts 0)))
                (when (> (aget counts 0) 100000) (decline! "row-budget"))
                (.add texts text)
                ;; [DX-B2-N4] Why: inline rows are unfiltered; only references need valid-time decoding.
                ;; Rejected: parsing every scalar row's double header on every cached pull.
                (when (pos? ref-size)
                  (let [from (bits text start) end (+ start 16)
                        to (if (= \- (.charAt text (int end))) Double/POSITIVE_INFINITY (bits text end))]
                    (when (and (<= from valid) (< valid to))
                      (.add refs (.substring text (int ref-start) (int (+ ref-start ref-size)))))))))))))
    (when (and (pos? (.size texts)) (zero? (aget rev 0))) (decline! "missing-revision"))
    [eid (if (.isEmpty texts) 0 (aget rev 0)) texts refs]))
(defn append-strings! [^StringBuilder out ^Iterable values]
  (.append out \[)
  (let [it (.iterator values) n (long-array 1)]
    (while (.hasNext it)
      (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
      (append-string! out (.next it))))
  (.append out \]))
(defn response [name current input]
  (try
    (let [[db position t] (select-db name current (get input "basis"))
          cfg (config name current) valid (double (get-in input ["basis" "validAt"]))
          roots (get input "roots")
          row-page? (true? (get input "rowPage"))
          entity-limit (if row-page? 50000 5000)
          entities (LinkedHashMap.) closures (ArrayList.) counts (long-array 1)
          ^ConcurrentHashMap remembered (session-map name (get input "session")) out (StringBuilder. 65536)]
      (when-not (and (vector? roots) (<= 1 (count roots) 5000)) (decline! "roots"))
      ;; [DX-B5-L5] Why: 64 real W0 subjects exceed 10k answer entities; legacy triple requests retain their bound.
      ;; Rejected: silently falling back to many requests for a normal W0 page, or unbounded batch graphs.
      (when (and row-page? (> (count roots) 64)) (decline! "row-page-roots"))
      (doseq [root roots]
        (when-not (string? root) (decline! "root"))
        (let [queue (ArrayDeque.) seen (HashSet.) order (ArrayList.)]
          (.add queue root) (.add seen root)
          (while (not (.isEmpty queue))
            (let [id (.remove queue)
                  entry (or (.get entities id)
                            (let [value (read-entity name db cfg id valid counts)]
                              (.put entities id value)
                              (when (> (.size entities) entity-limit) (decline! "entity-budget")) value))
                  ^ArrayList refs (nth entry 3) it (.iterator refs)]
              (.add order id)
              (while (.hasNext it)
                (let [ref (.next it)] (when (.add seen ref) (.add queue ref))))))
          (.add closures [root order])))
      (locking (or remembered out)
      (let [new-count (long-array 1) reset (and remembered
            (do (let [it (.iterator (.values entities))]
                  (while (.hasNext it)
                    (let [eid (nth (.next it) 0)]
                      (when (and eid (not (.containsKey remembered eid)))
                        (aset new-count 0 (inc (aget new-count 0)))))))
                (> (+ (.size remembered) (aget new-count 0)) session-entry-limit)))
            full (or reset (true? (get input "full")))]
        (when reset (.clear remembered))
        (.append out "{\"position\":") (.append out (long position))
        (.append out ",\"t\":\"") (.append out (long t))
        (.append out "\",\"reset\":") (.append out (boolean reset)) (.append out ",\"entities\":[")
        (let [it (.iterator (.entrySet entities)) n (long-array 1)]
          (while (.hasNext it)
            (let [^Map$Entry item (.next it) id (.getKey item) entry (.getValue item)
                  eid (nth entry 0) rev (long (nth entry 1)) ^ArrayList texts (nth entry 2)
                  inline (or (nil? remembered) full (nil? eid) (not= rev (.get remembered eid)))]
              (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
              (.append out \[) (append-string! out id) (.append out \,) (.append out rev)
              (when inline
                (.append out ",[")
                (let [rows (.iterator texts) n (long-array 1)]
                  (while (.hasNext rows)
                    (let [^String text (.next rows) start (+ 5 (Integer/parseInt text 1 5 16))
                          ref-start (+ start 36) ref-size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)]
                      (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
                      (if (= \1 (.charAt text 0)) (append-string! out text)
                        (.append out text (int (+ ref-start ref-size 1)) (.length text))))))
                (.append out \])
                ;; Overflow pages are entirely inline and leave the bounded map empty.
                (when (and remembered eid (<= (.size entities) session-entry-limit)) (.put remembered eid rev)))
              (.append out \]))))
        (.append out "],\"closures\":[")
        (let [it (.iterator closures) n (long-array 1)]
          (while (.hasNext it)
            (let [entry (.next it)]
              (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
              (.append out \[) (append-string! out (nth entry 0)) (.append out \,)
              (append-strings! out (nth entry 1)) (.append out \]))))
        (.append out "]}") (.toString out))))
    (catch clojure.lang.ExceptionInfo e
      (if-let [reason (:declined (ex-data e))] (str "{\"declined\":\"" reason "\"}") (throw e)))))
