(ns triplex.age.gate
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.native :as native]
            [triplex.age.tape :as tape]
            [triplex.gateway.journal :as journal]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.storage :as storage]))

(defn equal! [expected actual label]
  (when-not (= expected actual)
    (let [preview (fn [x] (let [s (pr-str x)] (subs s 0 (min 2400 (count s)))))]
      (throw (ex-info label {:expected (preview expected) :actual (preview actual)})))))

(defn person-view [{:keys [name conn]} pop i position]
  (->> (storage/read-rows name (d/db conn)
                         (cond-> {"entityIds" [(:owner (tape/person pop i))] "route" "live"}
                           position (assoc "basis" {"recordedPosition" position})))
       :rows (map storage/decode-row) (sort-by :attribute) vec))

(defn oracle-person [pop i saves]
  (let [missing (merge (zipmap lean/columns (repeat nil))
                       {:retracted_at nil :retracted_position nil :retract_tx_id nil})]
    (->> (tape/expected-person pop i saves) (map #(merge missing %))
         (sort-by :attribute) vec)))

(defn oracle-history [pop saves]
  (let [by-id (into {} (for [i (range (:people pop)), j (range (:fields (tape/person pop i)))
                             :let [r (tape/seed-row pop i j)]]
                         [(:id r) r]))
        rows (reduce (fn [records n]
                       (let [{:keys [prior fresh tx position clock]} (tape/command pop n)
                             updated (reduce (fn [acc row]
                                              (update acc (:id row) assoc :retract_tx_id tx
                                                      :retracted_position position :retracted_at clock)) records prior)]
                         (into updated (map (juxt :id identity)) fresh)))
                     by-id (range saves))
        nil-fields (merge (zipmap lean/columns (repeat nil))
                          {:retracted_at nil :retracted_position nil :retract_tx_id nil})]
    (group-by :entity_id (map #(merge nil-fields %) (vals rows)))))

(defn person-history [{:keys [name conn]} owner]
  (mapv storage/decode-row (:rows (storage/read-rows name (d/db conn) {"entityIds" [owner] "history" true}))))

(defn normalized-log [{:keys [conn]} t]
  (let [db (d/db conn) tx (d/t->tx t) item (first (d/tx-range (d/log conn) t (inc t)))]
    (equal! t (:t item) "Missing acknowledged transaction in durable log")
    (frequencies
      (for [x (:data item)
            :let [a (d/ident db (:a x))
                  entity (if (= (:e x) tx) :native-tx (storage/value db (:e x) :triplex.entity/id))]]
        (do
          (native/check! (and entity (= tx (:tx x))) "Unbound transaction datom" {:t t :attribute a})
          [entity a (if (= a :db/txInstant)
                      (do (native/check! (instance? java.util.Date (:v x)) "Invalid native instant" {:t t}) :engine-time)
                      (:v x)) (:added x)])))))

(defn feed [{:keys [name conn]} position limit pin]
  (dissoc (json/read-str (journal/page conn name (cond-> {"after" position "limit" limit}
                                                   pin (assoc "basis" {"recordedPosition" pin}))))
          "availableAt"))

(defn read-receipt [{:keys [conn]} n]
  (let [result (storage/operation (d/db conn) (tape/operation n))]
    (equal! "committed" (:status result) "Missing operation receipt")
    result))

(defn fidelity! []
  (let [pop (tape/population 3 3) saves (* 4 (:active pop))
        product (native/open! "reference") aged (native/open! "native")
        seed-head (tape/seed-head pop)
        seed-datoms (native/seed! product pop)]
    (equal! seed-datoms (native/seed! aged pop) "Seed census differs")
    (doseq [n (range saves)]
      (let [command (tape/command pop n)
            reply (storage/commit! (:name product) (:conn product) (d/db (:conn product)) (tape/input command))]
        (equal! (str (:position command)) (get-in reply [:position "v"]) "Product position differs")
        (equal! (:clock command) (get-in reply [:recordedAt "v"]) "Product logical clock differs")))
    (let [growth (native/age! aged pop 0 saves 16)
          counts (reduce
                   (fn [counts n]
                     (let [original (read-receipt product n) generated (read-receipt aged n)
                           read-t #(Long/parseLong (get-in % [:t "v"]))
                           from-product (normalized-log product (read-t original))
                           from-generator (normalized-log aged (read-t generated))
                           width (tape/width n pop)]
                       (equal! (dissoc original :t) (dissoc generated :t) "Logical receipt differs")
                       (equal! from-product from-generator "Durable log record bytes differ")
                       (equal! (+ 12 (* 4 width)) (reduce + (vals from-generator)) "Record census differs")
                       (update counts width (fnil inc 0))))
                   {} (range saves))
          cuts [0 1 (dec (:active pop)) (:active pop) (+ (:active pop) 12) (dec saves) saves]]
      (doseq [i (range (:people pop)) s cuts
              :let [p (+ seed-head s) expected (oracle-person pop i s)]]
        (equal! expected (person-view product pop i p) "Product pinned rows differ from tape")
        (equal! expected (person-view aged pop i p) "Generated pinned rows differ from tape"))
      (doseq [i (range (:people pop))
              :let [expected (oracle-person pop i saves)]]
        (equal! expected (person-view product pop i nil) "Product current rows differ from tape")
        (equal! expected (person-view aged pop i nil) "Generated current rows differ from tape"))
      (doseq [[owner expected] (oracle-history pop saves)]
        (equal! (set expected) (set (person-history product owner)) "Product historical rows differ from tape")
        (equal! (set expected) (set (person-history aged owner)) "Generated historical rows differ from tape"))
      (doseq [s (range 0 saves 7)
              pin [nil (+ seed-head (min saves (+ s 5)))]
              :let [page (feed product (+ seed-head s) 7 pin)
                    end (min (or (some-> pin (- seed-head)) saves) (+ s 7))
                    expected (mapv (fn [n] [(tape/tx-id n) (+ seed-head (inc n))]) (range s end))]]
        (equal! expected (mapv #(subvec % 0 2) (get page "transactions")) "Product feed differs from tape")
        (equal! (mapv (fn [[_ p]] [p p]) expected) (get page "clockEnds") "Feed clock boundaries differ")
        (equal! page (feed aged (+ seed-head s) 7 pin) "Feed rows or cursor differ"))
      (native/emit "fidelity" {:seedDatoms seed-datoms :saves saves :widthCounts counts
                                :growth growth :people (:people pop) :cuts cuts
                                :dbs [(:name product) (:name aged)]}))))

(defn -main [& [mode]]
  (try
    (case mode
      "fidelity" (fidelity!)
      (throw (ex-info "Unknown gate" {:mode mode})))
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
