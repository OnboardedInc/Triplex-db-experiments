(ns triplex.gateway.commit-order
  (:import [java.util TreeMap]
           [java.util.concurrent ConcurrentHashMap Executors ScheduledExecutorService ThreadFactory TimeUnit]))
;; [DX-B10] Why: a missing predecessor must fail a buffered suffix, never let it reach Datomic.
;; Rejected: a timed best-effort monitor (permits later commands to steal earlier logical positions).
(def gap-ms (Long/parseLong (or (System/getenv "TX2_COMMIT_ORDER_GAP_MS") "30000")))
(def buffer-limit 64)
(def client-limit 4096)
(def ^ScheduledExecutorService scheduler
  (Executors/newSingleThreadScheduledExecutor
    (reify ThreadFactory (newThread [_ task] (doto (Thread. task "tx2-commit-order-deadline") (.setDaemon true))))))
(def ^ConcurrentHashMap lanes (ConcurrentHashMap.))
(defn order-error [code next]
  (ex-info "Resend the client suffix from expectedSequence" {:status 409 :code code :expectedSequence next}))
(defn lane-for [client]
  (or (.get lanes client)
      (locking lanes
        (or (.get lanes client)
            (do (when (>= (.size lanes) client-limit)
                  (throw (ex-info "Commit ordering client budget exhausted" {:status 429 :code "CommitOrderClientsFull"})))
                (let [lane (atom {:next 1 :pending (TreeMap.) :timer nil :generation 0})]
                  (.put lanes client lane) lane))))))
(defn cancel-timer! [state]
  (when-let [timer (:timer state)] (.cancel ^java.util.concurrent.Future timer false)))
(defn fail-suffix! [lane code]
  ;; Caller holds the lane monitor; submitted futures are not part of this buffer.
  (let [{:keys [next pending] :as state} @lane error (order-error code next)]
    (cancel-timer! state)
    (doseq [entry (.values ^TreeMap pending)] (deliver (:result entry) {:error error}))
    (.clear ^TreeMap pending)
    (swap! lane assoc :timer nil :generation (inc (:generation state)))
    error))
(defn arm-gap! [lane timeout-ms]
  (let [{:keys [next pending generation] :as state} @lane]
    (cancel-timer! state)
    (if (.isEmpty ^TreeMap pending) (swap! lane assoc :timer nil)
      (let [earliest (reduce min (map :arrived (.values ^TreeMap pending)))
            remaining (max 0 (- (+ earliest (* timeout-ms 1000000)) (System/nanoTime)))
            task (reify Runnable
                   (run [_]
                     (locking lane
                       (when (and (= next (:next @lane)) (= generation (:generation @lane))
                                  (not (.isEmpty ^TreeMap (:pending @lane))))
                         (fail-suffix! lane "CommitOrderGap")))))
            timer (.schedule scheduler ^Runnable task (long remaining) TimeUnit/NANOSECONDS)]
        (swap! lane assoc :timer timer)))))
(defn enqueue!
  ([client sequence operation submit] (enqueue! client sequence operation submit gap-ms buffer-limit))
  ([client sequence operation submit timeout-ms limit]
   (enqueue! client sequence operation submit timeout-ms limit operation))
  ([client sequence operation submit timeout-ms limit identity]
   (when-not (and (string? client) (<= 1 (count client) 64)
                  (integer? sequence) (<= 1 sequence 9007199254740991)
                  (string? operation) (pos? timeout-ms) (pos? limit))
     (throw (ex-info "Invalid commit sequence" {:status 400 :code "InvalidValue"})))
   (let [lane (lane-for client)
         result
         (locking lane
           (let [{:keys [next pending]} @lane]
             (when (< sequence next)
               ;; Receipt lookup resolves a handed-over command; it must never be submitted a second time.
               (throw (ex-info "Sequence already handed over; resolve operation" {:status 503 :code "OutcomeUnknown"})))
             (if-let [old (.get ^TreeMap pending (long sequence))]
               (if (and (= operation (:operation old)) (= identity (:identity old))) (:result old)
                 (throw (order-error "CommitOrderSequenceConflict" next)))
               (do
                 (when (and (not= sequence next) (>= (.size ^TreeMap pending) limit))
                   (throw (fail-suffix! lane "CommitOrderBufferFull")))
                 (let [result (promise)]
                   (.put ^TreeMap pending (long sequence)
                     {:operation operation :identity identity :submit submit :result result :arrived (System/nanoTime)})
                   ;; [DX-B10] Why: call transact-async under one monitor in sequence, releasing before ACK.
                   ;; Rejected: acknowledging under this lock (turns a pipeline back into serial commits).
                   (loop []
                     (when-let [entry (.remove ^TreeMap pending (long (:next @lane)))]
                       (let [outcome (try {:future ((:submit entry))} (catch Exception e {:error e}))]
                         (deliver (:result entry) outcome)
                         (if (:error outcome) (fail-suffix! lane "CommitOrderSubmitFailed")
                           (do (swap! lane update :next inc) (recur))))))
                   (arm-gap! lane timeout-ms)
                   result)))))
         outcome @result]
     (if-let [error (:error outcome)] (throw error) (:future outcome)))))
