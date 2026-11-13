(ns triplex.gateway.jfr
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.java.io :as io] [clojure.edn :as edn])
  (:import [jdk.jfr FlightRecorder Recording EventFactory AnnotationElement ValueDescriptor Name]
           [jdk.jfr.consumer RecordingFile RecordedEvent]
           [java.nio.file Paths]
           [java.io BufferedWriter FileWriter]))
;; [DX-T1] Why: the pinned image is a JRE; use the built-in consumer while the JVM is alive.
;; Rejected: racing JFR's own VM shutdown hook or downloading a JDK/jcmd image.
(def finished (atom false))
(defn millis [^java.time.Instant t] (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1000000.0)))
;; [DX-T1-2] Why: JFR epoch timestamps have their own anchor; bracket a marker with the shared Linux monotonic clock.
;; Rejected: pretend the trace namespace startup wall anchor is also the JFR recording's anchor.
(def clock-factory (delay (EventFactory/create [(AnnotationElement. Name "triplex.ClockSync")]
                            [(ValueDescriptor. Long/TYPE "beforeNanos") (ValueDescriptor. Long/TYPE "afterNanos")])))
(def installed (atom nil))
(def transaction-ids (java.util.concurrent.atomic.AtomicLong. (System/nanoTime)))
(def transaction-factory (delay
  (EventFactory/create [(AnnotationElement. Name "triplex.TransactionFunction")]
    [(ValueDescriptor. String "traceId") (ValueDescriptor. String "parentSpanId") (ValueDescriptor. String "spanId")])))
