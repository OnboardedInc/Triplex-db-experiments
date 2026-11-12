(ns triplex.gateway.jfr
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.java.io :as io])
  (:import [jdk.jfr FlightRecorder Recording]
           [jdk.jfr.consumer RecordingFile RecordedEvent]
           [java.nio.file Paths]
           [java.io BufferedWriter FileWriter]))
;; [DX-T1] Why: the pinned image is a JRE; use the built-in consumer while the JVM is alive.
;; Rejected: racing JFR's own VM shutdown hook or downloading a JDK/jcmd image.
(def finished (atom false))
(defn millis [^java.time.Instant t] (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1000000.0)))
(defn export! [file process identity]
  (with-open [r (RecordingFile. (Paths/get file (make-array String 0)))
              w (BufferedWriter. (FileWriter. (str file ".jsonl")))]
    (loop [count 0]
      (if-not (.hasMoreEvents r) count
        (let [^RecordedEvent event (.readEvent r) name (.getName (.getEventType event))
              thread (.getThread event)
              layer (cond (= name "jdk.GCPhasePause") (if (= process "tx") "transactor-gc" "gateway-gc")
                          (str/includes? name "Safepoint") "jvm-safepoint" :else "jvm-event")]
          (.write w (str (json/write-str (merge identity {:type "event" :name name :layer layer :process process
                       :thread (when thread (.getJavaThreadId thread))
                       :start (millis (.getStartTime event)) :end (millis (.getEndTime event))})) "\n"))
          (recur (inc count)))))))
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
              (when (= "RUNNING" (str (.getState r))) (.stop r))
              (.dump r (Paths/get file (make-array String 0)))
              (let [count (export! file process identity)]
                (spit (str file "-complete.jsonl")
                  (str (json/write-str (merge identity {:type "jfr-complete" :role process :events count :fileSha256 (sha256 file) :recordingStart started
                                                       :at (millis (java.time.Instant/now))})) "\n")))))
          (catch Throwable error
            (spit (str dir "/" process "-jfr-error.txt")
              (str "JFR dump/export failed; coverage incomplete: " (.getName (class error)) " " (.getMessage error) "\n"))))))))
(defn install! [process identity]
  (.addShutdownHook (Runtime/getRuntime) (Thread. ^Runnable #(finish! process identity) "triplex-jfr-fallback")))
