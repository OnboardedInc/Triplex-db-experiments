(ns wfix1-options
  (:require [clojure.test :refer [deftest is]]
            [datomic.api :as d]
            [triplex.gateway.commit :as commit] [triplex.gateway.main :as main]
            [triplex.gateway.predecessor :as pred]
            [wfix1-regression :as w]))

(deftest option-readback-requires-the-variant-on-the-opened-scope
  (with-redefs [pred/enabled false main/write-options-attempt "fixture-attempt"]
    (w/in-scope
     (fn [name conn]
       (let [stored (main/stored-scope (d/db conn))
             read-options #(let [reply (w/route name "v1" "write-options" nil)]
                             (is (= 200 (:status reply)))
                             (:body reply))
             control (read-options)]
         (is (= name (get control "database")))
         (is (= "fixture-attempt" (get control "attempt")))
         (is (= ":triplex/commit" (get control "commitFunction")))
         (is (false? (get-in control ["options" "predecessorLookup"])))
         (with-redefs [pred/enabled true]
           (let [before (read-options)]
             (is (true? (get-in before ["options" "predecessorLookup"])))
             (is (= ":triplex/commit" (get before "commitFunction")))
             (is (false? (:created (main/create-scope! nil stored "lean" true true))))
             (let [after (read-options)]
               (is (= (str (first (commit/variants [true false]))) (get after "commitFunction")))
               (is (true? (get after "commitFunctionInstalled")))
               (is (> (parse-long (get after "t")) (parse-long (get before "t"))))
               (is (= 0 (get before "position") (get after "position")))))))))))
