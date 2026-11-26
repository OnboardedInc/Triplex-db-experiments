(ns era4-attack8
  "[DX-ERA4, third review T3, T4, T5, T7] The fourth round's own cases, in process (era5/inproc.sh phases *8), loaded
  after attack5.clj, attack6.clj and attack7.clj, the same options as there; the boundary is the database's
  (ERA5_EXTRA_ENV=TX2_REMOVAL_COMMIT_BOUNDARY=1 for the commit one). ERA8_CASE lines carry each case's observations;
  oracles for what must hold."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.derived-seal :as ds]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [era5-attack :as a5] [era5-attack6 :as a6]
            [era4-races :as r4]))

(defn report [k m] (println "ERA8_CASE" (pr-str [k m])))
(def deep-boundary
  {"v" 1 "subject" "pl:s{n}" "root" "acct/{account}/pl:{n}" "rootRows" true
   "own" (vec (mapcat (fn [k] (concat (when-not (= k "pl") [(str "acct/{account}/" k ":{n}")]) [(str "acct/{account}/" k ":{n}:*")]))
                      ["pl" "wk" "i9" "sec" "ev" "doc" "evt"]))})
(defn ok! [lbl what rep] (x/oracle! lbl (= 200 (:status rep)) (str "setup: " what) (offers/outcome rep)))
(defn ref! [src cmd owner attr target] (offers/send src (#'a6/ref-frame cmd owner attr target)))
(defn row! [src cmd owner attr value] (offers/send src (g/save-frame cmd owner attr value nil nil)))

(defn subject!
  "One subject of a held deep account (n3deep's and attack7's shape): root acct/<acct>/pl:N with :subject/account and
  :subject/member, protected values on its worker and document entities, the chain root -> wk, root -> i9 -> sec -> ev
  -> doc, and one unprotected row on the root."
  [src lbl acct m]
  (let [n (format "%08d" m) e (fn [k] (str "acct/" acct "/" k ":" n))
        root (e "pl") wk (e "wk") i9 (e "i9") sec (str (e "sec") ":0") ev (str (e "ev") ":0:0") doc (str (e "doc") ":0:0")
        tag (str acct "-" n)
        [vw iw] (a5/seed! src (str "b8w-" tag) wk "wk")
        [vd id] (a5/seed! src (str "b8d-" tag) doc "doc")]
    (ok! lbl "account" (row! src (str "b8acc-" tag) root ":subject/account" acct))
    (ok! lbl "member" (row! src (str "b8mem-" tag) root ":subject/member" (str m)))
    (doseq [[c o a t] [["wkr" root ":placement/worker" wk] ["i9r" root ":placement/i9" i9] ["secr" i9 ":i9/section" sec]
                       ["evr" sec ":section/evidence" ev] ["docr" ev ":evidence/document" doc]]]
      (ok! lbl c (ref! src (str "b8" c "-" tag) o a t)))
    {:acct acct :m m :subject (str "pl:s" n) :root root :plain (a5/plain-row! src (str "b8p-" tag) root)
     :wk [vw iw] :doc [vd id]}))
(defn seal! [src sj content place]
  (let [r (a5/seal-many src [{"ids" [(:plain sj)] "value" content "place" place}])]
    {:status (:status r) :code (get-in r [:body "code"]) :wire (get-in r [:body "items" 0 "sealed"])}))
(defn names-of [wire] (when wire (count (:k (a5/wire-parts wire)))))
(defn outcome [src wire place content]
  (let [o (a5/open-placed src wire place)]
    (cond (a5/removed? o) :removed (= content (a5/opened o)) :value :else (a5/shape o))))

;; ---- boundary8: the declared subject boundary (T3, T4) ---------------------------------------------------------------
(defn boundary8
  "A held deep database that declares SCALE1's subject boundary. The places the third review found accepted (a second
  entity carrying the root's rows, the same number's root in another account, no root) and its walk's reach (another
  subject's root, a shared entity, a reverse reference), now: the gateway finds the root itself, seals under the
  subject's own entities' values, binds a stored unit to the write's account, and refuses a protected value written
  outside every subject."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "boundary8"
            declared (ds/declare-boundary! conn deep-boundary)
            again (ds/declare-boundary! conn deep-boundary)
            other (try (ds/declare-boundary! conn (assoc deep-boundary "rootRows" false)) :accepted
                       (catch clojure.lang.ExceptionInfo e [(:status (ex-data e)) (:code (ex-data e))]))
            bad (try (ds/declare-boundary! conn (assoc deep-boundary "own" ["acct/{account}/wk*"])) :accepted
                     (catch clojure.lang.ExceptionInfo e [(:status (ex-data e)) (:code (ex-data e))]))
            subjects (vec (for [acct ["a" "b"] m (range 600 612)] (subject! src lbl acct m)))
            a7 (first subjects) b7 (first (filter #(and (= "b" (:acct %)) (= (:m %) (:m a7))) subjects))
            ;; a second entity carrying a7's root rows (no protected value: it would be refused, below)
            alt (str (:root a7) "-rehire")
            _ (ok! lbl "alt account" (row! src "b8-alt-acc" alt ":subject/account" "a"))
            _ (ok! lbl "alt member" (row! src "b8-alt-mem" alt ":subject/member" (str (:m a7))))
            setting (offers/outcome (a6/require! src))
            content (fn [sj] (str "derived-" (:acct sj) (:subject sj) ":" (first (:wk sj)) "|" (first (:doc sj))))
            places {:real-root (str "deep|a|@" (:root a7) "|" (:subject a7))
                    :no-root (str "deep|a|" (:subject a7))
                    :second-root-of-the-subject (str "deep|a|@" alt "|" (:subject a7))
                    :another-subjects-root (str "deep|a|@" (:root (second subjects)) "|" (:subject a7))
                    :same-number-in-another-account (str "deep|b|" (:subject a7))
                    :a-number-with-no-root (str "deep|a|pl:s00009999")}
            sealed (into {} (for [[k p] places] [k (seal! src a7 (content a7) p)]))
            ;; every subject's record placed without a root, named only by its unprotected row
            records (vec (for [sj subjects] (let [p (str "deep|" (:acct sj) "|" (:subject sj))]
                                              {:sj sj :place p :wire (:wire (seal! src sj (content sj) p))})))
            names (frequencies (map #(names-of (:wire %)) records))
            ;; stored under the setting: the write names account a; a unit placed in b, or a write naming none, refused
            page (fn [wire subject] (a6/page [["" wire]] {"subject" subject}))
            stored-a (binding [r4/*derived-account* "a"] (a6/doc! src "b8-page-a" "answer:8:f1" (page (:wire (:no-root sealed)) (:subject a7))))
            stored-b-in-a (binding [r4/*derived-account* "a"]
                            (a6/doc! src "b8-page-b" "answer:8:f2" (page (:wire (:same-number-in-another-account sealed)) (:subject a7))))
            stored-none (a6/doc! src "b8-page-none" "answer:8:f3" (page (:wire (:no-root sealed)) (:subject a7)))
            ;; T4: protected values outside every subject refused at write; inside accepted
            write (fn [cmd e] (offers/outcome (offers/send src (g/frame cmd e (g/secret e "x") nil nil))))
            writes {:own-entity (write "b8-own" (str "acct/a/doc:" (format "%08d" (:m a7)) ":1:0"))
                    :shared-site (write "b8-site" "acct/a/site:00000001")
                    :entity-referring-to-the-root (write "b8-note" (str "acct/a/note:" (format "%08d" (:m a7))))
                    :the-second-root (write "b8-alt-v" alt)
                    :w0-form-entity (write "b8-w0" (str (:subject a7) "/doc:a"))}
            ;; T4: references between subjects no longer reach: a7's root refers to the second subject's root and to a
            ;; site entity; a7's records stay under a7's two values
            s2 (second subjects)
            _ (ok! lbl "manager ref" (ref! src "b8-mgr" (:root a7) ":person/manager" (:root s2)))
            reach (names-of (:wire (seal! src a7 (content a7) (str "deep|a|" (:subject a7)))))
            ;; one value of each subject removed: the worker's for even numbers, the document's for odd
            removed (fn [sj] (if (even? (:m sj)) (:wk sj) (:doc sj)))
            rm (a5/erase-until-done! src "b8-rm" (mapv #(second (removed %)) subjects) nil nil)
            after (frequencies (map #(outcome src (:wire %) (:place %) (content (:sj %))) records))
            s2-record (outcome src (:wire (:real-root sealed)) (:real-root places) (content a7))
            row {:declared declared :same-again again :another-refused other :malformed-refused bad :setting setting
                 :seal (into {} (for [[k s] sealed] [k (or (names-of (:wire s)) [(:status s) (:code s)])]))
                 :records (count records) :header-names names :stored {:account-a stored-a :unit-of-b-in-a stored-b-in-a :no-account stored-none}
                 :writes writes :names-with-a-reference-to-another-subject reach :removal (:status (:final rm))
                 :after-removal after :real-root-record s2-record}]
        (report :boundary8 row)
        (x/oracle! lbl (= {:declared true :changed true} declared) "the boundary is declared" row)
        (x/oracle! lbl (= {:declared true :changed false} again) "the same boundary again changes nothing" row)
        (x/oracle! lbl (= [409 "SubjectBoundaryDeclared"] other) "another boundary is refused" row)
        (x/oracle! lbl (= [400 "InvalidDerivedRecord"] bad) "a malformed boundary is refused" row)
        (x/oracle! lbl (= 2 (names-of (:wire (:real-root sealed)))) "the real root's place: the subject's two values" row)
        (x/oracle! lbl (= 2 (names-of (:wire (:no-root sealed)))) "no root in the place: the gateway finds it, two values" row)
        (doseq [k [:second-root-of-the-subject :another-subjects-root :a-number-with-no-root]]
          (x/oracle! lbl (= 400 (:status (k sealed))) (str "refused: " (name k)) row))
        (x/oracle! lbl (= 2 (names-of (:wire (:same-number-in-another-account sealed)))) "another account's place seals under that account's subject" row)
        (x/oracle! lbl (= {2 (count records)} names) "every record is sealed under its subject's two values" row)
        (x/oracle! lbl (= [200 nil] stored-a) "a unit placed in the write's account is stored" row)
        (x/oracle! lbl (= 409 (first stored-b-in-a)) "a unit placed in another account than the write's is refused" row)
        (x/oracle! lbl (= 409 (first stored-none)) "a write that names no account is refused" row)
        (x/oracle! lbl (= [200 nil] (:own-entity writes)) "a protected value on an own entity is written" row)
        (doseq [k [:shared-site :entity-referring-to-the-root :the-second-root :w0-form-entity]]
          (x/oracle! lbl (= 409 (first (k writes))) (str "a protected value outside every subject is refused: " (name k)) row))
        ;; three: its two values and the one written on its own entity above (the writes); none of the other subject's
        (x/oracle! lbl (= 3 reach) "a reference to another subject's root reaches nothing" row)
        (x/oracle! lbl (= 200 (:status (:final rm))) "the removal completes" row)
        (x/oracle! lbl (= {:removed (count records)} after) "every record opens as removed after its subject's removal" row)))))

;; ---- resweep8: the rebuilt key re-sweep at 10,000, 100,000 and 1,000,000 removals (T5) -----------------------------
(defn- record-tx [k0 k1 at]
  (vec (for [k (range k0 k1)]
         {:db/id (str "r" k)
          :triplex.tx/erasure-record (json/write-str {"seq" (inc k) "erasedAt" at
                                                     "identities" [{"assertionId" (str "a-" k) "keyHandle" (str "h-" k)}]})})))
(defn resweep8
  "The re-sweep's real reader (the database's erasure-record index) over n synthetic removal records, one identity each,
  due a day ago (records on entities of their own, 10,000 per transaction: the index reads them as it reads records on
  transaction entities); the key store replaced by a counter that reports one restored key, a third of the way down.
  Reported per n: the heap the re-sweep holds between passes, five passes' time, the passes until the restored key is
  deleted, and the same while 256 and then 4,096 new due removals arrive before every pass."
  []
  (doseq [n [10000 100000 1000000]]
    (g/fresh-scope true
      (fn [src conn]
        (let [rt (Runtime/getRuntime) used (fn [] (System/gc) (Thread/sleep 100) (- (.totalMemory rt) (.freeMemory rt)))
              at (- (System/currentTimeMillis) 86400000)
              loaded (loop [k 0] (when (< k n) @(d/transact conn (record-tx k (min n (+ k 10000)) at)) (recur (+ k 10000))))
              target (str "a-" (quot n 3))
              checked (atom 0) found (atom 0)
              pass! (fn []
                      (with-redefs-fn {#'ds/present-keys (fn [_ ids] (swap! checked + (count ids)) (filterv #(= target (get % "assertionId")) ids))
                                       #'envelope/erase-keys! (fn [_ ids] (swap! found + (count ids)))}
                        (fn [] (let [t (System/nanoTime) r (ds/resweep-one! src (d/db conn))] [(/ (- (System/nanoTime) t) 1e6) r]))))
              reset-state! (fn [] (swap! @#'ds/resweep-state dissoc src) (reset! found 0) (reset! checked 0))
              _ (reset-state!)
              m0 (used)
              times (vec (for [_ (range 5)] (first (pass!))))
              m1 (used)
              held (pr-str (get @@#'ds/resweep-state src))
              until (fn [arrive]
                      (reset-state!)
                      (loop [k 1 next-k n]
                        (when (pos? arrive) @(d/transact conn (record-tx next-k (+ next-k arrive) at)))
                        (pass!)
                        (if (or (pos? @found) (> k (+ 10 (quot n 4096)))) {:passes k :deleted (pos? @found)}
                          (recur (inc k) (+ next-k arrive)))))
              plain (until 0)
              with-256 (until 256)
              with-4096 (until 4096)
              bound (inc (long (Math/ceil (/ n 4096.0))))
              row {:removals n :state-held-between-passes held :heap-mb-delta-over-5-passes (Math/round (/ (- m1 m0) 1048576.0))
                   :pass-ms (mapv #(Math/round (double %)) times) :bound-passes bound
                   :restored-key-deleted-after plain :with-256-new-per-pass with-256 :with-4096-new-per-pass with-4096}]
          (report :resweep8 row)
          (x/oracle! "resweep8" (and (:deleted plain) (<= (:passes plain) bound)) "the restored key is deleted within the bound" row)
          (x/oracle! "resweep8" (and (:deleted with-256) (<= (:passes with-256) (inc bound))) "256 new removals a pass do not delay it" row)
          (x/oracle! "resweep8" (and (:deleted with-4096) (<= (:passes with-4096) (+ 2 bound))) "4,096 new removals a pass do not delay it" row)
          (x/oracle! "resweep8" (< (count held) 200) "the re-sweep holds two positions between passes" row))))))

(defn main []
  (x/install-hooks!)
  (#'era4-races/install-declare-hooks!)
  (envelope/start!)
  (println "ERA8_BOUNDARY" (pr-str {:commit-boundary-allowed @(requiring-resolve 'triplex.gateway.removal-commit/may-turn-on)}))
  (let [guarded (fn [lbl f] (try (f) (catch Throwable t (x/oracle! lbl false "the case runs to its end" (str t)))))]
    (case (System/getenv "ERA5_PHASE")
      "cases8" (guarded "boundary8" boundary8)
      "resweep8" (guarded "resweep8" resweep8)))
  (println "ERA5_VIOLATIONS" (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 8 @x/violations)] (println "ERA5_VIOLATION" (pr-str v)))
  (println "ERA5_SUMMARY" (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
