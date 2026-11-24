(ns removal-gate
  "Gate (e): removal on request of a subject that is itself mid-import, in a sealed protected scope. Run in its own JVM
  with TRIPLEX_ERASURE_DIRECTORY and TRIPLEX_ERASURE_SHRED_GRACE_MS=0 set (the removal authority reads them at load)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d]
            [triplex.gateway.envelope :as envelope] [triplex.gateway.reach :as reach]
            [triplex.gateway.write-policy :as policy]
            [wfix1-regression :as reference] [imp2-frames :refer :all] [whole-gate :as w]))

(def ssn ":person/ssn")
(defn protected-subject
  "A subject of n facts with one protected value (its profile's :person/ssn) whose plaintext is unique."
  [tag i n]
  (let [s (subject tag i n) profile (second (:entities s)) value (str "SSN-" tag "-" i "-" (subs (str (d/squuid)) 0 8))]
    (-> s (update :facts conj {:e profile :a ssn :type "string" :v value}) (update :n inc) (assoc :secret value))))

(defn route [name version action input] (reference/route name version action input))
(defn frontier [name]
  (let [r (route name "v2" "erasure-frontier" nil)] (assert (= 200 (:status r)) (pr-str r)) (:body r)))
(def clock (atom 0.0))
(defn erase! [name command selectors]
  ;; A removal stamps the wall clock; the strict scope's later commits must carry a later clock.
  (let [r (route name "v2" "erase" {"commandId" command "selectors" selectors})]
    (assert (= 200 (:status r)) (pr-str r))
    (swap! clock max (double (get-in r [:body "erasedAt"])))
    (:body r)))

