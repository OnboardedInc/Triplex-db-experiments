(ns b2r-fuzz
  "[DX-B2R] A schedule fuzzer for the key-deletion pass (B2 fix, `envelope/shred-published!` reading the published prefix
  while a removal is pending). In process, on the file removal authority or the PostgreSQL one (TRIPLEX_ERASURE_JDBC).

  What is real: the removal log and key code of the gateway under test (`privacy/cut`, `prepare!`, `publish!`,
  `clear-completed!`, `guard`, `envelope/issue!` or `authority-sql/issue!`, `envelope/key-present?`, and the pass itself,
  `envelope/shred-published!`, with its scope listing, cut cache, `shredded` mark and key deletion).
  What is modelled: Datomic (a removal's native commit is a compare-and-set of the removal sequence, as `apply-native!`
  does with `:db/cas`; a committed command answers its stored record), and the request route (`erase!`'s steps are
  replayed here in the same order with the same checks). Time is virtual: each removal's `erasedAt` is a unit of 10^6
  ms, the pass runs with `grace-ms` set so its cutoff is exactly `now - G` units.

  Each schedule: one sealed scope, 3 subjects with 1-2 protected values each plus one bystander subject no removal names;
  2 or 3 removals (sometimes two naming the same subject); 10-26 random steps from: a removal attempt stopped at a
  random point (after its intent, after its native commit, at its publication, after the entry record, after the head,
  or re-made after a moved head), a resend, a writer that lost its lock between its check and its writes, a pass on
  gateway 0 or 1, time passing, a gateway restart, a save of a new value, a log snapshot or restore (records only, or
  records and keys), a data snapshot or restore, the restore route's replay. Then a drain: both gateways restarted,
  every removal resent, time past the grace, a pass on each gateway.

  Checked after EVERY pass (oracles independent of the code under test: the authority's records are read directly):
    I1  every key the pass deleted belongs to a removal in the published prefix (head.json and its entry records) whose
        erasedAt + grace <= now. Also: no key disappears outside a pass, except by a log restore.
    I2  every removal in the published prefix with erasedAt + grace <= now has no key left after the pass, except:
        a key a log restore brought back (admitted), or a gateway whose cached head is ahead of a restored log (it
        refuses every cut until restarted; counted apart). A miss with a removal pending is B2.
  Prints B2R_FUZZ_SUMMARY; exits 1 on any violation."
  (:require [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.authority-sql :as sql])
  (:import [java.nio.file Files Path LinkOption]
           [java.sql DriverManager Connection]
           [java.util UUID Random]))

(def pg? (some? sql/url))
(def unit 1000000)
(def base-ms 1000000000000)
(def G 3)

