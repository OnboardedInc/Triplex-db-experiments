(ns era3-attack4
  "[DX-ERA3, fourth review] Attacks on DX-ERA2 at bd4ec0d1a (gateway code f8725b97b): the commit as the boundary
  (TX2_REMOVAL_COMMIT_BOUNDARY), the rebuild route, a read that publishes first, a fleet mixing the two boundaries,
  deliveries with removals pending on both sides, the save line's R2-2, and a fuzzer whose schedules choose each
  gateway's boundary and add log restores and the rebuild route. A gateway's boundary is a per-process switch read at
  load; in one process a request runs on 'the commit gateway' or 'the log gateway' by setting that switch and clearing
  the cut cache before it. Loaded after wfix1/regression.clj, era2/gate.clj, era3/attack.clj, attack2.clj and
  attack3.clj; era3/run.sh runs it with ERA3_MAIN=4. Q9 and Q10 verify the derived-copies review's B5 and B2 (run them
  with TRIPLEX_ERASURE_SHRED_GRACE_MS=0 TX2_ID_LISTS=1 TX2_SWEEP=1); Q11 is R2-2 for a creation with no frame source.
  Review: era3/REVIEW-4.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.scope :as scope]
            [triplex.gateway.removal-commit :as rc] [triplex.gateway.group :as group]
            [triplex.gateway.write-policy :as policy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.main :as main] [triplex.gateway.storage :as storage] [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack2 :as b]
            [era3-attack3 :as c])
  (:import [java.util Random]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def sealed-fuzz? (= "1" (System/getenv "ERA3_SEALED")))

;; ---- a request on 'the commit gateway' or 'the log gateway' -------------------------------------------------------
(def on-boundary (atom nil))
(defn as-gateway! [boundary]
  (when-not (= boundary @on-boundary)
    (alter-var-root #'rc/commit-boundary (constantly (= boundary :commit)))
    (reset! privacy/cache {})
    (reset! on-boundary boundary)))

(defn read-has? [name entity value] (str/includes? (a/read-text name entity) value))
(defn native [conn attr] (scope/value (d/db conn) (scope/entity (d/db conn)) attr))
(defn frame-copy [command doc value ticket accounts] (a/copy-frame command doc value ticket accounts))
(defn ticket [name conn] (get (:body (offers/route name "v2" "erasure-frontier" nil)) "seq"))

;; the removal log's records (not the key files beside them)
(defn log-dir [name] (.getParent (privacy/path name "head.json")))
(defn log-snapshot [name]
  {:head (privacy/record-text name "head.json") :pending (privacy/record-text name "pending.json")})
(defn log-restore!
  "Put the log back to a snapshot: its head and its pending intent; entries past its head deleted."
  [name snap]
  (let [h (get (json/read-str (:head snap)) "seq")
        now (get (json/read-str (privacy/record-text name "head.json")) "seq")]
    (doseq [k (range (inc h) (inc now))]
      (java.nio.file.Files/deleteIfExists (privacy/path name (str "erase-" k ".json"))))
    (privacy/replace! (privacy/path name "head.json") (:head snap))
    (if (:pending snap)
      (privacy/replace! (privacy/path name "pending.json") (:pending snap))
      (java.nio.file.Files/deleteIfExists (privacy/path name "pending.json")))
    (reset! privacy/cache {})))
(defn log-delete! [name]
  (let [now (get (json/read-str (privacy/record-text name "head.json")) "seq")]
    (doseq [k (range 1 (inc now))] (java.nio.file.Files/deleteIfExists (privacy/path name (str "erase-" k ".json"))))
    (java.nio.file.Files/deleteIfExists (privacy/path name "head.json"))
    (java.nio.file.Files/deleteIfExists (privacy/path name "pending.json"))
    (reset! privacy/cache {})))
(defn rebuild! [name body] (offers/route name "v2" "removal-log-rebuild" body))

(defn reach [name entity pin session]
  (:body (offers/route name "v2" "reach" {"root" entity "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" session "erasureRefs" true})))
(defn reach-entity [body entity] (some (fn [e] (when (= entity (first e)) e)) (get body "entities")))
(defn hit? [e] (and (vector? e) (= 2 (count e))))

;; ---- Q1: a Reach session cached before a removal, read between the removal's commit and its publication ----------
(defn q1 [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "Q1 Reach session at a pin between the commit and the publication, " (clojure.core/name boundary) " boundary")
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              pin (g/head conn) session (str "q1-" (clojure.core/name boundary))
              primed (reach-entity (reach name g/a1 pin session) g/a1)
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (a/remove-attr! name "q1-rm" g/a1)
              _ (reset! a/plan nil)
              between (reach-entity (reach name g/a1 pin session) g/a1)
              plain (read-has? name g/a1 value)
              published-between (g/seq-now name conn)
              done (a/remove-attr! name "q1-rm" g/a1)
              after (reach-entity (reach name g/a1 pin session) g/a1)
              ;; what the client holds after each reply: an inline entity replaces its copy, a hit keeps the copy it has
              holds (fn [prior e] (if (hit? e) prior (str/includes? (g/text e) value)))
              h0 (holds true primed) h1 (holds h0 between) h2 (holds h1 after)
              kind (fn [e] (if (hit? e) :hit (if (str/includes? (g/text e) value) :inline-with-value :inline-masked)))
              detail {:primed (kind primed) :stopped (offers/outcome stopped)
                      :session-read-between (kind between) :client-holds-the-value-after-it h1
                      :plain-read-between-answers-value plain :published-seq-after-the-session-read published-between
                      :acknowledged (offers/outcome done)
                      :session-read-after-ack (kind after) :client-holds-the-value-after-ack h2}]
          (observe! lbl :detail detail)
          (bump! :q1 boundary (:session-read-between detail) h1 (:session-read-after-ack detail) h2)
          (oracle! lbl (not h2) "after the acknowledgement no Reach session client holds the value (TARGETS 7.1)" detail)
          (when (= boundary :commit)
            (oracle! lbl (not h1) "commit boundary (page 16.4): after the commit no read, by any route, leaves the value with its reader" detail)))))))

