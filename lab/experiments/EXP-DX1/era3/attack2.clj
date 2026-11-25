(ns era3-attack2
  "[DX-ERA3, second review] Attacks on the fixed removal (DX-ERA2 at 27733d980): the declaration step, late
  transactions, mixed versions, cross-database delivery, misnamed tickets, derived copies made before a removal, and a
  fuzzer whose schedules include the declaration. Loaded after wfix1/regression.clj, era2/gate.clj and
  era3/attack.clj (whose hooks and helpers it reuses); era3/run.sh runs it with ERA3_MAIN=2. Review: era3/REVIEW-2.md."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.erase :as erase] [triplex.gateway.privacy :as privacy]
            [triplex.gateway.removal-scope :as rs] [triplex.gateway.storage :as storage]
            [triplex.gateway.scope :as scope] [triplex.gateway.main :as main] [triplex.gateway.removal-commit :as rc]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as a])
  (:import [java.util Random]))

(def mode a/mode)
(def per-account? a/per-account?)
(defn oracle! [& args] (apply a/oracle! args))
(defn observe! [& args] (apply a/observe! args))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))

;; ---- extra hooks: the declaration step, and capturing a write's native transaction to submit it later ------------
(def ^:dynamic *capture* nil)
(defn install-hooks2! []
  (a/install-hooks!)
  (let [declare rc/declare! submit-async d/transact-async]
    (alter-var-root #'rc/declare!
      (fn [_] (fn [& args] (let [r (apply declare args)] (@#'a/point! :after-declare) (@#'a/stop! :after-declare) r))))
    ;; a write sent with *capture* bound to an atom: its first native transaction is recorded instead of submitted
    ;; (its request then fails, as a request whose reply was lost), so a test can submit it later, exactly as prepared
    (alter-var-root #'d/transact-async
      (fn [_] (fn [conn data & opts]
                (if (and *capture* (nil? @*capture*))
                  (do (reset! *capture* data)
                      (future (throw (ex-info "ERA3 captured: the transaction was held back" {}))))
                  (apply submit-async conn data opts)))))))
(defn real-transact [conn data]
  ;; the original submission path (the hook passes through when nothing is being captured)
  (try @(d/transact-async conn data) :committed
       (catch Throwable e (let [m (str (.getMessage e) " " (some-> e .getCause .getMessage))]
                            (or (re-find #"TRIPLEX_[A-Z_]+[ a-z-]*|cas-failed|Compare failed|not-an-entity|Unable to resolve" m) m)))))
(defn capture! [name input]
  (let [box (atom nil)]
    (binding [*capture* box] (offers/send name input))
    @box))

(defn frame-copy [command doc value ticket accounts]
  (a/copy-frame command doc value ticket accounts))
(defn erase! [name command selectors] (a/erase! name command selectors))
(defn read-has? [name entity value] (str/includes? (a/read-text name entity) value))
(defn native [conn attr] (scope/value (d/db conn) (scope/entity (d/db conn)) attr))

;; ---- E1: an orphan declaration ------------------------------------------------------------------------------
(defn e1
  "A removal stopped right after its declaration (the gateway killed, or the declaration's own wait expired), so it
  holds its accounts and the declared sequence but recorded no intent. What it blocks, for how long, and who clears
  it: `clear` is :resend (the same command), :other (another removal) or :move (back and forward)."
  [clear]
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl (str "E1 orphan declaration, cleared by " (clojure.core/name clear))
              seeds (g/seed! name [g/a1 g/a2 g/b1]) value (:value (seeds g/a1))
              t0 (g/seq-now name conn)
              _ (reset! a/plan {:stop :after-declare :stops-left 1})
              stopped (a/remove-attr! name "e1-rm" g/a1)
              _ (reset! a/plan nil)
              state {:intent (native conn :triplex.scope/removal-intent) :removal-seq (native conn :triplex.scope/removal-seq)
                     :held (native conn :triplex.scope/removal-held) :pending (some? (privacy/pending name))
                     :account-a (rs/native-account-seq (d/db conn) "a")}
              seen (a/frontier name)
              ;; every derived write of the database with a fresh ticket, several times, a few seconds apart
              unnamed (vec (for [k (range 5)]
                             (do (Thread/sleep 400)
                                 (offers/outcome (offers/send name (frame-copy (str "e1-any-" k) (str "notice:v1:e1-any-" k) "x" (g/seq-now name conn) nil))))))
              named-a (offers/outcome (offers/send name (frame-copy "e1-a" "notice:v1:e1-a" "x" (g/seq-now name conn) ["a"])))
              named-b (offers/outcome (offers/send name (frame-copy "e1-b" "notice:v1:e1-b" "x" (g/seq-now name conn) ["b"])))
              save-a2 (offers/outcome (offers/send name (g/frame "e1-s-a2" g/a2 (g/secret g/a2 "s") (:id (seeds g/a2)) (g/head conn))))
              save-a1 (offers/outcome (offers/send name (g/frame "e1-s-a1" g/a1 (g/secret g/a1 "s") (:id (seeds g/a1)) (g/head conn))))
              readable (read-has? name g/a1 value)
              cleared (case clear
                        :resend (offers/outcome (a/remove-attr! name "e1-rm" g/a1))
                        :other (offers/outcome (a/remove-attr! name "e1-other" g/b1))
                        :move [(offers/outcome (offers/route name "v2" "removal-per-account" {"back" true}))
                               (offers/outcome (offers/route name "v2" "removal-per-account" {}))]
                        :restore-route (offers/outcome (offers/route name "v2" "restore-erasure" {})))
              after (offers/outcome (offers/send name (frame-copy "e1-any-after" "notice:v1:e1-any-after" "x" (g/seq-now name conn) nil)))
              after-a (offers/outcome (offers/send name (frame-copy "e1-a-after" "notice:v1:e1-a-after" "x" (g/seq-now name conn) ["a"])))
              detail {:stopped (offers/outcome stopped) :native-after-stop state
                      :frontier (select-keys seen ["seq" "perAccount" "unscopedSeq"]) :pending-visible (some? (privacy/pending name))
                      :unnamed-frames-while-orphaned (frequencies unnamed) :frame-naming-a named-a :frame-naming-b named-b
                      :save-other-subject save-a2 :save-of-the-subject save-a1 :value-readable readable
                      :cleared-by clear :clear-outcome cleared :unnamed-frame-after after :frame-a-after after-a
                      :intent-after (native conn :triplex.scope/removal-intent) :removal-seq-after (native conn :triplex.scope/removal-seq)}]
          (observe! lbl :detail detail)
          (oracle! lbl (every? #(= [200 nil] %) unnamed)
                   "a stopped removal that recorded no intent does not refuse every unnamed derived write of the database" detail)
          (oracle! lbl (= [200 nil] after) "after the clearing step, an unnamed derived write commits" detail)
          (a/counters-agree! name conn lbl))))))

(defn e1-bucket
  "A removal whose selector reaches an account it did not declare (its buckets computed from a lagging peer, here
  forced): it must refuse before recording anything; what its declaration leaves behind."
  []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E1b undeclared account"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              r (with-redefs-fn {#'erase/selector-buckets (fn [_ _] (sorted-set "zz"))} #(a/remove-attr! name "e1b-rm" g/a1))
              left {:intent (native conn :triplex.scope/removal-intent) :held (native conn :triplex.scope/removal-held)
                    :pending (some? (privacy/pending name)) :zz (rs/native-account-seq (d/db conn) "zz")}
              unnamed (offers/outcome (offers/send name (frame-copy "e1b-any" "notice:v1:e1b" "x" (g/seq-now name conn) nil)))
              named-a (offers/outcome (offers/send name (frame-copy "e1b-a" "notice:v1:e1b-a" value (g/seq-now name conn) ["a"])))
              resend (offers/outcome (a/remove-attr! name "e1b-rm" g/a1))
              after (offers/outcome (offers/send name (frame-copy "e1b-any-2" "notice:v1:e1b-2" "x" (g/seq-now name conn) nil)))
              detail {:removal r :left left :unnamed-frame unnamed :frame-naming-a named-a :resent resend :unnamed-after after
                      :a1-readable-after (read-has? name g/a1 value)}]
          (observe! lbl :detail (update detail :removal offers/outcome))
          (oracle! lbl (not= 200 (:status r)) "a removal that reaches an undeclared account refuses" (offers/outcome r))
          (oracle! lbl (= [200 nil] resend) "resent with the right accounts it completes" detail)
          (a/counters-agree! name conn lbl))))))

;; ---- E2: a database whose declared sequence has no value (moved by an earlier build) -----------------------------
(defn e2 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E2 no declared sequence (moved by an earlier build, attribute present)"
              seeds (g/seed! name [g/a1 g/b1])
              head (scope/entity (d/db conn)) v (native conn :triplex.scope/removal-intent)
              _ @(d/transact conn [[:db/retract head :triplex.scope/removal-intent v]])
              unnamed (offers/outcome (offers/send name (frame-copy "e2-any" "notice:v1:e2" "x" (g/seq-now name conn) nil)))
              named (offers/outcome (offers/send name (frame-copy "e2-b" "notice:v1:e2-b" "x" (g/seq-now name conn) ["b"])))
              removal (offers/outcome (a/remove-attr! name "e2-rm" g/a1))
              after (offers/outcome (offers/send name (frame-copy "e2-any-2" "notice:v1:e2-2" "x" (g/seq-now name conn) nil)))
              detail {:unnamed-frame unnamed :frame-naming-b named :removal removal :unnamed-after-the-removal after
                      :intent-after (native conn :triplex.scope/removal-intent)}]
          (observe! lbl :detail detail)
          (oracle! lbl (= [200 nil] removal) "a removal runs on such a database" detail)
          (oracle! lbl (= [200 nil] after) "after it, unnamed derived writes commit" detail))))))

