(ns triplex.gateway.privacy
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.scope :as scope] [triplex.gateway.trace :as trace]
            [triplex.gateway.removal-scope :as removal-scope])
  (:import [java.nio.charset StandardCharsets]
           [java.nio.channels FileChannel]
           [java.nio.file Files Path Paths StandardCopyOption StandardOpenOption LinkOption]
           [java.security MessageDigest]
           [java.util HexFormat UUID]))

(def root (System/getenv "TRIPLEX_ERASURE_DIRECTORY"))
(def ^:dynamic *cut* nil)
(def ^:dynamic *database* nil)
(def ^:dynamic *data* nil)
(def ^:dynamic *unseal* nil)
(def cache (atom {}))
(def local-guards (atom {}))
(def zeros (apply str (repeat 64 "0")))

(defn failure! [status code message]
  (throw (ex-info message {:status status :code code})))
(defn unavailable! []
  (failure! 503 "ErasureFrontierUnavailable" "The current erasure sequence cannot be verified"))
(defn stale! []
  (failure! 409 "ErasureFrontierChanged" "This request must use the current erasure sequence"))

(defn sha256 [text]
  (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256")
                                     (.getBytes ^String text StandardCharsets/UTF_8))))

(defn path [name leaf]
  (when-not root (unavailable!))
  (.resolve (Paths/get root (into-array String [(sha256 name)])) ^String leaf))

(defn exists? [^Path p]
  (Files/exists p (make-array LinkOption 0)))

(defn sync-directory! [^Path p]
  (with-open [c (FileChannel/open p (into-array StandardOpenOption [StandardOpenOption/READ]))]
    (.force c true)))

;; [DX-ERASE1] Why: every peer may acquire the current prefix without consulting the requested data cut.
;; Rejected: in-place replacement (a concurrent request could see a torn or empty head).
(defn replace! [^Path p text]
  (let [dir (.getParent p)
        tmp (.resolve dir (str ".write-" (UUID/randomUUID)))]
    (try
      (Files/writeString tmp text StandardCharsets/UTF_8
                         (into-array StandardOpenOption [StandardOpenOption/CREATE_NEW StandardOpenOption/SYNC]))
      (Files/move tmp p (into-array StandardCopyOption [StandardCopyOption/ATOMIC_MOVE StandardCopyOption/REPLACE_EXISTING]))
      (sync-directory! dir)
      (finally (Files/deleteIfExists tmp)))))