;; ---- Q8: a removal whose assertion selector has nothing left to remove, stopped after its declaration -------------
(defn q8 [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "Q8 a frame naming an account declared by a removal whose selection there is empty, " (clojure.core/name boundary))
              seeds (g/seed! name [g/a1 g/b1])
              first-removal (offers/outcome (a/remove-attr! name "q8-r1" g/a1))
              _ (reset! a/plan {:stop :after-declare :stops-left 1})
              stopped (a/erase! name "q8-r2" [{"id" (:id (seeds g/a1))}])
              _ (reset! a/plan nil)
              state {:pending (some-> (privacy/pending name) (get "commandId")) :account-a (rs/native-account-seq (d/db conn) "a")}
              frames (vec (for [k (range 3)]
                            (let [r (offers/send name (frame-copy (str "q8-f" k) (str "notice:v1:q8-" k) "x" (ticket name conn) ["a"]))]
                              [(offers/outcome r) (get-in r [:body "message"])])))
              detail {:first-removal first-removal :stopped (offers/outcome stopped) :state-after-the-stop state
                      :frames-naming-a (mapv first frames) :messages (distinct (map second frames))
                      :still-pending-after-the-frames (some-> (privacy/pending name) (get "commandId"))}]
          (observe! lbl :detail detail)
          (oracle! lbl (and (not= [400 "TransactionRejected"] (first (first frames))) (nil? (:still-pending-after-the-frames detail)))
                   "a frame refused by a declaration gets the tagged 503 and starts the removal's completion (page 15.5, e921f3ef1)" detail))))))

;; ---- Q2: the rebuild route with a missing log and a policy that lists fewer attributes -------------------------
(defn scope-with [attrs sealed? f]
  (offers/in-scope
    (fn [name conn]
      (binding [g/sealed-run? sealed?]
        (with-redefs [group/enabled false policy/priority? false policy/field-only? false policy/budget-us nil]
          (let [p (offers/route name "v2" "protection" {"attributes" attrs "sealed" sealed?})
                m (offers/route name "v2" "removal-per-account" {})]
            (when-not (= [200 200] [(:status p) (:status m)]) (throw (ex-info "scope setup failed" {:p p :m m})))
            (f name conn)))))))