;; ---- E3: a removal by a gateway of an earlier version (no declaration), beside gateways of this version ----------
(defn e3
  "Emulated in-process: the removal runs with the declaration step removed (what 6bc2484f0's path does), stopped after
  its commit, while this version's gateways take derived writes; then resumed, then this version's tickets."
  []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E3 removal by an earlier version (emulated: no declaration)"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1)) t0 (g/seq-now name conn)
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (with-redefs-fn {#'rc/declare! (fn [_ db _ _ _] db)} #(a/remove-attr! name "e3-rm" g/a1))
              _ (reset! a/plan nil)
              w-any (offers/send name (frame-copy "e3-any" "notice:v1:e3" value t0 nil))
              done (with-redefs-fn {#'rc/declare! (fn [_ db _ _ _] db)} #(a/remove-attr! name "e3-rm" g/a1))
              copy (read-has? name "notice:v1:e3" value)
              fresh (offers/outcome (offers/send name (frame-copy "e3-any-2" "notice:v1:e3-2" "x" (g/seq-now name conn) nil)))
              state {:intent (native conn :triplex.scope/removal-intent) :removal-seq (native conn :triplex.scope/removal-seq)}
              this-version (offers/outcome (a/remove-attr! name "e3-rm-2" g/b1))
              fresh2 (offers/outcome (offers/send name (frame-copy "e3-any-3" "notice:v1:e3-3" "x" (g/seq-now name conn) nil)))
              detail {:stopped (offers/outcome stopped) :unnamed-frame-while-pending (offers/outcome w-any) :resumed (offers/outcome done)
                      :copy-readable-after-ack copy :fresh-unnamed-frame-after fresh :native state
                      :removal-by-this-version this-version :fresh-unnamed-frame-after-that fresh2}]
          (observe! lbl :detail detail)
          (oracle! lbl (not copy) "a derived copy older than the removal is not readable after its acknowledgement (mixed versions)" detail)
          (oracle! lbl (= [200 nil] fresh) "after it, a fresh unnamed derived write commits (mixed versions)" detail))))))

