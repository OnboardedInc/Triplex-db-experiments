(ns triplex.gateway.trace
  (:require [clojure.data.json :as json] [clojure.string :as str] [ring.core.protocols :as protocols] [triplex.gateway.jfr :as jfr])
  (:import [java.io BufferedWriter FileWriter File]
           [java.util UUID] [org.slf4j MDC]
           [java.util.concurrent.atomic AtomicLong]))
;; [DX-T1] Why: request-local buffers preserve nesting without an SDK or cross-request mutable context.
;; Rejected: logging payloads or inferring transactor execution from a peer future's wall time.
(def level (or (System/getenv "TRIPLEX_TRACE_LEVEL") "off"))
(when-not (#{"off" "summary" "full"} level) (throw (IllegalArgumentException. "Invalid TRIPLEX_TRACE_LEVEL")))
(def enabled (not= level "off"))
(def ^:dynamic *request* nil)
(def ^:dynamic *parent* nil)
(def ids (AtomicLong. (.getMostSignificantBits (UUID/randomUUID))))
(def origin-ms (System/currentTimeMillis))
(def origin-ns (System/nanoTime))
(defn clock [] (+ (double origin-ms) (/ (- (System/nanoTime) origin-ns) 1000000.0)))
(defn id [] (format "%016x" (.incrementAndGet ids)))
(def identity-fields {:run (or (System/getenv "TRIPLEX_TRACE_RUN") "unbound")
                      :source (or (System/getenv "TRIPLEX_TRACE_SOURCE") "unbound")
                      :slot (or (System/getenv "TRIPLEX_TRACE_SLOT") "unbound")
                      :process (or (System/getenv "TRIPLEX_TRACE_PROCESS") "gateway")})
(def writer (delay
  (when-let [dir (System/getenv "TRIPLEX_TRACE_DIR")]
    (.mkdirs (File. dir))
    (let [file (File. dir (str (:process identity-fields) ".jsonl"))]
      (when (.exists file) (throw (ex-info "Trace file exists; use a fresh run" {})))
      (BufferedWriter. (FileWriter. file) 262144)))))
(defn emit! [row]
  (try (when-let [^BufferedWriter w @writer]
         (locking w (.write w (str (json/write-str (merge identity-fields row)) "\n"))))
       (catch Exception _ (binding [*out* *err*] (println "Triplex trace output failed; evidence incomplete")))))
(defn flush! [] (when (realized? writer) (when-let [^BufferedWriter w @writer] (locking w (.flush w)))))
(when enabled
  (jfr/install! (:process identity-fields) identity-fields)
  (let [t (Thread. ^Runnable (fn [] (while true (Thread/sleep 1000) (flush!)
        (when-let [dir (System/getenv "TRIPLEX_TRACE_DIR")]
          (when (.exists (File. (str dir "/.finish"))) (jfr/finish! (:process identity-fields) identity-fields))))) "triplex-trace-flush")]
    (.setDaemon t true) (.start t))
  (.addShutdownHook (Runtime/getRuntime) (Thread. ^Runnable flush!)))
(defn parse-parent [value]
  (when (string? value)
    (when-let [[_ trace parent] (re-matches #"00-([0-9a-f]{32})-([0-9a-f]{16})-0[01]" value)]
      (when (and (not= trace (apply str (repeat 32 "0"))) (not= parent (apply str (repeat 16 "0"))))
        {:trace trace :parent parent}))))
(defn sampled? [trace]
  ;; Same unsigned FNV-1a rule as the Node recorder; a fixed sample independent of latency.
  (zero? (mod (reduce (fn [h c] (bit-and 0xffffffff (* (bit-xor h (int c)) 16777619))) 2166136261 trace) 1024)))
(defn counter! [name n]
  (when *request* (swap! *request* update-in [:counters name] (fnil + 0) n)))
(defn attribute! [name value] (when *request* (swap! *request* assoc-in [:attributes name] value)))
(defn interval! [name layer start end parent]
  (when *request*
    (let [span {:id (id) :parent (or parent *parent*) :name name :layer layer :start start :end end
                :thread (.getId (Thread/currentThread))}]
      (swap! *request* (fn [r] (if (< (count (:spans r)) 8192) (update r :spans conj span) (update r :truncated inc)))))))
(defmacro span [name layer & body]
  `(if-not *request* (do ~@body)
     (let [start# (clock) parent# *parent* id# (id) old# (MDC/get "trace_id")]
       (MDC/put "trace_id" (:traceId @*request*))
       (try (binding [*parent* id#] ~@body)
         (finally
           (if old# (MDC/put "trace_id" old#) (MDC/remove "trace_id"))
           (let [end# (clock) record# {:id id# :parent parent# :name ~name :layer ~layer :start start# :end end# :thread (.getId (Thread/currentThread))}]
             (when (or (not= level "summary") (= "commit" (:kind @*request*)) (not= ~layer "gateway") (>= (- end# start#) 0.5))
               (swap! *request* (fn [r#] (if (< (count (:spans r#)) 8192) (update r# :spans conj record#) (update r# :truncated inc)))))))))))
(defn finish! [request]
  (let [r (assoc @request :end (clock)) duration (- (:end r) (:start r))]
    (when (or (= level "full") (= (:kind r) "commit") (>= duration 50) (sampled? (:traceId r))) (emit! r))))
(defn handler [f request]
  (if-not enabled (let [r (f request) p (parse-parent (get-in request [:headers "traceparent"]))]
                   (cond-> r p (assoc-in [:headers "traceparent"] (str "00-" (:trace p) "-" (id) "-01"))))
    (let [parent (parse-parent (get-in request [:headers "traceparent"])) root (id)
          trace (or (:trace parent) (str/replace (str (UUID/randomUUID)) "-" ""))
          route (str/replace (or (:uri request) "") #"/s2?-[^/]+" "/{db}")
          state (atom (merge identity-fields {:schema "triplex.trace.v1" :type "request" :kind (if (or (.endsWith route "/transact") (= "commit" (get-in request [:headers "x-triplex-trace-kind"]))) "commit" "read")
                         :traceId trace :root root :parent (:parent parent) :thread (.getId (Thread/currentThread))
                         :start (clock) :name (str "gateway " route) :spans [] :truncated 0 :counters {} :attributes {}}))]
      (binding [*request* state *parent* root]
        (try
          (let [response (span "gateway.route" "gateway" (f request))
                bytes (span "gateway.response-encode" "gateway"
                        (let [body (:body response)] (if (string? body) (.getBytes ^String body "UTF-8") body)))
                wrapped (reify protocols/StreamableResponseBody
                          (write-body-to-stream [_ _ output]
                            (binding [*request* state *parent* root]
                              (try (span "gateway.response-write" "gateway" (.write ^java.io.OutputStream output ^bytes bytes) (.flush ^java.io.OutputStream output))
                                   (finally (finish! state))))))]
            (attribute! :status (:status response))
            (-> response (assoc :body wrapped)
                (assoc-in [:headers "Content-Length"] (str (alength ^bytes bytes)))
                (assoc-in [:headers "traceparent"] (str "00-" trace "-" root "-01"))))
          (catch Throwable error (attribute! :failed true) (finish! state) (throw error)))))))
;; Official callback accepts unknown numeric/map metrics; no credentials or database names are recorded.
(defn metrics [metrics]
  (emit! {:type "metrics" :at (clock) :metrics metrics}))