(defn q2 [sealed? boundary]
  (when per-account?
    (as-gateway! boundary)
    (scope-with [":v" ":p"] sealed?
      (fn [name conn]
        (let [lbl (str "Q2 rebuild with a missing log and a policy without a protected attribute" (if sealed? ", sealed" "") ", " (clojure.core/name boundary))
              pv (g/secret g/a1 "p-before")
              s1 (offers/send name (g/save-frame "q2-a1-p" g/a1 ":p" pv nil nil))
              s2 (offers/send name (g/frame "q2-b1-v" g/b1 (g/secret g/b1 "v") nil nil))
              rm (a/remove-attr! name "q2-rm-b1" g/b1)
              _ (log-delete! name)
              missing (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              omit-removed (offers/outcome (rebuild! name {"attributes" [":p"] "sealed" sealed?}))
              rebuilt (rebuild! name {"attributes" [":v"] "sealed" sealed?})
              read-a1 (a/read-text name g/a1)
              rm-p (a/erase! name "q2-rm-a1-p" [{"entityId" g/a1 "attribute" ":p"}])
              pv2 (g/secret g/a1 "p-after")
              s3 (offers/send name (g/save-frame "q2-a1-p2" g/a1 ":p" pv2 "q2-a1-p" nil))
              clear-after (count (g/raw-occurrences conn pv2))
              vv (g/secret g/b1 "v-after")
              s4 (offers/send name (g/frame "q2-b1-v2" g/b1 vv nil nil))
              clear-v (count (g/raw-occurrences conn vv))
              detail {:seeds [(offers/outcome s1) (offers/outcome s2)] :removal (offers/outcome rm) :read-with-the-log-missing missing
                      :rebuild-omitting-a-removed-attribute omit-removed :rebuild-omitting-a-never-removed-one (offers/outcome rebuilt)
                      :policy-now (get (json/read-str (or (privacy/record-text name "head.json") "{}")) "attributes")
                      :a1-p-value-still-answered (str/includes? read-a1 pv)
                      :removal-of-a1-p-requested (offers/outcome rm-p) :a1-p-value-after-that (read-has? name g/a1 pv)
                      :new-p-save (offers/outcome s3) :native-copies-in-clear-of-the-new-p-value clear-after
                      :new-v-save (offers/outcome s4) :native-copies-in-clear-of-a-new-v-value clear-v}]
          (observe! lbl :detail detail)
          (oracle! lbl (not= 200 (:status rebuilt)) "a rebuild cannot drop a protected attribute from the policy" detail)
          (oracle! lbl (= 200 (:status rm-p)) "a protected value can still be removed on request after a rebuild" detail))))))

;; ---- Q3: a rebuild stopped between two appended entries ---------------------------------------------------------
(defn q3 [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "Q3 a rebuild stopped between two appended entries, " (clojure.core/name boundary))
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one"]) va (:value (seeds g/a1)) vb (:value (seeds g/b1))
              snap (log-snapshot name)
              r1 (a/remove-attr! name "q3-r1" g/a1) r2 (a/remove-attr! name "q3-r2" g/b1)
              _ (log-restore! name snap)
              behind-read (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              heads (atom 0) save @#'privacy/save-record!
              stopped (with-redefs-fn {#'privacy/save-record! (fn [nm rec wire]
                                                                (when (and (= rec "head.json") (= 2 (swap! heads inc)))
                                                                  (throw (ex-info "ERA3 gateway stopped between two appended entries" {})))
                                                                (save nm rec wire))}
                        #(rebuild! name {}))
              mid {:head (get (json/read-str (privacy/record-text name "head.json")) "seq")
                   :entry-2-file (some? (privacy/record-text name "erase-2.json"))}
              _ (reset! privacy/cache {})
              mid-read (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              mid-values [(read-has? name g/a1 va) (read-has? name g/b1 vb)]
              again (offers/outcome (rebuild! name {}))
              after {:head (get (json/read-str (privacy/record-text name "head.json")) "seq")
                     :values [(read-has? name g/a1 va) (read-has? name g/b1 vb)]
                     :frame (offers/outcome (offers/send name (frame-copy "q3-f" "notice:v1:q3" "x" (g/seq-now name conn) nil)))
                     :removal (offers/outcome (a/remove-attr! name "q3-r3" "acct/c/one"))}
              detail {:removals [(offers/outcome r1) (offers/outcome r2)] :read-while-two-behind behind-read
                      :stopped-rebuild (offers/outcome stopped) :log-after-the-stop mid :read-after-the-stop mid-read
                      :values-answered-after-the-stop mid-values :rebuild-again again :after after}]
          (observe! lbl :detail detail)
          (oracle! lbl (not-any? true? (concat mid-values (:values after))) "no removed value answered at any point" detail)
          (oracle! lbl (and (= [200 nil] again) (= 2 (:head after)) (= [200 nil] (:removal after))) "a second rebuild resumes it" detail)
          (a/counters-agree! name conn lbl))))))

