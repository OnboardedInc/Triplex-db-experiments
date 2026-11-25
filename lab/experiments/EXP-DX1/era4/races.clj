(ns era4-races
  "[DX-ERA4] Gate (e) in process (era4/DERIVED-COPIES.md): DX-ACT9's schedules (act9/tickets.clj: a removal of subject X
  of account A, stopped at a random step and resumed, while eight derived writes of accounts A and B, settlement frame,
  notice frame, Publish marker and a delivery into a recipient database, each sent at a random point), on a SEALED
  database, with every derived copy made BEFORE the removal included. Loaded after wfix1/regression.clj, era2/gate.clj,
  era3/attack.clj and act9/tickets.clj; era4/inproc.sh runs it.
  ERA4_ARM=on (TX2_DERIVED_SEAL=1): each derived write carries its subject's value sealed through the derived-seal route
  under the assertions it was computed from. ERA4_ARM=off: in clear, as today. The oracles are the same in both arms and
  allow NO derived copy of a removed value anywhere (act9's oracle (5) counted copies made before the removal apart):
  (1) the removal completes; (2) a derived write of B is never refused; (3) after the acknowledgement, every sealed copy
  of X's value opens as removed and sealing X's assertion again answers removed, while every copy of Y's value opens to
  it; (4) a reader pinned before the removal reads no clear copy of X's value and cannot open what it reads; (5) X's
  assertion key is deleted within 5 s; a kill (the gateway's caches and the shred worker's progress cleared) and a
  restore of that key from a copy taken before the removal (the removal log kept, the worker restarted) change none of
  this; (6) at the end of each block: no copy of a removed value in any journal page, feed entry or native datom of the
  source or the recipient other than X itself."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.privacy :as privacy] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.removal-commit :as rc]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x] [act9-tickets :as k])
  (:import [java.nio.file Files OpenOption StandardOpenOption] [java.util Random]))

(def arm (or (System/getenv "ERA4_ARM") "on"))
(def on? (= arm "on"))
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))
(def kinds [:frame :notice :publish :delivery])
(def points [:before :concurrent :after-intent :in-commit :after-hold :after-native :after-answer :after-resume])
(def stops [:none :none :before-native :after-native :at-publish :after-guard])

