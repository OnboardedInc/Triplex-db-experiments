(ns triplex.gateway.feed
  (:require [datomic.api :as d] [triplex.gateway.recent :as recent] [triplex.gateway.admission :as admission] [triplex.gateway.codec :as codec])
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
      (let [assert-attr (d/entid cut :f/asserted-in) id-attr (d/entid cut :f/id) retract-attr (d/entid cut :f/retracted-in) erase-attr (d/entid cut :f/erased-in)
            changes (->> data
                         (keep (fn [datom]
                                 (when (:added datom)
                                   (cond (= (:a datom) erase-attr) (throw (ex-info "Erasure sequence annotation requires ER01-D" {:status 409 :code "FeedErasureUnsupported"}))
                                         ;; [DX-B2-N5] Why: new facts use the identity datom as the assertion witness; legacy rows may carry both.
                                         ;; Rejected: continuing to watch only the omitted asserted-in attribute (loses new feed assertions).
                                         (or (= (:a datom) assert-attr) (= (:a datom) id-attr)) (fact-change cut tx (:e datom) "assert")
                                         (= (:a datom) retract-attr) (fact-change cut tx (:e datom) "retract")))))
                         distinct (sort-by (juxt #(bigint (:position %)) :assertionId :op)) vec)
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
;; [DX-B8-C] Why: notification-only subscribers need no DB read; initialize revision state only after its queue exists.
;; Rejected: snapshotting before queue creation (can miss a report), or assuming every generic subscriber is a Datomic connection.
(defn subscribe!
  ([conn] (subscribe! conn nil))
  ([conn make-recent]
  (locking wakeups
    (let [state (or (@wakeups conn)
                    (let [^java.util.concurrent.BlockingQueue queue (d/tx-report-queue conn) signal (atom (promise)) running (atom true)
                          recent-state (when make-recent (make-recent))
                          ;; [DX-B7-S4] Why: one daemon owns this connection's report queue and broadcasts wakeups.
                          ;; Rejected: one queue consumer per waiter, or millisecond sleeps between predicate reads.
                          worker (doto (Thread.
                                    (fn []
                                      (try
                                        (while @running
                                          (let [report (.take queue)]
                                            (when recent-state (recent/apply-report! recent-state report)))
                                          (let [old @signal] (reset! signal (promise)) (deliver old true)))
                                        (catch InterruptedException _))) "tx2-peer-notify")
                                   (.setDaemon true) (.start))]
                      {:signal signal :running running :worker worker :recent recent-state :users 0}))
          next (update state :users inc)]
      (swap! wakeups assoc conn next)
      next))))
(defn unsubscribe! [conn]
  (locking wakeups
    (let [state (@wakeups conn)]
      (if (> (:users state) 1) (swap! wakeups update-in [conn :users] dec)
        (do (reset! (:running state) false)
            (.interrupt ^Thread (:worker state))
            (.join ^Thread (:worker state) 1000)
            (recent/close! (:recent state))
            (d/remove-tx-report-queue conn)
            (swap! wakeups dissoc conn))))))
 ;; [DX-B7-S4] Why: arm before checking the current immutable db, so a commit cannot disappear between check and wait.
;; Rejected: sleeping first, or arming after an empty read (loses a sparse writer's only notification).
(defn await-db [conn ready? deadline]
  (let [watch (subscribe! conn)]
    (try
      (loop []
        (let [signal @(:signal watch) db (d/db conn) remaining (- deadline (System/nanoTime))]
          (if (or (ready? db) (<= remaining 0)) db
            (do (deref signal (quot (+ remaining 999999) 1000000) false) (recur)))))
      (finally (unsubscribe! conn)))))
(defn- poll-log-with-clock [from limit wait-ms read-page arm-wait now-ns]
  ;; [EXP-DF01-R2] Why: F1 reports can be stale or precede a readable cut; only the log answers.
  ;; Rejected: one wake/read (returns empty early) or reusing a delivered promise (busy spins).
  (let [deadline (+ (now-ns) (* wait-ms 1000000))]
    (loop []
      (let [wait! (arm-wait) rows (vec (read-page from limit))
            remaining (- deadline (now-ns))]
        (cond
          (seq rows) rows
          ;; [EXP-DF01-R3] Why: an empty cut captured before expiry can return after publication/expiry.
          ;; Rejected: returning that old cut (F1); looping final reads (unbounded); extra zero-wait reads.
          (<= remaining 0) (if (zero? wait-ms) rows (vec (read-page from limit)))
          :else (do (wait! remaining) (recur)))))))
(defn poll-log [from limit wait-ms read-page arm-wait]
  ;; [EXP-DF01-R3] Why: isolate the clock seam for exact-nanosecond boundary tests; route always uses the real clock.
  ;; Rejected: redefining the production clock in the real-time reviewer probe (would invalidate its timing window).
  (poll-log-with-clock from limit wait-ms read-page arm-wait #(System/nanoTime)))
(defn log-page [conn input]
  (let [from (natural (get input "fromT" "0")) limit (bounded (get input "limit") 1000 1000)
        wait-ms (bounded (get input "waitMs") 0 30000)]
    (when (zero? limit) (codec/invalid "Empty log limit"))
    (let [watch (when (pos? wait-ms) (subscribe! conn))]
      (try
        (let [read-page (fn [start n]
                          (admission/execute admission/journals (fn []
                          (let [db (d/db conn) end (inc (d/basis-t db))]
                            (if (>= start end) []
                              (mapv #(project db %) (take n (d/tx-range (d/log conn) start end))))))))
              rows (poll-log from limit wait-ms read-page
                     (fn []
                       (let [signal (when watch @(:signal watch))]
                         (fn [remaining-ns]
                           (deref signal (quot (+ remaining-ns 999999) 1000000) false)))))]
          {:fromT (str from) :nextT (if (seq rows) (str (inc (natural (:t (last rows))))) (str from)) :rows rows})
        (finally (when watch (unsubscribe! conn)))))))
