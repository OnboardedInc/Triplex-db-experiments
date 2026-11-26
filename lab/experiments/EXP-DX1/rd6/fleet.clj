(ns rd6-fleet
  "[DX-RD6] Mixed fleet: one write gateway and three read gateways on one database (PostgreSQL storage, a real
  transactor): options off (the reference), both on, and the tuned reader (both on, the early filter, the read profile,
  three permits). Writer threads save (replacements, retirements alone, several owners, new owners with references,
  removals on request) through the write gateway while reader threads read the same pins from every reader at once
  and compare each answer with the off reader's. The container restarts the write gateway between phases with another
  writer (per-subject, grouped, append retirement). At the end every position is read for every owner on every reader.
  Run by rd6/fleet-container.sh; reviewer's test, not a gate of the code under review."
  (:require [clojure.data.json :as json] [clojure.string :as str] [s5-fuzz :as fz] [wfix1-regression :as reference]
            [wide-gate :as wide])
  (:import [java.net URI] [java.net.http HttpClient HttpRequest HttpRequest$BodyPublishers HttpResponse$BodyHandlers]
           [java.time Duration] [java.util Random] [java.util.concurrent ConcurrentLinkedQueue] [java.util.concurrent.atomic AtomicLong]))

(defn emit [tag m] (locking *out* (println tag (json/write-str m)) (flush)))
(def ^HttpClient client (-> (HttpClient/newBuilder) (.connectTimeout (Duration/ofSeconds 10)) (.build)))
(defn call [base method path input]
  (let [b (-> (HttpRequest/newBuilder (URI/create (str base path))) (.timeout (Duration/ofSeconds 60))
              (.header "content-type" "application/json"))
        req (if (= method :get) (.build (.GET b))
                (.build (.POST b (HttpRequest$BodyPublishers/ofString (json/write-str input)))))
        resp (.send client req (HttpResponse$BodyHandlers/ofString))]
    {:status (.statusCode resp) :body (try (json/read-str (.body resp)) (catch Exception _ (.body resp)))}))
(defn route-at [base] (fn [name version action input] (call base (if (nil? input) :get :post) (str "/" version "/db/" name "/" action) input)))

