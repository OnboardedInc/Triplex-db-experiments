(ns triplex.gateway.replay-capture
  (:require [datomic.api :as d] [clojure.java.io :as io]))

;; [DX-T1-11] Why: retain the submitted payload and an unfiltered immutable peer value; d/with rejects as-of DBs.
;; Rejected: reconstruct a different payload from the log, or replay/write capture files during the timed window.
(def enabled (= "1" (System/getenv "TRIPLEX_LAYOUT_REPLAY")))
(def samples (atom []))
(def counts (atom {}))
(def pending (atom {}))
(defn band [n] (cond (<= 5 n 10) "small" (<= 11 n 25) "medium" (<= 26 n 50) "large"))
(defn fact-count [data]
  (let [p (get-in data [0 1]) journals (set (map #(str "e:" %) (:journal-entities p)))]
    (count (filter #(and (sequential? %) (= :triplex/assert (first %))
                        (not (journals (second %)))) (:ops p)))))
(def runner
  (delay
    (doto (Thread. ^Runnable
            (fn []
              (let [root (System/getenv "TRIPLEX_TRACE_DIR") marker (io/file root ".layout-replay")]
                (try
                  (loop [] (when-not (.exists marker) (Thread/sleep 250) (recur)))
                  ((requiring-resolve 'triplex.gateway.layout-replay/run!) @samples root)
                  (catch Throwable e
                    (with-open [w (java.io.PrintWriter. (io/writer (io/file root "layout-replay-error.txt")))]
                      (.printStackTrace e w)))))) "triplex-layout-replay")
      (.setDaemon true) (.start))))
(defn capture! [conn data input]
  (when enabled
    @runner
    (let [n (fact-count data) b (band n) operation (get input "operationId") key [b operation]]
      (when (and b operation (= 1 (count (get input "claims")))
                 (= 1 (count (get-in data [0 1 :journal-entities]))))
        (when (and (not (get @counts key)) (< (get @counts b 0) 120))
          (swap! pending assoc operation {:data data :conn conn :operationId operation :facts n :band b
                                         :capturedAt (System/currentTimeMillis)}))))))

(defn discard! [input]
  (when enabled (swap! pending dissoc (get input "operationId"))))
(defn completed! [report input]
  (when enabled
    (let [operation (get input "operationId") sample (get @pending operation) b (:band sample) key [b operation]]
      (discard! input)
      (when sample
        (locking counts
          (when (and (not (get @counts key)) (< (get @counts b 0) 120))
            ;; [DX-T1-11] Why: price only committed payloads on the exact authoritative unfiltered db-before returned by the peer.
            ;; Rejected: the gateway's prospective d/db (a rejected CAS attempt is not replayable on that basis).
            (let [db (:db-before report)]
              (when-not db (throw (ex-info "Replay peer result has no db-before" {})))
              (swap! counts #(assoc % b (inc (get % b 0)) key true))
              (swap! samples conj (assoc sample :db db :basisT (d/basis-t db) :datomicT (d/basis-t (:db-after report)))))))))))
