;; [DX-TAIL1] Why: use the installed Java 21 recording API in the pinned JRE.
;; Rejected: downloading a second JDK or sampling only the busiest allocation stack.
(require '[clojure.data.json :as json]
         '[clojure.string :as str])
(import '(java.nio.file Paths) '(jdk.jfr.consumer RecordingFile))

(defn frames [event]
  (mapv (fn [frame]
          (let [method (.getMethod frame)]
            (str (.getName (.getType method)) "." (.getName method))))
        (some-> event .getStackTrace .getFrames)))

(defn category [frames]
  (let [names (str/join "\n" frames)]
    (cond
      (re-find #"gateway\.storage\$transaction_hints|datomic\.api\$with" names) "speculative-apply"
      (re-find #"gateway\.main\$request_json" names) "request-parse"
      (re-find #"gateway\.lean\$|gateway\.storage\$(input_rows|tx_data)" names) "row-texts-and-prepare"
      (re-find #"gateway\.journal\$|gateway\.feed\$" names) "journal-and-feed"
      (re-find #"gateway\.main\$(timed|response)|gateway\.storage\$commit_BANG_" names) "reply-and-commit"
      :else "other")))

(let [[file from to] *command-line-args*
      from (Long/parseLong from) to (Long/parseLong to)
      totals (atom {}) hotspots (atom {}) coverage (atom [nil nil])]
  (with-open [recording (RecordingFile. (Paths/get file (make-array String 0)))]
    (while (.hasMoreEvents recording)
      (let [event (.readEvent recording)
            at (.toEpochMilli (.getStartTime event))
            type (.getName (.getEventType event))]
        (swap! coverage (fn [[a b]] [(min (or a at) at) (max (or b at) at)]))
        (when (and (= type "jdk.ObjectAllocationSample") (<= from at) (< at to))
          (let [stack (frames event) bucket (category stack) weight (.getLong event "weight")
                site (str (.getName (.getClass event "objectClass")) " | " (first stack))]
            (swap! totals update bucket (fn [[n bytes]] [(inc (or n 0)) (+ (or bytes 0) weight)]))
            (swap! hotspots update-in [bucket site] (fnil + 0) weight))))))
  (let [[first-at last-at] @coverage]
    (assert (and first-at (<= first-at from to last-at) (seq @totals)) "Incomplete JFR measurement window")
    (println (json/write-str
               {:from from :to to :firstEvent first-at :lastEvent last-at
                :groups (into {} (map (fn [[bucket [samples bytes]]]
                                        [bucket {:samples samples :weightBytes bytes
                                                 :top (take 8 (sort-by val > (@hotspots bucket)))}])
                                      @totals))}))))
