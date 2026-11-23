(ns triplex.gateway.envelope
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.privacy :as privacy] [triplex.gateway.scope :as scope])
  (:import [java.nio.charset StandardCharsets]
           [java.nio.file Files Path Paths StandardOpenOption StandardCopyOption]
           [java.nio.file.attribute PosixFilePermissions]
           [java.security SecureRandom]
           [java.util Base64 Arrays UUID]
           [java.util.concurrent ConcurrentLinkedQueue ConcurrentHashMap]
           [javax.crypto Cipher]
           [javax.crypto.spec GCMParameterSpec SecretKeySpec]))

(def random (SecureRandom.))
(defn random-bytes [n] (let [b (byte-array n)] (.nextBytes random b) b))
(defn utf8 [^String s] (.getBytes s StandardCharsets/UTF_8))
(defn token [id] (str "triplex-sealed-v1/" id))
(defn aad [name id entity attribute validity]
  (utf8 (json/write-str [name id entity attribute validity])))

;; [DX-ERASE1] Why: the detached identity must reproduce exact valid-time bits including signed zero.
;; Rejected: native Double metadata (Datomic normalizes signed zero).
(defn bit-text [value]
  (when (some? value) (format "%016x" (Double/doubleToRawLongBits (double value)))))
(defn from-bits [text]
  (when text (Double/longBitsToDouble (Long/parseUnsignedLong text 16))))

(defn key-directory [name] (.getParent (privacy/path name "unused-key")))
(defn key-file [name id]
  (.resolve (key-directory name) (str "assertion-" (privacy/sha256 id) ".key")))

;; [DX-ERASE1] Why: immutable Datomic state can point to a separate assertion key that is outside its data backups.
;; Rejected: deriving keys from a retained tenant secret (revoked assertion keys could be reconstructed).
(defn- read-key [p]
  (let [key (Files/readAllBytes p)]
    (when-not (= 32 (alength key)) (privacy/unavailable!))
    key))

