(ns erase1-parallel
  (:require [clojure.walk :as walk] [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.group-test :as fixture]
            [triplex.gateway.lean :as lean] [triplex.gateway.storage :as storage]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.write-policy :as policy]
            [triplex.gateway.erase :as erase] [wfix1-regression :as offers]))

(defn check! [ok message] (when-not ok (throw (ex-info message {}))))
(defn frame [name owner value prior position]
  (assoc (walk/postwalk-replace {fixture/root owner}
           (offers/edit-frame name name value 2.0 nil prior)) "sourceK" position))
(defn held-plan [name entered release build]
  (fn [db data input & sequence]
    (let [plan (apply build db data input sequence)]
      (when (= name (get input "operationId"))
        (deliver entered (boolean plan))
        (check! (deref release 10000 false) "Prepared save barrier was not released"))
      plan)))
(defn accepted! [name conn id expected]
  (let [receipt (offers/operation name id)
        row (some-> (lean/by-id (d/db conn) id) :v lean/decode)]
    (check! (= "committed" (get receipt "status")) "Save did not acquire a durable receipt")
    (check! (= expected (:value_string row)) "Save did not write the exact offered value")
    receipt))

(defn run! [name conn]
  (check! subject/enabled "Prepared writer is not installed for the gate")
  (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
    (let [a "acct/a/one" a2 "acct/a/two" b "acct/b/one"]
      (doseq [[i owner] (map-indexed vector [a a2 b])]
        (check! (= [200 nil] (offers/outcome (offers/send name (frame (str "seed" i) owner "previous" nil i))))
                "Cannot prepare distinct people"))
      (let [position (storage/head-position (d/db conn)) entered (promise) release (promise) build subject/plan
            r (with-redefs [subject/plan (held-plan "held-a" entered release build)]
                (let [leader (future (offers/send name (frame "held-a" a "a-new" "seed0" position)))]
                  (try
                    (check! (deref entered 5000 false) "Protected person never reached the prepared writer")
                    ;; [DX-ERASE1] Why: two independent receipts must settle while the first person's plan is suspended.
                    ;; Rejected: inferring independent progress from concurrent request starts.
                    (doseq [[id owner v prior] [["same-account" a2 "same-new" "seed1"] ["other-account" b "other-new" "seed2"]]]
                      (let [reply (deref (future (offers/send name (frame id owner v prior position))) 5000 nil)]
                        (check! reply "A different person could not settle while the first person was paused")
                        (check! (= [200 nil] (offers/outcome reply))
                                (str "Independent save was rejected: " (get-in reply [:body "code"])
                                     " " (get-in reply [:body "message"])))
                        (check! (= (str subject/ident) (get-in reply [:body "subjectSave"])) "Independent save did not use the per-person writer")
                        (accepted! name conn id v)))
                    (finally (deliver release true)))
                  (deref leader 5000 nil)))]
        (check! (= (str subject/ident) (get-in r [:body "subjectSave"])) "The suspended save did not use the prepared writer")
        (accepted! name conn "held-a" "a-new"))
      (let [position (storage/head-position (d/db conn)) entered (promise) release (promise) build subject/plan
            latest (with-redefs [subject/plan (held-plan "stale-after-removal" entered release build)]
                     (let [leader (future (offers/send name (frame "stale-after-removal" a "stale-new" "held-a" position)))]
                       (try
                         (check! (deref entered 5000 false) "Could not capture a prepared write before removal")
                         (let [record (offers/route name "v2" "erase" {"commandId" "parallel-removal" "selectors" [{"id" "same-account"}]})]
                           (check! (= [200 nil] (offers/outcome record)) "The removal did not publish")
                           (check! (= 1 (get-in record [:body "seq"])) "The removal sequence did not advance"))
                         (finally (deliver release true)))
                       (deref leader 5000 nil)))]
        (check! (= [409 "CasConflict"] (offers/outcome latest)) "The native writer accepted a stale removal sequence")
        (check! (= {"status" "absent"} (offers/operation name "stale-after-removal")) "The stale write obtained a receipt")
        {:database name :position (storage/head-position (d/db conn))
         :sameAccount (offers/operation name "same-account") :otherAccount (offers/operation name "other-account")
         :firstPerson (offers/operation name "held-a") :oldSequenceWrite (offers/outcome latest)}))))
