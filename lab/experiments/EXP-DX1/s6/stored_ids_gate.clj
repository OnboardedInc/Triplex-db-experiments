(ns s6-ids
  "[DX-S6b] One stored form per ID (SAVE-LINE-FIXES.md section 12).
  1. Static: every line of the gateway that writes or reads a stored operation or command ID, or chooses its form, is
     listed in s6/stored-id-sites.txt; a new or changed one fails until it is reviewed and listed.
  2. Every writer (one owner, several owners, creation, general, import frame) and the per-subject replan retry stores
     the operation ID as sent and the command ID in the form account-claims/stored-ids chose.
  3. The transition: a save naming its account prepared before the setting turns on and committed after is refused
     (replayable) and its replay is stored once, scoped.
  4. A build that does not know the setting (simulated: no stored-ids, no routing) is refused on every writer once
     the setting is on, and stores nothing; the writer functions moved to their twins.
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
  ;; Prepared with the setting absent (plain command form, the old function idents), the setting turns on before its
  ;; commit, moving the functions: it is refused replayably; the replay (a new operation ID, the same command) is stored once, scoped.
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

(deftest an-older-build-is-refused-once-the-setting-is-on
  (doseq [kind ["one owner" "several owners" "creation" "general"]]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "o" (swap! counter inc))
              seed (reference/send name (assoc (save conn {:command (str "seed-" a) :facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "s" :pred nil}
                                                                                            {:owner (str "acct/" a "/subject/s") :field ":a/f1" :type :string :value "s" :pred nil}
                                                                                            {:owner (str "acct/" a "/profile/s") :field ":a/f0" :type :string :value "p" :pred nil}]}) "account" a))
              on (with-redefs [ac/permitted? true] (reference/route name "v1" "settings" {"accountIds" true}))
              cmd (str "cmd-" (swap! counter inc)) op (str "op-" (swap! counter inc))
              input (save conn {:command cmd :operation op :facts (with-preds name ((kinds kind) a 1))})
              ;; An older build: it neither chooses stored IDs nor routes; it calls the writer functions by their idents.
              reply (with-redefs [ac/stored-ids (constantly nil) ac/on? (constantly false)]
                      ((if (= kind "general") fz/general (fn [f] (f))) #(reference/send name input)))
              db (d/db conn)
              moved (into (sorted-map) (for [[i] (d/q '[:find ?i :where [?e :db/fn] [?e :db/ident ?i]] db) :when (ac/swappable? i)]
                                         [(str i) (some? (d/entid db (ac/twin i)))]))
              cmds (stored conn :triplex.claim/command-id) ops (stored conn :triplex.tx/operation-id)
              r {:kind kind :seed (reference/outcome seed) :settingOn (:status on) :olderBuild (reference/outcome reply)
                 :operationStored (contains? ops op) :commandStored (or (contains? cmds cmd) (contains? cmds (@encode a cmd)))
                 :functionsMovedToTwins moved}]
          (line (assoc r :case "an older build once the setting is on"))
          (is (= [200 nil] (:seed r)))
          (is (= 200 (:settingOn r)))
          (is (= [409 "CasConflict"] (:olderBuild r)) (pr-str r))
          (is (not (:operationStored r)))
          (is (not (:commandStored r)))
          (is (every? true? (vals moved)) (pr-str moved)))))))

(deftest a-publish-shaped-write-is-its-accounts
  ;; [DX-S6b] The join layer's Publish writes its account's metadata (`lazy/account/<kind>/<account>`) and notice
  ;; documents (`notice:v1:...`, journals). Its account is the metadata's; two accounts' Publishes under one client ID
  ;; are each stored scoped; neither can read or take the other's; a lookup naming no account finds neither.
  (with-redefs [ac/permitted? true]
    (reference/in-scope
      (fn [name conn]
        (let [publish (fn [acct n] (assoc (save conn {:command "joined:release-1" :operation (str "pub-op-" acct)
                                                      :facts [{:owner (str "lazy/account/releases/" acct) :field ":lazy/head" :type :string :value (str n) :pred nil}
                                                              {:owner (str "notice:v1:" acct "-" n) :field ":lazy/notice" :type :string :value (str n) :pred nil}]})
                                     "account" acct))
              a (reference/send name (publish "pa.1" 1))
              b (reference/send name (publish "pb" 2))
              look (fn [acct] (:body (reference/route name "v1" "claim" (cond-> {"commandId" "joined:release-1" "receipt" true} acct (assoc "account" acct)))))
              cmds (stored conn :triplex.claim/command-id)
              r {:case "a Publish-shaped write" :a (reference/outcome a) :b (reference/outcome b)
                 :aScoped (contains? cmds (@encode "pa.1" "joined:release-1")) :bScoped (contains? cmds (@encode "pb" "joined:release-1"))
                 :plainStored (contains? cmds "joined:release-1")
                 :lookupA (get (look "pa.1") "txId") :lookupB (get (look "pb") "txId") :lookupOther (get (look "pc") "txId") :lookupNone (get (look nil) "txId")}]
          (line r)
          (is (= [200 nil] (:a r)) (pr-str r))
          (is (= [200 nil] (:b r)) (pr-str r))
          (is (and (:aScoped r) (:bScoped r) (not (:plainStored r))) (pr-str r))
          (is (and (some? (:lookupA r)) (some? (:lookupB r)) (not= (:lookupA r) (:lookupB r))) (pr-str r))
          (is (nil? (:lookupOther r)))
          (is (nil? (:lookupNone r))))))))

