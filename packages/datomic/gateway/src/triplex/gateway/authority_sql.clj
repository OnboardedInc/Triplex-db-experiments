(ns triplex.gateway.authority-sql
  (:import [java.sql Connection DriverManager PreparedStatement ResultSet SQLException]
           [java.util.concurrent ArrayBlockingQueue]))

(def url (not-empty (System/getenv "TRIPLEX_ERASURE_JDBC")))
(def ^:dynamic *session* nil)
(def ^:private idle (ArrayBlockingQueue. 8))

(defn- bind! [^PreparedStatement statement params]
  (doseq [[i value] (map-indexed vector params)]
    (if (bytes? value)
      (.setBytes statement (inc i) value)
      (.setObject statement (inc i) value)))
  statement)

(defn- execute! [^Connection c text params]
  (with-open [statement (bind! (.prepareStatement c text) params)]
    (.executeUpdate statement)))

(defn- select! [^Connection c text params f]
  (with-open [statement (bind! (.prepareStatement c text) params)
              rows (.executeQuery statement)]
    (f rows)))

(def installed
  (delay
    (with-open [c (DriverManager/getConnection url)]
      (.setAutoCommit c false)
      (select! c "SELECT pg_advisory_xact_lock(1881260217, 1)" [] (constantly nil))
      (execute! c "CREATE SCHEMA IF NOT EXISTS triplex_removal" [])
      (execute! c (str "CREATE TABLE IF NOT EXISTS triplex_removal.records ("
                       "scope text NOT NULL, record text NOT NULL, payload text NOT NULL, PRIMARY KEY (scope, record))") [])
      (execute! c (str "CREATE TABLE IF NOT EXISTS triplex_removal.keys ("
                       "scope text NOT NULL, id text NOT NULL, wrapped bytea NOT NULL, PRIMARY KEY (scope, id))") [])
      (.commit c))))

(defn- open! []
  (let [c (DriverManager/getConnection url)]
    (try
      (with-open [s (.createStatement c)] (.execute s "SET synchronous_commit=on"))
      c
      (catch Throwable e (.close c) (throw e)))))

(defn- with-session [f]
  (if *session* (f *session*)
    (do
      @installed
      (let [^Connection c (or (.poll idle) (open!))
            reusable (volatile! true)]
        (try (f c)
             (catch SQLException e (vreset! reusable false) (throw e))
             (finally (when-not (and @reusable (.offer idle c)) (.close c))))))))

;; [DX-ERASE1] Why: publication and delivery must serialize in every gateway using the same authority.
;; Rejected: keeping the local JVM or host-file lock when the ledger moves to shared storage.
(defn guard [scope work]
  (with-session
    (fn [c]
      (select! c "SELECT pg_advisory_lock(hashtextextended(?, 0))" [scope] (constantly nil))
      (try (binding [*session* c] (work))
           (finally
             (select! c "SELECT pg_advisory_unlock(hashtextextended(?, 0))" [scope] (constantly nil)))))))

(defn read-record [scope record]
  (with-session #(select! % "SELECT payload FROM triplex_removal.records WHERE scope=? AND record=?"
                          [scope record] (fn [^ResultSet rs] (when (.next rs) (.getString rs 1))))))

(defn read-frontier [scope]
  (with-session
    #(select! % "SELECT record,payload FROM triplex_removal.records WHERE scope=? AND record IN ('head.json','pending.json')" [scope]
              (fn [^ResultSet rs]
                (loop [found {}]
                  (if (.next rs) (recur (assoc found (.getString rs 1) (.getString rs 2))) found))))))

(defn- put-record! [c scope record wire]
  (execute! c (str "INSERT INTO triplex_removal.records(scope, record, payload) VALUES (?,?,?) "
                  "ON CONFLICT (scope,record) DO UPDATE SET payload=EXCLUDED.payload") [scope record wire]))

(defn put! [scope record wire]
  (with-session #(put-record! % scope record wire)))

(defn- transaction! [work]
  (with-session
    (fn [^Connection c]
      (.setAutoCommit c false)
      (try
        (with-open [statement (.createStatement c)] (.execute statement "SET LOCAL synchronous_commit=on"))
        (let [outcome (work c)] (.commit c) outcome)
        (catch Throwable e (.rollback c) (throw e))
        (finally (.setAutoCommit c true))))))

(defn publish! [scope entry-record entry prior head]
  (transaction!
    (fn [c]
      (execute! c "INSERT INTO triplex_removal.records(scope,record,payload) VALUES (?,?,?)"
                [scope entry-record entry])
      (when-not (= 1 (execute! c (str "UPDATE triplex_removal.records SET payload=? "
                                    "WHERE scope=? AND record='head.json' AND payload=?")
                              [head scope prior]))
        (throw (SQLException. "Removal authority moved before publication")))
      (when-not (= 1 (execute! c "DELETE FROM triplex_removal.records WHERE scope=? AND record='pending.json' AND payload=?"
                              [scope entry]))
        (throw (SQLException. "Removal intent missing before publication"))))))

(defn delete! [scope record]
  (with-session #(execute! % "DELETE FROM triplex_removal.records WHERE scope=? AND record=?" [scope record])))

(defn scopes []
  (with-session
    #(select! % "SELECT scope FROM triplex_removal.records WHERE record='head.json' ORDER BY scope" []
       (fn [^ResultSet rs]
         (loop [found []] (if (.next rs) (recur (conj found (.getString rs 1))) found))))))

;; [DX-ERASE1] Why: these wrapped keys are committed in batches before any protected save uses them.
;; Rejected: a synchronous authority write for each native value assertion.
(defn issue! [scope wrapped]
  (transaction!
    (fn [c]
      (with-open [s (.prepareStatement ^Connection c "INSERT INTO triplex_removal.keys(scope,id,wrapped) VALUES (?,?,?)")]
        (doseq [[id key] wrapped] (bind! s [scope id key]) (.addBatch s))
        (.executeBatch s)))))

(defn key-by-id [scope id]
  (with-session #(select! % "SELECT wrapped FROM triplex_removal.keys WHERE scope=? AND id=?" [scope id]
       (fn [^ResultSet rs] (when (.next rs) (.getBytes rs 1))))))

(defn shred! [scope ids]
  (transaction!
    (fn [c]
      (with-open [s (.prepareStatement ^Connection c "DELETE FROM triplex_removal.keys WHERE scope=? AND id=?")]
        (doseq [id ids] (bind! s [scope id]) (.addBatch s))
        (.executeBatch s)))))
