(ns era3-review7b
  "[DX-ERA3, seventh review, Part B] Attacks on DX-ERA6 at ae82b8984 (the removal branch reconciled with the save line):
  the merged rule for a save framed before a removal (declined when a removal is later than the earliest of
  frameSourceK, sourceK and removalSeen; declined commands recorded) with every combination of the three points absent,
  older than the removal or fresh, on every writer; a resend of a declined command and a new command; what a declined
  save writes (V4); a stored save sent again after a removal of a value it wrote (F1). Loaded after
  wfix1/regression.clj, w2/wide_gate.clj, s5/fuzz.clj (from ERA3_TESTS_REF), era2/gate.clj and era3/attack.clj to
  attack5.clj; era3/run.sh runs it with ERA3_MAIN=r7b. Review: era3/REVIEW-7.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.storage :as storage] [triplex.gateway.removal-scope :as rs]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]
            [era2-gate :as g] [era3-attack :as a]))

(def mode a/mode)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def counter (atom 31000000))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- block [kind] (assoc (wide/identity-block kind (swap! counter inc)) :kind kind))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block :wide) :source (head conn) :retires []} spec))))
(defn- cur [name owner field] (get (fz/read-owner name owner {"validAt" 5.0}) field))
(defn- stored [name owner] (get-in (fz/read-owner name owner {"validAt" 5.0}) [":p/secret" :value]))
(defn- frontier-seq [name] (get-in (reference/route name "v2" "erasure-frontier" nil) [:body "seq"]))
(defn- scope [f]
  (reference/in-scope
    (fn [name conn]
      (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
      (when rs/enabled (reference/route name "v2" "removal-per-account" {}))
      ;; ERA3_7B_COMMIT=1 (with TX2_REMOVAL_COMMIT_BOUNDARY=1): the database then moves to the commit boundary
      (when (and rs/enabled (= "1" (System/getenv "ERA3_7B_COMMIT")))
        (let [r (reference/route name "v2" "removal-commit-boundary" {})]
          (when-not (= 200 (:status r)) (throw (ex-info "the commit boundary was not turned on" {:reply r})))))
      (f name conn))))

;; The writers: [label path kind write-class creates?] (the save line's own list, s5/attack3_gate.clj)
(def writers [["one owner, narrow" :fast :narrow nil false] ["one owner, wide" :fast :wide nil false]
              ["several owners" :fast :wide nil false] ["creation" :fast :wide nil true]
              ["general" :general :wide nil false] ["import frame" :general :wide "import" true]])
(def points [:absent :old :fresh])

(defn- facts-of [label name S value]
  (cond-> [{:owner S :field ":p/secret" :type :string :value value :pred (when-not (str/starts-with? label "creation") (when-not (= label "import frame") (cur name S ":p/secret")))}]
    (= label "several owners") (conj {:owner (str S "-profile") :field ":a/f0" :type :string :value "o" :pred (cur name (str S "-profile") ":a/f0")})))

;; ---- M1 and M2: every combination of the three points, on every writer -------------------------------------------
(defn m1-matrix [[label path kind klass creates?]]
  (scope
    (fn [name conn]
      (let [wrap (if (= path :general) fz/general (fn [f] (f)))
            removed-value "the removed value"
            ;; [second run] one subject per combination on every writer (the first run gave the non-creating writers one
            ;; subject for all 27, so a combination stored earlier left the value there and moved the subject past the
            ;; fresh source: its oracle flagged answers that were right, and fresh saves met CasConflict)
            subject (fn [k] (if creates? (str "acct/m" k "/subject/new" (swap! counter inc)) (str "acct/m0/subject/s" (swap! counter inc))))
            combos (for [fk points sk points rk points] [fk sk rk])
            subjects (into {} (for [c combos] [c (subject (hash c))]))
            S0 (subjects (first combos))
            _ (when-not creates?
                (doseq [[_ S] subjects]
                  (wrap #(reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value removed-value :pred nil}]})))
                  (when (= label "several owners")
                    (wrap #(reference/send name (save conn {:facts [{:owner (str S "-profile") :field ":a/f0" :type :string :value "seed" :pred nil}]}))))))
            old-source (head conn) old-seen (or (frontier-seq name) 0)
            ;; each combination's subject is removed (for the creating writers a removal names a subject with no value
            ;; yet), one removal per subject
            removals (vec (for [[_ S] subjects]
                            (:status (reference/route name "v2" "erase" {"commandId" (str "rm-" (swap! counter inc))
                                                                         "selectors" [(cond-> {"entityId" S} (not creates?) (assoc "attribute" ":p/secret"))]}))))
            fresh-source (head conn) fresh-seen (frontier-seq name)
            pick (fn [p old fresh] (case p :absent nil :old old :fresh fresh))
            results (vec (for [[fk sk rk :as c] combos]
                           (let [S (subjects c)
                                 input (cond-> (save conn {:block (block kind) :source (pick sk old-source fresh-source)
                                                           :facts (facts-of label name S removed-value)})
                                         (pick fk old-source fresh-source) (assoc "frameSourceK" (pick fk old-source fresh-source))
                                         (pick rk old-seen fresh-seen) (assoc "removalSeen" (pick rk old-seen fresh-seen))
                                         klass (assoc "writeClass" klass))
                                 reply (wrap #(reference/send name input))
                                 value-back (= removed-value (stored name S))
                                 stated (remove #{:absent} c)
                                 expect-declined (or (empty? stated) (some #{:old} stated))]
                             {:combo c :answer (reference/outcome reply) :writer (fz/writer-kind conn (get input "operationId") reply)
                              :removed-value-stored value-back :expect (if expect-declined :declined :stored)
                              :command (get-in input ["claims" 0 "commandId"]) :subject S})))
            wrong (vec (remove (fn [r] (if (= :declined (:expect r))
                                         (and (= [409 "ErasureReplayDeclined"] (:answer r)) (not (:removed-value-stored r)))
                                         (= 200 (first (:answer r)))))
                               results))
            ;; M2: a declined command resent with every point fresh; a new command with every point fresh
            declined (first (filter #(= [409 "ErasureReplayDeclined"] (:answer %)) results))
            S (or (:subject declined) S0)
            resend (when declined
                     (reference/outcome (wrap #(reference/send name (cond-> (assoc (save conn {:command (:command declined) :block (block kind) :source fresh-source
                                                                                                :facts (facts-of label name S removed-value)})
                                                                                   "frameSourceK" fresh-source "removalSeen" fresh-seen)
                                                                            klass (assoc "writeClass" klass))))))
            S2 (:subject declined)
            new-cmd (when declined
                      (reference/outcome (wrap #(reference/send name (cond-> (assoc (save conn {:block (block kind) :source fresh-source
                                                                                                 :facts (facts-of label name S2 "a value chosen after the removal")})
                                                                                    "frameSourceK" fresh-source "removalSeen" fresh-seen)
                                                                             klass (assoc "writeClass" klass))))))
            lbl (str "M1 the merged rule, every combination of frameSourceK, sourceK and removalSeen, " label ", " mode (when (= "1" (System/getenv "ERA3_7B_COMMIT")) ", commit"))
            detail {:removals (frequencies removals) :combinations (count results)
                    :answers (frequencies (map :answer results)) :writers-that-committed (frequencies (map :writer results))
                    :wrong (mapv #(select-keys % [:combo :answer :expect :removed-value-stored :writer]) wrong)
                    :declined-command-resent-fresh resend :new-command-fresh new-cmd}]
        (observe! lbl :detail detail)
        (doseq [r results] (bump! :m1 label (:expect r) (:answer r)))
        (oracle! lbl (empty? wrong) "declined exactly when no point is stated or a stated point is older than the removal; stored otherwise" detail)
        (when declined
          (oracle! lbl (= [409 "ErasureReplayDeclined"] resend) "a declined command sent again is declined, whatever it states" detail)
          (oracle! lbl (= 200 (first new-cmd)) "a new command stating fresh points is stored" detail))))))

;; ---- M3: what declined saves that state nothing write (V4), and a command taken by another caller ------------------
(defn m3-writes [path]
  (scope
    (fn [name conn]
      (let [wrap (if (= path :general) fz/general (fn [f] (f)))
            S "acct/v4/subject/s" B "acct/w4/subject/s"
            _ (wrap #(reference/send name (save conn {:facts [{:owner S :field ":p/secret" :type :string :value "v" :pred nil}]})))
            _ (wrap #(reference/send name (save conn {:facts [{:owner B :field ":p/secret" :type :string :value "w" :pred nil}]})))
            _ (reference/route name "v2" "erase" {"commandId" "m3-rm" "selectors" [{"entityId" S "attribute" ":p/secret"}]})
            sourceless (fn [cmd owner v] (assoc (save conn {:command cmd :source nil :facts [{:owner owner :field ":p/secret" :type :string :value v :pred (cur name owner ":p/secret")}]})
                                                "sourceK" nil))
            t0 (d/basis-t @(d/sync conn))
            first-decline (reference/outcome (wrap #(reference/send name (sourceless "m3-first" S "x0"))))
            t1 (d/basis-t @(d/sync conn))
            many (frequencies (for [k (range 20)] (reference/outcome (wrap #(reference/send name (sourceless (str "m3-" k) S (str "x" k)))))))
            t2 (d/basis-t @(d/sync conn))
            same (frequencies (for [k (range 20)] (reference/outcome (wrap #(reference/send name (sourceless "m3-same" S (str "y" k)))))))
            t3 (d/basis-t @(d/sync conn))
            datoms (fn [from to] (reduce + (map #(count (:data %)) (seq (d/tx-range (d/log conn) (inc from) (inc to))))))
            ;; a caller sends a save that states nothing, of the removed subject, under a command another caller will use
            hostile (reference/outcome (wrap #(reference/send name (sourceless "victims-command" S "h"))))
            victim (reference/outcome (wrap #(reference/send name (assoc (save conn {:command "victims-command" :source (head conn)
                                                                                    :facts [{:owner B :field ":p/secret" :type :string :value "the victim's own value" :pred (cur name B ":p/secret")}]})
                                                                     "removalSeen" (frontier-seq name)))))
            lbl (str "M3 what a declined save that states nothing writes, and a command taken by another caller, " (clojure.core/name path) ", " mode)
            detail {:first-decline first-decline :datoms-of-the-first (datoms t0 t1)
                    :twenty-more-under-new-commands many :datoms-of-the-twenty (datoms t1 t2) :transactions-of-the-twenty (- t2 t1)
                    :twenty-under-one-command same :datoms-of-those (datoms t2 t3)
                    :a-save-stating-nothing-under-another-callers-command hostile :that-callers-own-save-of-another-subject victim}]
        (observe! lbl :detail detail)
        (bump! :m3 path :first (datoms t0 t1) :twenty (datoms t1 t2) :same (datoms t2 t3) :victim victim)
        (oracle! lbl (= 200 (first victim)) "a caller's save of its own subject is not declined because another caller used its command first" detail)))))

;; ---- M4 (F1): a stored save sent again after a removal of a value it wrote --------------------------------------------
(defn m4-stored-resent [path]
  (scope
    (fn [name conn]
      (let [wrap (if (= path :general) fz/general (fn [f] (f)))
            S "acct/f1/subject/s"
            input (save conn {:command "f1-save" :operation "f1-op" :facts [{:owner S :field ":p/secret" :type :string :value "kept until removed" :pred nil}
                                                                             {:owner S :field ":a/note" :type :string :value "unprotected" :pred nil}]})
            first-send (reference/outcome (wrap #(reference/send name input)))
            _ (reference/route name "v2" "erase" {"commandId" "f1-rm" "selectors" [{"entityId" S "attribute" ":p/secret"}]})
            again (wrap #(reference/send name input))
            op (fz/op-lookup name "f1-op" nil)
            note (get-in (fz/read-owner name S {"validAt" 5.0}) [":a/note" :value])
            lbl (str "M4 a stored save sent again after a removal of a value it wrote, " (clojure.core/name path) ", " mode)
            detail {:first first-send :sent-again (reference/outcome again) :operation-status (get op "status")
                    :its-unprotected-value-stored (= "unprotected" note)}]
        (observe! lbl :detail detail)
        (bump! :m4 path (reference/outcome again))
        (oracle! lbl (not (and (= "unprotected" note) (= [409 "ErasureReplayDeclined"] (reference/outcome again))))
                 "a save that was stored is not answered as declined when it is sent again" detail)))))

(defn- guarded [label f] (try (f) (catch Throwable e (a/oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "m1 m3 m4") #" "))]
    (when (phases "m1") (doseq [w writers] (guarded "M1" #(m1-matrix w))))
    (when (phases "m3") (doseq [p [:fast :general]] (guarded "M3" #(m3-writes p))))
    (when (phases "m4") (doseq [p [:fast :general]] (guarded "M4" #(m4-stored-resent p)))))
  (println "ERA3_TALLY7B" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
  (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)}))
  (shutdown-agents)
  (System/exit 0))
