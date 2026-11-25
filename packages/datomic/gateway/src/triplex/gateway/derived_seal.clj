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

(defn- native-erased*
  [db cut]
  (let [h (:seq cut) c (if (:per-account cut) (removal-scope/native-seq db) nil)]
    (if (if (integer? c) (if (integer? h) (> c h) false) false)
      (into {} (for [x (d/datoms db :aevt :triplex.tx/erasure-record)
                     :let [e (json/read-str (:v x)) s (get e "seq")]
                     :when (if (integer? s) (> s h) false)
                     i (get e "identities") :let [a (get i "assertionId")] :when a]
                 [a s]))
      {})))
;; [DX-ERA4, second review N9] computed once per call (it was once per item)
(def ^:dynamic ^:private *native* nil)
(defn- native-erased
  "[DX-ERA4, after the third review's M1] On a database guarded per account, every assertion whose removal is committed
  in Datomic past the published head, with that removal's sequence. For this option's routes a removal takes effect at
  its native commit or its publication, whichever comes first, so a removal log that lags the data, or is put back to a
  copy taken while the removal was pending (with the key files, which the file authority keeps beside the log), cannot
  reopen a sealed copy. Empty unless the data is ahead of the published head (a pending removal committed natively), so
  the usual cost is one read of the committed sequence."
  [db cut]
  (if *native* @*native* (native-erased* db cut)))

