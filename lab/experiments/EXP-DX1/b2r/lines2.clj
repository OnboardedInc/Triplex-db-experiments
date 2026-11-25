(ns b2r-lines2
  "[DX-B2R re-check of F5 and F9 at 46a8f746a] Attacks on failures.clj with a real PostgreSQL server and the real
  driver (run with the PostgreSQL authority: b2r/run.sh ... pg lines2.clj '(b2r-lines2/main)'), plus the rate limiter.
    P1  a unique violation on the key table's own key, raised by authority-sql/issue! (the server's detail line is
        'Key (scope, id)=(...) already exists'): the line must carry neither the handle nor the detail.
    P2  a unique index on the wrapped key column and a duplicate short key (15 bytes, 30 hex characters, under the hex
        guard): the server's detail line carries the key; the line must not.
    P3  a check constraint that refuses a 7-byte key: the detail line is 'Failing row contains (...)'; the line must not
        carry it.
    P4  NOT the code under test's own sources: a trigger installed in the database raises the key in its PRIMARY
        message, encoded four ways (octal escapes, hex split by colons, base64 with the server's line breaks, 30 hex
        characters). Shows what the hex/base64 guard lets through when the server's own text carries key bytes.
    R1  a second failure of the same place, database, class, code and SQL state but another description, less than a
        minute after the first: is it printed?
    R2  10,000 databases failing once each: how many entries the limiter keeps.
    R3  every failure counted, printed or not.
  Prints one B2R_LINES2 line per check (ok/FAIL) or note; exits 1 if a check fails."
  (:require [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.failures :as failures] [triplex.gateway.authority-sql :as sql])
  (:import [java.util UUID]))

(def results (atom []))
(defn check! [label ok detail]
  (swap! results conj (boolean ok))
  (println "B2R_LINES2" (if ok "ok  " "FAIL") label (pr-str detail)))
(defn note [label detail] (println "B2R_LINES2 note" label (pr-str detail)))

