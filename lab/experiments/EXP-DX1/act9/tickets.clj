(ns act9-tickets
  "[DX-ACT9] Gate (e) in-process: a removal on request of subject X's protected value in account A while each kind of
  derived write of account A is in flight, and the same kinds of account B. Loaded after wfix1/regression.clj,
  era2/gate.clj and era3/attack.clj (the review's hooks stop a removal at any step and run an action at any point);
  act9/inproc.sh runs it. One schedule: X (acct/A/pl:<n>) and Y (acct/B/pl:<n>) are seeded with protected values; each
  of eight derived writes (settlement frame, notice frame, Publish marker in the database; a delivery into a recipient
  database) of A and of B copies its subject's value under a ticket read before the removal, and is sent at a random
  point: before the removal, at the same moment, after its intent, inside its commit, after its guard, after its native
  commit, after its first answer (while it is stopped or after it answered), after it is resumed. The removal is stopped
  at a random step and resumed.
  ACT9_ARM=before: the tickets as the Publish branch sends them (no account; a delivery's database-wide source check);
  ACT9_ARM=after: as TX2_ACCOUNT_TICKETS=1 sends them (the account named; a delivery checked under the source's account
  locks). Oracles: (1) no derived write carrying X's value lands after the removal's position (in the database) or
  commits into the recipient once the removal has begun (sent at or after its intent); (2) after: no derived write of B
  is refused, at any point; (3) the removal completes; (4) the frontier's touched entities of A since the ticket are
  exactly the removal's entities of A, and none of B; (5) at the end of each block: no copy of a removed value in any
  journal page, feed entry or native datom (source and recipient) other than X itself, journals, and the derived copies
  that landed before the removal's position (counted: copies made before a removal, which removal does not reach)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.main :as main] [triplex.gateway.privacy :as privacy]
            [wfix1-regression :as offers] [era2-gate :as g] [era3-attack :as x])
  (:import [java.util Random]))

(def arm (or (System/getenv "ACT9_ARM") "after"))
(def after? (= arm "after"))
(def kinds [:frame :notice :publish :delivery])
(def points [:before :concurrent :after-intent :in-commit :after-hold :after-native :after-answer :after-resume])
(def stops [:none :none :before-native :after-native :at-publish :after-guard])
(def tally (atom {}))
(defn bump! [& ks] (swap! tally update (vec ks) (fnil inc 0)))

(defn- doc-of [kind acct i]
  (case kind
    :frame (str "settlement-values-" acct ":answer:" i)
    :notice (str "settlement-notices-" acct ":recorded-notices:" i)
    :publish (str "lazy/account/releases/" acct "/" i)
    :delivery (str "receiver:" acct ":" i)))

(defn- body [src w t]
  (let [base (assoc (g/save-frame (:cmd w) (:doc w) ":notice/body" (str "derived:" (:value w)) nil nil) "erasureSeq" t)]
    (cond-> base
      (= :delivery (:kind w)) (assoc "erasureSourceDatabase" src)
      after? (assoc "erasureAccounts" [(:acct w)]))))

(defn- frontier [name q]
  (let [{:keys [body]} (main/route-handler {:request-method :get :uri (str "/v2/db/" name "/erasure-frontier") :query-string q})]
    (json/read-str (if (string? body) body (String. ^bytes body "UTF-8")))))

(defn- position-in [conn command] (x/position-of conn command))

(defn run-schedule! [src rcp conn rconn run i ^Random r]
  (let [pick (fn [v] (v (.nextInt r (count v))))
        a (str "ka" (mod i 3)) b (str "kb" (mod i 3)) tag (str run "-" i)
        sx (format "acct/%s/pl:%08d" a i) sy (format "acct/%s/pl:%08d" b i)
        vx (g/secret sx (str "seed" tag)) vy (g/secret sy (str "seed" tag))
        seed (fn [id e v] (let [rep (offers/send src (g/frame id e v nil nil))]
                            (when-not (= 200 (:status rep)) (bump! :seed-refused (offers/outcome rep))) rep))
        _ (seed (str "kx-" tag) sx vx) _ (seed (str "ky-" tag) sy vy)
        t (g/seq-now src conn)
        stop (pick stops)
        writes (vec (for [[acct v] [[a vx] [b vy]] kind kinds]
                      {:acct acct :kind kind :value v :at (pick points) :doc (doc-of kind acct i)
                       :cmd (str "kw-" tag "-" acct "-" (name kind))}))
        replies (atom {}) reached (atom #{})
        send! (fn [w] (offers/send (if (= :delivery (:kind w)) rcp src) (body src w t)))
        fire! (fn [p] (swap! reached conj p)
                (doseq [w writes :when (= p (:at w))] (swap! replies assoc (:cmd w) (future (send! w)))))
        wait! (fn [p] (doseq [w writes :when (= p (:at w))] (deref (get @replies (:cmd w)) 30000 nil)))
        _ (do (fire! :before) (wait! :before))
        cmd (str "kr-" tag) selectors [{"entityId" sx "attribute" ":v"}]
        _ (fire! :concurrent)
        _ (reset! x/plan {:stop (when-not (= stop :none) stop) :stops-left 1
                          :hook (fn [p] (when (#{:after-intent :in-commit :after-hold :after-native} p) (fire! p)))})
        first-reply (x/erase! src cmd selectors)
        _ (reset! x/plan nil)
        stopped? (not= 200 (:status first-reply))
        _ (bump! :stop stop (offers/outcome first-reply))
        ;; points the removal did not reach (a guard it did not take, a step after its stop) fire after its first answer
        _ (doseq [p [:after-intent :in-commit :after-hold :after-native]] (when-not (@reached p) (bump! :point-not-reached p) (fire! p)))
        _ (do (fire! :after-answer) (wait! :after-answer))
        final (loop [k 0 reply first-reply]
                (if (or (= 200 (:status reply)) (>= k 3)) reply (recur (inc k) (x/erase! src cmd selectors))))
        _ (do (fire! :after-resume) (wait! :after-resume))
        outcomes (into {} (for [w writes] [(:cmd w) (offers/outcome (deref (get @replies (:cmd w)) 30000 {:status 0 :body {"code" "timeout"}}))]))
        ok (= 200 (:status final))
        p-r (get-in final [:body "position"])
        label (str "K " arm " " (pr-str {:i i :stop stop}))
        landed (atom {})]
    (x/oracle! label ok "the removal completes after at most 3 resumes" {:first (offers/outcome first-reply) :final (offers/outcome final)})
    (doseq [w writes]
      (let [o (get outcomes (:cmd w)) mine? (= (:acct w) a)
            p (if (= :delivery (:kind w)) (position-in rconn (:cmd w)) (position-in conn (:cmd w)))]
        (bump! (if mine? :removal-account :other-account) (:kind w) (:at w) o)
        (when p (swap! landed assoc (:cmd w) {:p p :w w}))
        (when mine?
          (if (= :delivery (:kind w))
            (when-not (#{:before :concurrent} (:at w))
              (x/oracle! label (not= [200 nil] o) "a delivery whose ticket predates the removal never commits once the removal has begun"
                         {:at (:at w) :outcome o :stop stop}))
            (when (and ok p)
              (x/oracle! label (< p p-r) "a derived write whose ticket predates the removal never lands after the removal's position"
                         {:kind (:kind w) :at (:at w) :p p :removal p-r :stop stop}))))
        (when (and after? (not mine?))
          (x/oracle! label (= [200 nil] o) "a derived write of another account is never refused by this removal"
                     {:kind (:kind w) :at (:at w) :outcome o :stop stop}))))
    (when (and ok after?)
      (let [fa (frontier src (str "account=" a "&since=" t)) fb (frontier src (str "account=" b "&since=" t))]
        (x/oracle! label (and (= [sx] (get fa "touched")) (true? (get fa "touchedComplete")))
                   "the frontier names exactly the removal's entities of the account touched since the ticket"
                   (select-keys fa ["touched" "touchedComplete" "accountSeq" "seq"]))
        (x/oracle! label (and (= [] (get fb "touched")) (<= (long (get fb "accountSeq" 0)) t))
                   "the frontier names nothing of an account the removal did not touch" (select-keys fb ["touched" "accountSeq"]))))
    (bump! :schedules)
    {:gone {vx #{sx}}
     :derived (apply merge-with into {} (for [[_ {:keys [p w]}] @landed :when (and (= (:acct w) a) (not= :delivery (:kind w)) p-r (< p p-r))]
                                         {vx #{(:doc w)}}))
     :derived-txs (set (for [[c {:keys [w]}] @landed :when (not= :delivery (:kind w))] (str "_tx/" c)))
     ;; deliveries allowed to hold the value: sent before or with the removal's start (any other that landed is a violation
     ;; above and is not allowed here)
     :delivered (set (for [[c {:keys [w]}] @landed :when (and (= :delivery (:kind w)) (= (:acct w) a) (#{:before :concurrent} (:at w)))]
                       [vx (:doc w) (str "_tx/" c)]))}))

(defn- recipient-checks! [rcp rconn label gone delivered]
  ;; the recipient: a removed value only in a delivery that landed (each was sent before or with the removal's start),
  ;; its own journal, and nowhere else
  (let [allowed (reduce (fn [m [v doc tx]] (update m v (fnil into #{}) [doc tx])) {} delivered)
        hits (g/foreign-copies rconn (into {} (for [[v _] gone] [v (get allowed v #{})])))]
    (x/oracle! label (empty? hits) "the recipient holds no removed value outside the deliveries that landed before the removal began"
               (take 5 hits))
    (bump! :recipient-copies-before-removal (count delivered))))

(defn fuzz [run n block seed]
  (let [r (Random. (long seed))]
    (doseq [k (range (quot (+ n block -1) block))]
      (g/fresh-scope false
        (fn [src conn]
          (offers/in-scope
            (fn [rcp rconn]
              (let [results (vec (for [i (range (* k block) (min n (* (inc k) block)))]
                                   (try (run-schedule! src rcp conn rconn run i r)
                                        (catch Throwable e
                                          (reset! x/plan nil)
                                          (x/oracle! (str "K " arm " " i) false (str "schedule stopped: " (.getMessage e)))
                                          nil))))
                    gone (apply merge-with into {} (keep :gone results))
                    derived (apply merge-with into {} (keep :derived results))
                    txs (apply into #{} (keep :derived-txs results))]
                (x/block-checks! src conn (str "K block " k) gone derived txs)
                (recipient-checks! rcp rconn (str "K block " k " recipient") gone (apply into #{} (keep :delivered results)))
                (bump! :pre-removal-derived-copies (reduce + 0 (map count (vals derived))))
                (println "ACT9_PROGRESS" arm (pr-str {:block k :schedules (get @tally [:schedules]) :violations (count @x/violations)}))))))))))

(defn main []
  (x/install-hooks!)
  (fuzz (or (System/getenv "ACT9_RUN") "k0") (Long/parseLong (or (System/getenv "ACT9_N") "200"))
        (Long/parseLong (or (System/getenv "ACT9_BLOCK") "50")) (Long/parseLong (or (System/getenv "ACT9_SEED") "1")))
  (println "ACT9_TALLY" arm (pr-str (into (sorted-map) (map (fn [[k v]] [(pr-str k) v])) @tally)))
  (println "ACT9_SUMMARY" arm (pr-str {:oracles @x/oracles :violations (count @x/violations)}))
  (shutdown-agents)
  (System/exit 0))
