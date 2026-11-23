(ns triplex.age.telemetry
  (:require [clojure.data.json :as json])
  (:import [org.slf4j Logger LoggerFactory]))

(def ^Logger logger (LoggerFactory/getLogger "triplex.age.telemetry"))

(def observed
  [:AlarmBackPressure :AlarmIndexingJobFailed :MemoryIndexMB :CreateEntireIndexMsec
   :LogWriteMsec :TransactionApplyMsec :TransactionMsec :TransactionDatoms :TransactionBatch
   :StoragePutMsec :StorageGetMsec :StorageBackoff :IndexWriteMsec :IndexWrites :ObjectCache])

(defn capture! [metrics]
  ;; [DX-AGE1] Why: use the supported transactor callback for minute-bucket storage and back-pressure samples.
  ;; Rejected: treating absence of a sampled transaction log line as zero pressure.
  (.info logger (str "AGE_BULK_METRICS " (json/write-str (select-keys metrics observed)))))
