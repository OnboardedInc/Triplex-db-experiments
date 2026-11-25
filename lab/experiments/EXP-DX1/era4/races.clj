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
        replies (atom {}) reached (atom #{})
        send! (fn [w] (offers/send (if (= :delivery (:kind w)) rcp src) (body src w t (:content w))))
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
                   {:kind (:kind w) :at (:at w) :outcome (get outcomes (:cmd w))})))
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
          (doseq [wire (re-seq #"tdx1\.[A-Za-z0-9_.-]+" txt)]
            (x/oracle! label (contains? (second (open! src wire)) "removed") "what a pinned reader read cannot be opened" {:doc (:doc w)}))))
      ;; (5) the key is deleted; a key restored from a copy taken before the removal is deleted again
      (when x-id
        (let [gone? (fn [] (loop [n 0] (cond (not (privacy/exists? (key-file src x-id))) true (> n 50) false
                                              :else (do (Thread/sleep 100) (recur (inc n))))))]
          (x/oracle! label (gone?) "the removed assertion's key is deleted within 5 s" {:id x-id})
          (when (and restore? backup)
            (Files/write (key-file src x-id) ^bytes backup (into-array OpenOption [StandardOpenOption/CREATE StandardOpenOption/WRITE]))
            (reset! envelope/shredded {})
            (x/oracle! label (contains? (second (open! src cx)) "removed") "with the key restored, the published removal still decides" nil)
            (x/oracle! label (gone?) "a restored key is deleted again by the restarted worker" {:id x-id})
            (bump! :restore)))))
    (bump! :schedules)
    {:gone {vx #{sx}} :derived {} :derived-txs #{} :delivered #{}}))

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
              (let [results (vec (for [i (range (* kb block) (min n (* (inc kb) block)))]
                                   (try (run-schedule! src rcp conn rconn run i r)
                                        (catch Throwable e
                                          (reset! x/plan nil)
                                          (x/oracle! (str "E4 " arm " " i) false (str "schedule stopped: " (.getMessage e)))
                                          nil))))
                    gone (apply merge-with into {} (keep :gone results))]
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

(defn main []
  (x/install-hooks!)
  (envelope/start!)
  (if (= "cost" (System/getenv "ERA4_PHASE"))
    (cost)
    (fuzz (or (System/getenv "ERA4_RUN") "e0") (Long/parseLong (or (System/getenv "ERA4_N") "200"))
          (Long/parseLong (or (System/getenv "ERA4_BLOCK") "50")) (Long/parseLong (or (System/getenv "ERA4_SEED") "1"))))
  (println "ERA4_TALLY" arm (pr-str (into (sorted-map) (map (fn [[kk v]] [(pr-str kk) v])) @tally)))
  (println "ERA4_VIOLATIONS" arm (pr-str (frequencies (map :message @x/violations))))
  (doseq [v (take 5 @x/violations)] (println "ERA4_VIOLATION" (pr-str v)))
  (println "ERA4_SUMMARY" arm (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
