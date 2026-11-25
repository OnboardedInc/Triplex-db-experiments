(ns s5-attack
  "[DX-S5] Targeted attacks on the per-subject writers (reviewer's tests; they do not change the code under review).
  Each test prints one DX-S5_ATTACK line with what it measured. Run by s5/clj-run.sh after s5/fuzz.clj is loaded."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.lean :as lean] [triplex.gateway.storage :as storage]
            [triplex.gateway.write-policy :as policy]
            [triplex.gateway.subject-create :as create] [triplex.gateway.subject-save :as subject]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 9000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- writer [reply] (get-in reply [:body "subjectSave"]))
(defn- facts [owner tag n & [field]] (vec (for [i (range n)] {:owner owner :field (str (or field ":a/f") i) :type :string :value (str tag "|" i) :pred nil})))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- attack [m] (println "DX-S5_ATTACK" (json/write-str m)))

(defn- at-submit
  "Run `competing` once, after the save was planned and before its submit; return the save's reply."
  [name input competing]
  (let [orig storage/submit! fired (atom false) id (get input "operationId")]
    (with-redefs [storage/submit! (fn [conn data request timeline & more]
                                    (when (and (= id (get request "operationId")) (compare-and-set! fired false true)) (competing))
                                    (apply orig conn data request timeline more))]
      (reference/send name input))))

;; ---------------------------------------------------------------- 1. the first save racing a protection declaration

(deftest first-save-racing-protection
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S5_SKIP protection needs TRIPLEX_ERASURE_DIRECTORY")
    (let [run (fn [fast?]
                (reference/in-scope
                  (fn [name conn]
                    (let [input (save conn {:command (str "first-" fast?) :facts (facts "acct/p1/subject/new" "x" 4)})
                          declared (atom nil)
                          reply ((if fast? (fn [f] (f)) fz/general)
                                 #(at-submit name input (fn [] (reset! declared (reference/route name "v1" "protection"
                                                                                                {"attributes" [":p/secret"] "sealed" false})))))]
                      {:declared (:status @declared) :outcome (reference/outcome reply) :writer (writer reply)
                       :head (head conn)}))))
          fast (run true) general (run false)]
      (attack {:case "first save of a scope racing its protection declaration" :fast fast :general general})
      (is (= 200 (:declared fast)) (pr-str fast))
      (is (= (:outcome general) (:outcome fast)) "the same refusal on both writers"))))

;; ---------------------------------------------------------------- 1b. a save racing a removal of another subject's value

(deftest save-racing-a-removal
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S5_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (let [S "acct/r1/subject/s" P "acct/r1/profile/s" T "acct/r1/subject/t"
          kinds {"one owner (S's plain field)" (fn [m] [{:owner S :field ":a/f0" :type :string :value "new" :pred (get-in m [S ":a/f0"])}])
                 "two owners (S and P)" (fn [m] [{:owner S :field ":a/f1" :type :string :value "new" :pred (get-in m [S ":a/f1"])}
                                                 {:owner P :field ":a/f0" :type :string :value "new" :pred (get-in m [P ":a/f0"])}])
                 "creation (a new enrolment of S)" (fn [_] [{:owner "acct/r1/enrolment/e" :field ":e/subject" :type :ref :value S :pred nil}
                                                            {:owner "acct/r1/enrolment/e" :field ":e/status" :type :string :value "active" :pred nil}])}
          run (fn [kind fast?]
                (reference/in-scope
                  (fn [name conn]
                    (is (= 200 (:status (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false}))))
                    (doseq [[o tag] [[S "s"] [P "p"] [T "t"]]]
                      (is (= [200 nil] (reference/outcome (reference/send name (save conn {:command (str "seed-" tag)
                                                                                           :facts (conj (facts o tag 3) {:owner o :field ":p/secret" :type :string :value (str tag " secret") :pred nil})}))))))
                    (let [m (into {} (for [o [S P]] [o (fz/read-owner name o {"validAt" 5.0})]))
                          input (save conn {:command (str "race-" fast?) :facts ((kinds kind) m)})
                          removed (atom nil)
                          reply ((if fast? (fn [f] (f)) fz/general)
                                 #(at-submit name input (fn [] (reset! removed (reference/route name "v1" "erase"
                                                                                               {"commandId" "remove-t" "selectors" [{"entityId" T "attribute" ":p/secret"}]})))))
                          planned (fz/writer-kind conn (get input "operationId") reply)]
                      {:removal (:status @removed) :outcome (reference/outcome reply) :writer planned
                       :operation (get (reference/operation name (get input "operationId")) "status")}))))
          results (into {} (for [kind (keys kinds)] [kind {:fast (run kind true) :general (run kind false)}]))]
      (doseq [[kind {:keys [fast general]}] results]
        (attack {:case "a save racing a removal of another subject's protected value" :kind kind :fast fast :general general})
        (is (= 200 (:removal fast)) kind)
        (is (= "absent" (:operation fast)) [kind "refused whole on the per-subject writer"])
        (is (= "absent" (:operation general)) [kind "refused whole on the general writer"])
        (is (= (:outcome general) (:outcome fast)) [kind "the same refusal on both writers"])))))

