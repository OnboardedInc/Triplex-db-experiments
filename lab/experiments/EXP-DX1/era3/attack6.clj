(ns era3-attack6
  "[DX-ERA3, sixth review] Attacks on DX-ERA2 at 03bb49cd3 (gateway code b047b22a0): the policy stored in Datomic and
  its copy in the log (an attribute added while a save is in flight, a data restore from before an addition, two
  callers adding at once, a copy that disagrees, adoption from this database's own past), the decline rule's cost and
  what removalSeen stands for, the loops of the key-shred worker, the rebuild route's repair. Loaded after
  wfix1/regression.clj, era2/gate.clj, era3/attack.clj to attack5.clj; era3/run.sh runs it with ERA3_MAIN=6.
  Review: era3/REVIEW-6.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.scope :as scope] [triplex.gateway.removal-commit :as rc]
            [triplex.gateway.envelope :as envelope] [triplex.gateway.main :as main]
            [triplex.gateway.storage :as storage]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack4 :as q] [era3-attack5 :as f])
  (:import [java.nio.file Files] [java.io StringWriter]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def boundaries [:log :commit])
(defn bname [b] (clojure.core/name b))

(defn head-copy [name] (some-> (privacy/record-text name "head.json") json/read-str (select-keys ["seq" "attributes" "sealed"])))
(defn edit-head! [name f]
  (let [h (json/read-str (privacy/record-text name "head.json"))]
    (privacy/replace! (privacy/path name "head.json") (json/write-str (f h)))))
(defn all-texts
  "Every read route's answer for `owner` (current, history, pinned at the head, journal, change feed), as one text."
  [name conn owner]
  (str/join "\n" (for [[_ r] (g/route-texts name owner (g/head conn))] (g/text (:body r)))))
