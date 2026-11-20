(ns subject-conflicts
  (:require [clojure.test :refer [deftest is testing]]
            [clojure.walk :as walk]
            [datomic.api :as d]
            [subject-gate :as gate]
            [triplex.gateway.group :as group]
            [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as main]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject]
            [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as reference]))

(def other "acct/other/person")
(defn on [owner input]
  (walk/postwalk-replace {fixture/root owner} input))
(defn from [input k] (assoc input "sourceK" k))
(defn send-ok [name input]
  (let [reply (reference/send name input)]
    (is (= [200 nil] (reference/outcome reply)) (pr-str reply))
    (is (nil? (get-in reply [:body "subjectSave"])))
    reply))
(defn ref-write [name input]
  (with-redefs [subject/enabled false] (send-ok name input)))
(defn prepared [db input]
  (subject/plan db (storage/tx-data db input) input))

(defn seed [name]
  (let [[seed a b] (reference/edits)]
    (send-ok name (gate/deep-seed seed))
    (send-ok name (on other (reference/edit-frame "other-seed" "other-old" "other" 0.0 nil nil)))
    [(from a 2) (from b 3)]))

(defn race-before-submit
  "Publish a real competing transaction after certification, before sending the candidate."
  [name conn input competing expected]
  (let [prepare subject/plan native d/transact-async submitted (atom 0) id (input "operationId")]
    (with-redefs [subject/plan
                  (fn [db data request]
                    (let [plan (prepare db data request)]
                      (when (= id (request "operationId"))
                        (is (some? plan))
                        (competing))
                      plan))
                  d/transact-async
                  (fn [c tx & opts]
                    (when (= subject/ident (ffirst tx)) (swap! submitted inc))
                    (apply native c tx opts))]
      (let [reply (reference/send name input)]
        (is (= expected (reference/outcome reply)) (pr-str reply))))
    (is (= 1 @submitted))
    (is (= {"status" "absent"} (reference/operation name id)))
    (is (nil? (get (reference/claim name (get-in input ["claims" 0 "commandId"])) "receipt")))
    (is (not-any? #(= (get-in input ["claims" 0 "txId"]) (first %)) (reference/feed name 2 10)))))

(deftest ordered-block-collision-keeps-old-ids-reserved
  (when subject/ordered-ids?
    (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
      (reference/in-scope
        (fn [name conn]
          (let [[a] (seed name)
                input (gate/ordered-frame a gate/ordered-token)
                id (str gate/ordered-token "04")
                legacy #(on other (reference/edit-frame %1 %2 "legacy" 0.0 nil %3))]
            (is (true? (:subjectOrderedIds (main/write-options name))))
            (ref-write name (legacy "legacy-occupy" id nil))
            (ref-write name (legacy "legacy-retire" "replacement" id))
            (let [db (d/db conn)
                  input (from input 4)
                  plan (prepared db input)
                  ready (subject/ordered-bounds (:journal plan) (:prefixes plan))]
              (is (= (str "2001c" gate/ordered-token "00") (first ready)))
              (is (= ready (:ordered-bounds plan)))
              (is (nil? (lean/by-id db id)))
              (is (some? (lean/by-id (d/history db) id)))
              (is (= [400 "IdentityConflict"] (reference/outcome (reference/send name input))))
              (is (= {"status" "absent"} (reference/operation name "edit-a")))
              (is (= 4 (storage/head-position (d/db conn)))))))))))

(deftest lookup-only-hints-and-authoritative-cas
  (when subject/prefetch?
    (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
      (reference/in-scope
        (fn [name conn]
          (let [[a b] (seed name)
                lookup d/with
                hint subject/lookup-hints
                native d/transact-async
                attached (atom nil)
                first-ack (with-redefs [d/with
                                       (fn [db data & opts]
                                         (is (= subject/prefetch-ident (ffirst data)))
                                         (is (= [:return-hints true] (vec opts)))
                                         (let [result (apply lookup db data opts)]
                                           (is (some? (:hints result)))
                                           (is (every? #(= (d/entid db :db/txInstant) (:a %)) (:tx-data result)))
                                           (reset! attached (:hints result))
                                           result))
                                       d/transact-async
                                       (fn [c data & opts]
                                         (is (= subject/ident (ffirst data)))
                                         (is (identical? @attached (:hints (apply hash-map opts))))
                                         (apply native c data opts))]
                            (reference/send name a))]
            (is (= [200 nil] (reference/outcome first-ack)))
            (is (true? (get-in first-ack [:body "subjectHintsAttached"])))
            ;; [DX-PREP1] Why: a valid hint can survive a competing write but never its stale receipt.
            ;; Rejected: testing stale input only before hints existed.
            (with-redefs [subject/lookup-hints
                          (fn [db plan]
                            (let [hints (hint db plan)]
                              (is (some? hints))
                              (ref-write name (reference/edit-frame "after-hint" "hint-winner" "winner" 2.0 12.0 "middle"))
                              hints))]
              (is (= [409 "CasConflict"] (reference/outcome (reference/send name b)))))
            (is (= {"status" "absent"} (reference/operation name "edit-b")))
            (is (= 4 (storage/head-position (d/db conn))))))))))

(deftest dependency-matrix
  (with-redefs [subject/enabled true group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (testing "A true same-person writer changes the revision and invalidates the planned predecessor"
      (reference/in-scope
        (fn [name conn]
          (let [[a] (seed name)
                race (reference/edit-frame "race" "winner" "winner" 2.0 12.0 "old")]
            (race-before-submit name conn a #(ref-write name race) [409 "CasConflict"])
            (is (= 3 (storage/head-position (d/db conn))))
            (is (= "winner" (:value_string (lean/decode (:v (lean/by-id (d/db conn) "winner"))))))))))
    (when subject/numeric-owner?
      (testing "The resolved owner replaces only the business upsert and a renamed owner cannot commit"
        (reference/in-scope
          (fn [name conn]
            (let [[a] (seed name)
                  db (d/db conn)
                  plan (prepared db a)
                  owner (:owner plan)
                  prior (with-redefs [subject/numeric-owner? false] (prepared db a))
                  identity-map {:db/id (str "e:" fixture/root) :triplex.entity/id fixture/root}
                  first-row? (fn [key op]
                               (and (vector? op) (= [:db/add key :triplex.entity/row] (subvec op 0 3))))]
              (is (= fixture/root (:owner-key plan)))
              (is (nil? (:owner-key prior)))
              (is (some #{identity-map} (:ops prior)))
              (is (not-any? #{identity-map} (:ops plan)))
              (is (some (partial first-row? owner) (:ops plan)))
              (is (not-any? (partial first-row? (str "e:" fixture/root)) (:ops plan)))
              (is (some #(= (:journal plan) (:triplex.entity/id %)) (:ops plan)))
              (race-before-submit name conn a
                (fn []
                  @(d/transact conn [[:db/add owner :triplex.entity/id "reassigned-owner"]])
                  (is (= (:revision plan) (scope/value (d/db conn) owner :triplex.entity/rev))))
                [409 "CasConflict"])
              (is (= 2 (storage/head-position (d/db conn))))
              (is (nil? (d/entid (d/db conn) [:triplex.entity/id fixture/root]))))))))
    (testing "An unrelated logical append advances the clock and does not invalidate the prepared owner"
      (reference/in-scope
        (fn [name conn]
          (let [[a] (seed name) prepare subject/plan]
            (with-redefs [subject/plan (fn [db data input]
                                         (let [plan (prepare db data input)]
                                           (ref-write name (on other (reference/edit-frame "fresh-peer" "peer" "peer" 1.0 nil "other-old")))
                                           plan))]
              (let [reply (reference/send name a)]
                (is (= [200 nil] (reference/outcome reply)))
                (is (= (str subject/ident) (get-in reply [:body "subjectSave"])))
                (is (= "4" (get-in reply [:body "position" "v"])))
                (is (= 1003.0 (get-in reply [:body "recordedAt" "v"])))))))))
    (testing "A global ID already retired under another owner is still reserved"
      (reference/in-scope
        (fn [name conn]
          (let [[a] (seed name)
                edit (from (reference/edit-frame "reuse" "other-old" "stolen" 2.0 12.0 "old") 2)]
            (race-before-submit name conn edit
                        #(ref-write name (on other (reference/edit-frame "retire" "other-next" "next" 1.0 nil "other-old")))
                        [400 "IdentityConflict"])
            (is (= 3 (storage/head-position (d/db conn))))))))
    (testing "An already mismatched predecessor is decided by the reference writer"
      (reference/in-scope
        (fn [name conn]
          (let [[a] (seed name)
                input (from (reference/edit-frame "wrong-predecessor" "next" "next" 0.0 nil "absent") 2)]
            (is (nil? (prepared (d/db conn) input)))
            (is (= [409 "CasConflict"] (reference/outcome (reference/send name input))))
            (is (= 2 (storage/head-position (d/db conn))))))))
    (doseq [[label change] [["schema dictionary" (fn [db] [:db/add (scope/entity db) :triplex.scope/schema-hash "new-schema"])]
                            ["erase generation" (fn [db] [:db/add (scope/entity db) subject/erase-generation 1])]
                            ["excision request" (fn [db] {:db/excise (d/entid db [:triplex.entity/id fixture/root])
                                                          :db.excise/attrs [:triplex.entity/row]})]]]
      (testing label
        (reference/in-scope
          (fn [name conn]
            (let [[a] (seed name)]
              (race-before-submit name conn a #(deref (d/transact conn [(change (d/db conn))])) [409 "CasConflict"])
              (is (= 2 (storage/head-position (d/db conn)))))))))
    (testing "Point absence, cross-subject retirement and uniqueness predicates keep the reference cut"
      (doseq [[label alter competing]
              [["missing-before-insert" #(assoc % "scopeWide" true)
                (on other (reference/edit-frame "insert" "missing-id" "born" 0.0 nil nil))]
               ["shared target retirement" #(assoc % "entities" [fixture/root other])
                (on other (reference/edit-frame "retire" "other-next" "next" 1.0 nil "other-old"))]
               ["unique phantom" #(assoc % "scopeWide" true)
                (on other (reference/edit-frame "claim-value" "unique-new" "intermediate value" 0.0 nil nil))]]]
        (testing label
          (reference/in-scope
            (fn [name conn]
              (let [[a] (seed name) input (alter a)]
                (is (nil? (prepared (d/db conn) input)))
                (ref-write name competing)
                (is (= [409 "CasConflict"] (reference/outcome (reference/send name input))))
                (is (= {"status" "absent"} (reference/operation name (input "operationId"))))
                (send-ok name (from input 3))))))))))
