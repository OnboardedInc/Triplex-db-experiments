(ns era5-attack7
  "[DX-ERA5, third review] Attacks on DX-ERA4's answer at e75f61f40 (code 6b6243ead; era5/REVIEW-3.md): the deep-layout
  rule (a place naming its subject's root; the gateway checks the root's :subject/member and :subject/account rows and
  walks reference rows from it), the content-free kinds the setting accepts without decoding, and the bounded key
  re-sweep at many removals. In process, loaded after attack5.clj and attack6.clj (inproc.sh phase cases7), the same
  options as there; the boundary is the database's (ERA5_EXTRA_ENV=TX2_REMOVAL_COMMIT_BOUNDARY=1 for the commit one).
  ERA7_CASE lines carry each case's observations; ERA7_FINDING each thing the rule or the check is meant to prevent
  and does not; oracles only for what must hold."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.derived-seal :as ds] [triplex.gateway.stats :as stats]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era5-attack :as a5] [era5-attack6 :as a6])
  (:import [java.util Random]))

(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(defn report [k m] (println "ERA7_CASE" (pr-str [k m])))
(def findings (atom []))
(defn finding! [k m] (swap! findings conj k) (println "ERA7_FINDING" (pr-str [k m])))
(defn ok! [lbl what rep] (x/oracle! lbl (= 200 (:status rep)) (str "setup: " what) (offers/outcome rep)))
(defn ref! [src cmd owner attr target] (offers/send src (#'a6/ref-frame cmd owner attr target)))
(defn row! [src cmd owner attr value] (offers/send src (g/save-frame cmd owner attr value nil nil)))

(defn subject!
  "One subject of a held deep account as SCALE1's person keeps it (n3deep's shape): root acct/<acct>/pl:N with
  :subject/account and :subject/member, protected values on its worker entity and its document entity, the chain of
  references root -> wk, root -> i9 -> sec -> ev -> doc, and one unprotected row on the root. Returns its names."
  [src lbl acct m]
  (let [n (format "%08d" m) e (fn [k] (str "acct/" acct "/" k ":" n))
        root (e "pl") wk (e "wk") i9 (e "i9") sec (str (e "sec") ":0") ev (str (e "ev") ":0:0") doc (str (e "doc") ":0:0")
        tag (str acct "-" n)
        [vw iw] (a5/seed! src (str "d7w-" tag) wk "wk")
        [vd id] (a5/seed! src (str "d7d-" tag) doc "doc")]
    (ok! lbl "account" (row! src (str "d7acc-" tag) root ":subject/account" acct))
    (ok! lbl "member" (row! src (str "d7mem-" tag) root ":subject/member" (str m)))
    (doseq [[c o a t] [["wkr" root ":placement/worker" wk] ["i9r" root ":placement/i9" i9] ["secr" i9 ":i9/section" sec]
                       ["evr" sec ":section/evidence" ev] ["docr" ev ":evidence/document" doc]]]
      (ok! lbl c (ref! src (str "d7" c "-" tag) o a t)))
    {:acct acct :m m :subject (str "pl:s" n) :root root :plain (a5/plain-row! src (str "d7p-" tag) root)
     :wk [vw iw] :doc [vd id] :entities [root wk i9 sec ev doc]}))
(defn place-of [sj & [root]] (str "deep|" (:acct sj) "|@" (or root (:root sj)) "|" (:subject sj)))
(defn seal! [src sj content place] (let [r (a5/seal-many src [{"ids" [(:plain sj)] "value" content "place" place}])]
                                     {:status (:status r) :code (get-in r [:body "code"]) :wire (get-in r [:body "items" 0 "sealed"])}))
(defn after [src wire place content]
  (let [o (a5/open-placed src wire place)]
    (cond (a5/removed? o) :removed (= content (a5/opened o)) :value :else (a5/shape o))))
(defn names-of [wire] (when wire (count (:k (a5/wire-parts wire)))))

;; ---- d1: the root check accepts A root of the subject, not THE root ----------------------------------------------
(defn d1
  "Places the gateway accepts that name a root other than the subject's real one, each for a record its writer
  computed from the subject's protected values while naming only an unprotected row; then one value removed."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "d1"
            a7 (subject! src lbl "a" 7)
            b7 (subject! src lbl "b" 7)
            ;; a second entity carrying the root's two rows (a second placement of the same subject, or any entity
            ;; written with them): nothing refers to it, it reaches nothing
            alt "acct/a/pl:00000007-rehire"
            _ (ok! lbl "alt account" (row! src "d7-alt-acc" alt ":subject/account" "a"))
            _ (ok! lbl "alt member" (row! src "d7-alt-mem" alt ":subject/member" "7"))
            req (offers/outcome (a6/require! src))
            content (str "derived-a7:" (first (:wk a7)) "|" (first (:doc a7)))
            places {:real (place-of a7)
                    :second-root-of-the-subject (place-of a7 alt)
                    :same-number-in-another-account (place-of b7)
                    :no-root (str "deep|a|" (:subject a7))}
            sealed (into {} (for [[k p] places] [k (seal! src a7 content p)]))
            stored (into {} (for [[k s] sealed :when (:wire s)]
                              [k (a6/doc! src (str "d7-page-" (name k)) (str "answer:7:f" (count (name k)))
                                          (a6/page [["" (:wire s)]] {"subject" (:subject a7)}))]))
            rm (a5/erase-until-done! src "d7-rm" [(second (:wk a7))] nil nil)
            gone (a5/key-gone? src [(second (:wk a7))])
            outcome (into {} (for [[k s] sealed :when (:wire s)] [k (after src (:wire s) (places k) content)]))
            outside (into {} (for [[k s] sealed :when (:wire s)]
                               [k (boolean (some-> (a5/offline src (:wire s)) (str/includes? (first (:wk a7)))))]))
            row {:setting req :seal (into {} (for [[k s] sealed] [k (or (names-of (:wire s)) [(:status s) (:code s)])]))
                 :stored-under-the-setting stored :removal (:status (:final rm)) :key-gone gone :after-removal outcome
                 :decoded-outside-with-the-keys-left outside}]
        (report :d1 row)
        (doseq [[k o] outcome :when (and (not= k :real) (= :value o))]
          (finding! :d1-under-sealed-place-accepted {:place k :stored (get stored k) :outside (get outside k)}))
        (x/oracle! lbl (= :removed (:real outcome)) "the real root's record opens as removed" row)))))

