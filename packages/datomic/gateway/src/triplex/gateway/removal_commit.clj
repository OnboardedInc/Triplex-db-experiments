(ns triplex.gateway.removal-commit
  "[DX-ERA2] Removal on request that takes its log position at its own commit and checks its selection per subject
  (TX2_REMOVAL_SUBJECT_CHECK=1, default off), on a database guarded per account (TX2_REMOVAL_PER_ACCOUNT=1, moved).
  Why: guarded per account, other accounts' saves no longer pause during a removal, and the removal's database-wide
  check that the head had not moved since its selection retried it whenever any account committed in that window
  (mean tries e^(commits per second x window); 63 tries and 15 s on the toy, no upper limit). What the selection
  depends on is the selected subjects' own datoms, so the removal now proves at its serial point that none of them
  changed since its selection, and takes the next log position there (the journal rows and the log entry are written
  at a provisional position and stamp and rewritten by the installed function, exactly as the save commit function
  shifts a provisional position). A removal whose own subjects keep changing takes a short guard on those subjects only
  (their removal counters go negative, so every save of them fails its fence at the serial point) after
  `narrow-tries`, which bounds it: see era2/REMOVAL-PER-ACCOUNT.md section 13 for the proof and the bound.
  Rejected: keeping the head check (unbounded under load); pausing every save of the database or of the account (it
  refuses saves the removal cannot affect); a guard held through the authority only (a save admitted before it could
  still commit, so the bound would depend on the gateway's in-flight writes).
  Loaded on first use (erase/erase! resolves it), so a gateway without the option loads none of this."
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as removal-scope] [triplex.gateway.scope :as scope]))

(def commit-ident :triplex.removal/commit-v1)
(def moved "TRIPLEX_REMOVAL_SUBJECT_MOVED")
;; Tries on the narrow check alone before the subject guard, and tries under the guard before the removal answers 503
;; and stays pending (resumable). Under the guard only an unfenced write of the subject can fail a try (an owner-root
;; fold, once per subject); none was observed.
(def narrow-tries 2)
(def guarded-tries 3)
(def tries-log (= "1" (System/getenv "TX2_REMOVAL_TRIES_LOG")))

(def commit-code
  ;; No #() and no syntax quote: the stored function text is the same on every gateway.
  '(let [{:keys [basis entities stamp rows record operation txid cols]} payload
         since (d/history (d/since db basis))
         owner-a (d/entid db :triplex.owner/version-owner)
         private-a (d/entid db :triplex.private/entity)
         touched (fn [e] (seq (d/datoms since :eavt e)))
         changed (fn [entity]
                   (let [e (d/entid db [:triplex.entity/id entity])]
                     (or (and e (touched e))
                         (and e owner-a (or (seq (d/datoms since :vaet e owner-a))
                                            (some (fn [link] (touched (:e link))) (d/datoms db :vaet e owner-a))))
                         (and private-a (or (seq (d/datoms since :avet private-a entity))
                                            (some (fn [r] (touched (:e r))) (d/datoms db :avet private-a entity)))))))]
     (when-let [entity (first (filter changed entities))]
       (throw (ex-info "TRIPLEX_REMOVAL_SUBJECT_MOVED" {:entity entity})))
     (let [value (fn [e a] (:v (first (d/datoms db :eavt e a))))
           position-a (d/entid db :triplex.tx/position)
           v2 (and (d/entid db :triplex.scope/head-version) (= 2 (value scope :triplex.scope/head-version)))
           newest (when v2 (let [datom (first (d/rseek-datoms db :aevt position-a (d/t->tx (d/basis-t db))))]
                             (when (and datom (= (:a datom) position-a)) (:e datom))))
           prior (value scope :triplex.scope/position)
           head (or (if v2 (when newest (value newest :triplex.tx/position)) prior) 0)
           latest (if v2 (when newest (value newest :triplex.tx/max-recorded-at)) (value scope :triplex.scope/max-recorded-at))
           position (inc head)
           at (max stamp (inc (long (or latest 0))))
           clock (double at)
           digits (format "%016d" position)
           rewrite (fn [text]
                     (let [id-end (+ 5 (Integer/parseInt (subs text 1 5) 16))
                           ref-end (+ id-end 36)
                           start (inc (+ ref-end (Integer/parseInt (subs text (- ref-end 4) ref-end) 16)))
                           values (assoc (json/read-str (subs text start))
                                         (:position cols) digits (:recorded-at cols) clock)
                           values (if (= ":_tx/instant" (nth values (:attribute cols)))
                                    (assoc values (:datetime cols) clock) values)]
                       (str (subs text 0 start) (json/write-str values))))
           entry (assoc (json/read-str record) "position" position "erasedAt" at)
           ops [{:db/id "datomic.tx" :triplex.tx/position position :triplex.tx/operation-id operation :triplex.tx/id txid
                 :triplex.tx/recorded-at clock :triplex.tx/max-recorded-at clock
                 :triplex.tx/erasure-record (json/write-str entry) :triplex.tx/journals ["privacy-journal"]}
                {:db/id "privacy-journal" :triplex.entity/id txid :triplex.journal/position position
                 :triplex.entity/rev position :triplex.entity/row (mapv rewrite rows)}]]
       (if v2 ops (conj ops [:db/cas scope :triplex.scope/position prior position])))))