(deftest frames-and-the-enrolment-are-their-accounts
  ;; [DX-S6b] The Publish review's U3. A settlement frame writes only its account's documents; under the clear
  ;; namespace `notice:v2:<n>/<account>/...` it has an account, so another account taking its computable ID first
  ;; stores that under its own account and refuses nothing. The same for the enrolment's `join-held-enrolment:<a>`.
  ;; Under `notice:v1:<hash>:` (the account inside a hash) a frame has no account and keeps the plain form, so
  ;; another account taking its ID first refuses it: shown as the residual the join layer closes by moving to v2.
  (with-redefs [ac/permitted? true]
    (reference/in-scope
      (fn [name conn]
        (let [doc (fn [acct k] (str "notice:v2:" (count acct) "/" acct "/" k))
              write (fn [acct cmd op owners] (assoc (save conn {:command cmd :operation op
                                                                :facts (vec (for [o owners] {:owner o :field ":lazy/doc" :type :string :value op :pred nil}))})
                                               "account" acct))
              ;; B (pb) saves under A's (pa.1) next frame ID and enrolment ID first, each with its own names.
              b-frame (reference/send name (write "pb" "frame:values:7" "b-frame" [(doc "pb" "x")]))
              b-enrol (reference/send name (write "pb" "join-held-enrolment:pa.1" "b-enrol" ["lazy/account/origin/pb"]))
              a-frame (reference/send name (write "pa.1" "frame:values:7" "a-frame" [(doc "pa.1" "values") (doc "pa.1" "values/2")]))
              a-enrol (reference/send name (write "pa.1" "join-held-enrolment:pa.1" "a-enrol" ["lazy/account/origin/pa.1"]))
              ;; Every change, not some: a frame touching A's and B's documents has no account; named A it keeps the
              ;; plain form, and a later save of A under that ID is refused.
              mixed (reference/send name (write "pa.1" "frame:mixed" "mixed" [(doc "pa.1" "m") (doc "pb" "m")]))
              mixed-again (reference/send name (write "pa.1" "frame:mixed" "mixed-2" [(doc "pa.1" "m2")]))
              ;; The residual: a v1 frame (journals only) keeps a plain claim another account's write took first.
              b-v1 (reference/send name (save conn {:command "frame:v1" :operation "b-v1" :facts [{:owner "acct/pb/subject/s" :field ":a/f" :type :string :value "b" :pred nil}]}))
              a-v1 (reference/send name (write "pa.1" "frame:v1" "a-v1" ["notice:v1:abc:values"]))
              cmds (stored conn :triplex.claim/command-id)
              r {:case "frames and the enrolment" :bFrame (reference/outcome b-frame) :bEnrol (reference/outcome b-enrol)
                 :aFrame (reference/outcome a-frame) :aEnrol (reference/outcome a-enrol)
                 :aFrameScoped (contains? cmds (@encode "pa.1" "frame:values:7")) :aEnrolScoped (contains? cmds (@encode "pa.1" "join-held-enrolment:pa.1"))
                 :mixed (reference/outcome mixed) :mixedStoredPlain (contains? cmds "frame:mixed") :mixedAgain (reference/outcome mixed-again)
                 :v1TakenFirst (reference/outcome b-v1) :v1Frame (reference/outcome a-v1)}]
          (line r)
          (is (= [200 nil] (:bFrame r))) (is (= [200 nil] (:bEnrol r)))
          (is (= [200 nil] (:aFrame r)) (pr-str r)) (is (= [200 nil] (:aEnrol r)) (pr-str r))
          (is (and (:aFrameScoped r) (:aEnrolScoped r)) (pr-str r))
          (is (= [200 nil] (:mixed r))) (is (:mixedStoredPlain r))
          (is (= [409 "CommandConflict"] (:mixedAgain r)) "a plain claim of two accounts' names is no one account's")
          (is (= [200 nil] (:v1TakenFirst r)))
          (is (= [409 "CommandConflict"] (:v1Frame r)) "the residual, stated: a v1 frame has no account, so B's plain claim taken first refuses it"))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-ids)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
