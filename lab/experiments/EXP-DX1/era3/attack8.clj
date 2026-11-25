(ns era3-attack8
  "[DX-ERA6] fuzz8: saves, replays, resends and removals against the merged rule of the save line's third review
  (section 2). Each schedule takes a fresh subject, saves a first value, and then, in a random order, removes it and
  sends one save of a new value that states a random subset of the points a client can state:
    a plain save:  its own source (`sourceK`) and the removal stamp it holds (`removalSeen`), each captured at its frame;
    a replay:      its first attempt's source (`frameSourceK`, a position or null), its own fresher source, and a
                   stamp (the first attempt's, carried as the SDK carries it, or a fresh one).
  The removal lands before the frame, between the frame and the replay's own frame, just before the send, after the
  send, or not at all. Then the same command is sent again with a fresh frame (a resend), and a new command with a
  fresh frame.
  Oracles, with the replay rule on (TX2_REMOVAL_PER_ACCOUNT=1 or TX2_REMOVAL_REPLAY_RULE=1):
    M1  the save is declined (409 ErasureReplayDeclined) exactly when the removal came before the send and after the
        earliest point it states (no point stated, or a null first source without a stamp, counts as before every
        removal); otherwise it is stored (200);
    M2  a resend under a declined command is declined whatever it states; under a stored command it is a duplicate,
        never a second value;
    M3  a new command framed after everything is stored;
    M4  exactness: after the schedule the subject answers exactly the values the rule allowed: the first value is
        masked once removed, a value stored before the removal is masked by it, a declined value was never stored, and
        the new command's value is answered.
  With the rule off (every option off) the save line's own rule is the oracle for replays (a first source that is null
  or before the removal declines; a resend is a new save), and plain saves are tallied, not judged.
  era3/run.sh runs it with ERA3_MAIN=8 and ERA3_PHASES=fuzz8 (ERA3_BOUNDARY log or commit)."
  (:require [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.removal-commit :as rc]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack5 :as f])
  (:import [java.util Random]))

(def mode a/mode)
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(defn oracle! [& args] (apply a/oracle! args))

(defn- stamp [name] (let [b (a/frontier name)] (long (or (get b "removalStamp") (get b "seq") 0))))
(defn- pick [^Random r xs] (nth xs (.nextInt r (count xs))))

