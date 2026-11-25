(ns triplex.gateway.removal-erase
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.lean :as lean] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.scope :as scope]))

;; [DX-ACT9] Why: DX-ERA2's removal per account lived in erase.clj, which loads before the namespaces whose stored
;; function texts carry generated names (predecessor, packed-journal, commit, subject-save, owner-layout,
;; general-prefetch); its new functions renumbered those names, so with every option off the merged gateway installed
;; 17 of 58 stored functions under new identities. The code below is DX-ERA2's erase.clj code moved verbatim (only its
;; references to erase.clj's own definitions now go through erase/ or its vars), loaded by main.clj after every stored
;; function text. erase.clj keeps the base removal and hands a removal here when the per-account option or the tries
;; log is on (privacy/removal-late). Rejected: rewriting DX-ERA2's code without generated names (a behaviour risk on
;; the removal path for no gain), and accepting new identities (a database opened by the base would install its writer
;; functions again).

(defn- operation-id [entry] (@#'erase/operation-id entry))
(def ^:private cut-moved @#'erase/cut-moved)

(defn selector-buckets
  "The accounts whose values these selectors can reach: an entity selector names its entity; an assertion selector
  names the entity that assertion belongs to (fixed for its whole life)."
  [db selectors]
  (into (sorted-set)
        (map (fn [s]
               (removal-scope/bucket
                 (or (get s "entityId")
                     (let [id (get s "id")
                           private-id (when (d/entid db :triplex.private/id) (d/entid db [:triplex.private/id id]))]
                       (if private-id (scope/value db private-id :triplex.private/entity)
                         (some-> (lean/by-id (d/history db) id) :v lean/decode :entity_id)))))))
        selectors))

(defn with-bucket-guards [name buckets work]
  (if-let [[b & more] (seq buckets)]
    (privacy/guard (removal-scope/lock-name name b) #(with-bucket-guards name more work))
    (work)))

;; [DX-ERA2] Why: guarded per account, other accounts' saves no longer pause during a removal, so the removal's own
;; "head has not moved since my selection" check (database-wide, P9) retries more often; this measures how often.
;; One JSON line per removal on standard output when TX2_REMOVAL_TRIES_LOG=1 (unset: nothing printed).
(def ^:private tries-log (= "1" (System/getenv "TX2_REMOVAL_TRIES_LOG")))
;; [DX-ERA2] On a database guarded per account every removal checks its selection per subject, takes its log position at
;; its own commit and declares itself natively first (removal_commit.clj, loaded on first use only, so this file and
;; every installed function text stay as they are without the per-account option).
;; [DX-ERA3 F2] TX2_REMOVAL_SUBJECT_CHECK no longer selects the path: a removal committed by one gateway must be
;; completable by every gateway of the fleet, so there is one per-account path. The setting is read and ignored.
(def ^:private subject-check (= "1" (System/getenv "TX2_REMOVAL_SUBJECT_CHECK")))

(defn erase! [name conn input]
  ;; Nested if, not `and`: `and` generates a name, which would renumber the installed functions loaded after this file.
  (if (removal-scope/per-account? (d/db conn))
    ((requiring-resolve 'triplex.gateway.removal-commit/erase!) name conn input)
  (let [selectors (erase/selectors! input)
        started (System/nanoTime)
        command (get input "commandId")
        db (d/db conn)
        ;; [DX-ERA2] Per account, a removal also holds the locks of the accounts it can touch, which is what a derived
        ;; write naming those accounts holds instead of the database's lock.
        buckets (when (removal-scope/per-account? db) (selector-buckets db selectors))]
    (when-not (privacy/cut name db true)
      (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
    (privacy/guard name
      (fn [] (with-bucket-guards name buckets (fn []
        (let [db (erase/sync! conn)
              current (privacy/cut name db true)]
          (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          ;; [DX-ERA3 F3] A database guarded per account that this gateway cannot treat as such (it runs without the
          ;; option): refuse before anything is written, so no intent is left for the fleet to trip over.
          (when (= removal-scope/sentinel (scope/value db (scope/entity db) :triplex.scope/erasure-seq)) (privacy/unavailable!))
          (privacy/clear-completed! name current)
          (if-let [before (get-in current [:commands command])]
            (do (when-not (= selectors (get before "selectors"))
                  (privacy/failure! 409 "EraseCommandConflict" "The command already used different selectors"))
                (erase/response db before))
            (let [pending (privacy/pending name)
                  _ (when (and pending (not= [command selectors] (mapv #(get pending %) ["commandId" "selectors"])))
                      (privacy/unavailable!))
                  _ (when (and (not pending) (d/entid db [:triplex.claim/command-id command]))
                      (privacy/failure! 409 "EraseCommandConflict" "The command identity is already claimed"))]
              (loop [view db prepared pending tries 1]
                (let [entry (or prepared (erase/make-entry name view current command selectors))
                      ;; [DX-ERA2] The selection cannot reach an account whose lock this removal does not hold.
                      _ (when (and buckets (not (every? buckets (removal-scope/entry-buckets entry))))
                          (privacy/unavailable!))
                      _ (when-not prepared (privacy/prepare! name entry))
                      moved (try (erase/apply-native! conn view entry) false
                                  (catch Exception error
                                    (if (some #(= cut-moved (ex-message %)) (take-while some? (iterate ex-cause error)))
                                      true
                                      (throw error))))]
                  (if moved
                    (let [next (erase/sync! conn)
                          committed (d/entid next [:triplex.tx/operation-id (operation-id entry)])]
                      (recur next (when committed entry) (inc tries)))
                    (do (privacy/publish! name current entry)
                        (when tries-log
                          (println (json/write-str {"schema" "triplex.removal-tries.v1" "seq" (get entry "seq")
                                                    "tries" tries "perAccount" (boolean buckets)
                                                    "ms" (/ (- (System/nanoTime) started) 1.0e6)})))
                        (erase/response (d/db conn) entry)))))))))))))))

;; [DX-ERA2] Why: a request on a database guarded per account uses the last published cut while another removal is
;; prepared or natively committed but unpublished: a write is fenced at the serial point on its own accounts, and a
;; read is then a read that started before that removal's publication (TARGETS section 7.1). Anything else is
;; retried up to four times on a freshly synced database, then refused: a native value behind the published log
;; (another gateway's removal not yet seen by this peer, and further removals can publish meanwhile), and a cut
;; read that lost a race with a newer one on this gateway (privacy/cut refuses a published log behind the one it
;; verified last). A restored copy stays behind on every try and is refused, as before. Retrying changes only
;; whether a request waits: a request is served only from a cut that passes removal-scope/consistent?.
;; Rejected: refusing every request of every account while any removal is pending (the database-wide rule).
(defn request-cut [name conn db]
  (loop [db db tries 0]
    (let [state (try ((requiring-resolve 'triplex.gateway.removal-commit/log-cut) name db)
                     (catch clojure.lang.ExceptionInfo e
                       (if (and (< tries 4) (= "ErasureFrontierUnavailable" (:code (ex-data e)))) ::retry
                         (throw ((requiring-resolve 'triplex.gateway.removal-commit/typed-failure) name db e)))))]
      (cond
        (= ::retry state) (recur (erase/sync! conn) (inc tries))
        (nil? state) [nil db]
        ;; [DX-ERA3 N5] the declared sequence too, and a typed answer when the log is behind the data (DX-ERA2's third
        ;; pass, merged here where this function now lives)
        ;; [DX-ERA2 fourth pass] served: a pending removal already committed takes effect (M1); with the commit
        ;; boundary every removal committed in the data does (merged here, DX-ERA4)
        ((requiring-resolve 'triplex.gateway.removal-commit/consistent?) name db state)
        [((requiring-resolve 'triplex.gateway.removal-commit/served) name db state) db]
        (< tries 4) (recur (erase/sync! conn) (inc tries))
        :else ((requiring-resolve 'triplex.gateway.removal-commit/refuse-inconsistent!) name db state)))))

;; [DX-ERA2] Why: move an existing protected database to removal sequences per account (or back), online: under the
;; removal lock, one small transaction (the global sequence moves to its own attribute, the database-wide one takes the
;; sentinel, and each account that ever lost a value gets its sequence from the published log). A save prepared under
;; the other mode fails its fence once and is sent again under the new one.
;; Rejected: rewriting the removal log or the stored rows (neither changes; the log is the same ordered log).
(defn per-account! [name conn input]
  (when-not removal-scope/enabled
    (privacy/failure! 404 "NotFound" "Removal per account is off on this gateway"))
  (when-not (and (map? input) (every? #{"back"} (keys input)) (contains? #{nil true false} (get input "back")))
    (privacy/failure! 400 "InvalidValue" "Expected {} or {\"back\": true}"))
  (let [back? (true? (get input "back"))]
    (privacy/guard name
      (fn []
        (let [db (erase/sync! conn)
              state (privacy/cut name db)]
          (when-not state (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
          (privacy/verify-data! state db)
          (let [head (scope/entity db) n (:seq state) per? (removal-scope/per-account? db)
                buckets (:buckets state)
                ops (cond
                      (= back? (not per?)) nil
                      back? [[:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel n]
                             [:db/retract head :triplex.scope/removal-seq n]]
                      :else [[:db/cas head :triplex.scope/erasure-seq n removal-scope/sentinel]
                             [:db/add head :triplex.scope/removal-seq n]
                             ;; [DX-ERA3 F1] nothing declared beyond the log
                             [:db/add head :triplex.scope/removal-intent n]])
                ;; [DX-ERA3] and every native counter the log does not derive goes back to 0 (a held account or subject
                ;; left by a removal that never reached its intent, or by an earlier move)
                counters (when (and ops (not back?))
                           (partition-all 1000 (concat (removal-scope/counter-ops (:entities state) buckets)
                                                       ((requiring-resolve 'triplex.gateway.removal-commit/stale-counter-ops) db state))))
                transact! #(when (= ::timeout (deref (d/transact conn (vec %)) 5000 ::timeout)) (privacy/unavailable!))]
            (when (and ops (not back?)) (removal-scope/install! conn db))
            ;; Counters first (nothing reads them before the mode moves), in parts of 1,000; the move itself last.
            (doseq [part counters] (transact! part))
            (when ops (transact! ops))
            (let [after (erase/sync! conn)]
              {:database name :perAccount (removal-scope/per-account? after) :seq n
               :accounts (count buckets) :entities (count (:entities state)) :changed (boolean ops)})))))))

;; erase.clj hands a removal here (privacy/removal-late).
(alter-var-root #'privacy/removal-hooks assoc :erase! erase!)