(defn issue! [name id]
  ;; Called inside the scope's writer lock. A crypto key is never recreated for an erased assertion.
  (let [p (key-file name id)]
    (when (contains? (:erased privacy/*cut*) id) (privacy/stale!))
    (if (privacy/exists? p) (read-key p)
      (let [key (random-bytes 32)
            tmp (.resolve (.getParent p) (str ".key-" (UUID/randomUUID)))]
        (try
          (Files/createFile tmp
            (into-array java.nio.file.attribute.FileAttribute
              [(PosixFilePermissions/asFileAttribute (PosixFilePermissions/fromString "rw-------"))]))
          (Files/write tmp key (into-array StandardOpenOption [StandardOpenOption/WRITE StandardOpenOption/SYNC]))
          (Files/move tmp p (into-array StandardCopyOption [StandardCopyOption/ATOMIC_MOVE]))
          (privacy/sync-directory! (.getParent p))
          key
          (catch Exception e (Arrays/fill ^bytes key (byte 0)) (throw e))
          (finally (Files/deleteIfExists tmp)))))))

(defn crypto [mode key nonce context data]
  (let [cipher (Cipher/getInstance "AES/GCM/NoPadding")]
    (.init cipher mode (SecretKeySpec. ^bytes key "AES") (GCMParameterSpec. 128 ^bytes nonce))
    (.updateAAD cipher ^bytes context)
    (.doFinal cipher ^bytes data)))

;; [DX-ERASE1] Why: each random key is committed before its handle can be picked up by a save.
;; Rejected: saving one key synchronously for every assertion (it doubles the durable write path).
(def ^:private batches (ConcurrentHashMap.))
(def ^:private batch-size 256)
(def ^:private wrapping-key
  (delay (let [wire (System/getenv "TRIPLEX_ERASURE_WRAPPING_KEY")
               b (when wire (.decode (Base64/getDecoder) ^String wire))]
           (when-not (and b (= 32 (alength ^bytes b))) (privacy/unavailable!))
           b)))

(defn- pool [name]
  (.computeIfAbsent batches name
    (reify java.util.function.Function (apply [_ _] (ConcurrentLinkedQueue.)))))

(defn- wrap-key [name handle key]
  (let [nonce (random-bytes 12)]
    (byte-array (concat nonce (crypto Cipher/ENCRYPT_MODE @wrapping-key nonce
                                     (utf8 (json/write-str [name handle])) key)))))

(defn- open-key [name handle]
  (let [^bytes wrapped (or (sql/key-by-id name handle) (privacy/unavailable!))]
    (crypto Cipher/DECRYPT_MODE @wrapping-key (Arrays/copyOfRange wrapped 0 12)
            (utf8 (json/write-str [name handle])) (Arrays/copyOfRange wrapped 12 (alength wrapped)))))

(defn- refill! [name]
  (let [^ConcurrentLinkedQueue keys (pool name)]
    (locking keys
      (when (< (.size keys) batch-size)
        (let [batch (vec (repeatedly batch-size #(vector (str (UUID/randomUUID)) (random-bytes 32))))]
          (try
            (sql/issue! name (mapv (fn [[handle key]] [handle (wrap-key name handle key)]) batch))
            (.addAll keys batch)
            (catch Throwable e
              (doseq [[_ key] batch] (Arrays/fill ^bytes key (byte 0)))
              (throw e))))))))

(defn shared? [] (some? sql/url))

(defn provision! [name sealed?]
  (when (and sql/url sealed?) (refill! name)))

(defn- take-key! [name id]
  (when (contains? (:erased privacy/*cut*) id) (privacy/stale!))
  (if sql/url
    (let [^ConcurrentLinkedQueue keys (pool name)]
      (or (.poll keys) (privacy/failure! 503 "EnvelopeKeyPoolEmpty" "Retry the protected save after replenishment")))
    [nil (issue! name id)]))

(defn body-key-handle [wire]
  (when (and (string? wire) (str/starts-with? wire "sql/"))
    (let [handle (second (str/split wire #"/" 3))]
      (when-not (re-matches #"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}" handle)
        (privacy/unavailable!))
      handle)))

(defn seal! [name {:keys [id entity_id attribute value_string valid_from valid_to]}]
  (let [[handle key] (take-key! name id) nonce (random-bytes 12) encoder (Base64/getEncoder)
        interval (json/write-str [(bit-text valid_from) (bit-text valid_to)])]
    (try
      {:db/id (str "protected:" id) :triplex.private/id id
       :triplex.private/entity entity_id :triplex.private/attribute attribute
       :triplex.private/validity interval
       ;; [DX-W1] Why: JSON escapes preserve every UTF-16 code unit in a protected string.
       ;; Rejected: using Java UTF-8 replacement for an unmatched surrogate in an application value.
       :triplex.private/body (str (when handle (str "sql/" handle "/")) "s1." (.encodeToString encoder nonce) "."
                                 (.encodeToString encoder (crypto Cipher/ENCRYPT_MODE key nonce
                                             (aad name id entity_id attribute interval) (utf8 (json/write-str value_string)))))}
      (finally (Arrays/fill ^bytes key (byte 0))))))

(defn assertion-identity [db e]
  (let [[from to] (json/read-str (scope/value db e :triplex.private/validity))]
    {:id (scope/value db e :triplex.private/id)
     :entity_id (scope/value db e :triplex.private/entity)
     :attribute (scope/value db e :triplex.private/attribute)
     :value_type "string"
     :valid_from (from-bits from)
     :valid_to (from-bits to)
     :key_handle (body-key-handle (scope/value db e :triplex.private/body))}))

(defn decode! [name db id entity attribute wire]
  (when-not (= (token id) wire) (privacy/unavailable!))
  (try
    (let [eid (d/entid db [:triplex.private/id id])
          _ (when-not eid (privacy/unavailable!))
          ciphertext (scope/value db eid :triplex.private/body)
          interval (scope/value db eid :triplex.private/validity)
          handle (body-key-handle ciphertext)
          payload (if handle (nth (str/split ciphertext #"/" 3) 2) ciphertext)
          encoded? (str/starts-with? payload "s1.")
          [nonce body] (str/split (if encoded? (subs payload 3) payload) #"\." 2)
          decoder (Base64/getDecoder)
          key (if sql/url
                (if handle (open-key name handle) (privacy/unavailable!))
                (if-not handle (read-key (key-file name id)) (privacy/unavailable!)))]
      (try
        (let [clear (crypto Cipher/DECRYPT_MODE key (.decode decoder ^String nonce)
                            (aad name id entity attribute interval) (.decode decoder ^String body))]
          (try (let [value (String. ^bytes clear StandardCharsets/UTF_8)]
                 (if encoded? (json/read-str value) value))
               (finally (Arrays/fill ^bytes clear (byte 0)))))
        (finally (Arrays/fill ^bytes key (byte 0)))))
    (catch Exception _ (privacy/unavailable!))))

(defn erase-keys! [name identities]
  ;; [DX-ERASE1] Why: revoke independent keys before submitting optional native cleanup.
  ;; Rejected: waiting for Datomic to reclaim ciphertext before deleting its keys.
  (if sql/url
    (sql/shred! name (keep #(get % "keyHandle") identities))
    (do
      (doseq [r identities] (Files/deleteIfExists (key-file name (get r "assertionId"))))
      (privacy/sync-directory! (key-directory name)))))

(defn key-present? [name id handle]
  (if sql/url
    (boolean (when handle (sql/key-by-id name handle)))
    (privacy/exists? (key-file name id))))

(defonce shredded (atom {}))
(def grace-ms (Long/parseLong (or (System/getenv "TRIPLEX_ERASURE_SHRED_GRACE_MS") "300000")))

(defn- authority-scopes []
  (if sql/url
    (sql/scopes)
    (let [root (Paths/get privacy/root (make-array String 0))]
      (when (privacy/exists? root)
        (with-open [scopes (Files/list root)]
          (into [] (keep (fn [dir]
                          (let [head (.resolve ^Path dir "head.json")]
                            (when (privacy/exists? head)
                              (let [name (get (json/read-str (Files/readString head)) "database")]
                                (when (= head (privacy/path name "head.json")) name))))))
                (.toArray scopes)))))))

(defn- shred-published! []
  (let [cutoff (- (System/currentTimeMillis) grace-ms)]
    (doseq [name (authority-scopes)]
      (try
        (let [cut (privacy/cut name nil)]
          (when (:sealed cut)
            (let [from (long (get @shredded name 0))
                  due (->> (:commands cut) vals (sort-by #(get % "seq"))
                           (drop-while #(<= (get % "seq") from))
                           (take-while #(<= (get % "erasedAt") cutoff)))]
              (when (seq due)
                (erase-keys! name (mapcat #(get % "identities") due))
                (swap! shredded assoc name (get (last due) "seq"))))))
        (catch Exception _ nil)))))

(defn- maintain-keys! []
  (shred-published!)
  (when sql/url
    (doseq [name (.keySet batches)]
      (try (refill! name) (catch Exception _ nil)))))

;; [DX-ERASE1] Why: the durable published prefix survives a restart and schedules key removal before any native indexing.
;; Rejected: making native cleanup the only caller that revokes a key.
(defonce shred-worker
  (delay
    (doto (Thread. ^Runnable
            (fn []
              (loop []
                (try (maintain-keys!) (catch Exception _ nil))
                (let [continue? (try (Thread/sleep 500) true (catch InterruptedException _ false))]
                  (when continue? (recur)))))
            "triplex-envelope-shred")
      (.setDaemon true)
      (.start))))

(defn start! []
  (when (or privacy/root sql/url) @shred-worker))

(defn protect [name state input rows]
  (if-not (:sealed state) {:rows rows :input input}
    (let [fresh-ids (set (get input "newIds"))
          protected (filter #(and (fresh-ids (:id %)) ((:attrs state) (:attribute %))) rows)
          bodies (mapv #(seal! name %) protected)
          sealed (set (map :id protected))
          transform (fn [row]
                      (cond
                        (sealed (:id row)) (assoc row :value_string (token (:id row)))
                        (and (fresh-ids (:id row)) (= ":_tx/change" (:attribute row)))
                        (let [c (json/read-str (:value_json row))
                              id (get c "tripleId")]
                          (if (and (contains? c "value") ((:attrs state) (get c "attribute")))
                            (let [value (or (get-in state [:erased id]) {"type" "string" "value" (token id)})]
                              (assoc row :value_json (json/write-str (assoc c "value" value))))
                            row))
                        :else row))
          transformed (mapv transform rows)
          texts (reduce (fn [m [before after]]
                          (if (identical? before after) m
                            (assoc m (:id after) (privacy/encode after))))
                        (get input "rowTexts") (map vector rows transformed))]
      {:input (assoc input "rowTexts" texts) :rows transformed :bodies bodies})))
