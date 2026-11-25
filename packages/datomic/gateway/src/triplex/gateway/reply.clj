(ns triplex.gateway.reply
  "[DX-N1, N3] What a refused request's reply may say. Loaded lazily (requiring-resolve) by the places that answer a
  refusal, so no early-loaded file gains a definition.

  A typed refusal is an ExceptionInfo the gateway threw with a string :code; its message is the gateway's own (a fixed
  text, or one built from the request), and it stays in the reply. Every other exception (a driver's, Datomic's, a
  library's, the JVM's) answers a fixed text: its message can hold an SQL statement with its parameters (for a refused
  key batch, every new key, wrapped, in hex), datom values, entity numbers or a connection string. Its detail goes only
  to the scrubbed log line of failures/note! (place `reply`, or the caller's), which also counts it."
  (:require [triplex.gateway.storage :as storage]))

(def fixed "The gateway could not complete the request")

(defn typed? [e] (and (instance? clojure.lang.ExceptionInfo e) (string? (:code (ex-data e)))))

(defn hidden
  "The fixed text in place of `e`'s message; `e` counted and logged (scrubbed) at `where` for database `name`."
  [where name e]
  ((requiring-resolve 'triplex.gateway.failures/note!) where name e)
  fixed)

(defn message
  "The message of a refused request's reply: a typed refusal's own; else the fixed text, `e` logged at `reply`."
  [e name]
  (if (typed? e) (.getMessage ^Throwable e) (hidden "reply" name e)))

(def ^:private commit-texts
  {"ErasureFrontierChanged" "This request must use the current erasure sequence"
   "OperationDuplicate" "This operation was already saved"
   "CommandConflict" "This command was already used by another save"
   "ImportPredecessorMissing" "The import's predecessor is not in the scope"
   "ClockExhausted" "The scope's record clock is exhausted"
   "CasConflict" "The save conflicts with a concurrent change; retry against the current state"
   "IdentityConflict" "An identity in the save is already held"})

(defn commit-message
  "The message of a native transaction refused in storage/commit! (`data` is the refusal's status, code and maximum).
  A typed refusal of the gateway keeps its own; a clock refusal names the scope maximum and the record-clock policy;
  any other refusal (its text is Datomic's or a driver's, with values and entity numbers) a fixed text for its code; a
  TransactionRejected (nothing recognised) is logged at `transaction-rejected`."
  [e data]
  (cond (typed? e) (.getMessage ^Throwable e)
        (= "ClockConflict" (:code data))
        (storage/clock-conflict-message
          (str "The commit time is not after the scope maximum" (when (:maximum data) (str " (" (:maximum data) ")")) "."))
        (contains? commit-texts (:code data)) (get commit-texts (:code data))
        :else (hidden "transaction-rejected" nil e)))
