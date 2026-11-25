(ns s6-race
  "[DX-S6] F4, F9 and F11 at the gateway: a creation of a family a removal named before the entity existed (framed
  before and after the removal, the removal handled with and without the creation option), and the account rule of
  the several-owners and creation writers against group/classify. Each case prints one DX-S6_RACE line.
  Run by s6/clj-run.sh after s5/fuzz.clj is loaded."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.subject-create :as create]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 8000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- facts [owner tag n] (vec (for [i (range n)] {:owner owner :field (str ":a/f" i) :type :string :value (str tag "|" i) :pred nil})))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- line [m] (println "DX-S6_RACE" (json/write-str m)))
(defn- writer [reply] (get-in reply [:body "subjectSave"]))
(defn- protect! [name] (is (= 200 (:status (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})))))

(deftest creation-of-a-removed-family
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S6_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (doseq [removal-option [true false]]
      (reference/in-scope
        (fn [name conn]
          (protect! name)
          (let [x "acct/f4/subject/later"
                seeded (reference/send name (save conn {:command "seed" :facts (facts "acct/f4/subject/other" "o" 2)}))
                ;; Framed before the removal (its source is the head before the removal), sent after it.
                before-input (save conn {:command "create-before" :facts (conj (facts x "x" 3) {:owner x :field ":p/secret" :type :string :value "old value" :pred nil})})
                ;; The removal names x, which has no rows yet; handled by a gateway with or without the creation option.
                removed ((if removal-option (fn [f] (f)) (fn [f] (with-redefs [create/enabled false] (f))))
                         #(reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" x}]}))
                framed-before (reference/send name before-input)
                after-input (save conn {:command "create-after" :facts (conj (facts x "x" 3) {:owner x :field ":p/secret" :type :string :value "new value" :pred nil})})
                framed-after (reference/send name after-input)
                stored (fz/read-owner name x {"validAt" 5.0})
                r {:case "a creation of a family a removal named before the entity existed"
                   :removalOnGatewayWithCreationOption removal-option :removal (:status removed)
                   :framedBefore (reference/outcome framed-before) :framedAfter (reference/outcome framed-after)
                   :framedAfterWriter (writer framed-after) :storedSecret (get-in stored [":p/secret" :value])}]
            (line r)
            (is (= [200 nil] (reference/outcome seeded)))
            (is (= 200 (:status removed)))
            (is (= [409 "ErasureReplayDeclined"] (:framedBefore r)) [r "framed before the removal: refused whole (F4, F11)"])
            (is (= [200 nil] (:framedAfter r)) [r "framed after the removal: a new value, committed (F4)"])
            (is (= (str create/ident) (:framedAfterWriter r)) "the creation writer took it")
            (is (= "new value" (:storedSecret r)) "the new value, never the old one")))))))

(deftest account-rule-matches-classify
  ;; Two owners without the acct/ prefix whose stored :subject/account differ are two accounts for group/classify;
  ;; the several-owners writer must decline them (several-accounts) and the general writer commits.
  (doseq [[label accounts expect-fast] [["two stored accounts" ["a1" "a2"] false] ["one stored account" ["a1" "a1"] true]]]
    (reference/in-scope
      (fn [name conn]
        (let [[x y] ["task/f9x" "task/f9y"]
              _ (doseq [[o a] (map vector [x y] accounts)]
                  (is (= [200 nil] (reference/outcome (reference/send name (save conn {:command (str "seed-" o)
                                                                                         :facts (conj (facts o o 2) {:owner o :field ":subject/account" :type :string :value a :pred nil})}))))))
              m (into {} (for [o [x y]] [o (fz/read-owner name o {"validAt" 5.0})]))
              reply (reference/send name (save conn {:command "both" :facts [{:owner x :field ":a/f0" :type :string :value "n" :pred (get-in m [x ":a/f0"])}
                                                                             {:owner y :field ":a/f0" :type :string :value "n" :pred (get-in m [y ":a/f0"])}]}))
              r {:case "account rule" :kind label :outcome (reference/outcome reply) :writer (writer reply)
                 :declined (get-in reply [:body "subjectDeclined"])}]
          (line r)
          (is (= [200 nil] (:outcome r)))
          (if expect-fast
            (is (some? (:writer r)) [r "one stored account: the several-owners writer"])
            (is (and (nil? (:writer r)) (= "several-accounts" (:declined r))) [r "two stored accounts: declined"])))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-race)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
