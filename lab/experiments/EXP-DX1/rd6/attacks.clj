(ns rd6-attacks
  "[DX-RD6] Adversarial review of the two pinned-read options (TX2_PINNED_SHORTCUT, pinned.clj; TX2_PINNED_CUT_LOOKUP,
  group_cut.clj). Reviewer's tests; they change none of the code under review. One JVM, in-memory Datomic, the gateway's
  own route handler. Each read is answered under every option set in turn (with-redefs of the two option vars, the
  gateway's caches cleared before each answer), and every answer is compared with the options-off answer, which is
  the reference. Each test prints one DX-RD6 line with what it measured. Run by rd6/clj-run.sh after the S5 harness
  (wfix1/regression.clj, w2/wide_gate.clj, s5/fuzz.clj) is loaded.

  Modes: :off (reference), :on (both options), :cut (cut lookup alone), :short (short-cut alone), :hard (both, plus the
  review's hardening: refuse the short-cut when the subject's history holds any datom after the pin; refuse the cut
  lookup when the position's history holds more than its one assertion)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is testing]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.storage :as storage]
            [triplex.gateway.pinned :as pinned] [triplex.gateway.group-cut :as group-cut]
            [triplex.gateway.reach :as reach] [triplex.gateway.entity-cache :as cache]
            [triplex.gateway.group :as group]
            [s5-fuzz :as fz] [wfix1-regression :as reference] [wide-gate :as wide])
  (:import [java.util Random] [java.util.concurrent.atomic LongAdder]))

(defn emit [tag m] (println tag (json/write-str m)) (flush))
(declare lean-read-nocache)

;; ---------------------------------------------------------------- option sets