;; ---- d2: what the walk reaches: another subject, a shared entity, a cycle, a reverse reference, the bound -----------
(defn d2 []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "d2"
            s1 (subject! src lbl "a" 1) s2 (subject! src lbl "a" 2) s3 (subject! src lbl "a" 3) s4 (subject! src lbl "a" 4)
            ;; s1 refers to s2's root (a manager, a household member, a referrer)
            _ (ok! lbl "manager ref" (ref! src "d7-mgr" (:root s1) ":placement/manager" (:root s2)))
            ;; s3 and s4 both refer to one shared site entity holding a protected value (a site's access code)
            site "acct/a/site:0001"
            [vsite isite] (a5/seed! src "d7-site" site "site")
            _ (ok! lbl "site ref 3" (ref! src "d7-site3" (:root s3) ":placement/site" site))
            _ (ok! lbl "site ref 4" (ref! src "d7-site4" (:root s4) ":placement/site" site))
            ;; a cycle: s1's document refers back to its root
            _ (ok! lbl "cycle" (ref! src "d7-cyc" (last (:entities s1)) ":document/owner" (:root s1)))
            ;; s2 keeps a protected note on an entity that refers TO its root (a reverse reference)
            note "acct/a/note:00000002"
            [vnote inote] (a5/seed! src "d7-note" note "note")
            _ (ok! lbl "note ref" (ref! src "d7-noter" note ":note/subject" (:root s2)))
            _ (a6/require! src)
            rec (fn [sj extra] (let [c (str "derived-" (:subject sj) ":" extra)] (assoc (seal! src sj c (place-of sj)) :content c :sj sj)))
            r1 (rec s1 (first (:wk s1)))
            r2 (rec s2 (str (first (:wk s2)) "|" vnote))
            r3 (rec s3 (first (:wk s3)))
            r4 (rec s4 (first (:wk s4)))
            names {:s1-refers-to-s2 (names-of (:wire r1)) :s2 (names-of (:wire r2)) :s3-site (names-of (:wire r3)) :s4-site (names-of (:wire r4))}
            ;; remove s2's worker value: s1's record is sealed under it too
            rm2 (a5/erase-until-done! src "d7-rm-s2" [(second (:wk s2))] nil nil)
            after-s2 {:s1 (after src (:wire r1) (place-of s1) (:content r1)) :s2 (after src (:wire r2) (place-of s2) (:content r2))}
            ;; remove the shared site value: every subject referring to the site loses its records
            rm-site (a5/erase-until-done! src "d7-rm-site" [isite] nil nil)
            after-site {:s3 (after src (:wire r3) (place-of s3) (:content r3)) :s4 (after src (:wire r4) (place-of s4) (:content r4))}
            ;; s2's note (reverse reference): a record computed from it and naming only an unprotected row
            note-rec (rec s2 (str "note-only:" vnote))
            _ (a5/erase-until-done! src "d7-rm-note" [inote] nil nil)
            note-after (after src (:wire note-rec) (place-of s2) (:content note-rec))
            ;; the bound: the same walk with the limit lowered to 5 entities (the real one is 65,536)
            bound (with-redefs [ds/max-world 5] (let [r (a5/seal-many src [{"ids" [(:plain s3)] "value" "x" "place" (place-of s3)}])]
                                                  [(:status r) (get-in r [:body "code"])]))
            row {:header-names names :removal-of-s2 (:status (:final rm2)) :after-s2-removal after-s2
                 :removal-of-the-site (:status (:final rm-site)) :after-site-removal after-site
                 :reverse-reference-record-names (names-of (:wire note-rec)) :reverse-reference-after-removal note-after
                 :cycle-sealed (some? (:wire r1)) :world-over-a-lowered-bound bound}]
        (report :d2 row)
        (when (= :removed (:s1 after-s2)) (finding! :d2-another-subjects-removal-removes-this-subjects-records {:s1 :removed}))
        (when (= #{:removed} (set (vals after-site))) (finding! :d2-a-shared-entity-couples-every-subject-referring-to-it after-site))
        (when (= :value note-after) (finding! :d2-reverse-reference-not-reached {:names (names-of (:wire note-rec))}))
        (x/oracle! lbl (some? (:wire r1)) "a cycle in the references terminates" row)))))

