(ns triplex.gateway.batch
  (:require [datomic.api :as d] [datomic.measure.io-stats :as io] [clojure.data.json :as json] [clojure.string :as str]
            [triplex.gateway.admission :as admission] [triplex.gateway.storage :as storage]
            [triplex.gateway.reach :as reach] [triplex.gateway.uncached :as uncached]
            [triplex.gateway.at-least :as at-least] [triplex.gateway.ids :as ids]
            [triplex.gateway.stats :as stats] [triplex.gateway.trace :as trace])
  (:import [java.lang.management ManagementFactory ThreadMXBean]))

;; [DX-API1] One API call of the product makes tens to thousands of reads (lab/experiments/EXP-DX1/api1/API-CALL-READS.md).
;; Each is one HTTP round trip to this gateway today, each resolves its own position when unpinned, and each takes its own
;; read permit and its own serial storage loads. `POST /v2/db/{db}/batch` (behind TX2_READ_BATCH=1; absent otherwise)
;; carries a call's reads in one request and answers all of them at ONE position, stated in the answer:
;;   - the position is the request's `basis.recordedPosition`, or, without one, this peer's head when the batch starts
;;     (after `atLeastPosition`, when given, is reached); every entry is read with that position and the request's validAt;
;;   - every entry is answered by the unchanged single-read code on the same database value: a `rows` entry by
;;     storage/read-rows (the /v1/.../read route), a `reach` entry by reach/build-response (the /v2/.../reach-many route),
;;     an `ids` entry by ids/page (the /v2/.../ids route, when TX2_ID_LISTS=1);
;;   - an entry may take its subjects from an earlier entry's answer (`entityIdsFrom` / `rootsFrom`: the reference values of
;;     one attribute in a `rows` answer, or the IDs of an `ids` page), so a call's dependent reads go in the same request;
;;   - before entries run, the identity and EAVT rows of every subject whose ID is already known are touched side by side
;;     on the read prefetch pool (uncached/touch-all!, RD5's pool), in waves as references resolve, so a cold batch makes its
;;     storage round trips overlapped instead of one after another; the reads then run unchanged and find them cached.
;; Admission: a batch holds exactly ONE read permit for all its row and reach entries (and the waiting-read bound applies to
;; it as to one pinned read); its ID list entries run first, before the permit, under the ID list pool's own admission. So
;; one caller with a batch of 256 entries takes the share of one reader, never every permit.
;; Bounds: at most 256 entries, 512 subjects per entry, 4,096 subjects per batch, `limits.maxBytes` of answers (default
;; 4 MiB, at most 8 MiB) and `limits.timeMs` (default 1,000, at most 2,000). A batch that reaches the byte or time bound
;; stops between entries and answers `next`: the client sends the same batch again with `basis.recordedPosition` set to the
;; stated position and `from` = next (entries before `from` that later entries reference are recomputed, not returned).
;; Refused, typed (400 BatchUnsupported with the entry index): history reads, held handles, staged rows, ID lookups by
;; row ID, scans (a rows entry without subjects), record-time bases, forward or self references, unknown fields.
;; Rejected: a new read path (answers must come from the unchanged routes), one permit per entry (one batch could take
;; every permit), answering entries at different positions, and silent truncation of a long reference list.
(def enabled (= "1" (System/getenv "TX2_READ_BATCH")))
(def max-entries 256)
(def max-entry-subjects 512)
(def max-subjects 4096)
(def default-bytes (* 4 1024 1024))
(def cap-bytes (* 8 1024 1024))
(def default-ms 1000)
(def cap-ms 2000)

(def ^:private requests (java.util.concurrent.atomic.LongAdder.))
(def ^:private entries-run (java.util.concurrent.atomic.LongAdder.))
(def ^:private subjects-touched (java.util.concurrent.atomic.LongAdder.))
(def ^:private cursors (java.util.concurrent.atomic.LongAdder.))
(defn stats-now [] {:enabled enabled :requests (.sum requests) :entries (.sum entries-run)
                    :prefetchedSubjects (.sum subjects-touched) :cursors (.sum cursors)})

(def ^ThreadMXBean thread-mx (ManagementFactory/getThreadMXBean))

(defn refuse!
  ([code message] (refuse! 400 code message nil))
  ([status code message extra] (throw (ex-info message (merge {:status status :code code :route "batch"} extra)))))
(defn- unsupported! [i message] (refuse! 400 "BatchUnsupported" (str "Entry " i ": " message) {:maximum i}))

(defn- id-list! [i what limit xs]
  (when-not (and (vector? xs) (<= 1 (count xs) limit) (every? #(and (string? %) (<= 1 (.length ^String %) 4096)) xs))
    (unsupported! i (str what " must be 1.." limit " entity IDs")))
  xs)

(defn- reference! [i from]
  (when-not (map? from) (unsupported! i "a reference is an object {entry, attribute?, limit?}"))
  (doseq [k (keys from)] (when-not (#{"entry" "attribute" "limit"} k) (unsupported! i (str "unknown reference field " k))))
  (let [j (get from "entry") a (get from "attribute") limit (get from "limit" max-entry-subjects)]
    (when-not (and (integer? j) (<= 0 j) (< j i)) (unsupported! i "a reference names an earlier entry"))
    (when-not (or (nil? a) (and (string? a) (not (str/starts-with? a "?")))) (unsupported! i "a reference attribute is an attribute name"))
    (when-not (and (integer? limit) (<= 1 limit max-entry-subjects)) (unsupported! i (str "a reference limit is 1.." max-entry-subjects)))
    {:entry (long j) :attribute a :limit (long limit)}))

(defn- parse-entry [i e]
  (when-not (map? e) (unsupported! i "an entry is an object"))
  (let [op (get e "op")]
    (case op
      "rows" (do
               (doseq [k (keys e)]
                 (when-not (#{"op" "entityIds" "entityIdsFrom" "pattern"} k)
                   (unsupported! i (str "rows entries carry entityIds or entityIdsFrom and an optional pattern; not " k))))
               (when (= (contains? e "entityIds") (contains? e "entityIdsFrom"))
                 (unsupported! i "a rows entry names its subjects with exactly one of entityIds and entityIdsFrom"))
               (let [pattern (get e "pattern")]
                 (when (some? pattern)
                   (when-not (and (map? pattern) (every? #{"attribute" "entityType"} (keys pattern))
                                  (every? #(and (string? %) (not (str/starts-with? % "?"))) (vals pattern)))
                     (unsupported! i "a rows pattern may name only attribute and entityType")))
                 {:op "rows" :ids (some->> (get e "entityIds") (id-list! i "entityIds" max-entry-subjects))
                  :from (some->> (get e "entityIdsFrom") (reference! i)) :pattern pattern}))
      "reach" (do
                (doseq [k (keys e)]
                  (when-not (#{"op" "roots" "rootsFrom"} k)
                    (unsupported! i (str "reach entries carry roots or rootsFrom; not " k))))
                (when (= (contains? e "roots") (contains? e "rootsFrom"))
                  (unsupported! i "a reach entry names its roots with exactly one of roots and rootsFrom"))
                {:op "reach" :ids (some->> (get e "roots") (id-list! i "roots" 64))
                 :from (some-> (get e "rootsFrom") (->> (reference! i)) (update :limit min 64))})
      "ids" (do
              (when-not ids/enabled (unsupported! i "ID list entries need TX2_ID_LISTS=1 on this gateway"))
              (doseq [k (keys e)]
                (when-not (#{"op" "account" "prefix" "shape" "result" "limit" "order" "after" "bounds"} k)
                  (unsupported! i (str "an ids entry takes the ID list fields without basis, atLeastPosition or cursor; not " k))))
              {:op "ids" :input (dissoc e "op")})
      (unsupported! i "op must be rows, reach or ids"))))

(defn- ref-values
  "The subjects an entry takes from entry `j`'s answer: an ids page's IDs, or the reference values of one attribute in a
  rows answer, in row order without repeats. More than the reference's limit is refused (never truncated)."
  [i {:keys [entry attribute limit]} parsed answers]
  (let [source (nth parsed entry) answer (aget ^objects answers entry)
        xs (case (:op source)
             "ids" (do (when attribute (unsupported! i "a reference to an ids entry takes its IDs; name no attribute"))
                       (vec (get answer "ids")))
             "rows" (do (when-not attribute (unsupported! i "a reference to a rows entry names the reference attribute"))
                        (into [] (comp (filter #(and (= attribute (get-in % ["attribute" "v"]))
                                                     (= "ref" (get-in % ["value_type" "v"]))))
                                       (map #(get-in % ["value_string" "v"])) (distinct))
                              (get answer "rows")))
             (unsupported! i "a reference names a rows or ids entry"))]
    (when (> (count xs) limit)
      (refuse! 400 "BatchTooLarge" (str "Entry " i ": the reference yields " (count xs) " subjects, above its limit " limit
                                        "; read them with ID list pages") {:maximum limit}))
    xs))

(defn- needed
  "Indexes below `from` whose answers entries at or after `from` reference (transitively)."
  [parsed from]
  (loop [want (set (keep #(some-> (:from (nth parsed %)) :entry) (range from (count parsed)))) done #{}]
    (if-let [j (first (remove done want))]
      (recur (cond-> (conj want j) (:from (nth parsed j)) (conj (:entry (:from (nth parsed j))))) (conj done j))
      (set (filter #(< % from) want)))))

(defn- ids-page! [name conn input position valid-at deadline]
  (loop []
    (let [result (try (ids/page name conn (assoc input "basis" (cond-> {"recordedPosition" position}
                                                                    (some? valid-at) (assoc "validAt" valid-at))))
                      (catch clojure.lang.ExceptionInfo e
                        (if (and (= "IndexBusy" (:code (ex-data e))) (< (System/nanoTime) deadline))
                          ::busy (throw e))))]
      (if (= ::busy result) (do (Thread/sleep 2) (recur)) result))))

(defn run
  "POST /v2/db/{db}/batch. `view` is the gateway's connection view {:conn :generation :recent}."
  [name view input]
  (when-not (map? input) (refuse! "BatchUnsupported" "Expected a JSON object"))
  (doseq [k (keys input)]
    (when-not (#{"basis" "atLeastPosition" "basisWaitMs" "reads" "from" "limits" "prefetch" "stats"} k)
      (refuse! "BatchUnsupported" (str "Unknown batch field " k))))
  (let [conn (:conn view)
        basis (get input "basis") reads (get input "reads") from (get input "from" 0)
        limits (get input "limits" {}) stats? (true? (get input "stats")) prefetch? (not (false? (get input "prefetch")))
        _ (when-not (map? basis) (refuse! "BatchUnsupported" "basis is an object with validAt and an optional recordedPosition"))
        _ (doseq [k (keys basis)]
            (when-not (#{"recordedPosition" "validAt"} k)
              (refuse! "BatchUnsupported" (str "A batch is pinned by position; basis." k " is not accepted"))))
        valid-at (get basis "validAt")
        _ (when-not (and (number? valid-at) (Double/isFinite (double valid-at))) (refuse! "BatchUnsupported" "basis.validAt is a finite number"))
        p (some-> (get basis "recordedPosition") storage/safe-position)
        _ (when-not (and (vector? reads) (<= 1 (count reads) max-entries)) (refuse! "BatchUnsupported" (str "reads is 1.." max-entries " entries")))
        _ (when-not (and (integer? from) (<= 0 from) (< from (count reads))) (refuse! "BatchUnsupported" "from is an entry index"))
        _ (when (and (pos? from) (nil? p)) (refuse! "BatchUnsupported" "a batch resumed with from names its position"))
        _ (when-not (and (map? limits) (every? #{"maxBytes" "timeMs"} (keys limits))) (refuse! "BatchUnsupported" "limits takes maxBytes and timeMs"))
        max-bytes (get limits "maxBytes" default-bytes) time-ms (get limits "timeMs" default-ms)
        _ (when-not (and (integer? max-bytes) (<= 1024 max-bytes cap-bytes)) (refuse! "BatchUnsupported" (str "limits.maxBytes is 1024.." cap-bytes)))
        _ (when-not (and (integer? time-ms) (<= 1 time-ms cap-ms)) (refuse! "BatchUnsupported" (str "limits.timeMs is 1.." cap-ms)))
        parsed (vec (map-indexed parse-entry reads))
        literal (reduce + 0 (map #(count (:ids %)) parsed))
        _ (when (> literal max-subjects) (refuse! 400 "BatchTooLarge" (str "A batch names at most " max-subjects " subjects") {:maximum max-subjects}))
        started (System/nanoTime) deadline (+ started (* time-ms 1000000))
        cpu0 (.getCurrentThreadCpuTime thread-mx)
        work
        (fn []
          (let [initial (trace/span "d/db" "peer-call" (d/db conn))
                db (if (and (some? p) (> p (storage/head-position name initial)))
                     (trace/span "storage/await-position" "gateway"
                       (storage/await-position initial p (get input "basisWaitMs") (fn [_] (d/db conn)) conn))
                     initial)
                wanted (at-least/from-body input)
                db (if wanted (:db (at-least/await! name conn db wanted)) db)
                position (or p (storage/head-position name db))
                _ (when (> position (storage/head-position name db)) (storage/unavailable! "Requested position is beyond the available snapshot"))
                entry-basis {"recordedPosition" position "validAt" valid-at}
                n (count parsed) answers (object-array n) texts (object-array n)
                hidden (needed parsed from)
                wanted? (fn [i] (or (>= i from) (hidden i)))
                total-subjects (volatile! literal) touched (volatile! #{})
                ;; ID list entries first, before the read permit (their own pool's admission).
                _ (doseq [i (range n) :when (and (wanted? i) (= "ids" (:op (nth parsed i))))]
                    (let [answer (trace/span "batch/ids" "gateway" (ids-page! name conn (:input (nth parsed i)) position valid-at deadline))]
                      (aset answers i (json/read-str (json/write-str answer)))
                      (aset texts i (json/write-str answer))))
                subjects-of (fn [i]
                              (let [{:keys [ids from]} (nth parsed i)]
                                (or ids (when from (when (some? (aget answers (:entry from))) (ref-values i from parsed answers))))))
                prefetch-wave! (fn [i]
                                 (when prefetch?
                                   (let [wave (->> (range i n)
                                                   (filter wanted?)
                                                   (remove #(= "ids" (:op (nth parsed %))))
                                                   (keep (fn [k] (let [{:keys [ids from]} (nth parsed k)]
                                                                   (cond ids ids
                                                                         (and from (< (:entry from) i)) (subjects-of k)))))
                                                   (apply concat) (remove @touched) distinct vec)]
                                     (when (seq wave)
                                       (vswap! touched into wave)
                                       (.add subjects-touched (count wave))
                                       (trace/span "batch/prefetch" "gateway" (uncached/touch-all! db wave))))))
                bytes (volatile! 0) answered (volatile! 0) stop (volatile! nil)]
            (admission/execute-for {"basis" entry-basis} admission/reads
              (fn []
                (binding [admission/*own-pool* true]
                  (loop [i 0]
                    (when (and (< i n) (nil? @stop))
                      (let [{:keys [op pattern]} (nth parsed i)]
                        (if (or (not (wanted? i)) (= "ids" op))
                          (recur (inc i))
                          (if (and (>= i from) (pos? @answered) (> (System/nanoTime) deadline))
                            (vreset! stop [i "time"])
                            (let [_ (when-not (contains? @touched (first (subjects-of i))) (prefetch-wave! i))
                                  subjects (subjects-of i)
                                  _ (vswap! total-subjects + (if (:from (nth parsed i)) (count subjects) 0))
                                  _ (when (> @total-subjects max-subjects)
                                      (refuse! 400 "BatchTooLarge" (str "A batch reads at most " max-subjects " subjects") {:maximum max-subjects}))
                                  text (case op
                                         "rows" (let [result (trace/span "batch/rows" "gateway"
                                                               (storage/read-rows name db (cond-> {"entityIds" subjects "basis" entry-basis}
                                                                                            pattern (assoc "pattern" pattern))))
                                                      text (json/write-str result)]
                                                  (aset answers i (json/read-str text)) text)
                                         "reach" (let [text (trace/span "batch/reach" "gateway"
                                                              (reach/build-response name db {"roots" subjects "basis" entry-basis}
                                                                                    (:generation view) (:recent view)))]
                                                   (aset answers i (json/read-str text)) text))]
                              (.increment entries-run)
                              (if (>= i from)
                                (let [size (+ @bytes (.length ^String text) 1)]
                                  (cond
                                    (and (> size max-bytes) (zero? @answered))
                                    (refuse! 413 "BatchEntryTooLarge" (str "Entry " i " alone is above limits.maxBytes") {:maximum max-bytes})
                                    (> size max-bytes) (vreset! stop [i "bytes"])
                                    :else (do (aset texts i text) (vreset! bytes size) (vswap! answered inc) (recur (inc i)))))
                                (recur (inc i))))))))))))
            (let [[next stopped] @stop
                  end (or next n)
                  t (if (= position (storage/head-position name db)) (d/basis-t db)
                        (let [view (storage/at-position db position)] (or (d/as-of-t view) (d/basis-t view))))
                  out (StringBuilder. (+ 256 (long @bytes)))]
              (when next (.increment cursors))
              (.append out "{\"route\":\"batch\",\"position\":") (.append out (long position))
              (.append out ",\"t\":\"") (.append out (long t)) (.append out "\",\"validAt\":") (.append out (json/write-str valid-at))
              (.append out ",\"entries\":") (.append out (long n)) (.append out ",\"from\":") (.append out (long from))
              (.append out ",\"next\":") (.append out (if next (str next) "null"))
              (.append out ",\"stopped\":") (.append out (if stopped (json/write-str stopped) "null"))
              (.append out ",\"prefetched\":") (.append out (long (count @touched)))
              {:out out :answers (for [i (range from end)] (aget texts i))})))
        measured (if stats? (io/throw-if-ex! (io/with-io-stats work {:io-context :triplex/batch-read :api :lookup})) {:ret (work)})
        {:keys [out answers]} (:ret measured)
        ^StringBuilder out out]
    (.increment requests)
    (when stats?
      (let [reads (:reads (:io-stats measured))
            loads (reduce + 0 (keep (fn [[k v]] (when (and (number? v) (str/ends-with? (name k) "-load")) (long v))) reads))]
        (.append out ",\"stats\":")
        (.append out (json/write-str {:loads loads :ioReads reads
                                      :handlerCpuMicros (quot (- (.getCurrentThreadCpuTime thread-mx) cpu0) 1000)
                                      :micros (quot (- (System/nanoTime) started) 1000)}))))
    (.append out ",\"answers\":[")
    (loop [xs answers k 0]
      (when (seq xs) (when (pos? k) (.append out \,)) (.append out ^String (first xs)) (recur (rest xs) (inc k))))
    (.append out "]}")
    (.toString out)))
