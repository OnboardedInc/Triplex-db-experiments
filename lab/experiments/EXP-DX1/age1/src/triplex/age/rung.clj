(ns triplex.age.rung
  (:require [datomic.api :as d]
            [clojure.java.io :as io]
            [datomic.measure.io-stats :as io-stats]
            [triplex.age.adopt :as adopt]
            [triplex.age.gate :as gate]
            [triplex.age.native :as native]
            [triplex.age.scale :as scale]
            [triplex.age.structure :as structure]
            [triplex.age.tape :as tape]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as gateway]
            [triplex.gateway.storage :as storage])
  (:import [java.nio.file Files Path]))

(defn current! [{:keys [conn]}]
  (let [db (deref (d/sync conn) 60000 nil)]
    (native/check! db "Database did not synchronize" {})
    db))

(defn db-for [pop]
  (let [name (get-in pop [:seal :name])]
    (adopt/scope-db name name)))

(defn save-state! [file state replace?]
  (adopt/persist! file (-> state
                           (assoc :probes (get-in state [:population :probes]))
                           (dissoc :population)) replace?))

(defn ledger-hash [file]
  (adopt/sha (Files/readAllBytes (Path/of file (make-array String 0)))))

(defn load-state! [file]
  (let [state (adopt/read-ledger file)
        seed-file (str file ".population.edn")
        _ (gate/equal! (:population-sha state) (ledger-hash seed-file) "Population row bytes differ")
        pop (adopt/read-ledger seed-file)]
    (gate/equal! (:manifest-sha state) (get-in pop [:seal :manifest-sha]) "Population manifest differs")
    (assoc state :population (assoc pop :probes (:probes state)))))

(defn adopt! [manifest pin file per-account]
  (let [seal (adopt/read-seal! manifest pin false)
        db (adopt/scope-db (:name seal) (:name seal))
        pop (adopt/read-population! db seal per-account true)
        settled (scale/index! (:conn db))
        records (scale/records! (:conn db))
        pop (assoc pop :seed-records records)
        seed-file (str file ".population.edn")
        state {:population pop :manifest-sha pin :observed 0 :t (:seed-t pop) :closed-rungs {}}]
    (if (.exists (io/file seed-file))
      (gate/equal! pop (adopt/read-ledger seed-file) "Interrupted adoption's ledger differs")
      (adopt/persist! seed-file pop false))
    (save-state! file (assoc state :population-sha (ledger-hash seed-file)) false)
    (native/emit "adopt" {:manifestSha pin :name (:name seal) :facts (:facts seal) :records records
                         :seedT (:seed-t pop) :settled settled :active (:active pop)
                         :sqlBytes (scale/bytes!)})))

(defn count-records [pop from through]
  (let [probe-delta
        (reduce-kv (fn [delta n probe]
                     (if (<= from n (dec through))
                       (+ delta (* 4 (- (:width probe) (tape/standard-width n pop)))) delta))
                   0 (or (:probes pop) {}))]
    ;; The width rotates by 1 across each round; every complete group of three saves
    ;; within one round contributes 60 records. Compute only each partial round edge.
    (loop [at from total probe-delta]
      (if (= at through) total
        (let [block (min (- through at) (- (:active pop) (mod at (:active pop))))
              edge (mod block 3)
              added (+ (* 60 (quot block 3))
                       (reduce + (for [j (range edge)] (+ 12 (* 4 (tape/standard-width (+ at j) pop))))))]
          (recur (+ at block) (+ total added)))))))

(defn end-for [pop target]
  (let [need (- target (:seed-records pop))]
    (if (<= need 0) 0
      (loop [lo 0 hi (inc (quot need 16))]
        (if (= (inc lo) hi) hi
          (let [mid (quot (+ lo hi) 2)]
            (if (>= (count-records pop 0 mid) need)
              (recur lo mid) (recur mid hi))))))))

