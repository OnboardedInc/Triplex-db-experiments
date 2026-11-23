(ns triplex.gateway.feed
  (:require [clojure.data.json :as json] [triplex.gateway.privacy :as privacy] [triplex.gateway.trace :as trace]
            [datomic.api :as d] [triplex.gateway.recent :as recent] [triplex.gateway.admission :as admission]
            [triplex.gateway.codec :as codec] [triplex.gateway.save-ledger :as ledger]
            [triplex.gateway.packed-journal :as packed] [triplex.gateway.slim :as slim])
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
(defn fact-change [db tx eid op application-only?]
  (let [f (d/entity db eid)
        position (or (get f (if (= op "assert") :f/position :f/retracted-position)) (:triplex.tx/position tx))]
    ;; [DX-W1] Why: Q107c treats journal rows as audit data, outside the application change stream.
    ;; Rejected: delivering an extra domain change for each copy of that change in its own envelope.
    (when (or (not application-only?) (not= "_Transaction" (:f/entity-type f)))
      {:op op :entity (required (:triplex.entity/id (:f/subject f)))
       :attribute (required (:triplex.attr/key (:f/attr f))) :assertionId (required (:f/id f))
       :validFrom (required (:f/valid-from f)) :validTo (:f/valid-to f) :position (str (required position))})))
(defn stamp [clock]
  (if (and (number? clock) (<= 0 clock 9007199254740991) (== clock (long clock)))
    {:stamp (str (long clock)) :stampStatus "decided"}
    {:stamp nil :stampStatus "pending-RT01"}))
(defn project-protected [db {:keys [t]}]
  (let [cut (d/as-of db t) tx-id (d/t->tx t) tx (d/entity cut tx-id) p (:triplex.tx/position tx)]
    (if (nil? p)
      {:t (str t) :kind "skipped" :reason "non-triplex"}
      (let [journals (ledger/journals cut tx-id)
            rows (mapcat (fn [[e _]]
                           (map (comp privacy/packed-row slim/row-text)
                                (concat (map :v (d/datoms cut :eavt e :triplex.entity/row))
                                        (when (d/entid cut :triplex.journal/packed) (packed/rows cut e)))))
                         journals)
            records (group-by :attribute rows)
            positions (or (seq (sort-by bigint (distinct (map :recorded_position (records ":_tx/position"))))) [p])
            txids (or (seq (distinct (map :entity_id (records ":_tx/position")))) [(required (ledger/tx-id cut tx-id))])
            changes (mapv (fn [r]
                            (let [c (json/read-str (:value_json r))]
                              (cond-> {:op (required (get c "op")) :entity (required (get c "entityId"))
                                       :attribute (required (get c "attribute")) :assertionId (required (get c "tripleId"))
                                       :validFrom (required (get c "validFrom")) :validTo (get c "validTo")
                                       :position (str (bigint (:recorded_position r)))}
                                (= "erase" (get c "op")) (assoc :erasureSeq (str (get c "erasureSeq"))))))
                          (records ":_tx/change"))
            ;; [DX-W1] Why: K stores only the immutable high-water clock for a solo commit.
            ;; Rejected: requiring the removed duplicate field when delivering a protected save.
            clock (required (ledger/clock cut tx-id))]
        {:t (str t) :kind "commit"
         :transaction (merge {:positions (mapv #(str (bigint %)) positions)
                              :txIds (vec txids) :operationId (required (:triplex.tx/operation-id tx))
                              :commandIds (vec (distinct (map :value_string (records ":_tx/command-id"))))
                              :changes (vec (sort-by (juxt #(bigint (:position %)) :assertionId :op) changes))}
                             (stamp clock))}))))

(defn project
  ([db entry] (project db entry false))
  ([db {:keys [t data]} application-only?]
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
                                         (or (= (:a datom) assert-attr) (= (:a datom) id-attr)) (fact-change cut tx (:e datom) "assert" application-only?)
                                         (= (:a datom) retract-attr) (fact-change cut tx (:e datom) "retract" application-only?)))))
                         distinct (sort-by (juxt #(bigint (:position %)) :assertionId :op)) vec)
            positions (->> (conj (mapv :position changes) (str p)) distinct (sort-by bigint) vec)
            txids (->> (concat [(:triplex.tx/id tx)]
                               (map (fn [c] (let [f (d/entity cut [:f/id (:assertionId c)])]
                                              (if (= "assert" (:op c)) (:f/tx-id f) (:f/retract-tx-id f)))) changes))
                       (remove nil?) distinct sort vec)
            commands (sort (trace/span "d/q" "peer-call" (d/q '[:find [?id ...] :in $ ?tx :where [?c :triplex.claim/tx ?tx] [?c :triplex.claim/command-id ?id]] cut (d/t->tx t))))
            clock (required (:triplex.tx/recorded-at tx))]
        ;; [EXP-DF01] Why: DA01 fractional legacy record times cannot satisfy FD01's natural stamp.
        ;; Rejected: rounding the annotation or borrowing :db/txInstant (changes the decided record time).
        {:t (str t) :kind "commit"
         :transaction (merge {:positions positions :txIds txids
                              :operationId (required (:triplex.tx/operation-id tx)) :commandIds (vec commands) :changes changes}
                             (stamp clock))})))))
(defn project-application [db entry] (project db entry true))


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
        (let [signal @(:signal watch) db (trace/span "d/db" "peer-call" (d/db conn)) remaining (- deadline (System/nanoTime))]
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
(defn log-page
  ([conn input] (log-page conn input project))
  ([conn input project-entry] (log-page conn input project-entry nil))
  ([conn input project-entry assert-source!]
  (let [from (natural (get input "fromT" "0")) limit (bounded (get input "limit") 1000 1000)
        wait-ms (bounded (get input "waitMs") 0 30000)]
    (when (zero? limit) (codec/invalid "Empty log limit"))
    (let [watch (when (pos? wait-ms) (subscribe! conn))]
      (try
        (let [read-page (fn [start n]
                          (admission/execute admission/journals (fn []
                          (let [db (trace/span "d/db" "peer-call" (d/db conn)) end (inc (d/basis-t db))]
                            (when assert-source! (assert-source! db))
                            (if (>= start end) []
                              (mapv #(project-entry db %) (take n (d/tx-range (d/log conn) start end))))))))
              rows (poll-log from limit wait-ms read-page
                     (fn []
                       (let [signal (when watch @(:signal watch))]
                         (fn [remaining-ns]
                           (deref signal (quot (+ remaining-ns 999999) 1000000) false)))))]
          {:fromT (str from) :nextT (if (seq rows) (str (inc (natural (:t (last rows))))) (str from)) :rows rows})
        (finally (when watch (unsubscribe! conn))))))))
