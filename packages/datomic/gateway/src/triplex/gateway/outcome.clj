(ns triplex.gateway.outcome
  "[DX-S6] Whether a failed write was decided (refused, nothing stored) or has an unknown outcome (it may be stored).

  A failure the transactor or the gateway decided is answered 400 or 409 and is final. Every other failure after the
  transaction was handed to Datomic is answered 503 OutcomeUnknown, so the caller looks the operation up; a failure this
  namespace does not recognise is unknown, never a refusal. The fence makes an unknown outcome decided: it stores the
  operation ID without a position, so the original transaction can no longer commit (the ID is unique).

  Loaded through requiring-resolve after every stored function is defined, so it cannot shift the generated names in
  their quoted code. Rejected: deciding by matching a list of transport anomalies (anything not on the list, such as a
  connection reset, would still read as refused)."
  (:require [datomic.api :as d]))

(def ^:private decided-markers
  ;; Every refusal a stored function throws carries a TRIPLEX_ marker; Datomic's own refusals of a transaction carry
  ;; these error keys. Source: https://docs.datomic.com/transactions/transaction-functions.html and the :db.error keys
  ;; Datomic reports for a refused transaction.
  ;; Only the refusals the stored functions throw (commit.clj, subject_save.clj, group.clj, erase.clj), not every
  ;; TRIPLEX_ text (settings names are TRIPLEX_ too).
  (re-pattern (str "TRIPLEX_(?:CONFLICT|CLOCK_EXHAUSTED|CLOCK|ERASURE_FRONTIER|OPERATION_DUPLICATE|COMMAND_DUPLICATE"
                   "|IMPORT_PREDECESSOR|IDENTITY|SLIM_LAYOUT_MISMATCH|GROUP_STALE|SUBJECT_REPLAN|ERASE_HEAD_MOVED"
                   "|PROTECTION_MIGRATION_REQUIRED)\\b"
                   "|:db\\.error/cas-failed|:db\\.error/unique-conflict|:db\\.error/datoms-conflict|cas-failed|unique-conflict")))

(def ^:private decided-errors #{:db.error/cas-failed :db.error/unique-conflict :db.error/datoms-conflict})

(defn chain [^Throwable e]
  (take-while some? (iterate (fn [^Throwable x] (.getCause x)) e)))

(defn decided?
  "True when the failure is a refusal: the gateway's own 4xx, a stored function's TRIPLEX_ marker, or a Datomic
  cas, unique or datoms conflict. Anything else is unknown."
  [^Throwable e]
  (boolean
    (some (fn [^Throwable x]
            (let [data (ex-data x)]
              (or (when-let [status (:status data)] (< status 500))
                  (contains? decided-errors (:db/error data))
                  (re-find decided-markers (str (.getMessage x))))))
          (chain e))))

(defn kind
  "A short name for the failure's class, for the answer and the table on the page."
  [^Throwable e]
  (let [xs (chain e)
        anomaly (some #(:cognitect.anomalies/category (ex-data %)) xs)
        db-error (some #(:db/error (ex-data %)) xs)]
    (cond anomaly (str anomaly)
          db-error (str db-error)
          :else (.getName (class (last xs))))))

(defn unknown [^Throwable e]
  (ex-info "Commit outcome unknown" {:status 503 :code "OutcomeUnknown" :cause (kind e)} e))

(defn route-status
  "For a write route's failure without a status: 400 when decided, 503 when unknown."
  [^Throwable e]
  (if (decided? e) 400 503))

(defn- operation-taken? [^Throwable e]
  (boolean (some (fn [^Throwable x]
                   (let [text (str (.getMessage x) " " (ex-data x))]
                     (and (re-find #"unique-conflict" text) (re-find #"triplex\.tx/operation-id" text))))
                 (chain e))))

(defn fence!
  "Stores operation ID `id` on an empty transaction (no position), so the original save can never commit, and answers
  the operation's decided state: committed (the original won), or absent and fenced."
  [conn id operation]
  (when-not (and (string? id) (<= 1 (count id) 256) (not (.startsWith ^String id "privacy-")))
    (throw (ex-info "Invalid operation ID" {:status 400 :code "InvalidValue"})))
  (let [report (try (deref (d/transact conn [{:db/id "datomic.tx" :triplex.tx/operation-id id}]) 5000 ::timeout)
                    (catch Exception e (if (operation-taken? e) ::taken (throw (unknown e)))))]
    (when (= report ::timeout) (throw (ex-info "Fence outcome unknown" {:status 503 :code "OutcomeUnknown" :cause "deref-timeout"})))
    (if (= report ::taken)
      (let [db (deref (d/sync conn) 5000 ::timeout)]
        (when (= db ::timeout) (throw (ex-info "Fence outcome unknown" {:status 503 :code "OutcomeUnknown" :cause "sync-timeout"})))
        (operation db id))
      (assoc (operation (:db-after report) id) :fencedNow true))))
