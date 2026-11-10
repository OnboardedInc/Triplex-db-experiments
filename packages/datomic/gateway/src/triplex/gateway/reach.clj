(ns triplex.gateway.reach
  (:require [datomic.api :as d] [triplex.gateway.recent :as recent] [triplex.gateway.scope :as scope] [triplex.gateway.entity-cache :as cache] [triplex.gateway.admission :as admission])
  (:import [java.util ArrayDeque ArrayList HashSet LinkedHashMap Map$Entry] [java.util.concurrent ConcurrentHashMap] [java.util.concurrent.atomic AtomicInteger]))
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
;; [DX-B9-A] Why: all per-request fields have fixed slots, so adding report witnesses does not
;; turn every hot keyword access into a linear PersistentArrayMap.indexOf search.
;; Rejected: removing generation/cut fields to shrink the map (would weaken cache binding).
(defrecord ReadConfig [cache-generation scope entity-ids row overflow rev id position version
                       irregular position-regular connection-generation selected-t recent-state
                       recent-eligible revision-view])
(declare sessions)
;; [DX-B8-C] Why: old requests retain their connection identity across deletion and recreation of a scope name.
;; Rejected: one name-keyed ID/config map (a late old request could seed the replacement database's map).
(defn generation-key [name epoch] (if epoch [name epoch] name))
(defn forget! [name]
  (cache/forget! name)
  (doseq [^ConcurrentHashMap table [ids configs sessions] key (.keySet table)
          :when (= name (if (vector? key) (first key) key))] (.remove table key))
  nil)
(defn decline! [reason] (throw (ex-info reason {:declined reason})))
(defn id-map [key]
  (or (.get ids key) (let [m (ConcurrentHashMap.)] (or (.putIfAbsent ids key m) m))))
(defn config
  ([name db] (config name db nil))
  ([name db epoch]
  (let [key (generation-key name epoch)]
  (or (.get configs key)
      (let [^datomic.Datom scope (first (d/datoms db :aevt :triplex.scope/key))
            value (map->ReadConfig {:cache-generation (Object.) :scope (.e scope) :entity-ids (id-map key)
                   :row (d/entid db :triplex.entity/row)
                   :overflow (d/entid db :triplex.entity/row-overflow)
                   :rev (d/entid db :triplex.entity/rev)
                   :id (d/entid db :triplex.entity/id)
                   :position (d/entid db :triplex.scope/position)
                   :version (d/entid db :triplex.scope/rows-version)
                   :irregular (d/entid db :triplex.scope/irregular)
                   :position-regular (d/entid db :triplex.scope/position-regular)})]
        (or (.putIfAbsent configs key value) value))))))
(defn entity-id [db name ^String id & [context]]
  (let [^ConcurrentHashMap cache (if (map? context) (:entity-ids context)
                                   (id-map (generation-key name context)))]
    (or (.get cache id)
        (when-let [eid (d/entid db [:triplex.entity/id id])]
          (.putIfAbsent cache id eid) eid))))
(defn select-db [name db basis & [epoch]]
  (let [cfg (config name db epoch) header (long-array 4)
        p (get basis "recordedPosition") r (get basis "recordedAt")
        value (fn [a] (:v (first (d/datoms db :eavt (:scope cfg) a))))]
    ;; [DX-B8] Why: read only the stable eligibility attributes, never walk a scope's hot legacy values.
    ;; Rejected: a full scope-entity iterator (merges unrelated position and clock retractions).
    (aset header 0 (long (scope/head-position db (:scope cfg))))
    (aset header 1 (long (or (value (:version cfg)) 0)))
    (when (value (:irregular cfg)) (aset header 2 1))
    (when (value (:position-regular cfg)) (aset header 3 1))
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
      [(if (= t (d/basis-t db)) db (d/as-of db t)) (or p head) t (zero? (aget header 2))])))
