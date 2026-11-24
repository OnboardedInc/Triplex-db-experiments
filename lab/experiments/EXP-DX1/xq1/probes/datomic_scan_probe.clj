;; [DX-XQ1] Read-only probe (in-memory Datomic 1.0.7745): ID-prefix listing through the unique identity's AVET,
;; and the CPU per entry of AVET range scans over composed index strings. Times are diagnostic (Mac, lab VM, memory
;; database: no storage reads); they bound CPU per entry warm, not cold cost.
(require '[datomic.api :as d])
(def uri "datomic:mem://xq1-scan")
(d/create-database uri)
(def conn (d/connect uri))
@(d/transact conn
  [{:db/ident :triplex.entity/id :db/valueType :db.type/string :db/cardinality :db.cardinality/one :db/unique :db.unique/identity}
   {:db/ident :ix/entry :db/valueType :db.type/string :db/cardinality :db.cardinality/many :db/index true}])
(def sep "\u0001")
(defn k [& parts] (apply str (interpose sep parts)))
(defn pad [n w] (let [s (str n)] (str (apply str (repeat (- w (count s)) "0")) s)))
(def statuses ["pending" "clear" "consider" "review" "expired"])
(def n 100000)
;; two accounts x n subjects; each subject: a root entity with an id and two index entries
(doseq [a ["account-003" "account-004"]
        batch (partition-all 2000 (range n))]
  @(d/transact conn
     (vec (mapcat (fn [i]
                    (let [id (str "acct/" a "/wk:" (pad i 8)) fact (str "01JZ" (pad i 22))]
                      [{:db/id id :triplex.entity/id id
                        :ix/entry [(k a ":person/background" (str "s" (statuses (mod i 5))) "O" id fact "0000018c2a5f3c00")
                                   (k a ":person/start" (str "s2026-" (pad (inc (mod i 12)) 2) "-" (pad (inc (mod i 28)) 2)) "O" id (str fact "b") "0000018c2a5f3c00")]}]))
                  batch))))
(def db (d/db conn))
(defn timed [label f]
  (let [_ (f) _ (f) t0 (System/nanoTime) r (f) ms (/ (- (System/nanoTime) t0) 1e6)]
    (println (format "== %s: result %s, %.2f ms (diagnostic, warm, memory database)" label (pr-str r) ms))))
(timed "A. count account-003 IDs by prefix acct/account-003/wk: (unique identity AVET)"
       #(count (seq (d/index-range db :triplex.entity/id "acct/account-003/wk:" "acct/account-003/wk;"))))
(timed "B. first page of 50 IDs, account-003"
       #(mapv :v (take 2 (take 50 (d/index-range db :triplex.entity/id "acct/account-003/wk:" "acct/account-003/wk;")))))
(timed "C. count background=pending in account-003 (one fifth of n)"
       #(count (seq (d/index-range db :ix/entry (k "account-003" ":person/background" "spending" "") (k "account-003" ":person/background" "spending\u0002")))))
(timed "D. count start in 2026-03 in account-003 (range)"
       #(count (seq (d/index-range db :ix/entry (k "account-003" ":person/start" "s2026-03") (k "account-003" ":person/start" "s2026-04")))))
(defn entity-of [^String v] (let [parts (.split v sep)] (aget parts 4)))
(timed "E. merge-intersect background=pending AND start in 2026-03 (sorted by entity within each list for eq; range list sorted in memory)"
       #(let [a (map (comp entity-of :v) (d/index-range db :ix/entry (k "account-003" ":person/background" "spending" "") (k "account-003" ":person/background" "spending\u0002")))
              b (into #{} (map (comp entity-of :v)) (d/index-range db :ix/entry (k "account-003" ":person/start" "s2026-03") (k "account-003" ":person/start" "s2026-04")))]
          (count (filter b a))))
(timed "F. as-of the head t: same count as C"
       #(count (seq (d/index-range (d/as-of db (d/basis-t db)) :ix/entry (k "account-003" ":person/background" "spending" "") (k "account-003" ":person/background" "spending\u0002")))))
(timed "G. isolation: entries of account-004 seen by an account-003 range" 
       #(count (filter (fn [x] (not (.startsWith ^String (:v x) (str "account-003" sep)))) (d/index-range db :ix/entry (k "account-003" "") (k "account-003\u0002")))))
(timed "H. 1000 point seeks (seek-datoms to an entity's entry), galloping-intersection building block"
       #(count (for [i (range 0 n 100)] (first (d/seek-datoms db :avet :ix/entry (k "account-003" ":person/background" "spending" "O" (str "acct/account-003/wk:" (pad i 8))))))))
(println "datoms in db:" (count (d/datoms db :eavt)))
(shutdown-agents)
(System/exit 0)
