(ns era3-attack
  "[DX-ERA3] Adversarial review of removal on request guarded per account (DX-ERA2 at 6bc2484f0). In-process: the
  gateway's own route handler, an in-memory Datomic, a file removal authority held to the PostgreSQL authority's rule
  (only an entry equal to the stored intent is published). Loaded after wfix1/regression.clj and era2/gate.clj (whose
  helpers it reuses, so a leak here is a leak by the builder's own definition); era3/run.sh runs it.
  Deterministic cases D1 to D5, then the schedule fuzzer F. The review is era3/REVIEW.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.storage :as storage]
            [triplex.gateway.main :as main] [triplex.gateway.removal-commit :as rc]
            [wfix1-regression :as offers] [era2-gate :as g])
  (:import [java.util Random UUID]))

(declare counters-agree!)
(def mode g/mode)
(def subject? g/subject?)
(def per-account? g/per-account?)

;; ---- results ---------------------------------------------------------------------------------------------------
;; oracle!: a break condition (the value survives or reappears, a removal cannot finish, an unrelated save is refused).
;; observe!: what happened, for the review's tables. Neither throws.
(def violations (atom []))
(def oracles (atom 0))
(defn oracle! [label ok message & [detail]]
  (swap! oracles inc)
  (when-not ok
    (swap! violations conj {:case label :message message :detail detail})
    (println "ERA3_VIOLATION" mode (pr-str {:case label :message message :detail detail}))))
(defn observe! [label k v] (println "ERA3_OBS" mode (pr-str [label k v])))

;; ---- hooks, installed once: every step of a removal can run a schedule's action or stop the gateway there -------
(def plan (atom nil))
(def held-ops (atom {}))
(defn- point! [p] (when-let [h (:hook @plan)] (h p)))
(defn- stop? [step]
  (let [p @plan]
    (when (and p (= step (:stop p)) (pos? (long (:stops-left p 0))))
      (swap! plan update :stops-left dec)
      true)))
(defn- stop! [step] (when (stop? step) (throw (ex-info (str "ERA3 gateway stopped " (name step)) {}))))

