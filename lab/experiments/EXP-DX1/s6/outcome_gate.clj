(ns s6-outcome
  "[DX-S6] F1: every failure on the commit path is decided (400 or 409, nothing stored) or unknown (503 OutcomeUnknown,
  the caller looks it up and the fence decides it). For every writer and every fault point: a stored save is never
  answered as refused, an unstored save is never found stored, and lookup plus fence give the true answer.
  Each case prints one DX-S6_OUTCOME line. Run by s6/clj-run.sh after s5/fuzz.clj is loaded."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 7000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- facts [owner tag n] (vec (for [i (range n)] {:owner owner :field (str ":a/f" i) :type :string :value (str tag "|" i) :pred nil})))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- line [m] (println "DX-S6_OUTCOME" (json/write-str m)))

(defn- anomaly [category message]
  (ex-info message {:cognitect.anomalies/category category :cognitect.anomalies/message message}))

(def faults
  "name -> [applies? (does the transactor apply the save) failure (nil: the deref times out)]"
  {"transactor unavailable before apply" [false (anomaly :cognitect.anomalies/unavailable "Transactor not available")]
   "transactor unavailable after apply" [true (anomaly :cognitect.anomalies/unavailable "Transactor not available")]
   "interrupted after apply" [true (anomaly :cognitect.anomalies/interrupted "Interrupted")]
   "datomic transactor-unavailable error after apply" [true (ex-info ":db.error/transactor-unavailable Transactor not available" {:db/error :db.error/transactor-unavailable})]
   "connection reset after apply" [true (java.util.concurrent.ExecutionException. (java.net.SocketException. "Connection reset"))]
   "connection reset before apply" [false (java.util.concurrent.ExecutionException. (java.net.SocketException. "Connection reset"))]
   "timeout exception after apply" [true (java.util.concurrent.ExecutionException. (java.util.concurrent.TimeoutException. "timed out"))]
   "unrecognised exception after apply" [true (RuntimeException. "something the gateway has never seen")]
   "unrecognised exception before apply" [false (IllegalStateException. "something the gateway has never seen")]
   "deref timeout, never applied" [false nil]
   "deref timeout, applied before the answer" [true nil]
   "deref timeout, original arrives after the fence" [:late nil]})

(defn- failing [e]
  (reify clojure.lang.IDeref (deref [_] (throw e))
    clojure.lang.IBlockingDeref (deref [_ _ _] (throw e))
    clojure.lang.IPending (isRealized [_] true)))

(defn- hanging []
  (reify clojure.lang.IDeref (deref [_] (throw (IllegalStateException. "unbounded deref")))
    clojure.lang.IBlockingDeref (deref [_ _ timeout] (Thread/sleep 100) timeout)
    clojure.lang.IPending (isRealized [_] false)))

(defn- with-fault
  "Runs f with the first transact-async replaced by the fault; returns [result held] where held is the original call
  for the :late case (applied by the caller after the fence)."
  [[applies? e] f]
  (let [orig d/transact-async fired (atom false) held (atom nil)]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (if (compare-and-set! fired false true)
                                       (cond
                                         (= :late applies?) (do (reset! held #(apply orig conn tx opts)) (hanging))
                                         applies? (let [fut (apply orig conn tx opts)]
                                                    (try (deref fut 10000 nil) (catch Throwable _ nil))
                                                    (if e (failing e) (hanging)))
                                         :else (if e (failing e) (hanging)))
                                       (apply orig conn tx opts)))]
      [(f) @held])))

(def S "acct/o1/subject/s") (def P "acct/o1/profile/s")
(def writers
  "name -> [fast? facts-fn]"
  {"one owner, per-subject writer" [true (fn [m] [{:owner S :field ":a/f0" :type :string :value "x" :pred (get-in m [S ":a/f0"])}])]
   "two owners, several-owners writer" [true (fn [m] [{:owner S :field ":a/f1" :type :string :value "y" :pred (get-in m [S ":a/f1"])}
                                                       {:owner P :field ":a/f0" :type :string :value "y" :pred (get-in m [P ":a/f0"])}])]
   "creation, creation writer" [true (fn [_] [{:owner "acct/o1/enrolment/e" :field ":e/subject" :type :ref :value S :pred nil}
                                              {:owner "acct/o1/enrolment/e" :field ":e/status" :type :string :value "active" :pred nil}])]
   "one owner, general writer" [false (fn [m] [{:owner S :field ":a/f0" :type :string :value "x" :pred (get-in m [S ":a/f0"])}])]})