;; ---- E4: cross-database delivery into a database guarded per account -----------------------------------------
(defn e4 []
  (g/fresh-scope false
    (fn [recipient rconn]
      (g/fresh-scope false
        (fn [source sconn]
          (let [lbl "E4 cross-database delivery into a recipient guarded per account"
                _ (g/seed! source [g/a1]) _ (g/seed! recipient [g/a1 g/b1 "acct/c/one"])
                ;; the recipient has had two removals; the source none
                r1 (a/remove-attr! recipient "e4-r1" g/b1) r2 (a/remove-attr! recipient "e4-r2" "acct/c/one")
                deliver (fn [k] (offers/outcome (offers/send recipient (assoc (g/save-frame (str "e4-d" k) (str "notice:v1:e4-" k) ":notice/body" "delivered" nil nil)
                                                                              "erasureSourceDatabase" source "erasureSeq" (g/seq-now source sconn)))))
                d1 (deliver 1) d2 (deliver 2)
                detail {:recipient-removals [(offers/outcome r1) (offers/outcome r2)] :source-seq (g/seq-now source sconn)
                        :recipient-seq (g/seq-now recipient rconn) :deliveries [d1 d2]
                        :recipient-intent (native rconn :triplex.scope/removal-intent)}]
            (observe! lbl :detail detail)
            (oracle! lbl (= [[200 nil] [200 nil]] [d1 d2]) "a delivery with a current source ticket commits" detail)))))))

;; ---- E5: late transactions (prepared under an old cut, submitted at a step of the removal) -------------------------
(defn e5 []
  (g/fresh-scope false
    (fn [name conn]
      (doseq [kind [:frame-any :frame-acct :frame-other :save-s :replay] point [:after-declare :after-native :after-reply]]
        (let [lbl (str "E5 late " (clojure.core/name kind) " at " (clojure.core/name point))
              tag (str (clojure.core/name kind) "-" (clojure.core/name point))
              x (str "acct/l/" tag) y (str "acct/m/" tag)
              v0 (g/secret x "seed")
              _ (offers/send name (g/frame (str "e5s-" tag) x v0 nil nil))
              _ (offers/send name (g/frame (str "e5y-" tag) y (g/secret y "seed") nil nil))
              t0 (g/seq-now name conn)
              op (str "e5w-" tag) doc (str "notice:v1:e5-" tag)
              input (case kind
                      :frame-any (frame-copy op doc v0 t0 nil)
                      :frame-acct (frame-copy op doc v0 t0 ["l"])
                      :frame-other (assoc (g/save-frame op (str "notice:v1:e5o-" tag) ":notice/body" (g/secret y "n") nil nil) "erasureSeq" t0 "erasureAccounts" ["m"])
                      :save-s (g/frame op x (g/secret x "late") (str "e5s-" tag) (g/head conn))
                      :replay (assoc (g/frame op x v0 nil nil) "erasureSeq" t0 "erasureReplay" true))
              data (capture! name input)
              outcome (atom :not-submitted)
              submit (fn [] (reset! outcome (if data (real-transact conn data) :nothing-captured)))
              _ (reset! a/plan {:hook (fn [p] (when (and (= p point) (= :not-submitted @outcome)) (submit)))})
              removed (a/remove-attr! name (str "e5r-" tag) x)
              _ (reset! a/plan nil)
              _ (when (and (= point :after-reply) (= :not-submitted @outcome)) (submit))
              p-r (get-in removed [:body "position"]) p-w (a/position-of conn op)
              ids (set (map #(get % "assertionId") (get-in removed [:body "identities"])))
              copy (when (#{:frame-any :frame-acct} kind) (read-has? name doc v0))
              ;; an import replay carries a ticket naming no account, so it must fail at every point; a plain save of the
              ;; subject fences on its own counter, which only the commit moves
              must-fail (case kind (:frame-any :frame-acct :replay) true :frame-other false :save-s (not= point :after-declare))
              detail {:removal (offers/outcome removed) :late-transaction @outcome :late-position p-w :removal-position p-r
                      :late-value-removed (contains? ids op) :copy-readable copy}]
          (observe! lbl :detail detail)
          (bump! :e5 kind point (if (= :committed @outcome) :committed :refused))
          (if must-fail
            (oracle! lbl (not= :committed @outcome) "a late transaction prepared before the removal is refused at the serial point" detail)
            (when (= kind :save-s)
              (oracle! lbl (or (not= :committed @outcome) (contains? ids op)) "a late save landing before the removal's selection is removed with it" detail)))
          (when (= kind :frame-other)
            (oracle! lbl (= :committed @outcome) "a late derived write of another account still commits" detail)))))))

;; ---- E6: a ticket that names fewer accounts than its writer read ------------------------------------------------
(defn e6 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E6 a ticket naming fewer accounts than it read"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1)) t0 (g/seq-now name conn)
              _ (reset! a/plan {:stop :after-native :stops-left 1})
              stopped (a/remove-attr! name "e6-rm" g/a1)
              _ (reset! a/plan nil)
              w (offers/send name (frame-copy "e6-f" "notice:v1:e6" value t0 ["b"]))
              done (a/remove-attr! name "e6-rm" g/a1)
              detail {:stopped (offers/outcome stopped) :frame-reading-a-naming-b (offers/outcome w) :resumed (offers/outcome done)
                      :frame-position (a/position-of conn "e6-f") :removal-position (get-in done [:body "position"])
                      :copy-readable-after-ack (read-has? name "notice:v1:e6" value)}]
          (observe! lbl :detail detail)
          (bump! :e6 (if (:copy-readable-after-ack detail) :copy-survives :refused)))))))