;; ---- Q4: a read that publishes first (the log's boundary) --------------------------------------------------------
(defn q4 []
  (when per-account?
    (as-gateway! :log)
    ;; a: the starter still holds the lock inside its publication
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "Q4a a read that must publish first while the starter holds the lock in its publication"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              fired (atom false) entered (promise) go (promise)
              _ (reset! a/plan {:hook (fn [p] (when (and (= p :at-publish) (compare-and-set! fired false true))
                                                (deliver entered true) (deref go 20000 nil)))})
              starter (future (a/remove-attr! name "q4a-rm" g/a1))
              _ (deref entered 10000 nil)
              t0 (System/nanoTime)
              rd (future (offers/route name "v1" "read" {"entityIds" [g/a1]}))
              _ (Thread/sleep 1500)
              early (realized? rd)
              _ (deliver go true)
              s @starter r @rd ms (/ (- (System/nanoTime) t0) 1.0e6)
              _ (reset! a/plan nil)
              detail {:starter (offers/outcome s) :read (offers/outcome r) :read-answered-before-the-starter-published early
                      :read-ms ms :value-answered (str/includes? (g/text (:body r)) value)}]
          (observe! lbl :detail detail)
          (oracle! lbl (not (:value-answered detail)) "the waiting read does not answer the value" detail))))
    ;; b: a storm of reads, the removal committed and its starter gone
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "Q4b fifty concurrent reads, each finding the removal committed and unpublished"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (a/remove-attr! name "q4b-rm" g/a1)
              _ (reset! a/plan nil)
              t0 (System/nanoTime)
              reads (mapv (fn [k] (future (offers/route name "v1" "read" {"entityIds" [(if (even? k) g/a1 g/b1)]}))) (range 50))
              outs (mapv deref reads) ms (/ (- (System/nanoTime) t0) 1.0e6)
              detail {:stopped (offers/outcome stopped) :replies (frequencies (map offers/outcome outs))
                      :value-answered (count (filter #(str/includes? (g/text (:body %)) value) outs)) :all-ms ms
                      :published (g/seq-now name conn)}]
          (observe! lbl :detail detail)
          (oracle! lbl (zero? (:value-answered detail)) "no read answers the value" detail))))
    ;; c: a gateway whose writes to the removal log fail
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "Q4c a gateway that cannot write the removal log, with a removal committed and unpublished"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (a/remove-attr! name "q4c-rm" g/a1)
              _ (reset! a/plan nil)
              deny (fn [& _] (throw (java.io.IOException. "ERA3: this gateway cannot write the removal log")))
              outs (with-redefs-fn {#'privacy/replace! deny}
                     #(vec (for [e [g/a1 g/b1 "acct/z/none"]] (offers/route name "v1" "read" {"entityIds" [e]}))))
              detail {:stopped (offers/outcome stopped) :reads-of-a1-b1-and-another (mapv offers/outcome outs)
                      :value-answered (count (filter #(str/includes? (g/text (:body %)) value) outs))
                      :published (g/seq-now name conn)}]
          (observe! lbl :detail detail)
          (bump! :q4c (:reads-of-a1-b1-and-another detail))
          (oracle! lbl (zero? (:value-answered detail)) "no read answers the value" detail))))))

;; ---- Q5: two boundaries in one fleet -----------------------------------------------------------------------------
(defn q5 []
  (when per-account?
    ;; the log two behind the data, no intent: each gateway, and a removal on each
    (as-gateway! :commit)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "Q5a the log two behind, a fleet with both boundaries"
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one" "acct/d/one"]) va (:value (seeds g/a1)) vb (:value (seeds g/b1))
              snap (log-snapshot name)
              _ (a/remove-attr! name "q5-r1" g/a1) _ (a/remove-attr! name "q5-r2" g/b1)
              _ (log-restore! name snap)
              on (fn [bd f] (as-gateway! bd) (f))
              log-read (on :log #(offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1 g/b1]})))
              commit-read (on :commit #(let [r (offers/route name "v1" "read" {"entityIds" [g/a1 g/b1]})]
                                         [(offers/outcome r) (boolean (re-find (re-pattern (str va "|" vb)) (g/text (:body r))))]))
              log-removal (on :log #(offers/outcome (a/remove-attr! name "q5-r3" "acct/c/one")))
              commit-removal (on :commit #(offers/outcome (a/remove-attr! name "q5-r3" "acct/c/one")))
              log-after (on :log #(offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]})))
              head (get (json/read-str (privacy/record-text name "head.json")) "seq")
              detail {:log-gateway-read log-read :commit-gateway-read-and-value-answered commit-read
                      :removal-on-the-log-gateway log-removal :removal-on-the-commit-gateway commit-removal
                      :log-gateway-read-after log-after :log-head-after head}]
          (observe! lbl :detail detail)
          (oracle! lbl (not (second commit-read)) "no removed value answered" detail)
          (a/counters-agree! name conn lbl))))
    ;; a removal committed and unpublished, started on one boundary, read on the other
    (doseq [[start rd] [[:log :commit] [:commit :log]]]
      (as-gateway! start)
      (g/fresh-scope false
        (fn [name conn]
          (let [lbl (str "Q5b a removal committed on the " (clojure.core/name start) " gateway, read on the " (clojure.core/name rd) " one")
                seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
                pin (g/head conn)
                _ (as-gateway! rd) _ (reach name g/a1 pin "q5s") _ (as-gateway! start)
                _ (reset! a/plan {:stop :after-native :stops-left 1})
                stopped (a/remove-attr! name "q5-rm" g/a1)
                _ (reset! a/plan nil)
                _ (as-gateway! rd)
                session (reach-entity (reach name g/a1 pin "q5s") g/a1)
                plain (read-has? name g/a1 va)
                published (g/seq-now name conn)
                frame (offers/outcome (offers/send name (frame-copy "q5-f" "notice:v1:q5" "x" (g/seq-now name conn) nil)))
                detail {:stopped (offers/outcome stopped) :reader-session (if (hit? session) :hit (if (str/includes? (g/text session) va) :inline-with-value :inline-masked))
                        :plain-read-answers-value plain :published-after-the-reads published :frame frame
                        :published-after-the-frame (g/seq-now name conn)}]
            (observe! lbl :detail detail)
            (oracle! lbl (not plain) "a plain read does not answer the value once the removal is committed" detail)))))))