(defn- lines-of [work]
  (vec (keep #(when (str/starts-with? % "{") %) (str/split-lines (with-out-str (work))))))
(defn- caught [f] (try (f) nil (catch Throwable t t)))
(defn- hex [^bytes b] (apply str (map #(format "%02x" (bit-and % 0xff)) b)))
(defn- exec! [s] (with-open [c (java.sql.DriverManager/getConnection sql/url) st (.createStatement c)] (.execute st s)))
(defn- line-for [where e] (first (lines-of #(failures/note! where (str "s2-b2r-lines-" where) e))))

(defn pg []
  (let [scope (str "s2-b2r-lines-" (UUID/randomUUID)) h (str (UUID/randomUUID)) k32 (byte-array (range 32 64))]
    (sql/issue! scope [[h k32]])
    ;; P1 the table's own key
    (let [e (caught #(sql/issue! scope [[h k32]])) line (line-for "p1" e)]
      (note "P1 driver message (not printed)" (some-> e .getMessage (as-> m (subs m 0 (min 160 (count m))))))
      (check! "P1 duplicate handle: no handle, no detail line" (and line (not (str/includes? line h)) (not (str/includes? line "already exists"))) line))
    ;; P2 a unique index on the key bytes, a key under the hex guard
    (exec! "CREATE UNIQUE INDEX IF NOT EXISTS b2r_wrapped ON triplex_removal.keys (wrapped)")
    (let [short (byte-array (map byte (range 1 16)))]
      (try
        (sql/issue! scope [[(str (UUID/randomUUID)) short]])
        (let [e (caught #(sql/issue! scope [[(str (UUID/randomUUID)) short]])) line (line-for "p2" e)
              detail (some-> e (.getNextException) (.getServerErrorMessage) (.getDetail))]
          (note "P2 the server's detail line (not printed)" detail)
          (check! "P2 duplicate short key: the key's bytes are not printed" (and line (not (str/includes? line (hex short)))) line))
        (finally (exec! "DROP INDEX IF EXISTS triplex_removal.b2r_wrapped"))))
    ;; P3 a check constraint, 'Failing row contains (...)'
    (exec! "ALTER TABLE triplex_removal.keys ADD CONSTRAINT b2r_len CHECK (octet_length(wrapped) <> 7) NOT VALID")
    (let [seven (byte-array (map byte (range 101 108)))]
      (try
        (let [e (caught #(sql/issue! scope [[(str (UUID/randomUUID)) seven]])) line (line-for "p3" e)
              detail (some-> e (.getNextException) (.getServerErrorMessage) (.getDetail))]
          (note "P3 the server's detail line (not printed)" detail)
          (check! "P3 check violation: no failing row" (and line (not (str/includes? line (hex seven))) (not (str/includes? line "Failing row"))) line))
        (finally (exec! "ALTER TABLE triplex_removal.keys DROP CONSTRAINT IF EXISTS b2r_len"))))
    ;; P4 a trigger that puts the key into the primary message (not a source the authority has)
    (let [key60 (byte-array (map #(byte (- (mod (* 37 %) 256) 128)) (range 60)))]
      (doseq [[label expr] [["octal escapes" "encode(NEW.wrapped,'escape')"]
                            ["hex split by colons" "regexp_replace(encode(NEW.wrapped,'hex'),'(..)','\\1:','g')"]
                            ["base64 with line breaks" "encode(NEW.wrapped,'base64')"]
                            ["30 hex characters" "substr(encode(NEW.wrapped,'hex'),1,30)"]]]
        (exec! (str "CREATE OR REPLACE FUNCTION b2r_raise() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'k %', " expr
                    "; END $$ LANGUAGE plpgsql"))
        (exec! "DROP TRIGGER IF EXISTS b2r_raise ON triplex_removal.keys")
        (exec! "CREATE TRIGGER b2r_raise BEFORE INSERT ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION b2r_raise()")
        ;; each variant its own place name: the same place within a minute is not printed (R1)
        (let [e (caught #(sql/issue! scope [[(str (UUID/randomUUID)) key60]])) line (line-for (str "p4-" (str/replace label " " "-")) e)
              h (hex key60) seen (vec (for [i (range 0 (- (count h) 7) 2) :let [frag (subs h i (+ i 8))] :when (str/includes? (str/replace (str line) ":" "") frag)] frag))]
          (note (str "P4 " label ": the line") line)
          (note (str "P4 " label ": what of the key reaches the line")
                {:hex-4-byte-runs (count seen) :octal-escapes (count (re-seq #"\\\\[0-7]{3}" (str line)))
                 :base64-head (str/includes? (str line) (subs (.encodeToString (java.util.Base64/getEncoder) key60) 0 24))})))
      (exec! "DROP TRIGGER IF EXISTS b2r_raise ON triplex_removal.keys"))
    (with-open [c (java.sql.DriverManager/getConnection sql/url) st (.prepareStatement c "DELETE FROM triplex_removal.keys WHERE scope=?")]
      (.setString st 1 scope) (.executeUpdate st))))

(defn limiter []
  (let [before (failures/count-of "r1")
        a (java.nio.file.AccessDeniedException. "/x/first.key") b (java.nio.file.AccessDeniedException. "/x/second-and-different.key")
        l1 (lines-of #(failures/note! "r1" "s2-db" a)) l2 (lines-of #(failures/note! "r1" "s2-db" b))]
    (note "R1 first failure's line" l1)
    (note "R1 a second, different failure of the same kind 1 ms later: lines printed" (count l2))
    (check! "R3 both counted" (= 2 (- (failures/count-of "r1") before)) (- (failures/count-of "r1") before)))
  (let [m @#'failures/printed n0 (count @m)
        lines (count (lines-of #(dotimes [i 10000] (failures/note! "r2" (str "s2-db-" i) (ex-info "x" {:code "C"})))))]
    (note "R2 limiter entries kept after 10,000 databases failing once" {:before n0 :after (count @m) :lines-printed lines})
    (check! "R3 10,000 counted" (= 10000 (failures/count-of "r2")) (failures/count-of "r2"))))

(defn main []
  (try (limiter) (catch Throwable t (check! "limiter ran" false (str t))))
  (when sql/url (try (pg) (catch Throwable t (check! "PostgreSQL attacks ran" false (str t)))))
  (let [failed (count (remove true? @results))]
    (println "B2R_LINES2_SUMMARY" (pr-str {:checks (count @results) :failed failed :postgresql (some? sql/url) :source (System/getenv "B2R_SOURCE")}))
    (shutdown-agents)
    (System/exit (if (zero? failed) 0 1))))
