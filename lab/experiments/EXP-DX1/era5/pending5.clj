(ns era5-pending-pg
  "[DX-ERA5] Two cases with the PostgreSQL removal authority (the production one), run by era5/cost.sh with `pg` and
  the main `era5-pending-pg/main` (shred grace ERA5_GRACE_MS, default 4000):
    p1  attack5.clj's `pending` case: a removal left pending in one account stops the deletion of every published
        removal's key in the database (the key ROW stays in triplex_removal.keys after the grace).
    p2  inventory row 11, measured (the page admits it; this is not a new finding): after the shred worker deletes X's
        key row, its wrapped bytes are still in the table's heap page (a dead tuple, read with pageinspect); unwrapped
        with the authority's one wrapping key they decode X's derived copy."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.scope :as scope]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era5-attack :as a5])
  (:import [java.sql DriverManager]
           [java.util Arrays]))

(defn- handle-of [conn id]
  (let [db (d/db conn) eid (d/entid db [:triplex.private/id id])]
    (envelope/body-key-handle (scope/value db eid :triplex.private/body))))
(defn- row-present? [src conn id] (some? (sql/key-by-id src (handle-of conn id))))
(defn- unwrap [src handle ^bytes wrapped]
  ;; envelope.clj `open-key`, with the wrapped bytes given instead of read from the table
  (envelope/crypto javax.crypto.Cipher/DECRYPT_MODE @@#'envelope/wrapping-key (Arrays/copyOfRange wrapped 0 12)
                   (envelope/utf8 (json/write-str [src handle])) (Arrays/copyOfRange wrapped 12 (alength wrapped))))
