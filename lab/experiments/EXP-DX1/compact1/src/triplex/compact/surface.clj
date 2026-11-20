(ns triplex.compact.surface
  (:require [clojure.data.json :as json]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.journal-rows :as journal]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.reverse :as reverse]
            [triplex.compact.store :as store]
            [triplex.gateway.lean :as lean]))

(defn affected! [source index fixtures]
  (doseq [{:strs [id input] :as fixture} fixtures]
    (let [account (oracle/account-of fixture)
          p (:position (oracle/run-case! source fixture))
          view (store/sync-view source)
          projector (reverse/open! index source account)
          writes (get input "writes")
          worlds (fn []
                   (mapv #(f/sorted-world (store/world source view account % :pinned p store/first-valid))
                         (reverse/candidates projector view p store/first-valid writes)))
          overlay (worlds)]
      (reverse/sync-to! projector view p)
      (let [projected (worlds)]
        (assert (= projected overlay))
        (floor/emit "projected-affected" {:case id :p p :through (reverse/through projector (d/db index))
                                          :candidateWorlds projected})))))

(defn journal! [source]
  (let [conn (:conn source) {revs :revs} (probe/compact-seed! source 3 160 1 true)
        enabled (store/with-journal! source)]
    (doseq [[i width] (map-indexed vector [1 3 25])]
      (let [req (probe/correction i (+ 10000 i) width (revs i))
            receipt (store/save! enabled req)
            db (store/sync-view enabled)
            p (:position receipt)
            tx (journal/tx-id (:account req) p)
            encoded (mapv first (d/q '[:find ?row :in $ ?id :where
                                       [?e :triplex.entity/id ?id] [?e :triplex.entity/row ?row]] db tx))
            rows (mapv lean/decode encoded)
            by-attribute (group-by :attribute rows)
            changes (mapv #(json/read-str (:value_json %) :key-fn keyword) (by-attribute ":_tx/change"))
            expected-pairs (set (map (fn [[e a v]] [(str "acct/" (:account req) "/" e) a v])
                                     (f/correction i (+ 10000 i) width)))
            expected-entities (set (map first expected-pairs))
            raw (probe/durable-tx! conn (:nativeT receipt))
            journal-attr (d/entid db :triplex.entity/row)]
        (oracle/require-receipt req (inc (revs i)) receipt)
        (assert (= (set encoded) (set (map :v (filter #(= journal-attr (:a %)) raw)))))
        (assert (every? #(and (= "_Transaction" (:entity_type %)) (= tx (:entity_id %))
                              (= p (:recorded_position %))) rows))
        (assert (= expected-entities (set (map :value_string (by-attribute ":_tx/changed-entity")))))
        (assert (every? #(= "ref" (:value_type %)) (by-attribute ":_tx/changed-entity")))
        (assert (= expected-pairs (set (for [c changes :when (= "assert" (:op c))]
                                         [(:entityId c) (:attribute c) (get-in c [:value :value])]))))
        (assert (= (set (map #(journal/fact-id (:account req) [(revs i) %]) (f/replace-ordinals width)))
                   (set (for [c changes :when (= "retract" (:op c))] (:tripleId c)))))
        (assert (= (+ (* 2 width) (count expected-entities) 3) (count rows)))
        (assert (= (+ (count rows) 12) (count raw)))
        (floor/emit "journal-census" (assoc (probe/census (:nativeT receipt) raw)
                                            :facts width :changedEntities (count expected-entities)
                                            :journalRows (count rows) :position p :nativeT (:nativeT receipt)))))))

(defn price! [source projection]
  (let [account "pricing" start (System/nanoTime)
        save (fn [root command p attr v retired]
               (store/save! source (f/input account root command p [[root attr v nil nil]] retired)))
        root (fn [i] (str "pl:p" i))]
    (doseq [i (range 64)]
      (let [r (save (root i) (str "seed-" i) 0 "location" "loc:a" [])]
        (assert (= (inc i) (:position r)))))
    (reverse/sync-to! projection (store/sync-view source) 64)
    (doseq [[index mode] (map-indexed vector (take 16 (cycle ["plain" "edge"])))]
      (let [after (+ 64 (* index 8))
            db (store/sync-view source)
            requests (mapv (fn [i]
                             (let [r (root (mod i 64))
                                   old (store/revision db account r)
                                   projection (store/current-projection source db account r)
                                   id (first (get-in projection [:fields ["" (get-in @store/w0 [:codes "location"])]]))]
                               (f/input account r (str "change-" i) old
                                        (if (= mode "edge") [[r "location" (if (odd? (quot i 64)) "loc:a" "loc:b") nil nil]]
                                            [[r "payRateCents" (+ 1600 i) nil nil]])
                                        (if (= mode "edge") [id]
                                            (or (vec (get-in projection [:fields ["" (get-in @store/w0 [:codes "payRateCents"])]])) [])))))
                           (range (* index 8) (* (inc index) 8)))
            result (store/commit-ready! source (mapv #(store/prepare source db %) requests))
            _ (doseq [[i r] (map-indexed vector (:outcomes result))]
                (oracle/require-receipt (requests i) (+ after i 1) r))
            [ms {:keys [mutations through report]}]
            (probe/timed #(reverse/advance! projection (:view result) (+ after 8)))
            lag (mapv #(- (* 1000 (System/currentTimeMillis)) (:recorded %)) (:outcomes result))
            datoms (probe/durable-tx! (:conn projection) (d/basis-t (:db-after report)))]
        (assert (= (if (= mode "edge") 16 0) mutations))
        (assert (= (:tx-data report) datoms))
        (assert (= through (+ after 8)))
        (floor/emit "projection-price" (merge (probe/census (d/basis-t (:db-after report)) datoms)
                                              {:mode mode :mutations mutations :members 8 :projectMs ms :lagMicros lag
                                               :elapsedMs (floor/ms (- (System/nanoTime) start))}))))))

(defn -main [& _]
  (let [fixtures (vec (filter #(= "affected" (get % "op")) (oracle/selected)))
        conn (floor/open! (floor/db-name "surface"))
        index (floor/open! (floor/db-name "projection"))
        source (store/open-store conn (store/test-vault) 64)]
    (store/provision! conn (concat (map oracle/account-of fixtures) f/accounts ["pricing"]))
    (affected! source index fixtures)
    (journal! source)
    (price! source (reverse/open! index source "pricing"))
    (floor/emit "surface-end" {:cases (count fixtures) :priceBlocks 16 :sourceT (d/basis-t (d/db conn))
                               :indexT (d/basis-t (d/db index))})
    (d/release index)
    (d/release conn))
  (shutdown-agents)
  (System/exit 0))
