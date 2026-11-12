(ns triplex.gateway.jfr
  (:require [clojure.data.json :as json] [clojure.string :as str])
  (:import [jdk.jfr FlightRecorder Recording]
           [jdk.jfr.consumer RecordingFile RecordedEvent]
           [java.nio.file Paths Files]
           [java.io BufferedWriter FileWriter]))
;; [DX-T1] Why: the pinned image is a JRE, so export with the built-in consumer API, not a downloaded jcmd/JDK.
;; Rejected: a recording that needs an external manual conversion before the timeline can show pauses.
(defn millis [^java.time.Instant t] (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1000000.0)))
(defn export! [file process identity]
  (with-open [r (RecordingFile. (Paths/get file (make-array String 0)))
              w (BufferedWriter. (FileWriter. (str file ".jsonl")))]
    (while (.hasMoreEvents r)
      (let [^RecordedEvent event (.readEvent r) name (.getName (.getEventType event))
            thread (.getThread event)
            layer (cond (= name "jdk.GCPhasePause") (if (= process "tx") "transactor-gc" "gateway-gc")
                        (str/includes? name "Safepoint") "jvm-safepoint"
                        :else "jvm-event")]
        (.write w (str (json/write-str (merge identity {:type "event" :name name :layer layer :process process
                     :thread (when thread (.getJavaThreadId thread))
                     :start (millis (.getStartTime event)) :end (millis (.getEndTime event))})) "\n"))))))
(defn install! [process identity]
  (.addShutdownHook (Runtime/getRuntime)
    (Thread. ^Runnable
      (fn []
        (when-let [dir (System/getenv "TRIPLEX_TRACE_DIR")]
          (let [file (str dir "/" process "-export.jfr")]
            (try
              (doseq [^Recording r (.getRecordings (FlightRecorder/getFlightRecorder))]
                (when (= "triplex" (.getName r)) (when (= "RUNNING" (str (.getState r))) (.stop r)) (.dump r (Paths/get file (make-array String 0)))))
              (export! file process identity)
              (Files/deleteIfExists (Paths/get file (make-array String 0)))
              (catch Throwable error (spit (str dir "/" process "-jfr-error.txt") (str "JFR dump/export failed; coverage incomplete: " (.getName (class error)) " " (.getMessage error) "\n")))))))
      "triplex-jfr-export")))