(defn- install! [conn db]
  (if (d/entid db commit-ident) db
    (let [report (deref (d/transact conn [{:db/ident commit-ident
                                           :db/fn (d/function {:lang :clojure :params '[db scope payload]
                                                               :requires '[[datomic.api :as d] [clojure.data.json :as json]]
                                                               :code commit-code})}]) 5000 ::timeout)]
      (when (= ::timeout report) (privacy/unavailable!))
      (:db-after report))))

(defn check-entities
  "The subjects whose selection must be complete at the serial point: every entity a selector names by entity ID. An
  assertion selector names one identity, which no later write can add to."
  [selectors]
  (vec (distinct (keep (fn [s] (get s "entityId")) selectors))))

(def columns
  (into {} (map (fn [[k c]] [k (.indexOf ^java.util.List privacy/columns c)]))
        {:position :recorded_position :attribute :attribute :datetime :value_datetime :recorded-at :recorded_at}))

(defn hold!
  "The subject guard: each subject's removal counter takes the pending removal's negated sequence, which no save's fence
  can expect, so every save of these subjects fails at Datomic's serial point until this removal commits (its commit
  sets the counters again). Other subjects and accounts are untouched."
  [conn entities s]
  (let [report (deref (d/transact conn (vec (removal-scope/counter-ops (map (fn [e] [e (- s)]) entities) nil))) 5000 ::timeout)]
    (when (= ::timeout report) (privacy/unavailable!))
    (:db-after report)))