;; ---- E7: a declaration at sequence s while a removal at s has already committed (removal log behind the data) --------
(defn- copy-dir! [^java.nio.file.Path from ^java.nio.file.Path to]
  (java.nio.file.Files/createDirectories to (make-array java.nio.file.attribute.FileAttribute 0))
  (with-open [st (java.nio.file.Files/list to)] (doseq [p (iterator-seq (.iterator st))] (java.nio.file.Files/delete p)))
  (with-open [st (java.nio.file.Files/list from)]
    (doseq [p (iterator-seq (.iterator st))]
      (java.nio.file.Files/copy ^java.nio.file.Path p (.resolve to (.getFileName ^java.nio.file.Path p))
                                (into-array java.nio.file.CopyOption [java.nio.file.StandardCopyOption/REPLACE_EXISTING])))))
(defn e7 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E7 a declaration while a removal at the same sequence has committed (removal log restored behind the data)"
              _ (g/seed! name [g/a1 g/b1 "acct/c/one"])
              dir (.getParent (privacy/path name "head.json"))
              before (java.nio.file.Paths/get "/tmp" (into-array String ["era3-e7-before"]))
              after (java.nio.file.Paths/get "/tmp" (into-array String ["era3-e7-after"]))
              _ (copy-dir! dir before)
              r1 (a/remove-attr! name "e7-r1" g/b1)
              _ (copy-dir! dir after)
              _ (copy-dir! before dir) _ (reset! privacy/cache {})
              behind {:published (g/seq-now name conn) :removal-seq (native conn :triplex.scope/removal-seq) :intent (native conn :triplex.scope/removal-intent)}
              read-while (offers/outcome (offers/route name "v1" "read" {"entityIds" [g/b1]}))
              r2 (a/remove-attr! name "e7-r2" g/a1)
              side {:intent (native conn :triplex.scope/removal-intent) :held (native conn :triplex.scope/removal-held)
                    :account-a (rs/native-account-seq (d/db conn) "a") :account-b (rs/native-account-seq (d/db conn) "b")
                    :pending (some-> (privacy/pending name) (get "commandId"))}
              ;; the operator puts the correct removal log back
              _ (copy-dir! after dir) _ (reset! privacy/cache {})
              fixed {:published (g/seq-now name conn) :account-b-native (rs/native-account-seq (d/db conn) "b")
                     :account-b-log (rs/bucket-seq (privacy/cut name (d/db conn) true) "b")}
              frame-b (offers/outcome (offers/send name (assoc (g/save-frame "e7-fb" "notice:v1:e7-b" ":notice/body" "x" nil nil) "erasureSeq" (g/seq-now name conn) "erasureAccounts" ["b"])))
              frame-a (offers/outcome (offers/send name (assoc (g/save-frame "e7-fa" "notice:v1:e7-a" ":notice/body" "x" nil nil) "erasureSeq" (g/seq-now name conn) "erasureAccounts" ["a"])))
              r3 (offers/outcome (a/remove-attr! name "e7-r3" "acct/c/one"))
              frame-b2 (offers/outcome (offers/send name (assoc (g/save-frame "e7-fb2" "notice:v1:e7-b2" ":notice/body" "x" nil nil) "erasureSeq" (g/seq-now name conn) "erasureAccounts" ["b"])))
              detail {:first-removal (offers/outcome r1) :log-behind behind :read-while-behind read-while
                      :removal-while-behind (offers/outcome r2) :its-side-effects side :after-the-log-is-put-back fixed
                      :frame-naming-b frame-b :frame-naming-a frame-a :another-removal r3 :frame-naming-b-after-it frame-b2}]
          (observe! lbl :detail detail)
          (oracle! lbl (= [200 nil] frame-b) "once the correct log is back, a frame naming an account commits" detail)
          (a/counters-agree! name conn lbl))))))

(defn e7b
  "E7 with a derived write that read b1's value before the first removal (its ticket: sequence 0, naming account b),
  sent after the second removal's failed attempt released account b on the rule 'same sequence, my own earlier
  declaration'. Does the copy land after the first removal's position, and is it readable once the log is put back?
  Also run on today's database-wide rule (option off) as the control."
  []
  (do
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E7b an old ticket after a declaration released an account that lost a value (log behind the data)"
              seeds (g/seed! name [g/a1 g/b1 "acct/c/one"]) value-b (:value (seeds g/b1))
              dir (.getParent (privacy/path name "head.json"))
              before (java.nio.file.Paths/get "/tmp" (into-array String ["era3-e7b-before"]))
              after (java.nio.file.Paths/get "/tmp" (into-array String ["era3-e7b-after"]))
              _ (copy-dir! dir before)
              r1 (a/remove-attr! name "e7b-r1" g/b1)
              b-after-r1 (when per-account? (rs/native-account-seq (d/db conn) "b"))
              _ (copy-dir! dir after)
              _ (copy-dir! before dir) _ (reset! privacy/cache {})
              old-before-r2 (offers/outcome (offers/send name (frame-copy "e7b-old-0" "notice:v1:e7b-old-0" value-b 0 ["b"])))
              r2 (a/remove-attr! name "e7b-r2" g/a1)
              side {:intent (native conn :triplex.scope/removal-intent) :held (native conn :triplex.scope/removal-held)
                    :account-b (when per-account? (rs/native-account-seq (d/db conn) "b")) :pending (some-> (privacy/pending name) (get "commandId"))}
              old (offers/send name (frame-copy "e7b-old" "notice:v1:e7b-old" value-b 0 ["b"]))
              _ (copy-dir! after dir) _ (reset! privacy/cache {})
              p-old (a/position-of conn "e7b-old")
              detail {:first-removal (offers/outcome r1) :first-removal-position (get-in r1 [:body "position"])
                      :account-b-after-first-removal b-after-r1 :old-frame-before-the-second-attempt old-before-r2
                      :second-attempt (offers/outcome r2) :its-side-effects side
                      :old-frame-after-it (offers/outcome old) :old-frame-position p-old
                      :copy-readable-once-the-log-is-back (read-has? name "notice:v1:e7b-old" value-b)}]
          (observe! lbl :detail detail)
          (oracle! lbl (not= 200 (:status old))
                   "a derived write that read a value before its removal never lands after it (operator restored the removal log behind the data)" detail))))))