;; ---- d3: a protected value added to the subject after a record was sealed -------------------------------------------
(defn d3 []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "d3"
            s (subject! src lbl "a" 9)
            _ (a6/require! src)
            c1 (str "derived-before:" (first (:wk s)))
            r1 (seal! src s c1 (place-of s))
            ;; later: a second document, linked from the evidence, with its own protected value
            doc2 "acct/a/doc:00000009:0:1"
            [v2 i2] (a5/seed! src "d7-doc2" doc2 "doc2")
            _ (ok! lbl "doc2 ref" (ref! src "d7-doc2r" (nth (:entities s) 4) ":evidence/document2" doc2))
            c2 (str "derived-after:" v2)
            r2 (seal! src s c2 (place-of s))
            names {:before (names-of (:wire r1)) :after (names-of (:wire r2))}
            rm (a5/erase-until-done! src "d7-rm-v2" [i2] nil nil)
            out {:record-from-before (after src (:wire r1) (place-of s) c1) :record-from-after (after src (:wire r2) (place-of s) c2)}
            rm1 (a5/erase-until-done! src "d7-rm-v1" [(second (:wk s))] nil nil)
            out1 (after src (:wire r1) (place-of s) c1)
            row {:header-names names :removal-of-the-later-value (:status (:final rm)) :after out
                 :removal-of-an-earlier-value (:status (:final rm1)) :record-from-before-after-it out1}]
        (report :d3 row)
        (x/oracle! lbl (= :removed (:record-from-after out)) "a record computed after the later value was added opens as removed after its removal" row)
        (x/oracle! lbl (= :removed out1) "the earlier record opens as removed after an earlier value's removal" row)))))