(defn- doc-of [kind acct i] (#'k/doc-of kind acct i))

(defn- seal! [src ids value]
  (let [r (offers/route src "v2" "derived-seal" {"items" [{"ids" ids "value" value}]})
        item (first (get-in r [:body "items"]))]
    (x/oracle! "seal" (= 200 (:status r)) "the derived-seal route answers" (offers/outcome r))
    (or (get item "sealed") (do (x/oracle! "seal" false "a protected input is sealed, not passed in clear" item) value))))

(defn- open! [src wire]
  (let [r (offers/route src "v2" "derived-open" {"items" [wire]})]
    [(:status r) (first (get-in r [:body "items"]))]))

(defn- body [src w t content]
  (let [base (assoc (g/save-frame (:cmd w) (:doc w) ":notice/body" content nil nil) "erasureSeq" t)]
    (cond-> base
      (= :delivery (:kind w)) (assoc "erasureSourceDatabase" src)
      k/after? (assoc "erasureAccounts" [(:acct w)]))))

(defn- protected-id [frame]
  ;; the seed's assertion of `:v` (its own new ID); the route keeps only the protected ones anyway
  (vec (get frame "newIds")))

(defn- key-file [src id] (envelope/key-file src id))

(declare packed doc-write)
(def ^:private faults [:fail :slow :refused])

(defn run-schedule! [src rcp conn rconn run i ^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        a (str "ka" (mod i 3)) b (str "kb" (mod i 3)) tag (str run "-" i)
        sx (format "acct/%s/pl:%08d" a i) sy (format "acct/%s/pl:%08d" b i)
        vx (g/secret sx (str "seed" tag)) vy (g/secret sy (str "seed" tag))
        fx (g/frame (str "kx-" tag) sx vx nil nil) fy (g/frame (str "ky-" tag) sy vy nil nil)
        _ (doseq [f [fx fy]] (let [rep (offers/send src f)] (when-not (= 200 (:status rep)) (bump! :seed-refused (offers/outcome rep)))))
        ids-x (protected-id fx) ids-y (protected-id fy)
        cx (if on? (seal! src ids-x (str "derived:" vx)) (str "derived:" vx))
        cy (if on? (seal! src ids-y (str "derived:" vy)) (str "derived:" vy))
        ;; the protected assertion of X among its new IDs: the one whose key file exists (file authority, sealed)
        x-id (first (filter #(privacy/exists? (key-file src %)) ids-x))
        restore? (and on? (zero? (.nextInt r 8))) kill? (zero? (.nextInt r 4))
        backup (when (and restore? x-id) (Files/readAllBytes (key-file src x-id)))
        t (g/seq-now src conn)
        p-before (g/head conn)
        stop (pick stops)
        ;; plus the second review's E6: a settlement frame of B that READ X's value and names only B in its ticket (it
        ;; passes the removal by design); its copy is X's content, sealed under X's assertion (on) or in clear (off)
        writes (conj (vec (for [[acct c] [[a cx] [b cy]] kind kinds]
                            {:acct acct :kind kind :content c :at (pick points) :doc (doc-of kind acct i)
                             :cmd (str "kw-" tag "-" acct "-" (name kind))}))
                     {:acct b :kind :frame :content cx :at (pick points) :doc (str (doc-of :frame b i) "-read-" a) :cross true
                      :cmd (str "kw-" tag "-" b "-cross")})
        ;; [DX-ERA4, after DX-ERA5's B1] with the option: a settlement writer whose seal call failed, stalled past the
        ;; client's deadline or was refused (a gateway without the option) and that fell back to writing X's unit in
        ;; clear, at a random point of the removal; the database's setting must refuse it at every point
        fault (when on? (pick faults))
        writes (if on?
                 (conj writes {:acct a :kind :degraded :fault fault :at (pick points) :cmd (str "kw-" tag "-" a "-degraded")
                               :doc (str "notice:v1:" (apply str (repeat 64 "e")) ":answer:" i ":f1")
                               :content (str "derived:" vx)})
                 writes)
        replies (atom {}) reached (atom #{})
        send! (fn [w] (if (= :degraded (:kind w))
                        (doc-write src (:cmd w) (subs (:doc w) (count (str "notice:v1:" (apply str (repeat 64 "e")) ":")))
                                   {"identity" "i" "frame" 1 "start" 0 "part" 0 "through" 1 "tail" 0 "previous" "p"
                                    "bytes" (packed [{"subject" sx "changes" [["k" (:content w)]]}])}
                                   (apply str (repeat 64 "e")))
                        (offers/send (if (= :delivery (:kind w)) rcp src) (body src w t (:content w)))))
        fire! (fn [p] (when-not (@reached p)
                        (swap! reached conj p)
                        (doseq [w writes :when (= p (:at w))] (swap! replies assoc (:cmd w) (future (send! w))))))
        wait! (fn [p] (doseq [w writes :when (= p (:at w))] (deref (get @replies (:cmd w)) 30000 nil)))
        _ (do (fire! :before) (wait! :before))
        cmd (str "kr-" tag) selectors [{"entityId" sx "attribute" ":v"}]
        _ (fire! :concurrent)
        _ (reset! x/plan {:stop (when-not (= stop :none) stop) :stops-left 1
                          :hook (fn [p] (when (#{:after-intent :in-commit :after-hold :after-native} p) (fire! p)))})
        first-reply (x/erase! src cmd selectors)
        _ (reset! x/plan nil)
        _ (bump! :stop stop (offers/outcome first-reply))
        _ (doseq [p [:after-intent :in-commit :after-hold :after-native]] (when-not (@reached p) (bump! :point-not-reached p) (fire! p)))
        _ (do (fire! :after-answer) (wait! :after-answer))
        ;; a kill: the gateway's caches and the shred worker's progress cleared before the removal is resumed
        _ (when kill? (reset! privacy/cache {}) (reset! envelope/shredded {}) (bump! :kill))
        final (loop [n 0 reply first-reply]
                (if (or (= 200 (:status reply)) (>= n 3)) reply (recur (inc n) (x/erase! src cmd selectors))))
        _ (do (fire! :after-resume) (wait! :after-resume))
        outcomes (into {} (for [w writes] [(:cmd w) (offers/outcome (deref (get @replies (:cmd w)) 30000 {:status 0 :body {"code" "timeout"}}))]))
        ok (= 200 (:status final))
        label (str "E4 " arm " " (pr-str {:i i :stop stop :kill kill? :restore restore?}))
        landed (vec (for [w writes :let [p (x/position-of (if (= :delivery (:kind w)) rconn conn) (:cmd w))] :when p] (assoc w :p p)))]
    (x/oracle! label ok "the removal completes after at most 3 resumes" {:first (offers/outcome first-reply) :final (offers/outcome final)})
    (doseq [w writes :when (not= (:acct w) a)]
      (when k/after?
        (x/oracle! label (= [200 nil] (get outcomes (:cmd w))) "a derived write of another account is never refused by this removal"
                   {:kind (:kind w) :at (:at w) :outcome (get outcomes (:cmd w))
                    :message (some-> (deref (get @replies (:cmd w)) 1000 nil) :body (get "message") str (subs 0) (as-> m (subs m 0 (min 300 (count m)))))})))
    (doseq [w writes :when (= :degraded (:kind w))]
      (let [o (get outcomes (:cmd w))]
        (bump! :degraded (:fault w) o)
        (x/oracle! label (not= 200 (first o)) "a derived unit written in clear after a failed, slow or refused seal is refused"
                   {:fault (:fault w) :at (:at w) :outcome o})
        (x/oracle! label (nil? (x/position-of conn (:cmd w))) "it never lands" {:at (:at w)})))
    (when (if on? (zero? (.nextInt r 8)) false)
      (let [[rd wr] (with-redefs [main/derived-seal-on false]
                      [(offers/outcome (offers/route src "v1" "read" {"entityIds" [sx]}))
                       (offers/outcome (doc-write src (str "kw-" tag "-nooption") (str "answer:" i ":f2")
                                                  {"identity" "i" "frame" 1 "start" 0 "part" 0 "through" 1 "tail" 0 "previous" "p"
                                                   "bytes" (packed [{"subject" sy "changes" [["" cy]]}])}
                                                  (apply str (repeat 64 "e"))))])]
        (bump! :gateway-without-the-option rd wr)
        (x/oracle! label (= [rd wr] [[503 "DerivedSealRequired"] [503 "DerivedSealRequired"]])
                   "a gateway without the option refuses a database that requires sealed derived documents" {:read rd :write wr})))
    (doseq [w landed] (bump! :landed (cond (:cross w) :read-removed-account (= (:acct w) a) :removed-account :else :other-account) (:kind w)))
    (when (and ok on?)
      ;; (3) after the acknowledgement: X's copies open as removed, Y's open to Y's value; sealing X again answers removed
      (let [[sx-status ox] (open! src cx) [_ oy] (open! src cy)
            again (first (get-in (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" "probe"}]}) [:body "items"]))]
        (x/oracle! label (and (= 200 sx-status) (contains? ox "removed") (not (contains? ox "value")))
                   "a sealed copy of a removed value opens as removed from the acknowledgement on" ox)
        (x/oracle! label (= (str "derived:" vy) (get oy "value")) "a sealed copy of a kept value still opens to it" oy)
        (x/oracle! label (contains? again "removed") "a removed assertion can no longer seal anything" again))
      ;; (4) a reader pinned before the removal
      (doseq [w landed :when (and (or (= (:acct w) a) (:cross w)) (not= :delivery (:kind w)))]
        (let [rep (offers/route src "v1" "read" {"entityIds" [(:doc w)] "basis" {"recordedPosition" (max p-before (:p w)) "validAt" 1.0e12}})
              txt (g/text (:body rep))]
          (x/oracle! label (not (str/includes? txt vx)) "a pinned read holds no clear copy of the removed value" {:doc (:doc w)})
          (doseq [wire (re-seq #"tdx[12]\.[A-Za-z0-9_.-]+" txt)]
            (x/oracle! label (contains? (second (open! src wire)) "removed") "what a pinned reader read cannot be opened" {:doc (:doc w)}))))
      ;; (5) the key is deleted; a key restored from a copy taken before the removal is deleted again. [DX-ERA4, after
      ;; DX-ERA2's fourth pass] Only a schedule that restores the key waits for the shred worker here; every other
      ;; schedule's key is checked at its block's end (`fuzz`), so a schedule no longer waits up to 500 ms for the worker
      (when (if x-id (if restore? backup false) false)
        (let [gone? (fn [] (loop [n 0] (cond (not (privacy/exists? (key-file src x-id))) true (> n 50) false
                                              :else (do (Thread/sleep 100) (recur (inc n))))))]
          (x/oracle! label (gone?) "the removed assertion's key is deleted within 5 s" {:id x-id})
          (do
            ;; a restart: wait until the worker has recorded this removal as shredded (resetting its progress while it
            ;; sits between the delete and that record would let it record the removal after the reset, which no real
            ;; restart can do: a new process starts from 0), then the key comes back and the worker starts from 0
            (let [seq-r (long (or (get-in final [:body "seq"]) 0))]
              (loop [n 0] (when (and (< (long (get @envelope/shredded src 0)) seq-r) (< n 100)) (Thread/sleep 50) (recur (inc n)))))
            (Files/write (key-file src x-id) ^bytes backup (into-array OpenOption [StandardOpenOption/CREATE StandardOpenOption/WRITE]))
            (reset! envelope/shredded {})
            (x/oracle! label (contains? (second (open! src cx)) "removed") "with the key restored, the published removal still decides" nil)
            (x/oracle! label (gone?) "a restored key is deleted again by the restarted worker" {:id x-id})
            (bump! :restore)))))
    (bump! :schedules)
    {:gone {vx #{sx}} :derived {} :derived-txs #{} :delivered #{} :keys (if (if ok on? false) (if x-id [x-id] []) [])}))

(defn- native-clear
  "Every native datom (history included) whose string holds one of `values` in clear: an exact scan (era2/gate.clj's
  foreign-copies matches SECRET-[A-Za-z0-9_-]+, which stops at the ':' of a held subject's name, so it cannot see these
  values)."
  [conn values]
  (let [db (d/history (d/db conn))]
    (vec (for [x (d/datoms db :eavt) :when (string? (:v x)) v values :when (str/includes? (:v x) v)]
           [v (:e x) (str (d/ident db (:a x)))]))))

(defn fuzz [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [kb (range (quot (+ n block -1) block))]
      (g/fresh-scope true
        (fn [src conn]
          (offers/in-scope
            (fn [rcp rconn]
              ;; [DX-ERA4, after DX-ERA5's B1] with the option, the source requires sealed derived documents
              (when on?
                (x/oracle! "E4 setting" (= 200 (:status (offers/route src "v2" "derived-seal-required" {})))
                           "the setting is recorded" nil))
              (let [results (vec (for [i (range (* kb block) (min n (* (inc kb) block)))]
                                   (try (run-schedule! src rcp conn rconn run i r)
                                        (catch Throwable e
                                          (reset! x/plan nil)
                                          (x/oracle! (str "E4 " arm " " i) false (str "schedule stopped: " (.getMessage e)))
                                          nil))))
                    gone (apply merge-with into {} (keep :gone results))
                    ;; (5) every removed assertion's key of the block is deleted, within 5 s of the block's end
                    keys-x (vec (mapcat :keys (remove nil? results)))
                    deadline (+ (System/currentTimeMillis) 5000)
                    _ (loop [] (when (if (some #(privacy/exists? (key-file src %)) keys-x) (< (System/currentTimeMillis) deadline) false)
                                 (Thread/sleep 100) (recur)))
                    left (filterv #(privacy/exists? (key-file src %)) keys-x)]
                (bump! :keys-checked (count keys-x))
                (x/oracle! (str "E4 block " kb) (empty? left)
                           "every removed assertion's key of the block is deleted within 5 s of its end" {:left (count left)})
                ;; (6) strict: no derived copy is allowed, before or after the removal's position
                (x/block-checks! src conn (str "E4 block " kb) gone {} #{})
                (doseq [[label c] [["source" conn] ["recipient" rconn]]]
                  (let [hits (native-clear c (keys gone))]
                    (bump! :native-clear label (count hits))
                    (x/oracle! (str "E4 block " kb " " label) (empty? hits)
                               "no native datom holds a removed value in clear (exact scan)" (take 3 hits))))
                (#'k/recipient-checks! rcp rconn (str "E4 block " kb " recipient") gone #{})
                (println "ERA4_PROGRESS" arm (pr-str {:block kb :schedules (get @tally [:schedules]) :violations (count @x/violations)}))))))))))

(defn cost
  "[DX-ERA4] Gate (g): a subject with N sealed derived copies (each its own document, all made before the removal); the
  removal's own work (its reply, its native transaction's datoms, its identities, wall time: diagnostic) for N = 0, 10,
  100 and 1,000, then every copy opened. With the option a removal visits no derived copy, so nothing here should grow
  with N except the time to open the copies afterwards."
  []
  (doseq [n [0 10 100 1000]]
    (g/fresh-scope true
      (fn [src conn]
        (let [sx (format "acct/kc/pl:%08d" n) vx (g/secret sx (str "cost" n))
              fx (g/frame (str "cx-" n) sx vx nil nil)
              _ (offers/send src fx)
              wire (seal! src (protected-id fx) (str "derived:" vx))
              t (g/seq-now src conn)
              wrote (count (filter #(= 200 (:status %))
                                   (for [j (range n)]
                                     (offers/send src (assoc (g/save-frame (str "cd-" n "-" j) (str "settlement-values-kc:answer:" j)
                                                                           ":notice/body" wire nil nil) "erasureSeq" t "erasureAccounts" ["kc"])))))
              before (g/head conn)
              basis (d/basis-t (d/db conn))
              t0 (System/nanoTime)
              reply (x/erase! src (str "cr-" n) [{"entityId" sx "attribute" ":v"}])
              ms (/ (- (System/nanoTime) t0) 1e6)
              db (d/db conn)
              tx-datoms (reduce + 0 (map (comp count :data) (d/tx-range (d/log conn) (inc basis) nil)))
              t1 (System/nanoTime)
              opened (vec (for [j (range n)] (second (open! src wire))))
              open-ms (/ (- (System/nanoTime) t1) 1e6)]
          (x/oracle! (str "cost " n) (= 200 (:status reply)) "the removal completes" (offers/outcome reply))
          (x/oracle! (str "cost " n) (every? #(contains? % "removed") opened) "every copy opens as removed" nil)
          (println "ERA4_COST" (pr-str {:copies n :written wrote :removal-ms (Math/round ^double ms)
                                        :identities (count (get-in reply [:body "identities"])) :removal-positions (- (g/head conn) before) :removal-datoms tx-datoms
                                        :tries (get-in reply [:body "tries"]) :open-all-ms (Math/round ^double open-ms)})))))))

;; ---- [DX-ERA4, after DX-ERA2's third pass] phase `checks`: e9 as the option writes copies, the caller's reliance,
;; the cross-database window, and the option's answers at every stop point of a removal (P1 to P7) ----------------

(defn- install-declare-hooks!
  "Stops before and after the declaration (DX-ERA2's third pass: intent, declaration, selection and commit, publication),
  through era3/attack.clj's plan, as era3/attack2.clj stops after it."
  []
  (let [declare rc/declare!]
    (alter-var-root #'rc/declare!
      (fn [_] (fn [& args]
                (@#'x/stop! :before-declare)
                (let [r (apply declare args)] (@#'x/stop! :after-declare) r))))))

(defn- seed-x!
  "A protected value of `owner` saved on its own; [value assertion-ids]."
  [src cmd owner tag]
  (let [v (g/secret owner tag) f (g/frame cmd owner v nil nil) rep (offers/send src f)]
    (x/oracle! "seed" (= 200 (:status rep)) "the seed save" (offers/outcome rep))
    [v (protected-id f)]))

(defn- key-gone? [src ids]
  (loop [n 0]
    (cond (not-any? #(privacy/exists? (key-file src %)) ids) true
          (> n 50) false
          :else (do (Thread/sleep 100) (recur (inc n))))))

(defn- journal-text [src] (g/text (:body (offers/route src "v2" "transactions" {"after" 0 "limit" 1000}))))

(defn- derived-copy [src cmd doc content t]
  (cond-> (assoc (g/save-frame cmd doc ":notice/body" content nil nil) "erasureSeq" t)
    k/after? (assoc "erasureAccounts" ["a"])))

(defn e9s
  "The second review's e9 (era3/attack2.clj, REVIEW-2 E9), with the copy made the way this option's derived writers make
  it: sealed through the derived-seal route under the protected assertion it read, then recorded in a derived document
  BEFORE the removal. Green means: after the acknowledgement the copy is not readable in its document, its journal or
  any native datom, opening it answers removed, and the assertion's key is gone. Also: the review's unsealed setting,
  where the option refuses to seal (an unsealed scope keeps the removed bytes; section 1)."
  []
  (g/fresh-scope true
    (fn [name conn]
      (let [lbl "E9s derived copy recorded before the removal, sealed by the option"
            [vx ids-x] (seed-x! name "e9s-x" g/a1 "e9s") [vy ids-y] (seed-x! name "e9s-y" g/b1 "e9s")
            cx (seal! name ids-x (str "derived:" vx)) cy (seal! name ids-y (str "derived:" vy))
            w (offers/send name (derived-copy name "e9-f" "notice:v1:e9" cx (g/seq-now name conn)))
            wy (offers/send name (assoc (g/save-frame "e9-fy" "notice:v1:e9y" ":notice/body" cy nil nil)
                                        "erasureSeq" (g/seq-now name conn) "erasureAccounts" ["b"]))
            removed (x/remove-attr! name "e9-rm" g/a1)
            gone (key-gone? name ids-x)
            detail {:frame-before (offers/outcome w) :removal (offers/outcome removed) :key-gone gone
                    :copy-readable-after-ack (str/includes? (x/read-text name "notice:v1:e9") vx)
                    :copy-in-journal (str/includes? (journal-text name) vx)
                    :native-copies (count (g/raw-occurrences conn vx))
                    :opened (second (open! name cx)) :kept-opened (second (open! name cy))}]
        (x/observe! lbl :detail detail)
        (println "ERA4_E9S" (pr-str (dissoc detail :kept-opened)))
        (x/oracle! lbl (= [200 nil] (offers/outcome w)) "the sealed copy is recorded before the removal" detail)
        (x/oracle! lbl (= 200 (:status removed)) "the removal completes" detail)
        (x/oracle! lbl (not (:copy-readable-after-ack detail))
                   "TARGETS 7.3: erasure reaches every copy of a protected value or anything derived from it" detail)
        (x/oracle! lbl (not (:copy-in-journal detail)) "the copy's journal holds no clear copy" detail)
        (x/oracle! lbl (zero? (:native-copies detail)) "no native datom holds the removed value in clear" detail)
        (x/oracle! lbl (contains? (:opened detail) "removed") "the recorded copy opens as removed" detail)
        (x/oracle! lbl gone "the removed assertion's key is deleted" detail)
        (x/oracle! lbl (= (str "derived:" vy) (get (:kept-opened detail) "value")) "another subject's copy still opens" detail))))
  (g/fresh-scope false
    (fn [name conn]
      (let [[vx ids-x] (seed-x! name "e9u-x" g/a1 "e9u")
            r (offers/route name "v2" "derived-seal" {"items" [{"ids" ids-x "value" (str "derived:" vx)}]})]
        (println "ERA4_E9S_UNSEALED" (pr-str (offers/outcome r)))
        (x/oracle! "E9s unsealed" (= [409 "DerivedSealNeedsSealedScope"] (offers/outcome r))
                   "on an unsealed scope the option refuses to seal (no key exists that a removal destroys)" (offers/outcome r))))))

(defn e6s
  "The caller's reliance, shown (as the second review showed E6 for tickets): a copy of X's value sealed naming only Y's
  assertion (fewer assertions than its derivation read) is not reached by X's removal. Observed, not an oracle: the
  option relies on the caller naming every row it read (DERIVED-COPIES.md section 7)."
  []
  (g/fresh-scope true
    (fn [name conn]
      (let [[vx _] (seed-x! name "e6s-x" g/a1 "e6s") [_ ids-y] (seed-x! name "e6s-y" g/b1 "e6s")
            wrong (seal! name ids-y (str "derived:" vx))
            removed (x/remove-attr! name "e6s-rm" g/a1)
            opened (second (open! name wrong))
            survives (= (str "derived:" vx) (get opened "value"))]
        (println "ERA4_E6S" (pr-str {:removal (offers/outcome removed) :copy-named-fewer-survives survives}))
        (bump! :e6s (if survives :copy-survives :reached))))))

(defn window
  "DX-ERA2 15.8's cross-database window, on this option: a delivery's recipient transaction prepared under the source's
  current ticket, captured before the source's removal and submitted to the recipient's Datomic after the removal was
  acknowledged (bypassing every gateway check, as a delivery whose wait expired). With a clear copy (as today) the late
  copy is readable in the recipient; with a sealed copy it must be harmless: committed, but holding no clear value in
  the recipient's routes or datoms, and opening it through the source answers removed."
  []
  (doseq [sealed-copy? [false true]]
    (g/fresh-scope true
      (fn [src sconn]
        (offers/in-scope
          (fn [rcp rconn]
            (let [lbl (str "window " (if sealed-copy? "sealed copy" "clear copy"))
                  [vx ids-x] (seed-x! src (str "win-x-" sealed-copy?) g/a1 "win")
                  content (if sealed-copy? (seal! src ids-x (str "derived:" vx)) (str "derived:" vx))
                  input (assoc (derived-copy src "dw-late" "notice:v1:dw-late" content (g/seq-now src sconn))
                               "erasureSourceDatabase" src)
                  ;; the recipient's first write installs what a database needs; only the delivery itself is held back
                  warm (offers/send rcp (g/frame (str "win-warm-" sealed-copy?) "acct/c/warm" "warm" nil nil))
                  _ (x/oracle! lbl (= 200 (:status warm)) "the recipient takes a plain save first" (offers/outcome warm))
                  captured (atom nil) submit d/transact-async
                  _ (with-redefs [d/transact-async (fn [c data & more]
                                                     (if (nil? @captured)
                                                       (do (reset! captured data) (future (throw (ex-info "held back" {}))))
                                                       (apply submit c data more)))]
                      (offers/send rcp input))
                  removed (x/remove-attr! src (str "dw-rm-" sealed-copy?) g/a1)
                  gone (key-gone? src ids-x)
                  landed (if @captured
                           (try @(d/transact-async rconn @captured) :committed (catch Exception e (.getMessage e)))
                           :nothing-captured)
                  txt (g/text (:body (offers/route rcp "v1" "read" {"entityIds" ["notice:v1:dw-late"]})))
                  wire (first (re-seq #"tdx[12]\.[A-Za-z0-9_.-]+" txt))
                  detail {:sealed-copy sealed-copy? :source-removal (offers/outcome removed) :key-gone gone
                          :late-recipient-transaction landed
                          :copy-readable-in-recipient-after-ack (str/includes? txt vx)
                          :recipient-journal-clear (str/includes? (journal-text rcp) vx)
                          :native-clear-recipient (count (native-clear rconn [vx]))
                          :native-clear-source (count (native-clear sconn [vx]))
                          :sealed-copy-landed (some? wire)
                          :opened-through-source (when wire (second (open! src wire)))
                          :opened-through-recipient (when wire (offers/outcome (offers/route rcp "v2" "derived-open" {"items" [wire]})))}]
              (println "ERA4_WINDOW" (pr-str detail))
              (bump! :window (if sealed-copy? :sealed :clear) (if (:copy-readable-in-recipient-after-ack detail) :readable :unreadable))
              (x/oracle! lbl (= 200 (:status removed)) "the source's removal completes" detail)
              (when sealed-copy?
                (x/oracle! lbl (= :committed landed) "the window is still open: the late transaction commits (as DX-ERA2 15.8)" detail)
                (x/oracle! lbl (:sealed-copy-landed detail) "what landed is the sealed copy" detail)
                (x/oracle! lbl (not (:copy-readable-in-recipient-after-ack detail)) "the late copy is not readable in the recipient" detail)
                (x/oracle! lbl (not (:recipient-journal-clear detail)) "nor in the recipient's journal" detail)
                (x/oracle! lbl (zero? (:native-clear-recipient detail)) "no recipient datom holds the value in clear" detail)
                (x/oracle! lbl (zero? (:native-clear-source detail)) "no source datom holds the value in clear" detail)
                (x/oracle! lbl (contains? (:opened-through-source detail) "removed") "opened through its source it answers removed" detail)
                (x/oracle! lbl gone "the source assertion's key is deleted" detail)))))))))

(def stop-points
  "DX-ERA2 REMOVAL-PER-ACCOUNT.md 15.2: the stop after which the removal is left (nil: it runs to its answer)."
  [["P1" :before-declare] ["P2" :after-declare] ["P3" :after-guard :after-declare] ["P4-not-landed" :before-native]
   ["P5" :after-native] ["P6" :at-publish] ["P7" nil]])

(defn stop-checks
  "At each stop point of DX-ERA2's third pass: what this option's routes answer while the removal is left there (open a
  copy recorded before it, seal its assertion again, the plain read of the value itself, a derived write of a new
  sealed copy), who completes it, and, after the acknowledgement, that every copy is unreadable and the key is gone."
  []
  (doseq [[p stop pre] stop-points]
    (g/fresh-scope true
      (fn [src conn]
        (let [lbl (str "stop " p)
              [vx ids-x] (seed-x! src (str "st-x-" p) g/a1 (str "st" p)) [vy ids-y] (seed-x! src (str "st-y-" p) g/b1 (str "st" p))
              cx (seal! src ids-x (str "derived:" vx)) cy (seal! src ids-y (str "derived:" vy))
              t (g/seq-now src conn)
              w0 (offers/send src (derived-copy src (str "st-w0-" p) "notice:v1:st-x" cx t))
              cmd (str "st-rm-" p) sel [{"entityId" g/a1 "attribute" ":v"}]
              ;; P3 (the subject guard) is reached only by a resumed removal: since DX-ERA2's fourth pass (M3) a removal
              ;; resumed after a stop takes its subject guard before its first commit attempt; so the removal is first
              ;; stopped after its declaration, then resent and stopped right after the guard
              pre-reply (when pre (reset! x/plan {:stop pre :stops-left 1}) (x/erase! src cmd sel))
              _ (reset! x/plan (when stop {:stop stop :stops-left 1}))
              first-reply (x/erase! src cmd sel)
              fired (and stop (zero? (long (:stops-left @x/plan 1))))
              _ (reset! x/plan nil)
              pending-at-stop (some? (privacy/pending src))
              at-stop {:open-copy (let [[s o] (open! src cx)] [s (cond (contains? o "removed") :removed (contains? o "value") :value :else o)])
                       :seal-again (let [i (first (get-in (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" "probe"}]}) [:body "items"]))]
                                     (cond (contains? i "removed") :removed (contains? i "sealed") :sealed :else i))
                       :plain-read-has-value (str/includes? (x/read-text src g/a1) vx)
                       :key-present (some #(privacy/exists? (key-file src %)) ids-x)}
              w1 (offers/send src (derived-copy src (str "st-w1-" p) "notice:v1:st-x1" (seal! src ids-y (str "derived:" vy)) t))
              pending-after-w1 (some? (privacy/pending src))
              final (loop [n 0 reply first-reply]
                      (if (or (= 200 (:status reply)) (>= n 3)) reply (recur (inc n) (x/erase! src cmd sel))))
              gone (key-gone? src ids-x)
              after {:open-copy (second (open! src cx)) :seal-again (first (get-in (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" "probe"}]}) [:body "items"]))
                     :doc-has-value (str/includes? (x/read-text src "notice:v1:st-x") vx)
                     :journal-has-value (str/includes? (journal-text src) vx)
                     :native-clear (count (native-clear conn [vx]))
                     :kept-opens (= (str "derived:" vy) (get (second (open! src cy)) "value"))}
              row {:p p :stop stop :pre (some-> pre-reply offers/outcome) :boundary (if rc/may-turn-on :commit :log) :stop-fired (boolean fired) :first (offers/outcome first-reply) :pending-at-stop pending-at-stop
                   :at-stop at-stop :derived-write-at-stop (offers/outcome w1) :completed-by-that-refusal (and pending-at-stop (not pending-after-w1))
                   :final (offers/outcome final) :key-gone gone :after (update after :open-copy #(if (contains? % "removed") :removed %))
                   :seal-again-after (if (contains? (:seal-again after) "removed") :removed (:seal-again after))}]
          (println "ERA4_STOP" (pr-str (dissoc row :after :seal-again-after)) (pr-str (select-keys after [:doc-has-value :journal-has-value :native-clear :kept-opens])))
          (bump! :stop p (if fired :fired :not-reached))
          (x/oracle! lbl (= [200 nil] (offers/outcome w0)) "the copy is recorded before the removal" (offers/outcome w0))
          (x/oracle! lbl (= 200 (:status final)) "the removal completes" row)
          (x/oracle! lbl (contains? (:open-copy after) "removed") "after the acknowledgement the copy opens as removed" row)
          (x/oracle! lbl (contains? (:seal-again after) "removed") "after the acknowledgement the assertion seals nothing" row)
          (x/oracle! lbl (not (:doc-has-value after)) "the copy's document holds no clear value" row)
          (x/oracle! lbl (not (:journal-has-value after)) "the journal holds no clear value" row)
          (x/oracle! lbl (zero? (:native-clear after)) "no native datom holds the value in clear" row)
          (x/oracle! lbl (:kept-opens after) "another subject's copy still opens" row)
          (x/oracle! lbl gone "the key is deleted" row)
          ;; while the removal is left at its stop it is not yet acknowledged: whatever opens then is a read that started
          ;; before the publication (TARGETS 7.1); recorded in the table. After the third review (M1) a copy opens as
          ;; removed from the removal's native commit, before the plain read stops answering at the publication: a
          ;; copy never opens where the plain read no longer answers the value
          ;; Since DX-ERA2's fourth pass the plain read stops answering at the native commit too (the commit boundary
          ;; masks from the commit; on the log's boundary a read that finds the removal committed publishes it first),
          ;; so the check is two-sided again: a copy opens exactly while the plain read answers the value
          (when pending-at-stop
            (x/oracle! lbl (= (= :value (second (:open-copy at-stop))) (:plain-read-has-value at-stop))
                       "while pending, a copy opens exactly while the plain read answers the value" row)))))))

(defn- copy-dir!
  "era3/attack2.clj's: replace the files of `to` by those of `from` (one flat directory: the file authority's scope)."
  [^java.nio.file.Path from ^java.nio.file.Path to]
  (Files/createDirectories to (make-array java.nio.file.attribute.FileAttribute 0))
  (with-open [st (Files/list to)] (doseq [p (iterator-seq (.iterator st))] (Files/delete p)))
  (with-open [st (Files/list from)]
    (doseq [p (iterator-seq (.iterator st))]
      (Files/copy ^java.nio.file.Path p (.resolve to (.getFileName ^java.nio.file.Path p))
                  (into-array java.nio.file.CopyOption [java.nio.file.StandardCopyOption/REPLACE_EXISTING])))))

(defn m1
  "The third review's M1 (era3/REVIEW-3.md, its `k6`), for this option's copies: the file authority's directory (the
  removal log and the key files together) put back to a copy taken while the removal was pending, after the removal
  was published, acknowledged and its key deleted. A sealed copy must still open as removed and its assertion seal
  nothing, whatever the plain read answers then (k6: it answers the value on `3edb9f5d9`)."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "M1 a pending-state copy of the authority put back after the acknowledgement"
            sel [{"entityId" g/a1 "attribute" ":v"}]
            [vx ids-x] (seed-x! src "m1-x" g/a1 "m1") [vy ids-y] (seed-x! src "m1-y" g/b1 "m1")
            cx (seal! src ids-x (str "derived:" vx)) cy (seal! src ids-y (str "derived:" vy))
            t (g/seq-now src conn)
            w0 (offers/send src (derived-copy src "m1-w0" "notice:v1:m1" cx t))
            dir (.getParent (privacy/path src "head.json"))
            snap (java.nio.file.Paths/get "/tmp" (into-array String [(str "era4-m1-" (java.util.UUID/randomUUID))]))
            _ (reset! x/plan {:stop :after-declare :stops-left 1})
            stopped (x/erase! src "m1-rm" sel)
            _ (reset! x/plan nil)
            pending-in-copy (some? (privacy/pending src))
            _ (copy-dir! dir snap)
            done (x/erase! src "m1-rm" sel)
            gone (key-gone? src ids-x)
            opened-after-ack (second (open! src cx))
            _ (copy-dir! snap dir)
            _ (reset! privacy/cache {})
            key-back (boolean (some #(privacy/exists? (key-file src %)) ids-x))
            plain (str/includes? (x/read-text src g/a1) vx)
            opened (second (open! src cx))
            again (first (get-in (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" "probe"}]}) [:body "items"]))
            kept (second (open! src cy))
            w1 (offers/send src (derived-copy src "m1-w1" "notice:v1:m1b" cy t))
            plain-after (str/includes? (x/read-text src g/a1) vx)
            opened-after (second (open! src cx))
            gone-again (key-gone? src ids-x)
            detail {:stopped (offers/outcome stopped) :pending-in-copy pending-in-copy :acknowledged (offers/outcome done)
                    :key-gone-after-ack gone :opened-after-ack opened-after-ack :key-back-with-the-copy key-back
                    :plain-read-answers-value-after-restore plain :opened-after-restore opened :seal-after-restore again
                    :kept-opens (get kept "value") :derived-write-after-restore (offers/outcome w1)
                    :plain-read-after-that plain-after :opened-after-that opened-after :restored-key-deleted-again gone-again}]
        (println "ERA4_M1" (pr-str (dissoc detail :kept-opens)))
        (bump! :m1 :plain-read (if plain :value :masked))
        (bump! :m1 :restored-key (if gone-again :deleted-again :kept))
        (x/oracle! lbl (= [200 nil] (offers/outcome w0)) "the copy is recorded before the removal" detail)
        (x/oracle! lbl pending-in-copy "the copy of the authority holds the removal pending" detail)
        (x/oracle! lbl (= 200 (:status done)) "the removal is acknowledged" detail)
        (x/oracle! lbl (contains? opened-after-ack "removed") "after the acknowledgement the copy opens as removed" detail)
        (x/oracle! lbl key-back "the restore brought the key file back (the case is real)" detail)
        (x/oracle! lbl (contains? opened "removed") "after the restore the copy still opens as removed (no reopening through a copy)" detail)
        (x/oracle! lbl (contains? again "removed") "after the restore the assertion still seals nothing" detail)
        (x/oracle! lbl (= (str "derived:" vy) (get kept "value")) "another subject's copy still opens" detail)
        (x/oracle! lbl (contains? opened-after "removed") "after the next derived write the copy still opens as removed" detail)))))

(defn log-states
  "DX-ERA2's fourth pass (`removal-log-rebuild`), for this option's routes: the file authority's directory (the removal
  log and the key files) put back to a copy taken BEFORE the removal, after it was acknowledged and its key deleted (the
  log behind the data, X's key back); the rebuild route; then the directory emptied (the log and every key file
  missing); the rebuild route with the policy. The gateway's verified-head memory is cleared at each step, as by a
  restart. In no state may a copy of X's value open or X's assertion seal anything."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl (str "log states " (if rc/may-turn-on "commit" "log"))
            sel [{"entityId" g/a1 "attribute" ":v"}]
            [vx ids-x] (seed-x! src "ls-x" g/a1 "ls") [vy ids-y] (seed-x! src "ls-y" g/b1 "ls")
            cx (seal! src ids-x (str "derived:" vx)) cy (seal! src ids-y (str "derived:" vy))
            dir (.getParent (privacy/path src "head.json"))
            snap (java.nio.file.Paths/get "/tmp" (into-array String [(str "era4-ls-" (java.util.UUID/randomUUID))]))
            _ (copy-dir! dir snap)
            done (x/erase! src "ls-rm" sel)
            gone (key-gone? src ids-x)
            word (fn [o] (cond (contains? o "removed") :removed (contains? o "value") :VALUE (contains? o "sealed") :SEALED
                               :else (get o "code" (pr-str o))))
            probe (fn []
                    (let [o (offers/route src "v2" "derived-open" {"items" [cx]})
                          sx (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" "probe"}]})
                          oy (offers/route src "v2" "derived-open" {"items" [cy]})
                          r (offers/route src "v1" "read" {"entityIds" [g/a1]})
                          one (fn [rep] [(:status rep) (if (= 200 (:status rep)) (word (first (get-in rep [:body "items"]))) (get-in rep [:body "code"]))])]
                      {:open-x (one o) :seal-x (one sx) :open-y (one oy)
                       :plain-read [(:status r) (if (= 200 (:status r)) (str/includes? (g/text (:body r)) vx) (get-in r [:body "code"]))]}))
            _ (copy-dir! snap dir)
            _ (reset! privacy/cache {})
            key-back (boolean (some #(privacy/exists? (key-file src %)) ids-x))
            behind (probe)
            rebuild-behind (offers/route src "v2" "removal-log-rebuild" {})
            after-behind (probe)
            key-after-rebuild (boolean (some #(privacy/exists? (key-file src %)) ids-x))
            _ (with-open [st (Files/list dir)] (doseq [q (iterator-seq (.iterator st))] (Files/delete q)))
            _ (reset! privacy/cache {})
            missing (probe)
            rebuild-missing (offers/route src "v2" "removal-log-rebuild" {"attributes" [":v"] "sealed" true})
            after-missing (probe)
            states {:acknowledged (offers/outcome done) :key-gone gone :key-back-with-the-copy key-back
                    :behind behind :rebuild-behind [(:status rebuild-behind) (:body rebuild-behind)] :after-rebuild-behind after-behind
                    :restored-key-still-there-after-rebuild key-after-rebuild
                    :missing missing :rebuild-missing [(:status rebuild-missing) (:body rebuild-missing)] :after-rebuild-missing after-missing}]
        (println "ERA4_LOGSTATES" (if rc/may-turn-on "commit" "log") (pr-str states))
        (bump! :log-states (if rc/may-turn-on :commit :log) :restored-key (if key-after-rebuild :kept :deleted))
        (x/oracle! lbl (= 200 (:status done)) "the removal is acknowledged" states)
        (x/oracle! lbl gone "its key is deleted" states)
        (doseq [[k st] (select-keys states [:behind :after-rebuild-behind :missing :after-rebuild-missing])]
          (x/oracle! lbl (not= :VALUE (second (:open-x st))) "no log state opens a copy of the removed value" {:state k :probe st})
          (x/oracle! lbl (not= :SEALED (second (:seal-x st))) "no log state lets the removed assertion seal" {:state k :probe st}))
        (x/oracle! lbl (= 200 (:status rebuild-behind)) "the rebuild route catches up a log behind the data" states)
        (x/oracle! lbl (= [200 :removed] (:open-x after-behind)) "after that rebuild the copy opens as removed" states)
        (x/oracle! lbl (= [200 :VALUE] (:open-y after-behind)) "after that rebuild another subject's copy opens" states)
        (x/oracle! lbl (= 200 (:status rebuild-missing)) "the rebuild route writes a missing log from the policy" states)
        (x/oracle! lbl (= [200 :removed] (:open-x after-missing)) "after a missing log is rebuilt the copy opens as removed" states)))))

(defn- packed [v]
  ;; notify1/store.ts `pack`: deflate (raw) of the canonical JSON, in base64
  (let [d (java.util.zip.Deflater. 9 true) in (.getBytes (json/write-str v) "UTF-8") out (java.io.ByteArrayOutputStream.) buf (byte-array 65536)]
    (.setInput d in) (.finish d)
    (loop [] (let [n (.deflate d buf)] (when (pos? n) (.write out buf 0 n)) (when-not (.finished d) (recur))))
    (.end d)
    (.encodeToString (java.util.Base64/getEncoder) (.toByteArray out))))
(defn- doc-write
  ;; one derived document written as Documents.put writes it: attribute notice/value, its canonical JSON as a string
  ([src cmd key value] (doc-write src cmd key value (apply str (repeat 64 "a"))))
  ([src cmd key value hex]
   (offers/send src (g/save-frame cmd (str "notice:v1:" hex ":" key) "notice/value" (json/write-str value) nil nil))))

(defn setting
  "[DX-ERA4, after DX-ERA5's B1 and M3] The one-way database setting `derived-seal-required` and the write route's check:
  with it a derived document whose content is not sealed is refused whatever the client sends, a sealed one is
  accepted, and a gateway of this build without the option refuses the database."
  []
  (g/fresh-scope true
    (fn [src conn]
      (let [lbl "setting"
            [vx ids-x] (seed-x! src "set-x" g/a1 "set")
            place "a|pl:00000001"
            sealed (first (get-in (offers/route src "v2" "derived-seal" {"items" [{"ids" ids-x "value" (str "derived:" vx) "place" place}]}) [:body "items"]))
            wire (get sealed "sealed")
            frame (fn [unit] {"identity" "i" "frame" 1 "start" 0 "part" 0 "through" 1 "tail" 0 "previous" "p"
                              "bytes" (packed [{"subject" "pl:00000001" "changes" [unit]}])})
            before-clear (offers/outcome (doc-write src "set-w0" "answer:1:f1" (frame ["k" (str "derived:" vx)])))
            required (offers/route src "v2" "derived-seal-required" {})
            again (offers/outcome (offers/route src "v2" "derived-seal-required" {}))
            clear-unit (offers/outcome (doc-write src "set-w1" "answer:1:f2" (frame ["k" (str "derived:" vx)])))
            fake-unit (offers/outcome (doc-write src "set-w2" "answer:1:f3" (frame ["" (str "tdx2.not-a-record")])))
            sealed-unit (offers/outcome (doc-write src "set-w3" "answer:1:f4" (frame ["" wire])))
            removed-unit (offers/outcome (doc-write src "set-w4" "answer:1:f5" (frame ["" nil])))
            packet-clear (offers/outcome (doc-write src "set-w5" "recorded-notices:1"
                                                    (packed {"deliveries" [{"subject" "pl:00000001" "generation" 0 "sealed" (str "derived:" vx)}]})))
            packet-sealed (offers/outcome (doc-write src "set-w6" "recorded-notices:2"
                                                     (packed {"deliveries" [{"subject" "pl:00000001" "generation" 0 "sealed" wire}]})))
            ledger-clear (offers/outcome (doc-write src "set-w7" "recorded-ledger:pl:00000001" (packed [{"id" "x" "payload" vx}])))
            state-sealed (offers/outcome (doc-write src "set-w8" "receiver:o:pl:00000001" (packed {"g" 0 "e" [wire]})))
            other-doc (offers/outcome (doc-write src "set-w9" "census" {"count" 1}))
            ;; an entry that carries the clear answer beside sealed changes, the unframed page (its entries' `json`), and a
            ;; packet with a field the recorder never writes
            json-entry (offers/outcome (doc-write src "set-w10" "answer:1:f6"
                                                  (assoc (frame ["" wire]) "bytes"
                                                         (packed [{"subject" "pl:00000001" "changes" [["" wire]] "json" (str "{\"e\":\"" vx "\"}")}]))))
            unframed (offers/outcome (doc-write src "set-w11" "answer:1:0"
                                                {"identity" "i" "start" 0 "through" 1 "previous" "p"
                                                 "bytes" (packed [{"subject" "pl:00000001" "changes" [] "json" (str "{\"e\":\"" vx "\"}")}])}))
            packet-extra (offers/outcome (doc-write src "set-w12" "recorded-notices:3"
                                                    (packed {"note" vx "deliveries" [{"subject" "pl:00000001" "generation" 0 "sealed" wire}]})))
            off-gateway (with-redefs [main/derived-seal-on false]
                          (offers/outcome (offers/route src "v1" "read" {"entityIds" [g/a1]})))
            row {:clear-before-the-setting before-clear :required [(:status required) (:body required)] :again again
                 :clear-unit clear-unit :fake-unit fake-unit :sealed-unit sealed-unit :removed-unit removed-unit
                 :packet-clear packet-clear :packet-sealed packet-sealed :ledger-clear ledger-clear :state-sealed state-sealed
                 :content-free-document other-doc :gateway-without-the-option off-gateway
                 :json-entry json-entry :unframed-page unframed :packet-extra-field packet-extra}]
        (println "ERA4_SETTING" (pr-str row))
        (x/oracle! lbl (= [200 nil] before-clear) "before the setting a clear unit is accepted (today's behaviour)" row)
        (x/oracle! lbl (= 200 (:status required)) "the setting is recorded" row)
        (x/oracle! lbl (= [200 nil] again) "recording it again is harmless" row)
        (doseq [[k o] {:clear-unit clear-unit :fake-unit fake-unit :packet-clear packet-clear :ledger-clear ledger-clear
                       :json-entry json-entry :unframed-page unframed :packet-extra-field packet-extra}]
          (x/oracle! lbl (= [409 "DerivedRecordUnsealed"] o) (str "with the setting an unsealed derived document is refused: " (name k)) row))
        (doseq [[k o] {:sealed-unit sealed-unit :removed-unit removed-unit :packet-sealed packet-sealed :state-sealed state-sealed
                       :content-free-document other-doc}]
          (x/oracle! lbl (= [200 nil] o) (str "with the setting a sealed or content-free document is accepted: " (name k)) row))
        (x/oracle! lbl (= [503 "DerivedSealRequired"] off-gateway) "a gateway without the option refuses the database" row)))))

(defn main []
  (x/install-hooks!)
  (install-declare-hooks!)
  (envelope/start!)
  (case (System/getenv "ERA4_PHASE")
    "cost" (cost)
    "checks" (do (e9s) (e6s) (window) (stop-checks) (m1) (log-states) (setting))
    (fuzz (or (System/getenv "ERA4_RUN") "e0") (Long/parseLong (or (System/getenv "ERA4_N") "200"))
          (Long/parseLong (or (System/getenv "ERA4_BLOCK") "50")) (Long/parseLong (or (System/getenv "ERA4_SEED") "1"))))
  (println "ERA4_TALLY" arm (pr-str (into (sorted-map) (map (fn [[kk v]] [(pr-str kk) v])) @tally)))
  (println "ERA4_VIOLATIONS" arm (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 5 @x/violations)] (println "ERA4_VIOLATION" (pr-str v)))
  (println "ERA4_SUMMARY" arm (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