;; The rule the running gateway uses: pinned.clj's, replaced at load by cross_index.clj's (index entries aside).
(def base-unchanged @#'pinned/unchanged-since?)
(def base-member-at @#'group-cut/member-at)

(defn hardened-unchanged
  "The builder's rule, and no datom of the subject in the history index (assertion or retraction) with a transaction
  after the pin; index entries are left aside as the builder's rule leaves them."
  [current eid t p]
  (and (base-unchanged current eid t p)
       (let [last-tx (d/t->tx t) ix-a (d/entid current :triplex.ix/entry)]
         (not-any? (fn [^datomic.Datom x] (and (> (.tx x) last-tx) (not (and ix-a (= ix-a (.a x))))))
                   (d/datoms (d/history current) :eavt eid)))))

(defn hardened-member-at
  "The builder's lookup, accepted only when the position's history holds exactly its one assertion; otherwise the
  lookup on the past view (the reference)."
  [db cut]
  (let [current pinned/*current* t (d/as-of-t db)]
    (if (and group-cut/current-lookup t current)
      (let [a (d/entid current :triplex.group/position)
            all (when a (vec (take 2 (d/datoms (d/history current) :avet a cut))))]
        (if (<= (count all) 1)
          (base-member-at db cut)
          (d/entid db [:triplex.group/position cut])))
      (base-member-at db cut))))

(def modes [:on :cut :short :hard])
(defn with-mode [mode f]
  (let [[sc cl u m] (case mode
                      :off [false false base-unchanged base-member-at]
                      :on [true true base-unchanged base-member-at]
                      :cut [false true base-unchanged base-member-at]
                      :short [true false base-unchanged base-member-at]
                      :hard [true true hardened-unchanged hardened-member-at]
                      :cut-hard [false true base-unchanged hardened-member-at])]
    (with-redefs [pinned/enabled sc group-cut/current-lookup cl pinned/unchanged-since? u group-cut/member-at m]
      (f))))

(defn icount [xs] (reduce (fn [n _] (inc n)) 0 xs))
(defn shortcut-answers [] (.sum ^LongAdder pinned/current-answers))

;; ---------------------------------------------------------------- reads

(defn- rows-of [r]
  (if (= 200 (:status r))
    (vec (sort-by #(get-in % ["id" "v"]) (get-in r [:body "rows"])))
    [:refused (:status r) (get-in r [:body "code"])]))

(defn lean-read
  "The product's read route (/v1/db/<name>/read), the gateway's caches for the scope cleared first."
  [name input]
  (reach/forget! name)
  (rows-of (reference/route name "v1" "read" input)))

(defn reach-read
  "The world route (/v2/db/<name>/reach-many), full answers, caches cleared first."
  [name roots basis]
  (reach/forget! name)
  (let [r (reference/route name "v2" "reach-many" {"roots" (vec roots) "basis" basis "full" true})]
    (if (= 200 (:status r)) (:body r) [:refused (:status r) (get-in r [:body "code"])])))

(defn compare-reads
  "reads: [[where f] ...]. Each f under :off and under each mode; returns counts and the first differences."
  [reads & [ms]]
  (let [ms (or ms modes) before (shortcut-answers)]
    (let [out (reduce (fn [acc [where f]]
                        (let [reference (with-mode :off f)]
                          (reduce (fn [acc m]
                                    (let [x (with-mode m f)]
                                      (cond-> (update-in acc [:compared m] (fnil inc 0))
                                        (not= reference x)
                                        (-> (update-in [:differences m] (fnil inc 0))
                                            (update :first (fn [v] (if (< (count v) 6)
                                                                     (conj v {:mode m :where where
                                                                              :off (pr-str (take 3 (if (map? reference) (get reference "entities") reference)))
                                                                              :got (pr-str (take 3 (if (map? x) (get x "entities") x)))})
                                                                     v)))))))
                                  (update acc :reads inc) ms)))
                      {:reads 0 :compared {} :differences {} :first []} reads)]
      (assoc out :shortcutAnswers (- (shortcut-answers) before)))))

(defn clocks-of [db n]
  (let [all (vec (sort (distinct (map :v (d/datoms db :aevt :triplex.tx/max-recorded-at)))))]
    (if (<= (count all) n) all (vec (take-nth (max 1 (quot (count all) n)) all)))))

(defn pinned-reads
  "Every pinned read shape for `owners` at `positions`: one subject, all of them in one request, field 0 by pattern,
  three valid times, record clocks, and worlds (reach)."
  [name conn owners positions & [{:keys [clocks reach?] :or {clocks 12 reach? true}}]]
  (let [db (d/db conn)]
    (concat
      (for [p positions o owners v [1.0 5.0 50.0]]
        [[:read p o v] #(lean-read name {"entityIds" [o] "basis" {"validAt" v "recordedPosition" p}})])
      (for [p positions]
        [[:read-all p] #(lean-read name {"entityIds" (vec owners) "basis" {"validAt" 5.0 "recordedPosition" p}})])
      (for [p positions]
        [[:read-field p] #(lean-read name {"entityIds" (vec owners) "basis" {"validAt" 5.0 "recordedPosition" p}
                                          "pattern" {"attribute" ":fz/f0"}})])
      (for [r (clocks-of db clocks)]
        [[:read-at r] #(lean-read name {"entityIds" (vec owners) "basis" {"validAt" 5.0 "recordedAt" r}})])
      (when reach?
        (for [p positions]
          [[:reach p] #(reach-read name owners {"validAt" 5.0 "recordedPosition" p})])))))

;; ---------------------------------------------------------------- the log audit

(defn audit
  "Every transaction in the log: entities with a retraction and no assertion other than an index entry in the same
  transaction (the case the short-cut's rule cannot see), split by whether the entity is a subject (it has ever had
  a public ID); and every grouped-save position retracted or asserted twice."
  [conn]
  (let [db (d/db conn) h (d/history db)
        id-a (d/entid db :triplex.entity/id) ix-a (d/entid db :triplex.ix/entry) gp-a (d/entid db :triplex.group/position)
        subject? (memoize (fn [e] (boolean (and id-a (first (d/datoms h :eavt e id-a))))))
        ident (memoize (fn [a] (str (d/ident db a))))
        out (reduce
              (fn [acc {:keys [t data]}]
                (let [acc (update acc :transactions inc)
                      acc (reduce
                            (fn [acc [e ds]]
                              (let [rets (remove #(.added ^datomic.Datom %) ds)
                                    adds (filter #(.added ^datomic.Datom %) ds)
                                    real-adds (remove #(= ix-a (.a ^datomic.Datom %)) adds)
                                    real-rets (remove #(= ix-a (.a ^datomic.Datom %)) rets)
                                    attrs (fn [xs] (vec (sort (distinct (map #(ident (.a ^datomic.Datom %)) xs)))))]
                                (if (empty? rets) acc
                                  (let [subj (subject? e)
                                        k (str (attrs rets) " + " (attrs adds))]
                                    (cond-> (update-in acc [(if subj :subjectRetracting :otherRetracting) k] (fnil inc 0))
                                      (and subj (empty? real-rets) (empty? real-adds))
                                      (update :indexOnlyRetractions inc)
                                      (and subj (seq real-rets) (empty? real-adds))
                                      (-> (update :violations inc)
                                          (update :firstViolations #(if (< (count %) 5) (conj % {:t t :e e :retracted (attrs rets) :added (attrs adds)}) %))))))))
                            acc (group-by #(.e ^datomic.Datom %) data))]
                  (if gp-a
                    (let [gp (filter #(= gp-a (.a ^datomic.Datom %)) data)]
                      (-> acc (update :groupPositionRetractions + (count (remove #(.added ^datomic.Datom %) gp)))
                          (update :groupPositionAssertions + (count (filter #(.added ^datomic.Datom %) gp)))))
                    acc)))
              {:transactions 0 :violations 0 :indexOnlyRetractions 0 :firstViolations [] :subjectRetracting {} :otherRetracting {}
               :groupPositionRetractions 0 :groupPositionAssertions 0}
              (d/tx-range (d/log conn) nil nil))
        values (when gp-a (map :v (filter :added (d/datoms h :aevt gp-a))))]
    (assoc out :groupPositionDuplicates (if values (- (count values) (count (distinct values))) 0))))

;; ---------------------------------------------------------------- saves through the product's route

(def counter (atom 6000000))
(defn block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn head [conn] (storage/head-position (d/db conn)))
(def g0 (fz/gen-state 6 "acct/rd6"))
(defn fact-of [o f v pred]
  (merge {:owner o :field f :pred pred}
         (if (and (string? v) (str/starts-with? v "ref:")) {:type :ref :value (subs v 4)} {:type :string :value v})))
(defn save!
  "One save through the transact route: set [[owner field value]] (a value \"ref:<id>\" is a reference), retire
  [[owner field]]. Returns its position."
  [name conn {:keys [set retire command expect] :or {expect 200}}]
  (let [owners (distinct (map first (concat set retire)))
        model (into {} (for [o owners] [o (fz/read-owner name o {"validAt" 5.0})]))
        facts (vec (for [[o f v] set] (fact-of o f v (get-in model [o f]))))
        retires (vec (for [[o f] retire] {:owner o :field f :pred (get-in model [o f])}))
        [_ input] (fz/input-of g0 {:command (or command (str "rd6-" (swap! counter inc))) :facts facts :retires retires
                                   :source (head conn) :block (block)})
        reply (reference/send name input)]
    (when-not (= expect (:status reply)) (throw (ex-info "save" {:reply reply :set set :retire retire})))
    (fz/position-of reply)))

;; ---------------------------------------------------------------- 1. a retraction without an assertion

(defn- raw-retract! [conn eid ^String needle]
  (let [db (d/db conn)
        row (first (filter #(str/includes? ^String (:v %) needle) (d/datoms db :eavt eid :triplex.entity/row)))]
    (assert row (str "no row with " needle))
    @(d/transact conn [[:db/retract eid :triplex.entity/row (:v row)]])
    (:v row)))

(deftest a-retraction-without-an-assertion
  ;; No writer on the head does this (the audit below checks every writer the fuzz runs); this measures what the
  ;; short-cut, the hardening and the options-off routes answer if one ever did.
  (reference/in-scope
    (fn [name conn]
      (let [S "acct/rd6/subject/s" T "acct/rd6/subject/t"]
        (save! name conn {:set [[S ":fz/f0" "s0"] [S ":fz/f1" "s1-keep-me"]]})
        (save! name conn {:set [[T ":fz/f0" "t0"]]})
        (let [pin (head conn)
              _ (save! name conn {:set [[T ":fz/f0" "t1"]]})
              eid (d/entid (d/db conn) [:triplex.entity/id S])
              _ (raw-retract! conn eid "s1-keep-me")
              basis {"validAt" 5.0 "recordedPosition" pin}
              lean (compare-reads [[[:read pin S] #(lean-read name {"entityIds" [S] "basis" basis})]
                                   [[:reach pin S] #(reach-read name [S] basis)]])
              ;; The options-off reach route caches parsed entities by (entity, revision): a read at the head after the
              ;; retraction stores the entity at its unchanged revision, and the same pinned read then answers from it.
              _ (reach/forget! name)
              cold (with-mode :off #(reference/route name "v2" "reach-many" {"roots" [S] "basis" basis "full" true}))
              _ (reach/forget! name)
              _ (with-mode :off #(reference/route name "v2" "reach-many" {"roots" [S] "basis" {"validAt" 5.0} "full" true}))
              warm (with-mode :off #(reference/route name "v2" "reach-many" {"roots" [S] "basis" basis "full" true}))]
          (emit "DX-RD6_ATTACK" {:case "a retraction of a subject's row after the pin with no assertion on it (hypothetical writer)"
                                 :lean lean
                                 :offReachColdEqualsWarm (= (:body cold) (:body warm))})
          (is (pos? (get-in lean [:differences :on] 0)) "expected: the short-cut answers without the retracted row")
          (is (zero? (get-in lean [:differences :hard] 0)) "the hardening must give the options-off answer")
          (is (not= (:body cold) (:body warm)) "expected: the options-off reach route's cache depends on the same invariant"))))))

;; ---------------------------------------------------------------- 2. retraction and re-assertion; a datom moved

(deftest a-retraction-then-reassertion-and-a-moved-datom
  (reference/in-scope
    (fn [name conn]
      (let [S "acct/rd6/subject/s" T "acct/rd6/subject/t" U "acct/rd6/subject/u"]
        (save! name conn {:set [[S ":fz/f0" "s0"] [S ":fz/f1" "s1-same"]]})
        (save! name conn {:set [[T ":fz/f0" "t0"]]})
        (save! name conn {:set [[U ":fz/f0" "u0"] [U ":fz/f1" "u1-moving"]]})
        (let [pin (head conn)
              db (d/db conn) s (d/entid db [:triplex.entity/id S]) t (d/entid db [:triplex.entity/id T])
              u (d/entid db [:triplex.entity/id U])
              text (raw-retract! conn s "s1-same")
              _ @(d/transact conn [[:db/add s :triplex.entity/row text]])
              moving (first (filter #(str/includes? ^String (:v %) "u1-moving") (d/datoms (d/db conn) :eavt u :triplex.entity/row)))
              _ @(d/transact conn [[:db/retract u :triplex.entity/row (:v moving)] [:db/add t :triplex.entity/row (:v moving)]])
              _ (save! name conn {:set [[S ":fz/f2" "after"]] :command "after-pin-s"})
              top (head conn)
              r (compare-reads (for [p (range 1 (inc top)) o [S T U]]
                                 [[:read p o] #(lean-read name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}})]))]
          (emit "DX-RD6_ATTACK" {:case "retracted then re-asserted (same text); a row moved from U to T (hypothetical writers)" :result r})
          ;; The re-asserted row and T's new row carry a transaction after the pin, so the short-cut refuses them; U only
          ;; lost a row, which the rule cannot see.
          (is (zero? (get-in r [:differences :hard] 0))))))))

;; ---------------------------------------------------------------- 3. every product writer's retirements, pinned

(deftest retirements-by-the-product-writers
  (reference/in-scope
    (fn [name conn]
      (let [S "acct/rd6/subject/s" T "acct/rd6/subject/t" F "acct/rd6/form/f"]
        (save! name conn {:set [[S ":fz/f0" "s0"] [S ":fz/f1" "s1"] [S ":fz/f2" "s2"] [S ":fz/ref" (str "ref:" F)]]})
        (save! name conn {:set [[F ":fz/f0" "f0"] [F ":fz/f1" "f1"]]})
        (save! name conn {:set [[T ":fz/f0" "t0"] [T ":fz/f1" "t1"]]})
        (let [pins (atom [(head conn)])
              step! (fn [spec] (save! name conn spec) (swap! pins conj (head conn)))]
          ;; a retirement alone (no new value), on the per-subject writer and on the general writer
          (step! {:retire [[S ":fz/f1"]]})
          (fz/general #(step! {:retire [[T ":fz/f1"]]}))
          ;; a replacement; an owned entity changed alone (the subject's revision does not move)
          (step! {:set [[S ":fz/f0" "s0b"]]})
          (step! {:set [[F ":fz/f0" "f0b"]]})
          (step! {:retire [[F ":fz/f1"]]})
          ;; two owners in one save; the reference retired; a new owner created beside an existing one
          (step! {:set [[S ":fz/f2" "s2b"] [T ":fz/f0" "t0b"]]})
          (step! {:retire [[S ":fz/ref"]]})
          (step! {:set [["acct/rd6/enrolment/e" ":e/subject" (str "ref:" S)] [S ":fz/f3" "s3"]]})
          (fz/general #(step! {:retire [[S ":fz/f3"] [T ":fz/f0"]] :set [[F ":fz/f2" "f2"]]}))
          (let [top (head conn)
                owners [S T F "acct/rd6/enrolment/e"]
                r (compare-reads (pinned-reads name conn owners (range 1 (inc top))))
                a (audit conn)]
            (emit "DX-RD6_ATTACK" {:case "every retirement shape through the product's writers, every position" :head top :result r
                                   :audit (dissoc a :subjectRetracting :otherRetracting) :retractingShapes (:subjectRetracting a)})
            (is (empty? (:differences r)) (pr-str (:first r)))
            (is (pos? (:shortcutAnswers r)) "the short-cut must answer some reads")
            (is (zero? (:violations a)) (pr-str (:firstViolations a)))))))))

;; ---------------------------------------------------------------- 4. removal on request before and after the pin

(deftest removal-before-and-after-the-pin
  (if-not (System/getenv "TRIPLEX_ERASURE_DIRECTORY")
    (emit "DX-RD6_SKIP" {:case "removal" :why "needs TRIPLEX_ERASURE_DIRECTORY"})
    (doseq [sealed [false true]]
      (reference/in-scope
        (fn [name conn]
          (is (= 200 (:status (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" sealed}))))
          (let [S "acct/rd6/subject/s" T "acct/rd6/subject/t" U "acct/rd6/subject/u"
                positions (atom [])
                mark! #(swap! positions conj (head conn))
                erase! (fn [cmd o] (let [r (reference/route name "v1" "erase" {"commandId" cmd "selectors" [{"entityId" o "attribute" ":p/secret"}]})]
                                     (is (= 200 (:status r)) (pr-str r)) (mark!)))]
            (save! name conn {:set [[S ":fz/f0" "s0"] [S ":p/secret" "s-secret-1"]]}) (mark!)
            (save! name conn {:set [[T ":fz/f0" "t0"] [T ":p/secret" "t-secret-1"]]}) (mark!)
            (save! name conn {:set [[U ":fz/f0" "u0"] [U ":p/secret" "u-secret-1"]]}) (mark!)
            ;; U's value removed before the later pins; S's removed after them; T's replaced, then its new value removed
            (erase! "rm-u" U)
            (save! name conn {:set [[T ":p/secret" "t-secret-2"]]}) (mark!)
            (save! name conn {:set [[S ":fz/f1" "s1"]]}) (mark!)
            (erase! "rm-s" S)
            (erase! "rm-t" T)
            (save! name conn {:set [[U ":fz/f1" "u1"]]}) (mark!)
            (let [top (head conn)
                  owners [S T U]
                  r (compare-reads (pinned-reads name conn owners (range 1 (inc top)) {:reach? true}))
                  ;; every removed value is masked at every position, on every option set
                  leaked (vec (for [m (cons :off modes) p (range 1 (inc top)) o owners
                                    :let [rows (with-mode m #(lean-read name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" p}}))]
                                    row (when (vector? rows) rows)
                                    :when (map? row)
                                    :when (= ":p/secret" (get-in row ["attribute" "v"]))
                                    :let [v (get-in row ["value_string" "v"])]
                                    ;; by the end every value of :p/secret was removed (a removal by entity and
                                    ;; attribute names the field's whole history), so none may appear at any position
                                    :when (and v (re-find #"secret-" v))]
                                [m p o v]))]
              (emit "DX-RD6_ATTACK" {:case "removal on request before and after the pin" :sealed sealed :head top :result r
                                     :leakedRemovedValues (count leaked) :firstLeaks (take 5 leaked)})
              (is (empty? (:differences r)) (pr-str (:first r)))
              (is (empty? leaked) (pr-str (take 5 leaked)))
              (is (pos? (:shortcutAnswers r))))))))))

;; ---------------------------------------------------------------- 5. grouped saves and the cut lookup

(defn- grouped-batch!
  "One group of saves on distinct owners, formed by holding the group writer's first turn (wfix1's barrier)."
  [name conn specs]
  (let [inputs (vec (for [spec specs]
                      (let [owners (distinct (map first (concat (:set spec) (:retire spec))))
                            model (into {} (for [o owners] [o (fz/read-owner name o {"validAt" 5.0})]))
                            facts (vec (for [[o f v] (:set spec)] (fact-of o f v (get-in model [o f]))))
                            retires (vec (for [[o f] (:retire spec)] {:owner o :field f :pred (get-in model [o f])}))]
                        (second (fz/input-of g0 {:command (str "rd6g-" (swap! counter inc)) :facts facts :retires retires
                                                 :source (head conn) :block (block)})))))
        replies (reference/ready-batch name conn (first inputs) (vec (rest inputs)))]
    (mapv (fn [r] [(:status r) (fz/position-of r)]) replies)))

(deftest grouped-saves-and-the-cut-lookup
  (if-not group/enabled
    (emit "DX-RD6_SKIP" {:case "grouped" :why "needs TX2_GROUP_COMMIT=1"})
    (reference/in-scope
      (fn [name conn]
        (let [os (vec (for [i (range 6)] (str "acct/rd6/subject/g" i)))]
          (doseq [o os] (save! name conn {:set [[o ":fz/f0" (str o "-a")] [o ":fz/f1" (str o "-b")]]}))
          (let [g1 (grouped-batch! name conn (for [o (take 4 os)] {:set [[o ":fz/f0" (str o "-a2")]]}))
                g2 (grouped-batch! name conn [{:retire [[(os 0) ":fz/f1"]]} {:set [[(os 1) ":fz/f1" "x"]]}
                                              {:retire [[(os 4) ":fz/f0"]]} {:set [[(os 5) ":fz/f2" "new"]]}])
                g3 (grouped-batch! name conn (for [o (drop 2 os)] {:set [[o ":fz/f0" (str o "-a3")]] :retire [[o ":fz/f1"]]}))
                top (head conn)
                db (d/db conn)
                gp (d/entid db :triplex.group/position)
                members (icount (d/datoms db :aevt gp))
                r (compare-reads (pinned-reads name conn os (range 1 (inc top)) {:reach? true}))
                a (audit conn)]
            (emit "DX-RD6_ATTACK" {:case "grouped saves: every interior and end position" :groups [g1 g2 g3] :groupMembers members
                                   :head top :result r :audit (dissoc a :subjectRetracting :otherRetracting)})
            (is (empty? (:differences r)) (pr-str (:first r)))
            (is (zero? (:violations a)))
            (is (zero? (:groupPositionRetractions a)))
            (is (zero? (:groupPositionDuplicates a)))
            (is (> members 4) "the batches must form groups")
            ;; Hypothetical writers on a grouped position: retract an interior member's position, then assert the same
            ;; number on a new entity. No writer on the head does either (the audit above and in every fuzz setting).
            (let [interior (first (for [x (d/datoms db :aevt gp) :let [e (:e x)]
                                        :when (not= e (:v (first (d/datoms db :eavt e :triplex.group/physical))))] x))
                  q (:v interior)
                  _ @(d/transact conn [[:db/retract (:e interior) :triplex.group/position q]])
                  reads (fn [] (for [o os] [[:read q o] #(lean-read name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" q}})]))
                  retracted (compare-reads (reads) [:on :cut :hard])
                  _ @(d/transact conn [{:db/id "dup" :triplex.group/position q}])
                  duplicated (compare-reads (reads) [:on :cut :hard])]
              (emit "DX-RD6_ATTACK" {:case "a grouped position retracted, then asserted again on another entity (hypothetical writers)"
                                     :position q :retracted retracted :reassertedElsewhere duplicated})
              (is (zero? (get-in retracted [:differences :hard] 0)))
              (is (zero? (get-in duplicated [:differences :hard] 0))))))))))

;; ---------------------------------------------------------------- 6. owner head and the fold

(deftest owner-head-and-fold
  (if-not (requiring-resolve 'triplex.gateway.owner-layout/enabled)
    (emit "DX-RD6_SKIP" {:case "owner head"})
    (if-not @(requiring-resolve 'triplex.gateway.owner-layout/enabled)
      (emit "DX-RD6_SKIP" {:case "owner head" :why "needs TX2_SUBJECT_OWNER_HEAD=1"})
      (reference/in-scope
        (fn [name conn]
          (let [os (vec (for [i (range 3)] (str "acct/rd6/subject/h" i)))]
            (doseq [o os] (save! name conn {:set [[o ":fz/f0" "a"] [o ":fz/f1" "b"] [o ":fz/f2" "c"]]}))
            ;; replacements (covering root), again, an add-only save (the fold first), a retirement alone
            (doseq [[i o] (map-indexed vector os)]
              (save! name conn {:set [[o ":fz/f0" (str "a" i)]]})
              (save! name conn {:set [[o ":fz/f1" (str "b" i)]]})
              (save! name conn {:set [[o ":fz/f9" (str "new" i)]]})
              (save! name conn {:retire [[o ":fz/f2"]]})
              (save! name conn {:set [[o ":fz/f0" (str "a2" i)]]}))
            (let [top (head conn)
                  db (d/db conn)
                  roots (when-let [a (d/entid db :triplex.owner/root)] (icount (d/datoms (d/history db) :aevt a)))
                  folds (when-let [a (d/entid db :triplex.owner/folded)] (icount (d/datoms db :aevt a)))
                  r (compare-reads (pinned-reads name conn os (range 1 (inc top))))
                  a (audit conn)]
              (emit "DX-RD6_ATTACK" {:case "covering owner head and its fold, every position" :head top :rootDatoms roots :folds folds
                                     :result r :audit (dissoc a :otherRetracting) })
              (is (empty? (:differences r)) (pr-str (:first r)))
              (is (zero? (:violations a)) (pr-str (:firstViolations a))))))))))

;; ---------------------------------------------------------------- 6b. index entries (TX2_CROSS_INDEX=1)

(deftest index-entries-after-the-pin
  ;; The builder's rule (cross_index.clj's) ignores index entries asserted after the pin. The backfill and its
  ;; reconciliation write and retract entries on subjects with no other datom: an entry-only retraction.
  (if-not @(requiring-resolve 'triplex.gateway.cross-index/enabled)
    (emit "DX-RD6_SKIP" {:case "index entries" :why "needs TX2_CROSS_INDEX=1"})
    (reference/in-scope
      (fn [name conn]
        (let [S "acct/rd6/subject/s" T "acct/rd6/subject/t" U "acct/rd6/subject/u"]
          (save! name conn {:set [[S ":fz/f0" "s0"] [S ":fz/f1" "s1"]]})
          (save! name conn {:set [[T ":fz/f0" "t0"]]})
          (let [declared (reference/route name "v2" "index-declaration" {"version" 1 "attributes" [{"attribute" ":fz/f0" "code" "f0" "family" "string"}]})
                filled (reference/route name "v2" "index-backfill" {})
                _ (save! name conn {:set [[U ":fz/f0" "u0"]]})
                db (d/db conn) ix-a (d/entid db :triplex.ix/entry)
                s (d/entid db [:triplex.entity/id S]) t (d/entid db [:triplex.entity/id T])
                t-key (:v (first (d/datoms db :eavt t ix-a)))
                ;; a stale entry on S (T's key), which the next backfill's reconciliation retracts
                _ (when t-key @(d/transact conn [[:db/add s :triplex.ix/entry t-key]]))
                _ (save! name conn {:set [[U ":fz/f1" "u1"]]})
                refilled (reference/route name "v2" "index-backfill" {})
                _ (save! name conn {:set [[T ":fz/f0" "t1"]]})
                top (head conn)
                r (compare-reads (pinned-reads name conn [S T U] (range 1 (inc top))))
                a (audit conn)]
            (emit "DX-RD6_ATTACK" {:case "index entries written and retracted after the pin (backfill, reconciliation)"
                                   :declared (:status declared) :backfill [(:status filled) (:status refilled) (get-in refilled [:body "retracted"])]
                                   :staleKey (some? t-key) :head top :result r :audit (dissoc a :otherRetracting)})
            (is (= 200 (:status declared) (:status filled)))
            (is (empty? (:differences r)) (pr-str (:first r)))
            (is (pos? (:shortcutAnswers r)))
            (is (zero? (:violations a)))))))))

;; ---------------------------------------------------------------- 7. the fuzz: every writer the S5 harness runs

(def fuzz-totals (atom {:points 0 :reads 0 :compared {} :differences {} :first [] :shortcutAnswers 0 :violations 0
                        :firstViolations [] :groupPositionRetractions 0 :groupPositionDuplicates 0 :shapes {}}))

(defn- record-pinned! [label name conn owners ^Random rng]
  (let [top (head conn)
        positions (vec (sort (distinct (concat (range (max 1 (- top 25)) (inc top))
                                               (repeatedly 25 #(inc (.nextInt rng (max 1 top))))))))
        owners (vec (take 12 (shuffle (vec owners))))
        r (compare-reads (pinned-reads name conn owners positions {:clocks 8}))
        a (audit conn)]
    (swap! fuzz-totals
           (fn [t] (-> t (update :points inc) (update :reads + (:reads r))
                       (update :compared #(merge-with + % (:compared r))) (update :differences #(merge-with + % (:differences r)))
                       (update :first #(vec (take 6 (concat % (:first r)))))
                       (update :shortcutAnswers + (:shortcutAnswers r))
                       ;; the audit covers the whole log each time: keep the latest, which contains the earlier ones
                       (assoc-in [:audits label] (select-keys a [:transactions :violations :groupPositionRetractions :groupPositionDuplicates :groupPositionAssertions]))
                       (update :shapes #(merge-with max % (:subjectRetracting a)))
                       (update :firstViolations #(vec (take 5 (concat % (:firstViolations a))))))))
    (emit "DX-RD6_POINT" {:label label :head top :reads (:reads r) :differences (:differences r) :shortcutAnswers (:shortcutAnswers r)
                          :violations (:violations a) :groupPositionRetractions (:groupPositionRetractions a)})))

(defonce hooked
  (alter-var-root #'fz/deep-compare
    (fn [orig]
      (fn [c-name c-conn k-name k-conn owners rng ids]
        (let [diff (orig c-name c-conn k-name k-conn owners rng ids)]
          (record-pinned! "candidate" k-name k-conn owners rng)
          (record-pinned! "control" c-name c-conn owners rng)
          diff)))))

(defn fuzz-main
  "rd6/clj-run.sh fuzz: the S5 fuzzer's runs (its environment: S5_SEEDS, S5_STEPS, ...), every deep comparison point
  also comparing every pinned read shape under every option set, and auditing the log of both scopes."
  []
  (let [env (fn [k default] (Long/parseLong (or (System/getenv k) default)))
        seeds (map #(Long/parseLong %) (str/split (or (System/getenv "S5_SEEDS") "1") #","))
        runs (doall (for [s seeds] (fz/fuzz-run! s (env "S5_STEPS" "800") (env "S5_ROUNDS" "2") (env "S5_THREADS" "4") (env "S5_PER_THREAD" "60"))))
        s5-bad (count (filter #(or (seq (:differences %)) (seq (:deep-differences %))) runs))
        t @fuzz-totals
        violations (reduce + (map :violations (vals (:audits t))))
        ok (and (empty? (:differences t)) (zero? violations)
                (zero? (reduce + (map :groupPositionRetractions (vals (:audits t)))))
                (pos? (:shortcutAnswers t)))]
    (emit "DX-RD6_FUZZ" (assoc t :s5Runs (count runs) :s5Differing s5-bad
                               :serial (reduce + (map :serial runs))
                               :concurrent (reduce + (map (fn [r] (reduce + (map :saves (:concurrent r)))) runs))
                               :modes (apply merge-with + (map :modes runs))
                               :writers (apply merge-with + (map :writers runs))
                               :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))
                               :pass ok))
    (shutdown-agents)
    (System/exit (if ok 0 1))))

;; ---------------------------------------------------------------- 8. the hardening's cost (diagnostic, Mac toy)

(defn- timed [n f] (let [t0 (System/nanoTime)] (dotimes [_ n] (f)) (/ (- (System/nanoTime) t0) 1e6 n)))

(defn cost-main
  "A toy with long subject histories (each subject edited `edits` times before the pin); after the pin half the subjects
  are edited again and `groups` groups of four saves (TX2_GROUP_COMMIT=1; solo saves otherwise) land on other
  subjects. The time of one pinned read of one subject at the pin, per option set. Diagnostic only."
  []
  (reference/in-scope
    (fn [name conn]
      (let [n (Long/parseLong (or (System/getenv "RD6_SUBJECTS") "40"))
            edits (Long/parseLong (or (System/getenv "RD6_EDITS") "40"))
            groups (Long/parseLong (or (System/getenv "RD6_GROUPS") "300"))
            os (vec (for [i (range n)] (str "acct/rd6/subject/c" i)))
            changed (set (take (quot n 2) os))]
        (doseq [o os] (save! name conn {:set (vec (for [j (range 8)] [o (str ":fz/f" j) (str o "-" j)]))}))
        (dotimes [k edits] (doseq [o os] (save! name conn {:set [[o (str ":fz/f" (mod k 8)) (str o "-e" k)]]})))
        (let [pin (head conn)]
          (doseq [o changed] (save! name conn {:set [[o ":fz/f0" "after"]]}))
          (dotimes [k groups]
            (let [specs (for [i (range 4)] {:set [[(str "acct/rd6/other/" k "-" i) ":fz/f0" "x"]]})]
              (if group/enabled (grouped-batch! name conn specs) (doseq [sp specs] (save! name conn sp)))))
          (let [read (fn [o] #(lean-read-nocache name {"entityIds" [o] "basis" {"validAt" 5.0 "recordedPosition" pin}}))
                unchanged (vec (remove changed os))
                cost-modes [:off :cut :cut-hard :on :hard]
                run (fn [m xs] (with-mode m #(do (dotimes [_ 3] (doseq [o xs] ((read o))))
                                                (/ (timed 10 (fn [] (doseq [o xs] ((read o))))) (count xs)))))
                results (into {} (for [m cost-modes] [m {:unchanged (run m unchanged) :changed (run m (vec changed))}]))
                same (every? (fn [o] (apply = (for [m cost-modes] (with-mode m (read o))))) os)
                db (d/db conn) e (d/entid db [:triplex.entity/id (first unchanged)])
                gp (d/entid db :triplex.group/position)]
            ;; The checks alone, per call, on the same database: the builder's rule, the hardening, and for scale the
            ;; subject's datoms at the pin (what the as-of path reads) and now (what the short-cut reads); and the cut
            ;; lookup on an interior position, the builder's and the hardened one, against the lookup on the view.
            (let [cur (d/db conn) t (d/as-of-t (storage/at-position cur pin)) view (d/as-of cur t)
                  eids (vec (for [o unchanged] (d/entid cur [:triplex.entity/id o])))
                  per (fn [f] (dotimes [_ 200] (doseq [e eids] (f e)))
                        (let [t0 (System/nanoTime) k 2000]
                          (dotimes [_ k] (doseq [e eids] (f e)))
                          (/ (- (System/nanoTime) t0) 1e3 k (count eids))))
                  gpa (d/entid cur :triplex.group/position)
                  interior (when gpa (vec (take 50 (for [x (d/datoms cur :aevt gpa) :let [e (:e x)]
                                                         :when (not= e (:v (first (d/datoms cur :eavt e :triplex.group/physical))))]
                                                     (:v x)))))
                  views (when (seq interior) (into {} (for [q interior] [q (storage/at-position cur q)])))
                  per-q (fn [f] (when (seq interior)
                                  (dotimes [_ 50] (doseq [q interior] (f q)))
                                  (let [t0 (System/nanoTime) k 400]
                                    (dotimes [_ k] (doseq [q interior] (f q)))
                                    (/ (- (System/nanoTime) t0) 1e3 k (count interior)))))]
              (emit "DX-RD6_COST_CHECKS" {:diagnostic true :microsecondsPerCall
                                          {:builderRule (per #(base-unchanged cur % t pin))
                                           :hardenedRule (per #(hardened-unchanged cur % t pin))
                                           :subjectDatomsAtPin (per #(icount (d/datoms view :eavt %)))
                                           :subjectDatomsNow (per #(icount (d/datoms cur :eavt %)))
                                           :subjectHistory (per #(icount (d/datoms (d/history cur) :eavt %)))
                                           :cutLookupOnView (per-q #(d/entid (views %) [:triplex.group/position %]))
                                           :cutLookupBuilder (with-redefs [group-cut/current-lookup true]
                                                               (binding [pinned/*current* cur] (per-q #(base-member-at (views %) %))))
                                           :cutLookupHardened (with-redefs [group-cut/current-lookup true]
                                                                (binding [pinned/*current* cur] (per-q #(hardened-member-at (views %) %))))}
                                          :interiorPositions (count interior)}))
            (emit "DX-RD6_COST" {:diagnostic true :subjects n :editsBeforePin edits :pin pin :head (head conn)
                                 :groupPositionsAfterPin (if gp (icount (d/datoms db :aevt gp)) 0)
                                 :datomsOfOneUnchangedSubject {:current (icount (d/datoms db :eavt e)) :history (icount (d/datoms (d/history db) :eavt e))}
                                 :answersEqual same :msPerRead results}))))))
  (shutdown-agents)
  (System/exit 0))

(defn lean-read-nocache [name input] (rows-of (reference/route name "v1" "read" input)))

(defn attack-main []
  (let [r (clojure.test/run-tests 'rd6-attacks)]
    (emit "DX-RD6_RESULT" (merge (select-keys r [:test :pass :fail :error])
                                 {:settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))}))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