;; [DX-ERA4, second review N9] one derived key per distinct name list per call (a subject's records share one list)
(def ^:dynamic ^:private *derived* nil)
(defn- with-key
  "Calls (f key) with the derived key of `ids`, or returns {\"removed\" ids...} when one of them is removed in the
  published cut or committed natively past it (`native-erased`), or its key is gone."
  [name db cut ids f]
  (let [native (native-erased db cut)
        erased (filterv #(if (contains? (:erased cut) %) true (contains? native %)) ids)]
    (if (seq erased)
      {"removed" erased "seq" (reduce max (removal-seq cut erased) (keep native erased))}
      (let [cached (if *derived* (get @*derived* ids) nil)]
        (if cached
          (let [k (aclone ^bytes cached)] (try (f k) (finally (Arrays/fill k (byte 0)))))
          (let [keys (mapv (fn [id] (let [eid (protected-eid db id)] (when eid (assertion-key name db eid id)))) ids)]
            (if (some nil? keys)
              (do (doseq [k keys] (when k (Arrays/fill ^bytes k (byte 0))))
                  {"removed" (vec (keep-indexed (fn [i k] (when (nil? k) (nth ids i))) keys))})
              (let [k (derive-key name ids keys)]
                (doseq [x keys] (Arrays/fill ^bytes x (byte 0)))
                (when *derived* (swap! *derived* assoc ids (aclone k)))
                (try (f k) (finally (Arrays/fill k (byte 0))))))))))))

(defn- gcm [mode ^bytes key ^bytes nonce ^bytes aad ^bytes data]
  (let [c (Cipher/getInstance "AES/GCM/NoPadding")]
    (.init c (int mode) (SecretKeySpec. key "AES") (GCMParameterSpec. 128 nonce))
    (.updateAAD c aad)
    (.doFinal c data)))

(defn- size-class
  "The padded length for n bytes (4 of length and the clear bytes): 64, 128, ... 4,096, then multiples of 512 (was
  4,096: [DX-ERA4, second review N1] a ledger part holds about 180 items in one record, and a coarser class cost it a
  tenth of them). What a stored record shows is its class: within a factor of two below 4 KiB, to 512 bytes above (for
  a ledger part, its item count to within about ten)."
  ^long [^long n]
  (if (<= n 4096) (loop [c 64] (if (<= n c) c (recur (* 2 c)))) (* 512 (quot (+ n 511) 512))))
(defn- size-class? [^long n] (if (<= n 4096) (contains? #{64 128 256 512 1024 2048 4096} n) (zero? (rem n 512))))
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

(defn place-subject
  "The subject a place names: `<scope>|<account>|<subject>` (era4 lab `placeOf`), the text after the last bar; nil for a
  place without a bar or with nothing after it."
  [^String place]
  (if (string? place)
    (let [j (.lastIndexOf place "|")]
      (if (>= j 0) (let [s (subs place (inc j))] (if (seq s) s nil)) nil))
    nil))

;; [DX-ERA4, second review N3] The gateway chooses the keys: every protected assertion of the subject the record's
;; place names (its entity and the entities under `<subject>/`), current or superseded, that is not removed; plus
;; whatever else the writer names. A writer that names too few rows of its own subject can no longer get a record
;; sealed under the key of no assertion while that subject holds a protected value. One index scan per subject per call.
(def ^:dynamic ^:private *subjects* nil)
(defn- subject-protected [db cut subject]
  (if (nil? subject)
    []
    (let [look (fn []
                 (let [native (native-erased db cut)
                       lo (str subject "/") hi (str subject "/￿")]
                   (vec (sort (distinct
                                (for [x (concat (d/datoms db :avet :triplex.private/entity subject)
                                                (d/index-range db :triplex.private/entity lo hi))
                                      :let [id (scope/value db (:e x) :triplex.private/id)]
                                      :when (string? id)
                                      :when (not (contains? (:erased cut) id))
                                      :when (not (contains? native id))]
                                  id))))))
          c *subjects*]
      (if c (or (get @c subject) (let [r (look)] (swap! c assoc subject r) r)) (look)))))

(defn- plan-seal
  "Checks one seal item and computes the assertions it is sealed under. An item is {value | bytes, place?, ids?}:
  `value` a string; `bytes` base64 of raw bytes (a ledger part the writer compressed, second review N1); `ids` the rows
  the writer read beyond what the call's `names` gives for the item's place (second review N9: names travel once per
  place per call)."
  [db cut names item]
  (when-not (map? item) (invalid! "Each item is an object"))
  (let [{:strs [ids value bytes place]} item
        ids (or ids [])]
    (when-not (and (every? #{"ids" "value" "bytes" "place"} (keys item)) (vector? ids) (<= (count ids) max-ids)
                   (every? #(and (string? %) (<= 1 (count %) 256)) ids)
                   (if (some? value) (if (nil? bytes) (if (string? value) (<= (count value) max-value) false) false)
                     (if (string? bytes) (<= (count bytes) max-value) false)))
      (invalid! "Each item needs a string value or base64 bytes, optionally its place and the rows it read (at most 65,536)"))
    (place! place)
    (when (if (some? bytes) (nil? place) false) (invalid! "A record of bytes needs its place"))
    (let [all (vec (distinct (concat ids (if place (get names place) nil))))]
      ;; [DX-ERA4, after DX-ERA5's M1] every name must be a row of this database
      (let [unknown (remove #(second (name-of db %)) all)]
        (when (seq unknown)
          (privacy/failure! 400 "UnknownDerivedInput"
                            (str (count unknown) " of the names are not rows of this database; a derived record names the rows it read"))))
      {:protected (vec (sort (distinct (concat (filter #(first (name-of db %)) all)
                                               (if place (subject-protected db cut (place-subject place)) [])))))
       :place place
       :clear (if (some? bytes)
                (try (.decode (Base64/getDecoder) ^String bytes) (catch Exception _ (invalid! "bytes is not base64")))
                (utf8 value))
       :bytes? (some? bytes)})))

(defn- seal-planned [name db cut {:keys [protected place clear bytes?]}]
  ;; [DX-ERA4, after DX-ERA5's B1] a placed item computed from no protected value is sealed too (under the key of no
  ;; assertion), so every derived unit a writer stores has one format; an unplaced one stays clear. With the gateway's
  ;; own choice of keys (N3) that happens only when the subject holds no protected value and the writer named none.
  (if (if (empty? protected) (nil? place) false)
    {"clear" true}
    (with-key name db cut protected
      (fn [k]
        (let [h (cond-> {"d" name "k" protected} place (assoc "p" place) bytes? (assoc "b" 1))
              header (b64 (utf8 (json/write-str h)))
              nonce (let [b (byte-array 12)] (.nextBytes ^SecureRandom random b) b)
              padded (pad clear)
              body (try (gcm Cipher/ENCRYPT_MODE k nonce (utf8 header) padded) (finally (Arrays/fill ^bytes padded (byte 0))))]
          {"sealed" (str prefix header "." (b64 nonce) "." (b64 body))})))))

(defn header-of
  "The clear header of a sealed record: {\"d\" database, \"k\" assertion IDs, \"p\" place, \"b\" 1 for bytes}."
  [^String wire]
  (when-not (and (string? wire) (or (str/starts-with? wire prefix) (str/starts-with? wire legacy-prefix)))
    (invalid! "Not a sealed derived record"))
  (let [parts (str/split (subs wire (count prefix)) #"\." 4)]
    (when-not (= 3 (count parts)) (invalid! "Malformed sealed derived record"))
    (let [h (try (json/read-str (String. (unb64 (first parts)) StandardCharsets/UTF_8)) (catch Exception _ nil))]
      (when-not (and (map? h) (string? (get h "d")) (vector? (get h "k")) (or (seq (get h "k")) (string? (get h "p")))
                     (every? string? (get h "k")) (= (get h "k") (vec (sort (distinct (get h "k")))))
                     ;; a record with no protected name exists only in the placed format (see seal-planned)
                     (every? #{"d" "k" "p" "b"} (keys h)) (or (nil? (get h "p")) (string? (get h "p")))
                     (or (nil? (get h "b")) (= 1 (get h "b"))))
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
                         (catch Exception _ (privacy/failure! 409 "DerivedRecordInvalid" "The sealed record does not open")))
              out (if v2 (unpad clear) clear)]
          (if (= 1 (get h "b"))
            {"bytes" (.encodeToString (Base64/getEncoder) ^bytes out)}
            {"value" (String. ^bytes out StandardCharsets/UTF_8)}))))))

(defn- names! [names]
  (when-not (or (nil? names)
                (and (map? names) (<= (count names) max-items)
                     (every? (fn [[p v]] (and (string? p) (<= 1 (count p) max-place) (vector? v) (<= (count v) max-ids)
                                              (every? #(and (string? %) (<= 1 (count %) 256)) v)))
                             names)))
    (invalid! "names maps a place to the rows read for it (at most 65,536)")))

(defn handle!
  "POST /v2/db/{db}/derived-seal {items: [{value | bytes, place?, ids?}], names?: {place: [ids]}} and derived-open
  {items: [sealed | {record, place}]}, under the request's published cut (a read of any basis after the removal's
  publication answers removed, TARGETS 7.1)."
  [name db cut action input]
  (sealed-scope! cut)
  (let [items (get input "items") names (get input "names")]
    (when-not (and (map? input) (vector? items) (<= 1 (count items) max-items)
                   (every? (if (= action "derived-seal") #{"items" "names"} #{"items"}) (keys input)))
      (invalid! "Expected {items: [...]} with 1 to 1024 items"))
    (names! names)
    (binding [*keys* (atom {}) *names* (atom {}) *subjects* (atom {}) *derived* (atom {})
              *native* (delay (native-erased* db cut))]
      (try
        (if (= action "derived-seal")
          (let [plans (mapv #(plan-seal db cut names %) items)]
            (prefetch! name db (mapcat :protected plans))
            {:items (mapv #(seal-planned name db cut %) plans)})
          (do (prefetch! name db (mapcat #(try (get (first (header-of (if (map? %) (get % "record") %))) "k") (catch Exception _ nil)) items))
              {:items (mapv #(open-one name db cut %) items)}))
        (finally (doseq [v (concat (vals @*keys*) (vals @*derived*))] (when (bytes? v) (Arrays/fill ^bytes v (byte 0)))))))))

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

;; [DX-ERA4, after DX-ERA5's M2 and B2; second review N5] The key re-sweep: every removal's keys deleted again, not from a
;; progress counter, so a key restored from an older copy of the authority goes again without a restart; the removals
;; are the published ones (the cut read allowing a pending removal) and those committed in the data (a log put back to a
;; copy taken while one was pending holds it pending; the data does not). Bounded: a database's committed records are
;; read incrementally (only transactions since the last pass), and each pass checks at most `resweep-batch` identities
;; of that database, the newest removals first and then a window that rotates over the older ones, so a restored key is
;; deleted within (identities / batch) passes and a pass costs the same at 1,000 removals as at 1,000,000. Every
;; failure is counted and logged (failures/note!, `:removalFailures "resweep"`), never dropped.
(def ^:private resweep-ms 1000)
(def ^:private resweep-batch 512)
(defonce ^:private resweep-state (atom {}))
(defn- note! [where name e] ((requiring-resolve 'triplex.gateway.failures/note!) where name e))
(defn- committed-records
  "The database's committed erasure records, read incrementally: those of transactions after the last pass's basis."
  [name db]
  (let [{:keys [t records]} (get @resweep-state name)
        t (long (or t 0))
        fresh (if (d/entid db :triplex.tx/erasure-record)
                (mapv (fn [x] (json/read-str (:v x))) (d/datoms (if (pos? t) (d/since db t) db) :aevt :triplex.tx/erasure-record))
                [])
        all (into (or records {}) (map (fn [e] [(get e "seq") e])) fresh)]
    (swap! resweep-state update name assoc :t (d/basis-t db) :records all)
    (vals all)))
(defn- present-keys [name identities]
  (if sql/url
    (let [by-handle (into {} (keep (fn [i] (when-let [h (get i "keyHandle")] [h i])) identities))
          found (when (seq by-handle)
                  (#'sql/with-session
                    (fn [c] (#'sql/select! c "SELECT id FROM triplex_removal.keys WHERE scope=? AND id = ANY(?)"
                                           [name (.createArrayOf ^java.sql.Connection c "text" (to-array (keys by-handle)))]
                                           (fn [^java.sql.ResultSet rs]
                                             (loop [out #{}] (if (.next rs) (recur (conj out (.getString rs 1))) out)))))))]
      (filterv #(contains? found (get % "keyHandle")) (vals by-handle)))
    (filterv (fn [i] (envelope/key-present? name (get i "assertionId") (get i "keyHandle"))) identities)))
(defn resweep-one! [name db]
  (let [cutoff (- (System/currentTimeMillis) envelope/grace-ms)
        due? (fn [e] (let [at (get e "erasedAt")] (if (number? at) (<= at cutoff) false)))
        cut (privacy/cut name nil true)]
    (when (:sealed cut)
      (let [native (committed-records name db)
            entries (sort-by #(- (long (or (get % "seq") 0))) (filter due? (concat (vals (:commands cut)) native)))
            ids (vec (distinct (mapcat #(get % "identities") entries)))
            n (count ids)
            newest (vec (take (quot resweep-batch 2) ids))
            from (long (get-in @resweep-state [name :cursor] 0))
            older (if (> n (count newest))
                    (let [rest (subvec ids (count newest)) m (count rest) from (mod from m)]
                      (swap! resweep-state assoc-in [name :cursor] (+ from (quot resweep-batch 2)))
                      (take (quot resweep-batch 2) (concat (subvec rest from) (subvec rest 0 from))))
                    [])
            check (vec (distinct (concat newest older)))
            present (present-keys name check)]
        (swap! resweep-state update name assoc :identities n :checked (count check) :deleted (count present))
        (when (seq present)
          (envelope/erase-keys! name present)
          ((requiring-resolve 'triplex.gateway.stats/bump!) [:derivedResweep :deleted] (count present)))))))
(defn resweep! [conn-of]
  (doseq [name (try (#'envelope/authority-scopes) (catch Exception e (note! "resweep-scopes" nil e) []))]
    (try (resweep-one! name (d/db (conn-of name)))
         (catch Exception e (note! "resweep" name e)))))
(defonce ^:private resweeper (atom nil))
(defn start-resweep! []
  (when (compare-and-set! resweeper nil true)
    (doto (Thread. ^Runnable (fn [] (loop [] (try (resweep! (fn [n] ((requiring-resolve 'triplex.gateway.main/connection)
                                                                    ((requiring-resolve 'triplex.gateway.main/db-uri) n))))
                                                  (catch Exception e (note! "resweep-loop" nil e)))
                                      (when (try (Thread/sleep (long resweep-ms)) true (catch InterruptedException _ false)) (recur))))
                   "triplex-derived-resweep")
      (.setDaemon true)
      (.start))))

;; ---- [DX-ERA4, after DX-ERA5's B1 and M3] the database's one-way setting, and the write route's check ----------------
(def ^:private setting-attr :triplex.scope/derived-sealed)
(defn- setting-value [db]
  (if (d/entid db setting-attr) (scope/value db (scope/entity db) setting-attr) nil))
(defn required? [db] (true? (setting-value db)))
(defn install!
  "[DX-ERA4, second review N7] At a database's opening on a gateway with the option: the setting's attribute, and its
  value false when it has none, so every derived write can fence on the value it read (a declaration between a write's
  check and its commit then fails the write at the serial point). Returns the database after."
  [conn db]
  (let [db (if (d/entid db setting-attr) db
             (:db-after @(d/transact conn [{:db/ident setting-attr :db/valueType :db.type/boolean
                                            :db/cardinality :db.cardinality/one
                                            :db/doc "[DX-ERA4] One-way: the derived documents of this database must be sealed."}])))
        head (scope/entity db)]
    (if (if head (nil? (scope/value db head setting-attr)) false)
      (try (:db-after @(d/transact conn [[:db/cas head setting-attr nil false]]))
           (catch Exception _ (d/db conn)))
      db)))
(defn require!
  "POST /v2/db/{db}/derived-seal-required: from now on every derived document of this database must be sealed. One-way:
  no route removes it; a gateway of this build without the option refuses the database."
  [name conn]
  (let [db (install! conn (d/db conn)) head (scope/entity db)]
    (when-not head (privacy/failure! 400 "InvalidValue" "Not a Triplex database"))
    (when-not (required? db)
      @(d/transact conn [[:db/cas head setting-attr (setting-value db) true]]))
    {:database name :derivedSealed (required? (d/db conn))}))

(defn- unsealed! [what]
  ;; :write-policy: the write path passes it through as typed (storage.clj maps any other failure to TransactionRejected)
  (throw (ex-info (str "This database requires sealed derived documents (derived-seal-required); refused: " what)
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

;; ---- [DX-ERA4, second review N4] exact shapes ------------------------------------------------------------------------
(def ^:private hex64 #"[0-9a-f]{64}")
(defn- nat? [x] (if (integer? x) (>= (long x) 0) false))
(defn- hex64? [x] (if (string? x) (some? (re-matches hex64 x)) false))
(defn- id-like? [x] (if (string? x) (if (<= 1 (count x) 256) (some? (re-matches #"[A-Za-z0-9_:./|-]+" x)) false) false))
(defn- canonical-b64 ^bytes [^String s]
  (let [b (try (unb64 s) (catch Exception _ nil))] (if b (if (= s (b64 b)) b nil) nil)))
(defn sealed-header
  "The header of `x` when it is a sealed, placed `tdx2` record of exact form (canonical base64url parts, a header of
  {d, k, p, b?} with sorted distinct names and a place naming a subject, a 12-byte nonce, a body that is a size class
  plus the 16-byte tag), else nil. A record cannot be told from a forged one without its key; this bounds what a forged
  one can be (second review N4)."
  [x]
  (if (if (string? x) (str/starts-with? x prefix) false)
    (let [parts (str/split (subs x (count prefix)) #"\." -1)]
      (if (= 3 (count parts))
        (let [[hh nn bb] parts
              hb (canonical-b64 hh) nonce (canonical-b64 nn) body (canonical-b64 bb)
              h (if hb (try (json/read-str (String. ^bytes hb StandardCharsets/UTF_8)) (catch Exception _ nil)) nil)]
          (if (and (map? h) (every? #{"d" "k" "p" "b"} (keys h))
                   (string? (get h "d")) (some? (re-matches #"s2-[A-Za-z0-9_-]+" (get h "d")))
                   (vector? (get h "k")) (every? id-like? (get h "k")) (= (get h "k") (vec (sort (distinct (get h "k")))))
                   (string? (get h "p")) (<= (count (get h "p")) max-place) (some? (place-subject (get h "p")))
                   (or (nil? (get h "b")) (= 1 (get h "b")))
                   (some? nonce) (= 12 (alength ^bytes nonce))
                   (some? body) (> (alength ^bytes body) 16) (size-class? (- (alength ^bytes body) 16)))
            h nil))
        nil))
    nil))
(defn- removed-marker? [x]
  (if (map? x)
    (and (every? #{"removed" "seq"} (keys x)) (vector? (get x "removed")) (every? id-like? (get x "removed"))
         (or (nil? (get x "seq")) (nat? (get x "seq"))))
    false))
(defn- unit!
  "A content unit: a sealed record for `subject` (its place names it) or the removed marker."
  [what subject x]
  (if (removed-marker? x)
    nil
    (let [h (sealed-header x)]
      (when-not h (unsealed! what))
      (when-not (= subject (place-subject (get h "p"))) (unsealed! (str what " (a record of another subject)"))))))
(defn- exact-keys! [what m required optional]
  (when-not (and (map? m) (every? #(contains? m %) required) (every? (into (set required) optional) (keys m)))
    (unsealed! what)))
(defn- delivery! [what d]
  (exact-keys! what d ["subject" "generation" "sealed"] [])
  (when-not (and (id-like? (get d "subject")) (nat? (get d "generation"))) (unsealed! what))
  (unit! what (get d "subject") (get d "sealed")))
(defn- units! [what subject v]
  (when-not (vector? v) (unsealed! what))
  (doseq [x v] (unit! what subject x)))

;; Every kind of derived document the option's writers store (second review K: 19 kinds on the held path, plus the
;; ledger's parts and generations). Under the setting a kind not on this list is refused. Content kinds are checked to
;; their exact shape; the others hold counters, hashes, IDs and release documents, and are not shape-checked.
(def ^:private content-kinds
  [[#"answer:([0-9]+):f([0-9]+)" :page]
   [#"recorded-notices:([0-9]+)" :packet]
   [#"recorded-ledger-part:(.+):([0-9]+):([0-9]+)" :ledger-part]
   [#"recorded-ledger:(.+)" :ledger]
   [#"receiver:([^:]+):(.+)" :receiver]
   [#"effects:([^:]+):([0-9]+)" :effects]])
;; [DX-ERA4, second review N4] the review's census (forms.ts K), plus what T1 writes after a removal (the join index's
;; leaves and its invalidation marker) and the settlement control document. These hold no value of the current
;; protection policy (document types and expiry dates); the join index's postings hold values of the indexed rules'
;; inputs (pay, location, status), so a policy that protects one of those makes this list wrong (14.4).
(def ^:private other-kinds
  #"(notice-progress|values:[0-9]+|claim:.+|census:.+|members:.+|join-meta|join-calendar|join-member:.+|join-index-base:[0-9]+|join-index:[0-9]+|join-invalid|control|event:[0-9]+|tail|erasure|received:.+|effect-erasure:.+|recorded-generation:.+|recorded-cursor|cursor|settled-values:.+|settled-notice:.+)")

(defn- check-document!
  "One derived document of kind `kind` whose stored text is `text`: a content kind decoded and checked to its exact
  shape; a content-free kind on the list accepted as it is (not decoded: a claim, for one, is a bare hash); any other
  kind refused."
  [kind text]
  (let [[m tag] (some (fn [[re tag]] (when-let [m (re-matches re kind)] [m tag])) content-kinds)
        doc (if tag (try (document text) (catch Exception _ (unsealed! (str kind " (undecodable)")))) nil)]
    (case tag
      :page
      ;; a settled page: exactly its frame fields; entries {subject, changes, part?}, each change ["", sealed | null]
      (let [_ (exact-keys! kind doc ["identity" "frame" "start" "part" "through" "tail" "previous" "bytes"] [])
            _ (when-not (and (hex64? (get doc "identity")) (hex64? (get doc "previous")) (nat? (get doc "frame"))
                             (nat? (get doc "start")) (nat? (get doc "part")) (nat? (get doc "through")) (nat? (get doc "tail"))
                             (string? (get doc "bytes")))
                (unsealed! kind))
            entries (try (document (str "\"" (get doc "bytes") "\"")) (catch Exception _ nil))]
        (when-not (vector? entries) (unsealed! kind))
        (doseq [e entries]
          (exact-keys! kind e ["subject" "changes"] ["part"])
          (when-not (and (id-like? (get e "subject")) (vector? (get e "changes")) (or (nil? (get e "part")) (nat? (get e "part"))))
            (unsealed! kind))
          (doseq [u (get e "changes")]
            (when-not (and (vector? u) (= 2 (count u)) (= "" (first u))) (unsealed! kind))
            (when (some? (second u)) (unit! kind (get e "subject") (second u))))))
      :packet
      (do (exact-keys! kind doc ["deliveries"] ["account" "epoch" "batch" "previous" "event" "position" "recipe" "start"
                                                 "through" "part" "tail" "erasureSeq"])
          (when-not (and (every? #(or (nil? (get doc %)) (nat? (get doc %))) ["batch" "event" "position" "start" "through" "part" "tail" "erasureSeq"])
                         (every? #(or (nil? (get doc %)) (hex64? (get doc %))) ["previous" "recipe"])
                         (every? #(or (nil? (get doc %)) (id-like? (get doc %))) ["account" "epoch"])
                         (vector? (get doc "deliveries")))
            (unsealed! kind))
          (doseq [d (get doc "deliveries")] (delivery! kind d)))
      :effects
      (do (when-not (vector? doc) (unsealed! kind)) (doseq [d doc] (delivery! kind d)))
      :ledger-part
      (units! kind (nth m 1) doc)
      :ledger
      (if (map? doc)
        ;; the head of a ledger in parts: content-free, exact
        (do (exact-keys! kind doc ["parts" "event" "chars" "sha" "form"] [])
            (when-not (and (nat? (get doc "parts")) (>= (long (get doc "parts")) 1) (nat? (get doc "event")) (>= (long (get doc "event")) 1)
                           (nat? (get doc "chars")) (hex64? (get doc "sha")) (= "units" (get doc "form")))
              (unsealed! kind)))
        (units! kind (nth m 1) doc))
      :receiver
      (do (exact-keys! kind doc ["g" "e"] [])
          (when-not (nat? (get doc "g")) (unsealed! kind))
          (units! kind (nth m 2) (get doc "e")))
      (when-not (re-matches other-kinds kind) (unsealed! (str kind " (a kind of derived document this gateway does not know)"))))))

(def ^:private document-entity #"notice:v1:([0-9a-f]{64}):(.+)")
(defn- derived-entity? [x] (if (string? x) (str/starts-with? (str/lower-case x) "notice:v1:") false))

(defn check-rows!
  "The write route's part (storage/tx-data, at preparation, called through privacy/derived-check). Every new row of a
  derived document (an entity `notice:v1:...`), and every journal change record of one, on a database that requires
  sealed derived documents: attribute `notice/value`, the entity exactly `notice:v1:<64 lowercase hex>:<kind>`, the kind
  on the list, a content kind of its exact shape (each unit a sealed, placed record of its own subject, or the removed
  marker), and a change record equal to its row; anything else refused (409 DerivedRecordUnsealed). Returns the fence
  [DX-ERA4, second review N7]: a compare-and-set of the setting on the value read here, so a declaration between this
  check and the commit fails the write at the serial point."
  [db rows new-ids]
  (let [fresh (filterv #(contains? new-ids (:id %)) rows)
        by-id (into {} (map (fn [r] [(:id r) r])) fresh)
        changes (keep (fn [r]
                        (when (= ":_tx/change" (:attribute r))
                          (let [c (try (json/read-str (str (or (:value_json r) (:value_string r)))) (catch Exception _ ::bad))]
                            (if (= ::bad c) {:bad r} (when (derived-entity? (get c "entityId")) c)))))
                      fresh)
        docs (filterv #(derived-entity? (:entity_id %)) fresh)
        touched (if (seq docs) true (boolean (seq changes)))
        value (if touched (setting-value db) nil)]
    (when (true? value)
      (doseq [r docs]
        (let [entity (str (:entity_id r)) m (re-matches document-entity entity)]
          (when-not (and m (= "notice/value" (:attribute r))) (unsealed! (str entity " (not a derived document's own form)")))
          (check-document! (nth m 2) (str (:value_string r)))))
      (doseq [c changes]
        (when (:bad c) (unsealed! "an unreadable journal change record"))
        (when (= "assert" (get c "op"))
          (let [row (get by-id (get c "tripleId"))]
            (when-not (and row (= (get c "entityId") (:entity_id row)) (= (get c "attribute") (:attribute row))
                           (= (get-in c ["value" "value"]) (:value_string row)))
              (unsealed! "a journal change record that differs from its row"))))))
    (if (some? value) [[:db/cas (scope/entity db) setting-attr value value]] nil)))
