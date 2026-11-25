(ns triplex.gateway.reach-late
  "[DX-API1] A reference row's attribute (so a world read can stop at references the caller declares shared: the
  request's `stopAt`), and an entity's revision at the request's cut without parsing its rows (the batch's `revisions`
  entry). [DX-INT5] API1 wrote these inline in reach.clj, which compiles before commit.clj; there they moved every stored
  function's identity with every option off (READINESS.md, step 0). Here they fill reach's hooks from a namespace
  main.clj loads after commit.clj; the behaviour is API1's, unchanged."
  (:require [clojure.data.json :as json] [datomic.api :as d] [triplex.gateway.reach :as reach]
            [triplex.gateway.slim :as slim] [triplex.gateway.group-cut :as group-cut] [triplex.gateway.pinned :as pinned]
            [triplex.gateway.entity-cache :as cache] [triplex.gateway.save-ledger :as ledger]))

;; The n-th JSON string of `s` from `start` (the fourth string of a reference row's stored column array is its
;; attribute). Rejected: parsing the whole column array of every reference row.
(defn- json-string-at [^String s ^long start ^long n]
  (let [len (.length s)]
    (loop [i start k 0]
      (when (< i len)
        (if (= \" (.charAt s i))
          (let [end (loop [j (inc i) escaped false]
                      (when (< j len)
                        (let [c (.charAt s j)]
                          (cond (= c \\) (recur (+ j 2) true)
                                (= c \") [j escaped]
                                :else (recur (inc j) escaped)))))]
            (when end
              (let [[j escaped] end]
                (if (= k n)
                  (if escaped (json/read-str (subs s i (inc j))) (subs s (inc i) j))
                  (recur (inc j) (inc k))))))
          (recur (inc i) k))))))

(defn ref-attr
  "The attribute of the reference row in `text` whose columns start at `start`, or nil."
  [^String text start]
  (let [^String logical (if (= \2 (.charAt text 0)) (slim/logical-text text start) text)]
    (when (= \2 (.charAt logical 0)) (json-string-at logical start 3))))

(defn stop-at
  "A request's stopAt as a set (1 to 64 attribute names), nil when absent; declined otherwise."
  [input]
  (when (contains? input "stopAt")
    (let [stop (get input "stopAt")]
      (when-not (and (vector? stop) (<= 1 (count stop) 64) (every? string? stop)) (reach/decline! "stopAt"))
      (set stop))))

;; [DX-API1] The same revision read-entity keys its parsed entry on, through the same cut memo. An entity with no rows
;; answers its stored revision here (read-entity answers 0 for it).
(defn revision-of [name db cfg ^String id]
  (if-let [cut (:group-cut cfg)]
    (let [eid (d/entid db [:triplex.entity/id id]) slice (when eid (group-cut/entity-slice cut eid))] (long (or (:rev slice) 0)))
    (let [db (if (when (and pinned/enabled (:identity-db cfg)) (pinned/current-eid (:identity-db cfg) db (:selected-position cfg) id))
               (:identity-db cfg) db)
          eid (reach/entity-id db name id cfg)]
      (if eid
        (long (cache/revision (:revision-view cfg) eid
                (fn [] (long (or (:v (first (d/datoms db :eavt eid (:rev cfg)))) (ledger/implicit-position db eid) 0)))))
        0))))

(alter-var-root #'reach/ref-attr-hook (constantly ref-attr))
(alter-var-root #'reach/stop-at-hook (constantly stop-at))