(defn bits ^double [^String text ^long start]
  (Double/longBitsToDouble (Long/parseUnsignedLong text (int start) (int (+ start 16)) 16)))
 ;; [DX-B2-N2] Why: a session remembers only immutable entity revisions; concurrent references may retry full.
;; Rejected: a cache keyed only by entity (historical cuts need their own revision).
(def ^ConcurrentHashMap sessions (ConcurrentHashMap.))
(def session-entry-limit
  (min 1000000 (Long/parseLong (or (System/getenv "TX2_REACH_SESSION_ENTRIES") "1000000"))))
;; [DX-B7-S2] Why: a reset replaces a generation; in-flight builders keep their immutable map identity.
;; Rejected: clear under a response-wide monitor (serializes all concurrent pulls in a session).
(defn session-generation [] {:entries (ConcurrentHashMap.) :slots (AtomicInteger. 0)})
(defn remember! [generation eid rev]
  (let [^ConcurrentHashMap entries (:entries generation) ^AtomicInteger slots (:slots generation)]
    (if (.containsKey entries eid) (.put entries eid rev)
      (loop []
        (let [n (.get slots)]
          (when (< n session-entry-limit)
            (if (.compareAndSet slots n (inc n))
              (when (some? (.putIfAbsent entries eid rev))
                (.decrementAndGet slots) (.put entries eid rev))
              (recur))))))))
(defn session-map [name session & [epoch]]
  (when session
    (when-not (and (string? session) (<= 1 (.length ^String session) 64)) (decline! "session"))
    (let [key (generation-key name epoch)
          ^LinkedHashMap lru (or (.get sessions key)
                                (let [m (LinkedHashMap. 64 0.75 true)] (or (.putIfAbsent sessions key m) m)))]
      (locking lru
        (or (.get lru session)
            (let [m (atom (session-generation))]
              (when (>= (.size lru) 64)
                (let [it (.iterator (.keySet lru))] (.next it) (.remove it)))
              (.put lru session m) m))))))
