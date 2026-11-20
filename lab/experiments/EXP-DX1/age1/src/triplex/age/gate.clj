(ns triplex.age.gate
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.age.adopt :as adopt]
            [triplex.age.native :as native]
            [triplex.age.tape :as tape]
            [triplex.gateway.group :as group]
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

(defn adopted-fidelity! [file pin clone]
  (let [seal (adopt/read-seal! file pin true)
        name (:name seal)
        product (adopt/scope-db name name)
        aged (adopt/scope-db name clone)
        pop (adopt/read-population! aged seal 3 true)
        seed (:seed-head pop)
        saves (* 4 (:active pop))
        cuts [0 1 (dec (:active pop)) (:active pop) (dec saves) saves]
        select-fields #(filterv (comp adopt/fields :attribute) %)]
    (equal! pop (adopt/read-population! product seal 3 true)
            "Restored seed identities, values, clock or record count differ")
    (doseq [n (range saves)
            :let [c (tape/command pop n)
                  reply (storage/commit! name (:conn product) (d/db (:conn product)) (tape/input c))]]
      (equal! (str (:position c)) (get-in reply [:position "v"]) "Product position differs")
      (equal! (:clock c) (get-in reply [:recordedAt "v"]) "Product clock differs"))
    (let [growth (native/age! aged pop 0 saves 16)]
      (doseq [n (range saves)
              :let [p (read-receipt product n)
                    q (read-receipt aged n)
                    receipt-t #(Long/parseLong (get-in % [:t "v"]))]]
        (equal! (dissoc p :t) (dissoc q :t) "Adopted logical receipt differs")
        (equal! (normalized-log product (receipt-t p)) (normalized-log aged (receipt-t q))
                "Adopted durable record bytes differ"))
      (doseq [i (range (:people pop))
              s (conj cuts nil)
              :let [position (some-> s (+ seed))
                    actual (person-view aged pop i position)]]
        (equal! (oracle-person pop i (or s saves)) (select-fields actual)
                "Adopted field oracle differs")
        (equal! (person-view product pop i position) actual "Adopted pin or current rows differ"))
      (doseq [[owner rows] (oracle-history pop saves)]
        (equal! (set rows) (set (select-fields (person-history aged owner))) "Adopted history differs")
        (equal! (set (person-history product owner)) (set (person-history aged owner))
                "Adopted history differs between paths"))
      (doseq [s (range 0 saves 7)
              cut [nil (+ seed (min saves (+ s 5)))]]
        (equal! (feed product (+ seed s) 7 cut) (feed aged (+ seed s) 7 cut)
                "Adopted journal feed differs"))
      (native/emit "adopted-fidelity"
                   {:source (:source seal) :manifestSha pin :seedRecords (:seed-records pop)
                    :facts (:facts seal) :seedT (:seed-t pop) :seedHead seed :saves saves
                    :accounts 10 :sample (:people pop) :growth growth :cuts cuts :dbs [name clone]}))))

(defn index-fixture! [file pin]
  (let [seal (adopt/read-seal! file pin true)
        db (adopt/scope-db (:name seal) (:name seal))
        pop (adopt/read-population! db seal 3 true)
        _ (d/request-index (:conn db))
        indexed (deref (d/sync-index (:conn db) (:seed-t pop)) 120000 nil)]
    (native/check! indexed "Seed did not index through the sealed cut" {:t (:seed-t pop)})
    (native/emit "fixture-cut" {:db (:name db) :manifestSha pin :t (:seed-t pop)})))

(defn report-datoms [report]
  (let [db (:db-after report) tx (d/t->tx (or (d/as-of-t db) (d/basis-t db)))]
    (frequencies
      (for [x (:tx-data report)
            :let [a (d/ident db (:a x))
                  entity #(if (= tx %) :native-tx (storage/value db % :triplex.entity/id))
                  ref? (= :db.type/ref (:db/valueType (d/entity db (:a x))))]]
        [(entity (:e x)) a (cond (= :db/txInstant a) :engine-time
                                ref? (entity (:v x))
                                :else (:v x)) (:added x)]))))

(defn group-reference! [{:keys [conn]} pop saves size]
  @(d/transact conn group/group-schema)
  (doseq [ns (partition-all size (range saves))
          :let [db (d/db conn)
                entries (mapv (fn [n]
                                (let [c (tape/command pop n)]
                                  {:id (:operation c) :prepare #(storage/tx-data % (tape/input c))})) ns)
                expected (group/evaluate db entries)]]
    (equal! (count ns) (count (filter :report expected)) "Product group member failed")
    @(d/transact conn (group/materialize db expected))))

(defn fidelity-arms! [setting]
  (let [pop (tape/population 27 3)
        saves (* 4 (:active pop))
        members 8
        arms (if (= setting "load")
               ["rolling"]
               ["burst" "rolling" "group" "product-group"])
        databases (into {} (for [label arms :let [db (native/open! label)]]
                             (do (native/seed! db pop) [label db])))
        reference (get databases "burst")]
    (when-let [db (get databases "group")] @(d/transact (:conn db) group/group-schema))
    (let [growth (into {} (for [[label db] databases :when (not= label "product-group")]
                           [label (case label
                                    "burst" (native/age! db pop 0 saves 64)
                                    "rolling" (native/age! db pop 0 saves 256 true)
                                    "group" (native/grouped-age! db pop 0 saves members))]))
          seed (tape/seed-head pop)
          cuts [0 1 7 8 9 (dec (:active pop)) (:active pop) (dec saves) saves]]
      (when-let [db (get databases "product-group")] (group-reference! db pop saves members))
      (doseq [[label db] databases
              i (range (:people pop))
              s (conj cuts nil)]
        (equal! (oracle-person pop i (or s saves)) (person-view db pop i (some-> s (+ seed)))
                (str label " oracle rows differ")))
      (doseq [[label db] databases
              [owner rows] (oracle-history pop saves)]
        (equal! (set rows) (set (person-history db owner)) (str label " history differs")))
      (doseq [n (range saves) :let [command (tape/command pop n)]
              [label db] databases
              :let [r (read-receipt db n) t (Long/parseLong (get-in r [:t "v"]))]]
        (equal! (str (:position command)) (get-in r [:position "v"]) "Arm receipt position differs")
        (equal! (:clock command) (get-in r [:recordedAt "v"]) "Arm receipt clock differs")
        (when (and reference (= label "rolling"))
          (equal! (normalized-log reference (Long/parseLong (get-in (read-receipt reference n) [:t "v"])))
                  (normalized-log db t) "Rolling pipeline altered stored records"))
        (when (and (= label "group") (zero? (mod n members)))
          (let [product (get databases "product-group")
                pt (Long/parseLong (get-in (read-receipt product n) [:t "v"]))
                get-report (fn [{:keys [conn]} t]
                             {:db-after (d/as-of (d/db conn) t)
                              :tx-data (:data (first (d/tx-range (d/log conn) t (inc t))))})]
            (equal! (report-datoms (get-report product pt))
                    (report-datoms (get-report db t)) "Native group differs from W1 physical records"))))
      (let [solo (or reference (get databases "rolling"))]
        (doseq [s (range 0 saves 17) pin [nil (+ seed (min saves (+ s 4)))]
                [label db] databases]
          (equal! (feed solo (+ seed s) 7 pin) (feed db (+ seed s) 7 pin)
                  (str label " feed page differs"))))
      (native/emit "fidelity-arms" {:setting setting :growth growth :saves saves :cuts cuts
                                    :active (:active pop) :arms arms :logicalDatoms
                                    (reduce + (for [n (range saves)] (+ 12 (* 4 (tape/width n pop)))))}))))

(defn -main [mode & args]
  (try
    (case mode
      "fidelity" (fidelity!)
      "adopted-fidelity" (apply adopted-fidelity! args)
      "index-fixture" (apply index-fixture! args)
      "fidelity-arms" (apply fidelity-arms! args)
      (throw (ex-info "Unknown gate" {:mode mode})))
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
