(ns n1r-pool-fuzz
  "[DX-N1R] A schedule fuzzer for the key pool's fill on demand (N1), PostgreSQL authority, through the gateway's routes
  (in-memory Datomic, every option off). Loaded after n1-keys/pool.clj (its frame: one save of N protected values).

  An epoch is one database (sealed; 1 in 10 unsealed) and 40 schedules; a schedule is 3 to 7 random steps on gateway 0
  or 1 (two gateways simulated by swapping the envelope's pools, the cut cache and the pass's progress mark):
    save of N protected values (N mostly 1 to 3; also 10, 100, 255, 256, 257, 300, 600), on fresh subjects;
    the same save refused by the transaction after its keys were taken (a Datomic conflict injected), or stored with
    its outcome unknown to the gateway (transacted, then an exception);
    concurrent: 2 to 4 saves at once, with the worker's pass (refill and key deletion) and, half the time, a removal
    and a pass, all on one gateway;
    the worker's pass (envelope/maintain-keys!: key deletion, then refill of the pools this gateway holds);
    a removal on request of a stored subject (published);
    a gateway restart (its pools, cache and mark emptied);
    the authority failing: every key insert refused (a trigger), every key delete refused (a trigger), or one key batch
    committed while the gateway sees an error (its outcome unknown).
  The grace is 0 (TRIPLEX_ERASURE_SHRED_GRACE_MS=0). Instrumented (wrapped, never replaced): every key batch the
  authority is asked to insert and every key delete.
  Checked after every step:
    K1 every handle the gateway inserts is new (never inserted before, by any batch);
    K2 no handle seals two values (every :triplex.private/body in the database);
    K3 every stored value not removed has its key in the authority (else it can never be read again);
    K4 every key deleted belongs to a removal in the published log (else a value the product serves loses its key);
    K5 after a pass with no failure injected, every published removal's keys are gone;
    K6 every key in a gateway's pool is in the authority and seals no value (else it would be used twice);
    and at the end of each schedule: every value stored in it and not removed reads back as saved (K7).
  Counted: orphan keys (in the authority, sealing nothing, in no pool) and what made them.
  Prints N1R_FUZZ_SUMMARY; exits 1 on any violation."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.main :as main] [wfix1-regression :as offers])
  (:import [java.util UUID Random] [java.util.concurrent ConcurrentHashMap]))

(load-file "/lab/pool.clj")

(def counts (atom {}))
(def violations (atom []))
(defn note! [k & [n]] (swap! counts update k (fnil + 0) (or n 1)))
(defn violation! [k detail] (note! k) (when (< (count @violations) 20) (swap! violations conj (assoc detail :kind k))))

