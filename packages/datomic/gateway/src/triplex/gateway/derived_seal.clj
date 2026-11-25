(ns triplex.gateway.derived-seal
  "[DX-ERA4] TX2_DERIVED_SEAL=1: derived records (recorded notices, ledgers, settled changes, a recipient's records) are
  sealed under a key derived from the keys of the protected assertions they were computed from, so a removal, which
  destroys those assertions' keys, makes every copy unreadable wherever it went (era4/DERIVED-COPIES.md section 3).
  Loaded only when the option is on (main.clj resolves it at call time), so with the option off no stored function text
  or route changes."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.scope :as scope])
  (:import [java.nio.charset StandardCharsets]
           [java.nio.file Files]
           [java.util Arrays Base64]
           [javax.crypto Cipher Mac]
           [javax.crypto.spec GCMParameterSpec SecretKeySpec]))

(def ^:private max-items 1024)
(def ^:private max-ids 512)
(def ^:private prefix "tdx1.")

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

(defn- assertion-key
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

(defn- with-key
  "Calls (f key) with the derived key of `ids`, or returns {\"removed\" ids...} when one of them is removed in the
  published cut or its key is gone."
  [name db cut ids f]
  (let [erased (filterv #(contains? (:erased cut) %) ids)]
    (if (seq erased)
      {"removed" erased "seq" (removal-seq cut erased)}
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

(defn- seal-one [name db cut {:strs [ids value]}]
  (when-not (and (vector? ids) (<= (count ids) max-ids) (every? #(and (string? %) (<= 1 (count %) 256)) ids)
                 (string? value) (<= (count value) 4000000))
    (invalid! "Each item needs ids (at most 512 assertion IDs) and a string value"))
  ;; Only the protected assertions count; the client sends every string row it read (section 3.2).
  (let [protected (vec (sort (distinct (filter #(protected-eid db %) ids))))]
    (if (empty? protected)
      {"clear" true}
      (with-key name db cut protected
        (fn [k]
          (let [header (b64 (utf8 (json/write-str {"d" name "k" protected})))
                clear (utf8 value)
                nonce (Arrays/copyOf (hmac k (byte-array (concat (seq (utf8 header)) [(byte 0)] (seq clear)))) 12)
                body (gcm Cipher/ENCRYPT_MODE k nonce (utf8 header) clear)]
            {"sealed" (str prefix header "." (b64 nonce) "." (b64 body))}))))))

(defn header-of
  "The clear header of a sealed record: {\"d\" database, \"k\" assertion IDs}."
  [^String wire]
  (when-not (and (string? wire) (str/starts-with? wire prefix)) (invalid! "Not a sealed derived record"))
  (let [parts (str/split (subs wire (count prefix)) #"\." 4)]
    (when-not (= 3 (count parts)) (invalid! "Malformed sealed derived record"))
    (let [h (try (json/read-str (String. (unb64 (first parts)) StandardCharsets/UTF_8)) (catch Exception _ nil))]
      (when-not (and (map? h) (string? (get h "d")) (vector? (get h "k")) (seq (get h "k"))
                     (every? string? (get h "k")) (= (get h "k") (vec (sort (distinct (get h "k"))))))
        (invalid! "Malformed sealed derived record header"))
      [h parts])))

(defn- open-one [name db cut wire]
  (let [[h [header nonce body]] (header-of wire)]
    (when-not (= name (get h "d")) (invalid! "A sealed derived record is opened by the database that sealed it"))
    (when-not (every? #(protected-eid db %) (get h "k")) (invalid! "A sealed record names an unknown assertion"))
    (with-key name db cut (get h "k")
      (fn [k]
        (let [clear (try (gcm Cipher/DECRYPT_MODE k (unb64 nonce) (utf8 header) (unb64 body))
                         (catch Exception _ (privacy/failure! 409 "DerivedRecordInvalid" "The sealed record does not open")))]
          {"value" (String. ^bytes clear StandardCharsets/UTF_8)})))))

(defn handle!
  "POST /v2/db/{db}/derived-seal {items: [{ids, value}]} and derived-open {items: [sealed]}, under the request's
  published cut (a read of any basis after the removal's publication answers removed, TARGETS 7.1)."
  [name db cut action input]
  (sealed-scope! cut)
  (let [items (get input "items")]
    (when-not (and (map? input) (= #{"items"} (set (keys input))) (vector? items) (<= 1 (count items) max-items))
      (invalid! "Expected {items: [...]} with 1 to 1024 items"))
    {:items (if (= action "derived-seal")
              (mapv #(seal-one name db cut %) items)
              (mapv #(open-one name db cut %) items))}))

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
