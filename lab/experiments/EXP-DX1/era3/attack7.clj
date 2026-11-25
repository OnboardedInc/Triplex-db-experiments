(ns era3-attack7
  "[DX-ERA2 seventh pass, owed by the sixth review] fuzz7: the fifth review's fuzzer (fuzz5: removals stopped at every
  step, completers, late commits, log copies put back, the rebuild and reconcile routes, the worker, the move) with a
  policy event after each schedule:
    :add                an attribute added by the protection route (the union rule, X6);
    :data-restore       the stored policy set back to the one before the latest addition (else the one the previous
                        schedule saw): data restored from a backup taken before an addition, as the sixth review's A2
                        simulates it;
    :authority-restore  the removal log put back to the copy an earlier schedule saw (the authority restored alone);
    :both               both, to the same earlier schedule.
  After the event, in the window: a save of a protected value and a removal of a fresh subject (refused 503
  RemovalPolicyBehind while the stored policy lacks an attribute the log's copy lists, else answered), and a read;
  then the restore route, the rebuild route and the restore route again (the operator's steps), the removal sent again,
  and the oracles:
    P1  no attribute the protection route added is lost (the stored policy holds every one after the restore route);
    P2  the log's copy holds every attribute of the stored policy (it only grows);
    P3  while the stored policy is behind the copy, the window's save and removal are refused, typed (never 400);
    P4  the window's removal, sent again after the restore route, is acknowledged and its value is not answered;
    P5  (sealed) every key of a value no acknowledged removal selected is still present after a worker pass.
  The fifth review's own oracles run as in fuzz5, and each block ends with its block checks. Loaded after attack.clj
  to attack6.clj; era3/run.sh runs it with ERA3_MAIN=7 and ERA3_PHASES=fuzz7 (ERA3_BOUNDARY log, commit or move)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.scope :as scope]
            [triplex.gateway.removal-commit :as rc] [triplex.gateway.envelope :as envelope]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack2 :as b]
            [era3-attack3 :as c] [era3-attack4 :as q] [era3-attack5 :as f])
  (:import [java.util Random]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def events [:none :add :add :data-restore :authority-restore :both])

(defn- set-policy! [conn p]
  @(d/transact conn [[:db/add (scope/entity (d/db conn)) :triplex.scope/protection-policy (json/write-str p)]]))
(defn- copy-attrs [name] (set (some-> (privacy/record-text name "head.json") json/read-str (get "attributes"))))
(defn- stored-attrs [conn] (set (get (rc/stored-policy (d/db conn)) "attributes")))

(defn- live-keys-missing
  "Sealed values (their assertion IDs) that no acknowledged removal selected and whose key is gone."
  [name conn]
  (let [db (d/db conn)
        cut (privacy/cut name db true)
        erased (set (keys (:erased cut)))]
    (when (d/entid db :triplex.private/id)
      (vec (for [x (d/datoms db :aevt :triplex.private/id)
                 :let [id (:v x)]
                 :when (not (erased id))
                 :let [body (:v (first (d/datoms db :eavt (:e x) :triplex.private/body)))
                       handle (envelope/body-key-handle body)]
                 :when (not (envelope/key-present? name id handle))]
             id)))))

