(ns triplex.gateway.removal-ack
  "[DX-ERA6 eighth pass, R5 of the seventh review] The record that step 5 of the restore procedure compares with.
  A restore of the data and the removal authority to one backup undoes every removal acknowledged after it, and the
  two restored systems agree with each other, so only a record kept OUTSIDE both shows the loss (X10).

  Every way a removal comes to be answered 200 or published calls `acknowledged!`: its own request (`publish!`), its
  client's resend after another step published it (`erase!`, the log already holds its command), the catch-up from
  the data that another removal, a read or the rebuild route runs (`append-log!`), the rebuild route writing a missing
  log whole, and the database-wide rule's removal (`erase/erase!`). Each removal is recorded once:
  - one `triplex.removal-acknowledged.v1` line on standard output per removal per gateway process;
  - with TX2_REMOVAL_ACK_JOURNAL=<file>, one JSON line appended to that file, forced to disk (SYNC) BEFORE the client
    is answered 200; a removal already in the file is not appended again. The file must live where a restore of the
    data and the authority cannot roll it back with them: a volume of its own (never in the Datomic storage's or the
    removal authority's backup set), or a path whose lines are shipped at once to the log store. A failed append
    answers the removal 503 RemovalAcknowledgementUnavailable (the client sends it again; the removal is already
    published, so the resend is answered 200 once the append succeeds).
  The start check (`removal-commit/start-check!`) then compares the file with each database's published log: a
  removal in the file whose command and sequence the log does not hold is reported, by command, as
  RemovalAcknowledgedLost (step 5 of the procedure, without reading any log line).
  Rejected: printing the line only in the removal's own publication (4 of 10 ways printed none, the seventh review's
  R5); keeping the record in the removal authority or in Datomic (restored with them).
  Loaded on first use; with every option off and no journal nothing is printed or written, as on the one branch."
  (:require [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.removal-scope :as removal-scope])
  (:import [java.nio.file Files Paths OpenOption StandardOpenOption LinkOption]
           [java.nio.charset StandardCharsets]))

(def journal
  "TX2_REMOVAL_ACK_JOURNAL: the file every acknowledged removal is appended to (unset: none)."
  (some-> (System/getenv "TX2_REMOVAL_ACK_JOURNAL") str/trim not-empty))

(def on
  "The record is kept with the per-account option (as the seventh pass's line was) or whenever a journal is set (then
  for every protected database, the database-wide rule's included)."
  (boolean (or removal-scope/enabled journal)))

(defn- path [] (Paths/get ^String journal (make-array String 0)))

(defn records
  "Every record in the journal, in the order written (a line that does not parse is skipped and counted)."
  []
  (if-not (and journal (Files/exists (path) (make-array LinkOption 0)))
    []
    (vec (keep (fn [line]
                 (when-not (str/blank? line)
                   (try (json/read-str line)
                        (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "ack-journal-line" nil e) nil))))
               (Files/readAllLines (path) StandardCharsets/UTF_8)))))

(defn- key-of [r] [(get r "database") (get r "seq") (get r "commandId")])
(def ^:private lock (Object.))
(def ^:private printed (atom #{}))
(def ^:private in-journal (atom nil))

(defn- append! [record]
  (let [p (path) parent (.getParent p)]
    (when parent (Files/createDirectories parent (make-array java.nio.file.attribute.FileAttribute 0)))
    (Files/write p (.getBytes (str (json/write-str record) "\n") StandardCharsets/UTF_8)
                 ^"[Ljava.nio.file.OpenOption;" (into-array OpenOption [StandardOpenOption/CREATE StandardOpenOption/WRITE
                                                                       StandardOpenOption/APPEND StandardOpenOption/SYNC]))))

(defn acknowledged!
  "Record removal `entry` (a published log entry) of database `name` as acknowledged: once per removal (see the
  namespace). Called before its client is answered 200."
  [name entry]
  (when (and on (integer? (get entry "seq")) (string? (get entry "commandId")))
    (locking lock
      (let [k [name (get entry "seq") (get entry "commandId")]]
        (when journal
          (when (nil? @in-journal) (reset! in-journal (set (map key-of (records)))))
          (when-not (contains? @in-journal k)
            (try (append! {"schema" "triplex.removal-acknowledged.v1" "database" name "seq" (get entry "seq")
                           "commandId" (get entry "commandId") "selectors" (get entry "selectors")
                           "position" (get entry "position") "acknowledgedAt" (System/currentTimeMillis)})
                 (catch Exception e
                   ((requiring-resolve 'triplex.gateway.failures/note!) "ack-journal" name e)
                   (privacy/failure! 503 "RemovalAcknowledgementUnavailable"
                                     "The removal is published but its acknowledgement could not be recorded; send it again")))
            (swap! in-journal conj k)))
        (when-not (contains? @printed k)
          (println (json/write-str {"schema" "triplex.removal-acknowledged.v1" "database" name "seq" (get entry "seq")
                                    "commandId" (get entry "commandId")}))
          (swap! printed conj k))))))

(defn lost
  "The acknowledged removals of database `name` that its published log (`cut`, privacy/cut) does not hold, the same
  command at the same sequence: after a restore of the data and the removal authority to one backup, the removals
  acknowledged after that backup. Each record names its command and selectors, so it can be sent again."
  [name cut]
  (let [have (into #{} (map (fn [e] [(get e "seq") (get e "commandId")])) (vals (:commands cut)))]
    (vec (for [r (records) :when (= name (get r "database")) :when (not (have [(get r "seq") (get r "commandId")]))] r))))