;; ---- instrumentation ----
(def inserted (ConcurrentHashMap.))   ; handle -> batch number
(def deleted (atom #{}))
(def batch-no (atom 0))
(def unknown-commit (atom false))
(def orig-issue @#'sql/issue!)
(def orig-shred @#'sql/shred!)
(defn issue-wrapped [scope wrapped]
  (let [b (swap! batch-no inc)]
    (doseq [[h _] wrapped] (when (.putIfAbsent inserted h b) (violation! :K1-handle-inserted-twice {:handle h})))
    (let [r (orig-issue scope wrapped)]
      (when (compare-and-set! unknown-commit true false)
        (note! :fills-committed-but-reported-failed)
        (throw (java.sql.SQLException. "I/O error at commit (injected after the commit)" "08006")))
      r)))
(defn shred-wrapped [scope ids] (let [r (orig-shred scope ids)] (swap! deleted into ids) r))

;; ---- direct reads (the oracle) ----
(def conn* (atom nil))
(defn jdbc [] (or @conn* (reset! conn* (java.sql.DriverManager/getConnection sql/url))))
(defn exec! [s] (with-open [st (.createStatement ^java.sql.Connection (jdbc))] (.execute st s)))
(defn pg-handles [name]
  (with-open [st (.prepareStatement ^java.sql.Connection (jdbc) "SELECT id FROM triplex_removal.keys WHERE scope=?")]
    (.setString st 1 name)
    (with-open [rs (.executeQuery st)] (loop [out #{}] (if (.next rs) (recur (conj out (.getString rs 1))) out)))))
(defn pg-present
  "The handles of `hs` that the authority holds for `name` (one query)."
  [name hs]
  (if (empty? hs) #{}
    (with-open [st (.prepareStatement ^java.sql.Connection (jdbc) "SELECT id FROM triplex_removal.keys WHERE scope=? AND id = ANY(?)")]
      (.setString st 1 name)
      (.setArray st 2 (.createArrayOf ^java.sql.Connection (jdbc) "text" (object-array (vec hs))))
      (with-open [rs (.executeQuery st)] (loop [out #{}] (if (.next rs) (recur (conj out (.getString rs 1))) out))))))
(defn bodies
  "handle -> [assertion ids] over every sealed body in the database."
  [conn]
  (let [db (d/db conn)]
    (reduce (fn [m dt] (let [h (envelope/body-key-handle (:v dt)) id (:v (first (d/datoms db :eavt (:e dt) :triplex.private/id)))]
                         (if h (update m h (fnil conj []) id) m)))
            {} (d/datoms db :aevt :triplex.private/body))))
(defn published [name]
  (let [cut (privacy/cut name nil true)]
    {:erased (set (keys (:erased cut)))
     :handles (set (keep #(get % "keyHandle") (mapcat #(get % "identities") (vals (:commands cut)))))}))

;; ---- gateways ----
(defn snapshot-gw [] {:pools (into {} @#'envelope/batches) :cache @privacy/cache :shredded @envelope/shredded})
(defn load-gw! [g] (let [^java.util.Map b @#'envelope/batches] (.clear b) (.putAll b (:pools g {})))
  (reset! privacy/cache (:cache g {})) (reset! envelope/shredded (:shredded g {})))
(defn pool-handles [gws] (set (for [[_ g] gws [_ q] (:pools g) [h _] (seq q)] h)))

(defn new-bodies
  "[handle id] of every sealed body added since the last check (read from the database's log)."
  [st]
  (let [{:keys [conn last-t]} @st db (d/db conn) t (d/basis-t db)
        body-a (d/entid db :triplex.private/body) id-a (d/entid db :triplex.private/id)]
    (swap! st assoc :last-t t)
    (vec (for [{:keys [data]} (d/tx-range (d/log conn) (when last-t (inc last-t)) (inc t)) dt data
               :when (and body-a (= body-a (:a dt)) (:added dt))]
           [(envelope/body-key-handle (:v dt)) (:v (first (d/datoms db :eavt (:e dt) id-a)))]))))

(defn check! [st label]
  (let [{:keys [name]} @st
        fresh (filter first (new-bodies st)) pub (published name)
        gws (assoc (:gws @st) (:g @st) (snapshot-gw)) pooled (pool-handles gws)
        new-pooled (remove #(contains? (:verified-pool @st #{}) %) pooled)
        due (when (:after-healthy-pass @st) (:handles pub))
        pg (pg-present name (concat (map first fresh) new-pooled due))]
    (note! :checks)
    (doseq [[h id] fresh]
      (note! :k2-k3-new-values-checked)
      (when-let [before (get-in @st [:seen h])] (violation! :K2-handle-seals-two-values {:handle h :ids [before id] :step label}))
      (swap! st assoc-in [:seen h] id)
      (when (and (not (contains? pg h)) (not (contains? (:erased pub) id)))
        (violation! :K3-stored-value-without-key {:handle h :id id :step label})))
    (doseq [h @deleted :when (not (contains? (:handles pub) h))] (violation! :K4-key-deleted-outside-a-published-removal {:handle h :step label}))
    (note! :k4-deletions-checked (count @deleted))
    (doseq [h new-pooled]
      (note! :k6-pool-keys-checked)
      (if (contains? pg h) (swap! st update :verified-pool (fnil conj #{}) h)
        (violation! :K6-pool-key-not-in-authority {:handle h :step label})))
    (doseq [h pooled :when (or (contains? (:seen @st) h) (contains? @deleted h))]
      (violation! :K6-pool-key-sealing-or-deleted {:handle h :step label}))
    (when due
      (doseq [h due] (note! :k5-published-keys-checked) (when (contains? pg h) (violation! :K5-published-key-kept-after-a-pass {:handle h :step label})))
      (swap! st dissoc :after-healthy-pass))
    (when (= label :epoch-end)
      (let [all (pg-handles name)]
        (doseq [[h id] (:seen @st) :when (and (not (contains? all h)) (not (contains? (:erased pub) id)))]
          (violation! :K3-stored-value-without-key-at-epoch-end {:handle h :id id}))
        {:orphans (count (remove #(or (contains? (:seen @st) %) (contains? pooled %)) all))}))))

;; ---- steps ----
(defn save! [st n & [mode]]
  (let [{:keys [name]} @st cmd (str "f-" (UUID/randomUUID)) frame (n1-pool/frame cmd n)
        send #(offers/send name frame)
        r (case mode
            :refused (with-redefs [d/transact-async (fn [& _] (throw (ex-info ":db.error/unique-conflict injected" {:db/error :db.error/unique-conflict})))] (send))
            :unknown (let [orig d/transact-async] (with-redefs [d/transact-async (fn [& args] (let [f (apply orig args)] @f (throw (java.util.concurrent.TimeoutException. "injected after the commit"))))] (send)))
            (send))
        outcome (offers/outcome r)]
    (note! (keyword (str "save-" (or mode "plain") "-" (first outcome) "-" (second outcome))))
    (when (and (nil? mode) (= 200 (:status r)) (not (:sealed-off @st)))
      (swap! st update :stored into (map (fn [i] [(str "acct/a/" cmd "-" i) (str "secret-" cmd "-" i)]) (range n))))
    outcome))

(defn removal! [st]
  (when-let [[owner _] (first (shuffle (:stored @st)))]
    (let [r (offers/route (:name @st) "v2" "erase" {"commandId" (str "rm-" (UUID/randomUUID)) "selectors" [{"entityId" owner "attribute" ":v"}]})]
      (note! (keyword (str "removal-" (:status r))))
      (when (= 200 (:status r)) (swap! st update :stored (fn [s] (remove #(= owner (first %)) s)))))))

(defn pass! [st] (try (#'envelope/maintain-keys!) (note! :passes) (catch Throwable t (note! :pass-threw))))

(defn read-back! [st]
  (doseq [[owner value] (take 6 (shuffle (:stored @st)))]
    (let [r (offers/route (:name @st) "v1" "read" {"entityIds" [owner]})]
      (note! :k7-reads)
      (when-not (and (= 200 (:status r)) (str/includes? (json/write-str (:body r)) value))
        (violation! :K7-stored-value-not-read-back {:owner owner :status (:status r) :code (get-in r [:body "code"])})))))

(defn run-epoch [^Random r epoch schedules]
  (let [sealed? (pos? (.nextInt r 10))
        scope (json/write-str ["triplex-scope-v1" "test" "n1r-fuzz" (str (UUID/randomUUID)) 0])]
    (with-redefs [main/uri-template "datomic:mem://{db}" sql/issue! issue-wrapped sql/shred! shred-wrapped]
      (let [name (:db (main/create-scope! nil scope "lean" true true)) conn (main/connection (main/db-uri name))
            st (atom {:name name :conn conn :g 0 :gws {0 {} 1 {}} :stored [] :sealed-off (not sealed?)})
            switch! (fn [g] (when (not= g (:g @st)) (swap! st assoc-in [:gws (:g @st)] (snapshot-gw)) (load-gw! (get-in @st [:gws g])) (swap! st assoc :g g)))
            faults (atom #{})
            fault! (fn [kind on?]
                     (case kind
                       :insert (if on? (do (exec! "DROP TRIGGER IF EXISTS n1r_no_insert ON triplex_removal.keys") (exec! "CREATE TRIGGER n1r_no_insert BEFORE INSERT ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION n1r_block()"))
                                 (exec! "DROP TRIGGER IF EXISTS n1r_no_insert ON triplex_removal.keys"))
                       :delete (if on? (do (exec! "DROP TRIGGER IF EXISTS n1r_no_delete ON triplex_removal.keys") (exec! "CREATE TRIGGER n1r_no_delete BEFORE DELETE ON triplex_removal.keys FOR EACH ROW EXECUTE FUNCTION n1r_block()"))
                                 (exec! "DROP TRIGGER IF EXISTS n1r_no_delete ON triplex_removal.keys")))
                     (swap! faults (if on? conj disj) kind))]
        (load-gw! {})
        (note! (if sealed? :epochs-sealed :epochs-unsealed))
        (try
          (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?})
          (dotimes [_ schedules]
            (note! :schedules)
            (dotimes [_ (+ 3 (.nextInt r 5))]
              (switch! (.nextInt r 2))
              (let [roll (.nextInt r 100)
                    size #(let [x (.nextInt r 100)] (cond (< x 85) (nth [1 1 2 3] (.nextInt r 4)) (< x 95) (nth [10 100] (.nextInt r 2)) :else (nth [255 256 257 300 600] (.nextInt r 5))))
                    label (cond (< roll 40) :save (< roll 45) :save-refused (< roll 49) :save-unknown (< roll 57) :concurrent
                                (< roll 70) :pass (< roll 79) :removal (< roll 85) :restart (< roll 89) :fault-insert
                                (< roll 92) :fault-delete (< roll 95) :fault-unknown :else :faults-off)]
                (note! (keyword (str "step-" (clojure.core/name label))))
                (case label
                  :save (save! st (size))
                  :save-refused (save! st (size) :refused)
                  :save-unknown (save! st (size) :unknown)
                  :concurrent (let [fs (doall (for [_ (range (+ 2 (.nextInt r 3)))] (let [n (size)] (future (save! st n)))))
                                    p (future (pass! st))
                                    rm (when (.nextBoolean r) (future (removal! st) (pass! st)))]
                                (doseq [f (concat fs [p] (when rm [rm]))] @f))
                  :pass (do (pass! st) (when (empty? @faults) (swap! st assoc :after-healthy-pass true)))
                  :removal (removal! st)
                  :restart (do (load-gw! {}) (note! :restarts))
                  :fault-insert (fault! :insert true)
                  :fault-delete (fault! :delete true)
                  :fault-unknown (reset! unknown-commit true)
                  :faults-off (do (fault! :insert false) (fault! :delete false) (reset! unknown-commit false)))
                (check! st label)))
            ;; end of schedule: faults off, a healthy pass, read back
            (fault! :insert false) (fault! :delete false) (reset! unknown-commit false)
            (pass! st) (swap! st assoc :after-healthy-pass true) (check! st :schedule-end)
            (when sealed? (read-back! st)))
          (note! :orphan-keys-at-epoch-end (:orphans (check! st :epoch-end) 0))
          (when-not sealed?
            (when (pos? (count (pg-handles name))) (violation! :unsealed-database-holds-keys {:keys (count (pg-handles name))})))
          (finally
            (try (fault! :insert false) (fault! :delete false) (catch Throwable _ nil))
            (try (main/delete-scope! nil scope) (catch Throwable _ nil))
            (with-open [s (.prepareStatement ^java.sql.Connection (jdbc) "DELETE FROM triplex_removal.keys WHERE scope=?")] (.setString s 1 name) (.executeUpdate s))
            (with-open [s (.prepareStatement ^java.sql.Connection (jdbc) "DELETE FROM triplex_removal.records WHERE scope=?")] (.setString s 1 name) (.executeUpdate s))
            (load-gw! {}) (reset! deleted #{})))))))


(defn main []
  (let [n (Long/parseLong (or (System/getenv "N1R_SCHEDULES") "200")) per 40 seed (Long/parseLong (or (System/getenv "N1R_SEED") "1"))
        r (Random. seed) started (System/currentTimeMillis)]
    ;; the authority's schema, and the refusal function the fault triggers use
    (offers/in-scope (fn [db _] (offers/route db "v2" "protection" {"attributes" [":v"] "sealed" true})))
    (exec! "CREATE OR REPLACE FUNCTION n1r_block() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'n1r blocked'; END $$ LANGUAGE plpgsql")
    (doseq [e (range (long (Math/ceil (/ n per))))]
      (try (run-epoch r e (min per (- n (* e per))))
           (catch Throwable t (violation! :harness-error {:error (str (class t) " " (.getMessage t))}))))
    (doseq [v @violations] (println "N1R_FUZZ_VIOLATION" (pr-str v)))
    (println "N1R_FUZZ_SUMMARY" (pr-str {:schedules n :seed seed :counts (into (sorted-map) @counts) :violations (reduce + 0 (vals (select-keys @counts (filter #(re-find #"^(K[0-9]|unsealed|harness)" (name %)) (keys @counts)))))
                                         :source (System/getenv "B2R_SOURCE") :diagnostic-seconds (quot (- (System/currentTimeMillis) started) 1000)}))
    (shutdown-agents)
    (System/exit (if (empty? @violations) 0 1))))
