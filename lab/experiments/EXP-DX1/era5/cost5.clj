(ns era5-cost
  "[DX-ERA5] What the derived routes cost with each removal authority (era5/REVIEW.md, line of attack 8). In process,
  sealed database, every option on; era5/cost.sh runs it with the file authority or with the PostgreSQL authority (a
  PostgreSQL container of its own). Times are diagnostic (Mac, lab VM shared with other builders): medians of 5.
  Shapes, from the option's writers: a settlement frame seals one record per settled change of up to 64 subjects, each
  naming its subject's world (p protected assertions plus unprotected rows the route drops); a notice frame seals each
  delivery and ledger item of its subjects; a subject page opens that subject's settled changes. `off` is what the same
  frame or page costs without the option: the derived write of the frame's document in clear, and a read of it."
  (:require [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.authority-sql :as sql]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era5-attack :as a5]))

(def sql-reads (atom 0))
;; [DX-ERA4] also the SQL queries on the key table (one batched read per call since the per-call key cache)
(def key-queries (atom 0))
(defn install-counter! []
  (let [f sql/key-by-id] (alter-var-root #'sql/key-by-id (fn [_] (fn [s i] (swap! sql-reads inc) (f s i)))))
  (let [f @#'sql/select!]
    (alter-var-root #'sql/select! (fn [_] (fn [c text params g]
                                            (when (str/includes? (str text) "triplex_removal.keys") (swap! key-queries inc))
                                            (f c text params g))))))
(defn- ms [f] (let [t (System/nanoTime) r (f)] [(/ (- (System/nanoTime) t) 1e6) r]))
(defn- median [xs] (nth (vec (sort xs)) (quot (count xs) 2)))
(defn- timed
  "Median wall time of 5 runs of f, and the PostgreSQL key reads of one run."
  [f]
  (let [runs (vec (for [_ (range 5)] (do (reset! sql-reads 0) (reset! key-queries 0)
                                         (let [[t r] (ms f)] [t @sql-reads r @key-queries]))))]
    {:ms (Math/round (double (median (map first runs)))) :key-reads (second (first runs)) :outcome (nth (first runs) 2)
     :key-queries (nth (first runs) 3)}))

(defn- seed-retry!
  "A protected value saved; the PostgreSQL authority's key pool answers 503 while it refills (every 500 ms): retried."
  [src cmd owner]
  (loop [n 0]
    (let [v (g/secret owner "cost") rep (offers/send src (g/frame cmd owner v nil nil))]
      (cond (= 200 (:status rep)) cmd
            (< n 100) (do (Thread/sleep 100) (recur (inc n)))
            :else (do (x/oracle! "cost seed" false "the seed save" (offers/outcome rep)) cmd)))))

(defn- seal-all [src xs]
  (let [rs (mapv #(a5/seal-many src %) (partition-all 512 xs))]
    [(mapv :status rs) (vec (mapcat #(get-in % [:body "items"]) rs))]))
(defn- open-all [src wires]
  (mapv :status (mapv #(offers/route src "v2" "derived-open" {"items" (vec %)}) (partition-all 512 wires))))

(defn measure []
  (doseq [p [1 2 5 20]]
    (g/fresh-scope true
      (fn [src conn]
        (let [subjects (vec (for [s (range 64)] (format "acct/a/pl:%08d" s)))
              ids (vec (for [[si subj] (map-indexed vector subjects)]
                         (vec (for [j (range p)] (seed-retry! src (str "k-" p "-" si "-" j) (str subj "/f" j))))))
              unit (apply str (repeat 217 "u"))
              ;; [DX-ERA4, after M1] the unprotected names are real rows (the route refuses unknown names); each record
              ;; carries its place, as the option's writers send it
              plains (vec (for [k (range 3)] (a5/plain-row! src (str "plain-" p "-" k) "acct/a/pl:99999999/p")))
              item (fn [si u] {"ids" (into (ids si) plains) "value" (str unit si "-" u)
                               "place" (str "cost|a|" (subjects si))})
              frame6 (vec (for [si (range 64) u (range 6)] (item si u)))
              frame20 (vec (for [si (range 64) u (range 20)] (item si u)))
              owes200 (vec (for [u (range 400)] (item 0 u)))
              [_ sealed6] (seal-all src frame6)
              [_ sealed200] (seal-all src owes200)
              page6 (mapv #(get % "sealed") (take 6 sealed6))
              page200 (mapv #(get % "sealed") sealed200)
              clear-doc (apply str (repeat 64 (str unit unit unit)))
              n (atom 0)
              t (fn [] (g/seq-now src conn))
              row {:authority (if sql/url "postgresql" "file") :protected-per-subject p
                   :settlement-frame-64x6 {:on-seal (timed #(first (seal-all src frame6)))
                                           :off-write-clear (timed #(:status (offers/send src (assoc (g/save-frame (str "c6-" p "-" (swap! n inc)) "settlement-values-a:answer:c6" ":notice/body" (subs clear-doc 0 41000) nil nil) "erasureSeq" (t) "erasureAccounts" ["a"]))))}
                   :settlement-frame-64x20 {:on-seal (timed #(first (seal-all src frame20)))}
                   :notice-frame-one-subject-owing-200-forms {:on-seal (timed #(first (seal-all src owes200)))}
                   :subject-page-6-changes {:on-open (timed #(open-all src page6))
                                            :off-read (timed #(:status (offers/route src "v1" "read" {"entityIds" ["settlement-values-a:answer:c6"]})))}
                   :subject-page-400-items {:on-open (timed #(open-all src page200))}}]
          (println "ERA5_COST" (pr-str row)))))))

(defn main []
  (x/install-hooks!)
  (install-counter!)
  ((requiring-resolve 'triplex.gateway.envelope/start!))
  (measure)
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
