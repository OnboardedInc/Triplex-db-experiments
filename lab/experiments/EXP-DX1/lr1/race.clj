(ns lr1-race
  "[DX-LR1] The answer path's load race, in one fresh JVM per case (lr1/gate.sh runs each case in its own container):
  requiring-resolve resolves first and requires only when that fails, and the compiler interns a defn's var before it
  compiles the body and binds it, so a second thread at a namespace's first use can call the var unbound.
  LR1_CASE:
  - inventory: which of the namespaces the gateway resolves lazily are loaded after (require 'triplex.gateway.main),
    and after main/load-answer-path! when this build has it;
  - lost-once: the state a lost race leaves, made deterministic: reply/message holds a function that, on its first
    call, loads the real namespace (the other thread's load finishing) and throws what Clojure throws for an unbound
    var. A request the gateway refuses with a typed 409 (a second protection declaration, ProtectionPolicyMismatch)
    is then answered something else;
  - lost-always: reply/message stays unbound for the whole request (every lookup loses): the exception leaves the
    handler, and a real Jetty answers it with its own HTML error page carrying the exception's text;
  - hooked: main/load-answer-path! first (as serve! does), then a battery of failing requests on every kind of route:
    every answer typed, and no gateway namespace is loaded while requests run (so no request can meet a load);
  - loop: the two-thread first-use control: LR1_ROUNDS rounds, each unloading reply and outcome, then (with
    LR1_HOOK=1) running the hook, then LR1_THREADS threads at once sending the refused declaration. Counts answers
    other than the typed 409. Without the hook the race may or may not show in a given run (it is a race); with it,
    none may.
  Prints LR1 lines and one LR1_SUMMARY {:case .. :ok ..}; exits 0 when the case's expectation holds (LR1_EXPECT
  'broken' for the cases run on a build without the hook, 'fixed' with it)."
  (:require [clojure.data.json :as json] [clojure.string :as str])
  (:import [java.util UUID] [java.util.concurrent CyclicBarrier TimeUnit]))

(require 'triplex.gateway.main)
(def main-handler (resolve 'triplex.gateway.main/handler))
(def hook (resolve 'triplex.gateway.main/load-answer-path!))
(def lazy-namespaces
  "Every namespace the gateway reaches through requiring-resolve (git grep on this source), and Datomic's config."
  '[triplex.gateway.reply triplex.gateway.outcome triplex.gateway.failures triplex.gateway.account-claims
    triplex.gateway.key-pool triplex.gateway.import-bound triplex.gateway.layout-replay triplex.gateway.at-least
    triplex.gateway.group triplex.gateway.subject-create triplex.gateway.stats datomic.config])

(defn- loaded? [n] (contains? (loaded-libs) n))
(defn- gateway-libs [] (set (filter #(str/starts-with? (str %) "triplex.gateway") (loaded-libs))))

(defn- request [method uri input]
  (let [r (@main-handler {:request-method method :uri uri
                          :body (when input (java.io.ByteArrayInputStream. (.getBytes ^String (json/write-str input) "UTF-8")))})
        b (:body r) t (if (string? b) b (if b (String. ^bytes b "UTF-8") ""))]
    {:status (:status r) :body (try (json/read-str t) (catch Exception _ t))}))

(defn- outcome [r] [(:status r) (get-in r [:body "code"])])

(defn- new-db []
  (let [scope (json/write-str ["triplex-scope-v1" "test" "lr1" (str (UUID/randomUUID)) 0])
        r (request :post "/v1/db/create" {"scope" scope "layout" "lean"})
        db (get-in r [:body "db"])]
    (when-not (= 200 (:status r)) (throw (ex-info "create failed" r)))
    (when-not (= 200 (:status (request :post (str "/v2/db/" db "/protection") {"attributes" [":v"] "sealed" false})))
      (throw (ex-info "protection failed" {})))
    db))

(defn- refused [db] (request :post (str "/v2/db/" db "/protection") {"attributes" [":w"] "sealed" false}))
(def typed [409 "ProtectionPolicyMismatch"])

(defn- unbound-ex [] (IllegalStateException. "Attempting to call unbound fn: #'triplex.gateway.reply/message"))

(defn- unload! [n]
  (remove-ns n)
  (dosync (commute @#'clojure.core/*loaded-libs* disj n)))

(defn- summary [case ok detail]
  (println "LR1_SUMMARY" (pr-str {:case case :ok (boolean ok) :hook (some? hook) :detail detail}))
  (shutdown-agents)
  (System/exit (if ok 0 1)))

(defn inventory []
  (let [before (into (sorted-map) (for [n lazy-namespaces] [(str n) (loaded? n)]))
        _ (when hook (@hook))
        after (into (sorted-map) (for [n lazy-namespaces] [(str n) (loaded? n)]))]
    (println "LR1_INVENTORY after-main" (pr-str before))
    (println "LR1_INVENTORY after-hook" (pr-str after))
    (summary "inventory" true {:not-loaded-by-main (vec (keep (fn [[k v]] (when-not v k)) before))
                               :not-loaded-after-hook (vec (keep (fn [[k v]] (when-not v k)) after))})))

(defn lost-once []
  ;; the first use of the reply path, mid-load: the namespace exists, message is interned, and the first call finds it
  ;; unbound; the other thread's load completes right after (the placeholder loads the real file before throwing)
  (let [db (new-db)
        _ (when (loaded? 'triplex.gateway.reply) (unload! 'triplex.gateway.reply))
        _ (when hook (@hook))
        planted (when-not (loaded? 'triplex.gateway.reply)
                  (create-ns 'triplex.gateway.reply)
                  (intern 'triplex.gateway.reply 'message
                          (fn [& _] (require 'triplex.gateway.reply) (throw (unbound-ex))))
                  true)
        r (try (refused db) (catch Throwable t {:status :escaped :body {"code" (str (class t) ": " (.getMessage t))}}))]
    (println "LR1_LOST_ONCE" (pr-str {:planted (boolean planted) :answer (outcome r) :message (get-in r [:body "message"])}))
    ;; with the hook the namespace is loaded before any request, so the mid-load state cannot be reached: nothing planted
    (summary "lost-once" (= (= "broken" (System/getenv "LR1_EXPECT")) (not= typed (outcome r)))
             {:answer (outcome r) :planted (boolean planted)})))

(defn lost-always []
  (let [db (new-db)
        _ (when (loaded? 'triplex.gateway.reply) (unload! 'triplex.gateway.reply))
        _ (when hook (@hook))
        planted (when-not (loaded? 'triplex.gateway.reply)
                  (create-ns 'triplex.gateway.reply)
                  (intern 'triplex.gateway.reply 'message (fn [& _] (throw (unbound-ex))))
                  true)
        escaped (try (refused db) nil (catch Throwable t (str (class t) ": " (.getMessage t))))
        ;; the same through a real Jetty on a private port: its answer when the handler throws
        jetty ((requiring-resolve 'ring.adapter.jetty/run-jetty) @main-handler {:port 18911 :join? false :host "127.0.0.1"})
        http (try (let [c ^java.net.HttpURLConnection (.openConnection (java.net.URL. (str "http://127.0.0.1:18911/v2/db/" db "/protection")))]
                    (.setRequestMethod c "POST") (.setDoOutput c true) (.setRequestProperty c "Content-Type" "application/json")
                    (with-open [o (.getOutputStream c)] (.write o (.getBytes (json/write-str {"attributes" [":w"] "sealed" false}) "UTF-8")))
                    (let [status (.getResponseCode c)
                          body (slurp (or (.getErrorStream c) (.getInputStream c)))]
                      {:status status :content-type (.getContentType c) :has-exception-text (str/includes? body "Attempting to call unbound fn")
                       :body (subs body 0 (min 300 (count body)))}))
                  (finally (.stop ^org.eclipse.jetty.server.Server jetty)))]
    (println "LR1_LOST_ALWAYS" (pr-str {:planted (boolean planted) :escaped escaped :jetty http}))
    (summary "lost-always" (if (= "broken" (System/getenv "LR1_EXPECT"))
                             (and planted escaped (:has-exception-text http))
                             (and (not planted) (nil? escaped) (= 409 (:status http)) (not (:has-exception-text http))))
             {:escaped escaped :jetty (dissoc http :body)})))

(defn hooked []
  (let [_ (when hook (@hook))
        db (new-db)
        libs0 (gateway-libs)
        answers {:protection-mismatch (outcome (refused db))
                 :erase-unprotected (let [d2 (get-in (request :post "/v1/db/create" {"scope" (json/write-str ["triplex-scope-v1" "test" "lr1" (str (UUID/randomUUID)) 0]) "layout" "lean"}) [:body "db"])]
                                      (outcome (request :post (str "/v2/db/" d2 "/erase") {"commandId" "lr1-rm" "selectors" [{"entityId" "acct/a/one"}]})))
                 :bad-json (outcome (request :post (str "/v1/db/" db "/transact") "not a save"))
                 :reserved-id (outcome (request :post (str "/v1/db/" db "/fence") {"operationId" "acct-id/v1/1/a/x"}))
                 :unknown-db (outcome (request :post "/v1/db/s2-lr1-none/transact" {}))
                 :read-missing (outcome (request :post (str "/v1/db/" db "/read") {"entityIds" 7}))}
        libs1 (gateway-libs)
        loaded-during (vec (sort (map str (remove libs0 libs1))))
        untyped (vec (keep (fn [[k [s c]]] (when (or (nil? c) (not (integer? s))) k)) answers))]
    (println "LR1_HOOKED" (pr-str {:answers answers :loaded-during-requests loaded-during}))
    (summary "hooked" (if (= "broken" (System/getenv "LR1_EXPECT")) true (and (= typed (:protection-mismatch answers)) (empty? loaded-during)))
             {:loaded-during-requests loaded-during :untyped untyped})))

(defn loop-control []
  (let [rounds (Long/parseLong (or (System/getenv "LR1_ROUNDS") "200"))
        threads (Long/parseLong (or (System/getenv "LR1_THREADS") "8"))
        hook? (= "1" (System/getenv "LR1_HOOK"))
        db (new-db)
        wrong (atom []) tally (atom {})]
    (dotimes [k rounds]
      (doseq [n '[triplex.gateway.reply triplex.gateway.outcome]] (when (loaded? n) (unload! n)))
      (when hook? (@hook))
      (let [barrier (CyclicBarrier. (int threads))
            fs (doall (for [_ (range threads)]
                        (future (.await barrier 10 TimeUnit/SECONDS)
                                (try (outcome (refused db)) (catch Throwable t [:escaped (str (class t))])))))]
        (doseq [f fs] (let [o @f] (swap! tally update o (fnil inc 0)) (when (not= typed o) (swap! wrong conj [k o]))))))
    (println "LR1_LOOP" (pr-str {:rounds rounds :threads threads :hook hook? :answers @tally :first-wrong (vec (take 5 @wrong))}))
    (summary "loop" (if hook? (empty? @wrong) true) {:hook hook? :wrong (count @wrong) :answers @tally})))

(defn main []
  (case (System/getenv "LR1_CASE")
    "inventory" (inventory)
    "lost-once" (lost-once)
    "lost-always" (lost-always)
    "hooked" (hooked)
    "loop" (loop-control)
    (summary "?" false {:unknown (System/getenv "LR1_CASE")})))
