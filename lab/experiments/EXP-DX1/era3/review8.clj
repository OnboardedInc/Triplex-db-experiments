(ns era3-review8
  "[DX-ERA3, eighth review] Attacks on DX-ERA6 at 99359fa93 (gateway source = 1be3efbab, the reconciled removal branch
  merged onto the one branch's 65a851d1b). Loaded after wfix1/regression.clj, era2/gate.clj, era3/attack.clj to
  attack6.clj; era3/run.sh runs it with ERA3_MAIN=r8. Review: era3/REVIEW-8.md.
    C   the parsed-entity cache and a removal accepted on the key pass's repair path (removal_repair
        shred-after-failure!): a gateway that cached a subject's worlds before the removal and learns of the removal
        only through that path, and the gateway that took the removal; every read route that uses the cache (rows,
        rows with history, rows pinned, reach-many, reach-many pinned, a reach session, batch, batch pinned), each pin
        before and after the removal, under the read options (pinned short-cut and cut lookup off and on), with the
        drop hook in place and with it planted out of the repair path."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-commit :as rc] [triplex.gateway.removal-scope :as rs]
            [triplex.gateway.envelope :as envelope] [triplex.gateway.authority-sql :as sql]
            [triplex.gateway.entity-cache :as ec] [triplex.gateway.removal-drops :as drops]
            [triplex.gateway.pinned :as pinned] [triplex.gateway.group-cut :as group-cut]
            [triplex.gateway.recent :as recent] [triplex.gateway.batch :as batch]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack5 :as f])
  (:import [java.util.function Predicate]))

(def mode a/mode)
(def per-account? a/per-account?)
(def authority (if sql/url "postgresql" "file"))
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def boundaries (if per-account? [:log :commit] [:log]))
(defn bname [b] (clojure.core/name b))
(def c1 "acct/c/one")

