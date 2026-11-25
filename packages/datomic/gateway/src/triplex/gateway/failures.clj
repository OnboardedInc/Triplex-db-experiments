(ns triplex.gateway.failures
  "[DX-B2, from DX-ERA2's fifth pass] Failures the key-shred worker used to drop silently (B2 of the derived-copies
  review was hidden by one): the shred pass, the key-pool refill and the worker's loop. Each is counted
  (`/v2/admin/scan-stats`, key `:removalFailures`) and logged as one JSON line (schema triplex.removal-failure.v1).
  Loaded lazily (requiring-resolve) by the places that report, so no early-loaded file gains a definition.

  [DX-B2 review, F9] What a line may carry, and why: the place, the database name (the one every request path already
  carries), the failure's class, its typed code, and a description that cannot hold parameters, key bytes, protected
  values, subject or account names:
  - a database error (java.sql.SQLException): its SQL state and the server's own error text, never the driver's message
    (for a failed batch that message is the statement with its parameters: a wrapped key in hex);
  - a typed refusal of the gateway (ExceptionInfo): its message, which is a fixed text;
  - a file-system error: its reason and the file's own name (the authority's file names are fixed names or SHA-256);
  - anything else: no description, the class only.
  Every description then has any run of 32 or more hexadecimal or base64 characters replaced, as a last guard.
  [DX-B2 review, F5] A failure that persists (every pass, every 500 ms) is printed the first time, then at most once a
  minute per place, database and code, with the number of failures since the last line; every one is counted."
  (:require [clojure.data.json :as json] [clojure.string :as str] [triplex.gateway.stats :as stats]))

(def ^:private quiet-ms 60000)
(def ^:private printed (atom {}))

(defn- server-text
  "The PostgreSQL server's own error text of a database error or of the next one in its chain (a failed batch carries
  the server's error as its next exception), else nil. Read reflectively: the driver is only on the gateway's classpath."
  [^Throwable e]
  (some (fn [^Throwable x]
          (try (some-> (clojure.lang.Reflector/invokeInstanceMethod x "getServerErrorMessage" (object-array 0))
                       (clojure.lang.Reflector/invokeInstanceMethod "getMessage" (object-array 0))
                       str)
               (catch Throwable _ nil)))
        (take 6 (take-while some? (iterate (fn [^Throwable x] (if (instance? java.sql.SQLException x)
                                                                 (.getNextException ^java.sql.SQLException x)
                                                                 nil))
                                           e)))))

(defn- scrub [text]
  (when text
    (let [t (-> (str text)
                (str/replace #"(?i)\\x[0-9a-f]+" "<bytes>")
                (str/replace #"[0-9A-Fa-f]{32,}" "<hex>")
                (str/replace #"[A-Za-z0-9+/_=-]{40,}" "<encoded>"))]
      (subs t 0 (min 300 (count t))))))

(defn describe
  "The fields a failure line may carry about `e` (see the namespace's note)."
  [^Throwable e]
  (cond
    (instance? java.sql.SQLException e)
    {"sqlState" (.getSQLState ^java.sql.SQLException e) "detail" (scrub (server-text e))}
    (instance? clojure.lang.ExceptionInfo e) {"code" (:code (ex-data e)) "detail" (scrub (.getMessage e))}
    (instance? java.nio.file.FileSystemException e)
    {"detail" (scrub (str (or (.getReason ^java.nio.file.FileSystemException e) "file-system error")
                          (when-let [f (.getFile ^java.nio.file.FileSystemException e)]
                            (str ": " (.getFileName (java.nio.file.Paths/get f (make-array String 0)))))))}
    :else {}))

(defn note!
  "Count one dropped failure at `where` (a short place name) for database `name`, and log it unless the same place,
  database and code was logged less than a minute ago (then the next line says how many there were). Returns nil, so a
  caller that used to answer nil still does."
  [where name ^Throwable e]
  (stats/bump! [:removalFailures where] 1)
  (let [fields (describe e)
        k [where name (get fields "code") (get fields "sqlState") (.getName (class e))]
        now (System/currentTimeMillis)
        [before after] (swap-vals! printed (fn [m] (let [{:keys [at n]} (get m k)]
                                                     (if (or (nil? at) (>= (- now at) quiet-ms))
                                                       (assoc m k {:at now :n 0 :print (or n 0)})
                                                       (assoc m k {:at at :n (inc n) :print nil})))))
        entry (get after k)]
    (when-let [since (:print entry)]
      (println (json/write-str (merge {"schema" "triplex.removal-failure.v1" "where" where "database" name
                                       "type" (.getName (class e))}
                                      (into {} (remove (comp nil? val)) fields)
                                      (when (pos? since) {"suppressedSinceLastLine" since}))))))
  nil)

(defn count-of [where] (get-in @stats/counts [:removalFailures where] 0))