;; ---- d4: the walk's cost per seal call ------------------------------------------------------------------------------
(defn d4
  "One frame of 64 subjects x 6 records with root places (the deep rule) and with W0 places (no root) on the same
  subjects; then the same with every subject's root referring to one shared entity that refers to K other subjects'
  roots (a team or site list), K = 0, 50, 200. Medians of 5."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "d4"
            subjects (vec (for [i (range 64)] (subject! src lbl "a" (+ 100 i))))
            _ (a6/require! src)
            frame (fn [placef] (vec (for [sj subjects u (range 6)] {"ids" [(:plain sj)] "value" (str (apply str (repeat 217 "u")) u) "place" (placef sj)})))
            median (fn [f] (let [ts (vec (sort (for [_ (range 5)] (let [t (System/nanoTime)] (f) (/ (- (System/nanoTime) t) 1e6)))))] (Math/round (double (ts 2)))))
            timed (fn [items] (median #(let [r (a5/seal-many src items)] (x/oracle! lbl (= 200 (:status r)) "seal" (offers/outcome r)))))
            root-ms (timed (frame place-of))
            w0-ms (timed (frame (fn [sj] (str "deep|a|" (:subject sj)))))
            hub "acct/a/team:0001"
            _ (ok! lbl "hub row" (row! src "d7-hub" hub ":team/name" "t"))
            _ (doseq [sj subjects] (ok! lbl "team ref" (ref! src (str "d7-team-" (:m sj)) (:root sj) ":placement/team" hub)))
            extra (atom 0)
            grow! (fn [k] (doseq [i (range @extra k)]
                            (let [o (subject! src lbl "a" (+ 1000 i))]
                              (ok! lbl "member ref" (ref! src (str "d7-memb-" i) hub ":team/member" (:root o)))))
                    (reset! extra k))
            shared (vec (for [k [0 50 200]]
                          (do (grow! k)
                              (let [one (median #(a5/seal-many src [{"ids" [(:plain (first subjects))] "value" "x" "place" (place-of (first subjects))}]))
                                    full (timed (frame place-of))
                                    names (names-of (get-in (a5/seal-many src [{"ids" [(:plain (first subjects))] "value" "x" "place" (place-of (first subjects))}]) [:body "items" 0 "sealed"]))]
                                {:other-subjects-on-the-team k :one-record-ms one :frame-64x6-ms full :header-names names}))))
            row {:frame-64x6-root-places-ms root-ms :frame-64x6-w0-places-ms w0-ms :shared-team shared}]
        (report :d4 row)))))

