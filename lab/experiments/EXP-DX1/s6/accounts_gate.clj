(ns s6-accounts
  "[DX-S6] Command, operation and identity-block IDs across two accounts in the one database (the Publish builder's
  finding, PUBLISH-BESIDE-SAVES.md 0.2). With TX2_ACCOUNT_CLAIMS off: what one account can learn and deny about the
  other's IDs today. With it on: each account's results equal its results alone, and no lookup returns the other
  account's receipt, transaction ID, position or rows. Run by s6/clj-run.sh (settings accounts-off, accounts-on);
  each case prints one DX-S6_ACCOUNTS line."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference])
  (:import [java.util Random]))

(def on? (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS")))
(def counter (atom 4000000))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- line [m] (println "DX-S6_ACCOUNTS" (json/write-str m)))
(defn- block [n] (assoc (wide/identity-block :wide n) :kind :wide))
(defn- frame [conn spec]
  (second (fz/input-of {:seed 0 :counter counter} (merge {:source (head conn) :retires []} spec))))
(defn- send [name input account]
  (reference/send name (cond-> input account (assoc "account" account))))
(defn- claim [name id account] (:body (reference/route name "v1" "claim" (cond-> {"commandId" id "receipt" true} account (assoc "account" account)))))
(defn- command [name id account] (:body (reference/route name "v2" "command" (cond-> {"commandId" id} account (assoc "account" account)))))
(defn- main-route [name action query]
  (let [{:keys [status body]} ((requiring-resolve 'triplex.gateway.main/route-handler)
                               {:request-method :get :uri (str "/v1/db/" name "/" action) :query-string query})]
    {:status status :body (json/read-str (if (string? body) body (String. ^bytes body "UTF-8")))}))
(defn- operation [name id account]
  (:body (main-route name (str "operation/" id) (when account (str "account=" account)))))
(defn- tx-of [reply] (get-in reply [:body "operationId"]))

;; ---------------------------------------------------------------- 1. what one account learns and denies, by ID

(deftest one-account-against-the-others-ids
  (reference/in-scope
    (fn [name conn]
      (let [acct (fn [a] (when on? a))
            A "acct/a1/subject/s" B "acct/b1/subject/s"
            a-save (frame conn {:command "shared-command" :operation "shared-op" :block (block (swap! counter inc))
                                :facts [{:owner A :field ":a/f0" :type :string :value "a's value" :pred nil}]})
            a (send name a-save (acct "a1"))
            ;; [DX-S6b] Operation IDs have one stored form (S6 12.1): B shares A's command ID, not its operation ID.
            b-save (frame conn {:command "shared-command" :operation "b-own-op" :block (block (swap! counter inc))
                                :facts [{:owner B :field ":a/f0" :type :string :value "b's value" :pred nil}]})
            b (send name b-save (acct "b1"))
            a-tx (get-in a-save ["claims" 0 "txId"]) b-tx (get-in b-save ["claims" 0 "txId"])
            b-claim (claim name "shared-command" (acct "b1"))
            b-command (command name "shared-command" (acct "b1"))
            b-op (operation name "b-own-op" (acct "b1"))
            b-reuse (send name (frame conn {:command "b-other" :operation "shared-op" :block (block (swap! counter inc))
                                            :facts [{:owner B :field ":a/f1" :type :string :value "b" :pred nil}]}) (acct "b1"))
            plain-claim (claim name "shared-command" nil)
            r {:option on? :aSave (reference/outcome a) :bSave (reference/outcome b)
               :bClaimTxId (get b-claim "txId") :bCommandTxId (get b-command "txId") :bOperation (select-keys b-op ["status" "txId"])
               :claimWithoutAccount (get plain-claim "txId") :aTx a-tx :bTx b-tx
               :bReusingAsOperationId (reference/outcome b-reuse)}]
        (line (assoc r :case "two accounts use one command ID and one operation ID"))
        (is (= [200 nil] (:aSave r)))
        (if on?
          (do (is (= [200 nil] (:bSave r)) "with the option, B's save commits under its own IDs")
              (is (= b-tx (:bClaimTxId r) (:bCommandTxId r)) "B's lookups find B's transaction")
              (is (= b-tx (get-in r [:bOperation "txId"])) "B's operation lookup finds B's transaction")
              (is (nil? (:claimWithoutAccount r)) "a lookup naming no account finds neither scoped claim")
              (is (= [409 "OperationDuplicate"] (:bReusingAsOperationId r)) "an operation ID has one form: reusing it refuses only the reuser"))
          (do (is (= [409 "CommandConflict"] (:bSave r)) "without it, A's command ID denies B's save")
              (is (= a-tx (:bClaimTxId r) (:bCommandTxId r)) "without it, B's lookups return A's transaction")))))))

(deftest an-operation-id-taken-by-another-account-is-not-this-saves-receipt
  ;; The F1 shape: A's save has an unknown outcome; B (knowing A's operation ID) commits under it first. A's lookup must
  ;; not settle on B's transaction: the receipt names B's transaction ID, which is not A's journal.
  (reference/in-scope
    (fn [name conn]
      (let [acct (fn [a] (when on? a))
            b (send name (frame conn {:command "b-cmd" :operation "a-op" :block (block (swap! counter inc))
                                      :facts [{:owner "acct/b2/subject/s" :field ":a/f0" :type :string :value "b" :pred nil}]}) (acct "b2"))
            a-save (frame conn {:command "a-cmd" :operation "a-op" :block (block (swap! counter inc))
                                :facts [{:owner "acct/a2/subject/s" :field ":a/f0" :type :string :value "a" :pred nil}]})
            a (send name a-save (acct "a2"))
            looked (operation name "a-op" (acct "a2"))
            r {:option on? :b (reference/outcome b) :a (reference/outcome a) :aLookup (select-keys looked ["status" "txId"])
               :aJournal (get-in a-save ["claims" 0 "txId"])}]
        (line (assoc r :case "an operation ID another account committed first"))
        (is (= [409 "OperationDuplicate"] (:a r)))
        (is (not= (:aJournal r) (get-in r [:aLookup "txId"])) "the receipt names another transaction, which the SDK refuses to settle on")))))

(deftest legacy-plain-claims
  (if-not on?
    (println "DX-S6_SKIP legacy claims need TX2_ACCOUNT_CLAIMS=1")
    (reference/in-scope
      (fn [name conn]
        (let [old (frame conn {:command "legacy" :block (block (swap! counter inc))
                               :facts [{:owner "acct/a3/subject/s" :field ":a/f0" :type :string :value "old" :pred nil}]})
              written (send name old nil)                       ; a request naming no account: a plain claim
              tx (get-in old ["claims" 0 "txId"])
              mine (claim name "legacy" "a3") theirs (claim name "legacy" "b3")
              again (send name (frame conn {:command "legacy" :operation "legacy-again" :block (block (swap! counter inc))
                                            :facts [{:owner "acct/a3/subject/t" :field ":a/f0" :type :string :value "again" :pred nil}]}) "a3")
              other (send name (frame conn {:command "legacy" :operation "legacy-b" :block (block (swap! counter inc))
                                            :facts [{:owner "acct/b3/subject/s" :field ":a/f0" :type :string :value "b" :pred nil}]}) "b3")
              other-op (send name (frame conn {:command "b-own" :operation "legacy" :block (block (swap! counter inc))
                                               :facts [{:owner "acct/b3/subject/o" :field ":a/f0" :type :string :value "o" :pred nil}]}) "b3")
              reserved (send name (frame conn {:command "acct-id/v1/2/b3/x" :block (block (swap! counter inc))
                                               :facts [{:owner "acct/a3/subject/u" :field ":a/f0" :type :string :value "r" :pred nil}]}) "a3")
              wrong (send name (frame conn {:command "w" :block (block (swap! counter inc))
                                            :facts [{:owner "acct/a3/subject/w" :field ":a/f0" :type :string :value "w" :pred nil}]}) "b3")
              r {:written (reference/outcome written) :mine (get mine "txId") :theirs (get theirs "txId") :tx tx
                 :resendByOwner (reference/outcome again) :otherAccount (reference/outcome other) :otherAccountSameOperation (reference/outcome other-op)
                 :reservedPrefix (reference/outcome reserved) :wrongAccount (reference/outcome wrong)}]
          (line (assoc r :case "a legacy plain claim"))
          (is (= [200 nil] (:written r)))
          (is (= tx (:mine r)) "the account that wrote it still finds it")
          (is (nil? (:theirs r)) "another account does not")
          (is (= [409 "CommandConflict"] (:resendByOwner r)) "the owner cannot claim it twice")
          (is (= [200 nil] (:otherAccount r)) "another account's own claim of the same ID commits")
          (is (= [409 "OperationDuplicate"] (:otherAccountSameOperation r)) "an operation ID has one form, database-wide (S6 12.1)")
          (is (= [400 "InvalidValue"] (:reservedPrefix r)) "a client ID cannot forge a scoped value")
          (is (= [400 "InvalidValue"] (:wrongAccount r)) "a request cannot name an account it does not write"))))))

(deftest the-encoding-cannot-collide
  (let [rng (Random. 7) alphabet "ab/1_-x0"
        word (fn [lo hi] (apply str (repeatedly (+ lo (.nextInt rng (- hi lo))) #(.charAt alphabet (.nextInt rng (count alphabet))))))
        encode (requiring-resolve 'triplex.gateway.account-claims/encode)
        decode (requiring-resolve 'triplex.gateway.account-claims/decode)
        pairs (distinct (repeatedly 20000 #(vector (word 1 6) (word 0 8))))
        encoded (map (fn [[a i]] (encode a i)) pairs)]
    (line {:case "encoding" :pairs (count pairs) :distinctEncodings (count (distinct encoded))
           :roundTrips (count (filter (fn [[[a i] e]] (= [a i] (decode e))) (map vector pairs encoded)))})
    (is (= (count pairs) (count (distinct encoded))) "distinct pairs, distinct stored values (accounts and IDs with /)")
    (is (every? (fn [[[a i] e]] (= [a i] (decode e))) (map vector pairs encoded)))))

;; ---------------------------------------------------------------- 2. schedules: each account alone and together

(def kinds [:one-owner :several :creation :general :import])

(defn- step-input [conn kind owner-base n step command op blk model]
  (let [s (str owner-base "/subject/" n) p (str owner-base "/profile/" n)
        pred (fn [o f] (get-in model [o f]))
        v (str owner-base "|" n "|" step)]
    (case step
      :seed (frame conn {:command command :operation op :block blk
                         :facts [{:owner s :field ":a/f0" :type :string :value v :pred nil}
                                 {:owner s :field ":a/f1" :type :string :value v :pred nil}]})
      :seed-profile (frame conn {:command command :operation op :block blk
                                 :facts [{:owner p :field ":a/f0" :type :string :value v :pred nil}]})
      :main (case kind
              (:one-owner :general) (frame conn {:command command :operation op :block blk
                                                 :facts [{:owner s :field ":a/f0" :type :string :value v :pred (pred s ":a/f0")}]})
              :several (frame conn {:command command :operation op :block blk
                                    :facts [{:owner s :field ":a/f1" :type :string :value v :pred (pred s ":a/f1")}
                                            {:owner p :field ":a/f0" :type :string :value v :pred (pred p ":a/f0")}]})
              :creation (frame conn {:command command :operation op :block blk
                                     :facts [{:owner (str owner-base "/enrolment/" n) :field ":e/subject" :type :ref :value s :pred nil}
                                             {:owner (str owner-base "/enrolment/" n) :field ":e/status" :type :string :value v :pred nil}]})
              :import (assoc (frame conn {:command command :operation op :block blk
                                          :facts [{:owner (str owner-base "/subject/imp" n) :field ":a/f0" :type :string :value v :pred nil}]})
                             "writeClass" "import")))))

(defn- run-save [name conn kind input account]
  ((if (= kind :general) fz/general (fn [f] (f))) #(send name input account)))

(deftest each-account-alone-and-together
  (let [schedules (Long/parseLong (or (System/getenv "S6_ACCOUNT_SCHEDULES") "10000"))
        rng (Random. 99)]
    (reference/in-scope
      (fn [alone-a ca]
        (reference/in-scope
          (fn [alone-b cb]
            (reference/in-scope
              (fn [shared cs]
                (let [own-tx (atom {})
                      stats (atom {:schedules 0 :saves 0 :equal 0 :differ 0 :sharedBlockRefusals 0 :differences [] :kinds {}})
                      acct (fn [a] (when on? a))]
                  (dotimes [n schedules]
                    (let [kind (nth kinds (.nextInt rng (count kinds)))
                          share-block (< (.nextDouble rng) 0.1)
                          ;; Both accounts use the same command and operation IDs at every step; blocks are shared one
                          ;; schedule in ten (assertion IDs are database-wide by design).
                          steps (cond-> [:seed] (= kind :several) (conj :seed-profile) true (conj :main :resend))
                          blocks (into {} (for [s steps a ["a" "b"]] [[s a] (block (if (and share-block (= s :main)) (+ 9000000 n) (swap! counter inc)))]))
                          plan (for [s steps a ["a" "b"]] [s a])
                          ;; Shared order: a random interleaving that keeps each account's own order.
                          order (loop [as (filter #(= "a" (second %)) plan) bs (filter #(= "b" (second %)) plan) out []]
                                  (cond (and (empty? as) (empty? bs)) out
                                        (empty? as) (into out bs) (empty? bs) (into out as)
                                        (.nextBoolean rng) (recur (rest as) bs (conj out (first as)))
                                        :else (recur as (rest bs) (conj out (first bs)))))
                          outcome (atom {})
                          do-step (fn [scope-name conn [s a] where]
                                    (let [base (str "acct/" a n)
                                          model (if (= s :seed) {}
                                                  (into {} (for [o [(str base "/subject/" n) (str base "/profile/" n)]]
                                                             [o (fz/read-owner scope-name o {"validAt" 5.0})])))
                                          command (str "cmd-" n "-" (name (if (= s :resend) :main s)))
                                          op (str "op-" n "-" (name s) "-" a)
                                          input (step-input conn kind base n (if (= s :resend) :main s) command op (blocks [(if (= s :resend) :main s) a]) model)
                                          reply (run-save scope-name conn kind input (acct (str a n)))]
                                      (when (and (= where :shared) (= s :main) (= 200 (:status reply)))
                                        (swap! own-tx assoc [n a] (get-in input ["claims" 0 "txId"])))
                                      (swap! outcome assoc [where s a] (reference/outcome reply))))]
                      (doseq [st plan] (do-step (if (= "a" (second st)) alone-a alone-b) (if (= "a" (second st)) ca cb) st :alone))
                      (doseq [st order] (do-step shared cs st :shared))
                      (let [o @outcome
                            diffs (for [st plan :when (not= (o [:alone (first st) (second st)]) (o [:shared (first st) (second st)]))]
                                    {:step st :alone (o [:alone (first st) (second st)]) :shared (o [:shared (first st) (second st)])})
                            block-refusal (and share-block (every? #(= [400 "IdentityConflict"] (:shared %)) diffs) (seq diffs))]
                        (swap! stats (fn [m] (-> m (update :schedules inc) (update :saves + (* 2 (count plan)))
                                                 (update-in [:kinds kind] (fnil inc 0))
                                                 (update (cond (empty? diffs) :equal block-refusal :sharedBlockRefusals :else :differ) inc)
                                                 (update :differences #(if (and (seq diffs) (not block-refusal) (< (count %) 5)) (conj % {:n n :kind kind :diffs (vec diffs)}) %))))))))
                  ;; No lookup naming an account returns the other account's transaction.
                  ;; Every lookup of a committed main save, by its account: the claim, the command route and the
                  ;; operation route name that account's own transaction (never the other account's).
                  (let [foreign (atom 0) checked (atom 0)]
                    (doseq [[[n a] tx] @own-tx]
                      (let [account (acct (str a n))
                            found [(get (claim shared (str "cmd-" n "-main") account) "txId")
                                   (get (command shared (str "cmd-" n "-main") account) "txId")
                                   (get (operation shared (str "op-" n "-main-" a) account) "txId")]]
                        (swap! checked + 3)
                        (swap! foreign + (count (remove #(= tx %) found)))))
                    (swap! stats assoc :lookupsChecked @checked :lookupsNotOwn @foreign)
                    (when on? (is (= 0 @foreign) "no lookup returns another account's transaction")))
                  (line (assoc @stats :case "schedules" :option on?))
                  (if on?
                    (is (= 0 (:differ @stats)) (pr-str (:differences @stats)))
                    (is (pos? (:differ @stats)) "without the option, sharing IDs changes the other account's results")))))))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-accounts)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
