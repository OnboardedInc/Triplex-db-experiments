(ns triplex.age.successor
  (:require [clojure.string :as str]
            [datomic.api :as d]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.scale :as scale]
            [triplex.age.tape :as tape]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.storage :as storage]))

(defn commit! [{:keys [name conn]} cmd]
  (storage/commit! name conn (d/db conn) (tape/input cmd)))

(defn carry! [old next pop cut]
  (let [view (storage/at-position (d/db (:conn old)) cut)
        old-tx (d/entid view [:triplex.tx/position cut])
        owners (mapv (fn [i]
                       (let [id (:owner (tape/person pop i))
                             e (d/entid view [:triplex.entity/id id])]
                         {:triplex.entity/id id :triplex.entity/rev (storage/value view e :triplex.entity/rev)
                          :triplex.entity/row (mapv :v (d/datoms view :eavt e :triplex.entity/row))}))
                     (range (:people pop)))]
    ;; [DX-AGE1] Why: preserve the original assertion bytes and the clock at the first common all-account cut.
    ;; Rejected: regenerating the carry as ordinary saves, which invents assertion IDs and a feed prefix.
    @(d/transact (:conn next)
       (conj owners {:db/id "datomic.tx" :triplex.tx/position cut :triplex.tx/id "age-cutover-anchor"
                     :triplex.tx/max-recorded-at (storage/value view old-tx :triplex.tx/max-recorded-at)}))))

