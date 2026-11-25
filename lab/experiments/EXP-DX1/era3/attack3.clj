(ns era3-attack3
  "[DX-ERA3, third review] Attacks on the reordered removal (DX-ERA2 at 3edb9f5d9, gateway code e921f3ef1): a removal
  completed by a gateway that did not start it while the starter's native steps are still in flight, a lost lock, a
  slow commit, the lower-of rule, a removal log restored with a removal pending in it, deliveries, an earlier build's
  late write, the size of a removal's commit, and a fuzzer whose schedules add a second, active gateway. Loaded after
  wfix1/regression.clj, era2/gate.clj, era3/attack.clj and era3/attack2.clj; era3/run.sh runs it with ERA3_MAIN=3.
  Review: era3/REVIEW-3.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.scope :as scope]
            [triplex.gateway.removal-commit :as rc]
            [clojure.walk :as walk]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a] [era3-attack2 :as b])
  (:import [java.util Random]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def sealed-fuzz? (= "1" (System/getenv "ERA3_SEALED")))

;; ---- hooks -----------------------------------------------------------------------------------------------------
;; *slow*: the named native step of this request is held back exactly as an expired wait leaves it: the request
;; answers 503 and the transaction is kept, to be submitted later at a chosen point (it may then land or be refused).
;; *delay*: the commit is submitted on another thread after :ms, the request waits rc/wait-ms for it (so it answers 503
;; and the commit lands later), and :during runs while it is in flight (a save of the subject).
;; *no-lock*: this thread's removal runs without the database's and accounts' locks (a gateway that lost them).
;; *pause-make*: this thread pauses at its first selection (after its cut was read) until :go is delivered.
(def ^:dynamic *slow* nil)
(def ^:dynamic *delay* nil)
(def ^:dynamic *no-lock* false)
(def ^:dynamic *pause-make* nil)
(defn classify [ops]
  (cond (some #(and (vector? %) (= :triplex.removal/commit-v1 (first %))) ops) :commit
        (some #(and (vector? %) (= :db/add (first %)) (= :triplex.scope/removal-held (nth % 2 nil))) ops) :declare
        (some #(and (vector? %) (= :db/cas (first %)) (= :triplex.scope/removal-seq (nth % 2 nil))) ops) :hold
        :else :other))
(def late-commits (atom []))
(defn install-hooks3! []
  (b/install-hooks2!)
  (let [tx rc/transact! guard privacy/guard make erase/make-entry]
    (alter-var-root #'rc/transact!
      (fn [_] (fn [conn ops]
                (let [slow *slow* dl *delay* kind (classify ops)]
                  (cond
                    (and slow (= (:step slow) kind) (nil? @(:box slow)))
                    (do (reset! (:box slow) (vec ops)) (privacy/unavailable!))
                    (and dl (= :commit kind))
                    (let [f (future (when-let [during (:during dl)] (during)) (Thread/sleep (long (:ms dl)))
                                    (try @(d/transact-async conn (vec ops)) (catch Throwable e e)))]
                      (swap! late-commits conj f)
                      (let [r (deref f rc/wait-ms ::timeout)]
                        (cond (= ::timeout r) (privacy/unavailable!)
                              (instance? Throwable r) (throw (ex-info "A native step of the removal was refused; it stays pending"
                                                                      {:status 503 :code "ErasureFrontierUnavailable" :removal-step-refused true} r))
                              :else r)))
                    :else (tx conn ops))))))
    (alter-var-root #'privacy/guard (fn [_] (fn [name work] (if *no-lock* (work) (guard name work)))))
    (alter-var-root #'erase/make-entry
      (fn [_] (fn [& args]
                (when-let [p *pause-make*]
                  (when (compare-and-set! (:fired p) false true)
                    (deliver (:entered p) true) (deref (:go p) 20000 nil)))
                (apply make args))))))

(defn frame-copy [command doc value ticket accounts] (a/copy-frame command doc value ticket accounts))
;; A write's transaction is one call of the installed writer ([:triplex/commit ...]) whose arguments hold its operations:
;; find or remove compare-and-sets on given attributes anywhere inside it.
(def removal-attrs #{:triplex.scope/removal-intent :triplex.scope/removal-seq})
(defn cas-on? [attrs x] (and (vector? x) (not (map-entry? x)) (= :db/cas (first x)) (contains? attrs (nth x 2 nil))))
(defn find-cas [attrs data]
  (let [found (atom [])] (walk/postwalk (fn [x] (when (cas-on? attrs x) (swap! found conj (vec (take 5 x)))) x) data) @found))
(defn strip-cas [attrs data]
  (walk/postwalk (fn [x] (cond (and (vector? x) (not (map-entry? x))) (into [] (remove #(cas-on? attrs %)) x)
                               (and (seq? x) (not (map-entry? x))) (apply list (remove #(cas-on? attrs %) x))
                               :else x))
                 data))
(defn read-has? [name entity value] (str/includes? (a/read-text name entity) value))
(defn native [conn attr] (scope/value (d/db conn) (scope/entity (d/db conn)) attr))
(defn erasure-records [conn command]
  (count (d/q '[:find ?t :in $ ?op :where [?t :triplex.tx/operation-id ?op] [?t :triplex.tx/erasure-record _]]
              (d/db conn) (a/operation-id command))))
(defn every-route-text [name conn entity pin session]
  (str (a/read-text name entity) (a/read-text name entity {"history" true})
       (a/read-text name entity {"basis" {"recordedPosition" pin "validAt" 1.0e12}})
       (g/text (:body (offers/route name "v2" "reach" {"root" entity "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                       "session" session "erasureRefs" true})))))
(defn log-entry [name conn command] (get-in (privacy/cut name (d/db conn) true) [:commands command]))
(defn ack-fields [body] (select-keys body ["seq" "position" "txId" "t" "erasedAt" "identities"]))

;; ---- K2: a gateway that lost its lock records an intent after another removal at its sequence was published -------
(defn k2 []
  (g/fresh-scope false
    (fn [name conn]
      (let [lbl "K2 lost lock: an intent recorded at a sequence another removal has published"
            seeds (g/seed! name [g/a1 g/b1 "acct/c/one"])
            p {:fired (atom false) :entered (promise) :go (promise)}
            late (future (binding [*no-lock* true *pause-make* p] (a/remove-attr! name "k2-b" g/b1)))
            _ (deref (:entered p) 10000 nil)
            first-removal (a/remove-attr! name "k2-a" g/a1)
            _ (deliver (:go p) true)
            late-reply @late
            left {:pending (some-> (privacy/pending name) (select-keys ["commandId" "seq"])) :published (g/seq-now name conn)}
            other (offers/outcome (a/remove-attr! name "k2-c" "acct/c/one"))
            resend (offers/outcome (a/remove-attr! name "k2-b" g/b1))
            frame (offers/outcome (offers/send name (frame-copy "k2-f" "notice:v1:k2" "x" (g/seq-now name conn) nil)))
            again (offers/outcome (a/remove-attr! name "k2-c" "acct/c/one"))
            detail {:first-removal (offers/outcome first-removal) :lock-lost-removal (offers/outcome late-reply)
                    :left left :another-removal other :lost-one-resent resend :frame-no-accounts frame
                    :another-removal-again again :pending-after (some-> (privacy/pending name) (get "commandId"))}]
        (observe! lbl :detail detail)
        (bump! :k2 (:pending left) other resend frame)
        (oracle! lbl (= [200 nil] again) "after a lost lock, the database still takes removals" detail)))))

;; ---- K3: the starter alive and holding the lock while a refused write asks its gateway to complete it ----------
(defn k3 []
  (g/fresh-scope false
    (fn [name conn]
      (let [lbl "K3 a completion while the starter still holds the lock"
            seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
            fired (atom false) entered (promise) go (promise)
            _ (reset! a/plan {:hook (fn [pt] (when (and (= pt :in-commit) (compare-and-set! fired false true))
                                              (deliver entered true) (deref go 20000 nil)))})
            starter (future (a/remove-attr! name "k3-rm" g/a1))
            _ (deref entered 10000 nil)
            t0 (System/nanoTime)
            refused (future (offers/send name (frame-copy "k3-f" "notice:v1:k3" "x" (g/seq-now name conn) nil)))
            _ (Thread/sleep 1000)
            refused-done-early (realized? refused)
            _ (deliver go true)
            s-reply @starter r-reply @refused
            ms (/ (- (System/nanoTime) t0) 1.0e6)
            _ (reset! a/plan nil)
            detail {:starter (offers/outcome s-reply) :starter-position (get-in s-reply [:body "position"])
                    :refused-write (offers/outcome r-reply) :refused-write-answered-before-the-starter-finished refused-done-early
                    :refused-write-ms ms :published (g/seq-now name conn) :records (erasure-records conn "k3-rm")
                    :pending (some? (privacy/pending name)) :value-readable (read-has? name g/a1 value)}]
        (observe! lbl :detail detail)
        (oracle! lbl (and (= [200 nil] (offers/outcome s-reply)) (= 1 (:records detail)) (not (:pending detail)) (not (:value-readable detail)))
                 "one removal, published once, value gone" detail)
        (a/counters-agree! name conn lbl)))))

;; ---- K4: a commit slower than the wait, with the subject saved while it is in flight --------------------------
(defn k4 [label saves? contacts]
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "K4 slow commit " label)
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              prior (atom (:id (seeds g/a1))) n (atom 0)
              save! (fn [] (let [id (str "k4-s-" (swap! n inc))
                                 r (offers/send name (g/frame id g/a1 (g/secret g/a1 id) @prior (g/head conn)))]
                             (when (= 200 (:status r)) (reset! prior id))
                             (bump! :k4 label :save-during (offers/outcome r))))
              wait rc/wait-ms
              _ (alter-var-root #'rc/wait-ms (constantly 300))
              outcomes (atom [])
              _ (reset! late-commits [])
              published
              (try
                (loop [k 0]
                  (if (or (>= k contacts) (= 1 (g/seq-now name conn))) k
                    (let [reply (binding [*delay* {:ms 600 :during (when saves? save!)}]
                                  (if (even? k) (a/remove-attr! name "k4-rm" g/a1)
                                    (offers/send name (frame-copy (str "k4-f" k) (str "notice:v1:k4-" k) "x" (g/seq-now name conn) nil))))]
                      (swap! outcomes conj (offers/outcome reply))
                      (doseq [f @late-commits] (deref f 5000 nil))
                      (recur (inc k)))))
                (finally (alter-var-root #'rc/wait-ms (constantly wait))))
              lates (mapv #(let [r (deref % 100 :pending)]
                             (cond (= :pending r) :pending
                                   (instance? Throwable r) (if (re-find #"MOVED" (str r (some-> ^Throwable r .getCause))) :refused-subject-moved :refused)
                                   :else :committed))
                          @late-commits)
              detail {:contacts (count @outcomes) :replies (frequencies @outcomes)
                      :late-commit-outcomes (frequencies lates) :published (g/seq-now name conn)
                      :pending (some? (privacy/pending name)) :saves-of-the-subject @n}]
          (observe! lbl :detail detail)
          (bump! :k4 label (if (= 1 (g/seq-now name conn)) :completed :never-completed))
          ;; the bound (page 15.3): a stopped removal completes at the first contact plus one completion
          (oracle! lbl (= 1 (g/seq-now name conn)) (str "the removal completes within " contacts " contacts") detail))))))

;; ---- K5: the lower-of rule after an earlier build's removal -----------------------------------------------------
(defn k5 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "K5 lower-of: a ticket read while the declared sequence was behind the committed one"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              old (offers/outcome (@#'b/earlier-version #(a/remove-attr! name "k5-old" g/b1)))
              t (g/seq-now name conn)
              at-read {:published t :declared (native conn :triplex.scope/removal-intent) :committed (native conn :triplex.scope/removal-seq)}
              ops-x (b/capture! name (frame-copy "k5-x" "notice:v1:k5-x" value t nil))
              ops-y (b/capture! name (frame-copy "k5-y" "notice:v1:k5-y" value t nil))
              intent-cas (find-cas removal-attrs ops-x)
              ;; y: submitted after the declaration only (the removal stopped there); x: after the acknowledgement
              _ (reset! a/plan {:stop :after-declare :stops-left 1})
              stopped (a/remove-attr! name "k5-new" g/a1)
              _ (reset! a/plan nil)
              y-out (b/real-transact conn ops-y)
              done (a/remove-attr! name "k5-new" g/a1)
              x-out (b/real-transact conn ops-x)
              detail {:earlier-build-removal old :at-ticket-read at-read :ticket-intent-cas intent-cas
                      :stopped (offers/outcome stopped) :late-after-declaration y-out :removal (offers/outcome done)
                      :late-after-acknowledgement x-out
                      :copies-readable [(read-has? name "notice:v1:k5-x" value) (read-has? name "notice:v1:k5-y" value)]}]
          (observe! lbl :detail detail)
          (oracle! lbl (not-any? #{:committed} [x-out y-out]) "an old ticket never passes a declared or committed removal" detail))))))

;; ---- K6: the removal log restored to a copy taken while a removal was pending in it ------------------------------
(defn k6 [sealed? behind]
  (g/fresh-scope sealed?
    (fn [name conn]
      (let [lbl (str "K6 log restored with a removal pending in it, " behind " behind" (if sealed? ", sealed" ""))
            seeds (g/seed! name [g/a1 g/b1 "acct/c/one"]) value (:value (seeds g/a1))
            dir (.getParent (privacy/path name "head.json"))
            snap (java.nio.file.Paths/get "/tmp" (into-array String [(str "era3-k6-" (java.util.UUID/randomUUID))]))
            _ (reset! a/plan {:stop (if per-account? :after-declare :after-native) :stops-left 1})
            stopped (a/remove-attr! name "k6-r1" g/a1)
            _ (reset! a/plan nil)
            _ (@#'b/copy-dir! dir snap)
            r1 (a/remove-attr! name "k6-r1" g/a1)
            r2 (when (= behind 2) (a/remove-attr! name "k6-r2" g/b1))
            readable-before (read-has? name g/a1 value)
            _ (@#'b/copy-dir! snap dir) _ (reset! privacy/cache {})
            pin (g/head conn)
            read-a1 (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/a1]}))
            text-a1 (a/read-text name g/a1)
            readable-after-restore (str/includes? (str text-a1 (a/read-text name g/a1 {"history" true})) value)
            save-c (offers/outcome (offers/send name (g/frame "k6-sc" "acct/c/one" (g/secret "acct/c/one" "k6") (:id (seeds "acct/c/one")) (g/head conn))))
            frame (offers/outcome (offers/send name (frame-copy "k6-f" "notice:v1:k6" "x" (g/seq-now name conn) nil)))
            readable-after-contact (read-has? name g/a1 value)
            detail {:stopped (offers/outcome stopped) :first-acknowledgement (offers/outcome r1) :second (some-> r2 offers/outcome)
                    :value-readable-before-the-restore readable-before
                    :after-restore {:read-a1 read-a1 :value-readable readable-after-restore :save-of-another-account save-c}
                    :frame-no-accounts frame :value-readable-after-that readable-after-contact
                    :published-after (try (g/seq-now name conn) (catch Exception e (str "refused " (:code (ex-data e)))))}]
        (observe! lbl :detail detail)
        (oracle! lbl (not readable-after-restore)
                 "a value acknowledged as removed is not answered after the removal log is restored behind the data" detail)))))

;; ---- K7: deliveries from a source whose removal is pending -------------------------------------------------------
(defn k7 []
  (when per-account?
    (g/fresh-scope false
      (fn [recipient rconn]
        (g/fresh-scope false
          (fn [source sconn]
            (let [lbl "K7 deliveries from a source whose removal is pending"
                  _ (g/seed! source [g/a1]) _ (g/seed! recipient [g/b1])
                  _ (reset! a/plan {:stop :after-declare :stops-left 1})
                  stopped (a/remove-attr! source "k7-rm" g/a1)
                  _ (reset! a/plan nil)
                  deliver (fn [k] (offers/outcome (offers/send recipient (assoc (g/save-frame (str "k7-d" k) (str "notice:v1:k7-" k) ":notice/body" "delivered" nil nil)
                                                                                "erasureSourceDatabase" source "erasureSeq" (g/seq-now source sconn)))))
                  ds (mapv deliver (range 5))
                  still (some? (privacy/pending source))
                  own (offers/outcome (offers/send source (frame-copy "k7-own" "notice:v1:k7-own" "x" (g/seq-now source sconn) nil)))
                  after (deliver 9)
                  detail {:stopped (offers/outcome stopped) :deliveries ds :source-removal-still-pending-after-them still
                          :a-write-in-the-source own :source-published (g/seq-now source sconn) :delivery-after-that after}]
              (observe! lbl :detail detail)
              (oracle! lbl (not still) "a refused delivery starts the source removal's completion (page 15.3)" detail))))))))

;; ---- K8: a derived write in one database that names another database as its source -------------------------------
(defn k8 []
  (g/fresh-scope false
    (fn [name conn]
      (g/fresh-scope false
        (fn [other oconn]
          (let [lbl "K8 a derived write naming another database as its source, landing late"
                seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1)) _ (g/seed! other [g/b1])
                input (fn [id] (assoc (frame-copy id (str "notice:v1:" id) value (g/seq-now other oconn) nil)
                                      "erasureSourceDatabase" other "erasureSeq" (g/seq-now other oconn)))
                late (b/capture! name (input "k8-late"))
                removed (a/remove-attr! name "k8-rm" g/a1)
                late-out (b/real-transact conn late)
                live (offers/outcome (offers/send name (input "k8-live")))
                detail {:removal (offers/outcome removed) :removal-position (get-in removed [:body "position"])
                        :late-transaction late-out :late-position (a/position-of conn "k8-late")
                        :late-copy-readable (read-has? name "notice:v1:k8-late" value)
                        :live-after-acknowledgement live :live-copy-readable (read-has? name "notice:v1:k8-live" value)}]
            (observe! lbl :detail detail)
            (bump! :k8 late-out live)
            (oracle! lbl (not (:late-copy-readable detail))
                     "a derived write prepared before a removal never lands after it, whatever source it names" detail)))))))

;; ---- K9: the delivery window (a delivery prepared before a removal in its source, landing after) ------------------
(defn k9 []
  (g/fresh-scope false
    (fn [recipient rconn]
      (g/fresh-scope false
        (fn [source sconn]
          (let [lbl "K9 a delivery prepared before a removal in its source, landing after its acknowledgement"
                seeds (g/seed! source [g/a1]) value (:value (seeds g/a1)) _ (g/seed! recipient [g/b1])
                late (b/capture! recipient (assoc (frame-copy "k9-d" "notice:v1:k9" value (g/seq-now source sconn) nil)
                                                  "erasureSourceDatabase" source "erasureSeq" (g/seq-now source sconn)))
                removed (a/remove-attr! source "k9-rm" g/a1)
                out (b/real-transact rconn late)
                detail {:source-removal (offers/outcome removed) :late-delivery out
                        :copy-readable-in-the-recipient (read-has? recipient "notice:v1:k9" value)}]
            (observe! lbl :detail detail)
            (bump! :k9 out (:copy-readable-in-the-recipient detail))))))))

;; ---- K10: an earlier build's late derived write during and after this version's removal --------------------------
(defn k10 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "K10 an earlier build's late derived write (its transaction without the sequence checks)"
              seeds (g/seed! name [g/a1]) value (:value (seeds g/a1)) t0 (g/seq-now name conn)
              strip (fn [ops] (strip-cas removal-attrs ops))
              raw (b/capture! name (frame-copy "k10-any" "notice:v1:k10-any" value t0 nil))
              _ (observe! lbl :captured-cas-before (find-cas removal-attrs raw))
              any (strip raw)
              _ (observe! lbl :captured-cas-after (find-cas removal-attrs any))
              acct (strip (b/capture! name (frame-copy "k10-a" "notice:v1:k10-a" value t0 ["a"])))
              removed (a/remove-attr! name "k10-rm" g/a1)
              out [(b/real-transact conn any) (b/real-transact conn acct)]
              detail {:removal (offers/outcome removed) :late-no-accounts (first out) :late-naming-a (second out)
                      :copies-readable [(read-has? name "notice:v1:k10-any" value) (read-has? name "notice:v1:k10-a" value)]}]
          (observe! lbl :detail detail)
          (bump! :k10 out))))))

;; ---- K12: how long a removal's commit takes against the number of identities it removes (diagnostic) -------------
(defn k12 [subjects versions]
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [owners (vec (for [k (range subjects)] (str "acct/m/s" k)))
              _ (doseq [o owners]
                  (loop [k 0 prior nil]
                    (when (< k versions)
                      (let [id (str "k12-" o "-" k)
                            r (offers/send name (g/frame id o (g/secret o (str k)) prior (g/head conn)))]
                        (recur (inc k) (if (= 200 (:status r)) id prior))))))
              t (atom {})
              _ (reset! a/plan {:hook (fn [p] (swap! t assoc p (System/nanoTime)))})
              t0 (System/nanoTime)
              r (a/erase! name "k12-rm" (mapv (fn [o] {"entityId" o "attribute" ":v"}) owners))
              total (/ (- (System/nanoTime) t0) 1.0e6)
              _ (reset! a/plan nil)
              commit-ms (when (and (@t :in-commit) (@t :after-native)) (/ (- (@t :after-native) (@t :in-commit)) 1.0e6))
              detail {:subjects subjects :versions versions :removal (offers/outcome r)
                      :identities (count (get-in r [:body "identities"])) :commit-ms commit-ms :request-ms total}]
          (observe! "K12 commit size" :detail detail))))))

;; ---- F3: the fuzzer with a second, active gateway -----------------------------------------------------------------
;; The starter's removal is held back at one native step (as an expired wait leaves it: the request answers 503 and the
;; transaction is still in flight), or stopped at a step; data may change; then a second gateway (a fresh cut cache)
;; completes it (a resend, a refused derived write, or a removal of another command), possibly stopping itself; the
;; starter's held-back transaction is submitted at a chosen point of that completion.
(def slows [:none :declare :hold :commit :commit])
(def plain-stops [:after-intent :after-declare :before-native :after-native :at-publish])
(def lands [:never :before :at-declare :at-commit :after-commit :after-publish])
(def changes [:none :none :save-s :save-child :save-other])
(def completers [:resend :derived-any :derived-acct :other-removal])
(def completer-stops [:none :none :none :after-declare :before-native :after-native :at-publish])

(defn schedule3 [^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        s {:slow (pick slows) :stop (pick plain-stops) :land (pick lands) :change (pick changes)
           :completer (pick completers) :fresh-cache (zero? (.nextInt r 2)) :cstop (pick completer-stops)
           :narrow (if (zero? (.nextInt r 3)) 1 2)}]
    ;; a sealed save holds the database's lock on the file key store, so the subject guard (forced by a save inside the
    ;; starter's request) is not scheduled sealed
    (if (and sealed-fuzz? (= :hold (:slow s))) (assoc s :slow :commit) s)))

(defn land-hook-extra [p] nil)
(defn run-schedule3! [name conn run i sch]
  (let [{:keys [slow stop land change completer fresh-cache cstop narrow]} sch
        acct (str "h" (mod i 7)) tag (str run "-" i)
        s (str "acct/" acct "/s" i) child (str s "-new") s2 (str "acct/" acct "/t" i) z (str "acct/y" (mod i 3) "/w" i)
        v0 (g/secret s (str "seed" tag))
        _ (doseq [[id e v] [[(str "fs-" tag) s v0] [(str "ft-" tag) s2 (g/secret s2 "seed")] [(str "fz-" tag) z (g/secret z "seed")]]]
            (let [r (offers/send name (g/frame id e v nil nil))] (when-not (= 200 (:status r)) (bump! :seed-refused (offers/outcome r)))))
        pin (g/head conn) session (str "f3-" tag)
        _ (offers/route name "v2" "reach" {"root" s "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" session "erasureRefs" true})
        cmd (str "fx-" tag) selectors [{"entityId" s "attribute" ":v"} {"entityId" child "attribute" ":v"}]
        s0 (inc (long (g/seq-now name conn)))
        _ (alter-var-root #'rc/narrow-tries (constantly (if (= slow :hold) 1 narrow)))
        box (atom nil)
        ;; the starter
        forced-move (atom false)
        _ (reset! a/plan (if (= slow :none)
                           {:stop (when-not (= stop :after-intent) stop) :stops-left 1
                            :hook (fn [p] (when (and (= stop :after-intent) (= p :after-intent) (compare-and-set! forced-move false true))
                                            (throw (ex-info "ERA3 gateway stopped after-intent" {}))))}
                           {:hook (fn [p] (when (and (= slow :hold) (= p :in-commit) (compare-and-set! forced-move false true))
                                            ;; the subject changes between the selection and the commit: the guard follows
                                            (offers/send name (g/frame (str "fm-" tag) s (g/secret s "move") (str "fs-" tag) (g/head conn)))))}))
        first-reply (if (= slow :none) (a/erase! name cmd selectors) (binding [*slow* {:step slow :box box}] (a/erase! name cmd selectors)))
        _ (reset! a/plan nil)
        held @box
        _ (bump! :first slow (if (= slow :none) stop :slow) (offers/outcome first-reply) (if held :held :not-reached))
        ;; data changes while the removal is pending
        v2 (g/secret s (str "change" tag)) cid (str "fc-" tag)
        change-reply (case change
                       :none nil
                       :save-s (offers/send name (g/frame cid s v2 (if (and (= slow :hold) @forced-move) (str "fm-" tag) (str "fs-" tag)) (g/head conn)))
                       :save-child (offers/send name (g/frame cid child v2 nil nil))
                       :save-other (offers/send name (g/frame cid s2 v2 (str "ft-" tag) (g/head conn))))
        _ (when change-reply (bump! :change change (offers/outcome change-reply)))
        ;; the starter's held-back transaction lands at `land` (relative to the second gateway's completion)
        late-out (atom (if held :not-submitted :none))
        committed-at-land (atom nil)
        land! (fn [] (when (and held (= :not-submitted @late-out))
                       (reset! committed-at-land (>= (long (or (native conn :triplex.scope/removal-seq) 0)) s0))
                       (reset! late-out (b/real-transact conn held))))
        _ (when (= land :before) (land!))
        ;; [fourth review] a seam for era3/attack4.clj (the completer's gateway, a log copy, a rebuild); a no-op here
        _ (land-hook-extra :completer-start)
        _ (when fresh-cache (reset! privacy/cache {}))
        _ (reset! a/plan {:stop (when-not (= cstop :none) cstop) :stops-left 1
                          :hook (fn [p] (case [land p]
                                          [:at-declare :after-declare] (land!)
                                          [:at-commit :in-commit] (land!)
                                          [:after-commit :after-native] (land!)
                                          nil))})
        did (str "fd-" tag)
        completer-reply (case completer
                          :resend (a/erase! name cmd selectors)
                          :derived-any (offers/send name (frame-copy did (str "notice:v1:fd-" tag) "x" (g/seq-now name conn) nil))
                          :derived-acct (offers/send name (frame-copy did (str "notice:v1:fd-" tag) "x" (g/seq-now name conn) [acct]))
                          :other-removal (a/erase! name (str "fo-" tag) [{"entityId" z "attribute" ":v"}]))
        _ (reset! a/plan nil)
        _ (bump! :completer completer cstop (offers/outcome completer-reply))
        _ (when (= land :after-publish) (land!))
        ;; then the starter's client resends until it gets its answer (a derived write in between, as traffic would)
        final (loop [k 0]
                (let [r (a/erase! name cmd selectors)]
                  (if (or (= 200 (:status r)) (>= k 3)) r
                    (do (offers/send name (frame-copy (str "fe-" tag "-" k) (str "notice:v1:fe-" tag "-" k) "x" (g/seq-now name conn) nil))
                        (recur (inc k))))))
        _ (land!)
        again (a/erase! name cmd selectors)
        ok (= 200 (:status final))
        p-r (get-in final [:body "position"])
        ids (set (map #(get % "assertionId") (get-in final [:body "identities"])))
        p-change (when change-reply (a/position-of conn cid))
        label (str "F3 " (pr-str (dissoc sch :narrow)))
        texts (str (every-route-text name conn s pin session) (every-route-text name conn child pin (str session "-c")))]
    (bump! :late slow land @late-out (if @committed-at-land :after-the-commit :before-the-commit))
    (oracle! label ok "the removal completes" {:first (offers/outcome first-reply) :completer (offers/outcome completer-reply) :final (offers/outcome final)})
    (when ok
      (oracle! label (= (ack-fields (:body final)) (ack-fields (:body again))) "two acknowledgements of one removal are identical" {})
      (when (= completer :resend) (when (= 200 (:status completer-reply))
        (oracle! label (= (ack-fields (:body final)) (ack-fields (:body completer-reply))) "the completer's acknowledgement equals the client's" {})))
      (let [entry (log-entry name conn cmd)]
        (oracle! label (and entry (= (get entry "position") p-r) (= (set (map #(get % "assertionId") (get entry "identities"))) ids))
                 "the acknowledgement is the published entry" {:entry-position (get entry "position") :ack p-r}))
      (oracle! label (= 1 (erasure-records conn cmd)) "one native removal for the command" {:records (erasure-records conn cmd)})
      (oracle! label (contains? ids (str "fs-" tag)) "the seed value was removed" ids)
      (when (and (#{:save-s :save-child} change) p-change)
        (oracle! label (if (< p-change p-r) (contains? ids cid) true) "a value committed before the removal's position was removed with it" {:p p-change :removal p-r}))
      (when (and @forced-move (a/position-of conn (str "fm-" tag)))
        (oracle! label (contains? ids (str "fm-" tag)) "the value that forced the guard was removed with it" {}))
      (let [gone (cond-> [v0] (and (#{:save-s :save-child} change) p-change (< p-change p-r)) (conj v2))]
        (oracle! label (not-any? #(str/includes? texts %) gone) "no read route answers a removed value" {:gone (count gone)}))
      (when (#{:declare :hold} slow)
        (when @committed-at-land
          (oracle! label (not= :committed @late-out) "the starter's late declaration or guard never lands after the removal's commit" {:late @late-out})))
      (when (and (= slow :commit) (= :committed @late-out))
        (oracle! label (= (a/position-of conn cmd) p-r) "a late commit that landed is the published removal" {})))
    (oracle! label (nil? (privacy/pending name)) "nothing is pending once the removal answered" {})
    (let [live-any (offers/outcome (offers/send name (frame-copy (str "fv-" tag) (str "notice:v1:fv-" tag) "live" (g/seq-now name conn) nil)))
          live-acct (offers/outcome (offers/send name (frame-copy (str "fw-" tag) (str "notice:v1:fw-" tag) "live" (g/seq-now name conn) [acct])))]
      (bump! :live live-any live-acct)
      (oracle! label (= [[200 nil] [200 nil]] [live-any live-acct]) "after it, fresh derived writes commit" [live-any live-acct]))
    (bump! :schedules)
    (doseq [[k v] sch] (bump! :dim k v))
    {:gone (if-not ok {} (cond-> {v0 #{s}} (and (#{:save-s :save-child} change) p-change (< p-change p-r)) (assoc v2 #{s child})))}))

(defn fuzz3 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [b (range (quot (+ n block -1) block))]
      (g/fresh-scope sealed-fuzz?
        (fn [name conn]
          (let [results (vec (for [i (range (* b block) (min n (* (inc b) block)))]
                               (let [sch (schedule3 r)]
                                 (try (run-schedule3! name conn run i sch)
                                      (catch Throwable e
                                        (reset! a/plan nil)
                                        (oracle! (str "F3 " (pr-str sch)) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))]
            (a/block-checks! name conn (str "F3 block " b) (or gone {}) {} #{})
            (b/intent-agrees! name conn (str "F3 block " b))
            (println "ERA3_PROGRESS" mode (pr-str {:block b :schedules (get @tally [:schedules]) :violations (count @a/violations)}))))))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (install-hooks3!)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "k2 k3 k4 k5 k6 k7 k8 k9 k10 fuzz3") #" "))]
    (when (phases "k2") (guarded "K2" k2))
    (when (phases "k3") (guarded "K3" k3))
    (when (phases "k4")
      (guarded "K4a" #(k4 "with saves in flight" true 10))
      (guarded "K4b" #(k4 "without saves" false 10)))
    (when (phases "k5") (guarded "K5" k5))
    (when (phases "k6") (doseq [sealed? [false true] behind [1 2]] (guarded "K6" #(k6 sealed? behind))))
    (when (phases "k7") (guarded "K7" k7))
    (when (phases "k8") (guarded "K8" k8))
    (when (phases "k9") (guarded "K9" k9))
    (when (phases "k10") (guarded "K10" k10))
    (when (phases "k12") (doseq [[n v] [[1 250] [1 1000] [1 4000] [20 200]]] (guarded "K12" #(k12 n v))))
    (when (phases "fuzz3")
      (fuzz3 (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
             (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1")))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY3" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [f failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit 0)))