(defn reconcile! [db pop state view]
  (let [start (:observed state)
        end (- (storage/head-position view) (tape/seed-head pop))
        bound (get state :pending-end start)
        id-attr (into {} (map (fn [a] [(d/entid view a) a]) native/attrs))]
    (native/check! (<= start end bound) "Unexpected database head outside admitted window"
                   {:checkpoint start :observed end :limit bound})
    (when (pos? start)
      (let [p (+ (tape/seed-head pop) start)]
        (gate/equal! (:t state) (adopt/exact-position-t view p) "Checkpoint native t differs")))
    (let [t (reduce
              (fn [previous n]
                (let [c (tape/command pop n)
                      at (adopt/exact-position-t view (:position c))
                      report {:db-after (d/as-of view at)
                              :tx-data (:data (first (d/tx-range (d/log (:conn db)) at (inc at))))}]
                  (first (native/acknowledge! c (native/render c) report previous id-attr))))
              (:t state) (range start end))]
      (assoc state :observed end :t t))))

(defn guard! [deadline]
  (native/check! (< (System/currentTimeMillis) deadline) "Rung deadline reached" {})
  (scale/local-limit!))

(defn advance! [file db start target deadline reserve]
  (let [pop (:population start) finish (end-for pop target) began (System/nanoTime)]
    (loop [state start segments []]
      (let [at (:observed state)]
        (if (>= at finish) [state segments]
          (let [chunk (if (empty? segments) 100000 25000)
                end (min finish (+ at chunk))]
            (guard! deadline)
            (save-state! file (assoc state :pending-end end) true)
            (let [result (native/age! db pop at end (min 256 (:active pop)) true)
                  state (-> state (assoc :observed end :t (:t result)) (dissoc :pending-end))
                  segment (assoc result :rung target :totalSeconds (/ (scale/ms began) 1000))]
              (save-state! file state true)
              (native/emit "load-segment" segment)
              (let [remaining (count-records pop end finish)
                    estimate (+ (System/currentTimeMillis)
                                (* 1000 (+ (/ remaining (:recordsPerSecond result)) reserve)))]
                (native/check! (or (zero? remaining) (< estimate deadline))
                               "Observed rate cannot reach target plus measurement reserve before deadline"
                               {:seconds (/ (- estimate (System/currentTimeMillis)) 1000)
                                :recordsPerSecond (:recordsPerSecond result) :remaining remaining}))
              (recur state (conj segments result)))))))))

(defn offers [seconds busy?]
  (let [quiet (for [i (range (quot (* seconds 7) 2))]
                {:due (quot (* i 2000000000) 7) :account 0 :width (inc (mod i 3))})
        others (when busy?
                 (for [i (range (quot (* seconds 93) 2))]
                   {:due (+ 2000000 (quot (* i 2000000000) 93))
                    :account (inc (mod i 9)) :width (inc (mod i 3))}))]
    (vec (sort-by (juxt :due :account) (concat quiet others)))))

