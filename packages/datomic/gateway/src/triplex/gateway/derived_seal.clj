(ns triplex.gateway.derived-seal
  "[DX-ERA4] TX2_DERIVED_SEAL=1: derived records (recorded notices, ledgers, settled changes, a recipient's records) are
  sealed under a key derived from the keys of the protected assertions they were computed from, so a removal, which
  destroys those assertions' keys, makes every copy unreadable wherever it went (era4/DERIVED-COPIES.md section 3).
  Loaded only when the option is on (main.clj resolves it at call time), so with the option off no stored function text
  or route changes."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.removal-scope :as removal-scope]
            [triplex.gateway.scope :as scope] [triplex.gateway.storage :as storage])
  (:import [java.nio ByteBuffer]
           [java.nio.charset StandardCharsets]
           [java.security SecureRandom]
           [java.nio.file Files]
           [java.util Arrays Base64]
           [javax.crypto Cipher Mac]
           [javax.crypto.spec GCMParameterSpec SecretKeySpec]))

(def ^:private max-items 1024)
;; [DX-ERA4, after DX-ERA5's L2] a subject's world (160 facts and their history at the target) stays far below these;
;; a record above them is refused, and with it its frame (never written in clear)
(def ^:private max-ids 65536)
(def ^:private max-value 16000000)
(def ^:private max-place 512)
;; [DX-ERA4, after DX-ERA5's B3 and L1] `tdx2.`: the clear bytes padded to a size class, the record's place (the account's
;; document prefix and the subject) in its header and so in the associated data, and a random nonce. `tdx1.` (unpadded,
;; no place, nonce from the content) is still opened.
(def ^:private prefix "tdx2.")
(def ^:private legacy-prefix "tdx1.")
(def ^:private random (SecureRandom.))

(defn- utf8 ^bytes [^String s] (.getBytes s StandardCharsets/UTF_8))
(defn- b64 [^bytes b] (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) b))
(defn- unb64 ^bytes [^String s] (.decode (Base64/getUrlDecoder) s))
(defn- hmac ^bytes [^bytes key ^bytes data]
  (let [m (Mac/getInstance "HmacSHA256")] (.init m (SecretKeySpec. key "HmacSHA256")) (.doFinal m data)))

(defn- invalid! [message] (privacy/failure! 400 "InvalidDerivedRecord" message))

(defn- sealed-scope! [cut]
  (when-not (and cut (:sealed cut))
    (privacy/failure! 409 "DerivedSealNeedsSealedScope"
                      "Derived records are sealed only on a sealed protected database")))

(defn- protected-eid [db id] (d/entid db [:triplex.private/id id]))

(defn- read-assertion-key
  "The protected assertion's own key, or nil when it is gone (shredded) or cannot be opened."
  [name db eid id]
  (try
    (let [handle (envelope/body-key-handle (scope/value db eid :triplex.private/body))]
      (if sql/url
        (when handle (#'envelope/open-key name handle))
        (when-not handle
          (let [p (envelope/key-file name id)]
            (when (privacy/exists? p)
              (let [k (Files/readAllBytes p)] (when (= 32 (alength k)) k)))))))
    (catch Exception _ nil)))

;; [DX-ERA4, after DX-ERA5's C1] one read per distinct assertion per call (a frame's records repeat their subjects'
;; names); the copies are wiped when the call ends.
(def ^:dynamic ^:private *keys* nil)
(defn- assertion-key [name db eid id]
  (let [c *keys*]
    (if c
      (let [v (get @c id ::miss)]
        (if (= v ::miss)
          (let [k (read-assertion-key name db eid id)]
            (swap! c assoc id (if k (aclone ^bytes k) ::gone))
            k)
          (if (= v ::gone) nil (aclone ^bytes v))))
      (read-assertion-key name db eid id))))

;; [DX-ERA4, after DX-ERA5's C1] With the PostgreSQL authority, every key a call needs is read in one query before its
;; items are sealed or opened (the per-call cache then serves them): one round trip per call, not one per name.
(defn- prefetch! [name db ids]
  (when (if sql/url *keys* false)
    (let [want (into {} (for [id (distinct ids) :when (not (contains? @*keys* id))
                              :let [eid (protected-eid db id)
                                    h (when eid (try (envelope/body-key-handle (scope/value db eid :triplex.private/body))
                                                     (catch Exception _ nil)))]
                              :when h]
                          [h id]))]
      (when (seq want)
        (let [rows (#'sql/with-session
                     (fn [c] (#'sql/select! c (str "SELECT id, wrapped FROM triplex_removal.keys WHERE scope=? AND id = ANY(?)")
                                            [name (.createArrayOf ^java.sql.Connection c "text" (to-array (keys want)))]
                                            (fn [^java.sql.ResultSet rs]
                                              (loop [out {}] (if (.next rs) (recur (assoc out (.getString rs 1) (.getBytes rs 2))) out))))))]
          (doseq [[h id] want]
            (let [^bytes wrapped (get rows h)]
              (swap! *keys* assoc id
                     (if wrapped
                       (try (envelope/crypto Cipher/DECRYPT_MODE @@#'envelope/wrapping-key (Arrays/copyOfRange wrapped 0 12)
                                             (utf8 (json/write-str [name h])) (Arrays/copyOfRange wrapped 12 (alength wrapped)))
                            (catch Exception _ ::gone))
                       ::gone)))))))))

(defn- derive-key
  "HKDF-SHA256 (RFC 5869, one block): salt `triplex-derived-v1`, input the assertions' keys in ID order, info the
  database and the IDs. Destroying any one input key destroys the result."
  ^bytes [name ids keys]
  (let [ikm (byte-array (mapcat seq keys))
        prk (hmac (utf8 "triplex-derived-v1") ikm)
        info (utf8 (json/write-str (into [name] ids)))
        okm (hmac prk (byte-array (concat (seq info) [(byte 1)])))]
    (Arrays/fill ikm (byte 0))
    (Arrays/fill prk (byte 0))
    okm))

(defn- removal-seq
  "The sequence of the latest published removal that removed one of `ids` (the client's generation for a subject whose
  records it can no longer open, so every frame computes the same one, DERIVED-COPIES.md 3.4)."
  [cut ids]
  (let [want (set ids)]
    (reduce max 0 (for [[_ e] (:commands cut) :when (some #(want (get % "assertionId")) (get e "identities"))]
                    (get e "seq")))))

(defn- native-erased
  "[DX-ERA4, after the third review's M1] On a database guarded per account, every assertion whose removal is committed
  in Datomic past the published head, with that removal's sequence. For this option's routes a removal takes effect at
  its native commit or its publication, whichever comes first, so a removal log that lags the data, or is put back to a
  copy taken while the removal was pending (with the key files, which the file authority keeps beside the log), cannot
  reopen a sealed copy. Empty unless the data is ahead of the published head (a pending removal committed natively), so
  the usual cost is one read of the committed sequence."
  [db cut]
  (let [h (:seq cut) c (if (:per-account cut) (removal-scope/native-seq db) nil)]
    (if (if (integer? c) (if (integer? h) (> c h) false) false)
      (into {} (for [x (d/datoms db :aevt :triplex.tx/erasure-record)
                     :let [e (json/read-str (:v x)) s (get e "seq")]
                     :when (if (integer? s) (> s h) false)
                     i (get e "identities") :let [a (get i "assertionId")] :when a]
                 [a s]))
      {})))

(defn- with-key
  "Calls (f key) with the derived key of `ids`, or returns {\"removed\" ids...} when one of them is removed in the
  published cut or committed natively past it (`native-erased`), or its key is gone."
  [name db cut ids f]
  (let [native (native-erased db cut)
        erased (filterv #(if (contains? (:erased cut) %) true (contains? native %)) ids)]
    (if (seq erased)
      {"removed" erased "seq" (reduce max (removal-seq cut erased) (keep native erased))}
      (let [keys (mapv (fn [id] (let [eid (protected-eid db id)] (when eid (assertion-key name db eid id)))) ids)]
        (if (some nil? keys)
          (do (doseq [k keys] (when k (Arrays/fill ^bytes k (byte 0))))
              {"removed" (vec (keep-indexed (fn [i k] (when (nil? k) (nth ids i))) keys))})
          (let [k (derive-key name ids keys)]
            (doseq [x keys] (Arrays/fill ^bytes x (byte 0)))
            (try (f k) (finally (Arrays/fill k (byte 0))))))))))

(defn- gcm [mode ^bytes key ^bytes nonce ^bytes aad ^bytes data]
  (let [c (Cipher/getInstance "AES/GCM/NoPadding")]
    (.init c (int mode) (SecretKeySpec. key "AES") (GCMParameterSpec. 128 nonce))
    (.updateAAD c aad)
    (.doFinal c data)))

(defn- size-class
  "The padded length for n bytes (4 of length and the clear bytes): 64, 128, ... 4,096, then multiples of 4,096. What a
  stored record still shows is its class: within a factor of two below 4 KiB, to 4 KiB above."
  ^long [^long n]
  (if (<= n 4096) (loop [c 64] (if (<= n c) c (recur (* 2 c)))) (* 4096 (quot (+ n 4095) 4096))))
(defn- pad ^bytes [^bytes clear]
  (let [n (alength clear) out (byte-array (size-class (+ 4 n)))]
    (.putInt (ByteBuffer/wrap out) n)
    (System/arraycopy clear 0 out 4 n)
    out))
(defn- unpad ^bytes [^bytes padded]
  (let [n (.getInt (ByteBuffer/wrap padded))]
    (when-not (<= 0 n (- (alength padded) 4)) (privacy/failure! 409 "DerivedRecordInvalid" "The sealed record does not open"))
    (Arrays/copyOfRange padded 4 (+ 4 n))))

(defn- row-of?
  "A row of this database with this assertion ID, current or retracted (the row index, history included)."
  [db ^String id]
  (let [p (storage/row-prefix id)
        x (first (d/index-range (d/history db) :triplex.entity/row p nil))]
    (if x (str/starts-with? ^String (:v x) p) false)))

;; [DX-ERA4] one lookup per distinct name per call: [its protected assertion's entity or nil, whether it is a row of
;; this database]. A frame's records repeat their subjects' names.
(def ^:dynamic ^:private *names* nil)
(defn- name-of [db ^String id]
  (let [look (fn [] (let [e (protected-eid db id)] [e (if e true (row-of? db id))]))
        c *names*]
    (if c
      (or (get @c id) (let [r (look)] (swap! c assoc id r) r))
      (look))))

(defn- place! [place]
  (when-not (or (nil? place) (and (string? place) (<= 1 (count place) max-place)))
    (invalid! "A place is a string of 1 to 512 characters")))

(defn- seal-one [name db cut {:strs [ids value place] :as item}]
  (when-not (and (map? item) (every? #{"ids" "value" "place"} (keys item)) (vector? ids) (<= (count ids) max-ids)
                 (every? #(and (string? %) (<= 1 (count %) 256)) ids) (string? value) (<= (count value) max-value))
    (invalid! "Each item needs ids (at most 65,536 assertion IDs), a string value and optionally its place"))
  (place! place)
  ;; [DX-ERA4, after DX-ERA5's M1] every name must be a row of this database: a name the gateway does not know is
  ;; refused, never taken as "computed from no protected value". An empty list states that explicitly.
  (let [unknown (remove #(second (name-of db %)) ids)]
    (when (seq unknown)
      (privacy/failure! 400 "UnknownDerivedInput"
                        (str (count unknown) " of the names are not rows of this database; a derived record names the rows it read"))))
  ;; Only the protected assertions count; the client sends every string row it read (section 3.2).
  ;; [DX-ERA4, after DX-ERA5's B1] a placed item computed from no protected value is sealed too (under the key of no
  ;; assertion, which protects nothing and is never destroyed), so every derived unit a writer stores has one format
  ;; and a database that requires sealed derived documents can refuse anything else; an unplaced one stays clear.
  (let [protected (vec (sort (distinct (filter #(first (name-of db %)) ids))))]
    (if (if (empty? protected) (nil? place) false)
      {"clear" true}
      (with-key name db cut protected
        (fn [k]
          (let [header (b64 (utf8 (json/write-str (if place {"d" name "k" protected "p" place} {"d" name "k" protected}))))
                nonce (let [b (byte-array 12)] (.nextBytes ^SecureRandom random b) b)
                padded (pad (utf8 value))
                body (try (gcm Cipher/ENCRYPT_MODE k nonce (utf8 header) padded) (finally (Arrays/fill padded (byte 0))))]
            {"sealed" (str prefix header "." (b64 nonce) "." (b64 body))}))))))

(defn header-of
  "The clear header of a sealed record: {\"d\" database, \"k\" assertion IDs}."
  [^String wire]
  (when-not (and (string? wire) (or (str/starts-with? wire prefix) (str/starts-with? wire legacy-prefix)))
    (invalid! "Not a sealed derived record"))
  (let [parts (str/split (subs wire (count prefix)) #"\." 4)]
    (when-not (= 3 (count parts)) (invalid! "Malformed sealed derived record"))
    (let [h (try (json/read-str (String. (unb64 (first parts)) StandardCharsets/UTF_8)) (catch Exception _ nil))]
      (when-not (and (map? h) (string? (get h "d")) (vector? (get h "k")) (or (seq (get h "k")) (string? (get h "p")))
                     (every? string? (get h "k")) (= (get h "k") (vec (sort (distinct (get h "k")))))
                     ;; a record with no protected name exists only in the placed format (see seal-one)
                     (every? #{"d" "k" "p"} (keys h)) (or (nil? (get h "p")) (string? (get h "p"))))
        (invalid! "Malformed sealed derived record header"))
      [h parts])))

(defn- open-one [name db cut item]
  ;; an item is the record, or {record, place}: a record sealed with a place opens only where the reader expects it
  ;; (L1: copied into another account's or subject's document it does not open there)
  (let [wire (if (map? item) (get item "record") item)
        expected (if (map? item) (get item "place") nil)
        _ (place! expected)
        [h [header nonce body]] (header-of wire)
        v2 (str/starts-with? ^String wire prefix)]
    (when-not (= name (get h "d")) (invalid! "A sealed derived record is opened by the database that sealed it"))
    (when (get h "p")
      (when-not (= expected (get h "p"))
        (privacy/failure! 409 "DerivedRecordMisplaced" "A sealed record opens only in the place it was sealed for")))
    (when-not (every? #(protected-eid db %) (get h "k")) (invalid! "A sealed record names an unknown assertion"))
    (with-key name db cut (get h "k")
      (fn [k]
        (let [clear (try (gcm Cipher/DECRYPT_MODE k (unb64 nonce) (utf8 header) (unb64 body))
                         (catch Exception _ (privacy/failure! 409 "DerivedRecordInvalid" "The sealed record does not open")))]
          {"value" (String. ^bytes (if v2 (unpad clear) clear) StandardCharsets/UTF_8)})))))

(defn handle!
  "POST /v2/db/{db}/derived-seal {items: [{ids, value}]} and derived-open {items: [sealed]}, under the request's
  published cut (a read of any basis after the removal's publication answers removed, TARGETS 7.1)."
  [name db cut action input]
  (sealed-scope! cut)
  (let [items (get input "items")]
    (when-not (and (map? input) (= #{"items"} (set (keys input))) (vector? items) (<= 1 (count items) max-items))
      (invalid! "Expected {items: [...]} with 1 to 1024 items"))
    (binding [*keys* (atom {}) *names* (atom {})]
      (try
        (prefetch! name db (if (= action "derived-seal")
                             (mapcat #(when (map? %) (let [ids (get % "ids")] (when (vector? ids) ids))) items)
                             (mapcat #(try (get (first (header-of (if (map? %) (get % "record") %))) "k") (catch Exception _ nil)) items)))
        {:items (if (= action "derived-seal")
                  (mapv #(seal-one name db cut %) items)
                  (mapv #(open-one name db cut %) items))}
        (finally (doseq [v (vals @*keys*)] (when (bytes? v) (Arrays/fill ^bytes v (byte 0)))))))))

(defn- wire [v] (if (map? v) (get v "v") v))

(defn preview-ok?
  "A staged preview is refused on a sealed scope because preparing it seals protected staged rows (issuing keys outside
  the writer's lock). One whose staged rows hold no protected attribute, directly or in a change record, seals nothing,
  so under the option it is served (the derived writers' transactions read their own staged documents)."
  [input]
  (let [attrs (:attrs privacy/*cut*) rows (get-in input ["staged" "rows"])
        protected? (fn [r]
                     (let [a (wire (get r "attribute"))]
                       (or (contains? attrs a)
                           (and (= ":_tx/change" a)
                                (contains? attrs (get (try (json/read-str (or (wire (get r "value_json")) "{}"))
                                                           (catch Exception _ {"attribute" ::unreadable}))
                                                      "attribute"))))))]
    (boolean (and (set? attrs) (sequential? rows) (not-any? protected? rows)))))

(defn removal-tx-id
  "A removal's transaction ID in the SDK's form `_tx/` and 26 characters of [0-9A-Z] (128 random bits in base 32)."
  []
  (let [b (byte-array 16)]
    (.nextBytes (java.security.SecureRandom.) b)
    (let [s (.toUpperCase (.toString (BigInteger. 1 b) 32))]
      (str "_tx/" (apply str (repeat (- 26 (count s)) "0")) s))))

;; [DX-ERA4, after DX-ERA5's M2 and B2] Every removal's keys deleted again on every pass, not from a progress counter:
;; the published removals (the cut read allowing a pending removal, so a pending one holds back nothing) and the
;; removals committed in the data (a log put back to a copy taken while one was pending holds it pending; the data does
;; not). A key file restored from an older copy of the authority is deleted at the next pass, without a restart. Every
;; gateway with the option runs it; each pass reads each database's committed erasure records.
(def ^:private resweep-ms 1000)
(defn resweep! [conn-of]
  (let [cutoff (- (System/currentTimeMillis) envelope/grace-ms)
        due? (fn [e] (let [at (get e "erasedAt")] (if (number? at) (<= at cutoff) false)))]
    (doseq [name (#'envelope/authority-scopes)]
      (try
        (let [cut (privacy/cut name nil true)]
          (when (:sealed cut)
            (let [native (try (let [db (d/db (conn-of name))]
                                (if (d/entid db :triplex.tx/erasure-record)
                                  (mapv (fn [x] (json/read-str (:v x))) (d/datoms db :aevt :triplex.tx/erasure-record))
                                  []))
                              (catch Exception _ []))
                  entries (filter due? (concat (vals (:commands cut)) native))
                  ids (distinct (mapcat #(get % "identities") entries))
                  ;; with the PostgreSQL authority one query per database per pass, not one per identity
                  present (if sql/url
                            (let [by-handle (into {} (keep (fn [i] (when-let [h (get i "keyHandle")] [h i])) ids))
                                  found (when (seq by-handle)
                                          (#'sql/with-session
                                            (fn [c] (#'sql/select! c "SELECT id FROM triplex_removal.keys WHERE scope=? AND id = ANY(?)"
                                                                   [name (.createArrayOf ^java.sql.Connection c "text" (to-array (keys by-handle)))]
                                                                   (fn [^java.sql.ResultSet rs]
                                                                     (loop [out #{}] (if (.next rs) (recur (conj out (.getString rs 1))) out)))))))]
                              (filterv #(contains? found (get % "keyHandle")) (vals by-handle)))
                            (filterv (fn [i] (envelope/key-present? name (get i "assertionId") (get i "keyHandle"))) ids))]
              (when (seq present) (envelope/erase-keys! name present)))))
        (catch Exception _ nil)))))
(defonce ^:private resweeper (atom nil))
(defn start-resweep! []
  (when (compare-and-set! resweeper nil true)
    (doto (Thread. ^Runnable (fn [] (loop [] (try (resweep! (fn [n] ((requiring-resolve 'triplex.gateway.main/connection)
                                                                    ((requiring-resolve 'triplex.gateway.main/db-uri) n))))
                                                  (catch Exception _ nil))
                                      (when (try (Thread/sleep (long resweep-ms)) true (catch InterruptedException _ false)) (recur))))
                   "triplex-derived-resweep")
      (.setDaemon true)
      (.start))))

;; ---- [DX-ERA4, after DX-ERA5's B1 and M3] the database's one-way setting, and the write route's check ----------------
(defn required? [db]
  (if (d/entid db :triplex.scope/derived-sealed)
    (true? (scope/value db (scope/entity db) :triplex.scope/derived-sealed))
    false))
(defn require!
  "POST /v2/db/{db}/derived-seal-required: from now on every derived document of this database must be sealed. One-way:
  no route removes it; a gateway of this build without the option refuses the database."
  [name conn]
  (let [db (d/db conn) head (scope/entity db)]
    (when-not head (privacy/failure! 400 "InvalidValue" "Not a Triplex database"))
    (when-not (d/entid db :triplex.scope/derived-sealed)
      @(d/transact conn [{:db/ident :triplex.scope/derived-sealed :db/valueType :db.type/boolean
                          :db/cardinality :db.cardinality/one
                          :db/doc "[DX-ERA4] One-way: the derived documents of this database must be sealed."}]))
    (when-not (required? (d/db conn))
      @(d/transact conn [[:db/cas head :triplex.scope/derived-sealed nil true]]))
    {:database name :derivedSealed (required? (d/db conn))}))

(def ^:private content-key
  #"^notice:v1:[0-9a-f]{64}:(answer:[0-9]+:f[0-9]+|answer:[0-9]+:[0-9]+|recorded-notices:[0-9]+|recorded-ledger-part:.+|recorded-ledger:.+|receiver:[^:]+:.+|effects:[^:]+:[0-9]+)$")
(defn- unsealed! [what]
  ;; :write-policy: the write path passes it through as typed (storage.clj maps any other failure to TransactionRejected)
  (throw (ex-info (str "This database requires sealed derived documents; refused: " what)
                  {:status 409 :code "DerivedRecordUnsealed" :write-policy true})))
(defn- inflate ^String [^bytes b]
  (let [inf (java.util.zip.Inflater. true) out (java.io.ByteArrayOutputStream.) buf (byte-array 65536)
        in (Arrays/copyOf b (inc (alength b)))]
    (.setInput inf in)
    (loop [k 0]
      (let [n (.inflate inf buf)]
        (when (pos? n) (.write out buf 0 n))
        (when (and (not (.finished inf)) (or (pos? n) (not (.needsInput inf))) (< k 100000)) (recur (inc k)))))
    (.end inf)
    (String. (.toByteArray out) StandardCharsets/UTF_8)))
(defn- document [^String text]
  (let [v (json/read-str text)]
    (if (string? v) (json/read-str (inflate (.decode (Base64/getDecoder) ^String v))) v)))
(defn- sealed-unit? [x]
  (if (string? x)
    (if (str/starts-with? x prefix) (try (string? (get (first (header-of x)) "p")) (catch Exception _ false)) false)
    false))
(defn- removed-unit? [x] (if (map? x) (vector? (get x "removed")) false))
(defn- delivery! [what d]
  (when-not (and (map? d) (every? #{"subject" "generation" "sealed"} (keys d))
                 (or (sealed-unit? (get d "sealed")) (removed-unit? (get d "sealed"))))
    (unsealed! what)))
(defn- check-document! [kind doc]
  (cond
    (str/starts-with? kind "answer:")
    ;; a settled page's entries are exactly {subject, changes, part?}; each change is ["", sealed record or null]. The
    ;; unframed page (entries with the clear answer in `json`) is refused: it is never written with the option.
    (let [entries (if (if (map? doc)
                        (if (string? (get doc "bytes"))
                          (every? #{"identity" "frame" "start" "part" "through" "tail" "previous" "bytes"} (keys doc))
                          false)
                        false)
                    (try (document (str "\"" (get doc "bytes") "\"")) (catch Exception _ nil))
                    nil)]
      (when-not (vector? entries) (unsealed! kind))
      (doseq [e entries]
        (when-not (and (map? e) (every? #{"subject" "changes" "part"} (keys e)) (string? (get e "subject"))
                       (vector? (get e "changes")) (or (nil? (get e "part")) (integer? (get e "part"))))
          (unsealed! kind))
        (doseq [u (get e "changes")]
          (when-not (and (vector? u) (= 2 (count u)) (= "" (first u)) (or (nil? (second u)) (sealed-unit? (second u))))
            (unsealed! kind)))))
    (str/starts-with? kind "recorded-notices:")
    (do (when-not (and (map? doc) (vector? (get doc "deliveries"))
                       (every? #{"account" "epoch" "batch" "previous" "event" "position" "recipe" "start" "through"
                                 "part" "tail" "deliveries" "erasureSeq"} (keys doc)))
          (unsealed! kind))
        (doseq [d (get doc "deliveries")] (delivery! kind d)))
    (str/starts-with? kind "effects:")
    (do (when-not (vector? doc) (unsealed! kind)) (doseq [d doc] (delivery! kind d)))
    (str/starts-with? kind "recorded-ledger-part:") (unsealed! (str kind " (ledger parts cannot be checked)"))
    (str/starts-with? kind "recorded-ledger:")
    (let [items (if (map? doc) (if (= #{"items"} (set (keys doc))) (get doc "items") nil) doc)]
      (when-not (vector? items) (unsealed! kind))
      (doseq [x items] (when-not (or (sealed-unit? x) (removed-unit? x)) (unsealed! kind))))
    (str/starts-with? kind "receiver:")
    (do (when-not (and (map? doc) (every? #{"g" "e"} (keys doc)) (vector? (get doc "e"))) (unsealed! kind))
        (doseq [x (get doc "e")] (when-not (or (sealed-unit? x) (removed-unit? x)) (unsealed! kind))))))
(defn check-rows!
  "Every new `notice/value` row of a content-bearing derived document (settled changes, recorded packets, ledgers, a
  recipient's state and delivered effects) on a database that requires it: each content unit a sealed, placed record
  or the removed marker; anything else refused (409 DerivedRecordUnsealed), whatever the client or its option says."
  [db rows new-ids]
  (when (required? db)
    (doseq [r rows]
      (when (if (contains? new-ids (:id r)) (= "notice/value" (:attribute r)) false)
        (when-let [m (re-matches content-key (str (:entity_id r)))]
          (let [kind (second m)
                doc (try (document (str (:value_string r))) (catch Exception _ (unsealed! (str kind " (undecodable)"))))]
            (check-document! kind doc)))))))
