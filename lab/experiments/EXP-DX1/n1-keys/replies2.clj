(ns n1r-replies2
  "[DX-N1R] What the builder's walk (n1-keys/replies.clj W1-W3: SQLException and Datomic's ExceptionInfo) leaves out.
  Loaded after n1-keys/replies.clj, whose routes, walk and checks it reuses (every route of main.clj, GET and POST):
    E1 an AssertionError, E2 a StackOverflowError, E3 an OutOfMemoryError, each holding the marker, the SQL statement
       and a 64-character hex run, injected at the storage and authority calls (no route's own catch takes an Error);
    E4 the same SQLException with TX2_ID_LISTS and TX2_SWEEP on, so the ID-list and sweep routes' own catches answer
       (off, those routes are 404 and the walk never reaches them);
    E5 the question reader's guard (qr/guard, before every route) throwing an AssertionError;
    J  a real Jetty (ring adapter, as serve! runs it) on 127.0.0.1: an Error from a route; and an exception raised by
       the trace wrapper itself, outside the handler's new last catch (trace on, `trace/attribute!` throwing).
  Prints N1_REPLY ok/FAIL lines (the walk's) and N1R_J lines; N1R_REPLIES2_SUMMARY; exits 1 if a check fails."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.main :as main] [triplex.gateway.trace :as trace]
            [triplex.gateway.ids :as ids] [triplex.gateway.sweep :as sweep] [triplex.gateway.question-reader :as qr])
  (:import [java.net URI] [java.net.http HttpClient HttpRequest HttpResponse$BodyHandlers HttpRequest$BodyPublishers]))

(load-file "/lab/replies.clj")
(def marker n1-replies/marker)
(def statement n1-replies/statement)
(def hex64 n1-replies/hex64)
(def detail (str marker " " statement " " hex64))

(defn- jcheck! [label ok detail] (swap! n1-replies/results conj {:label label :ok (boolean ok)})
  (println "N1R_J" (if ok "ok  " "FAIL") label (pr-str detail)))

(defn jetty []
  (let [run (requiring-resolve 'ring.adapter.jetty/run-jetty)
        server (run main/handler {:port 0 :host "127.0.0.1" :join? false})
        port (.getLocalPort ^org.eclipse.jetty.server.ServerConnector (first (.getConnectors ^org.eclipse.jetty.server.Server server)))
        client (HttpClient/newHttpClient)
        get! (fn [path] (let [r (.send client (.build (HttpRequest/newBuilder (URI. (str "http://127.0.0.1:" port path))))
                                       (HttpResponse$BodyHandlers/ofString))]
                          {:status (.statusCode r) :body (.body r) :headers (str (.map (.headers r)))}))
        leak? (fn [r] (let [t (str (:body r) " " (:headers r))] (or (str/includes? t marker) (str/includes? t hex64) (re-find #"(?i)insert into" t))))]
    (try
      (let [r (with-redefs [main/route-handler (fn [& _] (throw (AssertionError. detail)))]
                (get! "/health"))]
        (jcheck! "J1 an Error from a route, through Jetty: the fixed JSON, no message" (and (= 500 (:status r)) (not (leak? r))
                                                                                          (str/includes? (:body r) "The gateway could not complete the request"))
                 (update r :body #(subs % 0 (min 300 (count %))))))
      (let [r (with-redefs [trace/enabled true trace/attribute! (fn [& _] (throw (RuntimeException. detail)))]
                (get! "/health"))]
        (println "N1R_J note J2 an exception in the trace wrapper (outside the last catch), through Jetty"
                 (pr-str (update r :body #(subs % 0 (min 600 (count %))))))
        (jcheck! "J2 the trace wrapper's own exception: no message reaches the caller" (not (leak? r)) {:status (:status r)}))
      (finally (.stop ^org.eclipse.jetty.server.Server server)))))

(defn main []
  (let [authority [#'sql/read-record #'sql/read-frontier #'sql/scopes #'sql/issue! #'sql/key-by-id #'sql/put! #'sql/publish! #'sql/delete!]
        storage-calls [#'main/connection #'main/sync-db #'d/db #'d/get-database-names #'d/create-database #'d/delete-database
                       #'d/transact #'d/transact-async]
        sqlex #(java.sql.SQLException. statement "23505")]
    (doseq [[label ex] [["E1 AssertionError" #(AssertionError. detail)] ["E2 StackOverflowError" #(StackOverflowError. detail)]
                        ["E3 OutOfMemoryError" #(OutOfMemoryError. detail)]]]
      (try (n1-replies/walk label (concat storage-calls authority) ex 10)
           (catch Throwable t (jcheck! (str label " ran") false (str (class t))))))
    (try (with-redefs [ids/enabled true sweep/enabled true]
           (n1-replies/walk "E4 SQLException with the ID-list and sweep routes on" (concat storage-calls authority) sqlex 10))
         (catch Throwable t (jcheck! "E4 ran" false (str (class t)))))
    (try (with-redefs [qr/guard (fn [req] (when (contains? req :headers) (throw (AssertionError. detail))))]
           (n1-replies/walk "E5 the question reader's guard throwing" [] #(RuntimeException. "unused") 10))
         (catch Throwable t (jcheck! "E5 ran" false (str (class t)))))
    (try (jetty) (catch Throwable t (jcheck! "J ran" false (str (class t) " " (.getMessage t)))))
    (let [failed (remove :ok @n1-replies/results)]
      (println "N1R_REPLIES2_SUMMARY" (pr-str {:checks (count @n1-replies/results) :failed (count failed)
                                               :failed-labels (mapv :label failed) :authority (if (some? sql/url) "postgresql" "file")
                                               :source (System/getenv "B2R_SOURCE")}))
      (shutdown-agents)
      (System/exit (if (empty? failed) 0 1)))))