;; [DX-T1-4] Why: native JFR records one causally bound interval without JSON or logging on the transaction thread.
;; Rejected: treating all concurrent transactor activity as work for the current gateway request.
(defn start-transaction! [context]
  (when (and (= "tx" (:process @installed)) (realized? transaction-factory)
             (= (select-keys context [:run :source :slot]) (select-keys @installed [:run :source :slot]))
             (re-matches #"[0-9a-f]{32}" (or (:traceId context) ""))
             (not= (:traceId context) "00000000000000000000000000000000")
             (re-matches #"[0-9a-f]{16}" (or (:parent context) ""))
             (not= (:parent context) "0000000000000000"))
    (let [event (.newEvent ^EventFactory @transaction-factory)
          n (loop [] (let [n (.incrementAndGet transaction-ids)] (if (zero? n) (recur) n))) text (Long/toUnsignedString n 16)
          id (str (subs "0000000000000000" (count text)) text)]
      (when (.isEnabled event)
        (.set event 0 (:traceId context)) (.set event 1 (:parent context)) (.set event 2 id)
        (.begin event) event))))
(def native-factory (delay (EventFactory/create [(AnnotationElement. Name "triplex.NativeTransaction")]
                            [(ValueDescriptor. String "message")])))
;; Source: https://docs.datomic.com/reference/io-stats.html (native process/apply scopes).
;; [DX-T1-4] Why: capture the native t/process/apply/io counters without a FileAppender write on the serial path.
;; Rejected: DEBUG logging every native message or inventing storage time from a peer future.
(defn install-native! []
  @native-factory
  (let [context (org.slf4j.LoggerFactory/getILoggerFactory)
        logger (.getLogger context "datomic.transaction")
        appender (proxy [ch.qos.logback.core.AppenderBase] []
                   (append [event]
                     (try (let [message (.getFormattedMessage event)]
                            (when (and (.startsWith ^String message "{") (.contains ^String message ":event :tx/process"))
                              (let [record (.newEvent ^EventFactory @native-factory)]
                                (.begin record) (.set record 0 message) (.commit record))))
                          (catch Throwable _ nil))))]
    (.setContext appender context) (.setName appender "triplex-native-jfr") (.start appender)
    (.detachAndStopAllAppenders logger) (.setAdditive logger false)
    (.setLevel logger ch.qos.logback.classic.Level/INFO) (.addAppender logger appender)))
(defn native-stats [^RecordedEvent event detail]
  (let [data (edn/read-string (.getString event "message"))
        name (second (re-matches #"writer-(.+)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" (or (:threadName detail) "")))
        database-hash (when name (let [hash (.digest (java.security.MessageDigest/getInstance "SHA-256") (.getBytes ^String name "UTF-8"))]
                                  (format "%064x" (java.math.BigInteger. 1 hash))))]
    {:nativeType "triplex.NativeTransaction" :databaseHash database-hash :datomicT (str (:t data))
     :nativeStats (select-keys data [:msec :apply-msec :io-stats :pf-stats :tx-stats :datom-count])}))
(defn clock-sample! []
  (when (realized? clock-factory)
    (let [event (.newEvent ^EventFactory @clock-factory) before (System/nanoTime)]
      (.begin event)
      (let [after (System/nanoTime)] (.set event 0 before) (.set event 1 after) (.commit event)))))
(defn clock-points [file]
  (with-open [r (RecordingFile. (Paths/get file (make-array String 0)))]
    (loop [points []]
      (if-not (.hasMoreEvents r) (vec (sort-by first points))
        (let [^RecordedEvent event (.readEvent r)]
          (if (= "triplex.ClockSync" (.getName (.getEventType event)))
            (let [before (.getLong event "beforeNanos") after (.getLong event "afterNanos") uncertainty (/ (- after before) 2000000.0)]
              (recur (if (<= 0 uncertainty 0.1) (conj points [(millis (.getStartTime event)) (/ (+ (double before) after) 2000000.0) uncertainty]) points)))
            (recur points)))))))
(defn monotonic-at [points t]
  (let [n (count points)]
    (when (zero? n) (throw (IllegalStateException. "No precise JFR boot-clock markers")))
    (if (= n 1) (+ (second (first points)) (- t (ffirst points)))
      (let [i (loop [lo 0 hi n] (if (< lo hi) (let [mid (quot (+ lo hi) 2)] (if (<= (first (nth points mid)) t) (recur (inc mid) hi) (recur lo mid))) lo))
            [a am] (nth points (max 0 (min (- n 2) (dec i)))) [b bm] (nth points (max 1 (min (dec n) i)))]
        (if (= a b) (+ am (- t a)) (+ am (* (/ (- t a) (- b a)) (- bm am))))))))
;; [DX-T1-4] Why: a park or socket event needs its thread, endpoint and stack to explain a wait.
;; Rejected: exporting only its duration (cannot distinguish SQL I/O from an idle peer connection).
(defn details [^RecordedEvent event]
  (let [thread (if (.hasField event "sampledThread") (.getThread event "sampledThread") (.getThread event))
        stack (.getStackTrace event)]
    {:thread (when thread (.getJavaThreadId thread)) :threadName (when thread (.getJavaName thread))
     :fields (into {} (keep (fn [k] (when (.hasField event k) [k (.getValue event k)]))
                         ["host" "address" "port" "bytesRead" "bytesWritten" "timeout" "endOfStream"]))
     :stack (when stack (mapv (fn [frame] (let [method (.getMethod frame)]
                                 (str (.getName (.getType method)) "/" (.getName method) ":" (.getLineNumber frame))))
                              (take 32 (.getFrames stack))))}))
(defn export! [file process identity]
  (let [points (clock-points file) offset (get-in identity [:clock :offsetMs])
        uncertainty (reduce max 0 (map #(nth % 2) points))]
    (when-not (and (number? offset) (>= (count points) 2)) (throw (IllegalStateException. "JFR clock binding incomplete")))
    (with-open [r (RecordingFile. (Paths/get file (make-array String 0)))
                w (BufferedWriter. (FileWriter. (str file ".jsonl")))]
      (loop [count 0]
        (if-not (.hasMoreEvents r) {:events count :clockSamples (clojure.core/count points) :clockMaxUncertaintyMs uncertainty}
          (let [^RecordedEvent event (.readEvent r) name (.getName (.getEventType event))]
            (if (= name "triplex.ClockSync") (recur count)
              (let [detail (details event) transaction (= name "triplex.TransactionFunction") native (= name "triplex.NativeTransaction")
                    layer (cond transaction "transactor" (= name "jdk.GCPhasePause") (if (= process "tx") "transactor-gc" "gateway-gc")
                                (str/includes? name "Safepoint") "jvm-safepoint" :else "jvm-event")]
                (.write w (str (json/write-str (merge identity detail (when native (native-stats event detail)) (when transaction {:nativeType name :traceId (.getString event "traceId") :parent (.getString event "parentSpanId") :id (.getString event "spanId")}) {:type "event" :name (cond transaction "transactor.triplex-function" native "datomic.tx/process" :else name) :layer layer :process process
                             :clock (assoc (:clock identity) :uncertaintyMs (+ uncertainty 0.001))
                             :start (+ offset (monotonic-at points (millis (.getStartTime event))))
                             :end (+ offset (monotonic-at points (millis (.getEndTime event))))})) "\n"))
                (recur (inc count))))))))))
(defn sha256 [file]
  (let [digest (java.security.MessageDigest/getInstance "SHA-256") buffer (byte-array 65536)]
    (with-open [in (io/input-stream file)]
      (loop [] (let [n (.read in buffer)] (when (pos? n) (.update digest buffer 0 n) (recur)))))
    (format "%064x" (java.math.BigInteger. 1 (.digest digest)))))
(defn finish! [process identity]
  (when (compare-and-set! finished false true)
    (when-let [dir (System/getenv "TRIPLEX_TRACE_DIR")]
      (let [file (str dir "/" process ".jfr")]
        (try
          (let [^Recording r (first (filter #(= "triplex" (.getName ^Recording %)) (.getRecordings (FlightRecorder/getFlightRecorder))))]
            (when-not r (throw (IllegalStateException. "No live triplex recording")))
            (let [started (millis (.getStartTime r))]
              (when (= "RUNNING" (str (.getState r))) (clock-sample!) (.stop r))
              (.dump r (Paths/get file (make-array String 0)))
              (let [exported (export! file process identity)]
                (spit (str file "-complete.jsonl")
                  (str (json/write-str (merge identity exported {:type "jfr-complete" :role process :fileSha256 (sha256 file) :recordingStart started
                                                       :at (millis (java.time.Instant/now))})) "\n")))))
          (catch Throwable error
            (spit (str dir "/" process "-jfr-error.txt")
              (str "JFR dump/export failed; coverage incomplete: " (.getName (class error)) " " (.getMessage error) "\n"))))))))
(defn install! [process identity]
  @clock-factory
  @transaction-factory
  (reset! installed (assoc identity :process process))
  (doseq [^Recording r (.getRecordings (FlightRecorder/getFlightRecorder))]
    (.enable r "triplex.ClockSync")
    (.enable r "triplex.TransactionFunction")
    ;; [DX-T1-4] Why: targeted profiles identify transactor code without native DEBUG logging.
    ;; Rejected: adding sampling overhead to summary or silently changing every full run.
    (when (= "1" (System/getenv "TRIPLEX_TRACE_JFR_PROFILE"))
      (.withPeriod (.withStackTrace (.enable r "jdk.ExecutionSample")) (java.time.Duration/ofMillis 1))
      (.withPeriod (.withStackTrace (.enable r "jdk.NativeMethodSample")) (java.time.Duration/ofMillis 10))))
  (when (and (= process "tx") (= "1" (System/getenv "TRIPLEX_TRACE_TX_NATIVE_JFR")))
    (install-native!)
    (doseq [^Recording r (.getRecordings (FlightRecorder/getFlightRecorder))] (.enable r "triplex.NativeTransaction")))
  (clock-sample!)
  (.addShutdownHook (Runtime/getRuntime) (Thread. ^Runnable #(finish! process identity) "triplex-jfr-fallback")))