(defn- without [facts families]
  (let [removed (set (map vec families))] (vec (remove #(removed [(:e %) (:a %)]) facts))))

(defn import-frame!
  "Send one import frame of whole subjects as load1's importer would: read the removal frontier, leave out every
  removed family, frame with the frontier's sequence. `between` runs after the frame is built and before it is sent
  (the window a removal can fall into). On ErasureFrontierChanged or ErasureReplayDeclined (both refuse the whole
  commit), read the frontier again and resend. Returns the attempts."
  [c subjects command between & {:keys [no-seq]}]
  (loop [attempt 0 out [] between between]
    (let [f (frontier (:name c))
          facts (without (vec (mapcat :facts subjects)) (get f "families"))
          ;; The frame is framed from this read; the removal falls between it and the send. The commit's clock is
          ;; taken at send, as the server-assigned record time is.
          _ (when between (between))
          input (frame {:facts facts :entities (vec (distinct (map :e facts))) :command command :class "import"
                        :actor "bulk-import" :erasure-seq (when-not no-seq (get f "seq")) :source (head (:conn c))
                        :clock (swap! (:clock c) inc) :id-block (block (swap! (:blocks c) inc))})
          r (w/send! (:name c) input)
          out (conj out {:attempt attempt :seq (get f "seq") :facts (count facts) :outcome (:outcome r)})]
      (cond (= 200 (:status r)) out
            (and (< attempt 3) (#{"ErasureFrontierChanged" "ErasureReplayDeclined"} (second (:outcome r))))
            (recur (inc attempt) out nil)
            :else (throw (ex-info "import refused" {:out out :body (:body r)}))))))

(defn- texts-at
  "Every route's raw answer for these subjects at position p, as one string (to search for a removed plaintext)."
  [name conn subjects p feed]
  (let [basis {"validAt" 5.0 "recordedPosition" p} ents (vec (mapcat :entities subjects))]
    (pr-str [(route name "v1" "read" {"entityIds" ents "basis" basis})
             (route name "v1" "read" {"entityIds" ents "history" true "basis" {"recordedPosition" p}})
             (for [s subjects] (reach/response name (d/db conn) {"roots" [(:root s)] "basis" basis "full" true}))
             (filter #(<= (second %) p) feed)])))

(defn- log-text [conn]
  (str/join "\n" (for [{:keys [data]} (d/tx-range (d/log conn) nil nil) dt data] (pr-str (:v dt)))))

(defn- keys-gone? [name ids]
  (loop [n 0]
    (cond (not-any? #(envelope/key-present? name % nil) ids) true
          (> n 100) false
          :else (do (Thread/sleep 100) (recur (inc n))))))

(deftest removal-of-a-subject-mid-import
  (envelope/start!)
  (doseq [option [false true]]
    (with-redefs [policy/import-whole? option policy/import-commit-us (when option 40000)]
      (reference/in-scope
        (fn [name conn]
          (is (str/starts-with? name "s2-"))
          (is (= 200 (:status (route name "v2" "protection" {"attributes" [ssn] "sealed" true}))))
          ;; [DX-ACT9] DX_IMP2_MOVE_PER_ACCOUNT=1 (with TX2_REMOVAL_PER_ACCOUNT=1): the database is moved to removal
          ;; sequences per account first, so the gate runs under the per-account rule (every option on together).
          (when (= "1" (System/getenv "DX_IMP2_MOVE_PER_ACCOUNT"))
            (is (= 200 (:status (route name "v2" "removal-per-account" {})))))
          (let [tag (str "imp2-rm-" option)
                _ (reset! clock (double (System/currentTimeMillis)))
                c {:name name :conn conn :clock clock :blocks (atom (if option 200000 100000))}
                [s1 s2 s3 s4 s5 s6] (mapv #(protected-subject tag % (+ 20 (* 7 %))) (range 6))
                ;; 1. Between its frame's read and commit: a removal of s1's protected value. Nothing of s1 exists yet.
                r1 (atom nil)
                a1 (import-frame! c [s1] "rm-frame-1" #(reset! r1 (erase! name (str tag "-rm-1") [{"entityId" (second (:entities s1)) "attribute" ssn}])))
                ;; 2. A multi-subject frame: s3 is removed (every protected attribute) between read and commit.
                r2 (atom nil)
                a2 (import-frame! c [s2 s3 s4] "rm-frame-2" #(reset! r2 (erase! name (str tag "-rm-2") [{"entityId" (second (:entities s3))}])))
                ;; 3. After its commit: an ordinary removal of an imported subject's value.
                a3 (import-frame! c [s5] "rm-frame-3" nil)
                r3 (erase! name (str tag "-rm-3") [{"entityId" (second (:entities s5)) "attribute" ssn}])
                removed-ids (map #(get % "assertionId") (get r3 "identities"))
                ;; 4. As 1, from a client that sends no removal sequence: the families rule alone must hold.
                a4 (import-frame! c [s6] "rm-frame-4" #(erase! name (str tag "-rm-4") [{"entityId" (second (:entities s6))}]) :no-seq true)
                removed #{(:secret s1) (:secret s3) (:secret s5) (:secret s6)}
                kept #{(:secret s2) (:secret s4)}
                ;; Visibility is judged on the unprotected facts (the feed and journal carry protected values as
                ;; tokens); the protected values are judged by plaintext below.
                expected (fn [s] (assoc s :facts (vec (butlast (:facts s)))))
                subjects (mapv expected [s1 s2 s3 s4 s5 s6])
                h (head conn) feed (w/feed-all name)
                leaks (vec (for [p (range 1 (inc h)) :let [t (texts-at name conn [s1 s2 s3 s4 s5 s6] p feed)]
                                 v removed :when (str/includes? t v)] [p v]))
                sw (w/sweep name conn subjects (w/ids-from-log name subjects))
                current (route name "v1" "read" {"entityIds" (vec (mapcat :entities [s1 s2 s3 s4 s5 s6])) "basis" {"validAt" 5.0}})
                kept-visible (filter #(str/includes? (pr-str current) %) kept)
                log (log-text conn)
                f (frontier name)]
            (println "DX-IMP2_REMOVAL" (json/write-str {:option option :frame1 a1 :frame2 a2 :frame3 a3 :frame4 a4
                                                        :removal1 @r1 :removal2 @r2 :removal3 (dissoc r3 "identities")
                                                        :removedAfterCommit (count removed-ids) :families (get f "families")
                                                        :leaks (count leaks) :visibility (#'w/half-summary sw)
                                                        :keptVisible (count kept-visible)}))
            ;; In every arm: the import is refused whole first, then sent again.
            (is (= [[409 "ErasureFrontierChanged"] [200 nil]] (mapv :outcome a1)) (pr-str a1))
            (is (= [[409 "ErasureFrontierChanged"] [200 nil]] (mapv :outcome a2)) (pr-str a2))
            (is (= [[200 nil]] (mapv :outcome a3)))
            (is (= 0 (count (get @r1 "identities")) (count (get @r2 "identities"))) "the removals found nothing to remove yet")
            (is (= 1 (count removed-ids)))
            (is (keys-gone? name removed-ids) "the removed value's key is shredded")
            (is (not-any? #(str/includes? log %) (concat removed kept)) "no protected plaintext in the log")
            (is (= 2 (count kept-visible)) "the values not removed are still read")
            (if option
              (do
                (is (= [[409 "ErasureReplayDeclined"] [200 nil]] (mapv :outcome a4)) (pr-str a4))
                ;; With the option: the resent frames leave the removed families out; nothing removed comes back.
                (is (= [(:n s1) (dec (:n s1))] (mapv :facts a1)))
                (is (= [(+ (:n s2) (:n s3) (:n s4)) (+ (:n s2) (:n s3) (:n s4) -1)] (mapv :facts a2)))
                (is (= #{[(second (:entities s1)) ssn] [(second (:entities s3)) ssn] [(second (:entities s5)) ssn] [(second (:entities s6)) ssn]}
                       (set (get f "families"))))
                (is (empty? leaks) (pr-str (take 5 leaks)))
                (is (empty? (:half sw)) (pr-str (take 5 (:half sw)))))
              ;; Without it (the fault): a removal that names a subject before its import commits removes nothing,
              ;; and the resent import brings the value back.
              (do (is (= [[200 nil]] (mapv :outcome a4)) (pr-str a4))
                  (is (= #{(:secret s1) (:secret s3) (:secret s6)} (set (map second leaks))) (pr-str (distinct (map second leaks))))))))))))

(defn -main [& _]
  (let [r (clojure.test/run-tests 'removal-gate)]
    (println "DX-IMP2_REMOVAL_GATE" (json/write-str (select-keys r [:test :pass :fail :error])))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
