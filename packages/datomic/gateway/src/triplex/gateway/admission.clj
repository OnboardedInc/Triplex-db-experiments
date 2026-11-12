(ns triplex.gateway.admission
  (:require [triplex.gateway.trace :as trace])
  (:import [java.util.concurrent Semaphore]))
;; [DX-B7-S1] Why: CPU work queues FIFO on the assigned cores; waits retain Jetty threads but no permit.
;; Rejected: lowering Jetty's thread ceiling (long polls would exhaust it and starve feed delivery).
(def read-permits
  (let [n (Integer/parseInt (or (System/getenv "TX2_READ_PERMITS")
                              (str (.availableProcessors (Runtime/getRuntime)))))]
    (when-not (<= 1 n 256) (throw (IllegalArgumentException. "TX2_READ_PERMITS must be 1..256"))) n))
(def reads (Semaphore. read-permits true))
;; [DX-B7-S1] Why: feed pages must never queue behind the closed-loop pull cohort.
;; Rejected: one shared semaphore (256 readers can delay notification delivery).
(def journals (Semaphore. 1 true))
(defn execute [^Semaphore permits f]
  (trace/span "gateway.admission-wait" "gateway-queue" (.acquire permits))
  (try (trace/span "gateway.admitted-work" "gateway" (f)) (finally (.release permits))))
