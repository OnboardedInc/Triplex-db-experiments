(ns era3-attack5
  "[DX-ERA3, fifth review] Attacks on DX-ERA2 at 61692eec8 (gateway code 3998744c7): the completion worker, the
  protection policy stored in Datomic, the rebuild and reconcile routes open to any caller, Z7's rule for a save with
  no frame source, the removal stamp, the one-way move to the commit boundary, and a fifth fuzzer with the worker,
  the move, rebuild and reconcile as steps. The boundary is now the database's own setting (-2 in
  :triplex.scope/erasure-seq): every case runs on a database left on the log's boundary or moved to the commit
  boundary through its route; the fourth review's per-process test seam stays nil. Loaded after wfix1/regression.clj,
  era2/gate.clj, era3/attack.clj to attack4.clj; era3/run.sh runs it with ERA3_MAIN=5. Review: era3/REVIEW-5.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.scope :as scope]
            [triplex.gateway.removal-commit :as rc] [triplex.gateway.group :as group]
            [triplex.gateway.write-policy :as policy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack2 :as b]
            [era3-attack3 :as c] [era3-attack4 :as q])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets] [java.util Random UUID]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def boundaries [:log :commit])

;; ---- the boundary is the database's own setting -------------------------------------------------------------------
(defn real-boundary! [] (alter-var-root #'rc/commit-boundary (constantly nil)) (reset! q/on-boundary nil) (reset! privacy/cache {}))
(defn may-turn-on! [v] (alter-var-root #'rc/may-turn-on (constantly (boolean v))))
(defn move-commit! [name]
  (may-turn-on! true)
  (try (offers/route name "v2" "removal-commit-boundary" {}) (finally (may-turn-on! false))))
(defn boundary-of [conn] (if (= -2 (scope/value (d/db conn) (scope/entity (d/db conn)) :triplex.scope/erasure-seq)) :commit :log))
(defn on-boundary!
  "Leave a database on the log's boundary, or move it to the commit boundary (its route), and check it is there."
  [name conn boundary]
  (when (and per-account? (= boundary :commit))
    (let [r (move-commit! name)]
      (when-not (and (= 200 (:status r)) (= :commit (boundary-of conn))) (throw (ex-info "move to the commit boundary failed" {:r r})))))
  (when (and per-account? (not= boundary (boundary-of conn))) (throw (ex-info "wrong boundary" {:want boundary}))))
(defn scope5 [boundary sealed? f]
  (g/fresh-scope sealed? (fn [name conn] (on-boundary! name conn boundary) (f name conn))))
(defn scope5-with
  "A database protecting `attrs`, moved per account when this run is (any mode, the database-wide one included)."
  [attrs sealed? boundary f]
  (offers/in-scope
    (fn [name conn]
      (binding [g/sealed-run? sealed?]
        (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
          (let [p (offers/route name "v2" "protection" {"attributes" attrs "sealed" sealed?})]
            (when-not (= 200 (:status p)) (throw (ex-info "protection failed" {:p p}))))
          (when per-account?
            (let [m (offers/route name "v2" "removal-per-account" {})]
              (when-not (= 200 (:status m)) (throw (ex-info "move per account failed" {:m m})))))
          (on-boundary! name conn boundary)
          (f name conn))))))

;; ---- requests with their headers ----------------------------------------------------------------------------------
(defn raw [name version action input & [query]]
  (let [{:keys [status body headers]}
        (main/route-handler {:request-method (if (nil? input) :get :post) :uri (str "/" version "/db/" name "/" action)
                             :query-string query
                             :body (when input (ByteArrayInputStream. (.getBytes ^String (json/write-str input) StandardCharsets/UTF_8)))})
        text (if (string? body) body (String. ^bytes body StandardCharsets/UTF_8))]
    {:status status :headers headers :text text :body (try (json/read-str text) (catch Exception _ text))}))
(defn outcome [r] [(:status r) (get-in r [:body "code"])])
(defn stamp-of [r] (some-> (get-in r [:headers "x-triplex-removal-stamp"]) Long/parseLong))
(defn seq-header [r] (some-> (get-in r [:headers "x-triplex-erasure-seq"]) Long/parseLong))
(defn frontier [name] (:body (offers/route name "v2" "erasure-frontier" nil)))
(defn stop-removal!
  "A removal of `entity`'s :v whose gateway stops at `stop` (:after-intent, :after-declare, :after-native)."
  [name cmd entity stop]
  (reset! a/plan (if (= stop :after-intent)
                   {:hook (let [f (atom false)] (fn [p] (when (and (= p :after-intent) (compare-and-set! f false true))
                                                          (throw (ex-info "ERA3 gateway stopped after-intent" {})))))}
                   {:stop stop :stops-left 1}))
  (try (a/remove-attr! name cmd entity) (finally (reset! a/plan nil))))
(defn safe [f] (try (f) (catch Throwable e {:status (or (:status (ex-data e)) :threw)
                                              :body {"code" (or (:code (ex-data e)) (.getName (class e))) "message" (.getMessage e)}})))
(defn masked? [name entity value] (not (str/includes? (a/read-text name entity) value)))
(defn with-worker-ms [ms f]
  (let [before rc/worker-complete-ms]
    (alter-var-root #'rc/worker-complete-ms (constantly ms))
    (try (f) (finally (alter-var-root #'rc/worker-complete-ms (constantly before))))))
(defn worker-pass!
  "One pass of the key-shred worker as `maintain-keys!` runs it: key deletion, then the completion of stale removals."
  []
  (@#'envelope/shred-published!)
  (rc/complete-stale!))
(defn failures [] (into (sorted-map) (get @@(requiring-resolve 'triplex.gateway.stats/counts) :removalFailures)))
(defn native-count [name conn] (count (:entries (rc/native-entries name (erase/sync! conn)))))
(defn command-entries [name conn cmd]
  (count (filter #(= cmd (get-in % [:entry "commandId"])) (:entries (rc/native-entries name (erase/sync! conn))))))

;; ---- W1: two workers and a client resend racing on one removal --------------------------------------------------
(defn w1 [boundary stop k]
  (when per-account?
    (scope5 boundary false
      (fn [name conn]
        (let [lbl (str "W1 two workers and a resend racing on one removal, " (clojure.core/name boundary) ", stopped " (clojure.core/name stop))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              cmd (str "w1-rm-" k) sel [{"entityId" g/a1 "attribute" ":v"}]
              seq0 (g/seq-now name conn) n0 (native-count name conn)
              stopped (stop-removal! name cmd g/a1 stop)
              gate (promise)
              ;; two gateways' workers (each calls what complete-pending! calls; the per-process de-duplication is
              ;; per gateway, so two gateways both run it) and the client's resend
              worker (fn [] @gate (safe #(do (erase/erase! name conn {"commandId" cmd "selectors" sel}) {:status 200})))
              fs [(future (worker)) (future (worker)) (future (do @gate (a/remove-attr! name cmd g/a1)))]
              _ (deliver gate true)
              outs (mapv #(let [r (deref % 30000 {:status :timeout})] (if (map? (:body r)) [(:status r) (get-in r [:body "code"])] [(:status r)])) fs)
              detail {:stopped (offers/outcome stopped) :answers outs
                      :native-commits-of-the-command (command-entries name conn cmd)
                      :native-removals-added (- (native-count name conn) n0)
                      :published-seq-added (- (long (g/seq-now name conn)) (long seq0))
                      :pending-after (some-> (privacy/pending name) (get "commandId"))
                      :a1-masked (masked? name g/a1 va)}]
          (bump! :w1 boundary stop (sort (map str outs)))
          (when (zero? k) (observe! lbl :detail detail))
          (oracle! lbl (and (= 1 (:native-commits-of-the-command detail)) (= 1 (:native-removals-added detail))
                            (= 1 (:published-seq-added detail)) (nil? (:pending-after detail)) (:a1-masked detail)
                            (every? #(or (= [200 nil] %) (= [200] %) (= 503 (first %))) outs))
                   "racing completions apply the removal exactly once and answer 200 or a typed 503" detail))))))

;; ---- W2: can a removal be withdrawn or changed once its intent is recorded? ---------------------------------------
(defn w2 [boundary]
  (when per-account?
    (scope5 boundary false
      (fn [name conn]
        (let [lbl (str "W2 a removal changed by its client, then completed by the worker, " (clojure.core/name boundary))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1)) vb (:value (seeds g/b1))
              stopped (stop-removal! name "w2-rm" g/a1 :after-declare)
              changed (offers/outcome (a/erase! name "w2-rm" [{"entityId" g/b1 "attribute" ":v"}]))
              withdraw (mapv #(safe (fn [] (offers/outcome (offers/route name "v2" % {"commandId" "w2-rm"}))))
                             ["erase-cancel" "erase-withdraw" "removal-cancel"])
              _ (Thread/sleep 5)
              _ (with-worker-ms 1 worker-pass!)
              detail {:stopped (offers/outcome stopped) :resend-with-other-selectors changed :withdraw-routes withdraw
                      :pending-after-the-worker (some-> (privacy/pending name) (get "commandId"))
                      :a1-masked (masked? name g/a1 va) :b1-masked (masked? name g/b1 vb)}]
          (observe! lbl :detail detail)
          (oracle! lbl (and (nil? (:pending-after-the-worker detail)) (:a1-masked detail) (not (:b1-masked detail)))
                   "the worker completes the removal as first recorded, and nothing else" detail))))))

;; ---- W3: one poisoned pending removal, beside healthy databases ----------------------------------------------------
(defn w3 [boundary poison]
  (when per-account?
    (scope5 boundary true
      (fn [p pconn]
        (scope5 boundary true
          (fn [qn qconn]
            (let [lbl (str "W3 a poisoned pending removal (" (clojure.core/name poison) ") beside a healthy one, " (clojure.core/name boundary))
                  ps (g/seed! p [g/a1 g/b1 "acct/c/one"]) qs (g/seed! qn [g/a1 g/b1])
                  ;; P: a published removal whose key is due, then the poisoned pending removal
                  p-r1 (a/remove-attr! p "w3-p-r1" g/a1)
                  p-keys (q/removal-keys p "w3-p-r1")
                  _ (case poison
                      :corrupt (do (stop-removal! p "w3-p-r2" g/b1 :after-intent)
                                   (privacy/replace! (privacy/path p "pending.json") "{\"seq\": 2, \"commandId\": \"w3-p-r2\""))
                      :wrong-seq (do (stop-removal! p "w3-p-r2" g/b1 :after-intent)
                                     (let [pj (json/read-str (privacy/record-text p "pending.json"))]
                                       (privacy/replace! (privacy/path p "pending.json") (json/write-str (assoc pj "seq" (+ 5 (long (get pj "seq"))))))))
                      :log-entry-altered (do (stop-removal! p "w3-p-r2" g/b1 :after-intent)
                                        ;; the log's published entry rewritten by hand: the data and the log disagree on it
                                        (let [e1 (json/read-str (privacy/record-text p "erase-1.json"))]
                                          (privacy/replace! (privacy/path p "erase-1.json") (json/write-str (assoc e1 "erasedAt" (inc (long (get e1 "erasedAt"))))))
                                          (reset! privacy/cache {}))))
                  _ (reset! privacy/cache {})
                  ;; Q: a removal stopped after its intent (stale), and a published one whose key is due
                  q-r1 (a/remove-attr! qn "w3-q-r1" g/a1)
                  q-keys (q/removal-keys qn "w3-q-r1")
                  _ (stop-removal! qn "w3-q-r2" g/b1 :after-intent)
                  f0 (failures)
                  _ (Thread/sleep 5)
                  passes (with-worker-ms 1 #(vec (for [i (range 3)] (safe (fn [] (worker-pass!) :ok)))))
                  f1 (failures)
                  ;; [DX-ERA2 sixth pass, adapted: V6's way out] storage damage (a record cut short, an entry altered) is
                  ;; repaired by the operator's rebuild route; the key check below follows it
                  repair (when (#{:corrupt :log-entry-altered} poison) (offers/outcome (safe #(q/rebuild! p {}))))
                  _ (when repair (with-worker-ms 1 #(worker-pass!)))
                  detail {:poison poison :p-r1 (offers/outcome p-r1) :q-r1 (offers/outcome q-r1) :passes passes :operator-repair repair
                          :q-pending-after (some-> (privacy/pending qn) (get "commandId"))
                          :q-published-key-alive (q/keys-alive qn q-keys)
                          :p-published-key-alive (q/keys-alive p p-keys)
                          :p-pending-after (safe #(some-> (privacy/pending p) (get "commandId")))
                          :p-read (offers/outcome (safe #(offers/route p "v1" "read" {"entityIds" [g/b1]})))
                          :p-save-of-another-account (offers/outcome (safe #(offers/send p (g/frame "w3-p-save" "acct/d/one" (g/secret "acct/d/one" "x") nil (g/head pconn)))))
                          :p-rebuild-route (offers/outcome (safe #(q/rebuild! p {})))
                          :p-reconcile-route (offers/outcome (safe #(offers/route p "v2" "removal-log-reconcile" {})))
                          :failures-counted-during-the-passes (into (sorted-map) (for [[k v] f1 :let [d (- v (get f0 k 0))] :when (pos? d)] [k d]))}]
              (observe! lbl :detail detail)
              (bump! :w3 boundary poison :q-completed (nil? (:q-pending-after detail)) :p-key-alive (:p-published-key-alive detail))
              (oracle! lbl (and (nil? (:q-pending-after detail)) (zero? (:q-published-key-alive detail)))
                       "a poisoned removal in one database does not stop another database's completion or key deletion" detail)
              (oracle! lbl (zero? (:p-published-key-alive detail))
                       "the poisoned database's own published keys are still deleted (TARGETS 7.9)" detail)
              (oracle! lbl (or (nil? (:p-pending-after detail)) (seq (:failures-counted-during-the-passes detail)))
                       "a removal the worker cannot complete is counted (page 18.2 row 20)" detail))))))))

;; ---- W4: what the worker costs with many databases and no removals -------------------------------------------------
(defn w4 []
  (when per-account?
    (with-redefs [main/uri-template (or (System/getenv "WFIX1_URI") "datomic:mem://{db}")]
      (let [made (atom [])
            make! (fn [] (let [sc (json/write-str ["triplex-scope-v1" "test" "w4" (str (UUID/randomUUID)) 0])
                               nm (:db (main/create-scope! nil sc "lean" true true))]
                           (swap! made conj sc)
                           (offers/route nm "v2" "protection" {"attributes" [":v"] "sealed" true})
                           (offers/route nm "v2" "removal-per-account" {})))
            time-pass (fn [f] (let [ts (sort (for [_ (range 15)] (let [t (System/nanoTime)] (f) (/ (- (System/nanoTime) t) 1.0e6))))]
                                {:median-ms (nth ts 7) :max-ms (last ts)}))]
        (try
          (let [rows (vec (for [n [1 25 100]]
                            (do (while (< (count @made) n) (make!))
                                {:databases-created n :authority-scopes-listed (count (@#'envelope/authority-scopes))
                                 :completion-pass (with-worker-ms 30000 #(time-pass rc/complete-stale!))
                                 :key-deletion-pass (time-pass @#'envelope/shred-published!)})))]
            (observe! "W4 the worker's pass with many databases and no removals" :detail {:rows rows}))
          (finally (doseq [sc @made] (try (main/delete-scope! nil sc) (catch Exception _ nil)))))))))

;; ---- P1: the policy only in the log (an earlier build's move), the log lost, another database's head put back -----
(defn scope-earlier-move
  "A protected database moved per account the way a build before 9bd7c783c did: no policy stored in Datomic."
  [attrs sealed? f]
  (offers/in-scope
    (fn [name conn]
      (binding [g/sealed-run? sealed?]
        (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
          (offers/route name "v2" "protection" {"attributes" attrs "sealed" sealed?})
          (erase/per-account! name conn {})
          (f name conn))))))
(defn p1 [sealed?]
  (when per-account?
    (scope-earlier-move [":v" ":p"] sealed?
      (fn [name conn]
        (q/scope-with [":v"] sealed?
          (fn [other oconn]
            (let [lbl (str "P1 a policy only in the log, the log lost, another database's head put back" (if sealed? ", sealed" ""))
                  pv (g/secret g/a1 "p")
                  s1 (offers/send name (g/save-frame "p1-a1-p" g/a1 ":p" pv nil nil))
                  stored-before (rc/stored-policy (d/db conn))
                  own-head (privacy/record-text name "head.json")
                  _ (q/log-delete! name)
                  reads-missing (vec (for [_ (range 2)] (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))))
                  rebuild-missing (offers/outcome (q/rebuild! name {}))
                  ;; the operator puts back "any copy of the log's head.json": one from the wrong database
                  foreign (privacy/record-text other "head.json")
                  _ (privacy/replace! (privacy/path name "head.json") foreign)
                  _ (reset! privacy/cache {})
                  read-foreign (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
                  rebuild-foreign (offers/outcome (safe #(q/rebuild! name {})))
                  stored-after-foreign (rc/stored-policy (d/db conn))
                  ;; then the right head
                  _ (privacy/replace! (privacy/path name "head.json") own-head)
                  _ (reset! privacy/cache {})
                  rebuild-own (offers/outcome (safe #(q/rebuild! name {})))
                  read-own (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
                  rm-p (offers/outcome (a/erase! name "p1-rm-a1-p" [{"entityId" g/a1 "attribute" ":p"}]))
                  rm-v (offers/outcome (a/remove-attr! name "p1-rm-a1-v" g/a1))
                  pv2 (g/secret g/b1 "p2")
                  s2 (offers/send name (g/save-frame "p1-b1-p" g/b1 ":p" pv2 nil (g/head conn)))
                  detail {:seed (offers/outcome s1) :stored-before stored-before :reads-with-the-log-missing reads-missing
                          :rebuild-with-the-log-missing rebuild-missing :read-with-the-foreign-head read-foreign
                          :rebuild-with-the-foreign-head rebuild-foreign :stored-after-the-foreign-head stored-after-foreign
                          :rebuild-with-its-own-head-back rebuild-own :read-then read-own
                          :removal-of-a1-p rm-p :removal-of-a1-v rm-v :a1-p-still-answered (not (masked? name g/a1 pv))
                          :new-p-save s2 :native-copies-in-clear-of-the-new-p-value (count (g/raw-occurrences conn pv2))}]
              (observe! lbl :detail detail)
              (oracle! lbl (not= (get stored-after-foreign "attributes") [":v"])
                       "a head from another database never becomes this database's stored policy" detail)
              (oracle! lbl (= 200 (first rm-p)) "with its own head back, a protected value can be removed on request" detail))))))))

;; ---- P2: an adopted database whose log is lost, then the protection route with another attribute list ----------
(defn p2 [sealed? boundary attrs-after]
  (when per-account?
    (scope5-with [":v" ":p"] sealed? boundary
      (fn [name conn]
        (let [kind (cond (= attrs-after [":v" ":p"]) "the same list" (< (count attrs-after) 2) "a narrower list" :else "a wider list")
              lbl (str "P2 the protection route with " kind " after the log is lost, " (clojure.core/name boundary) (if sealed? ", sealed" ""))
              pv (g/secret g/a1 "p")
              s1 (offers/send name (g/save-frame "p2-a1-p" g/a1 ":p" pv nil nil))
              s2 (offers/send name (g/frame "p2-b1-v" g/b1 (g/secret g/b1 "v") nil nil))
              rm (offers/outcome (a/remove-attr! name "p2-rm-b1" g/b1))
              stored (rc/stored-policy (d/db conn))
              _ (q/log-delete! name)
              ;; the first request after the loss is the protection call (a service's start-up, or any caller)
              protect (offers/outcome (offers/route name "v2" "protection" {"attributes" attrs-after "sealed" sealed?}))
              head-now (some-> (privacy/record-text name "head.json") json/read-str (select-keys ["seq" "attributes" "sealed"]))
              read-a1 (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              pv2 (g/secret "acct/c/one" "p")
              s3 (offers/send name (g/save-frame "p2-c1-p" "acct/c/one" ":p" pv2 nil (g/head conn)))
              rebuild (offers/outcome (safe #(q/rebuild! name {})))
              reconcile (offers/outcome (safe #(offers/route name "v2" "removal-log-reconcile" {})))
              rm-p (offers/outcome (a/erase! name "p2-rm-a1-p" [{"entityId" g/a1 "attribute" ":p"}]))
              back (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":p"] "sealed" sealed?}))
              read-later (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              detail {:seeds [(offers/outcome s1) (offers/outcome s2)] :removal rm :stored-policy stored
                      :protection-after-the-loss protect :log-head-after-it head-now :read-a1 read-a1
                      :new-p-save (offers/outcome s3) :native-copies-in-clear-of-the-new-p-value (count (g/raw-occurrences conn pv2))
                      :rebuild-route rebuild :reconcile-route reconcile :removal-of-a1-p rm-p
                      :protection-with-the-stored-policy-again back :a-read-at-the-end read-later}]
          (observe! lbl :detail detail)
          (bump! :p2 boundary kind sealed? :removal rm-p :rebuild rebuild)
          ;; [DX-ERA2 sixth pass, adapted: adding an attribute is now a normal operation, one-way, from the database's policy
          ;; (the coordinator's V1 fix); dropping one is still refused] the narrower list must be refused; the wider list
          ;; must be an addition to the stored policy, with the log's copy following it
          (when (< (count attrs-after) 2)
            (oracle! lbl (not= 200 (first protect))
                     "with the log lost, the protection route cannot set a policy other than the stored one" detail))
          (when (> (count attrs-after) 2)
            (oracle! lbl (and (= 200 (first protect)) (= (set attrs-after) (set (get (rc/stored-policy (d/db conn)) "attributes")))
                              (= (set attrs-after) (set (get head-now "attributes"))))
                     "with the log lost, a wider list adds to the stored policy and the log's copy follows it" detail))
          (oracle! lbl (= 200 (first rm-p)) "a protected value can still be removed on request" detail))))))

;; ---- W5: a database deleted while one of its removals is pending -------------------------------------------------
(defn w5 []
  (when per-account?
    (let [kept (atom nil)]
      (scope5 :log false (fn [name conn] (g/seed! name [g/a1]) (stop-removal! name "w5-rm" g/a1 :after-intent) (reset! kept name)))
      ;; the database is deleted now (the test scope ends); its removal log stays in the authority
      (let [name @kept f0 (failures) _ (Thread/sleep 5)
            passes (with-worker-ms 1 #(vec (for [_ (range 4)] (safe (fn [] (worker-pass!) :ok)))))
            f1 (failures)
            detail {:log-left-after-the-delete (some? (privacy/record-text name "head.json")) :pending-left (some? (safe #(privacy/pending name)))
                    :listed-by-the-worker (boolean (some #{name} (@#'envelope/authority-scopes))) :passes passes
                    :failures-counted-in-4-passes (into (sorted-map) (for [[k v] f1 :let [dd (- v (get f0 k 0))] :when (pos? dd)] [k dd]))}]
        (observe! "W5 a database deleted while a removal is pending" :detail detail)
        (oracle! "W5 a database deleted while a removal is pending" (empty? (:failures-counted-in-4-passes detail))
                 "the worker does not fail on a deleted database's removal log forever" detail)))))

;; ---- C1: the rebuild and reconcile routes called by anyone, in a storm, while removals run -----------------------
(defn c1 [boundary storm?]
  (when per-account?
    (scope5 boundary false
      (fn [name conn]
        (let [lbl (str "C1 removals while the rebuild and reconcile routes are called in a loop, " (clojure.core/name boundary) (if storm? "" ", control"))
              owners (vec (for [k (range 10)] (str "acct/e" k "/one")))
              seeds (g/seed! name (conj owners g/a1))
              stop? (atom false) calls (atom {})
              hammer (fn [route] (future (while (not @stop?)
                                           (let [r (safe #(offers/route name "v2" route {}))]
                                             (swap! calls update [route (:status r) (get-in r [:body "code"])] (fnil inc 0))))))
              hs (when storm? (vec (concat (for [_ (range 3)] (hammer "removal-log-rebuild")) (for [_ (range 2)] (hammer "removal-log-reconcile")))))
              _ (Thread/sleep 200)
              rms (vec (for [o owners] (let [t (System/nanoTime) r (a/remove-attr! name (str "c1-" o) o)]
                                         [(offers/outcome r) (/ (- (System/nanoTime) t) 1.0e6)])))
              reads (vec (for [_ (range 20)] (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))))
              _ (reset! stop? true)
              _ (doseq [h hs] (deref h 10000 nil))
              ms (sort (map second rms))
              detail {:removals (frequencies (map first rms)) :removal-ms-median (nth ms 5) :removal-ms-max (last ms)
                      :reads (frequencies reads) :route-calls @calls
                      :removed-values-answered (count (remove #(masked? name % (:value (seeds %))) owners))
                      :pending-after (some-> (privacy/pending name) (get "commandId"))}]
          (observe! lbl :detail detail)
          (oracle! lbl (zero? (:removed-values-answered detail)) "no removed value is answered whatever the routes are called" detail)
          (oracle! lbl (every? #(= [200 nil] %) (map first rms)) "every removal completes while others call the rebuild and reconcile routes" detail))))))

;; ---- Z1 to Z5: the rule for a save framed before a removal (R2-2, Z7) --------------------------------------------
(defn sourceless [cmd owner attr value] (g/save-frame cmd owner attr value nil nil))
(defn z-matrix [boundary]
  (scope5-with [":v" ":p"] false boundary
    (fn [name conn]
      (let [lbl (str "Z7a what a save with no frame source can no longer do after one removal, " mode " " (clojure.core/name boundary))
            a2 "acct/a/two" a3 "acct/a/three"
            seed (fn [cmd o attr] (let [v (g/secret o (str attr "-seed"))] (offers/send name (g/save-frame cmd o attr v nil nil)) v))
            av (seed "zs-a1-v" g/a1 ":v") ap (seed "zs-a1-p" g/a1 ":p") bv (seed "zs-b1-v" g/b1 ":v") bp (seed "zs-b1-p" g/b1 ":p")
            _ (seed "zs-a2-v" a2 ":v")
            ra (offers/outcome (a/remove-attr! name "z-ra" g/a1))
            rb (offers/outcome (a/erase! name "z-rb" [{"entityId" g/b1}]))
            try! (fn [tag o attr] (offers/outcome (offers/send name (sourceless (str "zt-" tag "-" (System/nanoTime)) o attr (g/secret o tag)))))
            after (into (sorted-map)
                        {"a1 :v (removed by attribute)" (try! "a1v" g/a1 ":v") "a1 :p (same subject, other protected attribute)" (try! "a1p" g/a1 ":p")
                         "a1 :u (unprotected attribute)" (try! "a1u" g/a1 ":u")
                         "b1 :v (removed by entity)" (try! "b1v" g/b1 ":v") "b1 :p" (try! "b1p" g/b1 ":p") "b1 :u (unprotected)" (try! "b1u" g/b1 ":u")
                         "a2 :v (same account, other subject)" (try! "a2v" a2 ":v") "a3 :v (new subject)" (try! "a3v" a3 ":v")})
            ;; later removals of other subjects do not lift it
            _ (doseq [k (range 3)] (offers/send name (g/frame (str "zl-" k) (str "acct/l" k "/one") (g/secret "l" (str k)) nil nil))
                                   (a/remove-attr! name (str "z-rl-" k) (str "acct/l" k "/one")))
            later (try! "a1v-later" g/a1 ":v")
            with-source (offers/outcome (offers/send name (g/frame (str "zt-src-" (System/nanoTime)) g/a1 (g/secret g/a1 "fresh") nil (g/head conn))))
            detail {:removal-by-attribute ra :removal-by-entity rb :sourceless-saves-after after
                    :a1-v-after-three-more-removals later :a1-v-with-a-fresh-source with-source}]
        (observe! lbl :detail detail)
        (doseq [[k v] after] (bump! :z7a mode boundary k v))))))

(defn z-seen [boundary]
  (scope5 boundary false
    (fn [name conn]
      (let [lbl (str "Z7b removalSeen and frame sources, honest and not, " mode " " (clojure.core/name boundary))
            seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
            before (frontier name)
            ra (offers/outcome (a/remove-attr! name "zb-ra" g/a1))
            after (frontier name)
            k (get after "seq")
            send-with (fn [tag extra value] (offers/outcome (offers/send name (merge (sourceless (str "zb-" tag) g/a1 ":v" value) extra))))
            rows (into (sorted-map)
                       {"removalSeen before the removal" (send-with "stale" {"removalSeen" (dec (long k))} (g/secret g/a1 "n1"))
                        "removalSeen after the removal (honest)" (send-with "seen" {"removalSeen" k} (g/secret g/a1 "n2"))})
            ;; a client that lies to get the value it read before the removal stored again
            lie-seen (send-with "lie-seen" {"removalSeen" 1000000000} va)
            stored-lie-seen (not (masked? name g/a1 va))
            ra2 (offers/outcome (a/remove-attr! name "zb-ra2" g/a1))
            lie-source (offers/outcome (offers/send name (g/frame "zb-lie-source" g/a1 va nil (g/head conn))))
            stored-lie-source (not (masked? name g/a1 va))
            detail {:frontier-before (select-keys before ["seq" "removalStamp"]) :frontier-after (select-keys after ["seq" "removalStamp"])
                    :removal ra :saves rows
                    :lying-removalSeen-with-the-removed-value lie-seen :removed-value-answered-again stored-lie-seen
                    :second-removal ra2 :lying-fresh-source-with-the-removed-value lie-source :removed-value-answered-again-2 stored-lie-source}]
        (observe! lbl :detail detail)
        (bump! :z7b mode boundary :lie-seen lie-seen :lie-source lie-source)))))

(defn z-loop
  "What a client that learns its removal stamp only from responses (the SDK's removalStamps) meets after a removal."
  [boundary]
  (scope5 boundary false
    (fn [name conn]
      (let [lbl (str "Z7c a client whose stamp is older than a removal, retrying, " mode " " (clojure.core/name boundary))
            _ (g/seed! name [g/a1 g/b1])
            first-read (raw name "v1" "read" {"entityIds" [g/b1]})
            held (or (stamp-of first-read) (seq-header first-read) 0)
            ra (offers/outcome (a/remove-attr! name "zc-ra" g/a1))
            attempt (fn [k seen] (let [r (raw name "v1" "transact" (assoc (sourceless (str "zc-" k) g/a1 ":v" (g/secret g/a1 (str "new" k))) "removalSeen" seen))]
                                   {:answer (outcome r) :stamp-header (stamp-of r) :seq-header (seq-header r)}))
            tries (vec (for [k (range 3)] (attempt k held)))
            a-read (raw name "v1" "read" {"entityIds" [g/b1]})
            fresh (or (stamp-of a-read) (seq-header a-read))
            after-read (attempt 9 fresh)
            ok-save (raw name "v1" "transact" (g/frame "zc-ok" g/b1 (g/secret g/b1 "x") nil (g/head conn)))
            detail {:stamp-held-before held :removal ra :retries-with-the-held-stamp tries
                    :stamp-from-a-read fresh :save-after-the-read after-read
                    :a-stored-save-carries-the-stamp-header (some? (stamp-of ok-save)) :its-answer (outcome ok-save)
                    :declined-commands-recorded (let [db (d/db conn)] (if (d/entid db :triplex.removal/declined-command)
                                                                         (count (seq (d/datoms db :aevt :triplex.removal/declined-command))) 0))}]
        (observe! lbl :detail detail)
        (bump! :z7c mode boundary (mapv :answer tries) (:answer after-read))))))

(defn z-commands [boundary]
  (scope5 boundary false
    (fn [name conn]
      (let [lbl (str "Z7d a command burned by a declined save in another account, " mode " " (clojure.core/name boundary))
            seeds (g/seed! name [g/a1 g/b1 "acct/a/two"])
            _ (a/remove-attr! name "zd-ra" g/a1)
            ;; a caller of account a sends a source-less save of the removed subject under someone else's command
            hostile (offers/outcome (offers/send name (sourceless "victim-cmd-1" g/a1 ":v" (g/secret g/a1 "h"))))
            victim (offers/outcome (offers/send name (g/frame "victim-cmd-1" g/b1 (g/secret g/b1 "v") nil (g/head conn))))
            ;; control: the same caller stores an ordinary save under a command first
            hostile2 (offers/outcome (offers/send name (g/frame "victim-cmd-2" "acct/a/two" (g/secret "acct/a/two" "h") nil (g/head conn))))
            victim2 (offers/outcome (offers/send name (g/frame "victim-cmd-2" g/b1 (g/secret g/b1 "v2") nil (g/head conn))))
            detail {:declined-save-under-a-victims-command hostile :the-victims-later-save victim
                    :control-ordinary-save-under-a-victims-command hostile2 :the-victims-later-save-control victim2}]
        (observe! lbl :detail detail)))))

(defn z-growth [boundary]
  (scope5 boundary false
    (fn [name conn]
      (let [lbl (str "Z7e what each declined save writes, " mode " " (clojure.core/name boundary))
            _ (g/seed! name [g/a1])
            _ (a/remove-attr! name "ze-ra" g/a1)
            _ (offers/send name (sourceless "ze-warm" g/a1 ":v" (g/secret g/a1 "w")))
            t0 (d/basis-t (erase/sync! conn))
            answers (frequencies (for [k (range 50)] (offers/outcome (offers/send name (sourceless (str "ze-" k) g/a1 ":v" (g/secret g/a1 (str k)))))))
            db (erase/sync! conn)
            txs (seq (d/tx-range (d/log conn) (inc t0) nil))
            datoms (reduce + (map #(count (:data %)) txs))
            detail {:answers answers :transactions-written (count txs) :datoms-written datoms
                    :datoms-per-declined-save (/ (double datoms) 50)}]
        (observe! lbl :detail detail)))))

;; ---- Z7f: a delivery (no frame source) of a subject removed in the recipient ------------------------------------
(defn z-delivery [boundary]
  (when per-account?
    (scope5 boundary false
      (fn [name conn]
        (scope5 boundary false
          (fn [src sconn]
            (let [lbl (str "Z7f a delivery with no frame source into a database where its subject was removed, " mode " " (clojure.core/name boundary))
                  _ (g/seed! name [g/a1 g/b1]) _ (g/seed! src [g/a1])
                  ra (offers/outcome (a/remove-attr! name "zf-ra" g/a1))
                  deliver (fn [cmd owner extra] (offers/outcome (offers/send name (merge (assoc (g/save-frame cmd owner ":v" (g/secret owner cmd) nil nil)
                                                                                           "erasureSourceDatabase" src "erasureSeq" (g/seq-now src sconn))
                                                                                    extra))))
                  detail {:removal ra
                          :delivery-of-the-removed-subject (deliver "zf-d1" g/a1 {})
                          :again-under-a-new-command (deliver "zf-d2" g/a1 {})
                          :with-the-recipients-current-position-as-source (deliver "zf-d3" g/a1 {"sourceK" (g/head conn)})
                          :delivery-of-another-subject (deliver "zf-d4" g/b1 {})}]
              (observe! lbl :detail detail))))))))

;; ---- S: the removal stamp and every read route, paused after the declaration and after the commit ------------------
(defn routes [name conn pin handle]
  {:read-current #(raw name "v1" "read" {"entityIds" [g/a1]})
   :read-history #(raw name "v1" "read" {"entityIds" [g/a1] "history" true})
   :read-pinned #(raw name "v1" "read" {"entityIds" [g/a1] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
   :read-batch #(raw name "v1" "read" {"entityIds" [g/b1 g/a1]})
   :read-snapshot-handle #(raw name "v1" "read" {"entityIds" [g/a1] "handle" handle})
   :reach-pinned-session #(raw name "v2" "reach" {"root" g/a1 "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" "s-pin" "erasureRefs" true})
   :reach-current-session #(raw name "v2" "reach" {"root" g/a1 "basis" {"recordedPosition" (g/head conn) "validAt" 1.0e12} "session" "s-now" "erasureRefs" true})
   :reach-pinned-no-refs #(raw name "v2" "reach" {"root" g/a1 "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" "s-old"})
   :reach-many #(raw name "v2" "reach-many" {"roots" [g/a1 g/b1] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
   :journal #(raw name "v2" "transactions" {"after" 0 "limit" 100})
   :frontier #(raw name "v2" "erasure-frontier" nil)})
(defn look-all [name conn va pin handle holds]
  (into (sorted-map)
        (for [[k f] (routes name conn pin handle)]
          (let [r (safe f) t (:text r "")
                e (when (#{:reach-pinned-session :reach-current-session :reach-pinned-no-refs} k) (q/reach-entity (:body r) g/a1))
                hit (and e (q/hit? e))
                value (if hit (get @holds k) (str/includes? (str t) va))]
            (when (and e (not hit)) (swap! holds assoc k value))
            [k {:status (:status r) :value value :hit (boolean hit) :stamp (stamp-of r) :seq (seq-header r)}]))))
(defn s1 [boundary pause transition?]
  (when per-account?
    (scope5 (if transition? :log boundary) false
      (fn [name conn]
        (let [lbl (str "S1 every read route and its stamp, the removal paused " (clojure.core/name pause) ", "
                       (if transition? "then the move to the commit boundary" (clojure.core/name boundary)))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              pin (g/head conn) handle (get-in (offers/route name "v1" "snapshot" {}) [:body "handle"])
              holds (atom {})
              before (look-all name conn va pin handle holds)
              stopped (stop-removal! name "s1-rm" g/a1 pause)
              moved (when transition? (offers/outcome (move-commit! name)))
              between (look-all name conn va pin handle holds)
              done (offers/outcome (a/remove-attr! name "s1-rm" g/a1))
              after (look-all name conn va pin handle holds)
              leaves (fn [m] (vec (for [[k v] m :when (true? (:value v))] k)))
              committed? (or (= pause :after-native) transition?)
              detail {:stopped (offers/outcome stopped) :move moved :boundary-now (boundary-of conn)
                      :between between :acknowledged done
                      :routes-leaving-the-value-between (leaves between) :routes-leaving-the-value-after (leaves after)
                      :stamps {:before (get-in before [:frontier :stamp]) :between (get-in between [:frontier :stamp]) :after (get-in after [:frontier :stamp])}}]
          (observe! lbl :detail detail)
          (bump! :s1 (if transition? :transition boundary) pause (leaves between) (leaves after))
          (oracle! lbl (empty? (leaves after)) "after the acknowledgement no route leaves the value with its reader (TARGETS 7.1)" detail)
          (when (and committed? (or transition? (= boundary :commit)))
            (oracle! lbl (empty? (leaves between)) "commit boundary: after the commit no route leaves the value with its reader" detail)
            (oracle! lbl (not= (get-in before [:frontier :stamp]) (get-in between [:frontier :stamp]))
                     "commit boundary: the stamp has moved by the time a read follows the commit" detail)))))))

;; ---- T: in flight across the move -----------------------------------------------------------------------------------
(defn t1 [stop]
  (when per-account?
    (scope5 :log false
      (fn [name conn]
        (let [lbl (str "T1 a removal stopped " (clojure.core/name stop) " on the log's boundary, then the move")
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              stopped (stop-removal! name "t1-rm" g/a1 stop)
              moved (move-commit! name)
              detail {:stopped (offers/outcome stopped) :move (offers/outcome moved) :boundary (boundary-of conn)
                      :pending-after (some-> (privacy/pending name) (get "commandId")) :a1-masked (masked? name g/a1 va)
                      :resend (offers/outcome (a/remove-attr! name "t1-rm" g/a1)) :published (g/seq-now name conn)}]
          (observe! lbl :detail detail)
          (oracle! lbl (and (= :commit (:boundary detail)) (nil? (:pending-after detail)) (:a1-masked detail) (= 1 (:published detail)))
                   "the move completes the pending removal first, then moves" detail))))))

(defn in-submit
  "Send `frame`; when its submit runs (planned, not committed), run `f` on another thread and wait for it (at most 3 s)."
  [name op frame f]
  (let [fired (atom false) inner (atom nil) orig storage/submit!
        reply (with-redefs [storage/submit! (fn [c data request timeline & more]
                                              (when (and (= op (get request "operationId")) (compare-and-set! fired false true))
                                                (reset! inner (deref (future (f)) 3000 :waiting)))
                                              (apply orig c data request timeline more))]
                (offers/send name frame))]
    [reply @inner]))
(defn t2 []
  (when per-account?
    (scope5 :log false
      (fn [name conn]
        (scope5 :log false
          (fn [src sconn]
            (let [lbl "T2 a save, a frame and a delivery planned before the move and committed after it"
                  _ (g/seed! name [g/a1 g/b1]) _ (g/seed! src [g/a1])
                  [save moved1] (in-submit name "t2-save" (g/frame "t2-save" g/b1 (g/secret g/b1 "x") nil (g/head conn)) #(offers/outcome (move-commit! name)))
                  save-again (offers/outcome (offers/send name (g/frame "t2-save-2" g/b1 (g/secret g/b1 "y") nil (g/head conn))))]
              (scope5 :log false
                (fn [n2 c2]
                  (g/seed! n2 [g/a1 g/b1])
                  (let [fr (q/frame-copy "t2-frame" "notice:v1:t2" "x" (q/ticket n2 c2) ["b"])
                        [frame moved2] (in-submit n2 "t2-frame" fr #(offers/outcome (move-commit! n2)))
                        frame-again (offers/outcome (offers/send n2 (q/frame-copy "t2-frame-2" "notice:v1:t2b" "x" (q/ticket n2 c2) ["b"])))
                        dl (assoc (g/save-frame "t2-deliver" "notice:v1:t2d" ":notice/body" "d" nil nil)
                                  "erasureSourceDatabase" src "erasureSeq" (g/seq-now src sconn))
                        [delivery moved3] (in-submit name "t2-deliver" dl #(offers/outcome (move-commit! src)))
                        detail {:save (offers/outcome save) :move-1 moved1 :save-sent-again save-again
                                :frame-naming-an-account (offers/outcome frame) :move-2 moved2 :frame-sent-again frame-again
                                :delivery-whose-source-moves (offers/outcome delivery) :move-3 moved3
                                :boundaries [(boundary-of conn) (boundary-of c2) (boundary-of sconn)]}]
                    (observe! lbl :detail detail)
                    (oracle! lbl (= [200 nil] save-again) "a save sent again after the move is stored" detail)))))))))))

(defn t3 []
  (when per-account?
    (scope5 :log false
      (fn [name conn]
        (let [lbl "T3 a removal racing the move"
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              mv (atom nil)
              _ (reset! a/plan {:hook (let [f (atom false)] (fn [p] (when (and (= p :in-commit) (compare-and-set! f false true))
                                                                      (reset! mv (future (offers/outcome (move-commit! name)))))))})
              rm (try (offers/outcome (a/remove-attr! name "t3-rm" g/a1)) (finally (reset! a/plan nil)))
              moved (deref @mv 20000 :timeout)
              detail {:removal rm :move moved :boundary (boundary-of conn) :a1-masked (masked? name g/a1 va)
                      :pending-after (some-> (privacy/pending name) (get "commandId"))}]
          (observe! lbl :detail detail)
          (oracle! lbl (and (= [200 nil] rm) (:a1-masked detail) (nil? (:pending-after detail))) "a removal racing the move completes" detail))))))

;; ---- F5: the fuzzer, with the worker, the move, rebuild and reconcile as steps --------------------------------------
(def fuzz-boundary (keyword (or (System/getenv "ERA3_BOUNDARY") "log")))
(def restores [:none :none :pending-copy :behind])
(def steps5 [:none :none :while-pending :after])
(defn run-schedule5! [name conn run i sch move-at]
  (let [{:keys [restore rebuild reconcile worker]} sch
        sch3 (dissoc sch :restore :rebuild :reconcile :worker)
        snap-before (when (= restore :behind) (q/log-snapshot name))
        snap-pending (atom nil) outs (atom {})
        stamp0 (get (frontier name) "removalStamp")
        step! (fn [k f] (swap! outs assoc k (outcome (safe f))))
        result (with-redefs-fn {#'c/land-hook-extra
                                (fn [p]
                                  (when (= p :completer-start)
                                    (when (and (= restore :pending-copy) (privacy/pending name)) (reset! snap-pending (q/log-snapshot name)))
                                    (when (= worker :while-pending) (Thread/sleep 2) (with-worker-ms 1 #(step! :worker (fn [] (worker-pass!) {:status 200}))))
                                    (when (= rebuild :while-pending) (step! :rebuild #(q/rebuild! name {})))
                                    (when (= reconcile :while-pending) (step! :reconcile #(offers/route name "v2" "removal-log-reconcile" {})))
                                    (when (= i move-at) (step! :move #(move-commit! name)))))}
                 #(c/run-schedule3! name conn run i sch3))
        s (str "acct/h" (mod i 7) "/s" i)
        gone (:gone result)]
    (when-let [snap (case restore :pending-copy @snap-pending :behind snap-before nil)]
      (q/log-restore! name snap)
      (let [texts (str (a/read-text name s) (a/read-text name s {"history" true}) (a/read-text name (str s "-new")))]
        (bump! :f5-read-after-restore fuzz-boundary restore (outcome (safe #(offers/route name "v1" "read" {"entityIds" [s]}))))
        (oracle! (str "F5 " (pr-str sch)) (not-any? #(str/includes? texts %) (keys gone))
                 "after an older copy of the log is put back, no read answers a removed value" {:restore restore})))
    (when (= worker :after) (with-worker-ms 1 #(step! :worker (fn [] (worker-pass!) {:status 200}))))
    (when (= rebuild :after) (step! :rebuild #(q/rebuild! name {})))
    (when (= reconcile :after) (step! :reconcile #(offers/route name "v2" "removal-log-reconcile" {})))
    (when (not= :none restore) (bump! :f5-normalise restore (outcome (safe #(q/rebuild! name {})))))
    ;; the stamp: never lower than before the schedule, and moved by its removal once acknowledged
    (when-let [stamp1 (when (seq gone) (get (frontier name) "removalStamp"))]
      (oracle! (str "F5 " (pr-str sch)) (and (integer? stamp0) (integer? stamp1) (> (long stamp1) (long stamp0)))
               "the removal stamp moves with every acknowledged removal and never goes back" {:before stamp0 :after stamp1}))
    (doseq [[k v] @outs] (bump! :f5-step k v))
    (doseq [[k v] (select-keys sch [:restore :rebuild :reconcile :worker])] (bump! :dim k v))
    result))
(defn schedule5 [^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))]
    (assoc (c/schedule3 r) :restore (pick restores) :rebuild (pick steps5) :reconcile (pick steps5) :worker (pick steps5))))
(defn fuzz5 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [blk (range (quot (+ n block -1) block))]
      (scope5 (if (= fuzz-boundary :commit) :commit :log) q/sealed-fuzz?
        (fn [name conn]
          (let [lo (* blk block) hi (min n (* (inc blk) block))
                ;; on the log's boundary runs, the database moves to the commit boundary at one schedule of the block
                move-at (when (= fuzz-boundary :move) (+ lo (.nextInt r (max 1 (- hi lo)))))
                results (vec (for [i (range lo hi)]
                               (let [sch (schedule5 r)]
                                 (try (run-schedule5! name conn run i sch move-at)
                                      (catch Throwable e
                                        (reset! a/plan nil)
                                        (oracle! (str "F5 " (pr-str sch)) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))]
            (bump! :f5-block-boundary-at-end (boundary-of conn))
            (a/block-checks! name conn (str "F5 block " blk) (or gone {}) {} #{})
            (b/intent-agrees! name conn (str "F5 block " blk))
            (println "ERA3_PROGRESS" mode (pr-str {:block blk :schedules (get @c/tally [:schedules]) :violations (count @a/violations)}))))))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (may-turn-on! false) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (c/install-hooks3!)
  (real-boundary!)
  (may-turn-on! false)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "w1 w2 w3 w4 p1 p2 c1 z s t") #" "))
        bds (if per-account? boundaries [:log])]
    (when (phases "w1") (doseq [bd boundaries st [:after-intent :after-declare :after-native] k (range 10)] (guarded "W1" #(w1 bd st k))))
    (when (phases "w2") (doseq [bd boundaries] (guarded "W2" #(w2 bd))))
    (when (phases "w3") (doseq [bd boundaries p [:corrupt :wrong-seq :log-entry-altered]] (guarded "W3" #(w3 bd p))))
    (when (phases "w4") (guarded "W4" w4))
    (when (phases "p1") (doseq [s? [false true]] (guarded "P1" #(p1 s?))))
    (when (phases "p2") (doseq [s? [false true] bd boundaries] (guarded "P2" #(p2 s? bd [":v"])))
      (doseq [bd boundaries at [[":v" ":p"] [":v" ":p" ":q"]]] (guarded "P2" #(p2 false bd at))))
    (when (phases "w5") (guarded "W5" w5))
    (when (phases "c1") (doseq [bd boundaries st? [false true]] (guarded "C1" #(c1 bd st?))))
    (when (phases "z") (doseq [bd bds] (guarded "Z7a" #(z-matrix bd)) (guarded "Z7b" #(z-seen bd)) (guarded "Z7c" #(z-loop bd))
                         (guarded "Z7d" #(z-commands bd)) (guarded "Z7e" #(z-growth bd)) (guarded "Z7f" #(z-delivery bd))))
    (when (phases "s") (doseq [bd boundaries pz [:after-declare :after-native]] (guarded "S1" #(s1 bd pz false)))
      (doseq [pz [:after-declare :after-native]] (guarded "S1" #(s1 :log pz true))))
    (when (phases "t") (doseq [st [:after-intent :after-declare :after-native]] (guarded "T1" #(t1 st))) (guarded "T2" t2) (guarded "T3" t3))
    (when (phases "fuzz5")
      (fuzz5 (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
             (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1")))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY5" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) (merge-with + @tally @c/tally))))
    (println "ERA3_FAILURES" mode (pr-str (failures)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [f failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit 0)))
