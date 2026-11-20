(ns triplex.gateway.envelope
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.scope :as scope])
  (:import [java.nio.charset StandardCharsets]
           [java.nio.file Files Path Paths StandardOpenOption StandardCopyOption]
           [java.nio.file.attribute PosixFilePermissions]
           [java.security SecureRandom]
           [java.util Base64 Arrays UUID]
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

(defn seal! [name {:keys [id entity_id attribute value_string valid_from valid_to]}]
  (let [key (issue! name id) nonce (random-bytes 12) encoder (Base64/getEncoder)
        interval (json/write-str [(bit-text valid_from) (bit-text valid_to)])]
    (try
      {:db/id (str "protected:" id) :triplex.private/id id
       :triplex.private/entity entity_id :triplex.private/attribute attribute
       :triplex.private/validity interval
       :triplex.private/body (str (.encodeToString encoder nonce) "."
                                 (.encodeToString encoder (crypto Cipher/ENCRYPT_MODE key nonce
                                             (aad name id entity_id attribute interval) (utf8 value_string))))}
      (finally (Arrays/fill ^bytes key (byte 0))))))

(defn assertion-identity [db e]
  (let [[from to] (json/read-str (scope/value db e :triplex.private/validity))]
    {:id (scope/value db e :triplex.private/id)
     :entity_id (scope/value db e :triplex.private/entity)
     :attribute (scope/value db e :triplex.private/attribute)
     :value_type "string"
     :valid_from (from-bits from)
     :valid_to (from-bits to)}))

(defn decode! [name db id entity attribute wire]
  (when-not (= (token id) wire) (privacy/unavailable!))
  (try
    (let [eid (d/entid db [:triplex.private/id id])
          _ (when-not eid (privacy/unavailable!))
          ciphertext (scope/value db eid :triplex.private/body)
          interval (scope/value db eid :triplex.private/validity)
          [nonce body] (str/split ciphertext #"\." 2)
          decoder (Base64/getDecoder)
          key (read-key (key-file name id))]
      (try
        (let [clear (crypto Cipher/DECRYPT_MODE key (.decode decoder ^String nonce)
                            (aad name id entity attribute interval) (.decode decoder ^String body))]
          (try (String. ^bytes clear StandardCharsets/UTF_8)
               (finally (Arrays/fill ^bytes clear (byte 0)))))
        (finally (Arrays/fill ^bytes key (byte 0)))))
    (catch Exception _ (privacy/unavailable!))))

(defn erase-keys! [name identities]
  ;; [DX-ERASE1] Why: revoke independent keys before submitting optional native cleanup.
  ;; Rejected: waiting for Datomic to reclaim ciphertext before deleting its keys.
  (doseq [r identities] (Files/deleteIfExists (key-file name (get r "assertionId"))))
  (privacy/sync-directory! (key-directory name)))

(defonce shredded (atom {}))
(def grace-ms (Long/parseLong (or (System/getenv "TRIPLEX_ERASURE_SHRED_GRACE_MS") "300000")))

(defn- shred-published! []
  (let [root (Paths/get privacy/root (make-array String 0))
        cutoff (- (System/currentTimeMillis) grace-ms)]
    (when (privacy/exists? root)
      (with-open [scopes (Files/list root)]
        (doseq [dir (.toArray scopes)]
          (let [head (.resolve ^Path dir "head.json")]
            (when (privacy/exists? head)
              (try
                (let [name (get (json/read-str (Files/readString head)) "database")
                      cut (when (= head (privacy/path name "head.json")) (privacy/cut name nil))]
                  (when (:sealed cut)
                    (let [from (long (get @shredded name 0))
                          due (->> (:commands cut) vals (sort-by #(get % "seq"))
                                   (drop-while #(<= (get % "seq") from))
                                   (take-while #(<= (get % "erasedAt") cutoff)))]
                      (when (seq due)
                        (erase-keys! name (mapcat #(get % "identities") due))
                        (swap! shredded assoc name (get (last due) "seq"))))))
                (catch Exception _ nil)))))))))

;; [DX-ERASE1] Why: the durable published prefix survives a restart and schedules key removal before any native indexing.
;; Rejected: making native cleanup the only caller that revokes a key.
(defonce shred-worker
  (delay
    (doto (Thread. ^Runnable
            (fn []
              (loop []
                (try (shred-published!) (catch Exception _ nil))
                (let [continue? (try (Thread/sleep 500) true (catch InterruptedException _ false))]
                  (when continue? (recur)))))
            "triplex-envelope-shred")
      (.setDaemon true)
      (.start))))

(defn start! []
  (when privacy/root @shred-worker))

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
