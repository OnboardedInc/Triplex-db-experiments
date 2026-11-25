(ns s6-bound
  "[DX-S6] F2: the writer's estimate against its time, for honest and adversarial shapes of every write class (live,
  import, activation, notice), with lookups priced (import_bound.clj estimate-us) and the read set capped
  (TX2_READ_SET_BOUND=1; import frames under TX2_IMPORT_WHOLE_SUBJECT=1 read only what they write). Every adversarial
  shape is refused by type or admitted and priced; for every admitted frame, transactMicros / estimate is printed and
  the worst per class summarised. Times are the memory toy's, diagnostic. Run by s6/clj-run.sh (setting bound)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.write-policy :as policy]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 6000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- facts [owner tag n & [field]] (vec (for [i (range n)] {:owner owner :field (str (or field ":a/f") i) :type :string :value (str tag "|" i) :pred nil})))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- line [m] (println "DX-S6_BOUND" (json/write-str m)))

(defn- frame [conn klass command subject n & {:keys [entities live]}]
  (let [input (save conn {:command command :facts (facts subject command n ":imp/f")})]
    (cond-> (assoc input "writeClass" klass)
      entities (assoc "entities" (vec (cons subject entities)))
      live (assoc "live" (vec live)))))

(defn- estimate [conn input]
  (let [data (storage/tx-data (d/db conn) input)
        est (requiring-resolve 'triplex.gateway.import-bound/estimate-us)]
    {:estimateUs (est (second (first data)) input) :ops (count (:ops (second (first data)))) :bytes (policy/request-size input)}))

(deftest estimate-against-the-writer-for-every-class
  (if-not (and policy/import-whole? (= "1" (System/getenv "TX2_READ_SET_BOUND")))
    (println "DX-S6_SKIP needs TX2_IMPORT_WHOLE_SUBJECT=1 and TX2_READ_SET_BOUND=1")
    (reference/in-scope
      (fn [name conn]
        (let [l "acct/b1/subject/large"]
          (doseq [k (range 100)]
            (is (= [200 nil] (reference/outcome (fz/general #(reference/send name (save conn {:command (str "seed-l" k)
                                                                                             :facts (facts l (str "l" k) 120 (str ":l" k "/f"))})))))))
          (let [live-ids (vec (fz/read-owner-ids name l))
                results (atom [])
                measure (fn [klass label input]
                          (let [e (estimate conn input)
                                reply (fz/general #(reference/send name input))
                                outcome (reference/outcome reply) transact (get-in reply [:body "transactMicros"])
                                r (merge {:class klass :frame label :outcome outcome :transactMicros transact
                                          :ratio (when (and transact (pos? (:estimateUs e))) (/ (double transact) (:estimateUs e)))} e)]
                            (line r) (swap! results conj r) r))]
            (doseq [klass ["live" "import" "activation" "notice"]]
              (let [n (fn [s] (str klass "-" s))]
                (measure klass "warm-up 20 facts" (frame conn klass (n "warm") (str "acct/b1/subject/" klass "-w") 20))
                (doseq [k (range 3)]
                  (measure klass "honest 100 facts" (frame conn klass (n (str "honest" k)) (str "acct/b1/subject/" klass "-h" k) 100)))
                (measure klass "1 fact, 55,000 absent names in the read set"
                         (frame conn klass (n "absent") (str "acct/b1/subject/" klass "-a") 1 :entities (map #(str "z" %) (range 55000))))
                (measure klass "1 fact, one existing subject named 18,000 times"
                         (frame conn klass (n "repeat") (str "acct/b1/subject/" klass "-r") 1 :entities (repeat 18000 l)))
                (measure klass (str "1 fact, " (count live-ids) " read-only live IDs")
                         (frame conn klass (n "live") (str "acct/b1/subject/" klass "-v") 1 :live live-ids))
                (measure klass "1 fact, 4,095 absent names (at the cap)"
                         (frame conn klass (n "absent-cap") (str "acct/b1/subject/" klass "-ac") 1 :entities (map #(str "y" klass %) (range 4095))))
                (measure klass "1 fact, the existing subject once"
                         (frame conn klass (n "existing-once") (str "acct/b1/subject/" klass "-e") 1 :entities [l]))
                (measure klass "1 fact, 4,096 read-only live IDs (at the cap)"
                         (frame conn klass (n "live-cap") (str "acct/b1/subject/" klass "-vc") 1 :live (take 4096 live-ids)))))
            (let [rs @results
                  admitted (filter #(= 200 (first (:outcome %))) rs)
                  worst (into (sorted-map) (for [[k xs] (group-by :class admitted)]
                                             [k (let [w (apply max-key :ratio xs)] (select-keys w [:frame :ratio :transactMicros :estimateUs]))]))]
              (line {:summary "worst transactMicros / estimate among admitted frames, per class" :worst worst
                     :refused (frequencies (map (fn [r] [(:class r) (second (:outcome r))]) (remove #(= 200 (first (:outcome %))) rs)))})
              ;; Every shape that the S5 review admitted unpriced is now refused by type (read set over the cap, repeated,
              ;; or for imports not written) or admitted with its lookups priced.
              (doseq [r rs :when (re-find #"55,000|18,000|read-only live IDs$" (:frame r))
                      :when (not (re-find #"cap" (:frame r)))]
                (is (#{"ReadSetTooLarge" "ReadSetDuplicate" "ImportReadSetNotWritten" "ImportReadOnlyPredecessor"} (second (:outcome r)))
                    (pr-str r)))
              (doseq [r rs :when (and (= "import" (:class r)) (re-find #"cap|once" (:frame r)))]
                (is (#{"ImportReadSetNotWritten" "ImportReadOnlyPredecessor"} (second (:outcome r))) [r "an import frame reads only what it writes"]))
              (doseq [r rs :when (re-find #"honest" (:frame r))]
                (is (= [200 nil] (:outcome r)) (pr-str r))))))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-bound)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