;; ---------------------------------------------------------------- 1c. the transactor becomes unavailable after it applied a save

(defn- unavailable-after-apply
  "The first transact-async of f: submit, wait until the transactor applied it, then fail as the peer does when the
  transactor goes away before the acknowledgement arrives (seen on the PostgreSQL stack, s5/stack-run.sh)."
  [f]
  (let [orig d/transact-async fired (atom false)
        e (ex-info "Transactor not available" {:cognitect.anomalies/category :cognitect.anomalies/unavailable
                                               :cognitect.anomalies/message "Transactor not available"})]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (let [fut (apply orig conn tx opts)]
                                       (if (compare-and-set! fired false true)
                                         (do (try (deref fut 10000 nil) (catch Throwable _ nil))
                                             (reify clojure.lang.IDeref (deref [_] (throw e))
                                                    clojure.lang.IBlockingDeref (deref [_ _ _] (throw e))
                                                    clojure.lang.IPending (isRealized [_] true)))
                                         fut)))]
      (f))))

(deftest transactor-unavailable-after-apply
  (let [S "acct/u1/subject/s"
        run (fn [label fast? facts-fn]
              (reference/in-scope
                (fn [name conn]
                  (is (= [200 nil] (reference/outcome (reference/send name (save conn {:command "seed" :facts (facts S "s" 3)})))))
                  (let [m (fz/read-owner name S {"validAt" 5.0})
                        input (save conn {:command (str "save-" label) :facts (facts-fn m)})
                        reply ((if fast? (fn [f] (f)) fz/general) #(unavailable-after-apply (fn [] (reference/send name input))))
                        op (reference/operation name (get input "operationId"))
                        again (reference/send name input)]
                    {:writer (fz/writer-kind conn (get input "operationId") reply) :answer (reference/outcome reply)
                     :message (get-in reply [:body "message"]) :operation (get op "status")
                     :resendSameOperation (reference/outcome again)}))))
        cases [["one owner, per-subject writer" true (fn [m] [{:owner S :field ":a/f0" :type :string :value "x" :pred (get m ":a/f0")}])]
               ["creation, creation writer" true (fn [_] [{:owner "acct/u1/enrolment/e" :field ":e/subject" :type :ref :value S :pred nil}])]
               ["one owner, general writer" false (fn [m] [{:owner S :field ":a/f0" :type :string :value "x" :pred (get m ":a/f0")}])]]]
    (doseq [[label fast? f] cases]
      (let [r (run label fast? f)]
        (attack (assoc r :case "the transactor becomes unavailable after applying the save" :kind label))
        (is (= "committed" (:operation r)) label)
        ;; The contract: a save whose outcome the gateway does not know is answered OutcomeUnknown (503), never a refusal.
        (is (= [503 "OutcomeUnknown"] (:answer r)) [label "a committed save must not be answered with a refusal"])))))

;; ---------------------------------------------------------------- 2. a removal that named an entity before it existed

(deftest removed-family-after-removal
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (println "DX-S5_SKIP removal needs TRIPLEX_ERASURE_DIRECTORY")
    (doseq [option [true false]]
      ;; Option off: the creation option's removal record and live-creation rule are off, as on a writer without it.
      ((if option (fn [f] (f)) (fn [f] (with-redefs [create/enabled false] (f))))
       (fn []
      (reference/in-scope
        (fn [name conn]
          (let [declared (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
                x "acct/p2/subject/later" y "acct/p2/subject/exists"
                send (fn [input] (reference/send name input))
                seeded (send (save conn {:command "seed-y" :facts (conj (facts y "y" 3) {:owner y :field ":p/secret" :type :string :value "y secret" :pred nil})}))
                removed-x (reference/route name "v1" "erase" {"commandId" "remove-x" "selectors" [{"entityId" x}]})
                removed-y (reference/route name "v1" "erase" {"commandId" "remove-y" "selectors" [{"entityId" y "attribute" ":p/secret"}]})
                ;; Framed after both removals, from the head: a new value of the removed family, on each entity.
                new-y (send (save conn {:command "new-y" :facts [{:owner y :field ":p/secret" :type :string :value "y new value" :pred nil}]}))
                create-x (send (save conn {:command "create-x" :facts (conj (facts x "x" 3) {:owner x :field ":p/secret" :type :string :value "x new value" :pred nil})}))
                create-x-plain (when (not= 200 (:status create-x)) (send (save conn {:command "create-x-plain" :facts (facts x "x" 3)})))
                then-secret (when create-x-plain (send (save conn {:command "x-secret" :facts [{:owner x :field ":p/secret" :type :string :value "x new value" :pred nil}]})))
                result {:option option :declared (:status declared) :seed (reference/outcome seeded)
                        :removedX (:status removed-x) :removedY (:status removed-y)
                        :newValueOnExistingAfterRemoval (reference/outcome new-y)
                        :creationWithNewValueAfterRemoval (reference/outcome create-x)
                        :creationWithout (some-> create-x-plain reference/outcome)
                        :thenTheNewValue (some-> then-secret reference/outcome)}]
            (attack (assoc result :case "a removal named an entity before it existed; saves framed after the removal"))
            (is (= [200 nil] (:newValueOnExistingAfterRemoval result)))))))))))

;; ---------------------------------------------------------------- 3. the import bound's estimate against the writer's apply

(defn- import-frame [conn command subject n & {:keys [entities live]}]
  (let [input (save conn {:command command :facts (facts subject command n ":imp/f")})
        input (cond-> (assoc input "writeClass" "import")
                entities (assoc "entities" (vec (cons subject entities)))
                live (assoc "live" (vec live)))]
    input))

(defn- estimate [conn input]
  (let [data (storage/tx-data (d/db conn) input)
        est (requiring-resolve 'triplex.gateway.import-bound/estimate-us)]
    {:estimateUs (est (second (first data)) input) :ops (count (:ops (second (first data))))
     :bytes (policy/request-size input)}))

(deftest import-bound-estimate-against-apply
  (if-not (and policy/import-whole? (= "1" (System/getenv "TX2_REMOVAL_COST_READBACK")))
    (println "DX-S5_SKIP needs TX2_IMPORT_WHOLE_SUBJECT=1 and TX2_REMOVAL_COST_READBACK=1")
    (reference/in-scope
      (fn [name conn]
        ;; A subject with many live rows (seeded as live saves of 120 facts, general writer).
        (let [l "acct/i1/subject/large"]
          (doseq [k (range 100)]
            (is (= [200 nil] (reference/outcome (fz/general #(reference/send name (save conn {:command (str "seed-l" k)
                                                                                             :facts (facts l (str "l" k) 120 (str ":l" k "/f"))})))))))
          (let [live-ids (vec (fz/read-owner-ids name l))
                measure (fn [label input]
                          (let [e (estimate conn input)
                                start (System/nanoTime)
                                reply (reference/send name input)
                                wall (/ (- (System/nanoTime) start) 1e6)
                                outcome (reference/outcome reply) apply-ms (get-in reply [:body "nativeApplyMs"])
                                transact (get-in reply [:body "transactMicros"])]
                            (attack (merge {:case "import bound" :frame label :outcome outcome :nativeApplyMs apply-ms
                                            :transactMicros transact
                                            :transactPerEstimate (when (and transact (pos? (:estimateUs e))) (/ (double transact) (:estimateUs e)))
                                            :requestWallMs wall :writer (writer reply) :boundUs policy/import-commit-us} e))
                            (merge e {:outcome outcome :applyMs apply-ms})))
                _warm (measure "warm-up 20 facts" (import-frame conn "imp-warm" "acct/i1/subject/w" 20))
                _honest (measure "honest 100 facts" (import-frame conn "imp-honest" "acct/i1/subject/h" 100))
                _honest2 (measure "honest 100 facts again" (import-frame conn "imp-honest2" "acct/i1/subject/h2" 100))
                _honest3 (measure "honest 100 facts, third" (import-frame conn "imp-honest3" "acct/i1/subject/h3" 100))
                absent (measure "1 fact, 55,000 absent entity names in the read set"
                                (import-frame conn "imp-absent" "acct/i1/subject/a" 1 :entities (map #(str "z" %) (range 55000))))
                _existing (measure "1 fact, the large subject's name 18,000 times in the read set"
                                   (import-frame conn "imp-existing" "acct/i1/subject/e" 1 :entities (repeat 18000 l)))
                _live (measure (str "1 fact, " (count live-ids) " read-only live IDs")
                               (import-frame conn "imp-live" "acct/i1/subject/v" 1 :live live-ids))]
            ;; [DX-S6] F2 fixed: the review asserted the finding (admitted under the bound); the standing gate asserts
            ;; the fix: the adversarial frame is refused by type, and its estimate now prices its lookups over the bound.
            (is (= [400 "ReadSetTooLarge"] (:outcome absent)) "the adversarial frame is refused by type")
            (is (> (:estimateUs absent) policy/import-commit-us) "its lookups are priced")))))))

;; ---------------------------------------------------------------- 4. the removal-scan on every per-subject commit

(deftest excision-scan-on-every-fast-commit
  (if-not (and (System/getenv "TRIPLEX_ERASURE_DIRECTORY") (= "1" (System/getenv "TX2_REMOVAL_COST_READBACK"))
               (System/getenv "S5_REMOVALS"))
    (println "DX-S5_SKIP needs TRIPLEX_ERASURE_DIRECTORY, TX2_REMOVAL_COST_READBACK=1 and S5_REMOVALS")
    (reference/in-scope
      (fn [name conn]
        (is (= 200 (:status (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false}))))
        (let [s "acct/x1/subject/s" n (Long/parseLong (System/getenv "S5_REMOVALS"))
              seed (reference/send name (save conn {:command "seed-s" :facts (facts s "s" 6)}))
              samples (fn [label]
                        (let [times (vec (for [k (range 12)]
                                           (let [model (fz/read-owner name s {"validAt" 5.0})
                                                 f ":a/f0"
                                                 reply (reference/send name (save conn {:command (str "s-" label "-" k)
                                                                                        :facts [{:owner s :field f :type :string :value (str label k) :pred (get model f)}]}))]
                                             (is (= [200 nil] (reference/outcome reply)) (pr-str (:body reply)))
                                             [(get-in reply [:body "subjectSave"]) (get-in reply [:body "transactMicros"])])))
                              micros (vec (sort (keep second times)))]
                          (attack {:case "removal scan" :removals label :writers (frequencies (map first times))
                                   :transactMicros micros :medianMicros (nth micros (quot (count micros) 2) nil)})))]
          (is (= [200 nil] (reference/outcome seed)))
          (samples 0)
          (doseq [i (range n)]
            (let [o (str "acct/x1/subject/r" i)
                  r (reference/send name (save conn {:command (str "seed-r" i) :facts [{:owner o :field ":p/secret" :type :string :value (str "secret " i) :pred nil}]}))]
              (is (= [200 nil] (reference/outcome r)))
              (is (= 200 (:status (reference/route name "v1" "erase" {"commandId" (str "rm-" i) "selectors" [{"entityId" o "attribute" ":p/secret"}]}))))))
          (attack {:case "removal scan" :excisions (count (seq (d/datoms (d/db conn) :aevt :db/excise)))})
          (samples n))))))

(defn main []
  (let [r (clojure.test/run-tests 's5-attack)]
    (println "DX-S5_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