(defn- fail-count [where]
  (if-let [f (try (requiring-resolve 'triplex.gateway.failures/count-of) (catch Throwable _ nil))] (f where) -1))

;; ---------- direct authority access (the oracle's own reader; never the code under test) ----------
(defn- bind! [^java.sql.PreparedStatement s params]
  (doseq [[i v] (map-indexed vector params)] (if (bytes? v) (.setBytes s (int (inc i)) ^bytes v) (.setObject s (int (inc i)) v))) s)
(def ^:private oracle-connection (atom nil))
(defn- jdbc [f] (f (or @oracle-connection (reset! oracle-connection (DriverManager/getConnection sql/url)))))
(defn- q [^Connection c text params]
  (with-open [s (bind! (.prepareStatement c text) params) rs (.executeQuery s)]
    (let [n (.getColumnCount (.getMetaData rs))]
      (loop [out []] (if (.next rs) (recur (conj out (mapv #(.getObject rs (int (inc %))) (range n)))) out)))))
(defn- x! [^Connection c text params] (with-open [s (bind! (.prepareStatement c text) params)] (.executeUpdate s)))

(defn- scope-dir ^Path [name] (.getParent (privacy/path name "head.json")))
(defn- dir-files [name]
  (let [dir (scope-dir name)]
    (if (Files/isDirectory dir (make-array LinkOption 0))
      (with-open [st (Files/list dir)] (vec (iterator-seq (.iterator st))))
      [])))
(defn- records [name]
  (if pg?
    (jdbc #(into {} (q % "SELECT record,payload FROM triplex_removal.records WHERE scope=?" [name])))
    (into {} (keep (fn [^Path p] (let [f (str (.getFileName p))] (when (str/ends-with? f ".json") [f (Files/readString p)]))))
          (dir-files name))))
(defn- chain [recs]
  (let [head (some-> (get recs "head.json") json/read-str) n (long (or (get head "seq") 0))
        raws (mapv #(get recs (str "erase-" % ".json")) (range 1 (inc n)))
        entries (mapv #(some-> % json/read-str) raws)
        ;; the oracle's own chain check: every entry present, numbered, linked to the previous seal, the head's seal last
        linked (loop [k 0 seal privacy/zeros]
                 (if (= k n) (= seal (get head "seal" privacy/zeros))
                   (let [e (get entries k)]
                     (if (and e (= (inc k) (get e "seq")) (= seal (get e "previous"))) (recur (inc k) (privacy/sha256 (get raws k))) false))))]
    {:seq n :raws raws :entries entries :verifies linked
     :pending (some-> (get recs "pending.json") json/read-str)}))
(defn- present-set
  "The IDs of the model's keys still present, read directly (key files, or key rows)."
  [name all]
  (if pg?
    (let [hs (set (map first (jdbc #(q % "SELECT id FROM triplex_removal.keys WHERE scope=?" [name]))))]
      (set (keep #(when (hs (:handle %)) (:id %)) all)))
    (let [files (set (map #(str (.getFileName ^Path %)) (dir-files name)))]
      (set (keep #(when (files (str "assertion-" (privacy/sha256 (:id %)) ".key")) (:id %)) all)))))
(defn- snapshot [name]
  (if pg?
    (jdbc (fn [c] {:records (q c "SELECT record,payload FROM triplex_removal.records WHERE scope=?" [name])
                   :keys (q c "SELECT id,wrapped FROM triplex_removal.keys WHERE scope=?" [name])}))
    (into {} (keep (fn [^Path p] (let [f (str (.getFileName p))]
                                   (when (or (str/ends-with? f ".json") (str/ends-with? f ".key")) [f (Files/readAllBytes p)]))))
          (dir-files name))))
(defn- restore! [name snap with-keys?]
  (if pg?
    (jdbc (fn [^Connection c]
            (x! c "DELETE FROM triplex_removal.records WHERE scope=?" [name])
            (doseq [[r p] (:records snap)] (x! c "INSERT INTO triplex_removal.records(scope,record,payload) VALUES (?,?,?)" [name r p]))
            (when with-keys?
              (x! c "DELETE FROM triplex_removal.keys WHERE scope=?" [name])
              (doseq [[i w] (:keys snap)] (x! c "INSERT INTO triplex_removal.keys(scope,id,wrapped) VALUES (?,?,?)" [name i w])))))
    (let [dir (scope-dir name) mine? (fn [f] (or (str/ends-with? f ".json") (and with-keys? (str/ends-with? f ".key"))))]
      (doseq [^Path p (dir-files name) :when (mine? (str (.getFileName p)))] (Files/delete p))
      (doseq [[f ^bytes b] snap :when (mine? f)] (Files/write (.resolve dir ^String f) b (make-array java.nio.file.OpenOption 0))))))
(defn- drop-scope! [name]
  (if pg?
    (jdbc (fn [c] (x! c "DELETE FROM triplex_removal.records WHERE scope=?" [name]) (x! c "DELETE FROM triplex_removal.keys WHERE scope=?" [name])))
    (do (doseq [^Path p (dir-files name)] (Files/deleteIfExists p)) (Files/deleteIfExists (scope-dir name)))))

;; ---------- the model ----------
(defn- now-ms [st] (+ base-ms (* unit (:now @st))))
(defn- cutoff [st] (+ base-ms (* unit (- (:now @st) G))))
(defn- all-keys [st] (mapcat val (:keys @st)))
(defn- note! [st k] (swap! st update-in [:counts k] (fnil inc 0)))
(defn- trace! [st & xs] (swap! st update :trace conj (vec xs)))

(defn- on-gateway [st g f]
  (reset! privacy/cache (get-in @st [:gw g :cache] {}))
  (reset! envelope/shredded (get-in @st [:gw g :shredded] {}))
  (try (f)
       (finally (swap! st assoc-in [:gw g] {:cache @privacy/cache :shredded @envelope/shredded}))))

(defn- issue-key! [name id]
  (if pg?
    (let [h (str (UUID/randomUUID)) w (byte-array 60)] (.nextBytes (java.security.SecureRandom.) w) (sql/issue! name [[h w]]) {:id id :handle h})
    (do (envelope/issue! name id) {:id id :handle nil})))
(defn- identity-of [subject {:keys [id handle]}]
  (cond-> {"assertionId" id "entity" subject "attribute" ":v" "valueType" "string" "validFrom" 0.0 "validTo" nil}
    handle (assoc "keyHandle" handle)))

(defn- make-entry [st name current cmd]
  (let [subject (get-in @st [:removals cmd]) ks (get-in @st [:keys subject])
        ids (->> ks (remove #(contains? (:erased current) (:id %))) (sort-by :id) (mapv #(identity-of subject %)))]
    (swap! st update :now inc)
    {"database" name "seq" (inc (:seq current)) "previous" (:seal current) "commandId" cmd
     "selectors" [{"entityId" subject "attribute" ":v"}] "txId" (str "_tx/erase-" (UUID/randomUUID))
     "position" (+ 100 (:now @st)) "erasedAt" (now-ms st) "identities" ids}))

(defn- native! [st entry]
  (let [cmd (get entry "commandId") raw (json/write-str entry) {:keys [seq committed]} (:native @st)]
    (cond
      (contains? committed cmd) (when-not (= raw (committed cmd)) (throw (ex-info "native record differs" {})))
      (= seq (dec (get entry "seq"))) (swap! st update :native #(-> % (assoc :seq (get entry "seq")) (assoc-in [:committed cmd] raw)))
      :else (throw (ex-info "native compare-and-set failed" {})))))

(defn- publish-with-stop! [name current entry stop]
  (let [stop (if (and pg? (#{:crash-after-entry :crash-after-head} stop)) :publish-fail stop)]
    (case stop
      :publish-fail (throw (ex-info "stopped at publication" {}))
      :crash-after-entry
      (let [orig @#'privacy/save-record!]
        (with-redefs-fn {#'privacy/save-record! (fn [n r w] (if (= r "head.json") (throw (ex-info "crash before the head" {})) (orig n r w)))}
          #(privacy/publish! name current entry)))
      :crash-after-head
      (with-redefs-fn {#'privacy/remove-record! (fn [& _] (throw (ex-info "crash before the intent's removal" {})))}
        #(privacy/publish! name current entry))
      (privacy/publish! name current entry))))

(defn- act!
  "erase!'s steps after its checks: prepare (unless resending the same intent), the native commit, the publication."
  [st name current cmd prepared stop]
  (let [entry (or prepared (make-entry st name current cmd))]
    (when-not prepared (privacy/prepare! name entry))
    (when (= stop :after-prepare) (throw (ex-info "stopped after the intent" {})))
    (let [entry (if (and (= stop :moved) (not (contains? (get-in @st [:native :committed]) cmd)))
                  (let [e2 (make-entry st name current cmd)] (privacy/prepare! name e2) e2)
                  entry)]
      (native! st entry)
      (when (= stop :after-native) (throw (ex-info "stopped after the native commit" {})))
      (publish-with-stop! name current entry stop)
      :published)))

(defn- attempt! [st name g cmd stop]
  (on-gateway st g
    (fn []
      (try
        (privacy/guard name
          (fn []
            (let [current (privacy/cut name nil true)]
              (privacy/clear-completed! name current)
              (if (get-in current [:commands cmd]) :already
                (let [pending (privacy/pending name)]
                  (when (and pending (not= cmd (get pending "commandId"))) (throw (ex-info "another removal pending" {})))
                  (when (and (not pending) (contains? (get-in @st [:native :committed]) cmd)) (throw (ex-info "command claimed" {})))
                  (act! st name current cmd pending stop))))))
        (catch Exception e (note! st :attempt-stopped) [:stopped (.getMessage e)])))))

(defn- lost-lock-check! [st name g cmd]
  (on-gateway st g
    (fn []
      (try
        (privacy/guard name
          (fn []
            (let [current (privacy/cut name nil true) _ (privacy/clear-completed! name current) pending (privacy/pending name)]
              (cond (get-in current [:commands cmd]) :already
                    (and pending (not= cmd (get pending "commandId"))) :refused
                    :else (do (swap! st assoc-in [:held cmd] {:g g :current current :prepared pending}) :held)))))
        (catch Exception e [:stopped (.getMessage e)])))))
(defn- lost-lock-act! [st name cmd stop]
  (when-let [{:keys [g current prepared]} (get-in @st [:held cmd])]
    (swap! st update :held dissoc cmd)
    (note! st :lost-lock-acts)
    (on-gateway st g #(try (act! st name current cmd prepared stop) (catch Exception e [:stopped (.getMessage e)])))))

(defn- violation! [st kind detail]
  (note! st kind)
  (swap! st update :violations conj (assoc detail :kind kind :seed (:seed @st) :trace (vec (take-last 30 (:trace @st))))))

(defn- stale? [st g ch]
  (let [c (get-in @st [:gw g :cache (:name @st)])]
    (and c (or (> (:seq c) (:seq ch))
               (and (pos? (:seq c)) (not= (:seal c) (some-> (get (:raws ch) (dec (:seq c))) privacy/sha256)))))))

(defn- shred-pass! [st g]
  (let [name (:name @st) cut-ms (cutoff st) ks (all-keys st)
        before (present-set name ks) ch (chain (records name)) f0 (fail-count "shred")]
    (on-gateway st g #(with-redefs [envelope/grace-ms (- (System/currentTimeMillis) cut-ms)] (#'envelope/shred-published!)))
    (note! st :passes)
    (when (:pending ch) (note! st :passes-with-a-removal-pending))
    (let [after (present-set name ks)
          destroyed (remove after before)
          published (filter some? (:entries ch))
          ids-of (fn [e] (set (map #(get % "assertionId") (get e "identities"))))
          due (filter #(<= (long (get % "erasedAt")) cut-ms) published)]
      ;; I1: every key deleted is a key of a published removal past its grace
      (doseq [k destroyed]
        (note! st :i1-checks)
        (when-not (some #(contains? (ids-of %) k) due)
          (violation! st :i1-deleted-a-key-it-must-not {:key k :pending (some-> (:pending ch) (get "commandId")) :head (:seq ch)})))
      ;; I2: no published removal's key outlives its grace plus this pass
      (when (and (:pending ch) (seq due)) (note! st :passes-with-pending-and-a-due-removal))
      (doseq [e due k (ids-of e)]
        (note! st :i2-checks)
        (when (:pending ch) (note! st :i2-checks-with-a-removal-pending))
        (when (contains? after k)
          (cond
            (contains? (:restored @st) k) (note! st :i2-miss-admitted-restored-key)
            (stale? st g ch) (note! st :i2-miss-gateway-ahead-of-a-restored-log)
            ;; the log on disk does not verify (a writer that lost its lock wrote a head over a restored copy): every cut
            ;; refuses it, as on the base; counted apart, never the fix's miss
            (not (:verifies ch)) (note! st :i2-miss-log-does-not-verify)
            (:pending ch) (violation! st :i2-B2-key-kept-while-a-removal-is-pending {:key k :removal (get e "commandId") :g g :fail-delta (- (fail-count "shred") f0)})
            :else (violation! st :i2-key-outlived-its-grace {:key k :removal (get e "commandId") :g g :fail-delta (- (fail-count "shred") f0)}))))
      (swap! st update :restored #(reduce disj % destroyed)))))

(defn- check-no-silent-deletion! [st before label]
  (let [after (present-set (:name @st) (all-keys st)) gone (remove after before)]
    (when (seq gone) (violation! st :i1-key-gone-outside-a-pass {:step label :keys (vec gone)}))))

(defn- run-schedule [seed]
  (let [r (Random. seed)
        pick (fn [xs] (nth xs (.nextInt r (count xs))))
        name (str "s2-b2r-" (Long/toHexString seed) "-" (UUID/randomUUID))
        st (atom {:seed seed :name name :now 10 :gw {0 {} 1 {}} :native {:seq 0 :committed {}} :keys {} :removals {}
                  :restored #{} :log-snaps [] :data-snaps [] :held {} :trace [] :violations [] :counts {}})
        subjects ["acct/a/one" "acct/b/one" "acct/c/one"] bystander "acct/z/kept"
        k (+ 2 (.nextInt r 2))
        cmds (vec (for [i (range k)] (str "rm-" i)))
        stops-file [:none :none :after-prepare :after-native :publish-fail :crash-after-entry :crash-after-head :moved]
        stops (if pg? [:none :none :after-prepare :after-native :publish-fail :moved] stops-file)]
    (privacy/register! name [":v"] true (fn [] nil))
    (doseq [s (conj subjects bystander) i (range (inc (.nextInt r 2)))]
      (swap! st update-in [:keys s] (fnil conj []) (issue-key! name (str s "#" i "-" (UUID/randomUUID)))))
    (doseq [[i c] (map-indexed vector cmds)]
      (swap! st assoc-in [:removals c] (if (< (.nextDouble r) 0.15) (first subjects) (nth subjects (mod i 3)))))
    (try
      (dotimes [_ (+ 10 (.nextInt r 17))]
        (let [before (present-set name (all-keys st))
              head-before (:seq (chain (records name)))
              roll (.nextInt r 100)
              step (cond
                     (< roll 26) [:attempt (.nextInt r 2) (pick cmds) (pick stops)]
                     (< roll 32) [:lost-lock-check (.nextInt r 2) (pick cmds)]
                     (< roll 38) [:lost-lock-act (pick cmds) (pick stops)]
                     (< roll 56) [:pass (.nextInt r 2)]
                     (< roll 68) [:advance (pick [1 (dec G) G (inc G) (* 2 G)])]
                     (< roll 74) [:restart (.nextInt r 2)]
                     (< roll 78) [:save (pick subjects)]
                     (< roll 83) [:log-snapshot]
                     (< roll 88) [:log-restore (< (.nextDouble r) 0.5)]
                     (< roll 92) [:data-snapshot]
                     (< roll 96) [:data-restore]
                     :else [:replay (.nextInt r 2)])]
          (trace! st step)
          (note! st :steps)
          (case (first step)
            :attempt (let [[_ g c stop] step] (trace! st :-> (attempt! st name g c stop)))
            :lost-lock-check (let [[_ g c] step] (trace! st :-> (lost-lock-check! st name g c)))
            :lost-lock-act (let [[_ c stop] step] (trace! st :-> (lost-lock-act! st name c stop)))
            :pass (shred-pass! st (second step))
            :advance (swap! st update :now + (second step))
            :restart (swap! st assoc-in [:gw (second step)] {})
            :save (on-gateway st 0 #(try (privacy/cut name nil)
                                         (swap! st update-in [:keys (second step)] conj (issue-key! name (str (second step) "#n-" (UUID/randomUUID))))
                                         (note! st :saves)
                                         (catch Exception _ (note! st :saves-refused))))
            :log-snapshot (swap! st update :log-snaps conj (snapshot name))
            :log-restore (when-let [snaps (seq (:log-snaps @st))]
                           (let [b (present-set name (all-keys st))]
                             (restore! name (pick (vec snaps)) (second step))
                             (note! st :log-restores)
                             (let [a (present-set name (all-keys st))]
                               (swap! st update :restored into (remove b a)))))
            :data-snapshot (swap! st update :data-snaps conj (:native @st))
            :data-restore (when-let [snaps (seq (:data-snaps @st))] (swap! st assoc :native (pick (vec snaps))) (note! st :data-restores))
            :replay (on-gateway st (second step)
                      #(try (let [ch (chain (records name))]
                              (privacy/cut name nil)
                              (if (> (get-in @st [:native :seq]) (:seq ch)) (note! st :replays-refused)
                                (do (swap! st assoc :native {:seq (:seq ch) :committed (into (get-in @st [:native :committed])
                                                                                               (map (fn [raw e] [(get e "commandId") raw]) (:raws ch) (:entries ch)))})
                                    (note! st :replays))))
                            (catch Exception _ (note! st :replays-refused)))))
          (when-not (#{:pass :log-restore} (first step)) (check-no-silent-deletion! st before step))
          ;; not the fix's property: the file authority's publication writes the head without comparing it, so a writer
          ;; that lost its lock can move the head back. Counted (pre-existing, file only), never a violation here.
          (when (and (not= :log-restore (first step)) (< (:seq (chain (records name))) head-before))
            (note! st :head-moved-back-outside-a-restore)
            (swap! st update :head-back conj {:seed seed :trace (vec (take-last 12 (:trace @st)))}))))
      ;; drain: restart both gateways, resend every removal (the pending one first), time past the grace, a pass on each
      (swap! st assoc :gw {0 {} 1 {}} :held {})
      (doseq [c (concat (some-> (privacy/pending name) (get "commandId") vector) cmds cmds)]
        (let [o (attempt! st name 0 c :none)] (trace! st [:drain-resend c] :-> o)))
      (swap! st update :now + (* 2 G))
      (shred-pass! st 0) (shred-pass! st 1)
      (let [ch (chain (records name))]
        (when (:pending ch) (note! st :drain-left-pending))
        (note! st (keyword (str "drain-published-" (count (filter some? (:entries ch)))))))
      (catch Throwable t (violation! st :harness-error {:error (str t)}))
      (finally (drop-scope! name)))
    @st))

(defn main []
  (let [n (Long/parseLong (or (System/getenv "B2R_SCHEDULES") "1000"))
        seed0 (Long/parseLong (or (System/getenv "B2R_SEED") "1"))
        started (System/currentTimeMillis)
        totals (atom {}) violations (atom []) head-back (atom [])]
    (dotimes [i n]
      (let [st (run-schedule (+ seed0 i))]
        (swap! totals #(merge-with + % (:counts st)))
        (swap! violations into (:violations st))
        (swap! head-back into (:head-back st))))
    (doseq [x (take 2 @head-back)] (println "B2R_FUZZ_HEAD_BACK" (pr-str x)))
    (let [v @violations
          summary {:source (System/getenv "B2R_SOURCE") :authority (if pg? "postgresql" "file")
                   :schedules n :first-seed seed0 :grace-units G :counts (into (sorted-map) @totals)
                   :violations (count v) :violation-kinds (frequencies (map :kind v))
                   :diagnostic-seconds (quot (- (System/currentTimeMillis) started) 1000)}]
      (doseq [x (take 5 v)] (println "B2R_FUZZ_VIOLATION" (pr-str x)))
      (println "B2R_FUZZ_SUMMARY" (pr-str summary))
      (shutdown-agents)
      (System/exit (if (empty? v) 0 1)))))
