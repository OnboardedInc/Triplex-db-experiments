(ns triplex.gateway.native-settings
  (:require [clojure.data.json :as json])
  (:import [java.io File] [java.lang.management ManagementFactory] [javax.management ObjectName] [com.sun.management HotSpotDiagnosticMXBean]
           [org.slf4j LoggerFactory]))
;; [DX-T1-4] Why: record the running JVM's effective logger levels once, including off controls.
;; Rejected: treating an XML filename or the absence of a message as proof that WARN was loaded.
(def logger-names ["datomic.transaction" "datomic.kv-cluster" "datomic.peer" "datomic.update" "datomic.log"])
;; [DX-JVM1] Why: read the resolved values in the running vendor peer, including placement-sensitive defaults.
;; Rejected: substituting a system property or starting another JVM with different ergonomics.
(def ^:private datomic-keys
  ["memoryIndexThreshold" "memoryIndexMax" "objectCacheMax" "readConcurrency" "writeConcurrency"
   "indexParallelism" "indexIOParallelism" "indexParallelMerges" "dynamicIndexParallelism"
   "heartbeatIntervalMsec" "txTimeoutMsec" "peerConnectionTTLMsec" "prefetchConcurrency" "prefetchProbes"
   "queryPool" "readAheadPool" "externalSortPool" "deleteConcurrency" "valcachePutsPool"
   "memcachedGetTimeoutMsec" "memcachedConfigTimeoutMsec"])

(defn- resolved-datomic []
  (let [property (when-let [config (find-ns 'datomic.config)] (ns-resolve config 'property))]
    (into (sorted-map)
      (for [name datomic-keys
            :let [key (str "datomic." name)
                  observed (when property (try (property key) (catch Exception _ nil)))]]
        [key {:value (when (or (number? observed) (boolean? observed)) observed)
              :specified (some? (System/getProperty key))}]))))

(defn- managed-sql-pools []
  (let [server (ManagementFactory/getPlatformMBeanServer)
        keys ["MinIdle" "MaxIdle" "MaxTotal" "MaxWaitMillis"
              "MinEvictableIdleTimeMillis" "TimeBetweenEvictionRunsMillis"]]
    ;; [DX-JVM1] Why: pool settings are only observations if the live pool publishes them.
    ;; Rejected: computing its size from available processors or exposing arbitrary MBean names.
    (mapv (fn [pool]
            (into (sorted-map)
              (keep (fn [key]
                      (let [value (try (.getAttribute server pool key) (catch Exception _ nil))]
                        (when (number? value) [key value]))) keys)))
          (.queryNames server (ObjectName. "org.apache.commons.pool2:*") nil))))

(defonce recorded
  (when (= "1" (System/getenv "TRIPLEX_NATIVE_SETTINGS_READBACK"))
    (let [dir (System/getenv "TRIPLEX_TRACE_DIR")
          process (System/getenv "TRIPLEX_TRACE_PROCESS")
          row {:type "native-settings" :at (System/currentTimeMillis)
               :run (System/getenv "TRIPLEX_TRACE_RUN") :source (System/getenv "TRIPLEX_TRACE_SOURCE")
               :slot (System/getenv "TRIPLEX_TRACE_SLOT") :process process
               :configuration (System/getProperty "logback.configurationFile")
               ;; [DX-T1-12] Why: bind the effective compiler/heap policy without recording arbitrary JVM arguments or secrets. Rejected: an environment string as proof the VM accepted a flag.
               :jvm {:compileThresholdScaling (try (.getValue (.getVMOption (ManagementFactory/getPlatformMXBean HotSpotDiagnosticMXBean) "CompileThresholdScaling")) (catch Throwable _ nil))
                     :maxHeapBytes (.maxMemory (Runtime/getRuntime))}
               :datomic (resolved-datomic)
               :commonsPoolJmx (managed-sql-pools)
               :loggers (into {} (map (fn [name] [name (str (.getEffectiveLevel (LoggerFactory/getLogger name)))]) logger-names))}]
      (.mkdirs (File. dir))
      (spit (File. dir (str process "-native-settings.json")) (str (json/write-str row) "\n")))))
;; [DX-T1-4] Why: Datomic's callback loads this namespace in the transactor without per-transaction file logging.
;; Rejected: enabling native transaction INFO merely to inspect its configuration.
(defn metrics [_] nil)