;; ---- e4: the removal builder's cut-read-race (383db77d1, era2/gate.clj), run against this head and the fix --------------
;; DX-ERA4's gate (e) seed 915: a ticketed write of account b refused 503 while a removal of account a published. Forced
;; with no seed, as its author wrote it: the removal held before its publication, b's k-th read of the log's head held
;; right after the file is read, the removal published, a read of b1 moving the cache to the published head.
(defn e4race []
  (when g/per-account?
    (doseq [variant [:frame-naming-b :save-b1 :read-b1] k [1 2 3 4]]
      (g/fresh-scope false
        (fn [name conn]
          (let [label (str "e4race/" g/mode "/" (clojure.core/name variant) "/read-" k)
                seeds (g/seed! name [g/a1 g/b1]) va (:value (seeds g/a1))
                ticket (#'g/served-seq name conn)
                publish privacy/publish! record-text privacy/record-text
                at-publish (promise) go (promise) held (promise) resume (promise)
                target (atom nil) reads (atom 0)
                rm (future (with-redefs-fn {#'privacy/publish! (fn [n c i]
                                                                 (when (= n name) (deliver at-publish true) (deref go 30000 nil))
                                                                 (publish n c i))}
                             #(g/remove! name "crr-1" g/a1)))
                _ (x/oracle! label (deref at-publish 30000 false) "set-up: the removal is held before its publication" nil)
                send (fn [] (case variant
                              :frame-naming-b (offers/send name (assoc (g/save-frame "crr-nb" "notice:v1:crr-nb" ":notice/body" "n" nil nil)
                                                                       "erasureSeq" ticket "erasureAccounts" ["b"]))
                              :save-b1 (offers/send name (g/frame "crr-b1" g/b1 (g/secret g/b1 "s") (:id (seeds g/b1)) (g/head conn)))
                              :read-b1 (offers/route name "v1" "read" {"entityIds" [g/b1]})))
                obs (with-redefs [privacy/record-text
                                  (fn [n rec]
                                    (let [t (record-text n rec)]
                                      (when (and (= n name) (= rec "head.json") (identical? (Thread/currentThread) @target)
                                                 (= k (swap! reads inc)))
                                        (deliver held true) (deref resume 30000 nil))
                                      t))]
                      (let [w (future (reset! target (Thread/currentThread)) (send))
                            started (System/currentTimeMillis)]
                        (loop [] (when-not (or (realized? held) (realized? w) (> (- (System/currentTimeMillis) started) 1500))
                                   (Thread/sleep 2) (recur)))
                        (let [was-held (realized? held)
                              _ (deliver go true)
                              removal (deref rm 30000 {:status 0})
                              refresh (offers/route name "v1" "read" {"entityIds" [g/b1]})
                              _ (deliver resume true)
                              answer (deref w 30000 {:status 0 :body {"code" "timeout"}})]
                          {:held-at-read k :held was-held :head-reads @reads :removal (offers/outcome removal)
                           :refresh (offers/outcome refresh) :answer (offers/outcome answer)
                           :message (get-in answer [:body "message"])})))]
            (report :e4race [variant obs])
            (bump! :e4race (clojure.core/name variant) (:answer obs))
            (x/oracle! label (= [200 nil] (:removal obs)) "the removal completes" obs)
            (x/oracle! label (= [200 nil] (:answer obs)) "a request of another account is answered 200 whatever head it read while the removal published" obs)
            (x/oracle! label (not (str/includes? (g/text (:body (offers/route name "v1" "read" {"entityIds" [g/a1]}))) va)) "a1 not answered" nil)))))))

;; ---- fuzz7: attack6's fuzzer in the held deep layout, with the place and the writer's names as dimensions ----------
;; Each block: a fresh sealed database with the setting, a pool of 24 deep-layout subjects (numbers 1 to 8 in accounts
;; a, b and c, so each number has a root in three accounts), a second root per subject (an entity carrying the root's
;; two rows, nothing else), and a note entity per subject that refers TO its root. Each schedule: three subjects of the
;; pool; one to three new protected values each, on its worker entity, its document entity, or (one in eight) its note;
;; four to eight records, each computed from one to four of the schedule's values, its place one of: the subject's real
;; root (half), a second root, the same number's root in another account, no root, and its names either every source's
;; row plus an unprotected row (full) or the unprotected row only (mislabelled); each seal call ok, failed or refused
;; (the writer then stores clear, which must be refused). Then removals stopped at a random step, kills and restored
;; keys as in fuzz6. Oracles (must hold): the removal completes, removed keys deleted; a record named in full from a
;; removed value opens as removed and does not decode outside the gateway; a record at its real root whose removed
;; source is its own subject's value on an entity the root reaches opens as removed, whatever its names; a kept record
;; opens to its content; clear writes refused, sealed ones accepted; block scans. Counted apart (findings): records from
;; a removed value that still open, by place and cause.
(def stops7 [nil nil nil :before-declare :after-declare :after-guard :before-native :after-native :at-publish])
(def places7 [:real :real :real :real :second-root :other-account :no-root :real])
(defn- pool! [src]
  (vec (for [acct ["a" "b" "c"] m (range 1 9)]
         (let [sj (subject! src "F7 pool" acct m)
               alt (str (:root sj) "-x") note (str "acct/" acct "/note:" (format "%08d" m))]
           (ok! "F7 pool" "alt account" (row! src (str "f7alt-a-" acct m) alt ":subject/account" acct))
           (ok! "F7 pool" "alt member" (row! src (str "f7alt-m-" acct m) alt ":subject/member" (str m)))
           (ok! "F7 pool" "note row" (row! src (str "f7note-" acct m) note ":note/kind" "n"))
           (ok! "F7 pool" "note ref" (ref! src (str "f7noter-" acct m) note ":note/subject" (:root sj)))
           (assoc sj :alt alt :note note)))))
(defn run-schedule7! [src conn pool run i ^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        tag (str run "-" i)
        chosen (vec (take 3 (distinct (repeatedly #(pick pool)))))
        by-key (into {} (map (fn [sj] [[(:acct sj) (:m sj)] sj])) pool)
        values (vec (for [[si sj] (map-indexed vector chosen) j (range (inc (.nextInt r 3)))]
                      ;; each value on an entity of its own (a value saved again on an entity whose earlier value was
                      ;; removed is declined, ErasureReplayDeclined): linked from the subject's evidence entity (reached
                      ;; from the root), or, one in eight, referring to the root (a reverse reference, not reached)
                      (let [where (if (zero? (.nextInt r 8)) :note :reached)
                            entity (str "acct/" (:acct sj) "/val:" (format "%08d" (:m sj)) ":" tag "-" si "-" j)
                            [v aid] (a5/seed! src (str "f7v-" tag "-" si "-" j) entity tag)]
                        (if (= :note where)
                          (ok! "F7" "reverse ref" (ref! src (str "f7vr-" tag "-" si "-" j) entity ":value/subject" (:root sj)))
                          (ok! "F7" "ref" (ref! src (str "f7vr-" tag "-" si "-" j) (nth (:entities sj) 4) ":evidence/value" entity)))
                        {:si si :sj sj :where where :value v :id aid})))
        n (count values)
        records (vec (for [k (range (+ 4 (.nextInt r 5)))]
                       (let [srcs (vec (sort (distinct (repeatedly (inc (.nextInt r (min 4 n))) #(.nextInt r n)))))
                             sj (:sj (values (first srcs)))
                             pm (pick places7)
                             place (case pm
                                     :real (place-of sj)
                                     :second-root (place-of sj (:alt sj))
                                     :other-account (let [o (by-key [(pick (vec (remove #{(:acct sj)} ["a" "b" "c"]))) (:m sj)])] (place-of o))
                                     :no-root (str "deep|" (:acct sj) "|" (:subject sj)))
                             full (.nextBoolean r)
                             names (if full (conj (mapv #(:id (values %)) srcs) (:plain sj)) [(:plain sj)])
                             content (str "derived7-" tag "-" k ":" (str/join "|" (map #(:value (values %)) srcs)))
                             mode (let [x (.nextInt r 8)] (cond (zero? x) :failed (= 1 x) :refused :else :ok))
                             rep (case mode
                                   :ok (a5/seal-many src [{"ids" names "value" content "place" place}])
                                   :failed (with-redefs [ds/handle! (fn [& _] (throw (ex-info "injected: the seal call failed" {})))]
                                             (a5/seal-many src [{"ids" names "value" content "place" place}]))
                                   :refused (a5/seal-many src [{"ids" (conj names (str "no-such-row-" tag)) "value" content "place" place}]))
                             wire (when (= :ok mode) (get-in rep [:body "items" 0 "sealed"]))]
                         (bump! :place pm (if full :full :mislabelled) mode (if wire :sealed (:status rep)))
                         {:k k :srcs srcs :sj sj :place place :pm pm :full full :content content :mode mode :wire wire})))
        _ (doseq [rec records]
            (let [unit (if (:wire rec) ["" (:wire rec)] ["k" (:content rec)])
                  o (a6/doc! src (str "f7w-" tag "-" (:k rec)) (str "answer:" i ":f" (:k rec))
                             (a6/page [unit] {"subject" (:subject (:sj rec))}))]
              (if (:wire rec)
                (x/oracle! (str "F7 " i) (= [200 nil] o) "the setting accepts a sealed unit in its subject's page" {:pm (:pm rec) :o o})
                (when (not= :ok (:mode rec))
                  (x/oracle! (str "F7 " i) (= [409 "DerivedRecordUnsealed"] o) "the setting refuses the clear content stored after a failed or refused seal" {:o o})))))
        rounds (if (zero? (.nextInt r 4)) 2 1)]
    (loop [round 1 gone #{}]
      (when-not (or (> round rounds) (every? gone (range n)))
        (let [left (filterv #(not (gone %)) (range n))
              victim (:si (values (pick left)))
              mine (filterv #(= victim (:si (values %))) left)
              now-idx (vec (sort (distinct (repeatedly (inc (.nextInt r (count mine))) #(pick mine)))))
              now-ids (mapv #(:id (values %)) now-idx)
              gone (into gone now-idx)
              stop (pick stops7) kill? (zero? (.nextInt r 4)) restore? (zero? (.nextInt r 8))
              backups (into {} (for [id now-ids] [id (a5/file-key src id)]))
              between (fn [] (when kill? (reset! privacy/cache {}) (reset! envelope/shredded {}) (bump! :kill)) nil)
              rm (a5/erase-until-done! src (str "f7r-" tag "-" round) now-ids stop between)
              ok (= 200 (:status (:final rm)))
              label (str "F7 " (pr-str {:i i :round round :stop stop :kill kill? :restore restore?}))
              keys-gone (and ok (a5/key-gone? src now-ids))
              restored (when (and ok restore?) (let [id (pick now-ids)] (a5/restore-key! src id (backups id)) (bump! :restore) id))]
          (bump! :stop (or stop :none) (if (:fired rm) :fired :not-fired))
          (x/oracle! label ok "the removal completes after at most 4 resends" {:final (offers/outcome (:final rm))})
          (when ok
            (x/oracle! label keys-gone "every removed key is deleted" {:ids now-ids})
            (doseq [rec records :when (:wire rec)]
              (let [hit (filterv gone (:srcs rec))
                    own (filterv #(and (= (:sj (values %)) (:sj rec)) (= :reached (:where (values %)))) hit)
                    o (a5/open-placed src (:wire rec) (:place rec))
                    open? (= (:content rec) (a5/opened o))
                    restored-src (and restored (some #(= restored (:id (values %))) hit))
                    dec (a5/offline src (:wire rec))]
                (cond
                  (empty? hit)
                  ;; none of its sources removed: it opens, or (the gateway seals under every value of the place's
                  ;; subject) it opens as removed because another value of that subject was removed
                  (do (bump! :records :kept (cond open? :opens (a5/removed? o) :removed-with-its-subject :else :other))
                      (x/oracle! label (or open? (a5/removed? o)) "a record of kept values opens to its exact content, or as removed with its subject" {:pm (:pm rec) :o (a5/shape o)}))
                  (:full rec)
                  (do (bump! :records :full-from-removed (if (a5/removed? o) :removed :open))
                      (x/oracle! label (a5/removed? o) "a record named in full from a removed value opens as removed" {:pm (:pm rec)})
                      (when-not restored-src
                        (x/oracle! label (nil? dec) "no key the store holds decodes a removed value's copy" {:pm (:pm rec)})))
                  (and (= :real (:pm rec)) (seq own))
                  (do (bump! :records :real-own-from-removed (if (a5/removed? o) :removed :open))
                      (x/oracle! label (a5/removed? o) "a record at its real root from its subject's removed value opens as removed, whatever its names" {:srcs (:srcs rec) :o (a5/shape o) :hit (mapv #(select-keys (values %) [:where :id]) hit)}))
                  :else
                  (let [cause (cond (not= :real (:pm rec)) (:pm rec)
                                    (some #(= :note (:where (values %))) hit) :unreached-entity
                                    :else :another-subject)]
                    (bump! :mislabelled-from-removed cause (if open? :still-opens (if (a5/removed? o) :removed :other))))))))
          (when restored (java.nio.file.Files/deleteIfExists (envelope/key-file src restored)))
          (recur (inc round) gone))))
    (bump! :schedules)
    {:gone (vec (map :value values))}))
(defn fuzz7 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [kb (range (quot (+ n block -1) block))]
      (g/fresh-scope true
        (fn [src conn]
          (let [pool (pool! src)]
            (x/oracle! "F7 setting" (= 200 (:status (a6/require! src))) "the setting is declared" nil)
            (doseq [i (range (* kb block) (min n (* (inc kb) block)))]
              (try (run-schedule7! src conn pool run i r)
                   (catch Throwable e (reset! x/plan nil) (x/oracle! (str "F7 " i) false (str "schedule stopped: " (.getMessage e))))))
            (println "ERA7_PROGRESS" (pr-str {:block kb :schedules (get @tally [:schedules]) :oracles @x/oracles
                                               :violations (count @x/violations)}))))))))

;; ---- b1: the content-free kinds, accepted without decoding ----------------------------------------------------------
(defn b1 []
  (g/fresh-scope true
    (fn [src conn]
      (let [[vx idx] (a5/seed! src "b7-x" g/a1 "b7")
            _ (a6/require! src)
            kinds ["notice-progress" "values:1" "claim:abc" "census:abc" "members:abc:1" "join-meta" "join-calendar"
                   "join-member:pl:s00000001" "join-index-base:1" "join-index:1" "join-invalid" "control" "event:1" "tail"
                   "erasure" "received:abc" "effect-erasure:abc:1" "recorded-generation:pl:s00000001" "recorded-cursor"
                   "cursor" "settled-values:abc" "settled-notice:abc"]
            outcomes (into (sorted-map) (for [k kinds] [k (a6/doc! src (str "b7-" k) k {"payload" vx})]))
            ;; identifier fields: a protected value shaped like an identifier (an SSN with dashes)
            ssn "123-45-6789"
            ids {:removed-marker-names (a6/doc! src "b7-rm" "recorded-ledger:pl:s00000001" (a6/packed [{"removed" [ssn]}]))
                 :page-entry-subject (a6/doc! src "b7-pe" "answer:7:f1"
                                              (assoc (a6/page [] {"subject" ssn}) "identity" a6/hex "previous" a6/hex))
                 :packet-account (a6/doc! src "b7-pa" "recorded-notices:7" (a6/packed {"account" ssn "deliveries" []}))}
            accepted (count (filter #(= [200 nil] %) (vals outcomes)))
            row {:content-free-kinds (count kinds) :accepted accepted :outcomes outcomes :identifier-fields ids}]
        (report :b1 row)
        (when (pos? accepted) (finding! :b1-content-free-kind-holds-a-protected-value {:accepted accepted :of (count kinds)}))))))

;; ---- r1: the bounded re-sweep at many removals (the function itself, on synthetic records) ---------------------------
(defn- entry [i at]
  {"seq" (inc i) "erasedAt" at "commandId" (str "cmd-" i) "txId" (format "_tx/%026d" i)
   "identities" [{"assertionId" (format "01M%023d" i) "entity" (format "acct/a/doc:%08d:0:0" i) "attribute" ":file/expiresOn"
                  "valueType" "string" "keyHandle" (format "h%031d" i) "interval" [0 nil]}]})
(defn r1 []
  (doseq [n [10000 100000 300000]]
    (System/gc) (Thread/sleep 200)
    (let [rt (Runtime/getRuntime) used #(- (.totalMemory rt) (.freeMemory rt))
          m0 (used)
          at (- (System/currentTimeMillis) 86400000)
          records (vec (map #(entry % at) (range n)))
          _ (System/gc) _ (Thread/sleep 200)
          m1 (used)
          target (get-in records [(quot n 3) "identities" 0 "assertionId"])
          checked (atom 0) found (atom nil)
          name (str "s2-synthetic-" n)
          pass! (fn [recs]
                  (with-redefs [ds/committed-records (fn [_ _] recs)
                                privacy/cut (fn [& _] {:sealed true :commands {}})
                                ds/present-keys (fn [_ ids] (swap! checked + (count ids)) (filterv #(= target (get % "assertionId")) ids))
                                envelope/erase-keys! (fn [_ ids] (reset! found (count ids)))]
                    (let [t (System/nanoTime)] (ds/resweep-one! name nil) (/ (- (System/nanoTime) t) 1e6))))
          _ (swap! @#'ds/resweep-state dissoc name)
          times (vec (for [k (range 5)] (pass! records)))
          _ (swap! @#'ds/resweep-state dissoc name) _ (reset! found nil)
          ;; passes until a restored key a third of the way down is checked (run up to 100,000 removals; above, the bound)
          passes (if (<= n 100000) (loop [k 1] (pass! records) (if (or @found (> k 100000)) k (recur (inc k)))) :not-run)
          ;; starvation (10,000 only): 256 new due identities arrive before every pass (a sustained 256 per second);
          ;; without arrivals the key is reached within (n - 256) / 256 = 39 passes; run 400
          _ (swap! @#'ds/resweep-state dissoc name) _ (reset! found nil)
          starved (if (= n 10000)
                    (loop [k 1 recs records]
                      (let [more (into recs (map #(entry % at) (range (+ n (* 256 (dec k))) (+ n (* 256 k)))))]
                        (pass! more)
                        (if (or @found (>= k 400)) {:passes k :found (boolean @found)} (recur (inc k) more))))
                    {:found :not-run})
          row {:removals n :heap-mb-for-the-records (Math/round (/ (- m1 m0) 1048576.0)) :pass-ms (mapv #(Math/round (double %)) times)
               :passes-until-a-restored-key-at-one-third-is-checked passes
               :with-256-new-due-identities-before-each-pass starved}]
      (report :r1 row)
      (when (false? (:found starved)) (finding! :r1-restored-key-starved {:removals n :passes (:passes starved)})))))

(defn- guarded [label f]
  (try (f) (catch Throwable e (reset! x/plan nil) (x/oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (x/install-hooks!)
  (#'era4-races/install-declare-hooks!)
  (envelope/start!)
  (println "ERA7_BOUNDARY" (pr-str {:commit-boundary-allowed @(requiring-resolve 'triplex.gateway.removal-commit/may-turn-on)}))
  (case (System/getenv "ERA5_PHASE")
    "cases7" (do (guarded "d1" d1) (guarded "d2" d2) (guarded "d3" d3) (guarded "b1" b1))
    "cost7" (guarded "d4" d4)
    "resweep7" (guarded "r1" r1)
    "e4race7" (guarded "e4race" e4race)
    "fuzz7" (fuzz7 (or (System/getenv "ERA5_RUN") "h0") (Long/parseLong (or (System/getenv "ERA5_N") "100"))
                   (Long/parseLong (or (System/getenv "ERA5_BLOCK") "50")) (Long/parseLong (or (System/getenv "ERA5_SEED") "1"))))
  (println "ERA7_TALLY" (pr-str (into (sorted-map) (map (fn [[kk v]] [(pr-str kk) v])) @tally)))
  (println "ERA7_FINDINGS" (pr-str (frequencies @findings)))
  (println "ERA5_VIOLATIONS" (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 8 @x/violations)] (println "ERA5_VIOLATION" (pr-str v)))
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
