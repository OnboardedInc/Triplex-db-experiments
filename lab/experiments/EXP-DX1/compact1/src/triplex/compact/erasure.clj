(ns triplex.compact.erasure
  (:require [clojure.data.json :as json]
            [clojure.java.io :as io]
            [clojure.string :as str]
            [datomic.api :as d]
            [triplex.compact.fixtures :as f]
            [triplex.compact.floor :as floor]
            [triplex.compact.oracle :as oracle]
            [triplex.compact.probe :as probe]
            [triplex.compact.store :as store]))

(defn erase-request [account root id p] (assoc (f/input account root id p [] []) :meta ["erase" "ssn"]))
(defn retained-source-view [reader before]
  (assoc reader :frontier (delay [before (store/sync-view {:conn (:authority reader)})])))

(defn witnesses! [source]
  (let [account "erase-a" root "pl:a" other "pl:b" vault (:vault source)
        write (fn [root v] [root "ssn" (store/seal-value! vault account root root "ssn" nil nil v) nil nil])
        row (write root "fixture-sensitive-a")
        initial (f/input account root "first" 0 [row] [])
        one (oracle/put! source initial 1)
        _ (oracle/put! source (f/input account other "bystander" 0 [(write other "fixture-bystander")] []) 2)
        before (store/sync-view source)
        old-key (get-in @(:state vault) [:keys [account root "ssn" 0]])
        old-protected (get-in (first (store/feed source before account 0 1)) [:changes 0 :v])
        erasing (erase-request account root "erase" 1)
        erase (oracle/put! source erasing 3)
        repeat (oracle/put! source (erase-request account root "repeat" 3) 4)
        _ (oracle/put! source (erase-request account "pl:empty" "empty" 0) 5)
        new-row (write root "fixture-sensitive-fresh")
        fresh (f/input account root "fresh" 4 [new-row] [[1 0]])
        five (oracle/put! source fresh 6)
        view (store/sync-view source)
        marker {:erasedAt (store/instant-text (:recorded erase))}
        restored (assoc (retained-source-view source before) :vault nil)
        extract (fn [reader db r mode p] (get-in (store/world reader db account r mode p f/now-valid) [:facts 0 :v]))
        changed (update-in initial [:adds 0 2 3] str "a")
        feed (store/feed source view account 0 8)]
    (assert (= {:protectedVersion (get-in row [2 1])} old-protected))
    (assert (= marker (extract source before root :pinned 1)))
    (assert (= marker (extract restored before root :pinned 1)))
    (assert (= "fixture-bystander" (extract source view other :current nil)))
    (assert (= "fixture-sensitive-fresh" (extract source view root :current nil)))
    (assert (every? zero? old-key))
    (assert (= (:recorded erase) (nth (nth new-row 2) 2)))
    (assert (not= (get-in row [2 1]) (get-in new-row [2 1])))
    (assert (= one (store/save! source initial)))
    (assert (= erase (store/save! source erasing)))
    (assert (= {:error "IdempotencyConflict"} (store/save! source changed)))
    (assert (= [{:op "erase" :id [1 0] :e root :a "ssn"}] (:changes (feed 2))))
    (assert (= [[] []] (mapv :changes (subvec feed 3 5))))
    (assert (= marker (get-in (feed 0) [:changes 0 :v])))
    (assert (= marker (:v (first (store/history source view account root)))))
    (assert (= (:recorded erase)
               (store/value (store/sync-view {:conn (:authority source)})
                            (store/lookup (store/sync-view {:conn (:authority source)}) :compact.authority/key
                                          (store/authority-key before account (store/revocation-key account root 0)))
                            :compact.authority/recorded)))
    (let [changes (mapcat :data (d/tx-range (d/log (:conn source)) (:nativeT one) (inc (:nativeT five))))
          envelope (d/entid view :compact.protected/envelope)
          ciphertext (get-in row [2 3])]
      (assert (= 3 (count (filter #(= (:a %) envelope) changes))))
      (assert (not-any? #(and (string? (:v %)) (str/includes? (:v %) "fixture-sensitive")) changes))
      (assert (not-any? #(and (not= (:a %) envelope) (string? (:v %)) (str/includes? (:v %) ciphertext)) changes)))
    (floor/emit "erasure-proof" {:original one :erasure erase :repeat repeat :fresh five
                                 :restoreCut (d/basis-t before) :marker marker :ids (:changes (feed 2))
                                 :empty [(:changes (feed 3)) (:changes (feed 4))]})))

(defn c07! [source]
  (let [fixture (first (filter #(.startsWith (.getName %) "C07-") (.listFiles (io/file oracle/cases-root))))
        input (get (oracle/decoded-case fixture) "input")
        account "c07" root (get-in input ["world" "subject"])
        units (->> (get-in input ["world" "facts"])
                   (group-by (juxt #(get % "tx") #(store/owner (get % "e")))) (sort-by key))
        last (reduce (fn [counts [[_ owner] facts]]
                       (let [p (inc (:high counts 0))
                             adds (mapv (fn [{:strs [e a v]}]
                                          (oracle/seal-add source account owner [e a (if (map? v) "123456789" v) nil nil]))
                                        facts)]
                         (oracle/put! source (f/input account owner (str "seed-" p) (get counts owner 0) adds []) p)
                         (assoc counts :high p owner p))) {} units)
        erase (oracle/put! source (erase-request account root "erase" (last root)) (inc (:high last)))
        view (store/sync-view source)
        world (f/sorted-world (store/world source view account root :pinned (:high last) f/now-valid))]
    (assert (= {:erasedAt (store/instant-text (:recorded erase))}
               (:v (first (filter #(= "ssn" (:a %)) (:facts world))))))
    (floor/emit "erasure-c07" {:position (:high last) :world world})))

(defn retire! [source]
  (doseq [[person width] [[1000 513] [1001 2000]]]
    (let [account "retire" root (f/root person)
          p (reduce (fn [rev [i facts]]
                      (:position (store/save! source (f/input account root (str "seed-" person "-" i) rev facts []))))
                    0 (map-indexed vector (partition-all 160 (f/seed-facts person width))))
          before (store/sync-view source)
          ids (set (keys (:facts (store/current-projection source before account root))))
          request (assoc (f/input account root (str "retire-" person) p [] []) :meta ["retire"])
          gone (oracle/put! source request (inc p))
          after (store/sync-view source)
          feed (:changes (first (store/feed source after account p 1)))
          restored (store/world source after account root :pinned p f/now-valid)]
      (assert (= width (count ids) (count feed) (count (:facts restored))))
      (assert (= ids (set (map :id feed))))
      (assert (every? #(= "retire" (:op %)) feed))
      (assert (empty? (:facts (store/world source after account root :current nil f/now-valid))))
      (assert (oracle/rejected? :UnknownCodebook
                 (let [book @store/w0]
                   #(with-redefs [store/w0 (delay (assoc book :hash (str "changed-" (:hash book))))]
                      (store/world source after account root :pinned p f/now-valid)))))
      (floor/emit "owner-retirement" {:facts width :position (:position gone) :nativeT (:nativeT gone)}))))

(defn price! [source]
  (let [account "price" d (assoc source :journal? false)]
    (doseq [i (range 128)]
      (let [root (f/root i)
            ssn (store/seal-value! (:vault source) account root root "ssn" nil nil "123456789")
            request (f/input account root (str "seed-" i) 0 [[root "ssn" ssn nil nil]
                                                              [root "startDate" "2026-11-01" nil nil]] [])]
        (oracle/put! d request (inc i))))
    (doseq [block (range 8)
            i (range (* block 16) (* (inc block) 16))]
      (let [root (f/root i) p (inc i) protected (#{0 3 5 6} block)
            a (if protected "ssn" "startDate")
            start (System/nanoTime)
            v (if protected (store/seal-value! (:vault source) account root root a nil nil "987654321") "2026-11-02")
            req (f/input account root (str "edit-" i) p [[root a v nil nil]] [[p (if protected 0 1)]])
            ready (store/prepare d (d/db (:conn source)) req)
            prep (floor/ms (- (System/nanoTime) start))
            {:keys [report outcomes]} (store/commit-ready! d [ready])
            ack (floor/ms (- (System/nanoTime) start))
            r (oracle/require-receipt req (+ 129 i) (first outcomes))
            actual (probe/durable-tx! (:conn source) (:nativeT r))]
        (assert (= (:tx-data report) actual))
        (assert (= (if protected 13 11) (count actual)))
        (assert (= r (store/receipt (:db-after report) account (:command r))))
        (floor/emit "protected-price" (merge (probe/census (:nativeT r) actual)
                                             {:block block :i i :protected (boolean protected)
                                              :prepareMs prep :ackMs ack :nativeMs (get-in report [:io-stats :api-ms])}))))))

(defn run! []
  (let [conn (floor/open! (floor/db-name "erasure"))
        ledger (floor/open! (floor/db-name "authority"))
        source (-> (store/open-store conn (store/test-vault) 64) (store/with-authority! ledger))]
    (store/provision! conn ["erase-a" "c07" "retire" "price"])
    (witnesses! (store/with-journal! source))
    (c07! source)
    (retire! source)
    (price! source)
    (floor/emit "erasure-end" {:priceSamples 128 :head (d/basis-t (d/db conn)) :ledgerHead (d/basis-t (d/db ledger))})
    (d/release ledger)
    (d/release conn)))

(defn recovery! []
  (let [uri (fn [name] (str/replace (System/getenv "DATOMIC_URI_TEMPLATE") "{db}" (floor/db-name name)))
        conn (d/connect (uri "erasure"))
        authority (d/connect (uri "authority"))
        reader (assoc (store/open-store conn nil 4) :authority authority)
        live (store/sync-view reader)
        before (store/history-cut live "erase-a" 2)
        restored (retained-source-view reader before)
        result (store/world restored before "erase-a" "pl:a" :pinned 1 f/now-valid)
        erase (store/receipt live "erase-a" "erase")]
    (assert (= [{:e "pl:a" :a "ssn" :v {:erasedAt (store/instant-text (:recorded erase))} :tx 1}]
               (:facts result)))
    (floor/emit "erasure-recovery" {:receipt erase :marker (:v (first (:facts result))) :head (d/basis-t live)})
    (d/release conn)
    (d/release authority)))

(defn -main [mode]
  (case mode "erasure" (run!) "recover" (recovery!))
  (shutdown-agents)
  (System/exit 0))