(defn commit!
  "One try: the removal's native transaction through the installed function, which refuses it if a selected subject
  changed since `view` and otherwise gives it the next position."
  [conn view current entry held]
  (let [db (install! conn view)
        head (scope/entity db)
        s (get entry "seq")
        lost (removal-scope/entry-entities entry)
        payload {:basis (d/basis-t view) :entities (check-entities (get entry "selectors")) :stamp (get entry "erasedAt")
                 :rows (@#'erase/journal-rows entry) :record (json/write-str entry)
                 :operation (@#'erase/operation-id entry) :txid (get entry "txId") :cols columns}
        ;; A held subject that lost no value goes back to its sequence from the published log.
        released (removal-scope/counter-ops (for [e held :when (not (contains? lost e))] [e (removal-scope/entity-seq current e)]) nil)
        ops (-> [[commit-ident head payload]
                 {:db/id "privacy-claim" :triplex.claim/command-id (get entry "commandId") :triplex.claim/tx "datomic.tx"
                  :triplex.claim/tx-id (get entry "txId")}
                 [:db/cas head :triplex.scope/erasure-seq removal-scope/sentinel removal-scope/sentinel]
                 [:db/cas head :triplex.scope/removal-seq (dec s) s]]
                (into (removal-scope/entry-ops entry))
                (into released))
        report (deref (d/transact conn ops) 5000 ::timeout)]
    (when (= ::timeout report) (privacy/unavailable!))
    report))

(defn- moved? [error]
  (some (fn [x] (= moved (ex-message x))) (take-while some? (iterate ex-cause error))))

(defn- same-removal [native entry]
  (= (dissoc native "position" "erasedAt") (dissoc entry "position" "erasedAt")))

(defn- native-record [db eid entry]
  (let [raw (scope/value db eid :triplex.tx/erasure-record) native (json/read-str raw)]
    (when-not (and (same-removal native entry) (= raw (json/write-str native))) (privacy/unavailable!))
    native))

(defn committed
  "A prepared removal already committed natively (stopped before publication): the stored entry, whose position and
  stamp were given at its commit."
  [db pending]
  (when-let [eid (d/entid db [:triplex.tx/operation-id (@#'erase/operation-id pending)])]
    (native-record db eid pending)))

(defn publish!
  [name conn current entry tries held started]
  (privacy/publish! name current entry)
  (when tries-log
    (println (json/write-str {"schema" "triplex.removal-tries.v1" "seq" (get entry "seq") "tries" tries
                              "perAccount" true "subjectCheck" true "held" (boolean held)
                              "ms" (/ (- (System/nanoTime) started) 1.0e6)})))
  (erase/response (d/db conn) entry))

(defn erase! [name conn input]
  (let [selectors (erase/selectors! input)
        command (get input "commandId")
        started (System/nanoTime)
        buckets (@#'erase/selector-buckets (d/db conn) selectors)]
    (when-not (privacy/cut name (d/db conn) true)
      (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
    (privacy/guard name
      (fn []
        (@#'erase/with-bucket-guards name buckets
          (fn []
            (let [db (erase/sync! conn)
                  current (privacy/cut name db true)]
              (when-not current (privacy/failure! 400 "EraseNotProtected" "Declare a protected scope first"))
              (privacy/clear-completed! name current)
              (if-let [before (get-in current [:commands command])]
                (do (when-not (= selectors (get before "selectors"))
                      (privacy/failure! 409 "EraseCommandConflict" "The command already used different selectors"))
                    (erase/response db before))
                (let [pending (privacy/pending name)
                      _ (when (and pending (not= [command selectors] [(get pending "commandId") (get pending "selectors")]))
                          (privacy/unavailable!))
                      _ (when (and (not pending) (d/entid db [:triplex.claim/command-id command]))
                          (privacy/failure! 409 "EraseCommandConflict" "The command identity is already claimed"))
                      s (inc (:seq current))
                      checked (check-entities selectors)]
                  (if-let [native (and pending (committed db pending))]
                    (publish! name conn current native 0 false started)
                    ;; A removal resumed after its guard was taken finds its subjects held and keeps them held.
                    (loop [view db tries 1
                           held (into #{} (filter (fn [e] (= (- s) (removal-scope/native-entity-seq view e))) checked))]
                      (let [entry (erase/make-entry name view current command selectors)
                            _ (when-not (every? buckets (removal-scope/entry-buckets entry)) (privacy/unavailable!))
                            _ (privacy/prepare! name entry)
                            report (try (commit! conn view current entry held)
                                        (catch Exception e (if (moved? e) nil (throw e))))]
                        (cond
                          report (let [after (:db-after report)]
                                   (publish! name conn current (native-record after (d/t->tx (d/basis-t after)) entry)
                                             tries (seq held) started))
                          (>= tries (+ narrow-tries guarded-tries)) (privacy/unavailable!)
                          (and (empty? held) (>= tries narrow-tries))
                          (do (hold! conn checked s) (recur (erase/sync! conn) (inc tries) (set checked)))
                          :else (recur (erase/sync! conn) (inc tries) held))))))))))))))
