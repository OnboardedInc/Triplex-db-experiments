(ns triplex.gateway.feed
  (:require [datomic.api :as d] [triplex.gateway.codec :as codec])
  (:import [java.util.concurrent TimeUnit]))

;; [EXP-DF01] Why: R29/R41 E6 uses reports only as wakeups, always replaying the durable log.
;; Rejected: persisting queue contents (restart loss, duplicate delivery and unbounded resident memory).
(defn natural [s]
  (when-not (and (string? s) (re-matches #"0|[1-9][0-9]*" s)) (codec/invalid "Invalid log coordinate"))
  (try (Long/parseLong s) (catch Exception _ (codec/invalid "Log coordinate overflow"))))
(defn bounded [s default maximum]
  (let [n (if (nil? s) default (natural s))]
    (when (> n maximum) (codec/invalid "Log request exceeds budget")) n))
(defn required [v]
  (when (nil? v) (codec/invalid "Incomplete feed identity annotation")) v)
(defn fact-change [db tx eid op]
  (let [f (d/entity db eid)
        position (or (get f (if (= op "assert") :f/position :f/retracted-position)) (:triplex.tx/position tx))]
    {:op op :entity (required (:triplex.entity/id (:f/subject f)))
     :attribute (required (:triplex.attr/key (:f/attr f))) :assertionId (required (:f/id f))
     :validFrom (required (:f/valid-from f)) :validTo (:f/valid-to f) :position (str (required position))}))
(defn project [db {:keys [t data]}]
  (let [cut (d/as-of db t) tx (d/entity cut (d/t->tx t)) p (:triplex.tx/position tx)]
    (if (nil? p)
      {:t (str t) :kind "skipped" :reason "non-triplex"}
      (let [assert-attr (d/entid cut :f/asserted-in) retract-attr (d/entid cut :f/retracted-in) erase-attr (d/entid cut :f/erased-in)
            changes (->> data
                         (keep (fn [datom]
                                 (when (:added datom)
                                   (cond (= (:a datom) erase-attr) (throw (ex-info "Erasure sequence annotation requires ER01-D" {:status 409 :code "FeedErasureUnsupported"}))
                                         (= (:a datom) assert-attr) (fact-change cut tx (:e datom) "assert")
                                         (= (:a datom) retract-attr) (fact-change cut tx (:e datom) "retract")))))
                         (sort-by (juxt #(bigint (:position %)) :assertionId :op)) vec)
            positions (->> (conj (mapv :position changes) (str p)) distinct (sort-by bigint) vec)
            txids (->> (concat [(:triplex.tx/id tx)]
                               (map (fn [c] (let [f (d/entity cut [:f/id (:assertionId c)])]
                                              (if (= "assert" (:op c)) (:f/tx-id f) (:f/retract-tx-id f)))) changes))
                       (remove nil?) distinct sort vec)
            commands (sort (d/q '[:find [?id ...] :in $ ?tx :where [?c :triplex.claim/tx ?tx] [?c :triplex.claim/command-id ?id]] cut (d/t->tx t)))
            stamp (required (:triplex.tx/recorded-at tx))]
        ;; [EXP-DF01] Why: DA01 fractional legacy record times cannot satisfy FD01's natural stamp.
        ;; Rejected: rounding the annotation or borrowing :db/txInstant (changes the decided record time).
        {:t (str t) :kind "commit"
         :transaction (merge {:positions positions :txIds txids
                              :operationId (required (:triplex.tx/operation-id tx)) :commandIds (vec commands) :changes changes}
                             (if (and (number? stamp) (<= 0 stamp 9007199254740991) (== stamp (long stamp)))
                               {:stamp (str (long stamp)) :stampStatus "decided"}
                               {:stamp nil :stampStatus "pending-RT01"}))}))))


;; [EXP-DF01] Why: Datomic owns ONE report queue per connection; broadcast wakeups to all polls.
;; Rejected: remove per request (disconnects other waiters) or retaining reports (unbounded data copies).
(def wakeups (atom {}))
(defn subscribe! [conn]
  (locking wakeups
    (let [state (or (@wakeups conn)
                    (let [queue (d/tx-report-queue conn) signal (atom (promise)) running (atom true)
                          worker (future (while @running
                                           (when (.poll queue 100 TimeUnit/MILLISECONDS)
                                             (let [old @signal] (reset! signal (promise)) (deliver old true)))))]
                      {:signal signal :running running :worker worker :users 0}))
          next (update state :users inc)]
      (swap! wakeups assoc conn next)
      next)))
(defn unsubscribe! [conn]
  (locking wakeups
    (let [state (@wakeups conn)]
      (if (> (:users state) 1) (swap! wakeups update-in [conn :users] dec)
        (do (reset! (:running state) false)
            (future-cancel (:worker state))
            (d/remove-tx-report-queue conn)
            (swap! wakeups dissoc conn))))))
(defn poll-log [from limit wait-ms read-page arm-wait]
  ;; [EXP-DF01-R2] Why: F1 reports can be stale or precede a readable cut; only the log answers.
  ;; Rejected: one wake/read (returns empty early) or reusing a delivered promise (busy spins).
  (let [deadline (+ (System/nanoTime) (* wait-ms 1000000))]
    (loop []
      (let [wait! (arm-wait) rows (vec (read-page from limit))
            remaining (- deadline (System/nanoTime))]
        (cond
          (seq rows) rows
          (<= remaining 0) rows
          :else (do (wait! remaining) (recur)))))))
(defn log-page [conn input]
  (let [from (natural (get input "fromT" "0")) limit (bounded (get input "limit") 1000 1000)
        wait-ms (bounded (get input "waitMs") 0 30000)]
    (when (zero? limit) (codec/invalid "Empty log limit"))
    (let [watch (when (pos? wait-ms) (subscribe! conn))]
      (try
        (let [read-page (fn [start n]
                          (let [db (d/db conn) end (inc (d/basis-t db))]
                            (if (>= start end) []
                              (mapv #(project db %) (take n (d/tx-range (d/log conn) start end))))))
              rows (poll-log from limit wait-ms read-page
                     (fn []
                       (let [signal (when watch @(:signal watch))]
                         (fn [remaining-ns]
                           (deref signal (quot (+ remaining-ns 999999) 1000000) false)))))]
          {:fromT (str from) :nextT (if (seq rows) (str (inc (natural (:t (last rows))))) (str from)) :rows rows})
        (finally (when watch (unsubscribe! conn)))))))
