(ns triplex.gateway.native-settings
  (:require [clojure.data.json :as json])
  (:import [java.io File]
           [org.slf4j LoggerFactory]))
;; [DX-T1-4] Why: record the running JVM's effective logger levels once, including off controls.
;; Rejected: treating an XML filename or the absence of a message as proof that WARN was loaded.
(def logger-names ["datomic.transaction" "datomic.kv-cluster" "datomic.peer" "datomic.update" "datomic.log"])
(defonce recorded
  (when (= "1" (System/getenv "TRIPLEX_NATIVE_SETTINGS_READBACK"))
    (let [dir (System/getenv "TRIPLEX_TRACE_DIR")
          process (System/getenv "TRIPLEX_TRACE_PROCESS")
          row {:type "native-settings" :at (System/currentTimeMillis)
               :run (System/getenv "TRIPLEX_TRACE_RUN") :source (System/getenv "TRIPLEX_TRACE_SOURCE")
               :slot (System/getenv "TRIPLEX_TRACE_SLOT") :process process
               :configuration (System/getProperty "logback.configurationFile")
               :loggers (into {} (map (fn [name] [name (str (.getEffectiveLevel (LoggerFactory/getLogger name)))]) logger-names))}]
      (.mkdirs (File. dir))
      (spit (File. dir (str process "-native-settings.json")) (str (json/write-str row) "\n")))))
;; [DX-T1-4] Why: Datomic's callback loads this namespace in the transactor without per-transaction file logging.
;; Rejected: enabling native transaction INFO merely to inspect its configuration.
(defn metrics [_] nil)