;; ---- E8: a derived write prepared before the move per account and committed after it --------------------------
(defn e8 []
  (when per-account?
    (g/fresh-scope false
      (fn [name conn]
        (let [lbl "E8 a derived transaction prepared before the move and submitted after it"
              seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
              back (offers/outcome (offers/route name "v2" "removal-per-account" {"back" true}))
              t0 (g/seq-now name conn)
              ;; prepared on the database-wide rule, with a removal after the move (x) and without one (y)
              x-any (capture! name (frame-copy "e8-x-any" "notice:v1:e8-x-any" value t0 nil))
              x-acct (capture! name (frame-copy "e8-x-a" "notice:v1:e8-x-a" value t0 ["a"]))
              y-any (capture! name (frame-copy "e8-y-any" "notice:v1:e8-y-any" "plain" t0 nil))
              y-acct (capture! name (frame-copy "e8-y-b" "notice:v1:e8-y-b" "plain" t0 ["b"]))
              fwd (offers/outcome (offers/route name "v2" "removal-per-account" {}))
              y-out [(real-transact conn y-any) (real-transact conn y-acct)]
              removed (a/remove-attr! name "e8-rm" g/a1)
              x-out [(real-transact conn x-any) (real-transact conn x-acct)]
              p-r (get-in removed [:body "position"])
              detail {:move-back back :move-forward fwd :removal (offers/outcome removed) :removal-position p-r
                      :late-without-removal y-out :late-after-removal x-out
                      :positions {:x-any (a/position-of conn "e8-x-any") :x-acct (a/position-of conn "e8-x-a")}
                      :copies-readable [(read-has? name "notice:v1:e8-x-any" value) (read-has? name "notice:v1:e8-x-a" value)]}]
          (observe! lbl :detail detail)
          (bump! :e8 :without-removal y-out) (bump! :e8 :after-removal x-out)
          (oracle! lbl (not-any? #{:committed} x-out) "a derived transaction prepared before the move never lands after a removal" detail)
          (oracle! lbl (not-any? true? (:copies-readable detail)) "no copy readable after the acknowledgement" detail))))))

;; ---- E9: derived copies recorded BEFORE a removal (TARGETS section 7, item 3) ----------------------------------
(defn e9 [sealed?]
  (g/fresh-scope sealed?
    (fn [name conn]
      (let [lbl (str "E9 derived copy recorded before the removal" (if sealed? " sealed" " unsealed"))
            seeds (g/seed! name [g/a1 g/b1]) value (:value (seeds g/a1))
            w (offers/send name (frame-copy "e9-f" "notice:v1:e9" value (g/seq-now name conn) (when per-account? ["a"])))
            removed (a/remove-attr! name "e9-rm" g/a1)
            detail {:frame-before (offers/outcome w) :removal (offers/outcome removed)
                     :copy-readable-after-ack (read-has? name "notice:v1:e9" value)
                     :copy-in-journal (str/includes? (g/text (:body (offers/route name "v2" "transactions" {"after" 0 "limit" 1000}))) value)
                     :native-copies (count (g/raw-occurrences conn value))}]
        (observe! lbl :detail detail)
        (oracle! lbl (not (:copy-readable-after-ack detail))
                 "TARGETS 7.3: erasure reaches every copy of a protected value or anything derived from it" detail)))))

;; ---- F2: the fuzzer with the declaration step ---------------------------------------------------------------
(def kinds [:fact :retire :creation :import :import-s :other-subject :other-account])
(def releases [:before :after-intent :after-declare :in-commit :after-hold :after-native :after-reply :after-resume])
(def stops [:none :none :after-declare :before-native :after-native :at-publish :after-guard])
(def durings [:none :derived-any :derived-acct :derived-other :replay :save-s :save-child :other-removal :read])
(def lates [:none :none :frame-any :frame-acct :frame-other :save-s])
(def late-points [:after-declare :after-native :after-reply])
(def resumes [:same :restart :mixed :other-first :never])
(def resends [:none :removal :save])
(def sealed-fuzz? (= "1" (System/getenv "ERA3_SEALED")))

(defn schedule [^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        s {:kind (pick kinds) :release (let [x (pick releases)] (if sealed-fuzz? :before x)) :stop (pick stops)
           :during (pick durings) :late (pick lates) :late-at (pick late-points) :resume (pick resumes) :resend (pick resends)
           :narrow (if (zero? (.nextInt r 3)) 1 2)}]
    ;; "never resent" only for a stop right after the declaration (no intent recorded); after a stop that recorded an
    ;; intent, a removal that is never resent blocks every other removal by design (one ordered log)
    (if (and (= :never (:resume s)) (not= :after-declare (:stop s))) (assoc s :resume :same) s)))

(defn run-schedule! [name conn run i sch]
  (let [{:keys [kind release stop during late late-at resume resend narrow]} sch
        acct (str "g" (mod i 7)) tag (str run "-" i)
        s (str "acct/" acct "/s" i) child (str s "-new") s2 (str "acct/" acct "/t" i) o (str "acct/o" (mod i 5) "/u" i)
        z (str "acct/z" (mod i 3) "/w" i)
        v0 (g/secret s (str "seed" tag))
        _ (doseq [[id e v] [[(str "fs-" tag) s v0] [(str "ft-" tag) s2 (g/secret s2 "seed")] [(str "fo-" tag) o (g/secret o "seed")]
                            [(str "fz-" tag) z (g/secret z "seed")]]]
            (let [r (offers/send name (g/frame id e v nil nil))] (when-not (= 200 (:status r)) (bump! :seed-refused (offers/outcome r)))))
        pin (g/head conn) ticket (g/seq-now name conn)
        _ (offers/route name "v2" "reach" {"root" s "basis" {"recordedPosition" pin "validAt" 1.0e12} "session" (str "f-" tag) "erasureRefs" true})
        v1 (g/secret s (str "race" tag)) rid (str "fr-" tag)
        race (case kind
               :fact (g/frame rid s v1 (str "fs-" tag) pin)
               :retire (g/frame* rid s ":v" nil (str "fs-" tag) pin {:retire-only true})
               :creation (g/frame rid child v1 nil nil)
               :import (g/frame* rid child ":v" v1 nil nil {:actor "bulk-import"})
               :import-s (g/frame* rid s ":v" v1 (str "fs-" tag) pin {:actor "bulk-import"})
               :other-subject (g/frame rid s2 v1 (str "ft-" tag) pin)
               :other-account (g/frame rid o v1 (str "fo-" tag) pin))
        race-target (case kind (:fact :retire :import-s) s (:creation :import) child :other-subject s2 :other-account o)
        ;; a late transaction: prepared now (old cut), submitted at late-at
        lid (str "fl-" tag) ldoc (str "notice:v1:fl-" tag)
        late-input (case late
                     :none nil
                     :frame-any (frame-copy lid ldoc v0 ticket nil)
                     :frame-acct (frame-copy lid ldoc v0 ticket [acct])
                     :frame-other (assoc (g/save-frame lid (str "notice:v1:flo-" tag) ":notice/body" (g/secret o "n") nil nil) "erasureSeq" ticket "erasureAccounts" [(str "o" (mod i 5))])
                     :save-s (g/frame lid s (g/secret s (str "late" tag)) (str "fs-" tag) pin))
        late-data (when late-input (capture! name late-input))
        late-out (atom :not-submitted)
        late! (fn [] (when (and late-data (= :not-submitted @late-out)) (reset! late-out (real-transact conn late-data))))
        early (when (= release :before) (offers/send name race))
        held (when-not (= release :before) (a/start-held! name race))
        race-reply (atom early)
        rel! (fn [] (when (and held (nil? @race-reply)) (reset! race-reply (a/release-held! held))))
        cmd (str "fx-" tag)
        selectors [{"entityId" s "attribute" ":v"} {"entityId" child "attribute" ":v"}]
        _ (alter-var-root #'rc/narrow-tries (constantly narrow))
        _ (reset! a/plan {:stop (when-not (= stop :none) stop) :stops-left 1
                          :hook (fn [p] (when (= p release) (rel!)) (when (= p late-at) (late!)))})
        first-reply (erase! name cmd selectors)
        _ (reset! a/plan nil)
        stopped? (not= 200 (:status first-reply))
        _ (bump! :first-reply stop (offers/outcome first-reply))
        _ (when (#{:after-reply :after-hold :after-intent :after-declare :in-commit :after-native} release) (rel!))
        _ (when (= late-at :after-reply) (late!))
        v2 (g/secret s (str "during" tag)) did (str "fd-" tag) doc (str "notice:v1:fd-" tag)
        during-reply
        (case during
          :none nil
          :read (offers/route name "v1" "read" {"entityIds" [s2]})
          :derived-any (offers/send name (frame-copy did doc v0 ticket nil))
          :derived-acct (offers/send name (frame-copy did doc v0 ticket [acct]))
          :derived-other (offers/send name (assoc (g/save-frame did (str "notice:v1:fdo-" tag) ":notice/body" (g/secret o "d") nil nil)
                                                 "erasureSeq" (g/seq-now name conn) "erasureAccounts" [(str "o" (mod i 5))]))
          :replay (offers/send name (assoc (g/frame did s v0 nil nil) "erasureSeq" (g/seq-now name conn) "erasureReplay" true))
          :save-s (offers/send name (g/frame did s v2 nil nil))
          :save-child (offers/send name (g/frame did child v2 nil nil))
          :other-removal (erase! name (str "fo-rm-" tag) [{"entityId" s2 "attribute" ":v"}]))
        _ (when during-reply (bump! :during during (if stopped? stop :after-answer) (offers/outcome during-reply)))
        ;; an orphan left by a stop after the declaration: does it block unnamed derived writes of other accounts?
        orphan-probe (when (and stopped? (= stop :after-declare))
                       (offers/outcome (offers/send name (assoc (g/save-frame (str "fp-" tag) (str "notice:v1:fp-" tag) ":notice/body" "probe" nil nil)
                                                               "erasureSeq" (g/seq-now name conn)))))
        _ (when orphan-probe (bump! :orphan-unnamed-probe during (if (= 200 (:status during-reply)) :during-ok :during-not-ok) orphan-probe))
        _ (when (and stopped? (= resume :other-first))
            (bump! :other-first (offers/outcome (erase! name (str "fz-rm-" tag) [{"entityId" z "attribute" ":v"}]))))
        _ (when (and stopped? (= resume :never))
            ;; never resent: the next removal of the database (another account) must leave the database unblocked
            (bump! :never-other (offers/outcome (erase! name (str "fz-rm-" tag) [{"entityId" z "attribute" ":v"}]))))
        final (if (and stopped? (= resume :never)) first-reply
                (loop [k 0 reply first-reply]
                  (if (or (= 200 (:status reply)) (>= k 3)) reply
                    (recur (inc k)
                           (case (if (zero? k) resume :same)
                             (:same :other-first) (erase! name cmd selectors)
                             :restart (do (reset! privacy/cache {}) (erase! name cmd selectors))
                             :mixed (with-redefs-fn {#'erase/subject-check false} #(erase! name cmd selectors)))))))
        _ (rel!) _ (late!)
        never? (and stopped? (= resume :never))
        ok (= 200 (:status final))
        p-r (get-in final [:body "position"])
        ids (set (map #(get % "assertionId") (get-in final [:body "identities"])))
        p-race (a/position-of conn rid) p-during (a/position-of conn did) p-late (a/position-of conn lid)
        resend-reply (when ok (case resend :none nil :removal (erase! name cmd selectors) :save (offers/send name race)))
        ;; liveness after the schedule: a fresh unnamed derived write and one naming this account commit
        live-any (offers/outcome (offers/send name (assoc (g/save-frame (str "fv-" tag) (str "notice:v1:fv-" tag) ":notice/body" "live" nil nil)
                                                         "erasureSeq" (g/seq-now name conn))))
        live-acct (offers/outcome (offers/send name (assoc (g/save-frame (str "fw-" tag) (str "notice:v1:fw-" tag) ":notice/body" "live" nil nil)
                                                          "erasureSeq" (g/seq-now name conn) "erasureAccounts" [acct])))
        label (str "F2 " (pr-str (dissoc sch :narrow)))]
    (bump! :live-after (if never? :never :completed) live-any live-acct)
    (when-not never?
      (oracle! label ok "the removal completes after at most 3 resumes" {:first (offers/outcome first-reply) :final (offers/outcome final)})
      (oracle! label (= [200 nil] live-any) "after the removal, a fresh unnamed derived write commits" live-any)
      (oracle! label (= [200 nil] live-acct) "after the removal, a fresh derived write naming the account commits" live-acct))
    (when never?
      (oracle! label (= [200 nil] live-any) "an orphan never resent stops blocking once another removal ran" live-any))
    (when (and ok p-r)
      (oracle! label (contains? ids (str "fs-" tag)) "the seed value was removed" ids)
      (when (and p-race (#{s child} race-target))
        (oracle! label (< p-race p-r) "a write prepared before the removal never commits after its position on its subjects" {:race p-race :removal p-r})
        (when (and (< p-race p-r) (not= kind :retire))
          (oracle! label (contains? ids rid) "a racing value committed before the removal was removed with it" {:rid rid})))
      (when (and (#{:other-subject :other-account} kind) (not (and (= kind :other-subject) (= during :other-removal))))
        (oracle! label (= [200 nil] (offers/outcome @race-reply)) "an unrelated save prepared before the removal commits" (offers/outcome @race-reply)))
      (when (and p-during stopped? (#{:save-s :save-child :replay} during))
        (oracle! label (< p-during p-r) "a write sent while the removal was pending never lands after its position on its subjects" {:p p-during :removal p-r})
        (when (< p-during p-r) (oracle! label (contains? ids did) "a value saved while the removal was pending was removed" {})))
      (when (#{:derived-any :derived-acct} during)
        (oracle! label (not (and p-during (> p-during p-r))) "a derived copy whose ticket predates the removal never lands after its position" {})
        (bump! :derived during stop (cond (not p-during) :not-landed (< p-during p-r) :before :else :AFTER)))
      (when late-data
        (bump! :late late late-at (if (= :committed @late-out) (if (and p-late (> p-late p-r)) :committed-after :committed-before) :refused)))
      (when (and (#{:frame-any :frame-acct} late) (= :committed @late-out))
        (oracle! label (not (and p-late (> p-late p-r))) "a late derived transaction with an old ticket never lands after the removal's position" {:late late :at late-at})
        (oracle! label (not (str/includes? (a/read-text name ldoc) v0)) "no copy from a late derived transaction is readable after the acknowledgement" {:late late :at late-at}))
      (when (and (= late :save-s) (= :committed @late-out))
        (oracle! label (or (< p-late p-r) false) "a late save prepared before the removal never lands after its position" {:at late-at :p p-late :removal p-r})
        (when (< p-late p-r) (oracle! label (contains? ids lid) "a late save landing before the removal's position was removed" {})))
      (when (= late :frame-other)
        (oracle! label (= :committed @late-out) "a late derived write of another account commits" @late-out))
      (when (= resend :removal)
        (oracle! label (and (= 200 (:status resend-reply)) (= p-r (get-in resend-reply [:body "position"]))) "a resent removal answers the same removal" (offers/outcome resend-reply)))
      (when (and (= resend :save) resend-reply (= 200 (:status resend-reply)) (not= 200 (:status @race-reply)))
        (if (= kind :import-s) (oracle! label false "an import frame of a removed field resent after the removal is refused" {})
          (when (= kind :import) (bump! :imp2-known-named-absent-import-resend-committed))))
      (let [gone (cond-> [v0] (and p-race (< p-race p-r) (#{:fact :creation :import :import-s} kind)) (conj v1)
                   (and p-during (< p-during p-r) (#{:save-s :save-child} during)) (conj v2))
            texts (concat (for [e [s child] q [{} {"history" true} {"basis" {"recordedPosition" pin "validAt" 1.0e12}}]] (a/read-text name e q))
                          [(g/text (:body (offers/route name "v2" "reach" {"root" s "basis" {"recordedPosition" pin "validAt" 1.0e12}
                                                                            "session" (str "f-" tag) "erasureRefs" true})))])]
        (oracle! label (not-any? (fn [t] (some #(str/includes? t %) gone)) texts) "no read route answers a removed value" {:gone gone})))
    (bump! :schedules)
    (doseq [[k v] sch] (bump! :dim k v))
    (when (and (= stop :after-declare) stopped?) (bump! :dim :orphan-made resume))
    {:gone (if-not ok {}   ;; a removal never resent removed nothing
             (cond-> {v0 #{s}} (and p-race p-r (< p-race p-r) (#{:fact :creation :import :import-s} kind)) (assoc v1 #{s child})))
     :derived (cond-> {}
                (not ok) (identity)   ;; nothing removed: nothing to check
                (and ok (#{:derived-any :derived-acct} during) p-during) (assoc v0 #{doc})
                (and ok (#{:frame-any :frame-acct} late) p-late) (update v0 (fnil conj #{}) ldoc))
     :derived-tx (cond-> []
                   (and (#{:derived-any :derived-acct} during) p-during) (conj (str "_tx/" did))
                   (and (#{:frame-any :frame-acct} late) p-late) (conj (str "_tx/" lid)))}))

(defn intent-agrees! [name conn label]
  (when (and per-account? (nil? (privacy/pending name)))
    (let [i (native conn :triplex.scope/removal-intent) n (native conn :triplex.scope/removal-seq)]
      (swap! tally update [:intent-compared] (fnil inc 0))
      (oracle! label (= i n) "with no removal in flight, the declared sequence equals the committed one" {:intent i :removal-seq n}))))

(defn fuzz2 [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [b (range (quot (+ n block -1) block))]
      (g/fresh-scope sealed-fuzz?
        (fn [name conn]
          (let [results (vec (for [i (range (* b block) (min n (* (inc b) block)))]
                               (let [sch (schedule r)]
                                 (try (let [x (run-schedule! name conn run i sch)]
                                        ;; a derived write that landed (its journal is then counted in clear): which schedule
                                        (when (seq (:derived-tx x))
                                          (println "ERA3_DERIVED_LANDED" mode (pr-str {:i i :sch sch :txs (:derived-tx x) :removal-completed (boolean (seq (:gone x)))})))
                                        x)
                                      (catch Throwable e
                                        (reset! a/plan nil) (reset! a/held-ops {})
                                        (oracle! (str "F2 " (pr-str sch)) false (str "schedule stopped: " (.getMessage e)))
                                        nil)))))
                gone (apply merge-with into (keep :gone results))
                derived (apply merge-with into (keep :derived results))
                derived-txs (set (mapcat :derived-tx results))]
            (a/block-checks! name conn (str "F2 block " b) (or gone {}) (or derived {}) derived-txs)
            (intent-agrees! name conn (str "F2 block " b))
            (println "ERA3_PROGRESS" mode (pr-str {:block b :schedules (get @tally [:schedules]) :violations (count @a/violations)}))))))))

;; ---- request bodies for era3/stack2.sh: the same frames, as the route receives them (tickets patched at run time) -----
(defn bodies2 []
  (let [dir (java.io.File. "/out/bodies") _ (.mkdirs dir)
        put (fn [n x] (spit (java.io.File. dir ^String n) (json/write-str x)))
        subjects (merge {"a1" "acct/a/one" "a2" "acct/a/two" "b1" "acct/b/one" "c1" "acct/c/one"}
                        (into {} (for [k (range 30)] [(str "r" k) (str "acct/r/s" k)])))
        values (into {} (for [[k e] subjects] [k (g/secret e "stack2")]))]
    (doseq [[k e] subjects] (put (str "seed-" k ".json") (g/frame (str "st2-seed-" k) e (values k) nil nil)))
    (doseq [k (range 20)] (put (str "frame-any-" k ".json") (frame-copy (str "st2-any-" k) (str "notice:v1:st2-any-" k) (values "a1") 0 nil)))
    (doseq [k (range 10)]
      (put (str "frame-a-" k ".json") (frame-copy (str "st2-fa-" k) (str "notice:v1:st2-a-" k) (values "a1") 0 ["a"]))
      (put (str "frame-b-" k ".json") (assoc (g/save-frame (str "st2-fb-" k) (str "notice:v1:st2-b-" k) ":notice/body" (str "b-" k) nil nil) "erasureSeq" 0 "erasureAccounts" ["b"]))
      (put (str "save-b1-" k ".json") (g/save-frame (str "st2-sb-" k) "acct/b/one" ":w" (str "w-" k) nil nil))
      (put (str "save-a2-" k ".json") (g/save-frame (str "st2-sa-" k) "acct/a/two" ":w" (str "w-" k) nil nil)))
    (put "values.json" values) (put "subjects.json" subjects)
    (println "ERA3_BODIES2" (count (.list dir)))))

(defn- guarded [label f] (try (f) (catch Throwable e (reset! a/plan nil) (oracle! label false (str "case stopped: " (.getMessage e)) (pr-str e)))))
(defn main []
  (install-hooks2!)
  (let [phases (set (str/split (or (System/getenv "ERA3_PHASES") "e1 e2 e3 e4 e5 e6 e9 fuzz2") #" "))]
    (when (phases "e1") (doseq [c [:resend :other :move :restore-route]] (guarded (str "E1 " c) #(e1 c))) (guarded "E1b" e1-bucket))
    (when (phases "e2") (guarded "E2" e2))
    (when (phases "e3") (guarded "E3" e3))
    (when (phases "e4") (guarded "E4" e4))
    (when (phases "e5") (guarded "E5" e5))
    (when (phases "e6") (guarded "E6" e6))
    (when (phases "bodies2") (bodies2))
    (when (phases "e7") (guarded "E7" e7))
    (when (phases "e7b") (guarded "E7b" e7b))
    (when (phases "e8") (guarded "E8" e8))
    (when (phases "e9") (doseq [sealed? [false true]] (guarded (str "E9 " sealed?) #(e9 sealed?))))
    (when (phases "fuzz2")
      (fuzz2 (or (System/getenv "ERA3_RUN") "r0") (Long/parseLong (or (System/getenv "ERA3_N") "200"))
             (Long/parseLong (or (System/getenv "ERA3_BLOCK") "100")) (Long/parseLong (or (System/getenv "ERA3_SEED") "1")))))
  (let [failed (remove :ok @g/results)]
    (println "ERA3_TALLY2" mode (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
    (println "ERA3_SUMMARY" mode (pr-str {:oracles @a/oracles :violations (count @a/violations)
                                          :builder-checks (count @g/results) :builder-checks-failed (count failed)}))
    (doseq [f failed] (println "ERA3_BUILDER_CHECK_FAILED" (pr-str f)))
    (shutdown-agents)
    (System/exit 0)))
