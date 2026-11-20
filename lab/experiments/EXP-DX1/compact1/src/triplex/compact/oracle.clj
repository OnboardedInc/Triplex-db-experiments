(ns triplex.compact.oracle
  (:require [clojure.data.json :as json]
            [clojure.java.io :as io]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.store :as store]))

(def cases-root "/compact/cases")
(defn decoded-case [file]
  (try (json/read-str (slurp file)) (catch Exception _ nil)))

(defn eligible? [fixture]
  (let [{:strs [op input expected]} fixture
        p (get-in input ["basis" "tx"])
        worlds (or (get input "worlds") [(get input "world")])]
    (and (#{"evaluate" "reconcile" "affected"} op) (map? expected) (not (contains? expected "error"))
         (integer? p) (<= 0 p 40)
         (every? some? worlds)
         (not-any? #(map? (get % "v")) (mapcat #(get % "facts") worlds)))))

(defn selected []
  (->> (.listFiles (io/file cases-root)) (sort-by #(.getName %)) (keep decoded-case) (filter eligible?) vec))

(defn account-of [fixture] (.toLowerCase ^String (get fixture "id") java.util.Locale/ROOT))

(defn seal-add [store account root [e a v from to :as row]]
  (if (true? (get (store/config e a) "pii"))
    [e a (store/seal-value! (:vault store) account root e a from to v) from to]
    row))

(defn require-receipt [request expected r]
  (assert (and (= expected (:position r)) (= (:command request) (:command r))
               (= (:account request) (:account r)) (= (:root request) (:subject r))
               (= 0 (:epoch r)) (pos? (:recorded r)) (pos? (:nativeT r))))
  (assert (= (:fingerprint r) (store/command-fingerprint (:account request) (:root request) (:command request)
                                                        (:expected request) (:adds request) (:retires request) (:meta request))))
  r)

(defn put! [store request p]
  (let [r (require-receipt request p (store/save! store request))
        db (d/db (:conn store))]
    (assert (= r (store/receipt db (:account r) (:command r))))
    (assert (= p (store/position-at db (:account r) (:recorded r))))
    r))

(defn run-case! [store fixture]
  (let [{:strs [id op input]} fixture account (account-of fixture)
        worlds (or (get input "worlds") [(get input "world")])
        facts (distinct (mapcat #(get % "facts") worlds))
        grouped (group-by (juxt #(get % "tx") #(store/owner (get % "e"))) facts)
        units (concat (for [[[p root] items] grouped] [p root items nil])
                      (map (fn [a] [(get a "tx") "loc:release" [] a]) (get input "activations")))
        units (sort-by (fn [[p e _ a]] [p e (get a "from" "") (get a "release" "")]) units)
        planned (reduce (fn [out [p root items activation]]
                          (conj out {:original p :root root :facts items
                                     :activation activation :position (max p (inc (:position (peek out) 0)))})) [] units)
        final (max (get-in input ["basis" "tx"]) (:position (peek planned) 0))
        by-position (into {} (map (juxt :position identity) planned))
        revs (volatile! {})]
    (doseq [p (range 1 (inc final))]
      (let [{:keys [root facts activation] :or {root "loc:padding"}} (get by-position p)
            rows (mapv #(seal-add store account root [(get % "e") (get % "a") (get % "v") nil nil]) facts)
            request (cond-> (f/input account root (str "case-" p) (get @revs root 0) rows [])
                      activation (assoc :meta ["publish" (dec p) (get activation "from") (get activation "release") "census" "tail" "w0-v1"]))]
        (put! store request p)
        (vswap! revs assoc root p)))
    (let [latest (store/sync-view store)
          valid (get-in input ["basis" "validTime"])
          read-all (fn [mode] (mapv #(f/sorted-world (store/world store latest account (get % "subject") mode final valid)) worlds))
          feed (store/feed store latest account 0 256)
          activations (vec (for [{:keys [metadata position]} feed :when (= "publish" (first metadata))]
                            {:from (nth metadata 2) :release (nth metadata 3) :tx position}))]
      (assert (= (mapv :position feed) (vec (range 1 (inc final)))))
      (assert (= (mapv :command feed) (mapv #(str "case-" %) (range 1 (inc final)))))
      (floor/emit "oracle-case" {:case id :op op :position final :validTime valid :nativeT (d/basis-t latest)
                                 :pinned (read-all :pinned) :current (read-all :current) :activations activations}))))

(defn rejected? [code f]
  (try (f) false (catch clojure.lang.ExceptionInfo e (= code (:code (ex-data e))))))
(defn read-world [store account root mode p v]
  (f/sorted-world (store/world store (store/sync-view store) account root mode p v)))

(defn temporal! [store]
  (let [account "time-a" other "time-b" root "pl:p" b "pl:q"
        m "2026-10-31T22:00:00.000001Z" n "2026-10-31T22:00:00.000002Z"
        old (f/input account root "initial" 0 [[root "weeklyMinutes" 2000 nil nil]] [])
        r1 (put! store old 1)
        edit (f/input account root "edit" 1 [[root "weeklyMinutes" 2000 nil m]
                                            [root "weeklyMinutes" 2600 m n]
                                            [root "weeklyMinutes" 2000 n nil]] [[1 0]])
        same-owner (f/input account root "stale" 1 [] [])
        sibling (f/input account b "sibling" 0 [[b "weeklyMinutes" 3000 nil nil]] [])
        alien (f/input other root "edit" 0 [[root "weeklyMinutes" 500 nil nil]] [])
        before (store/sync-view store)
        prepared (mapv #(store/prepare store before %) [edit alien same-owner sibling edit])
        original store/tx!
        committed-native (volatile! nil)
        ;; [DX-COMPACT1] Why: discard a reply after a real grouped append, then redeliver the original prepared requests.
        ;; Rejected: synthesizing OutcomeUnknown without committing or testing only an insertion resend.
        lost? (with-redefs [store/tx! (fn [conn data]
                                       (vreset! committed-native (original conn data))
                                       (store/reject :OutcomeUnknown))]
                (rejected? :OutcomeUnknown #(store/commit-ready! store prepared)))
        _ (assert (and lost? @committed-native))
        committed (store/commit-ready! store prepared)
        [r2 rb conflict r3 duplicate] (:outcomes committed)]
    (assert (nil? (:report committed)))
    (assert (= (d/basis-t (:db-after @committed-native)) (d/basis-t (:view committed))))
    (require-receipt edit 2 r2)
    (require-receipt sibling 3 r3)
    (require-receipt alien 1 rb)
    (assert (= r2 duplicate))
    (assert (= {:error "Conflict"} conflict))
    (assert (= (:nativeT r2) (:nativeT r3) (:nativeT rb)))
    (assert (< (:recorded r1) (:recorded r2) (:recorded r3)))
    (assert (= r2 (store/save! store edit)))
    (assert (= {:error "IdempotencyConflict"} (store/save! store (assoc edit :retires []))))
    (let [latest (store/sync-view store)
          a-feed (store/feed store latest account 1 1)
          h (store/history store latest account root)]
      (assert (= 3 (store/head-position latest account)))
      (assert (= 1 (store/head-position latest other)))
      (assert (= [2 3] (mapv #(store/position-at latest account %) [(:recorded r2) (:recorded r3)])))
      (assert (= [0 1 2] (mapv #(store/position-at latest account (dec %)) [(:recorded r1) (:recorded r2) (:recorded r3)])))
      (assert (= [2] (mapv :position a-feed)))
      (assert (= [3] (mapv :position (store/feed store latest account 2 1))))
      (assert (= [1] (mapv :position (store/feed store latest other 0 1))))
      (let [common {:e root :a "weeklyMinutes"}
            assertion (fn [i v from to]
                        (merge common {:op "assert" :id [2 i] :v v :from from :to to :recordedAt (:recorded r2)}))
            retirement (merge common {:op "retire" :id [1 0] :v 2000 :from nil :to nil
                                      :recordedAt (:recorded r1) :retiredAt (:recorded r2)})]
        (assert (= [(assertion 0 2000 nil m) (assertion 1 2600 m n) (assertion 2 2000 n nil) retirement]
                   (:changes (first a-feed)))))
      (assert (= 2 (:retiredPosition (first h))))
      (assert (= (:recorded r2) (:retiredAt (first h))))
      (assert (empty? (:facts (read-world store account b :pinned 2 m))))
      (assert (empty? (:facts (read-world store other b :current 1 m))))
      (assert (= 3000 (get-in (read-world store account b :pinned 3 m) [:facts 0 :v])))
      (assert (= 500 (get-in (read-world store other root :current 1 m) [:facts 0 :v])))
      (assert (rejected? :WrongOwner #(store/save! store (f/input account b "wrong-owner" 3 [[root "weeklyMinutes" 99 nil nil]] []))))
      (assert (rejected? :InvalidValue #(store/save! store (f/input account root "wrong-type" 2 [[root "weeklyMinutes" 10081 nil nil]] []))))
      (assert (rejected? :CardinalityConflict #(store/save! store (f/input account root "overlap" 2 [[root "weeklyMinutes" 10 nil nil]] []))))
      (assert (rejected? :InvalidValidity #(store/save! store (f/input account root "empty-interval" 2 [[root "weeklyMinutes" 10 m m]] []))))
      (assert (rejected? :BasisUnavailable #(read-world store account root :pinned 4 m)))
      (let [reads (vec (for [[p mode valid expected] [[0 :pinned m nil] [1 :pinned m 2000] [2 :pinned m 2600]
                                                       [2 :pinned n 2000] [3 :current m 2600] [3 :current n 2000]]
                             :let [world (read-world store account root mode p valid)]]
                         (do (assert (= expected (get-in world [:facts 0 :v])))
                             {:position p :mode mode :validTime valid :world world})))]
        (floor/emit "temporal-witness" {:reads reads :history h :receipt r2 :initial r1 :other rb :sibling r3
                                         :nativeDatoms (count (:tx-data @committed-native)) :feed a-feed})))))

(defn erasure! [store]
  (let [account "erase-a" root "pl:a" other "pl:b" a "ssn" vault (:vault store)
        raw "fixture-erasure-marker"
        seal (fn [person] (store/seal-value! vault account person person a nil nil raw))
        in (f/input account root "sensitive" 0 [[root a (seal root) nil nil]] [])
        r1 (put! store in 1)
        _ (put! store (f/input account other "other" 0 [[other a (seal other) nil nil]] []) 2)
        before (store/sync-view store)
        erased (assoc (f/input account root "erase" 1 [] []) :meta ["erase"])
        cut (read-world store account root :pinned 1 f/now-valid)
        r3 (put! store erased 3)
        latest (store/sync-view store)
        marker {:erasedAt (store/instant-text (:recorded r3))}
        after (read-world store account root :pinned 1 f/now-valid)
        body (store/value latest (store/claim latest account "sensitive") :compact/body)]
    (assert (= raw (get-in cut [:facts 0 :v])))
    (assert (= marker (get-in after [:facts 0 :v])))
    (assert (= marker (get-in (store/history store latest account root) [0 :v])))
    (assert (= marker (get-in (first (store/feed store latest account 0 1)) [:changes 0 :v])))
    (assert (= raw (get-in (read-world store account other :current 3 f/now-valid) [:facts 0 :v])))
    (assert (= r1 (store/save! store in)))
    (assert (= r3 (store/save! store erased)))
    (assert (= :triplex.compact.store/destroyed (get @(:keys vault) [account root])))
    (assert (rejected? :KeyDestroyed #(seal root)))
    (assert (not (clojure.string/includes? body raw)))
    (let [records (d/tx-range (d/log (:conn store)) (:nativeT r1) (inc (:nativeT r3)))]
      (assert (not-any? #(and (string? %) (clojure.string/includes? % raw))
                        (mapcat #(map :v (:data %)) records))))
    (assert (= 2 (store/head-position before account)))
    (floor/emit "erasure-witness" {:position 3 :cut after :otherPosition 2 :receipt r3 :protectedLogStart (:nativeT r1)})))

(defn run! []
  (let [fixtures (selected) name (floor/db-name "oracle") conn (floor/open! name)
        store (store/open-store conn (store/test-vault) 64)]
    (assert (<= 20 (count fixtures)))
    (store/provision! conn (into ["time-a" "time-b" "erase-a"] (map account-of fixtures)))
    (doseq [fixture fixtures] (run-case! store fixture))
    (temporal! store)
    (erasure! store)
    (floor/emit "oracle-end" {:count (count fixtures) :head (d/basis-t (d/db conn)) :database name})
    (d/release conn)))