(def writer (System/getenv "RD6_WRITER"))
(def readers (into (sorted-map) (for [kv (str/split (System/getenv "RD6_READERS") #",")] (let [[k v] (str/split kv #"=" 2)] [k v]))))
(def out (System/getenv "RD6_OUT"))
(defn wait-file [f] (loop [i 0] (when-not (.exists (java.io.File. ^String f)) (when (> i 4800) (throw (ex-info "timeout" {:f f}))) (Thread/sleep 250) (recur (inc i)))))

(def counter (atom 8000000))
(defn block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(def positions (java.util.concurrent.CopyOnWriteArrayList.))
(def clocks (java.util.concurrent.CopyOnWriteArrayList.))
(def stats (atom {:saves 0 :committed 0 :refused {} :removals 0 :compared 0 :differences 0 :first [] :errors {} :rounds 0 :unavailable {}}))
(def all-owners (java.util.concurrent.ConcurrentHashMap.))

;; The S5 harness's read-owner and send go to the write gateway over HTTP (set once: with-redefs is not thread-safe).
(alter-var-root #'reference/route (constantly (route-at writer)))
(defn head [name] (some-> (call writer :get (str "/v1/db/" name "/write-options") nil) :body (get "position") str Long/parseLong))

(defn save! [name g {:keys [set retire]}]
  (do
    (let [owners (distinct (map first (concat set retire)))
          model (into {} (for [o owners] [o (fz/read-owner name o {"validAt" 5.0})]))
          facts (vec (for [[o f v] set] (merge {:owner o :field f :pred (get-in model [o f])}
                                               (if (str/starts-with? v "ref:") {:type :ref :value (subs v 4)} {:type :string :value v}))))
          retires (vec (for [[o f] retire :when (get-in model [o f])] {:owner o :field f :pred (get-in model [o f])}))
          [_ input] (fz/input-of g {:facts facts :retires retires :source (head name) :block (block)})
          r (reference/send name input)]
      (swap! stats update :saves inc)
      (if (= 200 (:status r))
        (do (swap! stats update :committed inc)
            (.add positions (fz/position-of r))
            (when-let [c (get-in r [:body "recordedAt" "v"])] (.add clocks (Double/parseDouble (str c))))
            (doseq [o owners] (.put all-owners o true)))
        (swap! stats update-in [:refused (str (:status r) " " (get-in r [:body "code"]))] (fnil inc 0)))
      r)))

(defn writer-loop! [name t ^Random rng stop]
  (let [g (fz/gen-state (+ 100 t) (str "acct/fleet" t))
        own (vec (for [i (range 6)] (str "acct/fleet" t "/subject/o" i)))
        pick #(nth % (.nextInt rng (count %)))
        f #(str ":fz/f" (.nextInt rng 5))]
    (doseq [o own] (save! name g {:set (vec (for [j (range 5)] [o (str ":fz/f" j) (str o "-seed-" j)]))}))
    (save! name g {:set [[(first own) ":p/secret" "secret-seed"]]})
    (while (not @stop)
      (let [o (pick own) x (.nextDouble rng)]
        (try
          (cond
            (< x 0.30) (save! name g {:set [[o (f) (str "v" (swap! counter inc))]]})
            (< x 0.50) (save! name g {:retire [[o (f)]]})
            (< x 0.62) (save! name g {:set [[o (f) (str "v" (swap! counter inc))] [(pick own) (f) (str "w" (swap! counter inc))]]})
            (< x 0.72) (save! name g {:set [[(str "acct/fleet" t "/form/n" (swap! counter inc)) ":form/of" (str "ref:" o)] [o (f) "with-form"]]})
            (< x 0.80) (save! name g {:set [[o ":p/secret" (str "secret-" (swap! counter inc))]]})
            (< x 0.81) (let [r (call writer :post (str "/v1/db/" name "/erase") {"commandId" (str "rm-" (swap! counter inc))
                                                                                    "selectors" [{"entityId" o "attribute" ":p/secret"}]})]
                         (if (= 200 (:status r)) (swap! stats update :removals inc)
                           (swap! stats update-in [:refused (str "erase " (:status r) " " (get-in r [:body "code"]))] (fnil inc 0))))
            :else (save! name g {:set [[o (f) (str "v" (swap! counter inc))]] :retire [[o (f)]]}))
          (catch Exception e (swap! stats update-in [:errors (str "write " (.getSimpleName (class e)))] (fnil inc 0))
                             (Thread/sleep 20)))))))

(defn- norm [r]
  (if (= 200 (:status r))
    (let [b (:body r)] (if (map? b) (if (contains? b "rows") (vec (sort-by #(get-in % ["id" "v"]) (get b "rows"))) b) b))
    [:refused (:status r) (when (map? (:body r)) (get-in r [:body "code"]))]))

(defn- refused? [x] (and (vector? x) (= :refused (first x))))
(defn compare-one! [name label path input]
  (let [answers (into {} (pmap (fn [[k base]] [k (norm (call base :post (str "/" path "/db/" name "/" label) input))]) readers))
        reference (get answers "off")]
    (doseq [[k v] answers :when (not= k "off")]
      (swap! stats update :compared inc)
      (cond
        ;; Both answered and differ: a difference in what a pinned read answers.
        (and (not (refused? v)) (not (refused? reference)) (not= v reference))
        (do (swap! stats (fn [s] (-> s (update :differences inc)
                                     (update :first #(if (< (count %) 8) (conj % {:reader k :route label :input input
                                                                                   :off (subs (pr-str reference) 0 (min 600 (count (pr-str reference))))
                                                                                   :got (subs (pr-str v) 0 (min 600 (count (pr-str v))))}) %)))))
            (when (< (:differences @stats) 40)
              (emit "DX-RD6_FLEET_DIFF" {:reader k :route label :input input :off (pr-str reference) :got (pr-str v)})))
        ;; One or both refused (a reader behind the pin or the removal frontier): availability, counted by reader and code.
        (or (refused? v) (refused? reference))
        (when (not= v reference)
          (swap! stats update-in [:unavailable (str k ": " (if (refused? v) (str (second v) " " (nth v 2)) "answered")
                                                   " / off: " (if (refused? reference) (str (second reference) " " (nth reference 2)) "answered"))]
                 (fnil inc 0)))
        :else nil))))

(defn reader-loop! [name ^Random rng stop]
  (while (not @stop)
    (try
      (when (pos? (.size positions))
        (let [p (.get positions (.nextInt rng (.size positions)))
              owners (vec (take (inc (.nextInt rng 6)) (shuffle (vec (keys all-owners)))))
              basis {"validAt" 5.0 "recordedPosition" p "basisWaitMs" 2000}
              x (.nextDouble rng)]
          (cond
            (< x 0.55) (compare-one! name "read" "v1" {"entityIds" owners "basis" basis})
            (< x 0.70) (compare-one! name "read" "v1" {"entityIds" owners "basis" basis "pattern" {"attribute" ":fz/f0"}})
            (< x 0.80) (when (pos? (.size clocks))
                         (compare-one! name "read" "v1" {"entityIds" owners "basis" {"validAt" 5.0 "recordedAt" (.get clocks (.nextInt rng (.size clocks)))}}))
            :else (compare-one! name "reach-many" "v2" {"roots" owners "basis" basis "full" true}))))
      (catch Exception e (swap! stats update-in [:errors (str "read " (.getSimpleName (class e)))] (fnil inc 0))))))

(defn phase! [name label seconds writers]
  (let [stop (atom false)
        ws (doall (for [t (range writers)] (future (writer-loop! name (+ t (* 10 (:rounds @stats))) (Random. (+ 7 t (* 31 (:rounds @stats)))) stop))))
        rs (doall (for [i (range 4)] (future (reader-loop! name (Random. (+ 1000 i (* 31 (:rounds @stats)))) stop))))]
    (Thread/sleep (* 1000 seconds))
    (reset! stop true)
    (run! deref ws) (run! deref rs)
    (swap! stats update :rounds inc)
    (emit "DX-RD6_FLEET_PHASE" (assoc @stats :phase label :head (head name)))))

(defn sweep-positions [top]
  (if (<= top 700) (range 1 (inc top))
    (distinct (concat (range 1 (- top 100) (max 1 (quot (- top 100) 600))) (range (- top 100) (inc top))))))

(defn main []
  (let [scope (json/write-str ["triplex-scope-v1" "test" "rd6-fleet" (str (java.util.UUID/randomUUID)) 0])
        created (call writer :post "/v1/db/create" {"scope" scope "layout" "lean" "strictRecordClocks" true})
        name (get-in created [:body "db"])
        prot (call writer :post (str "/v1/db/" name "/protection") {"attributes" [":p/secret"] "sealed" false})
        opts (into {} (for [[k base] readers] [k (select-keys (:body (call base :get (str "/v1/db/" name "/write-options") nil)) ["options"])]))]
    (emit "DX-RD6_FLEET_START" {:db name :created (:status created) :protection (:status prot) :readers opts})
    (doseq [[i label] (map-indexed vector (str/split (System/getenv "RD6_PHASES") #","))]
      (when (pos? i)
        (spit (str out "/phase-" i ".request") label)
        (wait-file (str out "/phase-" i ".ready"))
        ;; Open the scope on the restarted writer (as the shortcut gate does), so a writer with a new option installs
        ;; what it needs (the grouped writer's function).
        (call writer :post "/v1/db/create" {"scope" scope "layout" "lean" "strictRecordClocks" true}))
      (phase! name label (Long/parseLong (or (System/getenv "RD6_SECONDS") "90")) 4))
    ;; Every position, every owner, every reader, after the writes.
    (let [top (head name) owners (vec (sort (keys all-owners))) before (:compared @stats)]
      ;; At most about 700 positions: the last 100, and 600 spread over the rest (every position when fewer).
      (doseq [p (sweep-positions top) part (partition-all 40 owners)]
        (compare-one! name "read" "v1" {"entityIds" (vec part) "basis" {"validAt" 5.0 "recordedPosition" p}}))
      (doseq [p (take-nth 5 (sweep-positions top)) part (partition-all 16 owners)]
        (compare-one! name "reach-many" "v2" {"roots" (vec part) "basis" {"validAt" 5.0 "recordedPosition" p} "full" true}))
      (let [scan (into {} (for [[k base] readers] [k (get (:body (call base :get "/v2/admin/scan-stats" nil)) "pinnedShortcut")]))
            s @stats
            ;; The review's log audit on the PostgreSQL database itself (this JVM is a peer too).
            audit (try (let [conn ((requiring-resolve 'triplex.gateway.main/connection) ((requiring-resolve 'triplex.gateway.main/db-uri) name))]
                         (dissoc ((requiring-resolve 'rd6-attacks/audit) conn) :otherRetracting))
                       (catch Exception e {:error (str e)}))]
        (emit "DX-RD6_FLEET" (assoc s :head top :owners (count owners) :sweepComparisons (- (:compared s) before) :audit audit
                                    :shortcut scan :pass (and (zero? (:differences s)) (pos? (:compared s)))))
        (spit (str out "/finished") "ok")
        (shutdown-agents)
        (System/exit (if (zero? (:differences s)) 0 1))))))