(defn parse-entity [db cfg eid revision row-limit]
  (let [texts (ArrayList.) refs (ArrayList.) out (StringBuilder.)
        retired (set (map (fn [datom] (let [^String text (:v datom)] (subs text 0 (+ 5 (Integer/parseInt text 1 5 16)))))
                          (d/datoms db :eavt eid :triplex.entity/retired)))
        row-a (long (:row cfg)) overflow-a (long (:overflow cfg))
        it (.iterator ^Iterable (d/datoms db :eavt eid))]
    (.append out \[)
    (while (.hasNext it)
      (let [^datomic.Datom datom (.next it) a (.a datom)]
        (cond
          (= a overflow-a) (when (.v datom) (decline! "row-overflow"))
          (= a row-a)
          (let [^String text (.v datom) start (+ 5 (Integer/parseInt text 1 5 16))]
            (when-not (retired (subs text 0 start))
              (let [ref-start (+ start 36) ref-size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)]
                (when-not (.isEmpty texts) (.append out \,))
                (.add texts text)
                (when (> (.size texts) row-limit) (decline! "row-budget"))
                (if (= \1 (.charAt text 0)) (append-string! out text)
                  (.append out text (int (+ ref-start ref-size 1)) (.length text)))
              (when (pos? (Integer/parseInt text (int (+ start 32)) (int (+ start 36)) 16))
                (let [ref-start (+ start 36) size (Integer/parseInt text (int (+ start 32)) (int ref-start) 16)
                      from (bits text start) end (+ start 16)
                      to (if (= \- (.charAt text (int end))) Double/POSITIVE_INFINITY (bits text end))]
                  (.add refs [(.substring text (int ref-start) (int (+ ref-start size))) from to])))))))))
    (when (and (pos? (.size texts)) (zero? revision)) (decline! "missing-revision"))
    (.append out \])
    (let [json (.toString out) texts (vec texts) refs (vec refs)]
      {:rev (if (empty? texts) 0 revision) :texts texts :refs refs :json json :recent-safe (empty? retired)
       :bytes (+ 560 (* 2 (.length ^String json))
                 (reduce + 0 (map #(+ 48 (* 2 (.length ^String %))) texts))
                 (reduce + 0 (map #(+ 96 (* 2 (.length ^String (first %)))) refs)))})))
;; [DX-B8-C] Why: a caught-up report witness proves the revision at this exact cut; other reads keep the cut memo.
;; Rejected: reusing a newer entity revision at an older cut, or reading beyond the consumer watermark.
(defn read-entity-recent [name db cfg id valid ^longs counts]
  (let [eid (entity-id db name id cfg) valid (double valid)
        witness (volatile! nil)
        read-datom (fn [] (first (d/datoms db :eavt eid (:rev cfg))))
        recent-state (when (:recent-eligible cfg) (:recent-state cfg))
        selected-t (:selected-t cfg)
        cached (when (and eid recent-state) (recent/lookup recent-state eid selected-t read-datom))
        rev (if eid (if cached (:rev cached)
                      (long (cache/revision (:revision-view cfg) eid
                        (fn [] (let [revision (read-datom)] (vreset! witness revision)
                                 (if revision (long (:v revision)) 0)))))) 0)
        value (if eid
                (if (pos? rev)
                  (cache/lookup (cache/parsed-key name (:cache-generation cfg) eid rev) #(parse-entity db cfg eid rev (- 100000 (aget counts 0))))
                  (parse-entity db cfg eid rev (- 100000 (aget counts 0))))
                {:rev 0 :texts [] :refs [] :json "[]"})
        refs (ArrayList.)]
    (when (and eid recent-state @witness)
      (recent/install! recent-state eid selected-t @witness (:recent-safe value)))
    (aset counts 0 (+ (aget counts 0) (count (:texts value))))
    (when (> (aget counts 0) 100000) (decline! "row-budget"))
    (doseq [[ref from to] (:refs value)]
      (when (and (<= (double from) valid) (< valid (double to))) (.add refs ref)))
    [eid (:rev value) (:texts value) refs (:json value)]))
;; [DX-B9-A] Why: disabled report witnesses must also avoid their per-entity volatile/closure/miss costs.
;; Rejected: disabling only the consumer while retaining its extra hot-path work.
(defn read-entity-legacy [name db cfg id valid ^longs counts]
  (let [eid (entity-id db name id cfg) valid (double valid)
        rev (if eid (long (cache/revision (:revision-view cfg) eid
                           (fn [] (long (or (:v (first (d/datoms db :eavt eid (:rev cfg)))) 0))))) 0)
        value (if eid
                (if (pos? rev)
                  (cache/lookup (cache/parsed-key name (:cache-generation cfg) eid rev)
                    #(parse-entity db cfg eid rev (- 100000 (aget counts 0))))
                  (parse-entity db cfg eid rev (- 100000 (aget counts 0))))
                {:rev 0 :texts [] :refs [] :json "[]"})
        refs (ArrayList.)]
    (aset counts 0 (+ (aget counts 0) (count (:texts value))))
    (when (> (aget counts 0) 100000) (decline! "row-budget"))
    (doseq [[ref from to] (:refs value)]
      (when (and (<= (double from) valid) (< valid (double to))) (.add refs ref)))
    [eid (:rev value) (:texts value) refs (:json value)]))
(defn read-entity [name db cfg id valid counts]
  (if (:recent-state cfg) (read-entity-recent name db cfg id valid counts)
    (read-entity-legacy name db cfg id valid counts)))
(defn append-strings! [^StringBuilder out ^Iterable values]
  (.append out \[)
  (let [it (.iterator values) n (long-array 1)]
    (while (.hasNext it)
      (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
      (append-string! out (.next it))))
  (.append out \]))
(defn build-response [name current input & [epoch recent-state]]
  (try
    (let [[db position t recent-eligible] (select-db name current (get input "basis") epoch)
          base-cfg (config name current epoch)
          cfg (assoc base-cfg :connection-generation epoch :selected-t t :recent-state recent-state :recent-eligible recent-eligible
                :revision-view (cache/revision-view [name epoch (:cache-generation base-cfg) t])) valid (double (get-in input ["basis" "validAt"]))
          need (get input "need")
          _ (when (and need (not (and (vector? need) (<= 1 (count need) 50000) (every? string? need) (= (count need) (count (distinct need)))))) (decline! "need"))
          roots (or need (get input "roots"))
          row-page? (true? (get input "rowPage"))
          entity-limit (if row-page? 50000 5000)
          entities (LinkedHashMap.) closures (ArrayList.) counts (long-array 1)
          session-state (session-map name (get input "session") epoch)
          generation (when session-state @session-state)
          ^ConcurrentHashMap remembered (:entries generation) out (StringBuilder. 65536)]
      (when-not (and (vector? roots) (<= 1 (count roots) (if need 50000 5000))) (decline! "roots"))
      ;; [DX-B5-L5] Why: 64 real W0 subjects exceed 10k answer entities; legacy triple requests retain their bound.
      ;; Rejected: silently falling back to many requests for a normal W0 page, or unbounded batch graphs.
      (when (and row-page? (not need) (> (count roots) 64)) (decline! "row-page-roots"))
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
                  ^ArrayList refs (if need (ArrayList.) (nth entry 3)) it (.iterator refs)]
              (.add order id)
              (while (.hasNext it)
                (let [ref (.next it)] (when (.add seen ref) (.add queue ref))))))
          (.add closures [root order])))
      (let [new-count (long-array 1) reset (and remembered
            (do (let [it (.iterator (.values entities))]
                  (while (.hasNext it)
                    (let [eid (nth (.next it) 0)]
                      (when (and eid (not (.containsKey remembered eid)))
                        (aset new-count 0 (inc (aget new-count 0)))))))
                (> (+ (.size remembered) (aget new-count 0)) session-entry-limit)))
            generation (if reset
                         (let [next (session-generation)]
                           (if (compare-and-set! session-state generation next) next @session-state)) generation)
            ^ConcurrentHashMap remembered (:entries generation)
            full (or need reset (true? (get input "full")))]
        (.append out "{\"position\":") (.append out (long position))
        (.append out ",\"t\":\"") (.append out (long t))
        (.append out "\",\"reset\":") (.append out (boolean reset)) (.append out ",\"entities\":[")
        (let [it (.iterator (.entrySet entities)) n (long-array 1)]
          (while (.hasNext it)
            (let [^Map$Entry item (.next it) id (.getKey item) entry (.getValue item)
                  eid (nth entry 0) rev (long (nth entry 1)) texts (nth entry 2)
                  inline (or (nil? remembered) full (nil? eid) (not= rev (.get remembered eid)))]
              (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
              (.append out \[) (append-string! out id) (.append out \,) (.append out rev)
              (when inline
                (.append out \,)
                (let [^String fragment (nth entry 4)] (.append out fragment))
                ;; Overflow pages are entirely inline and leave the bounded map empty.
                (when (and remembered eid (<= (.size entities) session-entry-limit)) (remember! generation eid rev)))
              (.append out \]))))
        (.append out "],\"closures\":[")
        (let [it (.iterator closures) n (long-array 1)]
          (while (.hasNext it)
            (let [entry (.next it)]
              (when (pos? (aget n 0)) (.append out \,)) (aset n 0 1)
              (.append out \[) (append-string! out (nth entry 0)) (.append out \,)
              (append-strings! out (nth entry 1)) (.append out \]))))
        (.append out "]}") (.toString out)))
    (catch clojure.lang.ExceptionInfo e
      (if-let [reason (:declined (ex-data e))] (str "{\"declined\":\"" reason "\"}") (throw e)))))

(defn response
  ([name current input] (response name current input nil))
  ([name current input epoch] (response name current input epoch nil))
  ([name current input epoch recent-state]
   (admission/execute admission/reads #(build-response name current input epoch recent-state))))