(defn answered [texts values] (filterv #(and % (str/includes? texts %)) values))
(defn set-grace! [ms] (alter-var-root #'envelope/grace-ms (constantly ms)))
(defn maintain! [] (f/safe #(do (@#'envelope/maintain-keys!) :ok)))
(defn qsave [cmd owner value position] (g/save-frame cmd owner ":q" value nil position))

;; ---- A1: a save planned before an attribute's addition, committed after it --------------------------------------
(defn in-submit-wait
  "Send `frame`; when its submit runs (planned, not committed), start `f` on another thread and wait for it at most 3 s
  before the submit goes on. Returns [reply, f's result once it ends (at most 60 s), whether f ended before the submit
  went on]. (attack5's in-submit leaves f running past its 3 s; a test that reads after it then races f.)"
  [name op frame f]
  (let [fired (atom false) job (atom nil) before (atom nil) orig storage/submit!
        reply (with-redefs [storage/submit! (fn [c data request timeline & more]
                                              (when (and (= op (get request "operationId")) (compare-and-set! fired false true))
                                                (let [j (future (f))]
                                                  (reset! job j)
                                                  (reset! before (not= :waiting (deref j 3000 :waiting)))))
                                              (apply orig c data request timeline more))]
                (offers/send name frame))]
    [reply (some-> @job (deref 60000 :timeout)) @before]))
(defn a1-late-save [sealed? boundary between?]
  (when per-account?
    (f/scope5-with [":v"] sealed? boundary
      (fn [name conn]
        (let [lbl (str "A1 a save of :q planned before :q is added, committed after" (when between? ", a removal of its subject between")
                       ", " (bname boundary) (if sealed? ", sealed" ""))
              _ (g/seed! name [g/a1 g/b1])
              q0 (g/secret g/a1 "q-before") s0 (offers/outcome (offers/send name (qsave "a1-q0" g/a1 q0 nil)))
              ql (g/secret g/a1 "q-late")
              [late inner interleaved?] (in-submit-wait name "a1-q-late" (qsave "a1-q-late" g/a1 ql (g/head conn))
                                        #(do [(offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":q"] "sealed" sealed?}))
                                              (when between? (offers/outcome (a/erase! name "a1-rm-between" [{"entityId" g/a1}])))]))
              stored (rc/stored-policy (d/db conn))
              clear-late (count (g/raw-occurrences conn ql))
              qn (g/secret g/a1 "q-new") sn (offers/outcome (offers/send name (qsave "a1-q-new" g/a1 qn (g/head conn))))
              clear-new (count (g/raw-occurrences conn qn))
              rm (when-not between? (offers/outcome (a/erase! name "a1-rm-after" [{"entityId" g/a1}])))
              texts (all-texts name conn g/a1)
              must-go (if between? [q0 ql] [q0 ql qn])
              detail {:seed-q-before s0 :late-save (offers/outcome late) :addition-and-removal-while-it-was-held inner
                      :they-ended-before-the-held-save-went-on interleaved?
                      :stored-policy stored :native-copies-in-clear-of-the-late-value clear-late
                      :save-after-the-addition sn :native-copies-in-clear-of-the-new-value clear-new
                      :removal-after rm :removed-values-answered (count (answered texts must-go))
                      :which-answered (mapv #(cond (= % q0) :q-before (= % ql) :q-late :else :q-new) (answered texts must-go))}]
          (observe! lbl :detail detail)
          (bump! :a1 boundary sealed? between? :interleaved interleaved? :late (offers/outcome late) :answered (count (answered texts must-go)))
          (oracle! lbl (empty? (answered texts must-go)) "no read route answers a value its subject's acknowledged removal removed" detail)
          (when sealed? (oracle! lbl (zero? clear-new) "a value of :q saved after the addition is not stored in clear (sealed)" detail)))))))

;; ---- A2: a data restore from before an addition, and what runs before the restore route ------------------------
(def window-steps [:restore-route-first :none :removal :rebuild-route :protection-old-list])
(defn a2-restore-window [sealed? boundary step]
  (when per-account?
    (f/scope5-with [":v"] sealed? boundary
      (fn [name conn]
        (let [lbl (str "A2 data restored from before :q was added, then " (bname step) ", " (bname boundary) (if sealed? ", sealed" ""))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              q-old (g/secret g/a1 "q-old") _ (offers/send name (qsave "a2-q-old" g/a1 q-old nil))
              p-before (rc/stored-policy (d/db conn))
              add (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":q"] "sealed" sealed?}))
              q-added (g/secret g/a1 "q-added") _ (offers/send name (qsave "a2-q-added" g/a1 q-added (g/head conn)))
              copy-before-restore (head-copy name)
              ;; the data restored from a backup taken before the addition: its stored policy is the earlier one (the
              ;; builder's own simulation in gate.clj policy-sixth); the log is the newer one, its copy lists :q
              _ @(d/transact conn [[:db/add (scope/entity (d/db conn)) :triplex.scope/protection-policy (json/write-str p-before)]])
              q-window (g/secret g/a1 "q-window") sw (offers/outcome (offers/send name (qsave "a2-q-window" g/a1 q-window (g/head conn))))
              window (case step
                       :restore-route-first (offers/outcome (f/safe #(offers/route name "v2" "restore-erasure" {})))
                       :removal (offers/outcome (a/erase! name "a2-rm-a1" [{"entityId" g/a1}]))
                       :rebuild-route (offers/outcome (f/safe #(q/rebuild! name {})))
                       :protection-old-list (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v"] "sealed" sealed?}))
                       :none nil)
              copy-after-window (head-copy name)
              restore (offers/outcome (f/safe #(offers/route name "v2" "restore-erasure" {})))
              stored-after-restore (rc/stored-policy (d/db conn))
              service (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":q"] "sealed" sealed?}))
              stored-end (rc/stored-policy (d/db conn))
              rm (when (not= step :removal) (offers/outcome (a/erase! name "a2-rm-a1" [{"entityId" g/a1}])))
              texts (all-texts name conn g/a1)
              left (answered texts [va q-old q-window])
              ;; the owner asks again: a second removal of the same subject
              again (when (seq left) (offers/outcome (a/erase! name "a2-rm-a1-again" [{"entityId" g/a1}])))
              left-again (when again (answered (all-texts name conn g/a1) [va q-old q-window]))
              detail {:addition add :copy-before-the-restore copy-before-restore :save-in-the-window sw
                      :window-step window :copy-after-the-window-step copy-after-window :restore-route restore
                      :stored-after-the-restore-route stored-after-restore :service-declares-the-full-list service
                      :stored-at-the-end stored-end :removal (or rm window)
                      :answered-after-the-acknowledged-removal (mapv #(cond (= % va) :v (= % q-old) :q-old :else :q-window) left)
                      :q-added-answered (boolean (seq (answered texts [q-added])))
                      :second-removal again :answered-after-the-second (count left-again)}]
          (observe! lbl :detail detail)
          (bump! :a2 step boundary sealed? :restore-adds-q (boolean (some #{":q"} (get stored-after-restore "attributes"))) :answered (count left))
          (oracle! lbl (boolean (some #{":q"} (get stored-after-restore "attributes")))
                   "after the restore route the policy holds every attribute added before the data restore (adding is one-way)" detail)
          (oracle! lbl (empty? left) "an acknowledged removal of a1 leaves none of a1's protected values answered once the restore is complete" detail))))))

;; ---- A3: two callers adding different attributes at once ----------------------------------------------------------
(defn a3-two-adders [sealed? lock?]
  (when per-account?
    (f/scope5-with [":v"] sealed? :log
      (fn [name conn]
        (let [lbl (str "A3 two callers adding different attributes at once, " (if lock? "with the removal lock" "the lock lost") (if sealed? ", sealed" ""))
              rounds (vec (for [k (range 8)]
                            (let [have (vec (get (rc/stored-policy (d/db conn)) "attributes"))
                                  qa (str ":qa" k) qb (str ":qb" k) gate (promise)
                                  call (fn [extra] (future @gate (offers/outcome (f/safe #(offers/route name "v2" "protection" {"attributes" (conj have extra) "sealed" sealed?})))))
                                  run (fn [] (let [fa (call qa) fb (call qb)] (deliver gate true) [(deref fa 30000 :timeout) (deref fb 30000 :timeout)]))
                                  outs (if lock? (run) (with-redefs [privacy/guard (fn [_ work] (work))] (run)))
                                  stored (set (get (rc/stored-policy (d/db conn)) "attributes"))
                                  copy (set (get (head-copy name) "attributes"))
                                  ;; each refused caller sends its own list again (its retry)
                                  retries (vec (for [[o x] (map vector outs [qa qb]) :when (not= [200 nil] o)]
                                                 (offers/outcome (f/safe #(offers/route name "v2" "protection" {"attributes" (conj have x) "sealed" sealed?})))))
                                  stored2 (set (get (rc/stored-policy (d/db conn)) "attributes"))
                                  both (offers/outcome (offers/route name "v2" "protection" {"attributes" (into have [qa qb]) "sealed" sealed?}))
                                  stored3 (set (get (rc/stored-policy (d/db conn)) "attributes"))]
                              {:answers outs :retries retries :lost (vec (remove stored (set have))) :copy-equals-stored (= copy stored)
                               :union-after-the-retries (and (stored2 qa) (stored2 qb) true) :both-in-one-call both
                               :union-at-the-end (boolean (and (stored3 qa) (stored3 qb)))})))
              detail {:rounds rounds}]
          (observe! lbl :detail detail)
          (doseq [r rounds] (bump! :a3 lock? (:answers r) :retries (:retries r) :union-after-retries (boolean (:union-after-the-retries r))))
          (oracle! lbl (every? #(empty? (:lost %)) rounds) "no attribute already stored is lost" detail)
          (oracle! lbl (every? :copy-equals-stored rounds) "the log's copy equals the stored policy after each round" detail)
          (oracle! lbl (every? :union-at-the-end rounds) "both additions end up stored once a caller sends both" detail))))))

;; ---- B1: the head's copy of "sealed" set to false, and the key pass ---------------------------------------------
(defn b1-copy-sealed [boundary]
  (when per-account?
    (f/scope5-with [":v"] true boundary
      (fn [name conn]
        (let [lbl (str "B1 the log's copy of the policy says unsealed in a sealed database, " (bname boundary))
              _ (g/seed! name [g/a1 g/b1 "acct/c/one"])
              _ (set-grace! 3600000)
              ra (offers/outcome (a/remove-attr! name "b1-ra" g/a1))
              ks (q/removal-keys name "b1-ra")
              _ (edit-head! name #(assoc % "sealed" false))
              read-b1 (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              _ (set-grace! 0) _ (Thread/sleep 5)
              f0 (f/failures)
              passes1 (vec (for [_ (range 3)] (maintain!)))
              alive1 (q/keys-alive name ks)
              ;; a gateway restart: its cache and its key-pass progress gone
              _ (reset! privacy/cache {}) _ (swap! envelope/shredded dissoc name)
              passes2 (vec (for [_ (range 3)] (maintain!)))
              alive2 (q/keys-alive name ks)
              copy-before-next (head-copy name)
              ;; the next removal rewrites the copy from the stored policy
              rc1 (offers/outcome (a/remove-attr! name "b1-rc" "acct/c/one"))
              copy-after-next (head-copy name)
              passes3 (vec (for [_ (range 2)] (maintain!)))
              alive3 (q/keys-alive name ks)
              f1 (f/failures)
              detail {:removal ra :keys ks :read-with-the-copy-unsealed read-b1 :keys-alive-after-3-passes alive1
                      :keys-alive-after-a-restart-and-3-passes alive2 :copy-before-the-next-removal copy-before-next
                      :next-removal rc1 :copy-after-it copy-after-next :keys-alive-after-2-more-passes alive3
                      :failures-counted (into (sorted-map) (for [[k v] f1 :let [dd (- v (get f0 k 0))] :when (pos? dd)] [k dd]))}]
          (observe! lbl :detail detail)
          (bump! :b1 boundary alive1 alive2 alive3)
          (oracle! lbl (zero? alive1) "a published removal's keys are deleted once its grace ends, whatever the log's copy of the policy says" detail)
          (oracle! lbl (zero? alive2) "and after a gateway restart" detail))))))

;; ---- B2: the head's copy of the attributes changed by hand (wider, narrower) -------------------------------------
(defn b2-copy-attributes [kind]
  (when per-account?
    (f/scope5-with [":v" ":p"] false :log
      (fn [name conn]
        (let [lbl (str "B2 the log's copy of the attributes changed by hand: " (bname kind))
              seeds (g/seed! name [g/a1 g/b1])
              pv (g/secret g/a1 "p") _ (offers/send name (g/save-frame "b2-a1-p" g/a1 ":p" pv nil nil))
              _ (edit-head! name #(assoc % "attributes" (case kind :wider-benign [":v" ":p" ":z"] :wider-journal [":v" ":p" ":_tx/position"] :narrower [":v"])))
              _ (reset! privacy/cache {})
              read (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              restore (offers/outcome (f/safe #(offers/route name "v2" "restore-erasure" {})))
              stored (rc/stored-policy (d/db conn))
              save (offers/outcome (offers/send name (g/frame "b2-save" g/b1 (g/secret g/b1 "x") nil (g/head conn))))
              rm (offers/outcome (a/erase! name "b2-rm-a1" [{"entityId" g/a1}]))
              p-answered (boolean (seq (answered (all-texts name conn g/a1) [pv])))
              save2 (offers/outcome (offers/send name (g/frame "b2-save-2" "acct/c/one" (g/secret "acct/c/one" "x") nil (g/head conn))))
              protect (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":p"] "sealed" false}))
              detail {:read read :restore-route restore :stored-after stored :save-after save :removal-of-a1 rm
                      :a1-p-answered-after-its-removal p-answered :another-save save2 :protection-with-the-real-list protect
                      :copy-at-the-end (head-copy name)}]
          (observe! lbl :detail detail)
          (bump! :b2 kind :stored (get stored "attributes") :save save :protect protect)
          (oracle! lbl (not p-answered) "a removal of a1 removes its :p value" detail)
          (oracle! lbl (= (set (get stored "attributes")) #{":v" ":p"}) "the stored policy takes nothing from a hand-edited copy of the log" detail)
          (oracle! lbl (= [200 nil] save2) "saves keep working" detail))))))

;; ---- C: adoption from a head of this database's own past --------------------------------------------------------
(defn c-adopt-own-past [sealed? which]
  (when per-account?
    (f/scope-earlier-move [":v" ":p"] sealed?
      (fn [name conn]
        (let [lbl (str "C adoption from this database's own earlier head (" (bname which) ")" (if sealed? ", sealed" ""))
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one"])
              head0 (privacy/record-text name "head.json")
              r1 (offers/outcome (a/remove-attr! name "c-r1" g/a1))
              head1 (privacy/record-text name "head.json") e1 (privacy/record-text name "erase-1.json")
              r2 (offers/outcome (a/remove-attr! name "c-r2" g/b1))
              ;; an earlier build's database: no policy stored (the removals above adopted it; take it out again)
              db (d/db conn)
              _ @(d/transact conn [[:db/retract (scope/entity db) :triplex.scope/protection-policy (scope/value db (scope/entity db) :triplex.scope/protection-policy)]])
              _ (q/log-delete! name)
              _ (case which
                  :seq0 (privacy/replace! (privacy/path name "head.json") head0)
                  :seq1 (do (privacy/replace! (privacy/path name "erase-1.json") e1) (privacy/replace! (privacy/path name "head.json") head1)))
              _ (reset! privacy/cache {})
              rebuild (offers/outcome (f/safe #(q/rebuild! name {})))
              stored (rc/stored-policy (d/db conn))
              rm (offers/outcome (a/remove-attr! name "c-r3" "acct/c/one"))
              masked (mapv #(f/masked? name % (:value (seeds %))) [g/a1 g/b1 "acct/c/one"])
              detail {:removals [r1 r2] :rebuild rebuild :stored stored :seq (g/seq-now name conn) :removal-after rm :masked masked}]
          (observe! lbl :detail detail)
          (oracle! lbl (and (= [200 nil] rebuild) (= #{":v" ":p"} (set (get stored "attributes"))) (= [200 nil] rm) (every? true? masked))
                   "an own earlier head is adopted with its policy, the log caught up, every removed value masked" detail))))))

;; ---- D: what a save that says nothing costs, and what removalSeen stands for ----------------------------------------
(defn median [xs] (let [s (vec (sort xs))] (when (seq s) (s (quot (count s) 2)))))
(defn d-cost [n]
  (f/scope5 :log false
    (fn [name conn]
      (let [lbl (str "D1 a save that says nothing, " n " removals in the database")
            owners (vec (for [k (range n)] (str "acct/k" (mod k 40) "/s" k)))
            t0 (System/nanoTime)
            _ (doseq [o owners] (offers/send name (g/frame (str "dc-seed-" o) o (g/secret o "s") nil nil)) (a/remove-attr! name (str "dc-rm-" o) o))
            setup-s (/ (- (System/nanoTime) t0) 1.0e9)
            _ (g/seed! name [g/a1])
            _ (a/remove-attr! name "dc-ra" g/a1)
            stamp (get (f/frontier name) "removalStamp")
            fresh (fn [k] (str "acct/z" k "/one"))
            time-of (fn [input] (let [t (System/nanoTime) r (offers/send name input)] [(offers/outcome r) (/ (- (System/nanoTime) t) 1.0e3)]))
            unframed (vec (for [k (range 30)] (time-of (f/sourceless (str "dc-u-" k) (fresh k) ":v" (g/secret (fresh k) "u")))))
            framed (vec (for [k (range 30)] (time-of (assoc (f/sourceless (str "dc-f-" k) (fresh (+ 100 k)) ":v" (g/secret (fresh (+ 100 k)) "f")) "removalSeen" stamp))))
            db (erase/sync! conn)
            rule-us (vec (for [k (range 30)] (let [in (f/sourceless (str "dc-r-" k) (fresh (+ 200 k)) ":v" "x") t (System/nanoTime)]
                                               (rc/removal-after-source name db in) (/ (- (System/nanoTime) t) 1.0e3))))
            out (StringWriter.)
            declined (binding [*out* out] (frequencies (for [k (range 50)] (offers/outcome (offers/send name (f/sourceless (str "dc-d-" k) g/a1 ":v" (g/secret g/a1 (str k))))))))
            lines (count (re-seq #"triplex.removal-declined-save.v1" (str out)))
            detail {:removals (inc n) :setup-s setup-s :unframed-save-us-median (median (map second unframed)) :unframed-answers (frequencies (map first unframed))
                    :framed-save-us-median (median (map second framed)) :framed-answers (frequencies (map first framed))
                    :decline-rule-alone-us-median (median rule-us) :declined-50 declined :log-lines-for-50-refusals lines}]
        (observe! lbl :detail detail)
        (bump! :d1 n :rule-us (long (median rule-us)))))))

(defn d-other [boundary other]
  (f/scope5 boundary false
    (fn [name conn]
      (let [lbl (str "D2 a stamp learned from an answer about " (bname other) " lifts the rule for a removed subject, " (bname boundary))
            seeds (g/seed! name [g/a1 g/b1 "acct/a/two"]) va (:value (seeds g/a1))
            r0 (f/raw name "v1" "read" {"entityIds" [g/a1]})
            held (or (f/stamp-of r0) (f/seq-header r0) 0)
            rm (offers/outcome (a/remove-attr! name "d2-ra" g/a1))
            with-held (f/outcome (f/raw name "v1" "transact" (assoc (f/sourceless "d2-held" g/a1 ":v" va) "removalSeen" held)))
            r1 (f/raw name "v1" "read" {"entityIds" [(case other :another-subject "acct/a/two" :another-account g/b1)]})
            learned (or (f/stamp-of r1) (f/seq-header r1))
            resave (f/outcome (f/raw name "v1" "transact" (assoc (f/sourceless "d2-resave" g/a1 ":v" va) "removalSeen" learned)))
            back (not (f/masked? name g/a1 va))
            detail {:stamp-held-when-a1-was-read held :removal rm :resave-with-that-stamp with-held
                    :stamp-from-the-other-answer learned :resave-of-the-removed-value-with-it resave :removed-value-answered-again back}]
        (observe! lbl :detail detail)
        (bump! :d2 boundary other with-held resave back)))))

;; ---- G: one database's failure in the key-shred worker's loops -----------------------------------------------------
(defn g1-scopes [poison]
  (f/scope5 :log true
    (fn [p pconn]
      (f/scope5 :log true
        (fn [qn qconn]
          (let [lbl (str "G1 one database's head.json " (bname poison) ", beside a database with due keys and a stale removal, " mode)
                _ (g/seed! p [g/a1]) _ (g/seed! qn [g/a1 g/b1])
                _ (set-grace! 3600000)
                _ (a/remove-attr! p "g1-p-r1" g/a1)
                r1 (offers/outcome (a/remove-attr! qn "g1-q-r1" g/a1)) ks (q/removal-keys qn "g1-q-r1")
                stale (when per-account? (offers/outcome (f/stop-removal! qn "g1-q-r2" g/b1 :after-intent)))
                original (privacy/record-text p "head.json")
                _ (privacy/replace! (privacy/path p "head.json")
                                    (case poison :cut-short (subs original 0 (quot (count original) 2))
                                                 :no-database (json/write-str (dissoc (json/read-str original) "database"))
                                                 :an-array "[]"))
                _ (reset! privacy/cache {})
                _ (set-grace! 0) _ (Thread/sleep 5)
                f0 (f/failures)
                passes (f/with-worker-ms 1 #(vec (for [_ (range 3)] (maintain!))))
                alive (q/keys-alive qn ks)
                pending (some-> (privacy/pending qn) (get "commandId"))
                f1 (f/failures)
                read-q (offers/outcome (offers/route qn "v1" "read" {"entityIds" [g/b1]}))
                _ (privacy/replace! (privacy/path p "head.json") original) _ (reset! privacy/cache {})
                passes-after (f/with-worker-ms 1 #(vec (for [_ (range 2)] (maintain!))))
                detail {:q-removal r1 :q-stale-removal stale :passes passes :q-keys-alive alive :q-pending-after pending
                        :failures-counted (into (sorted-map) (for [[k v] f1 :let [dd (- v (get f0 k 0))] :when (pos? dd)] [k dd]))
                        :q-read read-q :after-the-file-is-put-back {:passes passes-after :q-keys-alive (q/keys-alive qn ks)
                                                                    :q-pending (some-> (privacy/pending qn) (get "commandId"))}}]
            (observe! lbl :detail detail)
            (bump! :g1 mode poison :alive alive :pending (some? pending))
            (oracle! lbl (zero? alive) "one database's damaged log does not stop another database's key deletion" detail)
            (when per-account? (oracle! lbl (nil? pending) "nor the completion of its stale removal" detail))))))))

(defn g2-retire-live []
  (when per-account?
    (f/scope5 :log true
      (fn [name conn]
        (let [lbl "G2 a database absent from the catalog while one of its removals is stale (deleted to be restored)"
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one"])
              live (mapv #(:id (seeds %)) [g/b1 "acct/c/one"])
              stopped (offers/outcome (f/stop-removal! name "g2-rm" g/a1 :after-intent))
              alive-before (q/keys-alive name live)
              uri (main/db-uri name)
              _ (d/delete-database uri)
              _ (Thread/sleep 5)
              passes (f/with-worker-ms 1 #(vec (for [_ (range 2)] (maintain!))))
              alive-after (q/keys-alive name live)
              log-left (some? (privacy/record-text name "head.json"))
              detail {:stopped stopped :keys-of-live-values-before alive-before :passes passes
                      :keys-of-live-values-after alive-after :log-left log-left}]
          (observe! lbl :detail detail)
          (bump! :g2 alive-before alive-after)
          (oracle! lbl (= alive-before alive-after) "the worker never deletes the keys of values no removal selected" detail))))))

;; ---- F: the rebuild route's repair, called by anyone while a removal is held --------------------------------------
(defn f-steer [boundary stop]
  (when per-account?
    (f/scope5 boundary false
      (fn [name conn]
        (let [lbl (str "F the rebuild route's repair steered: a torn intent of a removal stopped " (bname stop) ", callers in a loop, " (bname boundary))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1)) vb (:value (seeds g/b1))
              stopped (offers/outcome (f/stop-removal! name "f-rm" g/a1 stop))
              _ (privacy/replace! (privacy/path name "pending.json") "{\"seq\": 1, \"commandId\": \"f-rm\", \"sel")
              _ (reset! privacy/cache {})
              probe (fn [r] [(:status r) (get-in r [:body "code"]) (some-> (get-in r [:body "message"]) str (subs 0 (min 160 (count (str (get-in r [:body "message"]))))))])
              torn {:resend (probe (f/safe #(a/remove-attr! name "f-rm" g/a1)))
                    :another-removal (probe (f/safe #(a/remove-attr! name "f-rm-other" "acct/d/one")))
                    :read (probe (f/safe #(offers/route name "v1" "read" {"entityIds" [g/b1]})))
                    :save (probe (f/safe #(offers/send name (g/frame "f-save" "acct/c/one" (g/secret "acct/c/one" "x") nil (g/head conn)))))}
              bodies (vec (for [b [{"commandId" "f-rm"} {"seq" 1} {"policy" {"attributes" [":v"]}}]] (offers/outcome (f/safe #(q/rebuild! name b)))))
              calls (atom {})
              hammer (fn [] (future (dotimes [_ 15] (let [r (offers/outcome (f/safe #(q/rebuild! name {})))] (swap! calls update r (fnil inc 0))))))
              hs (vec (repeatedly 3 hammer))
              resend (offers/outcome (a/remove-attr! name "f-rm" g/a1))
              _ (doseq [h hs] (deref h 60000 nil))
              resend2 (offers/outcome (a/remove-attr! name "f-rm" g/a1))
              detail {:stopped stopped :while-the-intent-is-torn torn :non-empty-bodies bodies :route-calls @calls :resend resend :resend-again resend2
                      :native-commits-of-the-command (f/command-entries name conn "f-rm") :pending-after (some-> (privacy/pending name) (get "commandId"))
                      :a1-masked (f/masked? name g/a1 va) :b1-kept (not (f/masked? name g/b1 vb)) :seq (g/seq-now name conn)}]
          (observe! lbl :detail detail)
          (bump! :f boundary stop resend resend2)
          (oracle! lbl (every? #(= 400 (first %)) bodies) "the rebuild route takes nothing from its request" detail)
          (oracle! lbl (every? #(not= 400 (first %)) (vals torn)) "storage damage is answered with the typed 503 of state 11, never 400" detail)
          (oracle! lbl (and (= 1 (:native-commits-of-the-command detail)) (nil? (:pending-after detail)) (:a1-masked detail) (:b1-kept detail))
                   "the removal is applied exactly once, as first asked, whoever calls the route" detail))))))

;; ---- request bodies for the stack (stack6.sh) ---------------------------------------------------------------------
(defn bodies6 []
  (let [dir (java.io.File. "/out/bodies") _ (.mkdirs dir)
        put (fn [n x] (spit (java.io.File. dir ^String n) (json/write-str x)))
        subjects {"a1" "acct/a/one" "a2" "acct/a/two" "b1" "acct/b/one" "c1" "acct/c/one"}
        values (into {} (concat (for [[k e] subjects] [k (g/secret e "stack6-v")])
                                (for [[k e] subjects] [(str k ":q") (g/secret e "stack6-q")])
                                (for [[k e] subjects j (range 4)] [(str k ":q" j) (g/secret e (str "stack6-q" j))])))]
    (doseq [[k e] subjects]
      (put (str "seed-" k ".json") (g/frame (str "st6-seed-" k) e (values k) nil nil))
      (put (str "seedq-" k ".json") (qsave (str "st6-seedq-" k) e (values (str k ":q")) nil))
      (doseq [j (range 4)] (put (str "saveq-" k "-" j ".json") (qsave (str "st6-saveq-" k "-" j) e (values (str k ":q" j)) nil))))
    (doseq [k (range 10)] (put (str "save-b1-" k ".json") (g/save-frame (str "st6-sb-" k) "acct/b/one" ":w" (str "w-" k) nil nil)))
    (put "values.json" values) (put "subjects.json" subjects)
    (println "ERA3_BODIES6" (count (.list dir)))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (f/may-turn-on! false) (set-grace! 0)
                                         (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  ((requiring-resolve 'era3-attack3/install-hooks3!))
  (f/real-boundary!)
  (f/may-turn-on! false)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "a1 a2 a3 b1 b2 c d g1 g2 f") #" "))]
    (when (phases "bodies6") (bodies6))
    (when (phases "a1") (doseq [s? [false true] bd boundaries btw? [false true]] (guarded "A1" #(a1-late-save s? bd btw?))))
    (when (phases "a2") (doseq [s? [false true] bd boundaries st window-steps] (guarded "A2" #(a2-restore-window s? bd st))))
    (when (phases "a3") (doseq [s? [false true] lock? [true false]] (guarded "A3" #(a3-two-adders s? lock?))))
    (when (phases "b1") (doseq [bd boundaries] (guarded "B1" #(b1-copy-sealed bd))))
    (when (phases "b2") (doseq [k [:wider-benign :wider-journal :narrower]] (guarded "B2" #(b2-copy-attributes k))))
    (when (phases "c") (doseq [s? [false true] w [:seq0 :seq1]] (guarded "C" #(c-adopt-own-past s? w))))
    (when (phases "d") (doseq [n (if-let [ns (System/getenv "ERA3_D_NS")] (map #(Long/parseLong %) (str/split ns #" ")) [0 300 1200])] (guarded "D1" #(d-cost n)))
      (doseq [bd (if per-account? boundaries [:log]) o [:another-subject :another-account]] (guarded "D2" #(d-other bd o))))
    (when (phases "g1") (doseq [p [:cut-short :no-database :an-array]] (guarded "G1" #(g1-scopes p))))
    (when (phases "g2") (guarded "G2" g2-retire-live))
    (when (phases "f") (doseq [bd boundaries st [:after-declare :after-native]] (guarded "F" #(f-steer bd st)))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY6" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_FAILURES" mode (pr-str (f/failures)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [x failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str x)))
    (shutdown-agents)
    (System/exit 0)))