(defn- expected-declined?
  "The merged rule on the schedule's own clock: `points` are the stated points' capture times (:frame or :replay),
  `removal-at` when the removal landed (nil: never), `bare?` true when nothing stated counts (no point, or a null first
  source without a stamp)."
  [order points bare? removal-at send-at]
  (and removal-at (< (order removal-at) (order send-at))
       (or bare? (some #(< (order %) (order removal-at)) points))))

(defn schedule! [name conn r i]
  (let [s (str "acct/f8/s" i) v0 (g/secret s "v0") v1 (g/secret s "v1") v2 (g/secret s "v2") v3 (g/secret s "v3")
        seed (f/outcome (f/safe #(offers/send name (g/frame (str "f8-seed-" i) s v0 nil nil))))
        kind (pick r [:plain :replay])
        ;; when the removal lands, on the schedule's clock: 0 before the frame, 1 after it, 2 after the replay's own
        ;; frame (replays), 3 after the send, nil never
        slots (if (= kind :plain) [0 1 3 nil] [0 1 2 3 nil])
        removal-at (pick r slots)
        order identity
        removal (atom nil)
        remove-if (fn [slot] (when (= slot removal-at) (reset! removal (f/outcome (f/safe #(a/remove-attr! name (str "f8-rm-" i) s))))))
        _ (remove-if 0)
        src1 (g/head conn) seen1 (stamp name)
        _ (remove-if 1)
        [src2 seen2] (when (= kind :replay) [(g/head conn) (stamp name)])
        _ (when (= kind :replay) (remove-if 2))
        ;; what the save states, and when each point was captured (1 = the frame, 2 = the replay's own frame)
        choice (if (= kind :plain)
                 {:source (pick r [:src1 :none]) :seen (pick r [:seen1 :none])}
                 {:frame (pick r [:src1 :null]) :source (pick r [:src2 :none]) :seen (pick r [:seen1 :seen2 :none])})
        fields (cond-> {}
                 (= :src1 (:source choice)) (assoc "sourceK" src1)
                 (= :src2 (:source choice)) (assoc "sourceK" src2)
                 (= :seen1 (:seen choice)) (assoc "removalSeen" seen1)
                 (= :seen2 (:seen choice)) (assoc "removalSeen" seen2)
                 (= :src1 (:frame choice)) (assoc "frameSourceK" src1)
                 (= :null (:frame choice)) (assoc "frameSourceK" nil))
        points (cond-> []
                 (= :src1 (:source choice)) (conj 0.5) (= :seen1 (:seen choice)) (conj 0.5)
                 (= :src1 (:frame choice)) (conj 0.5)
                 (= :src2 (:source choice)) (conj 1.5) (= :seen2 (:seen choice)) (conj 1.5))
        bare? (or (empty? points) (and (= :null (:frame choice)) (= :none (:seen choice))))
        cmd (str "f8-save-" i)
        sent (f/outcome (f/safe #(offers/send name (merge (g/frame cmd s v1 nil nil) fields))))
        _ (remove-if 3)
        ;; the clock: the removal slot k lands at time k; the frame's points at 0.5, the replay's at 1.5, the send at 2.5
        removal-time (when (and removal-at (= [200 nil] @removal)) removal-at)
        rule? rc/replay-rule
        want-declined (if rule?
                        (boolean (expected-declined? order points bare? removal-time 2.5))
                        (boolean (and removal-time (< removal-time 2.5) (contains? fields "frameSourceK")
                                      (or (nil? (get fields "frameSourceK")) (> removal-time 0.5)))))
        declined? (= [409 "ErasureReplayDeclined"] sent)
        resend (f/outcome (f/safe #(offers/send name (merge (g/frame cmd s v2 nil nil) {"sourceK" (g/head conn) "removalSeen" (stamp name)}))))
        renewed (f/outcome (f/safe #(offers/send name (merge (g/frame (str "f8-new-" i) s v3 nil nil) {"sourceK" (g/head conn) "removalSeen" (stamp name)}))))
        text (a/read-text name s)
        answered? (fn [v] (str/includes? text v))
        label (str "F8 " (pr-str {:i i :kind kind :removal removal-at :choice choice}))
        detail {:seed seed :removal @removal :sent sent :resend resend :renewed renewed :fields fields :want-declined want-declined}]
    (bump! :f8 kind :removal removal-at :sent sent :resend resend)
    (oracle! label (= [200 nil] seed) "the first value is stored" detail)
    (when removal-at (oracle! label (= [200 nil] @removal) "the removal is acknowledged" detail))
    (if (or rule? (= kind :replay))
      (oracle! label (if want-declined declined? (= [200 nil] sent))
               (if rule? "M1 declined exactly when the merged rule says so" "M1 (rule off) the save line's rule for a replay") detail)
      (bump! :f8-off-plain :removal removal-at :sent sent :late-stored (boolean (and removal-time (< removal-time 0.5) (= [200 nil] sent)))))
    (when (and rule? declined?)
      (oracle! label (= [409 "ErasureReplayDeclined"] resend) "M2 a resend under a declined command is declined" detail))
    (when (= [200 nil] sent)
      (oracle! label (not= [200 nil] resend) "M2 a resend under a stored command never stores a second value" detail)
      (oracle! label (not (answered? v2)) "M2 the resend's value is not answered" detail))
    (oracle! label (= [200 nil] renewed) "M3 a new command framed after everything is stored" detail)
    (oracle! label (answered? v3) "M3 its value is answered" detail)
    (when removal-time (oracle! label (not (answered? v0)) "M4 the removed first value is masked" detail))
    (when (and declined? (or rule? (= kind :replay))) (oracle! label (not (answered? v1)) "M4 a declined value was never stored" detail))
    (when (and (= [200 nil] sent) removal-time (> removal-time 2.5))
      (oracle! label (not (answered? v1)) "M4 a value stored before the removal is masked by it" detail))
    (when (and rule? (= [200 nil] sent) removal-time (< removal-time 2.5))
      (oracle! label (answered? v1) "M4 a value framed after the removal is answered" detail))
    {:gone (cond-> {} removal-time (assoc v0 #{s}) (and removal-time (> removal-time 2.5) (= [200 nil] sent)) (assoc v1 #{s}))}))

(defn fuzz8 [n block seed]
  (let [r (Random. (long seed))]
    (doseq [blk (range (quot (+ n block -1) block))]
      (f/scope5 (if (= f/fuzz-boundary :commit) :commit :log) (= "1" (System/getenv "ERA3_SEALED"))
        (fn [name conn]
          (let [lo (* blk block) hi (min n (* (inc blk) block))
                results (vec (for [i (range lo hi)]
                               (try (schedule! name conn r i)
                                    (catch Throwable e
                                      (oracle! (str "F8 schedule " i) false (str "schedule stopped: " (.getMessage e)))
                                      nil))))
                gone (apply merge-with into (keep :gone results))]
            (a/block-checks! name conn (str "F8 block " blk) (or gone {}) {} #{})
            (println "ERA3_PROGRESS" mode (pr-str {:block blk :schedules hi :violations (count @a/violations)}))))))))

(defn main []
  (f/real-boundary!)
  (f/may-turn-on! false)
  (when (str/includes? (or (System/getenv "ERA3_PHASES") "fuzz8") "fuzz8")
    (fuzz8 (Long/parseLong (or (System/getenv "ERA3_N") "200"))
           (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1"))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY8" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations) :rule rc/replay-rule
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [x failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str x)))
    (shutdown-agents)
    (System/exit 0)))
