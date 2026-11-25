(ns s6-ids
  "[DX-S6b] One stored form per ID (SAVE-LINE-FIXES.md section 12).
  1. Static: every line of the gateway that writes or reads a stored operation or command ID, or chooses its form, is
     listed in s6/stored-id-sites.txt; a new or changed one fails until it is reviewed and listed.
  2. Every writer (one owner, several owners, creation, general, import frame) and the per-subject replan retry stores
     the operation ID as sent and the command ID in the form account-claims/stored-ids chose.
  3. The transition: a save naming its account prepared before the setting turns on and committed after is refused
     (replayable) and its replay is stored once, scoped.
  Run by s6/clj-run.sh (mode ids) with TX2_ACCOUNT_CLAIMS=1 (setting accounts-on). Each case prints DX-S6_IDS."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage]
            [triplex.gateway.account-claims :as ac]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 15000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- line [m] (println "DX-S6_IDS" (json/write-str m)))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- stored [conn attr] (let [db (d/db conn)] (set (map :v (d/datoms db :aevt (d/entid db attr))))))
(def encode (delay (requiring-resolve 'triplex.gateway.account-claims/encode)))

(deftest every-stored-id-site-is-listed
  (let [dir (io/file "/opt/gateway/src/triplex/gateway")
        skip #{"selftest.clj" "feed_live.clj"}
        pattern #":triplex.tx/operation-id|:triplex.claim/command-id|account-claims/apply-ids|account-claims/stored-ids|account-claims/encode|\(encode account"
        found (sort (for [f (.listFiles dir) :let [n (.getName f)]
                          :when (and (str/ends-with? n ".clj") (not (str/ends-with? n "_test.clj")) (not (skip n)))
                          l (str/split-lines (slurp f))
                          :when (re-find pattern l)
                          :when (not (re-find #"^\s*;;" l))]
                      (str n " " (str/replace (str/trim l) #"\s+" " "))))
        listed (sort (remove str/blank? (str/split-lines (slurp "/exp/s6/stored-id-sites.txt"))))
        added (remove (set listed) found) gone (remove (set found) listed)]
    (line {:case "stored-ID sites" :found (count found) :listed (count listed) :added (vec added) :gone (vec gone)})
    (is (empty? added) "a new place computes or reads a stored ID: review it and list it in s6/stored-id-sites.txt")
    (is (empty? gone) "a listed place changed or went away: review and update the list")))

(def kinds
  {"one owner" (fn [a n] [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value (str n) :pred :current}])
   "several owners" (fn [a n] [{:owner (str "acct/" a "/subject/s") :field ":a/f1" :type :string :value (str n) :pred :current}
                               {:owner (str "acct/" a "/profile/s") :field ":a/f0" :type :string :value (str n) :pred :current}])
   "creation" (fn [a n] [{:owner (str "acct/" a "/enrolment/" n) :field ":e/subject" :type :ref :value (str "acct/" a "/subject/s") :pred nil}])
   "general" (fn [a n] [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value (str n) :pred :current}])
   "import" (fn [a n] [{:owner (str "acct/" a "/subject/imp" n) :field ":a/f0" :type :string :value (str n) :pred nil}])})

(defn- with-preds [name facts]
  (vec (for [f facts] (if (= :current (:pred f)) (assoc f :pred (get (fz/read-owner name (:owner f) {"validAt" 5.0}) (:field f))) f))))

(deftest every-writer-stores-the-chosen-form
  (doseq [[kind facts-of] kinds setting-on [false true]]
    ;; Without the permission a save naming its account never turns the setting on (the setting-off case).
    (with-redefs [ac/permitted? setting-on]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "w" (swap! counter inc))
              seed (fn [n] (reference/send name (assoc (save conn {:command (str "seed-" n) :facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "s" :pred nil}
                                                                                                  {:owner (str "acct/" a "/subject/s") :field ":a/f1" :type :string :value "s" :pred nil}
                                                                                                  {:owner (str "acct/" a "/profile/s") :field ":a/f0" :type :string :value "p" :pred nil}]})
                                                       "unused" a)))
              s (seed 1)
              _ (when setting-on (is (= 200 (:status (reference/route name "v1" "settings" {"accountIds" true})))))
              cmd (str "cmd-" (swap! counter inc)) op (str "op-" (swap! counter inc))
              input (cond-> (assoc (save conn {:command cmd :operation op :facts (with-preds name (facts-of a 1))}) "account" a)
                      (= kind "import") (assoc "writeClass" "import"))
              reply ((if (= kind "general") fz/general (fn [f] (f))) #(reference/send name input))
              cmds (stored conn :triplex.claim/command-id) ops (stored conn :triplex.tx/operation-id)
              want (if setting-on (@encode a cmd) cmd)
              r {:kind kind :settingOn setting-on :seed (reference/outcome s) :answer (reference/outcome reply)
                 :writer (fz/writer-kind conn op reply) :commandStored (contains? cmds want) :otherCommandForm (contains? cmds (if setting-on cmd (@encode a cmd)))
                 :operationStoredAsSent (contains? ops op) :operationOtherForm (contains? ops (@encode a op))}]
          (line (assoc r :case "stored form by writer"))
          (is (= [200 nil] (:answer r)) (pr-str r))
          (is (:commandStored r) (pr-str r))
          (is (not (:otherCommandForm r)) (pr-str r))
          (is (:operationStoredAsSent r) (pr-str r))
          (is (not (:operationOtherForm r)) (pr-str r))))))))

(deftest a-save-across-the-transition
  ;; Prepared with the setting absent (plain command form and the guard), the setting turns on before its commit: it
  ;; is refused replayably; the replay (a new operation ID, the same command) is stored once, scoped.
  (doseq [kind ["one owner" "general" "creation"]]
    (with-redefs [ac/permitted? false]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "t" (swap! counter inc))
              _ (reference/send name (save conn {:command (str "seed-" a) :facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "s" :pred nil}]}))
              cmd (str "cmd-" (swap! counter inc))
              input (assoc (save conn {:command cmd :operation (str "op-" (swap! counter inc)) :facts (with-preds name ((kinds kind) a 1))}) "account" a)
              orig storage/submit! fired (atom false)
              reply ((if (= kind "general") fz/general (fn [f] (f)))
                     #(with-redefs [storage/submit! (fn [c data request timeline & more]
                                                      (when (compare-and-set! fired false true)
                                                        (with-redefs [ac/permitted? true]
                                                          (reference/route name "v1" "settings" {"accountIds" true})))
                                                      (apply orig c data request timeline more))]
                        (reference/send name input)))
              replay ((if (= kind "general") fz/general (fn [f] (f)))
                      #(reference/send name (assoc (save conn {:command cmd :operation (str "op-" (swap! counter inc)) :facts (with-preds name ((kinds kind) a 2))}) "account" a)))
              cmds (stored conn :triplex.claim/command-id)
              r {:kind kind :first (reference/outcome reply) :replay (reference/outcome replay)
                 :plainStored (contains? cmds cmd) :scopedStored (contains? cmds (@encode a cmd))}]
          (line (assoc r :case "a save across the transition"))
          (is (= [409 "CasConflict"] (:first r)) (pr-str r))
          (is (= [200 nil] (:replay r)) (pr-str r))
          (is (not (:plainStored r)) "no plain command stored after the setting turned on")
          (is (:scopedStored r))))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-ids)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
