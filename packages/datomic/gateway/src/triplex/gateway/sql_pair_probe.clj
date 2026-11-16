(ns triplex.gateway.sql-pair-probe
  (:require [clojure.data.json :as json] [clojure.edn :as edn] [datomic.api]
            [datomic.sql :as sql] [datomic.kv-sql :as kv-sql]
            [datomic.kv-cluster :as cluster] [datomic.cluster :as c])
  (:import [java.nio ByteBuffer] [java.sql SQLException Connection PreparedStatement]
           [java.lang.reflect Proxy InvocationHandler]))

;; [DX-T1-11] Why: exercise the pinned jar's borrow/close and retry boundaries without risking a database.
;; Rejected: treating a same-thread observation as a same-connection or recovery guarantee.
(defn proxy-for [interface handler]
  (Proxy/newProxyInstance (.getClassLoader interface) (into-array Class [interface])
    (reify InvocationHandler (invoke [_ proxy method args] (handler (.getName method) (vec args))))))

(defn connection-probe []
  (let [calls (atom []) next-id (atom 0)
        spec {:factory
              (fn []
                (let [id (swap! next-id inc)]
                  (swap! calls conj [:borrow id (.getId (Thread/currentThread))])
                  (proxy-for Connection
                    (fn [method args]
                      (case method
                        "prepareStatement"
                        (do (swap! calls conj [:prepare id (first args)])
                          (proxy-for PreparedStatement
                            (fn [m _] (case m "executeUpdate" (int 1) "setObject" nil "close" nil
                                        (throw (ex-info "Unexpected statement method" {:method m}))))))
                        "close" (do (swap! calls conj [:close id]) nil)
                        (throw (ex-info "Unexpected connection method" {:method method})))))))}]
    (sql/insert spec {:id "chunk" :map "{}" :val (byte-array [1])})
    (sql/update spec "pod" 0 {:rev 1 :map "{:tail chunk}"})
    (let [events @calls borrows (filter #(= :borrow (first %)) events)]
      (when-not (and (= 2 (count borrows)) (= 2 (count (filter #(= :close (first %)) events))))
        (throw (ex-info "SQL borrow/close counterexample did not reproduce" {})))
      {:events events :sameThread (= (nth (first borrows) 2) (nth (second borrows) 2))
       :sameConnection (= (second (first borrows)) (second (second borrows)))})))

(defn retry-probe [paired]
  (let [durable (atom {"pod" {:id "pod" :rev 0 :tail "old"}})
        held (atom nil) events (atom []) attempts (atom 0)
        kvs (kv-sql/from-spec {}) cs (cluster/kv-cluster kvs {:shared-pool? true})]
    (with-redefs
      [sql/insert (fn [_ row]
                    (swap! events conj ["insert" (:id row)])
                    (if paired (reset! held row) (swap! durable assoc (:id row) row)) 1)
       sql/update (fn [_ id _ row]
                    (let [attempt (swap! attempts inc)]
                      (swap! events conj ["update" attempt])
                      (if (= 1 attempt)
                        (do
                          ;; [DX-T1-11] Why: a failed atomic pair rolls back its first insert too, but Datomic retries only UPDATE.
                          ;; Rejected: silently keep a private replay journal in this probe (that is an additional recovery protocol).
                          (reset! held nil)
                          (throw (SQLException. "Injected lost connection before pair commit" "08006")))
                        (do (swap! durable assoc id (assoc row :id id)) 1))))
       sql/select (fn [_ id] (get @durable id))]
      (let [result (deref (c/update-pod cs "pod" 1 "old" (ByteBuffer/wrap (byte-array [1 2 3])) {}) 5000 ::timeout)
            tail (:tail (edn/read-string (:map (get @durable "pod"))))
            present (contains? @durable tail)]
        (when (or (= result ::timeout) (not= 2 @attempts))
          (throw (ex-info "Original update-only retry did not reproduce" {:result result :events @events})))
        {:paired paired :events @events :returnedRevision (:rev result)
         :podPointsAtPresentChunk present :insertCalls (count (filter #(= "insert" (first %)) @events))}))))

(defn -main [& _]
  (try
    (let [started (System/currentTimeMillis) connection (connection-probe)
          original (retry-probe false) paired (retry-probe true)]
      (when-not (and (:sameThread connection) (not (:sameConnection connection))
                    (:podPointsAtPresentChunk original) (not (:podPointsAtPresentChunk paired))
                    (= 1 (:returnedRevision paired)))
        (throw (ex-info "Pairing safety counterexample not observed" {:connection connection :original original :paired paired})))
      (println (json/write-str {:schema "triplex.sql-pair-probe.v1"
                               :run (System/getenv "TRIPLEX_TRACE_RUN")
                               :source (System/getenv "TRIPLEX_TRACE_SOURCE")
                               :startedAt started :endedAt (System/currentTimeMillis)
                               :kind "pinned-jar-with-simulated-SQL-failure-not-a-real-crash-test"
                               :connection connection :original original :paired paired}))
      (shutdown-agents) (System/exit 0))
    (catch Throwable e (.printStackTrace e) (shutdown-agents) (System/exit 1))))
