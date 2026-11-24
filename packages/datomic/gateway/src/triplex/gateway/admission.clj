(ns triplex.gateway.admission
  (:require [triplex.gateway.trace :as trace])
  (:import [java.util.concurrent Semaphore TimeUnit]
           [java.util.concurrent.atomic AtomicInteger AtomicLong]))
;; [DX-B7-S1] Why: CPU work queues FIFO on the assigned cores; waits retain Jetty threads but no permit.
;; Rejected: lowering Jetty's thread ceiling (long polls would exhaust it and starve feed delivery).
(def read-permits
  (let [n (Integer/parseInt (or (System/getenv "TX2_READ_PERMITS")
                              (str (.availableProcessors (Runtime/getRuntime)))))]
    (when-not (<= 1 n 256) (throw (IllegalArgumentException. "TX2_READ_PERMITS must be 1..256"))) n))
(def reads (Semaphore. read-permits true))
;; [DX-B7-S1] Why: feed pages must never queue behind the closed-loop pull cohort.
;; Rejected: one shared semaphore (256 readers can delay notification delivery).
;; [DX-JRN1] Why: the journal permit count is a setting (TX2_JOURNAL_PERMITS, default 1, the old value) so a server run can
;; judge two permits once every journal page is bounded. Rejected: changing the default before that measurement.
(def journal-permits
  (let [n (Integer/parseInt (or (System/getenv "TX2_JOURNAL_PERMITS") "1"))]
    (when-not (<= 1 n 64) (throw (IllegalArgumentException. "TX2_JOURNAL_PERMITS must be 1..64"))) n))
(def journals (Semaphore. journal-permits true))

;; [DX-W3] Why: a read that waits for a permit holds one of Jetty's worker threads; at 1,024 parked pinned reads they
;; can hold all of them, and feed polls, health checks and current pulls then cannot reach the gateway at all. With a
;; bound, a read that would wait beyond it is answered at once with 503 "ReadBusy" (retry), and its thread is freed.
;; Only pinned reads (a basis position or a held handle) can be refused: a current pull keeps its place in the fair
;; queue behind at most the bound's pinned reads, so the bound cannot turn current pulls into retries.
;; Default off: unset means every read waits, exactly as before. Rejected: lowering Jetty's thread ceiling (it starves
;; feed polls, see above) and a wait timeout (the thread is still held for the whole timeout).
(def read-wait-limit
  (when-let [text (not-empty (System/getenv "TX2_READ_WAIT_LIMIT"))]
    (let [n (Integer/parseInt text)]
      (when-not (<= 1 n 4096) (throw (IllegalArgumentException. "TX2_READ_WAIT_LIMIT must be 1..4096"))) n)))
(def read-retry-ms 25)
;; [DX-W3] Why: record what is true about the read queue (always counted; counting changes no decision).
(def read-waiting (AtomicInteger.))
(def read-waiting-peak (AtomicInteger.))
(def read-refused (AtomicLong.))
(def read-admitted (AtomicLong.))
(defn- note-peak! [^AtomicInteger peak n]
  (loop [] (let [p (.get peak)] (when (and (> n p) (not (.compareAndSet peak p n))) (recur)))))

(defn- busy! []
  (.incrementAndGet ^AtomicLong read-refused)
  (throw (ex-info "Read gateway busy: too many reads are waiting for a read permit; retry shortly"
                  {:status 503 :code "ReadBusy" :retryAfterMs read-retry-ms})))

(defn pinned? [input]
  (boolean (and (map? input) (or (some? (get-in input ["basis" "recordedPosition"])) (some? (get input "handle"))))))
(defn- acquire-read! [^Semaphore permits refusable?]
  ;; A zero-timeout tryAcquire honours the semaphore's fairness (the no-argument form would overtake waiters).
  (when-not (.tryAcquire permits 0 TimeUnit/MILLISECONDS)
    (let [n (.incrementAndGet ^AtomicInteger read-waiting)]
      (try
        (when (and refusable? read-wait-limit (> n read-wait-limit)) (busy!))
        (note-peak! read-waiting-peak n)
        (.acquire permits)
        (finally (.decrementAndGet ^AtomicInteger read-waiting)))))
  (.incrementAndGet ^AtomicLong read-admitted))

(defn- execute-admitted [^Semaphore permits f refusable?]
  (if (identical? permits reads)
    (trace/span "gateway.admission-wait" "gateway-queue" (acquire-read! permits refusable?))
    (trace/span "gateway.admission-wait" "gateway-queue" (.acquire permits)))
  (try (trace/span "gateway.admitted-work" "gateway" (f)) (finally (.release permits))))

;; [DX-XQ6] Why: the exact sweep reads each subject with the pinned read's own code (storage/read-rows) while it holds a
;; permit of its own pool (sweep.clj); that code must not also take a read permit, or every sweep would compete with
;; the pinned and current readers for theirs. Bound only inside a sweep page; unbound, every read is admitted as before.
(def ^:dynamic *own-pool* nil)

(defn execute
  ([permits f] (execute permits f false))
  ([^Semaphore permits f refusable?]
   (if (and *own-pool* (identical? permits reads))
     (trace/span "gateway.admitted-work" "gateway" (f))
     (execute-admitted permits f refusable?))))

(defn execute-for [input permits f] (execute permits f (pinned? input)))

(defn read-stats []
  {:readPermits read-permits :readWaitLimit read-wait-limit
   :readPermitsFree (.availablePermits ^Semaphore reads)
   :readsWaiting (.get ^AtomicInteger read-waiting) :readsWaitingPeak (.get ^AtomicInteger read-waiting-peak)
   :readsRefusedBusy (.get ^AtomicLong read-refused) :readsAdmitted (.get ^AtomicLong read-admitted)
   :journalPermitsFree (.availablePermits ^Semaphore journals)
   :journalWaiting (.getQueueLength ^Semaphore journals)})

(defn reset-peaks! [] (.set ^AtomicInteger read-waiting-peak (.get ^AtomicInteger read-waiting)))
