(ns triplex.gateway.removal-repair
  "[DX-ERA2 sixth pass] Repairs of the removal authority that no request makes, loaded lazily (requiring-resolve) so no
  early-loaded file gains a definition:
  - `verify-log`: the published log read whole and verified as `privacy/cut` verifies it, without this gateway's cache
    and without changing it;
  - `shred-after-failure!`: F1 of the B2 review: when the key pass's cut is refused because the log is behind or differs
    from what this gateway verified last, the pass reads the log again without the cache; reads keep their refusal;
  - `retire-log!`: V5 of the fifth review: a deleted database's removal log and keys leave the authority."
  (:require [clojure.data.json :as json] [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy])
  (:import [java.nio.file Files]))

(defn verify-log
  "The published log of `name` read whole and verified exactly as privacy/cut verifies it (the head names this
  database; every entry's database, sequence, predecessor seal and canonical text; the head's seal), without this
  gateway's cache and without changing it. nil when there is no head; 503 when it does not verify."
  [name]
  (when-let [wire (privacy/record-text name "head.json")]
    (let [h (json/read-str wire) n (get h "seq") attrs (get h "attributes") sealed? (get h "sealed")]
      (when-not (and (= name (get h "database")) (integer? n) (<= 0 n) (vector? attrs) (seq attrs) (every? string? attrs)
                     (instance? Boolean sealed?))
        (privacy/unavailable!))
      (let [state (reduce (fn [state k]
                            (let [raw (or (privacy/record-text name (str "erase-" k ".json")) (privacy/unavailable!))
                                  item (json/read-str raw)]
                              (when-not (and (= name (get item "database")) (= k (get item "seq"))
                                             (= (:seal state) (get item "previous")) (= raw (json/write-str item)))
                                (privacy/unavailable!))
                              (@#'privacy/apply-entry state item)))
                          {:seq 0 :seal privacy/zeros :commands {} :erased {} :families #{} :attrs (set attrs) :sealed sealed?}
                          (range 1 (inc n)))]
        (when-not (= (:seal state) (get h "seal")) (privacy/unavailable!))
        (assoc state :wire wire)))))

(defn- seal-at [state k]
  (cond (zero? k) privacy/zeros
        (= k (:seq state)) (:seal state)
        :else (some (fn [e] (when (= k (get e "seq")) (privacy/sha256 (json/write-str e)))) (vals (:commands state)))))

(defn shred-after-failure!
  "[F1 of the B2 review] The key pass's cut of `name` was refused: counted and logged as before (`shred`). Then, for the
  key pass only, the log is read again without the cache. When it verifies:
  - not behind what this gateway verified last, and the same chain up to it (its policy copy was rewritten, say): the
    cache takes it, so later passes and requests use it;
  - behind it (a restored older copy): the cache is kept, so requests keep refusing; the scope's progress mark comes
    back to the copy's sequence, so the removals published after it are not skipped;
  and the copy's published removals whose grace has ended have their keys deleted (every removal in a published
  prefix was published; deleting a key twice is harmless: a missing file, no row)."
  [name cutoff e]
  ((requiring-resolve 'triplex.gateway.failures/note!) "shred" name e)
  (when-let [v (try (verify-log name)
                    (catch Exception x ((requiring-resolve 'triplex.gateway.failures/note!) "shred-reread" name x) nil))]
    (let [prior (get @privacy/cache name)]
      (if (or (nil? prior) (and (>= (long (:seq v)) (long (:seq prior))) (= (:seal prior) (seal-at v (:seq prior)))))
        (swap! privacy/cache update name (fn [c] (if (and c (> (long (:seq c)) (long (:seq v)))) c v)))
        (swap! envelope/shredded update name (fn [m] (min (long (or m 0)) (long (:seq v))))))
      (when (:sealed v)
        (let [from (long (get @envelope/shredded name 0))
              due (->> (:commands v) vals (sort-by #(get % "seq"))
                       (drop-while #(<= (get % "seq") from))
                       (take-while #(<= (get % "erasedAt") cutoff)))]
          (when (seq due)
            (envelope/erase-keys! name (mapcat #(get % "identities") due))
            (swap! envelope/shredded assoc name (get (last due) "seq"))))))))

(defn take-key-refilled!
  "[DX-ERA2 sixth pass, found by the SDK end-to-end stack] The PostgreSQL authority's key pool of `name` is empty on this
  gateway: a gateway fills a database's pool when it serves that database's protection declaration, and its worker
  refills only pools it already holds, so on every other gateway (and after a restart) the first sealed save of a
  database found no key and was refused (and mapped to 400 TransactionRejected). The pool is filled once here, then
  a key taken; refused only if that fails (503 EnvelopeKeyPoolEmpty, kept typed by storage/commit!)."
  [name]
  (@#'envelope/refill! name)
  (or (.poll ^java.util.concurrent.ConcurrentLinkedQueue (@#'envelope/pool name))
      (privacy/failure! 503 "EnvelopeKeyPoolEmpty" "Retry the protected save after replenishment")))

(defn retire-log!
  "[V5 of the fifth review] The removal log and keys of a database that no longer exists leave the authority: no worker
  pass lists it again, and a database created later under the same name starts with no log. The data is gone, so the
  log has nothing left to protect, and its keys (each one opens a deleted value) go with it."
  [name]
  (let [had (some? (privacy/record-text name "head.json"))]
    (if sql/url
      (@#'sql/transaction!
        (fn [c]
          (@#'sql/execute! c "DELETE FROM triplex_removal.records WHERE scope=?" [name])
          (@#'sql/execute! c "DELETE FROM triplex_removal.keys WHERE scope=?" [name])))
      (let [dir (.getParent (privacy/path name "head.json"))]
        (when (privacy/exists? dir)
          (doseq [f (with-open [s (Files/list dir)] (vec (iterator-seq (.iterator s))))] (Files/deleteIfExists f))
          (Files/deleteIfExists dir)
          (privacy/sync-directory! (.getParent dir)))))
    (.remove ^java.util.Map @#'envelope/batches name)
    (swap! envelope/shredded dissoc name)
    (swap! privacy/cache dissoc name)
    (when had (println (json/write-str {"schema" "triplex.removal-log-retired.v1" "database" name})))
    nil))