(defn policy-event! [name conn i ev earlier state]
  (let [label (str "F7 policy " (pr-str ev) " after schedule " i)
        out (case ev
              :none nil
              :add (let [_ (reset! (:before-add state) (rc/stored-policy (d/db conn)))
                         k (swap! (:k state) inc) attr (str ":p" k)
                         r (f/outcome (f/safe #(offers/route name "v2" "protection" {"attributes" (conj (vec (stored-attrs conn)) attr) "sealed" q/sealed-fuzz?})))]
                     (when (= [200 nil] r) (swap! (:added state) conj attr))
                     r)
              ;; data restored from a backup taken just before the latest addition (else before the previous schedule), so
              ;; the window where the stored policy lacks an attribute the log's copy lists is exercised often
              :data-restore (do (set-policy! conn (or @(:before-add state) (:policy earlier))) :policy-set-back)
              :authority-restore (do (q/log-restore! name (:log earlier)) :log-put-back)
              ;; both to the same earlier point: what was added after it is undone with the backup (the precondition
              ;; the restore procedure states, X10); the oracles expect the additions made before it
              :both (do (set-policy! conn (:policy earlier)) (q/log-restore! name (:log earlier))
                        (reset! (:added state) (:added earlier)) (reset! (:before-add state) nil) :both-put-back))
        behind (seq (remove (stored-attrs conn) (filter rc/valid-attribute? (copy-attrs name))))
        s (str "acct/p" (mod i 5) "/w" i) v (g/secret s "w")
        _ (offers/send name (g/frame (str "f7-seed-" i) s v nil nil))
        window-save (f/outcome (f/safe #(offers/send name (g/frame (str "f7-save-" i) (str s "-x") (g/secret s "x") nil (g/head conn)))))
        window-rm (f/outcome (f/safe #(a/remove-attr! name (str "f7-rm-" i) s)))
        window-read (f/outcome (f/safe #(offers/route name "v1" "read" {"entityIds" [s]})))
        ;; the operator's steps after a restore
        route (when (#{:data-restore :authority-restore :both} ev) (f/outcome (f/safe #(offers/route name "v2" "restore-erasure" {}))))
        rebuild (when (#{:data-restore :authority-restore :both} ev) (f/outcome (f/safe #(q/rebuild! name {}))))
        ;; the restore route again after the rebuild, after every restore: a log put back behind the data first answers
        ;; RemovalLogBehind (the rebuild catches it up), and a log whose copy is newer than the data's policy (an
        ;; authority restored to a later point than the data) leaves the policy behind until the restore route adds
        ;; the copy's attributes back (the restore procedure, page section 20)
        route2 (when (#{:data-restore :authority-restore :both} ev) (f/outcome (f/safe #(offers/route name "v2" "restore-erasure" {}))))
        rm-again (f/outcome (f/safe #(a/remove-attr! name (str "f7-rm-" i) s)))
        masked (f/masked? name s v)
        stored (stored-attrs conn) copy (copy-attrs name)
        detail {:event out :behind (vec behind) :window {:save window-save :removal window-rm :read window-read}
                :restore-route route :rebuild rebuild :restore-route-again route2 :removal-again rm-again
                :stored (vec stored) :copy (vec copy) :added (vec @(:added state))}]
    (bump! :f7 ev :behind (boolean behind) :window-save window-save :window-removal window-rm :again rm-again)
    (when (= "1" (System/getenv "ERA3_F7_TRACE"))
      (println "ERA3_F7_EVENT" mode (pr-str (assoc detail :i i :ev ev :stored-after (vec stored) :copy-after (vec copy)))))
    (oracle! label (every? stored @(:added state)) "P1 no attribute the protection route added is lost" detail)
    (oracle! label (every? copy stored) "P2 the log's copy holds every attribute of the stored policy" detail)
    (when behind
      (oracle! label (and (= 503 (first window-save)) (= 503 (first window-rm))) "P3 while the policy is behind, the save and the removal wait (typed 503)" detail))
    (oracle! label (not-any? #(= 400 (first %)) [window-save window-rm window-read]) "P3 no answer in the window is an untyped 400" detail)
    (oracle! label (and (= 200 (first rm-again)) masked) "P4 the window's removal, sent again after the restore route, is acknowledged and masks its value" detail)
    (when q/sealed-fuzz?
      (f/with-worker-ms 1 #(f/safe (fn [] (f/worker-pass!) {:status 200})))
      (let [missing (live-keys-missing name conn)]
        (oracle! label (empty? missing) "P5 no key of a value no acknowledged removal selected is deleted" {:missing (take 3 missing)})))
    {:gone (if masked {v #{s}} {})}))

(defn fuzz7 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [blk (range (quot (+ n block -1) block))]
      (f/scope5 (if (= f/fuzz-boundary :commit) :commit :log) q/sealed-fuzz?
        (fn [name conn]
          (let [lo (* blk block) hi (min n (* (inc blk) block))
                move-at (when (= f/fuzz-boundary :move) (+ lo (.nextInt r (max 1 (- hi lo)))))
                state {:k (atom (* 1000 blk)) :added (atom #{}) :before-add (atom nil)}
                earlier (atom {:policy (rc/stored-policy (d/db conn)) :log (q/log-snapshot name) :added #{}})
                results (vec (for [i (range lo hi)]
                               (let [sch (f/schedule5 r) ev (events (.nextInt r (count events)))
                                     before {:policy (rc/stored-policy (d/db conn)) :log (q/log-snapshot name) :added @(:added state)}]
                                 (try (let [res (f/run-schedule5! name conn run i sch move-at)
                                            pe (policy-event! name conn i ev @earlier state)]
                                        (reset! earlier before)
                                        (update res :gone merge (:gone pe)))
                                      (catch Throwable e
                                        (reset! a/plan nil)
                                        (oracle! (str "F7 " (pr-str sch) " " ev) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))]
            (a/block-checks! name conn (str "F7 block " blk) (or gone {}) {} #{})
            (b/intent-agrees! name conn (str "F7 block " blk))
            (println "ERA3_PROGRESS" mode (pr-str {:block blk :schedules (get @c/tally [:schedules]) :violations (count @a/violations)}))))))))

(defn main []
  (c/install-hooks3!)
  (f/real-boundary!)
  (f/may-turn-on! false)
  (when (str/includes? (or (System/getenv "ERA3_PHASES") "fuzz7") "fuzz7")
    (fuzz7 (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
           (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1"))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY7" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) (merge-with + @tally @c/tally))))
    (println "ERA3_FAILURES" mode (pr-str (f/failures)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [x failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str x)))
    (shutdown-agents)
    (System/exit 0)))