(defn add-probes [pop start entries]
  (let [hist (reduce-kv (fn [a n {:keys [owner fields]}]
                          (if (>= (get-in a [owner :prior] -1) n) a
                            (assoc a owner {:prior n
                                            :fields (reduce #(assoc %1 %2 n) fields (range (tape/width n pop)))})))
                        {} (or (:probes pop) {}))]
    (first
      (reduce (fn [[p seen] [n {:keys [account width]}]]
                (let [i (+ (:active p) account)
                      old (get seen i {:fields {}})]
                  [(assoc-in p [:probes n] (assoc old :owner i :width width))
                   (assoc seen i {:prior n :fields (reduce #(assoc %1 %2 n) (:fields old) (range width))})]))
              [pop hist] (map vector (iterate inc start) entries)))))

(defn observe-window! [db pop start entries do-index? deadline]
  (let [{:keys [name conn]} db
        commands (mapv (fn [n offer] (let [c (tape/command pop n)] [c (tape/input c) offer]))
                       (iterate inc start) entries)
        wall-start (System/currentTimeMillis)
        clock (+ (System/nanoTime) 100000000)
        index (volatile! nil)
        seen (mapv (fn [i [c input {:keys [due account]}]]
                     (let [due (+ clock due)
                           _ (scale/park-until due)
                           began (System/nanoTime)
                           _ (when (zero? (mod i 128)) (guard! deadline))
                           _ (when (and do-index? (= i 4)) (vreset! index (future (scale/index! conn))))
                           ack (storage/commit! name conn (d/db conn) input)
                           end (System/nanoTime)
                           records (+ 12 (* 4 (:width c)))]
                       (gate/equal! [(:operation c) (str (:position c)) (:clock c) records]
                                    [(:operationId ack) (get-in ack [:position "v"])
                                     (get-in ack [:recordedAt "v"]) (:datoms ack)] "Timed receipt differs")
                       {:account account :t (Long/parseLong (get-in ack [:t "v"]))
                        :begin began :end end :records records :receiptMs (/ (- end due) 1e6)
                        :serviceMs (/ (- end began) 1e6)}))
                   (range) commands)
        job (when @index @@index)
        overlap (when job (filter #(and (< (:begin %) (:finished job)) (> (:end %) (:started job))) seen))
        slice (fn [rows] {:n (count rows) :receiptMs (scale/percentiles (map :receiptMs rows))
                          :serviceMs (scale/percentiles (map :serviceMs rows))})]
    {:all (slice seen) :quiet (slice (filter #(zero? (:account %)) seen))
     :index (some-> job (dissoc :started :finished)) :overlap (slice overlap)
     :receiptTs (mapv :t seen) :endT (:t (peek seen))
     :observedBy (System/getenv "AGE_ATTEMPT") :wallStart wall-start
     :wallEnd (System/currentTimeMillis)}))

(def phases [["low" false false] ["busy" true false] ["index-overlap" true true]])

(defn timed-windows! [file db state seconds deadline]
  (reduce (fn [current [label busy? index?]]
            (if (get-in current [:windows label]) current
              (let [from (:observed current)
                    entries (offers seconds busy?)
                    stop (+ from (count entries))
                    pop (add-probes (:population current) from entries)
                    pending (assoc current :population pop :pending-end stop :window label)
                    _ (save-state! file pending true)
                    result (observe-window! db pop from entries index? deadline)
                    checked (reconcile! db pop pending (current! db))
                    _ (gate/equal! [stop (:endT result)] [(:observed checked) (:t checked)]
                                   "Window log differs from fresh product replies")
                    done (-> checked
                             (assoc-in [:windows label] result)
                             (dissoc :pending-end :window))]
                (save-state! file done true)
                (native/emit "traffic-window" (assoc result :cell label :from from :to stop :seconds seconds))
                done)))
          state phases))

(defn read-probe! [db pop label i saves pinned?]
  (let [head (some-> (when pinned? saves) (+ (tape/seed-head pop)))
        began (System/nanoTime)
        result (io-stats/throw-if-ex!
                 (io-stats/with-io-stats #(gate/person-view db pop i head)
                                         {:io-context :dx-age1/pinned-task}))
        rows (:ret result)
        duration (scale/ms began)
        view (filterv (comp adopt/fields :attribute) rows)
        expected (->> (tape/expected-adopted pop i saves)
                      (map #(merge (zipmap lean/columns (repeat nil))
                                   {:retracted_at nil :retracted_position nil :retract_tx_id nil} %))
                      (sort-by :attribute) vec)]
    (gate/equal! expected view "Probe read differs from the seed and tape")
    {:cell label :cut head :count (count rows) :ms duration :io (:io-stats result)}))

(defn read-targets [pop n]
  (let [last-age (loop [i (dec n)] (if (contains? (:probes pop) i) (recur (dec i)) i))
        a (tape/owner-index pop last-age)
        idle (+ (:active pop) 10)]
    [["current-recent" a n false] ["current-year-idle" idle n false]
     ["pinned-recent" a (dec n) true] ["pinned-year-idle" idle (dec n) true]
     ["old-cut" a 0 true]]))

(defn verify-state! [state db]
  (let [view (if (:detached db) (d/db (:conn db)) (current! db))
        pop (:population state)]
    (gate/equal! (get-in pop [:seal :scope]) (gateway/stored-scope view)
                 "Stored scope differs from the seed")
    (gate/equal! (:observed state) (- (storage/head-position view) (tape/seed-head pop))
                 "Expected quiescent rung cut")
    (gate/equal! (:t state) (adopt/exact-position-t view (storage/head-position view))
                 "Expected rung physical cut")
    view))

(defn rung! [file target seconds deadline reserve]
  (gate/equal! 1000000000 target "The campaign targets one billion records")
  (let [previous (load-state! file)
        pop (:population previous)
        db (db-for pop)
        _ (native/check! (or (nil? (:target previous)) (= target (:target previous)))
                         "Previous rung needs to be sealed first" {:previous (:target previous)})
        state (reconcile! db pop previous (current! db))
        state (-> state
                  (assoc :target target)
                  (update-in [:population :probes]
                             #(into {} (filter (fn [[n _]] (< n (:observed state))) %)))
                  (dissoc :window :pending-end))]
    (if-let [frozen (or (:finished state) (get-in state [:closed-rungs target]))]
      (do
        (verify-state! state db)
        (gate/equal! [target (:t state)] [(:target frozen) (:t frozen)] "Frozen measurement targets a different cut")
        (native/emit "rung" frozen))
      (let [[loaded growth] (advance! file db state target deadline reserve)
            settling (or (:settle loaded) (scale/index! (:conn db)))
            aged-records (or (:aged-records loaded) (scale/records! (:conn db)))
            _ (native/check! (>= aged-records target) "Indexed record count is below target"
                             {:target target :observed aged-records})
            aged (assoc loaded :settle settling :aged-records aged-records)
            measured (timed-windows! file db aged seconds deadline)
            final (scale/index! (:conn db))
            end (:observed measured)
            pop (:population measured)
            read (fn [[label i n pin?]]
                   (let [observations (repeatedly 40 #(read-probe! db pop label i n pin?))]
                     [label {:ms (scale/percentiles (map :ms observations))
                             :io (mapv :io observations)}]))
            reads (into {} (map read (read-targets pop end)))
            feed (io-stats/throw-if-ex!
                   (io-stats/with-io-stats #(scale/timed-feed db pop end)
                                           {:io-context :dx-age1/feed-seven}))
            result {:records (scale/records! (:conn db)) :target target :agedRecords aged-records
                    :t (:t measured) :head (+ (tape/seed-head pop) end) :ageSegments (count growth)
                    :observedBy (System/getenv "AGE_ATTEMPT")
                    :windows (:windows measured) :reads reads :feed feed
                    :settle settling :finalIndex final :peerMemory (scale/peer-memory)
                    :sqlBytes (scale/bytes!)}]
        (save-state! file (assoc measured :finished result) true)
        (native/emit "rung" result)))))

(defn cold! [file label]
  (let [start (System/nanoTime)
        state (load-state! file)
        pop (:population state)
        db (db-for pop)
        connection (scale/ms start)
        [_ i n p] (first (filter #(= label (first %)) (read-targets pop (:observed state))))]
    (native/check! (some? i) "Unknown cold probe" {})
    (let [result (read-probe! db pop label i n p)]
      (verify-state! state db)
      (native/emit "cold" (assoc result :connectMs connection :t (:t state))))))

(defn inspect! [file manifest]
  (let [state (load-state! file)
        pop (:population state)
        db (db-for pop)
        view (current! db)
        durability (scale/sql (System/getenv "AGE_SQL_JDBC")
                     #(scale/string-query %
                        "select current_setting('fsync') || '|' || current_setting('synchronous_commit') || '|' || current_setting('full_page_writes')"))
        before (tape/seed-head pop)
        head (- (storage/head-position view) before)]
    (gate/equal! manifest (:manifest-sha state) "Rung refers to a different seed manifest")
    (gate/equal! "on|on|on" durability "SQL durability differs from the declared arm")
    (gate/equal! (get-in pop [:seal :scope]) (gateway/stored-scope view) "Seed scope differs")
    (native/check! (<= (:observed state) head (get state :pending-end (:observed state)))
                   "Rung head exceeds its pending write boundary" {:head head})
    (native/emit "inspect" {:records (+ (:seed-records pop) (count-records pop 0 head))
                            :db (:name db) :head (+ before head) :sqlBytes (scale/bytes!)
                            :sqlDurability durability
                            :finished (boolean (or (:finished state)
                                                   (some #(= (:t state) (:t %)) (vals (:closed-rungs state)))))
                            :seedRecords (:seed-records pop)})))

(defn structure! [file]
  (let [state (load-state! file)
        db (db-for (:population state))
        view (verify-state! state db)]
    (native/emit "structure" (structure/measure! view))))

(defn seal! [file target]
  (gate/equal! 1000000000 target "The campaign targets one billion records")
  (let [{:keys [finished closed-rungs] :as state} (load-state! file)
        db (db-for (:population state))]
    (verify-state! state db)
    (let [rung (or finished (get closed-rungs target))]
      (gate/equal! [target (:t state)] [(:target rung) (:t rung)] "Seal target or physical cut differs")
      (when finished
        (save-state! file (-> state (assoc-in [:closed-rungs target] finished)
                                   (dissoc :finished :windows :target :settle :aged-records)) true))
      (native/emit "seal-cut" (select-keys rung [:target :records :t :head])))))

(defn restore-check! [file t]
  (let [state (load-state! file)
        pop (:population state)
        name (get-in pop [:seal :name])
        physical (System/getenv "AGE_RESTORE_DB")
        _ (native/check! (and physical (re-matches #"age-restore-[a-f0-9-]{36}" physical))
                         "Restore name is not a private copy" {})
        uri (clojure.string/replace (System/getenv "AGE_RESTORE_URI_TEMPLATE") "{db}" physical)
        db {:name name :conn (d/connect uri) :detached true}
        end (:observed state)]
    (gate/equal! t (:t state) "Requested restore differs from rung")
    (verify-state! state db)
    (doseq [[label i n pin?] (read-targets pop end)] (read-probe! db pop label i n pin?))
    (scale/timed-feed db pop end)
    (let [r (gate/read-receipt db (dec end))]
      (gate/equal! t (Long/parseLong (get-in r [:t "v"])) "Restored last receipt differs"))
    (native/emit "restore-readback" {:t t :head (+ (tape/seed-head pop) end)})))

(defn -main [mode & args]
  (try
    (case mode
      "adopt" (let [[manifest pin file per-account] args]
                (adopt! manifest pin file (Long/parseLong per-account)))
      "rung" (let [[file target seconds deadline reserve] args]
               (rung! file (Long/parseLong target) (Long/parseLong seconds) (Long/parseLong deadline)
                      (Long/parseLong reserve)))
      "cold" (apply cold! args)
      "structure" (apply structure! args)
      "inspect" (apply inspect! args)
      "restore-check" (let [[file t] args] (restore-check! file (Long/parseLong t)))
      "seal" (let [[file target] args] (seal! file (Long/parseLong target)))
      (throw (ex-info "Unknown rung phase" {:mode mode})))
    (shutdown-agents)
    (System/exit 0)
    (catch Throwable e (.printStackTrace e) (System/exit 1))))