(defn- file-guard [name work]
  ;; [DX-ERASE1] Why: one protected write or publication per scope across gateway processes.
  ;; Rejected: an in-memory mutex alone (an independent gateway would not join it).
  (let [m (get (swap! local-guards #(if (contains? % name) % (assoc % name (Object.)))) name)
        p (path name "writer.lock")]
    ;; [DX-ERA2] An account's lock (name#removal/<account>) has no directory until its first use; a no-op otherwise.
    (when removal-scope/enabled
      (Files/createDirectories (.getParent p) (make-array java.nio.file.attribute.FileAttribute 0)))
    (let [started (when trace/*request* (trace/clock))]
      (locking m
        (with-open [c (FileChannel/open p (into-array StandardOpenOption [StandardOpenOption/CREATE StandardOpenOption/WRITE]))
                    lock (.lock c)]
          (when started (trace/interval! "privacy/write-lock-wait" "gateway" started (trace/clock) nil))
          (work))))))

(defn guard [name work]
  (if sql/url (sql/guard name work) (file-guard name work)))

(defn record-text [name record]
  (if sql/url (sql/read-record name record)
    (let [p (path name record)] (when (exists? p) (Files/readString p)))))

(defn- save-record! [name record wire]
  (if sql/url (sql/put! name record wire) (replace! (path name record) wire)))

(defn- remove-record! [name record]
  (if sql/url (sql/delete! name record)
    (let [p (path name record)]
      (Files/delete p)
      (sync-directory! (.getParent p)))))

(defn enabled? [db]
  (and db (d/entid db :triplex.scope/erasure-ledger)
       (true? (scope/value db (scope/entity db) :triplex.scope/erasure-ledger))))

(defn managed? [name db]
  (or (enabled? db) (if sql/url (some? (record-text name "head.json")) (and root (exists? (path name "head.json"))))))

(defn register! [name attributes sealed? install!]
  (when-not (and (vector? attributes) (seq attributes) (= (count attributes) (count (set attributes)))
                 (every? #(and (string? %) (seq %) (not (.startsWith ^String % ":_tx/"))) attributes))
    (failure! 400 "InvalidProtectedAttributes" "Expected distinct declared protected attributes"))
  (when-not sql/url
    (let [parent (.getParent (path name "head.json"))]
      (Files/createDirectories parent (make-array java.nio.file.attribute.FileAttribute 0))
      (sync-directory! (.getParent parent))))
  (guard name
    (fn []
      (let [prior (some-> (record-text name "head.json") json/read-str)]
        (when (and prior (not (and (= attributes (get prior "attributes"))
                                   (= (boolean sealed?) (get prior "sealed")))))
          (failure! 409 "ProtectionPolicyMismatch" "The protected attribute policy is immutable"))
        ;; [DX-W1] Why: only publish authority after the serialized native check.
        ;; Rejected: publishing a new policy before an occupied scope is refused.
        (install!)
        (when-not prior
          (save-record! name "head.json" (json/write-str {"database" name "seq" 0 "seal" zeros
                                                         "attributes" attributes "sealed" (boolean sealed?)})))))))

(defn- entry-record [seq] (str "erase-" seq ".json"))

(defn- apply-entry [cut entry]
  (-> cut
      (assoc :seq (get entry "seq") :seal (sha256 (json/write-str entry)))
      (assoc-in [:commands (get entry "commandId")] entry)
      (update :erased (fn [before]
                        (reduce (fn [m identity]
                                  (let [id (get identity "assertionId")]
                                    (if (contains? m id) m
                                      (assoc m id {"type" "erased" "valueType" (get identity "valueType")
                                                   "erasedAt" (get entry "erasedAt") "erasureTxId" (get entry "txId")}))))
                                before (get entry "identities"))))
      ;; [DX-IMP2] An entry may also name the families a removal asked for before any row existed (import bound on).
      (update :families into (concat (map (juxt #(get % "entity") #(get % "attribute")) (get entry "identities"))
                                     (get entry "families")))
      ;; [DX-ERA2] Each account's removal sequence, derived from the one ordered log (only with the option on).
      (cond-> removal-scope/enabled (removal-scope/add-entry entry))))

(defn cut
  ([name db] (cut name db false))
  ([name db allow-pending?]
   (try
     (let [frontier (when sql/url (sql/read-frontier name))
           pending (if sql/url (get frontier "pending.json")
                     (when (and root (exists? (path name "pending.json"))) true))
           wire (if sql/url (get frontier "head.json")
                  (when root (record-text name "head.json")))
           ;; [DX-ERA2] The prepared removal's sequence, so a request guarded per account can tell a native commit of
           ;; that removal (not yet published) from a native database the log does not describe.
           pending-seq (when (and removal-scope/enabled allow-pending? pending)
                         (get (json/read-str (if (string? pending) pending (record-text name "pending.json"))) "seq"))]
       (let [result
       (when (or wire (enabled? db))
         (when (or (nil? wire) (and (not allow-pending?) pending)) (unavailable!))
         (let [prior (get @cache name)]
         (if (= wire (:wire prior))
           prior
           (let [h (json/read-str wire)
                 n (get h "seq") attrs (get h "attributes") sealed? (get h "sealed")]
             (when-not (and (= name (get h "database")) (integer? n) (<= 0 n)
                            (vector? attrs) (seq attrs) (every? string? attrs) (instance? Boolean sealed?))
               (unavailable!))
             ;; A shadow whose latest authority is behind a previously verified head cannot serve.
             (when (and prior (< n (:seq prior))) (unavailable!))
             (let [base (or prior {:seq 0 :seal zeros :commands {} :erased {} :families #{}
                                  :attrs (set attrs) :sealed sealed?})
                   next (reduce
                          (fn [state seq]
                            (let [raw (or (record-text name (entry-record seq)) (unavailable!))
                                  item (json/read-str raw)]
                              (when-not (and (= name (get item "database")) (= seq (get item "seq"))
                                             (= (:seal state) (get item "previous")) (= raw (json/write-str item)))
                                (unavailable!))
                              (apply-entry state item)))
                          base (range (inc (:seq base)) (inc n)))]
               (when-not (and (= (:seal next) (get h "seal"))
                              (= (:attrs next) (set attrs)) (= (:sealed next) sealed?))
                 (unavailable!))
               (let [new (assoc next :wire wire)]
                 (swap! cache update name #(if (and % (> (:seq %) n)) % new))
                 new))))))]
         (if (and result (integer? pending-seq)) (assoc result :pending-seq pending-seq) result)))
     (catch clojure.lang.ExceptionInfo e (throw e))
     (catch Exception _ (unavailable!)))))

(defn pending [name]
  (some-> (record-text name "pending.json") json/read-str))

(defn prepare! [name item]
  (save-record! name "pending.json" (json/write-str item)))

(defn publish! [name current item]
  (let [prior (json/read-str (:wire current))
        seq (get item "seq")
        payload (json/write-str item)
        record (entry-record seq)
        previous (record-text name record)
        head (json/write-str (assoc prior "seq" seq "seal" (sha256 payload)))]
    (when-not (and (= seq (inc (:seq current))) (or (nil? previous) (= previous payload))) (unavailable!))
    (if sql/url
      (sql/publish! name record payload (:wire current) head)
      (do
        (when-not previous (save-record! name record payload))
        (save-record! name "head.json" head)
        (remove-record! name "pending.json")))))

(defn clear-completed! [name current]
  (when-let [p (pending name)]
    (when (= p (get-in current [:commands (get p "commandId")]))
      (remove-record! name "pending.json"))))

(defn ensure-seq! [state offered]
  (when-not (and state (integer? offered) (= (:seq state) offered)) (stale!)))

;; [DX-ERA2] Why: in a database guarded per account, a derived write's ticket that names its source accounts is
;; stale only when a removal published after it touched one of them (or the unscoped sequence).
;; Rejected: a database-wide comparison for such tickets (any account's removal refused every account's frames).
(defn ensure-ticket! [state input]
  (if (and (:per-account state) (contains? input "erasureAccounts"))
    (when-not (removal-scope/ticket-current? state (get input "erasureSeq") (removal-scope/ticket-accounts input))
      (stale!))
    (ensure-seq! state (get input "erasureSeq"))))

(def columns [:recorded_position :id :entity_id :attribute :value_type :value_string :value_number
              :value_boolean :value_datetime :value_json :recorded_at :valid_from :valid_to
              :created_by :entity_type :schema_version :tx_id])
(def payload-cols [:value_string :value_number :value_boolean :value_datetime :value_json])

(defn masked [row]
  (if-not *cut* row
    (let [sealed? (:sealed *cut*) attrs (:attrs *cut*)]
      (cond
        (= ":_tx/change" (:attribute row))
        (let [change (json/read-str (:value_json row)) id (get change "tripleId")
              attr (get change "attribute") marker (get-in *cut* [:erased id])
              value (when (contains? change "value")
                      (or marker (when (and sealed? (attrs attr))
                                   {"type" "string" "value" (*unseal* id (get change "entityId") attr
                                                                  (get-in change ["value" "value"]))})))]
          (if value (assoc row :value_json (json/write-str (assoc change "value" value))) row))
        :else
        (if-let [marker (get-in *cut* [:erased (:id row)])]
          (assoc (reduce #(assoc %1 %2 nil) row payload-cols)
                 :value_type "erased" :value_json (json/write-str marker))
          (if (and sealed? (attrs (:attribute row)))
            (assoc row :value_string (*unseal* (:id row) (:entity_id row) (:attribute row) (:value_string row)))
            row))))))

(defn encode [row]
  ;; Same v2 row fields and header as rowText.ts. Preserve signed zero and the fixed position token.
  (let [id (:id row)
        valid (fn [n] (if (nil? n) "----------------" (format "%016x" (Double/doubleToRawLongBits (double n)))))
        ref (if (= "ref" (:value_type row)) (:value_string row) "")
        pos (= ":_tx/position" (:attribute row))]
    (str "2" (format "%04x" (count id)) id (valid (:valid_from row)) (valid (:valid_to row))
         (format "%04x" (count ref)) ref (if pos "P" "-")
         (json/write-str (mapv (fn [k]
                               (let [v (k row)]
                                 (cond (= k :recorded_position) (format "%016d" v)
                                       (and pos (= k :value_number)) nil
                                       (and (float? v) (= Long/MIN_VALUE (Double/doubleToRawLongBits (double v)))) "-0"
                                       :else v)))
                             columns)))))

(defn packed-tail [^String text]
  (let [id-end (+ 5 (Integer/parseInt text 1 5 16))
        ref-end (+ 36 id-end)
        size (Integer/parseInt text (int (- ref-end 4)) (int ref-end) 16)]
    (inc (+ ref-end size))))

(defn packed-row [^String text]
  (zipmap columns (json/read-str (subs text (packed-tail text)))))

(defn text [^String bytes]
  (if (and *cut* (or (:sealed *cut*) (seq (:erased *cut*))))
    (let [end (packed-tail bytes)
          values (json/read-str (subs bytes end))
          row (zipmap columns values)
          next (masked row)]
      (if (identical? row next) bytes
        (str (subs bytes 0 end) (json/write-str (mapv next columns)))))
    bytes))

(defn validate-write! [state input rows]
  (when state
    (when (and (contains? input "erasureSeq") (not (contains? input "erasureSourceDatabase")))
      (ensure-ticket! state input))
    (let [new-ids (set (get input "newIds"))
          importing (or (true? (get input "erasureReplay"))
                        (some #(and (= ":_tx/actor" (:attribute %)) (= "bulk-import" (:value_string %))) rows))]
      ;; [DX-ERASE1] Why: the identity list survives native removal and data restores.
      ;; Rejected: checking only native row history (it cannot find a row whose contents were physically removed).
      (when (some #(contains? (:erased state) %) new-ids)
        (failure! 409 "ErasedAssertionIdentity" "A removed assertion identity cannot be reused"))
      (doseq [r rows :when (and (new-ids (:id r)) ((:attrs state) (:attribute r)))]
        (when-not (= "string" (:value_type r))
          (failure! 400 "ProtectedTypeUnsupported" "This protected scope accepts string assertions"))
        (when (and importing ((:families state) [(:entity_id r) (:attribute r)]))
          (failure! 409 "ErasureReplayDeclined" "An archived field cannot be replayed across its erasure"))))))

(defn verify-data! [state db]
  (if (removal-scope/per-account? db)
    ;; [DX-ERA2] Guarded per account: the native removal sequence (the database-wide one holds the sentinel).
    (when (and state (not (removal-scope/consistent? db (:seq state) nil))) (unavailable!))
    (when (and state (not= (:seq state) (scope/value db (scope/entity db) :triplex.scope/erasure-seq)))
      (unavailable!))))

;; [DX-ERA2] The value the installed writers' database-wide fence carries for this cut.
(defn fence-seq [state] (when state (if (:per-account state) removal-scope/sentinel (:seq state))))