;; ---- every read route that uses the parsed-entity cache ---------------------------------------------------------
(defn- post [name version action body]
  (let [r (f/safe #(offers/route name version action body))]
    [(:status r) (g/text (:body r))]))
(defn route-texts
  "Each route's [status text] for `entity` at the head and at `pin`; the session route is called twice (the second
  answer is the one kept, as the API1 gate does)."
  [name entity pin tag]
  (let [now {"validAt" 1.0e12} at (fn [p] {"recordedPosition" p "validAt" 1.0e12})
        session (str "r8-" tag "-" (System/nanoTime))]
    (array-map
      :rows (post name "v1" "read" {"entityIds" [entity]})
      :rows-history (post name "v1" "read" {"entityIds" [entity] "history" true})
      :rows-pin (post name "v1" "read" {"entityIds" [entity] "basis" (at pin)})
      :reach-many (post name "v2" "reach-many" {"roots" [entity] "basis" now})
      :reach-many-pin (post name "v2" "reach-many" {"roots" [entity] "basis" (at pin)})
      :reach-session (do (post name "v2" "reach-many" {"roots" [entity] "basis" now "session" session "erasureRefs" true})
                         (post name "v2" "reach-many" {"roots" [entity] "basis" now "session" session "erasureRefs" true}))
      :batch (post name "v2" "batch" {"basis" now "reads" [{"op" "reach" "roots" [entity]} {"op" "rows" "entityIds" [entity]}]})
      :batch-pin (post name "v2" "batch" {"basis" (at pin) "reads" [{"op" "reach" "roots" [entity]} {"op" "rows" "entityIds" [entity]}]}))))
(defn answered [texts value] (vec (for [[k [st t]] texts :when (and (= 200 st) (str/includes? t value))] k)))
;; the routes that must answer a value not removed: every one but the session's second call, which omits an entity the
;; session already holds (the API1 gate's rule)
(defn controls [texts] (vec (remove #(str/starts-with? (clojure.core/name %) "reach-session") (keys texts))))
(defn not-ok [texts] (into {} (for [[k [st t]] texts :when (not= 200 st)] [k [st (subs t 0 (min 120 (count t)))]])))

;; ---- one gateway's in-memory state for one database: what a second gateway that did not take the removal holds -----
(defn- named-key? [name k] (= name (ec/key-name k)))
(defn- entries-of [name] (into {} (filter (fn [[k _]] (named-key? name k))) ec/entries))
(defn- eid-entries [name eid] (count (filter (fn [[k _]] (and (instance? triplex.gateway.entity_cache.ParsedKey k) (= eid (.-eid ^triplex.gateway.entity_cache.ParsedKey k)))) (entries-of name))))
(defn snapshot [name] {:cut (get @privacy/cache name) :entries (entries-of name)})
(defn restore! [name {:keys [cut entries]}]
  (if cut (swap! privacy/cache assoc name cut) (swap! privacy/cache dissoc name))
  (swap! @#'drops/undropped dissoc name)
  (locking ec/entries
    (doseq [k (.keySet ec/entries) :when (named-key? name k)]
      (when-let [v (.remove ec/entries k)] (.addAndGet ec/bytes (- (long (:bytes v))))))
    (.removeIf ec/order (reify Predicate (test [_ k] (named-key? name k))))
    (doseq [[k v] entries] (.put ec/entries k v) (.add ec/order k) (.addAndGet ec/bytes (long (:bytes v))))))
(defn hits [] (.sum ec/hits))

;; ---- the read options toggled in one JVM (both read at call time) ------------------------------------------------
(defn with-read-options [{:keys [shortcut cut-lookup]} f]
  (let [p0 pinned/enabled c0 group-cut/current-lookup]
    (alter-var-root #'pinned/enabled (constantly (boolean shortcut)))
    (alter-var-root #'group-cut/current-lookup (constantly (boolean cut-lookup)))
    (try (f) (finally (alter-var-root #'pinned/enabled (constantly p0)) (alter-var-root #'group-cut/current-lookup (constantly c0))))))
(def read-option-sets [[:pinned-off {}] [:shortcut {:shortcut true}] [:cut-lookup {:cut-lookup true}]
                       [:both {:shortcut true :cut-lookup true}]])

;; ---- C: the repair path and the parsed-entity cache -----------------------------------------------------------------
(defn c-repair [boundary sealed? trigger fix? [oname opts]]
  (f/scope5 boundary sealed?
    (fn [name conn]
      (with-read-options opts
        (fn []
          (let [lbl (str "C the repair path and the entity cache, " (bname boundary) (when sealed? ", sealed") ", trigger "
                         (bname trigger) ", drop hook " (case fix? :in-place "in place" :drop-out "planted out" :drop-and-mask-out "and the answer's mask planted out") ", read options " (bname oname)
                         ", " mode ", " authority)
                seeds (g/seed! name [g/a1 g/b1 c1]) va (:value (seeds g/a1)) vb (:value (seeds g/b1))
                pin0 (g/head conn)
                eid (d/entid (d/db conn) [:triplex.entity/id g/a1])
                ;; R reads a1 (and b1) through every route: its caches hold a1's parsed entries
                before (route-texts name g/a1 pin0 "before")
                _ (route-texts name g/b1 pin0 "before-b")
                snap (snapshot name)
                entries-before (eid-entries name eid)
                ;; W takes the removal of a1 (published), and reads through every route itself
                rm (offers/outcome (a/remove-attr! name "c-rm" g/a1))
                pin1 (g/head conn)
                w-after (merge-with vector (route-texts name g/a1 pin0 "w-pin0") (route-texts name g/a1 pin1 "w-pin1"))
                ;; what makes R's key pass refuse its cut, so that the repair path advances R's frontier: another
                ;; removal's intent recorded on W (a removal in flight), or the log's policy copy rewritten by an addition
                trig (case trigger
                       :pending (do (privacy/prepare! name {"database" name "seq" (inc (long (g/seq-now name conn))) "commandId" "c-pend"
                                                            "selectors" [{"entityId" c1 "attribute" ":v"}] "erasedAt" (System/currentTimeMillis)})
                                    :intent-recorded)
                       :copy (offers/outcome (offers/route name "v2" "protection" {"attributes" [":v" ":q"] "sealed" sealed?})))
                ;; R: the state it held before the removal, then one key pass
                _ (restore! name snap)
                seq-before-pass (:seq (get @privacy/cache name))
                failures0 (f/failures)
                _ (if (= fix? :in-place) (@#'envelope/shred-published!)
                    (with-redefs [privacy/drop-hook nil] (@#'envelope/shred-published!)))
                seq-after-pass (:seq (get @privacy/cache name))
                undropped (count (get @@#'drops/undropped name))
                entries-after-pass (eid-entries name eid)
                ;; the in-flight removal's intent is released (its removal never committed), so every mode serves reads
                completed (when (= trigger :pending) (@#'privacy/remove-record! name "pending.json") :intent-released)
                ;; one rows read (the rows route does not read the parsed-entity cache): its cut drains the drops
                d0 (.sum ec/removal-drops)
                _ (post name "v1" "read" {"entityIds" [g/b1]})
                drops-at-first-cut (- (.sum ec/removal-drops) d0)
                entries-after-first-cut (eid-entries name eid)
                h0 (hits)
                read-all (fn [] (merge (into {} (for [[k v] (route-texts name g/a1 pin0 "r-pin0")] [(keyword (str (clojure.core/name k) "@pin0")) v]))
                                       (into {} (for [[k v] (route-texts name g/a1 (g/head conn) "r-head")] [(keyword (str (clojure.core/name k) "@head")) v]))))
                r-after (if (= fix? :drop-and-mask-out)
                          ;; sensitivity only: the answer's mask planted out as well, so a value held anywhere is answered
                          (with-redefs [privacy/masked identity privacy/text identity] (read-all))
                          (read-all))
                r-hits (- (hits) h0)
                entries-after-reads (eid-entries name eid)
                b-after (route-texts name g/b1 (g/head conn) "r-b")
                w-texts (into {} (for [[k [x y]] w-after] [k x]))
                w-texts1 (into {} (for [[k [x y]] w-after] [k y]))
                detail {:removal rm :trigger trig :completed completed
                        :before-answered (answered before va) :before-refused (not-ok before)
                        :entries-of-a1 {:before entries-before :after-the-pass entries-after-pass :after-the-first-cut entries-after-first-cut
                                        :after-the-reads entries-after-reads}
                        :drops-at-the-first-cut drops-at-first-cut
                        :frontier-on-r {:before-the-pass seq-before-pass :after-the-pass seq-after-pass :undropped undropped}
                        :failures-of-the-pass (let [f1 (f/failures)] (into (sorted-map) (for [[k v] f1 :let [dd (- v (get failures0 k 0))] :when (pos? dd)] [k dd])))
                        :r-answered (answered r-after va) :r-refused (not-ok r-after) :r-cache-hits r-hits
                        :w-answered (into (answered w-texts va) (answered w-texts1 va)) :w-refused (not-ok w-texts)
                        :b-answered (answered b-after vb) :b-refused (not-ok b-after)}]
            (observe! lbl :detail detail)
            (bump! :c boundary sealed? trigger fix? oname :r-answered (count (:r-answered detail)) :entries-after-reads entries-after-reads)
            (oracle! lbl (every? (set (:before-answered detail)) (controls before))
                     "control: before the removal every route answers the value (else the route tests nothing)" detail)
            (oracle! lbl (> (long (or seq-after-pass 0)) (long (or seq-before-pass 0)))
                     "control: the key pass's repair path advanced the frontier (the path under test ran)" detail)
            (if (= fix? :drop-and-mask-out)
              (oracle! lbl (seq (:r-answered detail)) "sensitivity: with the answer's mask planted out the test sees the value" detail)
              (oracle! lbl (empty? (:r-answered detail)) "no route answers the removed value on the gateway that learned of it on the repair path" detail))
            (when (= fix? :in-place)
              (oracle! lbl (zero? entries-after-first-cut) "the drop hook drops the removed subject's parsed entries at the first cut after the pass" detail))
            (oracle! lbl (empty? (:w-answered detail)) "no route answers the removed value on the gateway that took the removal" detail)
            (oracle! lbl (every? (set (:b-answered detail)) (controls b-after)) "control: the other subject's value is answered by every route" detail)))))))

;; ---- S1: switch (i) at the seam: one command handled by a gateway with the replay rule on and one with it off --------
(defn with-rule [on? f]
  (let [r0 rc/replay-rule]
    (alter-var-root #'rc/replay-rule (constantly (boolean on?)))
    (try (f) (finally (alter-var-root #'rc/replay-rule (constantly r0))))))
(defn s1-seam [first-rule account?]
  (g/fresh-scope false
    (fn [name conn]
      (let [lbl (str "S1 one command across the replay rule's seam, first " (if first-rule "on" "off") " then " (if first-rule "off" "on")
                     (if account? ", the request names its account (the database's account setting off)" ", no account named") ", " mode)
            seeds (g/seed! name [g/a1 g/b1]) prior (:id (seeds g/a1)) pin (g/head conn)
            cmd (str "s1-" (System/nanoTime)) chosen (g/secret g/a1 "chosen-before")
            with-acct (fn [x] (if account? (assoc x "account" "acct/a") x))
            first-save (with-acct (g/frame cmd g/a1 chosen prior pin))
            rm (offers/outcome (a/remove-attr! name "s1-rm" g/a1))
            a1-before (with-rule first-rule #(offers/outcome (offers/send name first-save)))
            db (d/db conn)
            records (when (d/entid db :triplex.removal/declined-command)
                      (vec (for [k [cmd (str "acct/a" "|" cmd)] :when (d/entid db [:triplex.removal/declined-command k])] k)))
            all-records (when (d/entid db :triplex.removal/declined-command)
                          (vec (map first (d/q '[:find ?c :where [_ :triplex.removal/declined-command ?c]] db))))
            ;; the same command sent again as a new save (every point fresh), to a gateway on the other side of the seam
            again (with-acct (assoc (g/frame cmd g/a1 chosen prior (g/head conn)) "removalSeen" (or (:seq (privacy/cut name (d/db conn) true)) 0)))
            a1-after (with-rule (not first-rule) #(offers/outcome (offers/send name again)))
            stored (str/includes? (a/read-text name g/a1) chosen)
            detail {:removal rm :first-answer a1-before :records all-records :sent-again a1-after :chosen-value-stored stored}]
        (observe! lbl :detail detail)
        (bump! :s1 first-rule account? a1-before a1-after stored)
        (oracle! lbl (= [409 "ErasureReplayDeclined"] a1-before) "the save framed before the removal is declined" detail)
        (oracle! lbl (and (not stored) (not= 200 (first a1-after)))
                 "the declined command sent again across the seam is declined, and the value chosen before the removal is not stored" detail)))))

;; ---- P: the pinned-read rules (DX-RD6 REVIEW-1): the writers' invariant, and removed values masked at every pin ----
(defn audit
  "DX-RD6's log audit (rd6/attacks.clj `audit` at 968d60bf4, the same rule): every transaction in the log; an entity that
  is a subject (it has ever had a public ID) with a retraction other than an index entry and no assertion other than an
  index entry in the same transaction is a violation; every grouped-save position retracted or asserted twice."
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
                                  (let [subj (subject? e) k (str (attrs rets) " + " (attrs adds))]
                                    (cond-> (update-in acc [(if subj :subjectRetracting :otherRetracting) k] (fnil inc 0))
                                      (and subj (seq real-rets) (empty? real-adds))
                                      (-> (update :violations inc)
                                          (update :firstViolations #(if (< (count %) 5) (conj % {:t t :e e :retracted (attrs rets) :added (attrs adds)}) %))))))))
                            acc (group-by #(.e ^datomic.Datom %) data))]
                  (if gp-a
                    (let [gp (filter #(= gp-a (.a ^datomic.Datom %)) data)]
                      (-> acc (update :groupPositionRetractions + (count (remove #(.added ^datomic.Datom %) gp)))))
                    acc)))
              {:transactions 0 :violations 0 :firstViolations [] :subjectRetracting {} :otherRetracting {} :groupPositionRetractions 0}
              (d/tx-range (d/log conn) nil nil))
        values (when gp-a (map :v (filter :added (d/datoms h :aevt gp-a))))]
    (assoc out :groupPositionDuplicates (if values (- (count values) (count (distinct values))) 0))))

(defn p-pins [boundary sealed?]
  (f/scope5 boundary sealed?
    (fn [name conn]
      (let [lbl (str "P removed values at every pin under every read option set, and the writers' invariant, " (bname boundary)
                     (when sealed? ", sealed") ", " mode ", " authority)
            seeds (g/seed! name [g/a1 g/b1 c1])
            ;; a1's value changed twice, b1's once, each save retiring the one before
            save! (fn [cmd owner prior] (let [v (g/secret owner cmd) r (offers/send name (g/frame cmd owner v prior (g/head conn)))]
                                          [(offers/outcome r) v cmd]))
            [r1 a-v1 _] (save! "p-a1-1" g/a1 (:id (seeds g/a1)))
            [r2 a-v2 _] (save! "p-a1-2" g/a1 "p-a1-1")
            [r3 b-v1 _] (save! "p-b1-1" g/b1 (:id (seeds g/b1)))
            removed [(:value (seeds g/a1)) a-v1 a-v2]
            ;; every value of a1's :v removed; then c1's removal stopped after its native commit and published by the
            ;; rebuild route (per account) or sent again (database-wide); then a new value of a1 framed after the removal
            rm (offers/outcome (a/remove-attr! name "p-rm-a1" g/a1))
            stop (offers/outcome (f/safe #(f/stop-removal! name "p-rm-c1" c1 :after-native)))
            rebuild (when per-account? (offers/outcome (f/safe #(offers/route name "v2" "removal-log-rebuild" {}))))
            c-again (offers/outcome (a/remove-attr! name "p-rm-c1" c1))
            [r4 a-v4 _] (save! "p-a1-4" g/a1 "p-a1-2")
            [r5 b-v2 _] (save! "p-b1-2" g/b1 "p-b1-1")
            head (g/head conn)
            pins (vec (range 1 (inc head)))
            reads (for [[oname opts] read-option-sets p pins]
                    (with-read-options opts
                      (fn [] {:opts oname :pin p
                              :a (array-map :rows-pin (post name "v1" "read" {"entityIds" [g/a1] "basis" {"recordedPosition" p "validAt" 1.0e12}})
                                            :rows-history-pin (post name "v1" "read" {"entityIds" [g/a1] "history" true "basis" {"recordedPosition" p "validAt" 1.0e12}})
                                            :reach-many-pin (post name "v2" "reach-many" {"roots" [g/a1] "basis" {"recordedPosition" p "validAt" 1.0e12}})
                                            :batch-pin (post name "v2" "batch" {"basis" {"recordedPosition" p "validAt" 1.0e12}
                                                                                "reads" [{"op" "reach" "roots" [g/a1]} {"op" "rows" "entityIds" [g/a1]}]}))})))
            reads (vec reads)
            leaks (vec (for [{:keys [opts pin a]} reads v removed :let [hit (answered a v)] :when (seq hit)] {:opts opts :pin pin :routes hit}))
            refused (frequencies (for [{:keys [a]} reads [k [st _]] a :when (not= 200 st)] st))
            v4-at-head (answered (:a (last reads)) a-v4)
            au (audit conn)
            detail {:saves [r1 r2 r3 r4 r5] :removal rm :stopped stop :rebuild rebuild :c1-again c-again :pins (count pins)
                    :reads (* (count reads) 4) :leaks (take 5 leaks) :leak-count (count leaks) :refused refused
                    :new-value-at-head v4-at-head
                    :audit (select-keys au [:transactions :violations :firstViolations :groupPositionRetractions :groupPositionDuplicates :subjectRetracting])}]
        (observe! lbl :detail detail)
        (bump! :p boundary sealed? :leaks (count leaks) :audit-violations (:violations au))
        (oracle! lbl (empty? leaks) "no pin under any read option set answers a removed value" detail)
        (oracle! lbl (= (count (controls (:a (last reads)))) (count (filter (set (controls (:a (last reads)))) v4-at-head)))
                 "control: the value saved after the removal is answered at the head by every pinned route" detail)
        (oracle! lbl (and (zero? (:violations au)) (zero? (:groupPositionDuplicates au)) (zero? (:groupPositionRetractions au)))
                 "no transaction retracts a subject's datom without asserting on that subject (DX-RD6 rule 1)" detail)))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "c") #" "))]
    (when (phases "c")
      (doseq [bd boundaries sealed? [false true] trigger (if per-account? [:pending :copy] [:pending]) fix? [:in-place :drop-out]
              ro (if (= "1" (System/getenv "ERA3_R8_ALL_READ_OPTIONS")) read-option-sets [(first read-option-sets) (last read-option-sets)])]
        (guarded "C" #(c-repair bd sealed? trigger fix? ro)))
      ;; the sensitivity arm, once per boundary
      (doseq [bd boundaries] (guarded "C" #(c-repair bd false :pending :drop-and-mask-out (first read-option-sets)))))
    (when (phases "s1")
      (doseq [first-rule [true false] account? [false true]] (guarded "S1" #(s1-seam first-rule account?))))
    (when (phases "p")
      (doseq [bd boundaries sealed? [false true]] (guarded "P" #(p-pins bd sealed?)))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY8" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_FAILURES" mode (pr-str (f/failures)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [x failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str x)))
    (shutdown-agents)
    (System/exit 0)))
