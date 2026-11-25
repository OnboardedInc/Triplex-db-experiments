(ns b2-lines
  "[DX-B2, the review's F5 and F9] What a failure line of failures.clj prints, checked on the function itself (S3 of
  the review checks the lines the routes print on both authorities):
    F5  a failure that persists prints its first line, then nothing until a minute has passed, then one line that says
        how many were not printed; every failure is counted; another database or another code prints its own line.
    F9  a failed key-pool batch as the PostgreSQL driver raises it (its message is the statement with its parameters,
        a wrapped key in hex; its next exception carries the server's own error) prints the SQL state and the server's
        text, never the driver's message; a file-system error prints its reason and the file's own name; any other
        exception prints its class only.
  Prints one B2_LINES line per check and B2_LINES_SUMMARY; exits 1 if any check fails."
  (:require [clojure.data.json :as json] [clojure.string :as str] [triplex.gateway.failures :as failures]))

(def results (atom []))
(defn check! [label ok detail]
  (swap! results conj (boolean ok))
  (println "B2_LINES" (if ok "ok  " "FAIL") label (pr-str detail)))

(defn- lines-of [work]
  (let [out (with-out-str (work))]
    (vec (keep #(when (str/starts-with? % "{") (json/read-str %)) (str/split-lines out)))))

(def wrapped-key (apply str (repeat 4 "9f3a6c1be07d42f58a1c3e6b0d9f7a24")))

(defn- batch-failure []
  ;; what the PostgreSQL driver throws for a refused batch: its own message holds the statement and its parameters
  (let [server (org.postgresql.util.PSQLException.
                 (org.postgresql.util.ServerErrorMessage. "SERROR\u0000C23505\u0000Mduplicate key value violates unique constraint \"keys_pkey\"\u0000\u0000"))
        batch (java.sql.BatchUpdateException.
                (str "Batch entry 0 INSERT INTO triplex_removal.keys(scope,handle,wrapped) VALUES ('s2-x','h1','\\x" wrapped-key
                     "') was aborted: ERROR: duplicate key value violates unique constraint \"keys_pkey\"")
                "23505" (int-array 0))]
    (.setNextException batch server)
    batch))

(defn main []
  (let [count-of (fn [] (failures/count-of "b2-lines"))
        e (ex-info "The current erasure sequence cannot be verified" {:code "ErasureFrontierUnavailable"})
        before (count-of)
        first-five (lines-of #(dotimes [_ 5] (failures/note! "b2-lines" "db-a" e)))]
    (check! "F5 five failures in a row print one line" (= 1 (count first-five)) first-five)
    (check! "F5 every failure is counted" (= 5 (- (count-of) before)) (- (count-of) before))
    (check! "F5 another database prints its own line"
            (= 1 (count (lines-of #(failures/note! "b2-lines" "db-b" e)))) nil)
    (check! "F5 another code prints its own line"
            (= 1 (count (lines-of #(failures/note! "b2-lines" "db-a" (ex-info "other" {:code "Other"}))))) nil)
    ;; a minute passes for db-a's first key: its last line is moved back past the quiet time
    (let [k ["b2-lines" "db-a" "ErasureFrontierUnavailable" nil "clojure.lang.ExceptionInfo"]]
      (swap! @#'failures/printed update-in [k :at] - 60001)
      (let [after-a-minute (lines-of #(dotimes [_ 3] (failures/note! "b2-lines" "db-a" e)))]
        (check! "F5 after a minute one line, with the number not printed since"
                (and (= 1 (count after-a-minute)) (= 4 (get (first after-a-minute) "suppressedSinceLastLine")))
                after-a-minute)))
    (let [line (first (lines-of #(failures/note! "b2-lines-batch" "db-a" (batch-failure))))
          text (json/write-str line)]
      (check! "F9 a refused batch prints its SQL state" (= "23505" (get line "sqlState")) line)
      (check! "F9 and the server's own text" (str/starts-with? (str (get line "detail")) "duplicate key value") line)
      (check! "F9 never the driver's message (no statement, no parameters, no key bytes)"
              (not (or (str/includes? text wrapped-key) (str/includes? text "INSERT") (str/includes? text "\\\\x")
                       (re-find #"[0-9a-f]{32}" text)))
              text))
    (let [line (first (lines-of #(failures/note! "b2-lines-file" "db-a"
                                                 (java.nio.file.AccessDeniedException.
                                                   (str "/tmp/authority/" (apply str (repeat 64 "a")) "/assertion-"
                                                        (apply str (repeat 64 "b")) ".key")))))]
      (check! "F9 a file-system error prints the file's own name only, scrubbed"
              (and (not (str/includes? (json/write-str line) "/tmp/authority"))
                   (not (re-find #"[0-9a-f]{32}" (json/write-str line))))
              line))
    (let [line (first (lines-of #(failures/note! "b2-lines-other" "db-a"
                                                 (IllegalStateException. (str "value secret-subject-value " wrapped-key)))))]
      (check! "F9 any other exception prints its class only"
              (and (= #{"schema" "where" "database" "type"} (set (keys line)))
                   (not (str/includes? (json/write-str line) "secret-subject-value")))
              line))
    (let [failed (count (remove true? @results))]
      (println "B2_LINES_SUMMARY" (pr-str {:checks (count @results) :failed failed}))
      (shutdown-agents)
      (System/exit (if (zero? failed) 0 1)))))
