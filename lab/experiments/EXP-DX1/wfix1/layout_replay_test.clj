(ns wfix1-layout-replay
  (:require [clojure.test :refer [deftest is]]
            [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.layout-replay :as replay]
            [triplex.gateway.storage :as storage]
            [wfix1-regression :as fixture]))

(deftest shape-c-uses-the-same-retraction-as-the-serial-writer
  (fixture/in-scope
   (fn [name conn]
     (let [[seed edit] (fixture/edits)]
       (is (= [200 nil] (fixture/outcome (fixture/send name seed))))
       (let [db (:db-after (d/with (d/db conn) (concat replay/replay-schema (replay/functions))))
             payload (second (first (storage/tx-data db edit)))
             reference (:report (replay/apply-one db "A" payload))
             expected (->> (replay/logical-delta reference)
                           (keep (fn [[_ row added]]
                                   (when (and added (= "edit-a/retract" (:id row)))
                                     (json/read-str (:value_json row)))))
                           first)
             text (get-in edit ["rowTexts" "edit-a/retract"])
             offset (+ 44 (count "edit-a/retract"))
             direct (lean/decode (replay/splice-row text offset 1001.0
                                   (fn [_] (json/write-str expected))))
             _ (is (= expected (json/read-str (:value_json direct))))
             spliced (:report (replay/apply-one db "C" payload))]
         (is (= (replay/logical-delta reference) (replay/logical-delta spliced))))))))
