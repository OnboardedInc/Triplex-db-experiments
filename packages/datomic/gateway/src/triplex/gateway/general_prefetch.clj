(ns triplex.gateway.general-prefetch
  (:require [datomic.api :as d]
            [triplex.gateway.schema :as schema]))

;; [DX-W3] Why: the general writer reads its subject's index segments inside the single writer's apply; on a cold
;; cache each read costs 1 to 3 ms of serial time. Naming those segments ahead of the transaction (Datomic hints, as
;; the per-subject writer's TX2_SUBJECT_PREFETCH already does) lets the transactor load them before apply.
;; Rejected: TX2_COMMIT_HINTS (DX-M2), which runs the whole commit a second time on the gateway (stamping, JSON and
;; every check) only to learn its reads; and modifying Datomic.
(def enabled (= "1" (System/getenv "TX2_GENERAL_PREFETCH")))

;; [DX-W3] Why: the same lookups the general commit function (commit/operation-code, lean layout) and Datomic's own
;; identity, uniqueness and redundancy checks make, and nothing else. It decides nothing and returns no datoms, so
;; a hint can only name segments; the authoritative transaction still makes every check on its own db-before.
;; Rejected: deciding absence or revisions here (a newer commit can change them before the serial turn).
(def code
  '(let [{:keys [scope ops live entities identity-bounds]} payload
         attr (fn [k] (d/entid db k))
         row-a (attr :triplex.entity/row) retired-a (attr :triplex.entity/retired) rev-a (attr :triplex.entity/rev)
         touch (fn [rows] (first rows))
         unique-keys [:triplex.entity/id :triplex.attr/key :triplex.claim/command-id :triplex.tx/operation-id]
         unique (into {} (keep (fn [k] (when-let [a (attr k)] [k a]))) unique-keys)
         lookup (fn [k v] (when (and (unique k) (string? v)) (try (d/entid db [k v]) (catch Exception _ nil))))
         owner (memoize (fn [id] (lookup :triplex.entity/id id)))
         public (fn [x] (if (and (string? x) (.startsWith ^String x "e:")) (subs x 2) x))
         row-prefix (fn [id] (str "2" (format "%04x" (.length ^String id)) id))
         list? (fn [op] (instance? java.util.List op))
         retracts (filter #(and (list? %) (= :triplex/retract (first %))) ops)
         asserts (filter #(and (list? %) (= :triplex/assert (first %))) ops)
         owners (into {} (map (fn [op] [(nth op 2) (second op)])) retracts)]
     ;; Unique values Datomic resolves or checks natively: subjects, attributes, the claim and the operation.
     (doseq [op ops :when (map? op) [k v] op] (lookup k v))
     (when scope (touch (d/datoms db :eavt scope)))
     (when-let [position (attr :triplex.tx/position)] (touch (d/rseek-datoms db :aevt position)))
     ;; The rows a save retires: the live row and its retirement marker on the owner (EAVT), and the row datom that
     ;; Datomic's redundancy check finds by attribute (AEVT).
     (doseq [id live]
       (let [prefix (row-prefix id)]
         (if-let [e (some-> (owners id) owner)]
           (do (touch (d/seek-datoms db :eavt e row-a prefix))
               (when retired-a (touch (d/seek-datoms db :eavt e retired-a prefix)))
               (touch (d/seek-datoms db :aevt row-a e prefix)))
           (touch (d/index-range db :triplex.entity/row prefix nil)))))
     ;; Owner revisions: the serial revision check (EAVT) and the cardinality-one replacement (AEVT).
     (doseq [id (distinct (concat entities (vals owners)))]
       (when-let [e (owner id)]
         (touch (d/datoms db :eavt e rev-a))
         (touch (d/seek-datoms db :aevt rev-a e))
         (when retired-a (touch (d/seek-datoms db :aevt retired-a e)))))
     ;; New assertion IDs: the history check that no owner ever used them, and the new row's AEVT neighbourhood.
     (if (and (instance? java.util.List identity-bounds) (= 2 (count identity-bounds)))
       (let [[low high] identity-bounds]
         (when (and (string? low) (string? high))
           (touch (d/index-range (d/history db) :triplex.entity/row (str "2001a" low) nil))))
       (doseq [op asserts]
         (let [raw (second (nth op 3 nil))]
           (when (and (string? raw) (> (.length ^String raw) 5))
             (let [n (try (Integer/parseInt raw 1 5 16) (catch Exception _ -1))]
               (when (and (pos? n) (<= (+ 5 n) (.length ^String raw)))
                 (touch (d/index-range (d/history db) :triplex.entity/row (subs raw 0 (+ 5 n)) nil))))))))
     (doseq [op asserts]
       (let [raw (second (nth op 3 nil)) e (owner (public (second op)))]
         (when (and e (string? raw))
           (touch (d/seek-datoms db :eavt e row-a raw))
           (touch (d/seek-datoms db :aevt row-a e raw)))))
     []))

(def ident (keyword "triplex.write" (str "prefetch-" (subs (schema/sha256 (pr-str code)) 0 24))))

(defn installed? [db] (some? (d/entid db ident)))

(defn install! [conn db]
  (if (or (not enabled) (installed? db))
    db
    (:db-after @(d/transact conn [{:db/ident ident
                                   :db/fn (d/function {:lang :clojure :params '[db payload]
                                                       :requires '[[datomic.api :as d]] :code code})}]))))

;; [DX-W3] Why: only the lean single-payload commit has the read set above; other shapes keep today's path.
;; Rejected: hinting legacy (reified-fact) commits, whose reads are different and not on the production path.
(defn eligible? [db data]
  (and enabled (= 1 (count data)) (map? (second (first data))) (:lean (second (first data))) (installed? db)))

(defn lookup-hints [db data]
  (:hints (d/with db [[ident (dissoc (second (first data)) :triplex-trace)]] :return-hints true)))
