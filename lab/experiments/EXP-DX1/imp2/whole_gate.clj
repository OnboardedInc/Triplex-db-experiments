(ns whole-gate
  "Import a subject whole (TX2_IMPORT_WHOLE_SUBJECT=1): the fault check, the visibility gate, kill and resume,
  live saves beside an import, identities, and counted work. Every read route is asked at every position."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d]
            [triplex.gateway.group :as group] [triplex.gateway.lean :as lean] [triplex.gateway.main :as main]
            [triplex.gateway.reach :as reach] [triplex.gateway.scope :as scope] [triplex.gateway.selftest :as rows]
            [triplex.gateway.storage :as storage] [clojure.walk]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.write-policy :as policy] [triplex.gateway.import-bound :as import-bound]
            [wfix1-regression :as reference] [imp2-frames :refer :all])
  (:import [java.security MessageDigest] [java.util HexFormat]))

;; ---------------------------------------------------------------- writer modes

(defn with-mode*
  "mode: :v01 (today's v0.1 writer: per-subject writer, no live priority), :grouped (group commit with live priority,
  where the bulk class's 96 rows and 64 KiB apply), :whole (v0.1 writer with the option), :whole-grouped."
  [mode limit f]
  (let [grouped? (#{:grouped :whole-grouped} mode) whole? (#{:whole :whole-grouped} mode)]
    (with-redefs [subject/enabled true group/enabled (boolean grouped?) policy/priority? (boolean grouped?)
                  policy/field-only? false policy/budget-us nil
                  policy/import-whole? (boolean whole?) policy/import-commit-us (when whole? limit)]
      (f))))
(defmacro with-mode [mode limit & body] `(with-mode* ~mode ~limit (fn [] ~@body)))

(defn send! [name input] (let [r (reference/send name input)] (assoc r :outcome (reference/outcome r))))

;; ---------------------------------------------------------------- what a reader sees of a subject

(defn- fact-key [{:keys [e a type v]}] [e a v])
(defn- row-key [r] (let [g #(let [x (get r %)] (if (map? x) (get x "v") x))]
                     [(g "entity_id") (g "attribute") (g "value_string")]))
(defn- decoded-key [row] [(:entity_id row) (:attribute row) (:value_string row)])

(defn- read-rows [name input]
  (let [r (reference/route name "v1" "read" input)]
    (assert (= 200 (:status r)) (pr-str r))
    (get-in r [:body "rows"])))

(defn- reach-keys
  "Every row a full reach from the root returns (rows come as wire maps or as row texts)."
  [name conn root basis]
  (let [body (json/read-str (reach/response name (d/db conn) {"roots" [root] "basis" basis "full" true}))
        found (volatile! #{})]
    (assert (not (contains? body "declined")) (pr-str body))
    (clojure.walk/postwalk
      (fn [x]
        ;; A reach row is [position id entity attribute type value ...].
        (when (and (vector? x) (<= 6 (count x)) (string? (nth x 3)) (str/starts-with? (nth x 3) ":"))
          (vswap! found conj [(nth x 2) (nth x 3) (nth x 5)]))
        x)
      (get body "entities"))
    @found))

(defn feed-all [name]
  (loop [after 0 out []]
    (let [page (reference/feed name after 200)]
      (if (empty? page) out (recur (second (peek page)) (into out page))))))

(defn- feed-keys
  "Every assertion the journal changes of transactions at or before p name, from the feed."
  [feed p]
  (set (for [[_ pos texts] feed :when (<= pos p) t texts :let [r (lean/decode t)] :when (= ":_tx/change" (:attribute r))
             :let [c (json/read-str (:value_json r))] :when (= "assert" (get c "op"))]
         [(get c "entityId") (get c "attribute") (get-in c ["value" "value"])])))

(defn classify [expected seen]
  (let [mine (set (filter expected seen))]
    (cond (empty? mine) :out (= mine expected) :whole :else :half)))

(defn routes-at
  "Every read route's view of each subject at position p. ids: the subject's assertion IDs (empty if not written)."
  [name conn subjects p feed ids-of]
  (let [basis {"validAt" 5.0 "recordedPosition" p}]
    (into {} (for [s subjects :let [expected (set (map fact-key (:facts s))) ents (:entities s)]]
               [(:root s)
                {:pinned (classify expected (map row-key (read-rows name {"entityIds" ents "basis" basis})))
                 :history (classify expected (map row-key (read-rows name {"entityIds" ents "history" true "basis" {"recordedPosition" p}})))
                 :reach (classify expected (reach-keys name conn (:root s) basis))
                 :byId (let [ids (ids-of (:root s))]
                         (if (empty? ids) :out
                           (classify expected (mapcat #(map row-key (read-rows name {"id" % "basis" basis})) ids))))
                 :feed (classify expected (feed-keys feed p))
                 :journal (classify expected
                                    (for [r (read-rows name {"entityIds" (vec (distinct (map #(get-in % ["tx_id" "v"])
                                                                                            (read-rows name {"entityIds" ents "history" true}))))
                                                             "basis" basis})
                                          :let [k (row-key r)] :when (= ":_tx/change" (second k))
                                          :let [c (json/read-str (get-in r ["value_json" "v"]))]]
                                      [(get c "entityId") (get c "attribute") (get-in c ["value" "value"])]))}]))))

(defn sweep
  "Ask every route at every position 1..head. Returns {:positions n :half [[p root route]...] :counts {...}}."
  [name conn subjects ids-of]
  (let [h (head conn) feed (feed-all name)
        views (for [p (range 1 (inc h))] [p (routes-at name conn subjects p feed ids-of)])
        cells (for [[p by-root] views [root by-route] by-root [route c] by-route] [p root route c])]
    {:positions h :reads (count cells)
     :counts (frequencies (map peek cells))
     :half (vec (for [[p root route c] cells :when (= c :half)] [p root route]))
     :byRoot (into (sorted-map) (for [s subjects]
                                  [(:root s) (vec (for [[p by-root] views] [p (frequencies (vals (get by-root (:root s))))]))]))}))

(defn ids-from-log
  "Each subject's business assertion IDs, read from history at the head (empty until written)."
  [name subjects]
  (into {} (for [s subjects]
             [(:root s) (vec (map #(get-in % ["id" "v"]) (read-rows name {"entityIds" (:entities s) "history" true})))])))

;; ---------------------------------------------------------------- counting

(defn- sha [^String s] (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") (.getBytes s "UTF-8"))))

(defn log-digest
  "All datoms of the log after the scope was created, except Datomic's own transaction instant (and `skip`
  attributes), in log order."
  [conn since-t & skip]
  (let [db (d/db conn) skipped (set (keep #(d/entid db %) (cons :db/txInstant skip))) parts (java.util.ArrayList.) n (volatile! 0)]
    (doseq [{:keys [data]} (d/tx-range (d/log conn) (inc since-t) nil) dt data :when (not (skipped (:a dt)))]
      (vswap! n inc) (.add parts (str (:e dt) "|" (:a dt) "|" (pr-str (:v dt)) "|" (:tx dt) "|" (:added dt))))
    {:datoms @n :sha256 (sha (str/join "\n" parts))}))

(defn commit-work
  "Datoms and text bytes the last transaction added."
  [conn]
  (let [{:keys [data]} (last (d/tx-range (d/log conn) nil nil))]
    {:datoms (count data) :textBytes (reduce + (for [dt data :when (string? (:v dt))] (count (.getBytes ^String (:v dt) "UTF-8"))))}))

(defn gateway-estimate
  "The gateway's own estimate of a frame (policy/import-estimate-us over the ops the gateway would prepare)."
  [conn input]
  (let [db (d/db conn) p (second (first (storage/tx-data db input (scope/entity db))))]
    {:ops (count (:ops p)) :bytes (policy/request-size input) :estimateUs (import-bound/estimate-us p input)
     :rows (+ (count (:new-ids p)) (count (filter #(and (vector? %) (= :triplex/retract (first %))) (:ops p))))}))

;; ---------------------------------------------------------------- a run: one scope, its clock and identity blocks

(defn ctx [name conn tag] {:name name :conn conn :tag tag :clock (atom 1000.0) :blocks (atom (* 1000 (Math/abs (hash tag))))})
(defn next-frame
  "Frame `subjects` (or :facts/:entities) at the current head with the next clock and a new identity block."
  [{:keys [conn clock blocks]} opts]
  (let [opts (merge {:source (head conn) :clock (swap! clock inc) :id-block (block (swap! blocks inc))} opts)]
    (if-let [ss (:subjects opts)] (subjects-frame ss opts) (frame opts))))

(defn neighbour! [c k]
  ;; A live save in another account: one new field on the neighbour's subject.
  (let [e (str "acct/" (:tag c) "-neighbour/pl:0")
        r (send! (:name c) (next-frame c {:facts [{:e e :a (str ":n/f" k) :type "string" :v (text (:tag c) "n" k)}]
                                          :entities [e] :command (str (:tag c) "-neighbour-" k)}))]
    (is (= [200 nil] (:outcome r)) (pr-str (:body r)))
    r))

(def sizes [20 46 47 160 500])

(defn- facts-chunks
  "Split one subject's facts into the longest runs that fit the bulk class (96 rows, 64 KiB), as a client must to get
  a subject of more than 46 facts through it today. Rows and bytes are the gateway's own counts."
  [c s]
  (loop [facts (:facts s) out []]
    (if (empty? facts) out
      (let [fits? (fn [k] (let [part (vec (take k facts))
                                {:keys [rows bytes]} (gateway-estimate (:conn c) (frame {:facts part :entities (vec (distinct (map :e part)))
                                                                                          :command "probe" :id-block (block 1) :source 9007199254740991
                                                                                          :clock 1.0E12 :class "import"}))]
                            (and (<= rows 96) (<= bytes 65536))))
            k (loop [k 1] (if (and (< k (count facts)) (fits? (inc k))) (recur (inc k)) k))]
        (recur (drop k facts) (conj out (vec (take k facts))))))))

(defn import-whole-frames!
  "Send each subject as one import frame; returns one entry per subject."
  [c subjects]
  (vec (for [[i s] (map-indexed vector subjects)]
         (let [input (next-frame c {:subjects [s] :command (str (:tag c) "-whole-" i) :class "import"})
               est (gateway-estimate (:conn c) input)
               r (send! (:name c) input)]
           (neighbour! c i)
           (cond-> (merge {:root (:root s) :facts (:n s) :outcome (:outcome r)} est)
             (get-in r [:body "maximum"]) (assoc :maximum (get-in r [:body "maximum"]))
             (get-in r [:body "estimatedMicros"]) (assoc :estimatedMicros (get-in r [:body "estimatedMicros"]))
             (= 200 (:status r)) (assoc :position (get-in r [:body "position" "v"])))))))

(defn- half-summary [{:keys [half] :as sw}]
  (-> (select-keys sw [:positions :reads :counts])
      (assoc :halfCells (count half)
             :halfPositionsByRoot (into (sorted-map) (for [[root cells] (group-by second half)] [root (vec (sort (distinct (map first cells))))]))
             :halfRoutes (into (sorted-map) (frequencies (map peek half))))))

(deftest fault-today
  ;; Step 1: what today's import path does with subjects of 20, 46, 47, 160 and 500 facts.
  (let [subjects (vec (map-indexed (fn [i n] (subject "imp2-fault" i n)) sizes))
        report (atom {})]
    ;; (a) today's v0.1 writer (per-subject writer, no live priority): no import bound at all.
    (with-mode :v01 nil
      (reference/in-scope
        (fn [name conn]
          (let [c (ctx name conn "fa") sent (import-whole-frames! c subjects)
                 sw (sweep name conn subjects (ids-from-log name subjects))]
             (is (every? #(= [200 nil] (:outcome %)) sent) "v0.1 writer: every subject is one commit, of any size")
             (is (empty? (:half sw)))
             (swap! report assoc :v01 {:sent sent :visibility (half-summary sw)})))))
    ;; (b) the grouped writer with live priority: the bulk class's 96 rows and 64 KiB.
    (with-mode :grouped nil
      (reference/in-scope
        (fn [name conn]
          (let [c (ctx name conn "fb") sent (import-whole-frames! c subjects)
                 one (fn [tag n] (let [s (assoc (subject tag 0 n) :entities [(str "acct/" tag "/pl:0")])
                                       s (update s :facts (fn [fs] (mapv (fn [f] (assoc f :e (:root s) :type "string" :v (str (:v f)))) fs)))]
                                   (:outcome (send! name (next-frame c {:subjects [s] :command (str tag "-one") :class "import"})))))]
             (is (= [[200 nil] [413 "BulkFrameTooLarge"] [413 "BulkFrameTooLarge"] [413 "BulkFrameTooLarge"] [413 "BulkFrameTooLarge"]]
                    (mapv :outcome sent)) (pr-str (mapv :outcome sent)))
             (is (every? #(nil? (:maximum %)) sent) "the refusal names no limit")
             (swap! report assoc :grouped {:sent sent :oneEntity46 (one "fb-one46" 46) :oneEntity47 (one "fb-one47" 47)})))))
    ;; (c) the only way through that bound: split a subject into frames that fit. Readers see it half imported.
    (with-mode :grouped nil
      (reference/in-scope
        (fn [name conn]
          (let [c (ctx name conn "fc")
                 frames (vec (for [[i s] (map-indexed vector subjects) [k part] (map-indexed vector (facts-chunks c s))]
                               (let [r (send! name (next-frame c {:facts part :entities (vec (distinct (map :e part)))
                                                                  :command (str "fc-" i "-" k) :class "import"}))]
                                 (is (= [200 nil] (:outcome r)) (pr-str (:body r)))
                                 (neighbour! c (+ (* 100 i) k))
                                 {:root (:root s) :part k :facts (count part) :position (get-in r [:body "position" "v"])})))
                 sw (sweep name conn subjects (ids-from-log name subjects))
                 ;; A kill between two frames of one subject: two of its frames committed, the rest never sent.
                 killed (subject "imp2-fault-kill" 0 160)
                 parts (facts-chunks c killed)
                 _ (doseq [[k part] (map-indexed vector (take 2 parts))]
                     (is (= [200 nil] (:outcome (send! name (next-frame c {:facts part :entities (vec (distinct (map :e part)))
                                                                         :command (str "fc-kill-" k) :class "import"}))))))
                 after (routes-at name conn [killed] (head conn) (feed-all name) (ids-from-log name [killed]))
                 visible (count (filter (set (map fact-key (:facts killed)))
                                        (map row-key (read-rows name {"entityIds" (:entities killed) "basis" {"validAt" 5.0}}))))]
             (is (seq (:half sw)) "the failing check: a split subject is visible half imported")
             (is (every? #{:half} (vals (get after (:root killed)))) "after a kill, the subject stays half imported on every route")
             (swap! report assoc :split {:frames frames :visibility (half-summary sw)
                                         :kill {:framesPlanned (count parts) :framesCommitted 2 :factsVisible visible :facts 160
                                                :routes (get after (:root killed))}})))))
    (println "DX-IMP2_FAULT" (json/write-str @report))))

;; ---------------------------------------------------------------- whole-subject packing (the option on)

(def limit-us (or (some-> (System/getenv "DX_IMP2_LIMIT_US") not-empty Long/parseLong) 40000))

(defn sizing-estimate
  "The gateway's estimate of a frame of these subjects, sized with the largest source and clock a frame can carry,
  so the packing of a source run never depends on the head it is sent at."
  [conn subjects]
  (:estimateUs (gateway-estimate conn (subjects-frame subjects {:command "imp2/sizing" :id-block (block 1)
                                                                 :source 9007199254740991 :clock 1.0E12 :class "import"}))))

(defn pack
  "The longest run of whole subjects from `first` whose frame fits the bound. A subject that alone exceeds it is
  refused with a typed answer and the limit; it is never split."
  [conn subjects first limit]
  (let [alone (sizing-estimate conn [(subjects first)])]
    (if (> alone limit)
      {:refused {:code "ImportSubjectTooLarge" :subject (:root (subjects first)) :facts (:n (subjects first))
                 :estimateUs alone :limitUs limit}}
      (loop [end (inc first)]
        (if (and (< end (count subjects)) (<= (sizing-estimate conn (subvec subjects first (inc end))) limit))
          (recur (inc end))
          {:first first :end end})))))

(defn mixed-subjects [tag]
  ;; Small subjects that share frames, the sizes of the fault check, and one more small one after the 500.
  (vec (map-indexed (fn [i n] (subject tag i n)) [8 12 20 14 9 10 20 46 47 160 11 500 13])))

(defn import-packed!
  "Import subjects frame by frame under the option, with a neighbour save between frames. A refused subject is
  reported and skipped (the importer stops on it in production; here the rest proves the frames around it)."
  [c subjects limit]
  (loop [first 0 out []]
    (if (>= first (count subjects)) out
      (let [{:keys [end refused] :as run} (pack (:conn c) subjects first limit)]
        (if refused
          (recur (inc first) (conj out {:refused refused}))
          (let [input (next-frame c {:subjects (subvec subjects first end) :command (str (:tag c) "-frame-" first) :class "import"})
                est (gateway-estimate (:conn c) input)
                r (send! (:name c) input)]
            (is (= [200 nil] (:outcome r)) (pr-str (:body r)))
            (neighbour! c first)
            (recur end (conj out (merge {:first first :end end :subjects (- end first) :facts (reduce + (map :n (subvec subjects first end)))
                                         :position (get-in r [:body "position" "v"])} est)))))))))

(deftest whole-subjects-visible-whole-or-not-at-all
  ;; Gates (b) and step 3: under the option, every subject is wholly in or wholly out at every position on every route.
  (doseq [mode [:whole :whole-grouped]]
    (with-mode mode limit-us
      (reference/in-scope
         (fn [name conn]
           (let [c (ctx name conn (str "w" (clojure.core/name mode)))
                 subjects (mixed-subjects (str "imp2-" (clojure.core/name mode)))
                 frames (import-packed! c subjects limit-us)
                 imported (vec (remove (set (keep #(get-in % [:refused :subject]) frames)) (map :root subjects)))
                 ;; The 500-fact subject sent anyway: the gateway refuses the whole commit and names the limit.
                 big (subjects 11)
                 forced (send! name (next-frame c {:subjects [big] :command "forced-500" :class "import"}))
                 sw (sweep name conn subjects (ids-from-log name subjects))]
             (is (= [413 "ImportCommitTooLarge"] (:outcome forced)) (pr-str (:body forced)))
             (is (= limit-us (get-in forced [:body "maximum"])))
             (is (< limit-us (get-in forced [:body "estimatedMicros"])))
             (is (= [(:root big)] (keep #(get-in % [:refused :subject]) frames)) "only the 500-fact subject is refused")
             (is (some #(> (:subjects %) 1) (remove :refused frames)) "a frame of several whole subjects")
             (is (empty? (:half sw)) (pr-str (take 5 (:half sw))))
             (is (every? (fn [[root views]] (every? #(= #{:out} (set (keys (second %)))) views))
                         (filter #(= (:root big) (key %)) (:byRoot sw))) "the refused subject never appears")
             (is (= #{:whole} (set (vals (get (routes-at name conn subjects (head conn) (feed-all name) (ids-from-log name subjects)) (:root (subjects 9))))))
                 "the 160-fact subject is whole at the head")
             (println "DX-IMP2_WHOLE" (json/write-str {:mode mode :limitUs limit-us :frames frames :forced (:body forced)
                                                       :visibility (half-summary sw) :imported (count imported)}))))))))

;; ---------------------------------------------------------------- an importer that can be killed (load1's protocol)

(defn import-frame-input
  "A frame's input is a function of the source run alone: command, identity block and clock follow `first`."
  [key subjects first end attempt source]
  (assoc (subjects-frame (subvec subjects first end)
                         {:command (str key "/" first) :id-block (block (+ 5000000 first)) :clock (+ 1000.0 first) :class "import"
                          :source source})
         "operationId" (str key "." first ".attempt-" attempt)))

(def outcomes (atom {}))
(defn run-importer!
  "Import from the durable ledger's cursor. ledger: atom {:cursor :frames {first receipt}} (what load1's checkpoint
  database holds). kill: (fn [stage first]) -> true to stop the process at that point. Returns :done or :killed."
  [name conn subjects limit key ledger kill attempt]
  (try
    (loop []
      (let [first (:cursor @ledger)]
        (if (>= first (count subjects)) :done
          (let [{:keys [end refused]} (pack conn subjects first limit)
                _ (assert (not refused))
                input (import-frame-input key subjects first end attempt (head conn))
                _ (when (kill :before-send first) (throw (ex-info "killed" {::killed :before-send})))
                lost? (kill :lost-reply first)
                native d/transact-async
                _ (swap! outcomes update (if lost? :lostReply :sent) (fnil inc 0))
                r (if lost?
                    (with-redefs [d/transact-async (fn [c tx & o] @(apply native c tx o) (promise))] (send! name input))
                    (send! name input))
                _ (swap! outcomes update (or (second (:outcome r)) "ok") (fnil inc 0))
                receipt (cond (= 200 (:status r)) {:position (get-in r [:body "position" "v"]) :txId (get-in input ["claims" 0 "txId"])}
                              (#{"CommandConflict" "OperationDuplicate" "OutcomeUnknown"} (second (:outcome r)))
                              (let [found (reference/claim name (str key "/" first))]
                                (when (get found "txId")
                                  {:position (get-in found ["receipt" "position" "v"]) :txId (get found "txId") :recovered (second (:outcome r))}))
                              :else (throw (ex-info "import refused" {:body (:body r)})))]
            (when-not receipt (throw (ex-info "killed" {::killed :lost-before-commit})))
            (when (kill :after-commit first) (throw (ex-info "killed" {::killed :after-commit})))
            (swap! ledger #(-> % (assoc-in [:frames first] (assoc receipt :end end)) (assoc :cursor end)))
            (when (kill :after-checkpoint first) (throw (ex-info "killed" {::killed :after-checkpoint})))
            (recur)))))
    (catch clojure.lang.ExceptionInfo e (if (::killed (ex-data e)) :killed (throw e)))))

(defn resume-check!
  "On restart, every checkpointed frame's command must still resolve to its original receipt (load1's reopen check)."
  [name key ledger]
  (doseq [[first {:keys [position txId]}] (:frames @ledger)]
    (let [found (reference/claim name (str key "/" first))]
      (is (= [txId position] [(get found "txId") (get-in found ["receipt" "position" "v"])]) [:reopen first]))))

(defn small-subjects [tag n] (vec (for [i (range n)] (subject tag i (+ 20 (mod (* 7 i) 21))))))

(deftest kill-after-every-frame-and-resume
  ;; Gate (c): kill the importer at every frame through the first 50 subjects (before send, after the commit but
  ;; before the checkpoint, after the checkpoint, and a lost reply), resume each time; the result equals a control.
  (with-mode :whole limit-us
    (reference/in-scope
       (fn [control-name control]
         (reference/in-scope
           (fn [name conn]
             (let [since (d/basis-t (d/db conn)) _ (is (= since (d/basis-t (d/db control))))
                   subjects (conj (small-subjects "imp2-kill" 60) (subject "imp2-kill" 60 160) (subject "imp2-kill" 61 9))
                   key "imp2-kill"
                   control-ledger (atom {:cursor 0 :frames {}})
                   _ (is (= :done (run-importer! control-name control subjects limit-us key control-ledger (constantly false) 0)))
                   ledger (atom {:cursor 0 :frames {}})
                   _ (reset! outcomes {})
                   ;; Every frame that starts before subject 50 is killed before its send, loses its reply once,
                   ;; is killed after its commit but before its checkpoint, and is killed after its checkpoint.
                   kills (atom [])
                   kill (fn [stage first]
                          (when (and (< first 50) (not (some #{[first stage]} @kills)))
                            (swap! kills conj [first stage]) true))
                   restarts (loop [attempt 1]
                              (resume-check! name key ledger)
                              (case (run-importer! name conn subjects limit-us key ledger kill attempt)
                                :done attempt
                                :killed (recur (inc attempt))))
                   _ (resume-check! name key ledger)
                   ;; Each attempt has its own operation ID (as the SDK's); everything else must be equal.
                   final-control (log-digest control since :triplex.tx/operation-id) final (log-digest conn since :triplex.tx/operation-id)
                   history (fn [n] (read-rows n {"entityIds" (vec (mapcat :entities subjects)) "history" true}))
                   dupes (->> (history name) (map row-key) frequencies (filter #(> (val %) 1)) count)
                   commands (->> (feed-all name) (mapcat #(nth % 2)) (map lean/decode) (filter #(= ":_tx/command-id" (:attribute %)))
                                 (map :value_string) (filter #(str/starts-with? % key)) frequencies)]
               (is (= (count (:frames @control-ledger)) (count (:frames @ledger))) "same frames")
               (is (= (:frames @control-ledger) (into {} (map (fn [[k v]] [k (dissoc v :recovered)])) (:frames @ledger))) "same receipts")
               (is (= final-control final) "log equal to the control import, datom for datom")
               (is (= (sort (map row-key (history control-name))) (sort (map row-key (history name)))) "history equal")
               (is (zero? dupes) "no duplicate history")
               (is (every? #(= 1 %) (vals commands)) "each frame's command committed once")
               (is (empty? (:half (sweep name conn subjects (ids-from-log name subjects)))) "never half imported, kills included")
               (println "DX-IMP2_KILL" (json/write-str {:subjects (count subjects) :frames (count (:frames @ledger)) :kills (count @kills)
                                                         :byStage (frequencies (map second @kills)) :framesKilled (count (distinct (map first @kills))) :restarts restarts
                                                         :recovered (frequencies (keep :recovered (vals (:frames @ledger)))) :replies @outcomes
                                                         :log final :controlLog final-control :commands (count commands)})))))))))

;; ---------------------------------------------------------------- live saves beside an import (gate d)

(defn- live-save [c s field source command]
  ;; A live save of the subject's profile: one new field, framed as the SDK frames a save (no write class).
  (let [profile (second (:entities s))]
    (frame {:facts [{:e profile :a field :type "string" :v (text command)}] :entities [profile]
            :command command :id-block (block (swap! (:blocks c) inc)) :source source :clock (swap! (:clock c) inc)})))

(deftest live-saves-beside-an-import
  ;; Same subject: one side wins whole; the other is refused whole and replayed on top. Never merged. Other accounts
  ;; save freely between import frames.
  (doseq [mode [:whole :whole-grouped]]
    (with-mode mode limit-us
      (reference/in-scope
         (fn [name conn]
           (let [c (ctx name conn (str "d" (clojure.core/name mode)))
                 x (subject "imp2-race" 0 160) y (subject "imp2-race" 1 120)
                 ;; A: the live save of x reaches the writer first.
                 s0 (head conn)
                 import-x (next-frame c {:subjects [x] :command "race-import-x" :class "import" :source s0})
                 live-x (live-save c x ":live/a" s0 "race-live-x")
                 a1 (send! name live-x)
                 a2 (send! name import-x)
                 a2-wrote (reference/operation name "race-import-x.op")
                 _ (neighbour! c 1)
                 a3 (send! name (next-frame c {:subjects [x] :command "race-import-x" :class "import"}))
                 ;; B: the import of y reaches the writer first.
                 s1 (head conn)
                 import-y (next-frame c {:subjects [y] :command "race-import-y" :class "import" :source s1})
                 live-y (live-save c y ":live/b" s1 "race-live-y")
                 b1 (send! name import-y)
                 _ (neighbour! c 2)
                 b2 (send! name live-y)
                 b3 (send! name (live-save c y ":live/b" (head conn) "race-live-y"))
                 sw (sweep name conn [x y] (ids-from-log name [x y]))
                 current (fn [s] (set (map row-key (read-rows name {"entityIds" (:entities s) "basis" {"validAt" 5.0}}))))]
             (is (= [[200 nil] [409 "CasConflict"] [200 nil]] (mapv :outcome [a1 a2 a3])) (pr-str (mapv :body [a1 a2 a3])))
             (is (= [[200 nil] [409 "CasConflict"] [200 nil]] (mapv :outcome [b1 b2 b3])) (pr-str (mapv :body [b1 b2 b3])))
             (is (= {"status" "absent"} a2-wrote) "the refused import wrote nothing")
             (is (empty? (:half sw)) (pr-str (take 5 (:half sw))))
             (is (= (+ 1 160) (count (current x))) "x: the live field and the whole import, nothing lost")
             (is (= (+ 1 120) (count (current y))) "y: the whole import and the replayed live field")
             (println "DX-IMP2_RACE" (json/write-str {:mode mode :x (mapv :outcome [a1 a2 a3]) :y (mapv :outcome [b1 b2 b3])
                                                      :visibility (half-summary sw)}))))))))

;; ---------------------------------------------------------------- identities and receipts

(deftest an-imported-subject-is-a-save
  ;; The same frame as an import and as a live save: the same outcome, position, records and log. A resend after a
  ;; lost reply returns the original receipt.
  (with-mode :whole limit-us
    (reference/in-scope
       (fn [save-name save-conn]
         (reference/in-scope
           (fn [name conn]
             (let [since (d/basis-t (d/db conn)) _ (is (= since (d/basis-t (d/db save-conn))))
                   subjects (vec (for [[i n] (map-indexed vector [20 160 33])] (subject "imp2-same" i n)))
                   frames (for [[i s] (map-indexed vector subjects)]
                            (subjects-frame [s] {:command (str "same-" i) :id-block (block (+ 7000 i)) :clock (+ 2000.0 i) :source i}))
                   pairs (vec (for [f frames]
                                [(send! save-name f) (send! name (assoc f "writeClass" "import"))]))]
               (doseq [[l r] pairs]
                 (is (= [200 nil] (:outcome l) (:outcome r)) (pr-str (:body r)))
                 (is (= (get-in l [:body "position"]) (get-in r [:body "position"])))
                 (is (= (get-in l [:body "recordedAt"]) (get-in r [:body "recordedAt"]))))
               (is (= (log-digest save-conn since) (log-digest conn since)) "import and save store the same log")
               (is (= (feed-all save-name) (feed-all name)) "the same feed and journal")
               ;; A lost reply on an import commit, then resends.
               (let [s (subject "imp2-same" 9 160)
                     f (subjects-frame [s] {:command "same-lost" :id-block (block 7100) :clock 3000.0 :source (head conn) :class "import"})
                     native d/transact-async
                     lost (with-redefs [d/transact-async (fn [c tx & o] @(apply native c tx o) (promise))] (send! name f))
                     again (send! name f)
                     fresh (send! name (assoc f "operationId" "same-lost.op-2"))
                     receipt (reference/claim name "same-lost")]
                 (is (= [503 "OutcomeUnknown"] (:outcome lost)) (pr-str (:body lost)))
                 (is (= [409 "OperationDuplicate"] (:outcome again)))
                 (is (= [409 "CommandConflict"] (:outcome fresh)))
                 (is (= "committed" (get-in receipt ["receipt" "status"])))
                 (is (= (get-in receipt ["receipt" "position"]) (get (reference/operation name "same-lost.op") "position")))
                 (is (= 160 (count (filter (set (map fact-key (:facts s)))
                                           (map row-key (read-rows name {"entityIds" (:entities s) "history" true}))))) "written once")
                 (println "DX-IMP2_SAME" (json/write-str {:pairs (count pairs) :log (log-digest conn since)
                                                          :lost (mapv :outcome [lost again fresh]) :receipt receipt}))))))))))

;; ---------------------------------------------------------------- counted work per imported subject (gate g)

(deftest counted-work-per-subject
  ;; Commits, datoms, log bytes, the gateway's estimate and storage reads inside apply for one subject of 20, 160 and
  ;; 500 facts as one commit (the 500 under a raised bound so it can be counted). Clocks are diagnostic.
  (with-mode :whole 1000000
    (reference/in-scope
       (fn [name conn]
         (let [c (ctx name conn "g") native d/transact-async stats (atom nil)
               ;; Rounds: cold, warm, then warm with the frame's ordered identity block declared (historyIdentityBounds),
               ;; which replaces one history lookup per new ID with one range probe.
               out (vec (for [[i n] (map-indexed vector [20 160 500 20 160 500 20 160 500])]
                          (let [s (subject "imp2-work" i n)
                                plain (next-frame c {:subjects [s] :command (str "work-" i) :class "import"})
                                input (if (< i 6) plain (assoc plain "historyIdentityBounds" [(first (sort (get plain "newIds"))) (last (sort (get plain "newIds")))]))
                                est (gateway-estimate conn input)
                                r (with-redefs [group/stage-clock true
                                                d/transact-async (fn [c tx & o]
                                                                   (let [p (promise) fut (apply native c tx o)]
                                                                     (future (deliver p (try (let [rep @fut] (reset! stats (:io-stats rep)) rep)
                                                                                             (catch Throwable t t))))
                                                                     (reify clojure.lang.IDeref (deref [_] (let [v @p] (if (instance? Throwable v) (throw v) v)))
                                                                            clojure.lang.IBlockingDeref
                                                                            (deref [_ ms dflt] (let [v (deref p ms ::t)] (cond (= v ::t) dflt (instance? Throwable v) (throw v) :else v))))))]
                                    (send! name input))]
                            (is (= [200 nil] (:outcome r)) (pr-str (:body r)))
                            (merge {:facts n :round (cond (< i 3) "cold" (< i 6) "warm" :else "warm-bounds") :commits 1} est (commit-work conn)
                                   {:applyMsDiagnostic (get-in r [:body "nativeComputeMs"]) :readsInsideApply (get-in @stats [:reads :sql] 0)
                                    :ioStats (:reads @stats)}))))]
           (println "DX-IMP2_WORK" (json/write-str out)))))))

(defn -main [& _]
  (let [only (System/getenv "DX_IMP2_ONLY")
        r (if (seq only)
            (binding [clojure.test/*report-counters* (ref clojure.test/*initial-report-counters*)]
              (clojure.test/test-vars [(ns-resolve 'whole-gate (symbol only))]) @clojure.test/*report-counters*)
            (clojure.test/run-tests 'whole-gate))]
    (println "DX-IMP2_GATE" (json/write-str (select-keys r [:test :pass :fail :error])))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
