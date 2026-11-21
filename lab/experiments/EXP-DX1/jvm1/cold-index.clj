(ns triplex.cold-index
  (:require [clojure.data.json :as json]
            [clojure.java.io :as file]
            [triplex.gateway.native-counters :as counters])
  (:import [java.util.concurrent ArrayBlockingQueue]
           [java.util.concurrent.atomic AtomicLong]))

;; [DX-JVM1] Why: time native index adoption and retain engine gauges without polling application rows.
;; Rejected: counting an index build as adopted or blocking the transactor on log output.
(def gauges (ArrayBlockingQueue. 256))
(def dropped (AtomicLong. 0))
(def attempt (System/getenv "PREP1_ATTEMPT"))
(defn metrics [value]
  ((requiring-resolve 'triplex.gateway.native-settings/metrics) value)
  (when-not (.offer gauges {:type "metrics" :wallMs (System/currentTimeMillis)
                           :monoNs (str (System/nanoTime))
                           :gauges (select-keys value [:MemoryIndexMB :AlarmBackPressure :CreateEntireIndexMsec])})
    (.incrementAndGet dropped)))

(let [done (atom false)
      clock #(/ (double (System/nanoTime)) 1000000.0)
      thread (Thread.
              (fn []
                (with-open [out (file/writer (file/file (System/getenv "TRIPLEX_TRACE_DIR") "cold-index.ndjson"))]
                  (let [emit #(.write out (str (json/write-str (assoc % :attempt attempt)) "\n"))]
                    (loop []
                      (emit {:type "sample" :wallMs (System/currentTimeMillis) :monoNs (str (System/nanoTime))
                             :observer (counters/install! clock)})
                      (counters/drain! emit)
                      (loop []
                        (when-let [row (.poll gauges)]
                          (emit row)
                          (recur)))
                      (.flush out)
                      (when-not @done
                        (Thread/sleep 1000)
                        (recur)))
                    (emit {:type "end" :dropped (+ (.get dropped) (:dropped (counters/status)))})))))]
  (.setDaemon thread true)
  (.start thread)
  (.addShutdownHook (Runtime/getRuntime)
                    (Thread. (fn [] (reset! done true) (.join thread 2500)))))
