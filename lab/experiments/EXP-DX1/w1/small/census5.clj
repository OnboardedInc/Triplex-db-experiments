(ns w1.census5
  (:require [clojure.data.json :as json] [datomic.api :as d]
            [triplex.gateway.main :as gateway] [triplex.gateway.journal :as journal]
            [triplex.gateway.save-ledger :as ledger] [triplex.gateway.packed-journal :as packed]
            [triplex.gateway.small-row :as small] [triplex.gateway.storage :as storage]))

(load-file "lab/experiments/EXP-DX1/w1/field/field_probe.clj")
(load-file "lab/experiments/EXP-DX1/w1/small/native_cost.clj")
(require '[triplex.gateway.native-cost :as cost])

(def modes ["classic" "rows" "ledger" "packed"])
(defn cell [mode width]
  (let [suffix (str "census-" mode "-" width)
        [name conn] (cost/open suffix)
        apply! (fn [serial before]
                 (let [{:keys [fresh input]} (cost/correction width serial before width true)
                       r (storage/commit! name conn (d/db conn) input)
                       c (get-in r [:recordedAt "v"])]
                   [(mapv #(assoc % :recorded_at c) fresh) r input]))]
    (try
      (let [[old] (with-redefs [small/enabled false ledger/enabled false packed/enabled false] (apply! 1 []))
            [_ warm] (apply! 2 old)
            live (->> (:rows (storage/read-rows name (d/db conn) {"entityIds" [(str "acct/a" width "/p" width)]}))
                      (map storage/decode-row) (sort-by :attribute) vec)
            [_ r input] (apply! 3 live)
            db (d/db conn) t (Long/parseLong (get-in r [:t "v"])) tx (d/t->tx t)
            ds (filter #(= tx (:tx %)) (d/datoms (d/history db) :eavt))
            page (get (json/read-str (journal/page conn name {"after" 2 "limit" 1})) "transactions")
            values (reduce + (map #(cost/byte-count (if (string? (:v %)) (:v %) (pr-str (:v %)))) ds))]
        (assert (= "2" (get-in warm [:position "v"])))
        (assert (= width (count live)))
        (assert (= (get input "operationId") (:operationId r)))
        (assert (= (select-keys r [:position :t :operationId :recordedAt])
                   (select-keys (storage/operation db (:operationId r)) [:position :t :operationId :recordedAt])))
        (assert (= (:datoms r) (count ds)
                   (+ (case mode ("classic" "rows") 19 "ledger" 12 "packed" 12)
                      (* (if (= mode "packed") 2 4) width))))
        (assert (= (get-in input ["claims" 0 "txId"]) (ffirst page)))
        {:width width :mode mode :t t :position 3 :datoms (count ds) :valueBytes values :page page})
      (finally
        (gateway/delete-scope! nil (json/write-str ["triplex-scope-v1" "test" "small" (str (System/getenv "W1_ATTEMPT") "-" suffix) 0]))))))

(with-redefs [gateway/uri-template "datomic:mem://{db}"]
  (doseq [width [1 3]]
    (let [cells (mapv (fn [mode]
                        (with-redefs [small/enabled (not= mode "classic")
                                      ledger/enabled (contains? #{"ledger" "packed"} mode)
                                      packed/enabled (= mode "packed")]
                          (cell mode width))) modes)]
      (assert (apply = (map :page cells)))
      (doseq [c cells] (cost/emit "native-census" (dissoc c :page))))))
(shutdown-agents)
(System/exit 0)