(defn install-hooks! []
  (let [apply-native erase/apply-native! commit rc/commit! hold rc/hold! publish privacy/publish!
        prepare privacy/prepare! submit storage/submit!]
    (alter-var-root #'storage/submit!
      (fn [_] (fn [& args]
                (let [op (get (nth args 2) "operationId")]
                  (when-let [[entered release] (get @held-ops op)]
                    (deliver entered true)
                    (deref release 15000 nil)))
                (apply submit args))))
    (alter-var-root #'privacy/prepare! (fn [_] (fn [nm e] (prepare nm e) (point! :after-intent))))
    (alter-var-root #'erase/apply-native!
      (fn [_] (fn [c v e]
                (point! :in-commit) (stop! :before-native)
                (let [t (apply-native c v e)] (point! :after-native) (stop! :after-native) t))))
    (alter-var-root #'rc/commit!
      (fn [_] (fn [c v cur e h]
                (point! :in-commit) (stop! :before-native)
                (let [r (commit c v cur e h)] (point! :after-native) (stop! :after-native) r))))
    (alter-var-root #'rc/hold! (fn [_] (fn [c es s] (let [r (hold c es s)] (point! :after-hold) (stop! :after-guard) r))))
    ;; the PostgreSQL authority's rule, as era2/gate.clj holds the file authority to it
    (alter-var-root #'privacy/publish!
      (fn [_] (fn [name current item]
                (point! :at-publish) (stop! :at-publish)
                (when-not (= (privacy/pending name) item)
                  (throw (ex-info "Removal intent missing before publication" {:pending (privacy/pending name) :item item})))
                (publish name current item))))))

(defn start-held!
  "Send `input` on its own thread; it pauses after its cut was read and its data prepared (just before Datomic)."
  [name input]
  (let [op (get input "operationId") entered (promise) release (promise)]
    (swap! held-ops assoc op [entered release])
    (let [reply (future (offers/send name input))]
      (loop [k 0]
        (cond (realized? entered) {:op op :release release :reply reply}
              (or (future-done? reply) (> k 500))
              (do (swap! held-ops dissoc op) {:op op :release release :reply reply :unheld true})
              :else (do (Thread/sleep 5) (recur (inc k))))))))
(defn release-held! [{:keys [op release reply]}]
  (swap! held-ops dissoc op)
  (deliver release true)
  (deref reply 15000 {:status 0 :body {"code" "timeout"}}))

;; ---- small helpers ---------------------------------------------------------------------------------------------
(defn operation-id [command] (str "privacy-" (privacy/sha256 command)))
(defn position-of [conn command]
  (let [db (d/db conn)]
    (some-> (d/entid db [:triplex.claim/command-id command])
            (as-> c (:triplex.claim/tx (d/entity db c)))
            (as-> t (:triplex.tx/position t)))))
(defn read-text [name entity & [q]] (g/text (:body (offers/route name "v1" "read" (merge {"entityIds" [entity]} q)))))
(defn erase! [name command selectors] (offers/route name "v2" "erase" {"commandId" command "selectors" selectors}))
(defn remove-attr! [name command & owners]
  (erase! name command (mapv (fn [o] {"entityId" o "attribute" ":v"}) owners)))
(defn frontier [name] (:body (offers/route name "v2" "erasure-frontier" nil)))
(defn copy-frame
  "A settlement- or Publish-shaped derived write: a document outside every account prefix copying `value`, under a
  ticket read at `ticket`, naming `accounts` (nil: the database-wide ticket every real caller on this branch sends)."
  [command owner value ticket accounts]
  (cond-> (assoc (g/save-frame command owner ":notice/body" (str "derived:" value) nil nil) "erasureSeq" ticket)
    accounts (assoc "erasureAccounts" accounts)))
(defn native-committed? [conn command]
  (some? (d/entid (erase/sync! conn) [:triplex.tx/operation-id (operation-id command)])))
(defn removal-position [conn command]
  (let [db (d/db conn) tx (d/entid db [:triplex.tx/operation-id (operation-id command)])]
    (when tx (:v (first (d/datoms db :eavt tx :triplex.tx/position))))))
(defn wait-until [ms f] (loop [k 0] (cond (f) true (> (* k 20) ms) false :else (do (Thread/sleep 20) (recur (inc k))))))

;; ---- D1: a derived write whose ticket was read before a removal, sent while that removal is stopped -------------
(defn d1
  "Stopped at `step` by a gateway stop (an exception at that step, as era2/gate.clj stops it), then a settlement frame
  with a database-wide ticket and one naming the account, both read before the removal; then the removal is resumed."
  [sealed? step]
  (g/fresh-scope sealed?
    (fn [name conn]
      (let [lbl (str "D1 stop=" (clojure.core/name step) (if sealed? " sealed" " unsealed"))
            seeds (g/seed! name [g/a1 g/a2 g/b1]) value (:value (seeds g/a1)) pin (g/head conn)
            before (g/raw-occurrences conn value)
            ticket (g/seq-now name conn)
            fired (atom false)
            ;; after-guard needs one real failed try first: a save of the subject lands inside the removal's first try
            race (when (= step :after-guard) (g/frame "d1-race" g/a1 (g/secret g/a1 "race") (:id (seeds g/a1)) pin))
            _ (reset! plan {:stop step :stops-left 1
                            :hook (fn [p] (when (and race (= p :in-commit) (compare-and-set! fired false true))
                                            (offers/send name race)))})
            stopped (with-redefs-fn {#'rc/narrow-tries (if (= step :after-guard) 1 rc/narrow-tries)}
                      #(remove-attr! name "rm-d1" g/a1))
            _ (reset! plan nil)
            committed-natively (native-committed? conn "rm-d1")
            seen (frontier name)
            w-any (offers/send name (copy-frame "d1-any" "notice:v1:era3-any" value ticket nil))
            w-acct (offers/send name (copy-frame "d1-acct" "notice:v1:era3-acct" value ticket ["a"]))
            ;; a frame of ANOTHER account (b) under a ticket read before the removal: per account it must commit
            w-other (offers/send name (assoc (g/save-frame "d1-other" "notice:v1:era3-b" ":notice/body" (g/secret g/b1 "n") nil nil)
                                             "erasureSeq" ticket "erasureAccounts" ["b"]))
            done (remove-attr! name "rm-d1" g/a1)
            p-removal (get-in done [:body "position"])
            p-any (position-of conn "d1-any") p-acct (position-of conn "d1-acct")
            visible-any (str/includes? (read-text name "notice:v1:era3-any") value)
            visible-acct (str/includes? (read-text name "notice:v1:era3-acct") value)
            detail {:stopped (offers/outcome stopped) :natively-committed-while-stopped committed-natively
                    :frontier-while-stopped (select-keys seen ["seq" "perAccount" "unscopedSeq"]) :ticket ticket
                    :database-wide-ticket-frame (offers/outcome w-any) :account-ticket-frame (offers/outcome w-acct)
                    :other-account-frame (offers/outcome w-other)
                    :resumed (offers/outcome done) :removal-position p-removal
                    :database-wide-frame-position p-any :account-frame-position p-acct
                    :copy-readable-after-ack {:database-wide visible-any :account visible-acct}}]
        (observe! lbl :detail detail)
        (oracle! lbl (= [200 nil] (offers/outcome done)) "the resumed removal completes" detail)
        (when per-account?
          (oracle! lbl (= [200 nil] (offers/outcome w-other)) "a frame of another account commits while the removal is pending" detail))
        (oracle! lbl (not visible-any)
                 "a derived copy whose ticket was read before the removal is not readable after the removal is acknowledged (database-wide ticket)"
                 detail)
        (oracle! lbl (not (and p-any p-removal (> p-any p-removal)))
                 "no derived write with a ticket older than the removal lands after the removal's position (database-wide ticket)"
                 detail)
        (oracle! lbl (not visible-acct) "the same for a ticket naming the account" detail)
        (oracle! lbl (not (and p-acct p-removal (> p-acct p-removal)))
                 "the same for a ticket naming the account (log order)" detail)
        ;; the builder's own leak check (route answers for a1, and no native copy outside a1 and journals)
        (g/removed-everywhere! lbl name conn g/a1 value before pin)))))

(defn d1-timeout
  "The same window with no gateway stop and no code changed: the removal's native commit takes longer than the
  gateway's 5-second wait (a slow transactor queue, modelled by one 6.5 s transaction queued just before the commit).
  The removal answers 503 and its commit lands afterwards: natively committed, intent pending, lock released."
  [ticket-accounts]
  (g/fresh-scope false
    (fn [name conn]
      (let [lbl (str "D1-timeout accounts=" (pr-str ticket-accounts))
            seeds (g/seed! name [g/a1 g/a2 g/b1]) value (:value (seeds g/a1)) pin (g/head conn)
            before (g/raw-occurrences conn value)
            _ @(d/transact conn [{:db/ident :era3/sleep
                                  :db/fn (d/function {:lang :clojure :params '[db ms] :code '(do (Thread/sleep ms) [])})}])
            ;; warm the removal path once (the commit function's first-use install would otherwise be the timed-out step)
            _ (remove-attr! name "rm-warm" g/a2)
            ticket (g/seq-now name conn)
            fired (atom false)
            _ (reset! plan {:hook (fn [p] (when (and (= p :after-intent) (compare-and-set! fired false true))
                                            (d/transact-async conn [[:era3/sleep 6500]])
                                            (Thread/sleep 100)))})
            started (System/nanoTime)
            first-reply (remove-attr! name "rm-t" g/a1)
            ms (/ (- (System/nanoTime) started) 1.0e6)
            _ (reset! plan nil)
            landed (wait-until 15000 #(native-committed? conn "rm-t"))
            pending (some? (privacy/pending name))
            readable-while-pending (str/includes? (read-text name g/a1) value)
            own-save (offers/send name (g/frame "t-own" g/a1 (g/secret g/a1 "own") (:id (seeds g/a1)) (g/head conn)))
            w (offers/send name (copy-frame "t-frame" "notice:v1:era3-t" value ticket ticket-accounts))
            done (remove-attr! name "rm-t" g/a1)
            p-removal (get-in done [:body "position"]) p-frame (position-of conn "t-frame")
            visible (str/includes? (read-text name "notice:v1:era3-t") value)
            detail {:first-reply (offers/outcome first-reply) :first-reply-ms (Math/round (double ms))
                    :native-commit-landed-after-reply landed :intent-pending pending
                    :value-readable-while-pending readable-while-pending :subject-save-while-pending (offers/outcome own-save)
                    :frame (offers/outcome w) :resumed (offers/outcome done) :removal-position p-removal :frame-position p-frame
                    :copy-readable-after-ack visible}]
        (observe! lbl :detail detail)
        (oracle! lbl (not visible) "a derived copy whose ticket was read before the removal is not readable after its acknowledgement" detail)
        (oracle! lbl (not (and p-frame p-removal (> p-frame p-removal))) "no older-ticket derived write after the removal's position" detail)
        (g/removed-everywhere! lbl name conn g/a1 value before pin)))))

;; ---- D2: a removal committed by the subject-check path, resumed by a gateway without that option -------------------
(defn d2 []
  (when subject?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "D2 mixed: subject-check commit, resumed without the subject check"
              seeds (g/seed! name [g/a1 g/a2 g/b1]) value (:value (seeds g/a1))
              fired (atom false)
              ;; another account commits inside the removal's window, so its committed position is not the provisional one
              other (g/frame "d2-other" g/b1 (g/secret g/b1 "o") (:id (seeds g/b1)) (g/head conn))
              _ (reset! plan {:stop :after-native :stops-left 1
                              :hook (fn [p] (when (and (= p :in-commit) (compare-and-set! fired false true)) (offers/send name other)))})
              stopped (remove-attr! name "rm-d2" g/a1)
              _ (reset! plan nil)
              intent (privacy/pending name)
              native-pos (removal-position conn "rm-d2")
              old (vec (for [_ (range 10)] (offers/outcome (with-redefs-fn {#'erase/subject-check false} #(remove-attr! name "rm-d2" g/a1)))))
              readable (str/includes? (read-text name g/a1) value)
              blocked (offers/outcome (remove-attr! name "rm-d2-b" g/b1))
              done (remove-attr! name "rm-d2" g/a1)
              after (offers/outcome (remove-attr! name "rm-d2-b" g/b1))
              detail {:stopped (offers/outcome stopped) :intent-position (get intent "position") :native-position native-pos
                      :resumes-without-subject-check (frequencies old) :value-readable-meanwhile readable
                      :another-removal-meanwhile blocked :resumed-with-subject-check (offers/outcome done)
                      :another-removal-after after}]
          (observe! lbl :detail detail)
          (oracle! lbl (some #(= [200 nil] %) old)
                   "a pending removal can be completed by any gateway of the fleet (here: one without the subject check)" detail)
          (oracle! lbl (= [200 nil] (offers/outcome done)) "it completes on a gateway with the option" detail))))))

;; ---- D3: a gateway without TX2_REMOVAL_PER_ACCOUNT on a moved database -------------------------------------------
(defn d3 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "D3 a gateway without the per-account option on a moved database"
              seeds (g/seed! name [g/a1 g/a2 g/b1])
              without (fn [f] (with-redefs-fn {#'rs/enabled false #'erase/subject-check false}
                                (fn [] (reset! privacy/cache {}) (try (f) (finally (reset! privacy/cache {}))))))
              r-read (without #(offers/route name "v1" "read" {"entityIds" [g/b1]}))
              r-save (without #(offers/send name (g/frame "d3-save" g/b1 (g/secret g/b1 "s") (:id (seeds g/b1)) (g/head conn))))
              r-remove (without #(remove-attr! name "rm-d3" g/b1))
              intent (privacy/pending name)
              other (offers/outcome (remove-attr! name "rm-d3-a" g/a1))
              resumed (offers/outcome (remove-attr! name "rm-d3" g/b1))
              other-after (offers/outcome (remove-attr! name "rm-d3-a" g/a1))
              detail {:read (offers/outcome r-read) :save (offers/outcome r-save) :removal (offers/outcome r-remove)
                      :intent-left (some? intent) :other-removal-on-a-good-gateway other
                      :resumed-on-a-good-gateway resumed :other-removal-after other-after}]
          (observe! lbl :detail detail)
          (oracle! lbl (not= 200 (:status r-read)) "the gateway without the option refuses reads" detail)
          (oracle! lbl (= [200 nil] resumed) "a good gateway completes the intent the bad one left" detail))))))

;; ---- D4: the database's lock under a burst of removals in another account (diagnostic times) ----------------------
(defn d4 []
  (g/fresh-scope false
    (fn [name conn]
      (let [lbl "D4 lock"
            ys (vec (for [i (range 400)] (str "acct/y/s" i)))
            _ (doseq [[i y] (map-indexed vector ys)] (offers/send name (g/frame (str "d4-y" i) y (g/secret y "v") nil nil)))
            xs (vec (for [i (range 5)] (str "acct/x/s" i)))
            _ (doseq [[i x] (map-indexed vector xs)] (offers/send name (g/frame (str "d4-x" i) x (g/secret x "v") nil nil)))
            ;; sequential removals per second through the lock
            t0 (System/nanoTime)
            _ (doseq [i (range 60)] (remove-attr! name (str "d4-seq-" i) (ys i)))
            seq-rate (/ 60.0 (/ (- (System/nanoTime) t0) 1.0e9))
            next-y (atom 60) done-y (atom 0) stop (atom false)
            burst (fn [] (future (loop [] (when-not @stop
                                            (let [i (swap! next-y inc)]
                                              (when (< i (count ys))
                                                (when (= 200 (:status (remove-attr! name (str "d4-b-" i) (ys i)))) (swap! done-y inc))
                                                (recur)))))))
            ws (mapv (fn [_] (burst)) (range 4))
            _ (Thread/sleep 300)
            waits (vec (for [[i x] (map-indexed vector xs)]
                         (let [before @done-y s (System/nanoTime)
                               r (remove-attr! name (str "d4-x-" i) x)]
                           {:status (:status r) :ms (Math/round (/ (- (System/nanoTime) s) 1.0e6)) :overtaken-by (- @done-y before)})))
            _ (reset! stop true)
            _ (doseq [w ws] (deref w 60000 nil))
            detail {:sequential-removals-per-s (Math/round seq-rate) :burst-removals-done @done-y
                    :other-account-removals-during-burst waits}]
        (observe! lbl :diagnostic detail)
        (oracle! lbl (every? #(= 200 (:status %)) waits) "another account's removal finishes during a burst" detail)))))

;; ---- D5: smaller attacks --------------------------------------------------------------------------------------
(defn d6
  "Move back and forward per account with saves of several shapes in flight (held after their cut was read), then
  check that each was refused at most once and that a fresh save of every subject commits afterwards."
  []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [owners ["acct/m/one" "acct/m/two" "acct/n/one" "acct/n/two"]
              seeds (g/seed! name owners)
              _ (remove-attr! name "d6-rm-1" "acct/m/one")
              shapes (fn [k]
                       {:replace (g/frame (str "d6-r" k) "acct/m/two" (g/secret "acct/m/two" (str "r" k)) nil nil)
                        :create (g/frame (str "d6-c" k) (str "acct/n/new" k) (g/secret "acct/n/x" (str "c" k)) nil nil)
                        :import (g/frame* (str "d6-i" k) (str "acct/n/imp" k) ":v" (g/secret "acct/n/y" (str "i" k)) nil nil {:actor "bulk-import"})})
              cross (fn [k move]
                      (let [held (into {} (for [[shape input] (shapes k)] [shape (start-held! name input)]))
                            moved (offers/route name "v2" "removal-per-account" move)]
                        {:move (offers/outcome moved) :held (into {} (for [[shape h] held] [shape (offers/outcome (release-held! h))]))}))
              back (cross 1 {"back" true})
              wide-after-back (rs/per-account? (d/db conn))
              _ (remove-attr! name "d6-rm-2" "acct/n/one")
              forward (cross 2 {})
              fresh (into {} (for [o owners] [o (offers/outcome (offers/send name (g/frame (str "d6-f-" o) o (g/secret o "f") nil nil)))]))
              detail {:back back :per-account-after-back wide-after-back :forward forward :fresh-saves fresh}]
          (observe! "D6" :detail detail)
          (oracle! "D6" (every? #(= [200 nil] %) (vals fresh)) "after both moves a fresh save of every subject commits" detail)
          (counters-agree! name conn "D6"))))))

(defn d5 []
  (g/fresh-scope false
    (fn [name conn]
      (let [seeds (g/seed! name [g/a1 g/a2 g/b1]) value (:value (seeds g/a1)) pin (g/head conn)
            ticket (g/seq-now name conn)
            _ (reset! plan {:stop :after-native :stops-left 1})
            stopped (remove-attr! name "rm-d5" g/a1)
            _ (reset! plan nil)
            ;; (a) a ticket naming another account whose frame writes INTO the removed subject
            into-a1 (offers/send name (assoc (g/frame "d5-into" g/a1 (str "derived:" value) (:id (seeds g/a1)) pin)
                                             "erasureSeq" ticket "erasureAccounts" ["b"]))
            ;; (b) an import replay of the removed field, database-wide ticket, while stopped after the native commit
            replay (offers/send name (assoc (g/frame "d5-replay" g/a1 value nil nil) "erasureSeq" (g/seq-now name conn) "erasureReplay" true))
            ;; (c) an import frame (loader actor, no ticket) of the removed field while stopped
            imp (offers/send name (g/frame* "d5-import" g/a1 ":v" value nil nil {:actor "bulk-import"}))
            done (remove-attr! name "rm-d5" g/a1)
            ;; (d) the same command again after the acknowledgement (a lost reply)
            again (remove-attr! name "rm-d5" g/a1)
            ;; (e) the import frame resent unchanged after the acknowledgement
            imp2 (offers/send name (g/frame* "d5-import-2" g/a1 ":v" value nil nil {:actor "bulk-import"}))
            ;; (f) a removal by assertion ID racing a replacement of that assertion inside its window
            v2 (g/secret g/a2 "v2")
            _ (offers/send name (g/frame "d5-a2-v2" g/a2 v2 (:id (seeds g/a2)) (g/head conn)))
            fired (atom false)
            repl (g/frame "d5-a2-v3" g/a2 (g/secret g/a2 "v3") "d5-a2-v2" (g/head conn))
            _ (reset! plan {:hook (fn [p] (when (and (= p :in-commit) (compare-and-set! fired false true)) (offers/send name repl)))})
            by-id (erase! name "rm-d5-id" [{"id" "d5-a2-v2"}])
            _ (reset! plan nil)
            v2-visible (str/includes? (read-text name g/a2 {"history" true}) v2)
            detail {:stopped (offers/outcome stopped) :ticket-b-into-a1 (offers/outcome into-a1) :replay (offers/outcome replay)
                    :import-frame (offers/outcome imp) :resumed (offers/outcome done)
                    :resent-command [(offers/outcome again) (= (select-keys (:body again) ["seq" "position"]) (select-keys (:body done) ["seq" "position"]))]
                    :import-frame-resent-after (offers/outcome imp2)
                    :by-id-removal (offers/outcome by-id) :by-id-value-in-history v2-visible}]
        (observe! "D5" :detail detail)
        (oracle! "D5" (not= 200 (:status into-a1)) "a frame writing the removed subject is refused while the removal is stopped" detail)
        (oracle! "D5" (not= 200 (:status replay)) "an import replay of the removed field is refused while stopped" detail)
        (oracle! "D5" (not= 200 (:status imp)) "an import frame of the removed field is refused while stopped" detail)
        (oracle! "D5" (and (= [200 nil] (offers/outcome again)) (second (:resent-command detail))) "a resent command answers the same removal" detail)
        (oracle! "D5" (not= 200 (:status imp2)) "an import frame of the removed field resent after the removal is refused" detail)
        (oracle! "D5" (not v2-visible) "a removal by assertion ID removes that assertion even when it is replaced in the window" detail)
        (g/removed-everywhere! "D5" name conn g/a1 value (g/raw-occurrences conn "never-present") pin)))))

;; ---- F: the schedule fuzzer -------------------------------------------------------------------------------------
(def kinds [:fact :retire :creation :import :import-s :other-subject :other-account])
(def releases [:before :after-intent :in-commit :after-hold :after-native :after-reply :after-resume])
(def stops (cond-> [:none :none :before-native :after-native :at-publish] subject? (conj :after-guard)))
(def durings [:none :derived-any :derived-acct :replay :save-s :save-child :other-removal :read])
(def resumes (cond-> [:same :restart] subject? (conj :mixed)))
(def resends [:none :removal :save])
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))

(defn schedule [^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))]
    {:kind (pick kinds) :release (pick releases) :stop (pick stops) :during (pick durings)
     :resume (pick resumes) :resend (pick resends) :narrow (if (zero? (.nextInt r 3)) 1 2)}))

(defn- committed-at [conn command] (position-of conn command))

(defn run-schedule!
  "One interleaving. Returns {:removed #{values that must be gone} :owners {value #{entities}} :derived [...]}."
  [name conn run i sch]
  (let [{:keys [kind release stop during resume resend narrow]} sch
        acct (str "f" (mod i 7)) tag (str run "-" i)
        s (str "acct/" acct "/s" i) child (str s "-new") s2 (str "acct/" acct "/t" i) o (str "acct/o" (mod i 5) "/u" i)
        v0 (g/secret s (str "seed" tag)) vs2 (g/secret s2 "seed") vo (g/secret o "seed")
        seed (fn [id e v] (let [r (offers/send name (g/frame id e v nil nil))] (when-not (= 200 (:status r)) (bump! :seed-refused (offers/outcome r))) r))
        _ (seed (str "fs-" tag) s v0) _ (seed (str "ft-" tag) s2 vs2) _ (seed (str "fo-" tag) o vo)
        pin (g/head conn)
        ticket (g/seq-now name conn)
        _ (offers/route name "v2" "reach" {"root" s "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" (str "f-" tag) "erasureRefs" true})
        v1 (g/secret s (str "race" tag)) rid (str "fr-" tag)
        race (case kind
               :fact (g/frame rid s v1 (str "fs-" tag) pin)
               :retire (g/frame* rid s ":v" nil (str "fs-" tag) pin {:retire-only true})
               :creation (g/frame rid child v1 nil nil)
               :import (g/frame* rid child ":v" v1 nil nil {:actor "bulk-import"})
               :import-s (g/frame* rid s ":v" v1 (str "fs-" tag) pin {:actor "bulk-import"})
               :other-subject (g/frame rid s2 v1 (str "ft-" tag) pin)
               :other-account (g/frame rid o v1 (str "fo-" tag) pin))
        race-target (case kind (:fact :retire :import-s) s (:creation :import) child :other-subject s2 :other-account o)
        early (when (= release :before) (offers/send name race))
        held (when-not (= release :before) (start-held! name race))
        race-reply (atom early)
        rel! (fn [] (when (and held (nil? @race-reply)) (reset! race-reply (release-held! held))))
        cmd (str "fx-" tag)
        selectors [{"entityId" s "attribute" ":v"} {"entityId" child "attribute" ":v"}]
        _ (alter-var-root #'rc/narrow-tries (constantly narrow))
        _ (reset! plan {:stop (when-not (= stop :none) stop) :stops-left 1
                        :hook (fn [p] (when (= p release) (rel!)))})
        first-reply (erase! name cmd selectors)
        _ (reset! plan nil)
        _ (when (= release :after-hold) (bump! :after-hold-reached (some? @race-reply)))
        _ (when (#{:after-reply :after-hold :after-intent :in-commit :after-native} release) (rel!))
        stopped? (not= 200 (:status first-reply))
        _ (bump! :first-reply (offers/outcome first-reply))
        ;; while stopped (or right after the answer when it did not stop)
        v2 (g/secret s (str "during" tag)) did (str "fd-" tag) doc (str "notice:v1:era3-" tag)
        during-reply
        (case during
          :none nil
          :read (offers/route name "v1" "read" {"entityIds" [s2]})
          :derived-any (offers/send name (copy-frame did doc v0 ticket nil))
          :derived-acct (offers/send name (copy-frame did doc v0 ticket [acct]))
          :replay (offers/send name (assoc (g/frame did s v0 nil nil) "erasureSeq" (g/seq-now name conn) "erasureReplay" true))
          :save-s (offers/send name (g/frame did s v2 nil nil))
          :save-child (offers/send name (g/frame did child v2 nil nil))
          :other-removal (erase! name (str "fo-rm-" tag) [{"entityId" s2 "attribute" ":v"}]))
        _ (when during-reply (bump! :during during (if stopped? :while-stopped :after-answer) (offers/outcome during-reply)))
        ;; resume
        final (loop [k 0 reply first-reply]
                (if (or (= 200 (:status reply)) (>= k 3)) reply
                  (recur (inc k)
                         (case (if (zero? k) resume :same)
                           :same (erase! name cmd selectors)
                           :restart (do (reset! privacy/cache {}) (erase! name cmd selectors))
                           :mixed (let [r (with-redefs-fn {#'erase/subject-check false} #(erase! name cmd selectors))]
                                    (bump! :mixed-resume (offers/outcome r)) r)))))
        _ (rel!)
        other-final (when (= during :other-removal) (erase! name (str "fo-rm-" tag) [{"entityId" s2 "attribute" ":v"}]))
        ok (= 200 (:status final))
        p-r (get-in final [:body "position"])
        ids (set (map #(get % "assertionId") (get-in final [:body "identities"])))
        ;; positions of the racing and during writes BEFORE any resend (a resend is a new request after the removal)
        p-race (committed-at conn rid) p-during (committed-at conn did)
        resend-reply (case resend
                       :none nil
                       :removal (erase! name cmd selectors)
                       :save (offers/send name race))
        label (str "F " (pr-str (dissoc sch :narrow)))
        p-resent (when (= resend :save) (committed-at conn rid))
        during-cut-lacked-r stopped?]
    (oracle! label ok "the removal completes after at most 3 resumes" {:first (offers/outcome first-reply) :final (offers/outcome final)})
    (when other-final
      (oracle! label (= 200 (:status other-final)) "another removal refused while this one was pending completes afterwards"
               (offers/outcome other-final)))
    (when ok
      (oracle! label (contains? ids (str "fs-" tag)) "the seed value was removed" ids)
      ;; the racing write (prepared before the removal): if it wrote the subject or the named child and committed,
      ;; it must sit before the removal's position and its value must be in the removal (a retirement carries none)
      (when (and p-race (#{s child} race-target))
        (oracle! label (< p-race p-r) "a write prepared before the removal never commits after the removal's position on its subjects"
                 {:race p-race :removal p-r :kind kind})
        (when (and (< p-race p-r) (not= kind :retire))
          (oracle! label (contains? ids rid) "a racing value committed before the removal was removed with it" {:ids ids :rid rid})))
      ;; an unrelated racing save (another subject, another account) is never refused
      ;; (not when the request sent during the stop was itself a removal of that other subject)
      (when (and (#{:other-subject :other-account} kind) (not (and (= kind :other-subject) (= during :other-removal))))
        (oracle! label (= [200 nil] (offers/outcome @race-reply)) "an unrelated save prepared before the removal commits"
                 (offers/outcome @race-reply)))
      ;; writes sent while the removal was stopped carry a cut that lacks it
      (when (and p-during (#{:save-s :save-child :replay} during))
        (if during-cut-lacked-r
          (do (oracle! label (< p-during p-r) "a write sent while the removal was pending never lands after its position on its subjects"
                       {:during during :p p-during :removal p-r})
              (when (< p-during p-r) (oracle! label (contains? ids did) "a value saved while the removal was pending (before its commit) was removed" {:ids ids})))
          (bump! :during-after-answer-committed during)))
      (when (#{:derived-any :derived-acct} during)
        (let [visible (str/includes? (read-text name doc) v0)]
          (bump! :derived during (if stopped? stop :not-stopped) (offers/outcome during-reply)
                 (cond (not p-during) :not-landed (< p-during p-r) :landed-before-removal-position :else :landed-after-removal-position))
          (oracle! label (not (and visible p-during (> p-during p-r)))
                   "a derived copy whose ticket predates the removal never lands after the removal's position" {:during during :stop stop})))
      (when (= resend :removal)
        (oracle! label (and (= 200 (:status resend-reply)) (= p-r (get-in resend-reply [:body "position"])))
                 "a resent removal command answers the same removal" (offers/outcome resend-reply)))
      (when (and (= resend :save) resend-reply)
        (bump! :resend-save kind (offers/outcome resend-reply))
        ;; a resend whose first attempt committed must answer as a duplicate; one whose first attempt was refused is a
        ;; new request after the removal: new data, except an import frame of a field the removal named
        (bump! :resend-save-landed kind (cond (nil? p-resent) :not-landed p-race :first-attempt-had-landed (< p-resent p-r) :before-removal :else :after-removal))
        (when (and (= 200 (:status resend-reply)) (not= 200 (:status @race-reply)) (#{:import :import-s} kind))
          (if (= kind :import-s)
            (oracle! label false "an import frame of a removed field resent after the removal is refused"
                     {:kind kind :resend (offers/outcome resend-reply)})
            (bump! :imp2-known-named-absent-import-resend-committed))))
      ;; routes: the seed and every removed racing value are absent from current, history and pinned reads and the
      ;; Reach session cached at the pin
      (let [gone (cond-> [v0] (and p-race (< p-race p-r) (#{:fact :creation :import :import-s} kind)) (conj v1)
                   (and p-during (< p-during p-r) (#{:save-s :save-child} during)) (conj v2))
            texts (concat (for [e [s child] q [{} {"history" true} {"basis" {"recordedPosition" pin "validAt" 1.0e12}}]] (read-text name e q))
                          [(g/text (:body (offers/route name "v2" "reach" {"root" s "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                                            "session" (str "f-" tag) "erasureRefs" true})))])]
        (oracle! label (not-any? (fn [t] (some #(str/includes? t %) gone)) texts)
                 "no read route answers a removed value" {:gone gone})))
    (bump! :schedules)
    {:gone (cond-> {v0 #{s}} (and p-race p-r (< p-race p-r) (#{:fact :creation :import :import-s} kind)) (assoc v1 #{s child}))
     :derived (when (and (#{:derived-any :derived-acct} during) p-during) {v0 #{doc}})
     :derived-tx (when (and (#{:derived-any :derived-acct} during) p-during) (str "_tx/" did))}))

(defn counters-agree!
  "Every native removal counter equals the one derived from the published log (a counter that disagrees refuses that
  subject's or account's saves forever), when no removal is pending."
  [name conn label]
  (when (and per-account? (nil? (privacy/pending name)))
    (let [db (d/db conn) cut (privacy/cut name db true)
          ents (:entities cut) bks (:buckets cut)
          native-e (into {} (d/q '[:find ?k ?s :where [?e :triplex.removal/entity ?k] [?e :triplex.removal/seq ?s]] db))
          native-b (into {} (d/q '[:find ?k ?s :where [?e :triplex.removal/account ?k] [?e :triplex.removal/seq ?s]] db))
          bad (concat (for [k (into (set (keys ents)) (keys native-e)) :when (not= (get ents k 0) (get native-e k 0))]
                        [:entity k (get ents k 0) (get native-e k 0)])
                      (for [k (into (set (keys bks)) (keys native-b)) :when (not= (get bks k 0) (get native-b k 0))]
                        [:account k (get bks k 0) (get native-b k 0)]))]
      (oracle! label (empty? bad) "every native removal counter equals the one derived from the published log"
               {:bad (take 5 bad) :entities (count ents) :accounts (count bks)})
      (swap! tally update [:counters-compared] (fnil + 0) (+ (count ents) (count bks))))))

(defn block-checks! [name conn label gone derived-ok derived-txs]
  ;; the log stays dense and ordered; record time does not go back at a removal; no native copy of a removed value
  ;; outside its subjects and journals other than the derived documents counted above; the journal pages and the feed
  ;; never answer a removed value
  (let [db (d/db conn)
        txs (sort-by first (map (fn [x] [(:v x) (:e x)]) (d/datoms db :aevt :triplex.tx/position)))
        clock (fn [e] (:v (first (d/datoms db :eavt e :triplex.tx/max-recorded-at))))
        removal? (fn [e] (some? (first (d/datoms db :eavt e :triplex.tx/erasure-record))))
        backwards (keep (fn [[[_ a] [_ b]]] (when (and (removal? b) (clock a) (< (clock b) (clock a))) [a b])) (partition 2 1 txs))
        owners (merge-with into gone derived-ok)
        foreign (g/foreign-copies conn owners)
        journal (loop [after 0 k 0 out []]
                  (let [body (:body (offers/route name "v2" "transactions" {"after" after "limit" 1000}))
                        page (get body "transactions" [])
                        out (into out page)
                        nxt (or (get body "next")
                                (when (= 1000 (count page)) (apply max (map #(long (or (get % "position") after)) page))))]
                    (if (and nxt (> (long nxt) after) (< k 500)) (recur (long nxt) (inc k) out) out)))
        ;; a derived write's own journal holds its copy in clear (its row's identity is not the removed one): counted
        ;; with the derived copies, not here
        own? (fn [t] (some #(str/includes? (g/text t) %) derived-txs))
        derived-journals (count (filter own? journal))
        journal (vec (remove own? journal))
        jtext (g/text journal)
        feed (loop [from 0 k 0 out []]
               (let [r (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/log") :query-string (str "fromT=" from "&limit=1000")})
                     b (:body r)
                     body (json/read-str (if (string? b) b (String. ^bytes b "UTF-8")))
                     rows (get body "rows" [])]
                 (if (or (empty? rows) (> k 500)) out
                   (recur (Long/parseLong (str (get body "nextT"))) (inc k) (into out rows)))))
        derived-feed (count (filter own? feed))
        feed (vec (remove own? feed))
        ftext (g/text feed)]
    (oracle! label (= (map first txs) (range 1 (inc (count txs)))) "positions are 1..N with no gap or repeat"
             (take 5 (remove (fn [[a b]] (= a b)) (map vector (map first txs) (range 1 (inc (count txs)))))))
    (oracle! label (empty? backwards) "no removal's record time is before the commit before it" (take 3 backwards))
    (oracle! label (empty? foreign) "no native copy of a removed value outside its subjects, journals and counted derived documents" (take 5 foreign))
    (let [hits (filter #(str/includes? jtext %) (keys gone))
          where (for [v (take 3 hits)]
                  {:value v :owners (gone v)
                   :in (vec (take 3 (keep (fn [t] (let [tt (g/text t)] (when (str/includes? tt v) (subs tt 0 (min 700 (count tt)))))) journal)))})]
      (oracle! label (empty? hits) "the journal pages never answer a removed value" {:transactions (count journal) :hits (count hits) :where where}))
    (oracle! label (not-any? #(str/includes? ftext %) (keys gone)) "the feed never answers a removed value" {:rows (count feed)})
    (observe! label :block {:transactions (count txs) :journal (count journal) :feed-rows (count feed) :gone (count gone)
                            :derived-journals-in-clear derived-journals :derived-feed-rows-in-clear derived-feed})
    (swap! tally update [:derived-journal-entries-in-clear] (fnil + 0) derived-journals)
    (counters-agree! name conn label)))

(defn fuzz [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [b (range (quot (+ n block -1) block))]
      (g/fresh-scope false
        (fn [name conn]
          (let [results (vec (for [i (range (* b block) (min n (* (inc b) block)))]
                               (let [sch (schedule r)]
                                 (try (run-schedule! name conn run i sch)
                                      (catch Throwable e
                                        (reset! plan nil) (reset! held-ops {})
                                        (oracle! (str "F " (pr-str sch)) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))
                derived (apply merge-with into (keep :derived results))
                derived-txs (set (keep :derived-tx results))]
            (block-checks! name conn (str "F block " b) (or gone {}) (or derived {}) derived-txs)
            (println "ERA3_PROGRESS" mode (pr-str {:block b :schedules (get @tally [:schedules]) :violations (count @violations)}))))))))

;; ---- request bodies for the stack reproduction (era3/stack.sh): the same frames, written as the route receives them -
(defn bodies []
  (let [dir (java.io.File. "/out/bodies") _ (.mkdirs dir)
        va (g/secret g/a1 "stack") vb (g/secret g/b1 "stack") vo (g/secret g/a1 "own")
        put (fn [n x] (spit (java.io.File. dir ^String n) (json/write-str x)))]
    (put "seed-a1.json" (g/frame "st-seed-a1" g/a1 va nil nil))
    (put "seed-b1.json" (g/frame "st-seed-b1" g/b1 vb nil nil))
    (put "frame-any.json" (copy-frame "st-frame-any" "notice:v1:era3-any" va 0 nil))
    (put "frame-acct.json" (copy-frame "st-frame-acct" "notice:v1:era3-acct" va 0 ["a"]))
    (put "own-save.json" (g/frame "st-own" g/a1 vo nil nil))
    (put "values.json" {"a1" va "b1" vb "own" vo})
    (println "ERA3_BODIES" (vec (sort (.list dir))))))

;; ---- main -------------------------------------------------------------------------------------------------------
(defn- guarded [label f] (try (f) (catch Throwable e (reset! plan nil) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  ;; ERA3_PHASES=builder: the builder's own gate (era2/gate.clj), e.g. on the patched copy; it exits by itself
  (when (= "builder" (System/getenv "ERA3_PHASES")) (era2-gate/main))
  (install-hooks!)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "d1 d2 d3 d4 d5 d6 fuzz") #" "))]
    (when (phases "d1")
      (doseq [sealed? [false true] step (cond-> [:before-native :after-native :at-publish] subject? (conj :after-guard))]
        (guarded (str "D1 " step sealed?) #(d1 sealed? step)))
      nil)
    ;; d1t: in-process the in-memory connection transacts synchronously, so the gateway's 5 s wait never expires and
    ;; this case cannot open the window here (observed 2026-11-24: the first reply took 6.6 s and answered 200); kept
    ;; for a real transactor only
    (when (phases "d1t") (doseq [accounts [nil ["a"]]] (guarded (str "D1-timeout " accounts) #(d1-timeout accounts))))
    (when (phases "d2") (guarded "D2" d2))
    (when (phases "d3") (guarded "D3" d3))
    (when (phases "d4") (guarded "D4" d4))
    (when (phases "d5") (guarded "D5" d5))
    (when (phases "d6") (guarded "D6" d6))
    (when (phases "bodies") (bodies))
    (when (phases "fuzz")
      (fuzz (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
            (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1")))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @oracles :violations (count @violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [f failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit 0)))