(defn fence! [old view]
  (let [conn (:conn old)
        code '(if (= basis (d/basis-t db)) ops (throw (ex-info "DX_AGE_FENCE_STALE" {})))
        fid :age1/fence]
    @(d/transact conn [{:db/ident fid :db/fn (d/function {:lang :clojure :params '[db basis ops]
                                                         :requires '[[datomic.api :as d]] :code code})}])
    (let [current (d/db conn)
          t (d/basis-t current)
          frozen {:db/ident :triplex/commit :db/fn (d/function {:lang :clojure :params '[db payload]
                    :code '(throw (ex-info "DX_AGE_ERA_SEALED" {}))})}]
      (gate/equal! (storage/head-position view) (storage/head-position current) "Source advanced before cutover")
      @(d/transact conn [[fid t [frozen]]]))))

(defn source-at [{:keys [old next cut]} position]
  (if (and position (<= position cut)) old next))

(defn routed-person [{:keys [erased] :as router} pop i position]
  (if-let [{:keys [cut-rows owner-index]} @erased]
    (if (= i owner-index)
      (let [p (or position (storage/head-position (d/db (:conn (:next router)))))]
        ;; This report fixture preserves its tested marker cuts and refuses a missing inventory entry.
        (or (get cut-rows p) (throw (ex-info "Missing erased marker cut" {:position p}))))
      (gate/person-view (source-at router position) pop i position))
    (gate/person-view (source-at router position) pop i position)))

(defn routed-feed [{:keys [old next cut]} after limit]
  (let [old-page (when (< after cut) (gate/feed old after limit cut))
        left (- limit (count (get old-page "transactions")))
        next-page (when (pos? left) (gate/feed next (max after cut) left nil))]
    {"head" (storage/head-position (d/db (:conn next)))
     "transactions" (into (get old-page "transactions" []) (get next-page "transactions"))
     "clockEnds" (into (get old-page "clockEnds" []) (get next-page "clockEnds"))}))

(defn resend [{:keys [old next]} cmd]
  (let [receipt (storage/operation (d/db (:conn old)) (:operation cmd))]
    (if (= "committed" (:status receipt)) receipt (commit! next cmd))))

(defn erase-order! [{:keys [conn]} owner journals]
  (let [view (d/db conn)
        ids (mapv #(d/entid view [:triplex.entity/id %]) (cons owner journals))]
    (native/check! (every? some? ids) "Erasure target missing" {:targets (count ids)})
    (let [result @(d/transact conn (mapv (fn [e] {:db/id (d/tempid :db.part/user) :db/excise e
                                                  :db.excise/attrs [:triplex.entity/row]}) ids))
          t (d/basis-t (:db-after result))
          _ (d/request-index conn)
          db (deref (d/sync-excise conn t) 120000 nil)]
      (native/check! (and db (<= t (d/basis-t db))) "Excision did not adopt" {:t t})
      {:t t
       :remainingRows (reduce (fn [total e]
                                (reduce (fn [n _] (inc n)) total
                                        (d/datoms (d/history db) :eavt e :triplex.entity/row)))
                              0 ids)})))

(defn extract-row [row]
  (select-keys row [:id :entity_id :attribute :valid_from :valid_to :recorded_at :recorded_position :tx_id]))

(defn marker [erased-at row]
  (assoc (extract-row row) :value {:type "ErasedValue" :erasedAt erased-at}))

(defn raw-carrier? [view owner]
  (let [id (d/entid view [:triplex.entity/id owner])]
    (boolean (and id (seq (d/datoms view :eavt id :triplex.entity/row))))))

(defn raw-log-carrier? [{:keys [conn]} save-t owner]
  (boolean (some (fn [x] (and (string? (:v x)) (str/includes? (:v x) owner)
                              (str/includes? (:v x) "edit-")))
                 (:data (first (d/tx-range (d/log conn) save-t (inc save-t)))))))

(defn rehearse! []
  (let [pop (tape/population 2 2) old (native/open! "era-one") next (native/open! "era-two")
        seed (native/seed! old pop)
        per-round (:active pop)
        before (tape/command pop 0)
        _ (commit! old before)
        original (gate/read-receipt old 0)
        _ (doseq [n (range 1 per-round)] (commit! old (tape/command pop n)))
        old-view (d/db (:conn old))
        cut (storage/head-position old-view)
        router {:old old :next next :cut cut :erased (atom nil)}
        _ (carry! old next pop cut)
        _ (fence! old old-view)
        after (tape/command pop per-round)
        old-put (try (commit! old after) nil (catch Exception ex (ex-message ex)))
        _ (native/check! (and (string? old-put) (str/includes? old-put "DX_AGE_ERA_SEALED"))
                         "Archived product writer did not refuse stale route" {})
        reply (commit! next after)
        final (inc cut)
        head-saves (inc per-round)
        _ (gate/equal! (str final) (get-in reply [:position "v"]) "Successor did not continue the position")
        saved (resend router before)
        _ (gate/equal! original saved "A resend did not return the original native receipt")
        _ (gate/equal! final (storage/head-position (d/db (:conn next))) "Resend appended on the successor")
        old-pin (:position before)
        _ (doseq [i (range (:people pop))
                  [p n] [[old-pin 1] [cut per-round] [final head-saves] [nil head-saves]]]
            (gate/equal! (gate/oracle-person pop i n) (routed-person router pop i p) "Routed cut differs from tape"))
        first-page (routed-feed router (tape/seed-head pop) (+ 2 per-round))
        _ (scale/confirm-page! first-page pop 0 head-saves)
        full-page (get first-page "transactions")
        page-ends (get (routed-feed router (dec cut) 2) "transactions")
        page-shape (mapv (fn [n] [(tape/tx-id n) (+ (tape/seed-head pop) (inc n))]) (range head-saves))
        _ (gate/equal! page-shape (mapv #(subvec % 0 2) full-page) "Feed membership across the cut differs")
        _ (gate/equal! (subvec full-page (dec per-round)) page-ends "Feed resume at boundary differs")
        _ (doseq [[write result] (map vector (range head-saves) full-page)]
            (gate/equal! (set (map :id (:journal (tape/command pop write))))
                         (set (map (comp :id lean/decode) (nth result 2))) "Cross-era journal row keys differ"))
        i (:i before)
        erasure-clock (inc (:clock after))
        marker-cuts [old-pin final]
        ledger (into {} (for [p marker-cuts] [p (mapv #(marker erasure-clock %) (routed-person router pop i p))]))
        keep-i (inc i)
        unaffected (routed-person router pop keep-i nil)
        held-old (storage/at-position old-view old-pin)
        held-next (d/db (:conn next))
        old-erase (erase-order! old (:owner before) [(:tx before)])
        next-erase (erase-order! next (:owner before) [(:tx after)])
        fresh-remaining (+ (:remainingRows old-erase) (:remainingRows next-erase))
        held-leaks [(raw-carrier? held-old (:owner before)) (raw-carrier? held-next (:owner before))]
        log-leaks [(raw-log-carrier? old (Long/parseLong (get-in original [:t "v"])) (:owner before))
                   (raw-log-carrier? next (Long/parseLong (get-in reply [:t "v"])) (:owner before))]]
    ;; [DX-AGE1] Why: read the held and raw paths after excision and retain the actual failures.
    ;; Rejected: using the routed marker alone as evidence that the physical values disappeared everywhere.
    (reset! (:erased router) {:owner-index i :cut-rows ledger})
    (doseq [[p n] [[old-pin 1] [final head-saves] [nil head-saves]]]
      (gate/equal! (mapv #(marker erasure-clock %) (gate/oracle-person pop i n))
                   (routed-person router pop i p) "Erased marker identity differs"))
    (gate/equal! unaffected (routed-person router pop keep-i nil) "Excision removed an unaffected sibling")
    (native/emit "successor" {:accounts 14 :people (:people pop) :seedRecords seed :cut cut :head final
                             :oldPin old-pin :testedPersonCuts (* 4 (:people pop)) :feedEntries (count full-page)
                             :resendPosition (get-in saved [:position "v"]) :sealedWriterRefused true
                             :erasure {:oldT (:t old-erase) :nextT (:t next-erase)
                                       :markerCounts (mapv (comp count ledger) marker-cuts)
                                       :freshHistoricalRowsRemaining fresh-remaining
                                       :heldNativeReadsCarryValues held-leaks :nativeLogCarriesValues log-leaks
                                       :journalRowsLost (mapv (fn [[db p]]
                                                               (empty? (get-in (gate/feed db (dec p) 1 p) ["transactions" 0 2])))
                                                             [[old old-pin] [next final]])}})))

(defn -main [& _]
  (try
    (rehearse!)
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