(defn- live-key [src conn id]
  (try (#'envelope/open-key src (handle-of conn id)) (catch Exception _ nil)))
(defn- offline-pg [src conn wire] (a5/offline-open wire #(live-key src conn %)))

(defn pending-blocks-shred-pg []
  (doseq [with-r2 [false true]]
    (g/fresh-scope true
      (fn [src conn]
        (let [lbl (str "p1 pending blocks shred (postgresql) " (if with-r2 "with R2" "control"))
              [vx ix] (a5/seed! src (str "pp-x-" with-r2) "acct/a/pl:00000001/v" "pp")
              [_ iz] (a5/seed! src (str "pp-z-" with-r2) "acct/c/pl:00000003/v" "pp")
              wire (get (a5/seal1 src [ix] (str "derived:" vx)) "sealed")
              decodes-before (= (str "derived:" vx) (offline-pg src conn wire))
              r1 (a5/erase-until-done! src (str "pp-r1-" with-r2) [ix] nil nil)
              t0 (System/currentTimeMillis)
              r2 (when with-r2
                   (reset! x/plan {:stop :before-declare :stops-left 1})
                   (let [o (x/erase! src (str "pp-r2-" with-r2) [{"id" iz}])] (reset! x/plan nil) (offers/outcome o)))
              pending (some? (privacy/pending src))
              wait-ms (+ envelope/grace-ms 3000)
              _ (loop [] (when (< (- (System/currentTimeMillis) t0) wait-ms) (a5/shred-now!) (Thread/sleep 250) (recur)))
              row-after-grace (row-present? src conn ix)
              decoded (= (str "derived:" vx) (offline-pg src conn wire))
              done (when with-r2 (:status (:final (a5/erase-until-done! src (str "pp-r2-" with-r2) [iz] nil nil))))
              gone (loop [n 0] (a5/shred-now!) (cond (not (row-present? src conn ix)) true (> n 30) false :else (do (Thread/sleep 100) (recur (inc n)))))
              row {:authority "postgresql" :grace-ms envelope/grace-ms :decodes-before decodes-before :r1 (:status (:final r1))
                   :r2-first r2 :r2-pending pending :waited-ms wait-ms :r1-key-row-present-after-grace row-after-grace
                   :r1-copy-decodes-with-the-key-row decoded :r2-completed-by-its-resend done :r1-key-row-deleted-after gone}]
          (a5/report :p1 row)
          (x/oracle! lbl decodes-before "the outside decoder opens a live record with the PostgreSQL key" row)
          (x/oracle! lbl (not row-after-grace) "a published removal's key row is deleted after its grace" row)
          (x/oracle! lbl (not decoded) "after the grace no key the store holds decodes a removed value's copy" row))))))

(defn- heap-tuples
  "Every tuple of triplex_removal.keys' heap pages as [xmax data-bytes] (pageinspect; the container's superuser)."
  []
  (with-open [c (DriverManager/getConnection sql/url)]
    (with-open [s (.createStatement c)] (.execute s "CREATE EXTENSION IF NOT EXISTS pageinspect"))
    (let [pages (with-open [s (.createStatement c)
                            rs (.executeQuery s "SELECT pg_relation_size('triplex_removal.keys') / current_setting('block_size')::int")]
                  (.next rs) (.getLong rs 1))]
      (vec (for [p (range pages)
                 t (with-open [ps (.prepareStatement c "SELECT t_xmax::text, t_data FROM heap_page_items(get_raw_page('triplex_removal.keys', ?::int))")]
                     (.setLong ps 1 p)
                     (with-open [rs (.executeQuery ps)]
                       (loop [out []] (if (.next rs) (recur (conj out [(.getString rs 1) (.getBytes rs 2)])) out))))]
             t)))))
(defn- wal-files
  "Every WAL segment of the authority's PostgreSQL server, read through SQL (pg_ls_waldir, pg_read_binary_file)."
  []
  (with-open [c (DriverManager/getConnection sql/url)]
    (let [names (with-open [s (.createStatement c) rs (.executeQuery s "SELECT name FROM pg_ls_waldir() ORDER BY name")]
                  (loop [out []] (if (.next rs) (recur (conj out (.getString rs 1))) out)))]
      (vec (for [n names]
             [n (with-open [ps (.prepareStatement c "SELECT pg_read_binary_file('pg_wal/' || ?)")]
                  (.setString ps 1 n)
                  (with-open [rs (.executeQuery ps)] (.next rs) (.getBytes rs 1)))])))))
(defn- index-of [^bytes hay ^bytes needle]
  (let [n (alength needle) m (alength hay)]
    (loop [i 0] (cond (> (+ i n) m) -1 (Arrays/equals (Arrays/copyOfRange hay i (+ i n)) needle) i :else (recur (inc i))))))

(defn dead-key-row []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "p2 dead key row (inventory row 11)"
            [vx ix] (a5/seed! src "dk-x" "acct/a/pl:00000001/v" "dk")
            wire (get (a5/seal1 src [ix] (str "derived:" vx)) "sealed")
            handle (handle-of conn ix)
            wrapped (sql/key-by-id src handle)
            r1 (a5/erase-until-done! src "dk-r1" [ix] nil nil)
            gone (loop [n 0] (a5/shred-now!) (cond (not (row-present? src conn ix)) true (> n 80) false :else (do (Thread/sleep 100) (recur (inc n)))))
            tuples (heap-tuples)
            hit (first (keep (fn [[xmax data]] (let [i (when data (index-of data wrapped))] (when (and i (>= i 0)) [xmax data i]))) tuples))
            wal (wal-files)
            wal-hit (first (keep (fn [[n data]] (let [i (index-of data wrapped)] (when (>= i 0) [n data i]))) wal))
            recovered (cond hit (let [[_ data i] hit] (Arrays/copyOfRange ^bytes data (int i) (int (+ i (alength ^bytes wrapped)))))
                            wal-hit (let [[_ data i] wal-hit] (Arrays/copyOfRange ^bytes data (int i) (int (+ i (alength ^bytes wrapped))))))
            decoded (when recovered (a5/offline-open wire (fn [id] (when (= id ix) (unwrap src handle recovered)))))
            row {:removal (:status (:final r1)) :key-row-deleted gone :heap-tuples (count tuples)
                 :wrapped-bytes-found-in-a-heap-tuple (boolean hit) :that-tuple-xmax (first hit)
                 :wal-segments (count wal) :wrapped-bytes-found-in-wal (some-> wal-hit first)
                 :copy-decoded-with-the-recovered-bytes-and-the-wrapping-key (= (str "derived:" vx) decoded)}]
        (a5/report :p2 row)
        (x/observe! lbl :row-11 row)))))


(defn- journal-text [src] (g/text (:body (offers/route src "v2" "transactions" {"after" 0 "limit" 1000}))))

(defn p3
  "The stop point the builder never reached (P3: after the subject guard). With the PostgreSQL authority a plain save
  does not take the database's lock, so two saves of X's subject that land while the removal's commit is being prepared
  make its first two commit attempts find the subject changed; the third attempt takes the subject guard first, and
  the removal is stopped right after it (its gateway dies there), then the caches and the shred worker's progress are
  cleared (a restart) and it is resumed. What this option's routes answer at P3, and after the acknowledgement."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "p3 stop after the subject guard"
            [vx ix] (a5/seed! src "p3-x" g/a1 "p3") [vy iy] (a5/seed! src "p3-y" g/b1 "p3")
            cx (get (a5/seal1 src [ix] (str "derived:" vx)) "sealed") cy (get (a5/seal1 src [iy] (str "derived:" vy)) "sealed")
            w0 (a5/derived-write! src conn "p3-w0" "notice:v1:p3" cx "a")
            saves (atom []) holds (atom 0)
            hook (fn [p]
                   (when (and (= p :in-commit) (< (count @saves) 2))
                     (let [n (inc (count @saves)) v (g/secret g/a1 (str "p3-race-" n))
                           rep (deref (future (offers/send src (g/frame (str "p3-race-" n) g/a1 v nil nil))) 15000 {:status 0})]
                       (swap! saves conj (offers/outcome rep))))
                   (when (= p :after-hold) (swap! holds inc)))
            _ (reset! x/plan {:stop :after-guard :stops-left 1 :hook hook})
            first-reply (x/remove-attr! src "p3-rm" g/a1)
            fired (zero? (long (:stops-left @x/plan 1)))
            _ (reset! x/plan nil)
            pending (some? (privacy/pending src))
            at-stop {:open-copy (a5/shape (a5/open1 src cx))
                     :seal-again (let [i (a5/seal1 src [ix] "probe")] (cond (contains? i "removed") :removed (contains? i "sealed") :sealed :else i))
                     :plain-read-has-value (str/includes? (x/read-text src g/a1) vx)
                     :plain-save-of-x (offers/outcome (offers/send src (g/frame "p3-save-at-stop" g/a1 (g/secret g/a1 "p3s") nil nil)))
                     :key-row (row-present? src conn ix)}
            _ (reset! privacy/cache {}) _ (reset! envelope/shredded {})
            w1 (a5/derived-write! src conn "p3-w1" "notice:v1:p3b" (get (a5/seal1 src [iy] (str "derived:" vy)) "sealed") "a")
            pending-after-w1 (some? (privacy/pending src))
            final (loop [n 0 reply first-reply]
                    (if (or (= 200 (:status reply)) (>= n 4)) reply (recur (inc n) (x/remove-attr! src "p3-rm" g/a1))))
            gone (loop [n 0] (a5/shred-now!) (cond (not (row-present? src conn ix)) true (> n 50) false :else (do (Thread/sleep 100) (recur (inc n)))))
            after {:open-copy (a5/shape (a5/open1 src cx)) :kept-opens (= (str "derived:" vy) (a5/opened (a5/open1 src cy)))
                   :doc-has-value (str/includes? (x/read-text src "notice:v1:p3") vx)
                   :journal-has-value (str/includes? (journal-text src) vx)
                   :native-clear (count (#'era4-races/native-clear conn [vx]))
                   :offline (if (offline-pg src conn cx) :DECODED :nil)}
            row {:racing-saves @saves :holds @holds :stop-fired fired :first (offers/outcome first-reply) :pending-at-stop pending
                 :at-stop at-stop :derived-write-at-stop (offers/outcome w1) :completed-by-that-refusal (and pending (not pending-after-w1))
                 :final (offers/outcome final) :key-row-deleted gone :after after}]
        (a5/report :p3 row)
        (x/oracle! lbl (= [200 nil] (offers/outcome w0)) "the copy is recorded before the removal" row)
        (x/oracle! lbl (= 200 (:status final)) "the removal completes" row)
        (when (= :value (:open-copy at-stop))
          (x/oracle! lbl (:plain-read-has-value at-stop) "at P3 a copy opens only while the plain read still answers the value" row))
        (x/oracle! lbl (= :removed (:open-copy after)) "after the acknowledgement the copy opens as removed" row)
        (x/oracle! lbl (:kept-opens after) "another subject's copy still opens" row)
        (x/oracle! lbl (not (:doc-has-value after)) "the copy's document holds no clear value" row)
        (x/oracle! lbl (not (:journal-has-value after)) "the journal holds no clear value" row)
        (x/oracle! lbl (zero? (:native-clear after)) "no native datom holds the value in clear" row)
        (x/oracle! lbl gone "the key row is deleted" row)
        (x/oracle! lbl (= :nil (:offline after)) "no key the store holds decodes the copy" row)))))

(defn main []
  (x/install-hooks!)
  (#'era4-races/install-declare-hooks!)
  (envelope/start!)
  (when-not sql/url (throw (ex-info "pending5.clj needs the PostgreSQL authority (cost.sh ... pg)" {})))
  (p3)
  (pending-blocks-shred-pg)
  (dead-key-row)
  (println "ERA5_VIOLATIONS" (pr-str (frequencies (map :message @x/violations))))
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