;; ---- Q7: deliveries both ways with removals pending in each database ----------------------------------------------
(defn q7 [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [x xconn]
        (g/fresh-scope false
          (fn [y yconn]
            (let [lbl (str "Q7 deliveries both ways with a removal pending in each database, " (clojure.core/name boundary))
                  _ (g/seed! x [g/a1 g/b1]) _ (g/seed! y [g/a1 g/b1])
                  stop! (fn [nm cmd] (reset! a/plan {:stop :after-declare :stops-left 1}) (let [r (a/remove-attr! nm cmd g/a1)] (reset! a/plan nil) r))
                  _ (stop! x "q7-x") _ (stop! y "q7-y")
                  deliver (fn [from fconn to k] (let [r (offers/send to (assoc (g/save-frame (str "q7-d" k) (str "notice:v1:q7-" k) ":notice/body" "d" nil nil)
                                                                              "erasureSourceDatabase" from "erasureSeq" (g/seq-now from fconn)))]
                                                  [(offers/outcome r) (get-in r [:body "message"])]))
                  until-200 (fn [from fconn to base] (loop [k 0 acc []]
                                                       (let [d (deliver from fconn to (+ base k)) acc (conj acc d)]
                                                         (if (or (= [200 nil] (first d)) (>= k 3)) acc (recur (inc k) acc)))))
                  x->y (until-200 x xconn y 10)
                  after-2 {:x-pending (some? (privacy/pending x)) :y-pending (some? (privacy/pending y))}
                  _ (stop! x "q7-x2") _ (stop! y "q7-y2")
                  y->x (until-200 y yconn x 20)
                  d1 (first x->y) d2 (last x->y) d3 (first y->x) d4 (last y->x)
                  ghost (let [r (offers/send y (assoc (g/save-frame "q7-ghost" "notice:v1:q7-ghost" ":notice/body" "d" nil nil)
                                                      "erasureSourceDatabase" "s2-QQQQQQQQQQQQQQQQQQQQ" "erasureSeq" 0))]
                          [(offers/outcome r) (get-in r [:body "message"])])
                  detail {:x-to-y (mapv first x->y) :after-x-to-y after-2 :y-to-x (mapv first y->x)
                          :both-pending-after-y-to-x [(some? (privacy/pending x)) (some? (privacy/pending y))]
                          :refusal-messages (distinct (map second (concat x->y y->x)))
                          :a-source-that-does-not-exist ghost
                          :refusal-names-a-database (boolean (some #(re-find #"s2-" (str (second %))) (concat x->y y->x)))}]
              (observe! lbl :detail detail)
              (oracle! lbl (and (= [200 nil] (first d2)) (= [200 nil] (first d4)) (not (:x-pending after-2)) (not (:y-pending after-2)))
                       "a few contacts complete both databases' removals and the delivery then commits, both ways" detail)
              (oracle! lbl (not (:refusal-names-a-database detail)) "a refusal does not name another database" detail))))))))

;; ---- Q9 (the other review's B5, extended): every read route and cache, the removal paused after its commit --------
(defn q9 [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "Q9 every read route between the commit and the publication, " (clojure.core/name boundary))
              seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
              pin (g/head conn)
              snap (offers/route name "v1" "snapshot" {})
              handle (get-in snap [:body "handle"])
              session-pin "q9-pin" session-now "q9-now"
              routes {:read-current #(offers/route name "v1" "read" {"entityIds" [g/a1]})
                      :read-history #(offers/route name "v1" "read" {"entityIds" [g/a1] "history" true})
                      :read-pinned #(offers/route name "v1" "read" {"entityIds" [g/a1] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
                      :read-batch #(offers/route name "v1" "read" {"entityIds" [g/b1 g/a1]})
                      :read-snapshot-handle #(offers/route name "v1" "read" {"entityIds" [g/a1] "handle" handle})
                      :reach-pinned-session #(offers/route name "v2" "reach" {"root" g/a1 "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" session-pin "erasureRefs" true})
                      :reach-current-session #(offers/route name "v2" "reach" {"root" g/a1 "basis" {"recordedPosition" (g/head conn) "validAt" 1.0e12} "session" session-now "erasureRefs" true})
                      :reach-many #(offers/route name "v2" "reach-many" {"roots" [g/a1 g/b1] "basis" {"recordedPosition" pin "validAt" 1.0e12}})
                      :journal #(offers/route name "v2" "transactions" {"after" 0 "limit" 100})
                      :feed (fn [] (let [r (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/log") :query-string "fromT=0&limit=1000"})]
                                     {:status (:status r) :body (let [b (:body r)] (if (string? b) b (String. ^bytes b "UTF-8")))}))
                      :entity-positions #(offers/route name "v2" "entity-transactions" {"entityId" g/a1 "limit" 10 "basis" {"recordedPosition" (g/head conn)}})
                      :ids-of-account-a #(offers/route name "v2" "ids" {"account" "a"})
                      :sweep-projecting-the-protected-attribute #(offers/route name "v2" "sweep" {"account" "a" "project" [":v"]})
                      :sweep-ids-of-account-a #(offers/route name "v2" "sweep" {"account" "a"})
                      :frontier #(offers/route name "v2" "erasure-frontier" nil)}
              holds (atom {})
              look (fn [k r] (let [t (g/text (:body r))
                                   e (when (#{:reach-pinned-session :reach-current-session} k) (reach-entity (:body r) g/a1))]
                               (if (and e (hit? e))
                                 [(:status r) :hit (get @holds k)]
                                 (do (when e (swap! holds assoc k (str/includes? t va)))
                                     [(:status r) (str/includes? t va)]))))
              safe (fn [f] (try (f) (catch Throwable e {:status :threw :body (str (.getMessage e))})))
              before (into (sorted-map) (for [[k f] routes] [k (look k (safe f))]))
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (a/remove-attr! name "q9-rm" g/a1)
              _ (reset! a/plan nil)
              between (into (sorted-map) (for [[k f] routes] [k (look k (safe f))]))
              frontier-seq (get-in (offers/route name "v2" "erasure-frontier" nil) [:body "seq"])
              leaks (vec (for [[k v] between :when (or (= true (second v)) (and (= :hit (second v)) (= true (nth v 2))))] k))
              refusals (into (sorted-map) (for [[k f] routes :let [r (safe f)] :when (not= 200 (:status r))] [k (get-in r [:body "message"])]))
              detail {:stopped (offers/outcome stopped) :before before :between between :frontier-seq-between frontier-seq :refusal-messages-after refusals
                      :published-after (g/seq-now name conn) :routes-leaving-the-value-with-the-reader leaks}]
          (observe! lbl :detail detail)
          (bump! :q9 boundary leaks)
          (oracle! lbl (empty? leaks) "after the commit, no read route answers the value or tells its reader to keep a copy holding it" detail))))))

;; ---- Q10 (the other review's B2): how long ordinary requests keep a removal pending, and so every key alive ----------
(defn removal-keys
  "The assertion IDs whose keys a published removal must delete (read while nothing is pending)."
  [name command]
  (mapv #(get % "assertionId") (get-in (privacy/cut name nil) [:commands command "identities"])))
(defn keys-alive [name ids] (count (filter #(envelope/key-present? name % nil) ids)))
(defn q10 [boundary stop]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope true
      (fn [name conn]
        (let [lbl (str "Q10 a published removal's keys while another removal is pending, " (clojure.core/name boundary) ", stopped " (clojure.core/name stop))
              c1 "acct/c/one" d1 "acct/d/one"
              seeds (g/seed! name [g/a1 g/b1 c1])
              shred! (fn [] (@#'envelope/shred-published!))
              r1 (a/remove-attr! name "q10-r1" g/a1)
              k1 (removal-keys name "q10-r1")
              _ (Thread/sleep 5) _ (shred!)
              control {:r1 (offers/outcome r1) :r1-keys (count k1) :r1-keys-alive-after-a-shred-pass (keys-alive name k1)}
              r3 (a/remove-attr! name "q10-r3" g/b1)
              k3 (removal-keys name "q10-r3")
              _ (reset! a/plan (if (= stop :after-intent)
                                 {:hook (let [f (atom false)] (fn [p] (when (and (= p :after-intent) (compare-and-set! f false true)) (throw (ex-info "ERA3 gateway stopped after-intent" {})))))}
                                 {:stop stop :stops-left 1}))
              stopped (a/remove-attr! name "q10-r2" c1)
              _ (reset! a/plan nil)
              _ (Thread/sleep 5)
              steps [[:read-a1 #(offers/route name "v1" "read" {"entityIds" [g/a1]})]
                     [:read-c1 #(offers/route name "v1" "read" {"entityIds" [c1]})]
                     [:reach-b1 #(offers/route name "v2" "reach" {"root" g/b1 "basis" {"recordedPosition" (g/head conn) "validAt" 1.0e12} "session" "q10" "erasureRefs" true})]
                     [:journal #(offers/route name "v2" "transactions" {"after" 0 "limit" 100})]
                     [:save-of-account-d #(offers/send name (g/frame (str "q10-d-" (System/nanoTime)) d1 (g/secret d1 "x") nil nil))]
                     [:frame-naming-b #(offers/send name (frame-copy (str "q10-fb-" (System/nanoTime)) "notice:v1:q10-b" "x" (ticket name conn) ["b"]))]
                     [:frame-naming-d #(offers/send name (frame-copy (str "q10-fd-" (System/nanoTime)) "notice:v1:q10-d" "x" (ticket name conn) ["d"]))]
                     [:read-a1-again #(offers/route name "v1" "read" {"entityIds" [g/a1]})]]
              walk (vec (for [[k f] steps]
                          (let [r (try (f) (catch Throwable e {:status :threw :body {"code" (.getMessage e)}}))]
                            (shred!)
                            [k (offers/outcome r) {:r2-pending (some? (privacy/pending name)) :r3-keys-alive (keys-alive name k3)}])))
              unnamed (offers/outcome (offers/send name (frame-copy "q10-any" "notice:v1:q10-any" "x" (ticket name conn) nil)))
              _ (shred!)
              left (count (filter #(pos? (:r3-keys-alive (nth % 2))) walk))
              detail {:control control :r3 (offers/outcome r3) :r3-keys (count k3) :r2-stopped (offers/outcome stopped)
                      :ordinary-requests walk
                      :ordinary-requests-after-which-r3-keys-were-alive left
                      :then-a-frame-naming-no-account unnamed
                      :after-it {:r2-pending (some? (privacy/pending name)) :r3-keys-alive (keys-alive name k3)}}]
          (observe! lbl :detail detail)
          (bump! :q10 boundary stop left)
          (oracle! lbl (zero? (:r1-keys-alive-after-a-shred-pass control)) "control: with nothing pending a published removal's keys go at the next pass" detail)
          (oracle! lbl (zero? left) "a published removal's keys go after its grace whatever else is pending (TARGETS 7.9)" detail))))))

;; ---- Q11: R2-2 for a creation that carries no frame source ------------------------------------------------------
(defn q11
  "The gate case creation-race (R2-2) with the frame source left out (no sourceK), as the seeds of these tests send
  it: the creation the removal lands inside, then the same frame after the removal, then a replay. The decline check
  of 17e50baf3 dates a save by its sourceK."
  [boundary]
  (when per-account?
    (as-gateway! boundary)
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "Q11 a creation without a frame source racing a removal of its subject, " (clojure.core/name boundary))
              X "acct/p3/subject/nosource" v (g/secret X "framed-before-the-removal")
              removed (atom nil) fired (atom false) orig storage/submit!
              reply (with-redefs [storage/submit! (fn [c data request timeline & more]
                                                    (when (and (= "q11-race" (get request "operationId")) (compare-and-set! fired false true))
                                                      (let [f (future (offers/route name "v2" "erase" {"commandId" "q11-remove" "selectors" [{"entityId" X "attribute" ":v"}]}))]
                                                        (reset! removed (deref f 3000 :waiting))))
                                                    (apply orig c data request timeline more))]
                      (offers/send name (g/frame "q11-race" X v nil nil)))
              removal (let [r @removed] (if (= :waiting r) [:waited-past-3s] (offers/outcome r)))
              late (offers/send name (g/frame "q11-late" X v nil nil))
              stored? (str/includes? (g/text (:body (offers/route name "v1" "read" {"entityIds" [X]}))) v)
              detail {:removal removal :racing (offers/outcome reply) :same-frame-after-the-removal (offers/outcome late)
                      :value-stored-after stored?}]
          (observe! lbl :detail detail)
          (bump! :q11 boundary (:racing detail) (:same-frame-after-the-removal detail) stored?)
          (when (= [200 nil] removal)
            (oracle! lbl (not stored?) "a creation framed before its subject's removal is not stored, with or without a frame source (R2-2 case 1)" detail)))))))

;; ---- F4: the fuzzer with each gateway's boundary, log restores and the rebuild route -------------------------------
(def boundaries [:log :commit])
(def restores [:none :none :pending-copy :behind])
(def rebuilds [:none :none :while-pending :after])

(defn run-schedule4! [name conn run i sch]
  (let [{:keys [b-start b-complete b-read restore rebuild]} sch
        on (fn [bd f] (as-gateway! bd) (f))
        snap-before (when (= restore :behind) (log-snapshot name))
        ;; the third review's schedule with each gateway's boundary: the starter and the completer run on theirs
        sch3 (dissoc sch :b-start :b-complete :b-read :restore :rebuild)
        snap-pending (atom nil)
        rebuild-out (atom nil)]
    (as-gateway! b-start)
    (let [result (with-redefs-fn {#'c/land-hook-extra
                                  (fn [p]
                                    (when (= p :completer-start)
                                      (when (and (= restore :pending-copy) (privacy/pending name)) (reset! snap-pending (log-snapshot name)))
                                      (when (= rebuild :while-pending) (reset! rebuild-out (offers/outcome (rebuild! name {}))))
                                      (as-gateway! b-complete)))}
                   #(c/run-schedule3! name conn run i sch3))
          tag (str run "-" i)
          s (str "acct/h" (mod i 7) "/s" i)
          gone (:gone result)]
      ;; the operator puts back an older copy of the log after the removal answered
      (when-let [snap (case restore :pending-copy @snap-pending :behind snap-before nil)]
        (log-restore! name snap)
        (bump! :restored restore)
        (on b-read
            (fn []
              (let [texts (str (a/read-text name s) (a/read-text name s {"history" true}) (a/read-text name (str s "-new")))
                    r (offers/route name "v1" "read" {"entityIds" [s]})]
                (bump! :read-after-restore b-read restore (offers/outcome r))
                (oracle! (str "F4 " (pr-str sch)) (not-any? #(str/includes? texts %) (keys gone))
                         "after an older copy of the log is put back, no read answers a removed value" {:restore restore :reader b-read})))))
      (when (= rebuild :after) (reset! rebuild-out (on b-complete #(offers/outcome (rebuild! name {})))))
      ;; whatever happened, the next schedule starts from a log that agrees with the data
      (when (not= :none restore)
        (on :commit #(let [r (rebuild! name {})] (bump! :normalise restore (offers/outcome r)))))
      (when @rebuild-out (bump! :rebuild rebuild @rebuild-out))
      (doseq [[k v] (select-keys sch [:b-start :b-complete :b-read :restore :rebuild])] (bump! :dim k v))
      result)))

(defn schedule4 [^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        base (c/schedule3 r)]
    (assoc base :b-start (pick boundaries) :b-complete (pick boundaries) :b-read (pick boundaries)
                :restore (pick restores) :rebuild (pick rebuilds))))

(defn fuzz4 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [blk (range (quot (+ n block -1) block))]
      (as-gateway! :log)
      (g/fresh-scope sealed-fuzz?
        (fn [name conn]
          (let [results (vec (for [i (range (* blk block) (min n (* (inc blk) block)))]
                               (let [sch (schedule4 r)]
                                 (try (run-schedule4! name conn run i sch)
                                      (catch Throwable e
                                        (reset! a/plan nil)
                                        (oracle! (str "F4 " (pr-str sch)) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))]
            (as-gateway! :log)
            (a/block-checks! name conn (str "F4 block " blk) (or gone {}) {} #{})
            (b/intent-agrees! name conn (str "F4 block " blk))
            (println "ERA3_PROGRESS" mode (pr-str {:block blk :schedules (get @c/tally [:schedules]) :violations (count @a/violations)}))))))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (c/install-hooks3!)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "q1 q2 q3 q4 q5 q7 q8 r22 fuzz4") #" "))]
    (when (phases "q1") (doseq [bd boundaries] (guarded "Q1" #(q1 bd))))
    (when (phases "q2") (doseq [s? [false true] bd boundaries] (guarded "Q2" #(q2 s? bd))))
    (when (phases "q3") (doseq [bd boundaries] (guarded "Q3" #(q3 bd))))
    (when (phases "q4") (guarded "Q4" q4))
    (when (phases "q5") (guarded "Q5" q5))
    (when (phases "q7") (doseq [bd boundaries] (guarded "Q7" #(q7 bd))))
    (when (phases "q8") (doseq [bd boundaries] (guarded "Q8" #(q8 bd))))
    (when (phases "q9") (doseq [bd boundaries] (guarded "Q9" #(q9 bd))))
    (when (phases "q11") (doseq [bd boundaries] (guarded "Q11" #(q11 bd))))
    (when (phases "q10") (doseq [bd boundaries st [:after-intent :after-declare :after-native]] (guarded "Q10" #(q10 bd st))))
    (when (phases "r22") (doseq [bd (if per-account? boundaries [:log])] (as-gateway! bd) (guarded "R22" g/creation-race)))
    (when (phases "fuzz4")
      (fuzz4 (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
             (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1")))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY4" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) (merge-with + @tally @c/tally))))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [f failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit 0)))