(defn- fence [name id] (reference/route name "v1" "fence" {"operationId" id}))

(defn- resolve-like-the-sdk
  "The SDK's resolution: look up; when absent and not fenced, fence; the answer is committed or fenced."
  [name id]
  (let [op (reference/operation name id)]
    (if (or (= "committed" (get op "status")) (get op "fenced")) op (:body (fence name id)))))

(defn- run-case [writer-name fault-name]
  (let [[fast? facts-fn] (writers writer-name) fault (faults fault-name)]
    (reference/in-scope
      (fn [name conn]
        (doseq [[o tag] [[S "s"] [P "p"]]]
          (is (= [200 nil] (reference/outcome (reference/send name (save conn {:command (str "seed-" tag) :facts (facts o tag 3)}))))))
        (let [m (into {} (for [o [S P]] [o (fz/read-owner name o {"validAt" 5.0})]))
              input (save conn {:command "save" :facts (facts-fn m)})
              id (get input "operationId")
              before (head conn)
              [reply held] ((if fast? (fn [f] (f)) fz/general) #(with-fault fault (fn [] (reference/send name input))))
              kind (fz/writer-kind conn id reply)
              resolved (resolve-like-the-sdk name id)
              late (when held (try (let [r @(held)] {:late "committed" :t (d/basis-t (:db-after r))})
                                   (catch Exception e {:late "refused" :marker (re-find #"TRIPLEX_[A-Z_]+|unique-conflict" (str e))})))
              after-op (reference/operation name id)
              stored (= "committed" (get after-op "status"))
              resend (reference/send name input)
              next-save (reference/send name (save conn {:command "next" :facts [{:owner S :field ":a/f2" :type :string :value "z"
                                                                                  :pred (get-in (fz/read-owner name S {"validAt" 5.0}) [":a/f2"])}]}))
              r {:writer writer-name :submittedTo kind :fault fault-name :answer (reference/outcome reply)
                 :answerCause (get-in reply [:body "message"]) :resolved (select-keys resolved ["status" "fenced" "position"])
                 :late late :stored stored :headBefore before :headAfter (head conn)
                 :resend (reference/outcome resend) :nextSave (reference/outcome next-save)}]
          (line r)
          ;; The contract.
          (is (= [503 "OutcomeUnknown"] (:answer r)) [writer-name fault-name "an unknown outcome is answered 503"])
          (is (= stored (= "committed" (get resolved "status"))) [writer-name fault-name "lookup and fence give the truth"])
          (is (= (boolean (#{true} (first fault))) stored) [writer-name fault-name "stored exactly when the transactor applied it"])
          (when held (is (= "refused" (:late late)) [writer-name fault-name "the fenced original can never commit"]))
          (is (= 409 (first (:resend r))) [writer-name fault-name "a resend of the same operation is refused as a duplicate"])
          (is (= [200 nil] (:nextSave r)) [writer-name fault-name "the next save commits after a fence"])
          (is (= (+ before (if stored 1 0) 1) (head conn)) [writer-name fault-name "positions stay contiguous"])
          r)))))

(deftest every-writer-every-fault
  (let [results (vec (for [w (sort (keys writers)) f (sort (keys faults))] (run-case w f)))]
    (line {:summary "fault points" :cases (count results)
           :stored (count (filter :stored results)) :fenced (count (filter #(get-in % [:resolved "fenced"]) results))
           :answers (frequencies (map :answer results))})))

(deftest decided-refusals-stay-decided
  ;; A stale predecessor (CAS) and a reused operation ID are refusals: 409, nothing stored, no fence needed.
  (doseq [[writer-name [fast? facts-fn]] writers]
    (reference/in-scope
      (fn [name conn]
        (doseq [[o tag] [[S "s"] [P "p"]]]
          (reference/send name (save conn {:command (str "seed-" tag) :facts (facts o tag 3)})))
        (let [m (into {} (for [o [S P]] [o (fz/read-owner name o {"validAt" 5.0})]))
              stale (save conn {:command "stale" :facts (facts-fn m)})
              _ (reference/send name (save conn {:command "move" :facts (facts-fn m)}))
              reply ((if fast? (fn [f] (f)) fz/general) #(reference/send name stale))
              op (reference/operation name (get stale "operationId"))]
          (line {:case "decided refusal" :writer writer-name :answer (reference/outcome reply) :operation op})
          (is (= 409 (:status reply)) writer-name)
          (is (= "absent" (get op "status")) writer-name)
          (is (not (get op "fenced")) writer-name))))))

(deftest fence-leaves-feeds-and-positions-alone
  (reference/in-scope
    (fn [name conn]
      (let [a (reference/send name (save conn {:command "a" :facts (facts S "a" 2)}))
            f1 (fence name "never-sent-1")
            f2 (fence name "never-sent-1")
            b (reference/send name (save conn {:command "b" :facts (facts P "b" 2)}))
            taken (fence name (get-in a [:body "operationId"]))
            feed (reference/feed name 0 100)]
        (line {:case "fence" :first (:body f1) :again (:body f2) :ofCommitted (:body taken)
               :feedPositions (mapv #(vec (take 2 %)) feed)})
        (is (= [200 nil] (reference/outcome a)))
        (is (= [200 nil] (reference/outcome b)))
        (is (true? (get-in f1 [:body "fenced"])))
        (is (true? (get-in f2 [:body "fenced"])) "a second fence answers the same decided state")
        (is (= "committed" (get-in taken [:body "status"])) "a fence of a committed save answers its receipt")
        (is (= (get-in a [:body "position"]) (get-in taken [:body "position"])))
        (is (= 2 (count feed)) "the fence is not a change")))))

(deftest removal-and-declaration-unknown-outcomes
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S6_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (doseq [applies? [true false]]
      (reference/in-scope
        (fn [name conn]
          (let [orig d/transact armed (atom false) fired (atom false)
                fault (anomaly :cognitect.anomalies/unavailable "Transactor not available")
                faulty (fn [c tx]
                         (if (and @armed (compare-and-set! fired false true))
                           (if applies?
                             (let [f (orig c tx)] (try (deref f 10000 nil) (catch Throwable _ nil)) (failing fault))
                             (failing fault))
                           (orig c tx)))
                declared (with-redefs [d/transact faulty] (reset! armed true)
                           (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false}))
                declared-again (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
                seeded (reference/send name (save conn {:command "seed" :facts [{:owner S :field ":p/secret" :type :string :value "secret" :pred nil}]}))
                _ (reset! fired false)
                removal {"commandId" "remove-s" "selectors" [{"entityId" S "attribute" ":p/secret"}]}
                removed (with-redefs [d/transact faulty] (reference/route name "v1" "erase" removal))
                removed-again (reference/route name "v1" "erase" removal)
                frontier (reference/route name "v1" "erasure-frontier" nil)]
            (line {:case "removal and declaration" :transactorApplied applies?
                   :declared (reference/outcome declared) :declaredAgain (reference/outcome declared-again)
                   :seed (reference/outcome seeded)
                   :removed (reference/outcome removed) :removedAgain (reference/outcome removed-again)
                   :removedSeq (get-in removed-again [:body "seq"]) :frontierSeq (get-in frontier [:body "seq"])})
            (is (#{200 503} (:status declared)) "a declaration never answers a refusal for a transport failure")
            (is (= 200 (:status declared-again)) "the resend answers the decided state")
            (is (#{200 503} (:status removed)) "a removal never answers a refusal for a transport failure")
            (is (not= 400 (:status removed)))
            (is (= 200 (:status removed-again)) "the resend of the same command answers its receipt")
            (is (= 1 (get-in frontier [:body "seq"])) "exactly one removal stored")))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-outcome)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
