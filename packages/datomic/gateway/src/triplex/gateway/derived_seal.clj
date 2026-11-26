(ns triplex.gateway.derived-seal
  "[DX-ERA4] TX2_DERIVED_SEAL=1: derived records (recorded notices, ledgers, settled changes, a recipient's records) are
  sealed under a key derived from the keys of the protected assertions they were computed from, so a removal, which
  destroys those assertions' keys, makes every copy unreadable wherever it went (era4/DERIVED-COPIES.md section 3).
  Loaded only when the option is on (main.clj resolves it at call time), so with the option off no stored function text
  or route changes."
  (:require [clojure.data.json :as json] [clojure.string :as str] [datomic.api :as d]
            [triplex.gateway.authority-sql :as sql] [triplex.gateway.envelope :as envelope]
            [triplex.gateway.privacy :as privacy] [triplex.gateway.removal-scope :as removal-scope]
            [triplex.gateway.scope :as scope] [triplex.gateway.storage :as storage] [triplex.gateway.lean :as lean])
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

(defn place-root
  "[DX-ERA4, after the second review's N3, the deep layout] The subject's root entity a place carries:
  `<scope>|<account>|@<root>|<subject>`, the segment before the subject when it starts with @; nil otherwise."
  [^String place]
  (if (string? place)
    (let [parts (str/split place #"\|" -1) n (count parts)]
      (if (>= n 3)
        (let [r (nth parts (- n 2))] (if (str/starts-with? r "@") (let [x (subs r 1)] (if (seq x) x nil)) nil))
        nil))
    nil))
(defn- place-account [^String place]
  (let [parts (str/split place #"\|" -1) n (count parts)]
    (if (place-root place) (if (>= n 4) (nth parts (- n 3)) "") (if (>= n 2) (nth parts (- n 2)) ""))))

;; ---- [DX-ERA4, third review T3 and T4] the declared subject boundary -------------------------------------------------
;; A database declares, once, which entities are a subject's own: the form of the subject ID its derived records name,
;; the subject's one root, and the ID patterns of the entities it owns (`POST /v2/db/<db>/subject-boundary`, one-way). The
;; gateway then finds a place's subject's root itself (from the place's account and the subject's number), checks the
;; root's own rows, and takes every protected value on the root and on every entity matching an own pattern (one index
;; read per pattern), instead of walking references (the second review's rule, which reached other subjects and shared
;; entities and missed entities that point at the subject). Every protected value written into a database with a
;; boundary must be on an entity the boundary gives to exactly one subject, or the write is refused, so no protected
;; value lies outside every subject's set. Without a declaration the W0 rule applies exactly as before: the subject's
;; entity and the entities named under it, for any subject ID.
(def ^:private boundary-attr :triplex.scope/subject-boundary)
(def ^:private literal #"[A-Za-z0-9_:./-]*")
(defn- pattern-parts
  "A pattern's literal pieces and its slots, in order: `{n}` the subject's 8-digit number, `{account}` the account, and a
  trailing `*` (only at the end, after `/` or `:`) any further characters."
  [^String p]
  (let [star (str/ends-with? p "*") body (if star (subs p 0 (dec (count p))) p)
        pieces (str/split body #"\{n\}|\{account\}" -1)
        slots (mapv second (re-seq #"\{(n|account)\}" body))]
    {:star star :pieces pieces :slots slots :body body}))
(defn- pattern-ok? [^String p account?]
  (if (if (string? p) (<= 1 (count p) 128) false)
    (let [{:keys [star pieces slots body]} (pattern-parts p)]
      (and (every? #(some? (re-matches literal %)) pieces)
           (= 1 (count (filter #{"n"} slots)))
           (= (if account? 1 0) (count (filter #{"account"} slots)))
           (if star (contains? #{\/ \:} (last body)) true)))
    false))
(defn- pattern-re [^String p]
  (let [{:keys [star pieces slots]} (pattern-parts p)
        q (fn [x] (java.util.regex.Pattern/quote x))
        groups {"n" "(?<n>[0-9]{8})" "account" "(?<account>[A-Za-z0-9_.-]{1,64})"}]
    (re-pattern (str (apply str (interleave (map q pieces) (concat (map groups slots) [""])))
                     (if star ".+" "")))))
(defn- instantiate [^String p account n]
  (-> (pattern-parts p) :body (str/replace "{n}" n) (str/replace "{account}" (or account ""))))
(defn- valid-boundary? [b]
  (if (map? b)
    (let [account? (str/includes? (str (get b "root")) "{account}")]
      (and (every? #{"v" "subject" "root" "rootRows" "own"} (keys b)) (= 1 (get b "v"))
           (pattern-ok? (get b "subject") false) (not (str/ends-with? (str (get b "subject")) "*"))
           (pattern-ok? (get b "root") account?) (not (str/ends-with? (str (get b "root")) "*"))
           (boolean? (get b "rootRows"))
           (vector? (get b "own")) (<= (count (get b "own")) 64) (every? #(pattern-ok? % account?) (get b "own"))))
    false))
(def ^:private compiled (atom {}))
(defn- compile-boundary [b]
  (or (get @compiled b)
      (let [c {:b b :account? (str/includes? (get b "root") "{account}") :subject (pattern-re (get b "subject"))
               :owners (mapv pattern-re (cons (get b "root") (get b "own")))}]
        (swap! compiled assoc b c) c)))
(defn declared-boundary
  "The database's declared subject boundary, or nil."
  [db]
  (if (d/entid db boundary-attr)
    (let [v (:v (first (d/datoms db :eavt (scope/entity db) boundary-attr)))]
      (if (string? v) (json/read-str v) nil))
    nil))
(defn- boundary [db] (let [b (declared-boundary db)] (if b (compile-boundary b) nil)))
(defn- owner-of
  "[account number] of the subject the boundary gives entity `e` to, or nil."
  [c ^String e]
  (some (fn [re] (when-let [m (re-matcher re e)]
                   (when (.matches m) [(if (:account? c) (.group m "account") nil) (.group m "n")])))
        (:owners c)))
(defn declare-boundary!
  "`POST /v2/db/<db>/subject-boundary`: declares the boundary once (the same value again answers as before; another is
  refused 409). It must come before the subject's protected values are written: a value written earlier is not checked."
  [conn input]
  (when-not (valid-boundary? input)
    (invalid! "Expected {v: 1, subject, root, rootRows, own: [...]}: patterns of [A-Za-z0-9_:./-], one {n} each, {account} in all or none, a trailing * after / or :"))
  (let [db (d/db conn) text (json/write-str input) head (scope/entity db)
        current (declared-boundary db)]
    (cond
      (= current input) {:declared true :changed false}
      (some? current) (privacy/failure! 409 "SubjectBoundaryDeclared" "This database already declared another subject boundary")
      :else
      (do (when-not (d/entid db boundary-attr)
            @(d/transact conn [{:db/ident boundary-attr :db/valueType :db.type/string :db/cardinality :db.cardinality/one}]))
          (try @(d/transact conn [[:db/cas head boundary-attr nil text]])
               (catch Exception _
                 (when-not (= input (declared-boundary (d/db conn)))
                   (privacy/failure! 409 "SubjectBoundaryDeclared" "This database already declared another subject boundary"))))
          {:declared true :changed true}))))

(defn- live-rows [db ^String entity]
  (if-let [eid (d/entid db [:triplex.entity/id entity])]
    (map #(lean/decode (:v %)) (lean/live-texts db eid))
    []))
(defn- subject-root!
  "The place's subject's one root, found from the boundary (the place's @root, if it carries one, must be that root);
  with `rootRows`, the root must exist and carry exactly the subject's number and the place's account."
  [db c ^String subject ^String account ^String carried]
  (let [m (re-matcher (:subject c) (str subject))
        n (if (.matches m) (.group m "n") (invalid! "The place's subject is not of the declared subject form"))
        b (:b c)
        _ (when (if (:account? c) (not (re-matches #"[A-Za-z0-9_.-]{1,64}" (str account))) false)
            (invalid! "The place names no account of the declared form"))
        root (instantiate (get b "root") account n)]
    (when (if (some? carried) (not= carried root) false)
      (invalid! "The place's subject root is not the subject's root (the database's subject boundary names another)"))
    (when (get b "rootRows")
      (when-not (lean/enabled? db) (invalid! "A subject boundary with root rows needs the lean layout"))
      (let [rows (live-rows db root)
            one (fn [a] (vec (distinct (keep #(when (= a (:attribute %)) (:value_string %)) rows))))]
        (when-not (and (= [(str (Long/parseLong n))] (one ":subject/member"))
                       (= [account] (one ":subject/account")))
          (invalid! "The place's subject has no root of its number and account (its :subject/member and :subject/account rows)"))))
    [root n]))

;; [DX-ERA4, second review N3; third review T3 and T4] The gateway chooses the keys: every protected assertion on the
;; place's subject's own entities by the boundary (its root and every entity of an own pattern), current or superseded,
;; that is not removed; plus whatever else the writer names. One index read per pattern per subject per call.
(def ^:dynamic ^:private *subjects* nil)
(defn- subject-protected
  ([db cut subject] (subject-protected db cut subject nil nil))
  ([db cut subject carried account]
  (if (nil? subject)
    []
    (let [c (boundary db)
          look (fn []
                 (let [native (native-erased db cut)
                       datoms (if c
                                (let [[_ n] (subject-root! db c subject account carried) b (:b c)]
                                  (mapcat (fn [p]
                                            (let [x (instantiate p account n)]
                                              (if (str/ends-with? p "*")
                                                (d/index-range db :triplex.private/entity x (str x "￿"))
                                                (d/datoms db :avet :triplex.private/entity x))))
                                          (cons (get b "root") (get b "own"))))
                                ;; no declared boundary: the W0 rule, the subject's entity and the entities named under
                                ;; it (a place carrying a root needs a declared boundary)
                                (do (when (some? carried) (invalid! "A place with a subject root needs the database's declared subject boundary"))
                                    (concat (d/datoms db :avet :triplex.private/entity subject)
                                            (d/index-range db :triplex.private/entity (str subject "/") (str subject "/￿")))))]
                   (vec (sort (distinct
                                (for [x datoms
                                      :let [id (scope/value db (:e x) :triplex.private/id)]
                                      :when (string? id)
                                      :when (not (contains? (:erased cut) id))
                                      :when (not (contains? native id))]
                                  id))))))
          k [subject carried account]
          cache *subjects*]
      (if cache (or (get @cache k) (let [r (look)] (swap! cache assoc k r) r)) (look))))))

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
                                               (if place (subject-protected db cut (place-subject place) (place-root place) (place-account place)) [])))))
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

;; [DX-ERA4, after DX-ERA5's M2 and B2; second review N5; third review T5] The key re-sweep: every removal's keys
;; deleted again, so a key restored from an older copy of the authority goes again without a restart. The removals are
;; the ones committed in the data: each removal's record on its transaction (`:triplex.tx/erasure-record`), read in
;; transaction order from the :aevt index. That is every removal, published or still pending: a removal commits in the
;; data before it is published, in sequence order (its `:db/cas` moves the scope's removal sequence from seq - 1 to
;; seq), so a log put back to an older copy, or a pending removal, is still in the data. Bounded in memory and time per
;; pass, whatever the number of removals: per database the state is two positions in that index, `:due` (the first
;; record not yet taken as new) and `:rot` (where the rotation stands); a pass reads at most `resweep-new` records from
;; `:due` (the new ones, once due: older than the shred grace) and `resweep-rot` from `:rot` (wrapping once at the
;; end), and checks their identities' keys, at most 512 per query. Nothing else is held between passes. A restored key
;; is therefore deleted within ceil(removals / resweep-rot) + 1 passes, and new removals arriving at up to
;; `resweep-new` per pass do not delay that (they have their own budget). Every failure is counted and logged
;; (failures/note!, `:removalFailures "resweep"`), never dropped.
(def ^:private resweep-ms 1000)
(def ^:private resweep-new 4096)
(def ^:private resweep-rot 4096)
(defonce ^:private resweep-state (atom {}))
(defn- note! [where name e] ((requiring-resolve 'triplex.gateway.failures/note!) where name e))
(defn- record-datoms
  "Up to `n` erasure-record datoms of `db` from entity `from` (inclusive) in transaction order, lazily from the index."
  [db from n]
  (if-let [a (d/entid db :triplex.tx/erasure-record)]
    (into [] (comp (take-while #(= (:a %) a)) (take n))
          (d/seek-datoms db :aevt a (long (or from 0))))
    []))
(defn- present-keys [name identities]
  (if sql/url
    (let [by-handle (into {} (keep (fn [i] (when-let [h (get i "keyHandle")] [h i])) identities))
          found (when (seq by-handle)
                  (reduce into #{}
                          (for [part (partition-all 512 (keys by-handle))]
                            (#'sql/with-session
                              (fn [c] (#'sql/select! c "SELECT id FROM triplex_removal.keys WHERE scope=? AND id = ANY(?)"
                                                     [name (.createArrayOf ^java.sql.Connection c "text" (to-array part))]
                                                     (fn [^java.sql.ResultSet rs]
                                                       (loop [out #{}] (if (.next rs) (recur (conj out (.getString rs 1))) out)))))))))]
      (filterv #(contains? found (get % "keyHandle")) (vals by-handle)))
    (filterv (fn [i] (envelope/key-present? name (get i "assertionId") (get i "keyHandle"))) identities)))
(defn resweep-one!
  "One pass over database `name`: the new records once due and the next stretch of the rotation; their keys still
  present are deleted. Returns the pass's counts."
  [name db]
  (let [cutoff (- (System/currentTimeMillis) envelope/grace-ms)
        due? (fn [e] (let [at (get e "erasedAt")] (if (number? at) (<= at cutoff) false)))
        cut (privacy/cut name nil true)]
    (when (:sealed cut)
      (let [{:keys [due rot]} (get @resweep-state name)
            rot (long (or rot 0))
            parse (fn [x] (assoc (json/read-str (:v x)) ::e (:e x)))
            ;; the new records, in order, while due (the first one not due ends them for this pass)
            taken (into [] (take-while due?) (map parse (record-datoms db due resweep-new)))
            due' (if (seq taken) (inc (long (::e (peek taken)))) due)
            ;; the rotation: the next stretch from `rot`, then (when it reaches the end) from the start up to `rot`
            tail (mapv parse (record-datoms db rot resweep-rot))
            head (if (and (< (count tail) resweep-rot) (pos? rot))
                   (into [] (comp (take-while #(< (long (:e %)) rot)) (map parse))
                         (record-datoms db 0 (- resweep-rot (count tail))))
                   [])
            stretch (into tail head)
            rot' (cond (seq head) (inc (long (::e (peek head))))
                       (< (count tail) resweep-rot) 0
                       :else (inc (long (::e (peek tail)))))
            rotation (filterv due? stretch)
            check (vec (distinct (mapcat #(get % "identities") (concat taken rotation))))
            present (present-keys name check)]
        (swap! resweep-state assoc name {:due due' :rot rot'})
        (when (seq present)
          (envelope/erase-keys! name present)
          ((requiring-resolve 'triplex.gateway.stats/bump!) [:derivedResweep :deleted] (count present)))
        {:new (count taken) :rotation (count stretch) :checked (count check) :deleted (count present)}))))
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
;; [DX-ERA4, third review T7] the fixed forms of the identifier fields, so a value cannot ride in one: a removed marker
;; names assertions (the store's assertion IDs: 26 characters of Crockford base32, as `ulidx` makes them and the deep
;; loader's hashes are), a packet's account is its journal's document prefix, an epoch a hash, an ID or "uninitialized",
;; and a subject is of the database's declared subject form (with a boundary) or W0's placement form `pl:...`
(def ^:private assertion-id #"[0-9A-HJKMNP-TV-Z]{26}")
(defn- assertion-id? [x] (if (string? x) (some? (re-matches assertion-id x)) false))
(def ^:dynamic ^:private *subject-form* #"pl:[A-Za-z0-9._-]{1,64}")
(defn- subject-form? [x] (if (string? x) (if (<= (count x) 128) (.matches (re-matcher *subject-form* x)) false) false))
(defn- removed-marker? [x]
  (if (map? x)
    (and (every? #{"removed" "seq"} (keys x)) (vector? (get x "removed")) (<= (count (get x "removed")) max-items)
         (every? assertion-id? (get x "removed"))
         (or (nil? (get x "seq")) (nat? (get x "seq"))))
    false))
(def ^:dynamic ^:private *account*
  "[DX-ERA4, third review T3] the account a derived write declares (`derivedAccount`) when the database's boundary has
  accounts: every unit's place must name it; ::missing when the write names none."
  nil)
(defn- unit!
  "A content unit: a sealed record for `subject` (its place names it, and the write's account) or the removed marker."
  [what subject x]
  (if (removed-marker? x)
    nil
    (let [h (sealed-header x)]
      (when-not h (unsealed! what))
      (when-not (= subject (place-subject (get h "p"))) (unsealed! (str what " (a record of another subject)")))
      (when (some? *account*)
        (when (= ::missing *account*) (unsealed! (str what " (the write names no account: derivedAccount)")))
        (when-not (= *account* (place-account (get h "p")))
          (unsealed! (str what " (a record placed in another account than the document's)")))))))
(defn- exact-keys! [what m required optional]
  (when-not (and (map? m) (every? #(contains? m %) required) (every? (into (set required) optional) (keys m)))
    (unsealed! what)))
(defn- delivery! [what d]
  (exact-keys! what d ["subject" "generation" "sealed"] [])
  (when-not (and (id-like? (get d "subject")) (nat? (get d "generation"))) (unsealed! what))
  ;; [T7] a sealed unit binds the subject (its place names it); a removed marker does not, so the subject is of the form
  (when (removed-marker? (get d "sealed"))
    (when-not (subject-form? (get d "subject")) (unsealed! (str what " (a subject not of the subject form)"))))
  (unit! what (get d "subject") (get d "sealed")))
(defn- units! [what subject v]
  (when-not (vector? v) (unsealed! what))
  (doseq [x v] (unit! what subject x)))

;; Every kind of derived document the option's writers store (second review K: 19 kinds on the held path, plus the
;; ledger's parts and generations). Under the setting a kind not on this list is refused. Content kinds are checked to
;; their exact shape. [DX-ERA4, third review T7] The others (content-free: counters, cursors, hashes, IDs, instants and
;; release documents) are checked to their exact form too (`free-kinds`): the key's own parts (hashes, subjects,
;; numbers) and the document's keys and the form of every field, so a value cannot ride in one; what stays unchecked is
;; named there (a release document, a packed join index).
(def ^:private subject-key "(pl:[A-Za-z0-9._-]{1,64})")
(def ^:private content-kinds
  [[#"answer:([0-9]+):f([0-9]+)" :page]
   [#"recorded-notices:([0-9]+)" :packet]
   [(re-pattern (str "recorded-ledger-part:" subject-key ":([0-9]+):([0-9]+)")) :ledger-part]
   [(re-pattern (str "recorded-ledger:" subject-key)) :ledger]
   [(re-pattern (str "receiver:([0-9a-f]{64}):" subject-key)) :receiver]
   [#"effects:([0-9a-f]{64}):([0-9]+)" :effects]
   ;; [DX-ERA4, third review T1] the work items a subject holds that read a removable value, kept in clear so the owner's
   ;; rule (a removed value keeps its notice) survives the removal: ids only, of exact form, sorted and distinct
   [(re-pattern (str "recorded-kept:" subject-key)) :kept]
   ;; [DX-ERA4, third review T2] the Publish builder's retired-item archive (DX-ACT8, fourth review Z4): one row per retired
   ;; item, its ID, subject and sequence only, of exact form; and a subject's named stop (the recorder or the settlement
   ;; went past it): the event or release sequence and one code of a fixed list
   [(re-pattern (str "recorded-retired:" subject-key ":(wi:[0-9a-f]{64})")) :retired]
   [(re-pattern (str "recorded-stopped:" subject-key)) :stopped]
   [(re-pattern (str "settled-stopped:([0-9]+):" subject-key)) :stopped]])
(def ^:private stop-codes #{"LedgerFull" "EvaluationFailed" "SealRefused" "FrameTooLarge"})

;; ---- [DX-ERA4, third review T7] the content-free kinds' exact forms -------------------------------------------------
(def ^:private instant-re #"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z")
(def ^:private prefix-re #"notice:v1:[0-9a-f]{64}:")
(def ^:private token-re #"[A-Za-z0-9_.:/|+=-]{1,128}")
(defn- form?
  "Whether `x` is of form `f`: :nat, :bool, :hex (64 lowercase hex), :instant (W0's microsecond instant), :subject,
  :epoch (a hash, an assertion ID or \"uninitialized\"), :prefix (a journal's document prefix), :token (at most 128
  characters of [A-Za-z0-9_.:/|+=-]), :name (a string of at most 256 characters: a release's name), :packed (base64 text
  of a packed document, not decoded here), :opaque (not checked: named where used); or [:is v], [:one-of set],
  [:nil-or f], [:or f...], [:vec f], [:map required optional] (exact keys, each to its form)."
  [f x]
  (cond
    (= f :nat) (nat? x)
    (= f :bool) (boolean? x)
    (= f :hex) (hex64? x)
    (= f :instant) (if (string? x) (some? (re-matches instant-re x)) false)
    (= f :subject) (subject-form? x)
    (= f :epoch) (if (string? x) (if (hex64? x) true (if (assertion-id? x) true (= "uninitialized" x))) false)
    (= f :prefix) (if (string? x) (some? (re-matches prefix-re x)) false)
    (= f :token) (if (string? x) (some? (re-matches token-re x)) false)
    (= f :name) (if (string? x) (<= 1 (count x) 256) false)
    (= f :packed) (if (string? x) (some? (re-matches #"[A-Za-z0-9_=+/-]*" x)) false)
    (= f :opaque) true
    (vector? f)
    (let [[t a b] f]
      (case t
        :is (= a x)
        :one-of (contains? a x)
        :nil-or (if (nil? x) true (form? a x))
        :or (boolean (some #(form? % x) (rest f)))
        :vec (if (vector? x) (if (<= (count x) 100000) (every? #(form? a %) x) false) false)
        :map (if (map? x)
               (if (every? #(contains? x %) (keys a))
                 (every? (fn [[k v]] (let [g (if (contains? a k) (get a k) (get b k ::none))]
                                       (if (= ::none g) false (form? g v))))
                         x)
                 false)
               false)))
    :else false))
(def ^:private census-form [:map {"id" :hex "count" :nat "members" :hex} {}])
(def ^:private recorder-cursor
  [:map {"epoch" :epoch "event" :nat "start" :nat "parent" :hex "batch" :nat "previous" :hex "entries" :nat}
   {"erasureSeq" :nat "frames" [:is "bytes"] "part" :nat "ledger" [:is "parts"]}])
(def ^:private selection-form
  [:or [:map {"kind" [:is "census"]} {}] [:map {"kind" [:is "subjects"] "ids" [:vec :subject]} {}]])
;; notify1/journal.ts Recipe: `document` is the release document (the business's rules, not a subject's value) or
;; null, and `documentRef` names one; neither is walked
(def ^:private recipe-form
  [:map {"version" [:is 1] "account" :prefix "epoch" :epoch "sequence" :nat "parent" :hex "old" [:nil-or :name]
         "next" :name "oldHash" [:nil-or :token] "nextHash" :token "document" :opaque "from" :instant "validTime" :instant
         "request" :token "kind" :token "census" census-form "selection" selection-form "inputs" :token "evaluator" :token
         "sourceBefore" :nat}
   {"ownerProof" :token "definition" :nat "documentRef" :opaque}])
(def ^:private tail-form
  [:map {"epoch" :epoch "census" census-form "sequence" :nat "parent" :hex "release" [:nil-or :name] "from" :instant
         "validTime" :instant "inputs" :token "evaluator" :token}
   {"recipient" [:map {"sink" :token "identity" :token} {}] "custom" [:map {"hash" :token "definition" :nat} {}]}])
;; [DX-ERA4, second review N4] the review's census (forms.ts K), plus what T1 writes after a removal (the join index's
;; leaves and its invalidation marker) and the settlement control document. These hold no value of the current
;; protection policy (document types and expiry dates); the join index's postings hold values of the indexed rules'
;; inputs (pay, location, status), so a policy that protects one of those makes this list wrong (14.4): the packed
;; index is the one part not checked here.
(def ^:private free-kinds
  [[#"notice-progress" recorder-cursor]
   [#"recorded-cursor" recorder-cursor]
   [#"values:[0-9]+" [:map {"identity" :token "through" :nat "status" [:one-of #{"pending" "stored" "superseded"}]
                            "hash" :token "changes" :nat}
                      {"frames" [:is "bytes"] "frame" :nat "part" :nat}]]
   [#"claim:[0-9a-f]{64}" :hex]
   [#"census:[0-9a-f]{64}" census-form]
   [#"members:[0-9a-f]{64}:[0-9]+" [:map {"members" [:vec :subject] "ordinal" :nat "census" :hex} {}]]
   [#"join-meta" [:map {"epoch" :epoch "census" census-form "valid" :instant "source" :nat "compiler" :hex "scheduled" :bool}
                  {"expanded" :bool}]]
   ;; the account's due instants: release dates and fact validity ends only (under the option the writer keeps no day
   ;; derived from a document's date here, actv-lazy/join/account.ts `calendarDays`)
   [#"join-calendar" [:vec :instant]]
   [(re-pattern (str "join-member:" subject-key)) :nat]
   [#"join-index-base:[0-9]+" [:map {"packed" :packed "sum" :hex} {}]]
   [#"join-index:[0-9]+" [:map {"base" :nat "digest" :hex "patch" :packed} {}]]
   [#"join-invalid" [:map {"source" :nat "compiler" :hex} {}]]
   [#"control" [:map {"paused" :bool "paceMs" [:nil-or :nat] "by" :token "version" :nat} {}]]
   [#"event:[0-9]+" recipe-form]
   [#"tail" tail-form]
   [#"erasure" :nat]
   [#"received:[0-9a-f]{64}" [:map {"batch" :nat "digest" :hex} {}]]
   [#"effect-erasure:[0-9a-f]{64}:[0-9]+" :nat]
   [(re-pattern (str "recorded-generation:" subject-key)) :nat]
   [#"cursor" [:map {"event" :nat "start" :nat "parent" :hex "batch" :nat "previous" :hex} {"pending" [:nil-or :token]}]]
   [#"settled-values:[0-9a-f]{64}" :token]
   [#"settled-notice:[0-9a-f]{64}" :token]])
(defn- check-free!
  "A content-free kind: its key of exact form and its document of the kind's form; true when the kind is one."
  [kind text]
  (let [f (some (fn [[re f]] (when (re-matches re kind) f)) free-kinds)]
    (if (some? f)
      (let [doc (try (json/read-str text) (catch Exception _ ::bad))]
        (when-not (if (= ::bad doc) false (form? f doc))
          (unsealed! (str kind " (not of its kind's form)")))
        true)
      false)))

(defn- check-document!
  "One derived document of kind `kind` whose stored text is `text`: a content kind decoded and checked to its exact
  shape; a content-free kind checked to its exact form (`free-kinds`, read as JSON: a claim, for one, is a bare hash);
  any other kind refused."
  [kind text]
  (let [[m tag] (some (fn [[re tag]] (when-let [m (re-matches re kind)] [m tag])) content-kinds)
        doc (if tag (try (document text) (catch Exception _ (unsealed! (str kind " (undecodable)")))) nil)]
    ;; [T7] a kind's key names its subject in the subject form (the declared one, with a boundary)
    (when (if tag (not (#{:page :packet :effects} tag)) false)
      (when-not (subject-form? (if (if (= :receiver tag) true (str/starts-with? kind "settled-stopped:")) (nth m 2) (nth m 1)))
        (unsealed! (str kind " (a subject not of the subject form)"))))
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
            (when (some? (second u)) (unit! kind (get e "subject") (second u))))
          ;; [T7] a sealed unit binds the entry's subject (its place names it); an entry with none names it in the form
          (when-not (some #(if (some? (second %)) (not (removed-marker? (second %))) false) (get e "changes"))
            (when-not (subject-form? (get e "subject")) (unsealed! (str kind " (an entry's subject not of the subject form)"))))))
      :packet
      (do (exact-keys! kind doc ["deliveries"] ["account" "epoch" "batch" "previous" "event" "position" "recipe" "start"
                                                 "through" "part" "tail" "erasureSeq"])
          (when-not (and (every? #(or (nil? (get doc %)) (nat? (get doc %))) ["batch" "event" "position" "start" "through" "part" "tail" "erasureSeq"])
                         (every? #(or (nil? (get doc %)) (hex64? (get doc %))) ["previous" "recipe"])
                         ;; [T7] the journal's document prefix and its epoch, of fixed form
                         (or (nil? (get doc "account")) (form? :prefix (get doc "account")))
                         (or (nil? (get doc "epoch")) (form? :epoch (get doc "epoch")))
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
      :kept
      (when-not (and (vector? doc) (<= (count doc) max-items)
                     (every? #(if (string? %) (some? (re-matches #"wi:[0-9a-f]{64}" %)) false) doc)
                     (= doc (vec (sort (distinct doc)))))
        (unsealed! kind))
      :retired
      (do (exact-keys! kind doc ["id" "retired" "seq" "subject"] [])
          (when-not (and (= (nth m 2) (get doc "id")) (= (nth m 1) (get doc "subject")) (true? (get doc "retired"))
                         (nat? (get doc "seq")) (>= (long (get doc "seq")) 1))
            (unsealed! kind)))
      :stopped
      (do (exact-keys! kind doc ["at" "code"] [])
          (when-not (and (nat? (get doc "at")) (contains? stop-codes (get doc "code"))) (unsealed! kind)))
      :receiver
      (do (exact-keys! kind doc ["g" "e"] [])
          (when-not (nat? (get doc "g")) (unsealed! kind))
          (units! kind (nth m 2) (get doc "e")))
      (when-not (check-free! kind text) (unsealed! (str kind " (a kind of derived document this gateway does not know)"))))))

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
  [db rows new-ids input]
  (let [fresh (filterv #(contains? new-ids (:id %)) rows)
        ;; [DX-ERA4, third review T4] with a declared boundary every protected value written is on an entity it gives to
        ;; a subject: none lies outside every subject's set (a shared entity, or one that only refers to a subject)
        attrs (:attrs privacy/*cut*)
        protected-rows (if (seq attrs) (filterv #(contains? attrs (:attribute %)) fresh) [])
        declared (if (seq protected-rows) (declared-boundary db) nil)
        _ (when declared
            (let [c (compile-boundary declared)]
              (doseq [r protected-rows]
                (when-not (owner-of c (str (:entity_id r)))
                  ;; :write-policy: passed through the write path as typed (as unsealed!)
                  (throw (ex-info (str "A protected value of " (:attribute r) " on an entity the database's subject boundary gives to no subject")
                                  {:status 409 :code "ProtectedValueOutsideSubject" :write-policy true}))))))
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
      ;; [DX-ERA4, fourth round] a staged preview (storage/read-db: a derived writer's transaction reading its own staged
      ;; documents) stores nothing and carries no `derivedAccount`; its units are bound to the account when it commits.
      ;; The mark is a keyword key, which no client's JSON input can carry.
      (binding [*account* (let [b (declared-boundary db)]
                            (if (if b (if (get input :triplex.gateway.storage/preview) false (str/includes? (str (get b "root")) "{account}")) false)
                              (let [a (get input "derivedAccount")]
                                (if (if (string? a) (some? (re-matches #"[A-Za-z0-9_.-]{1,64}" a)) false) a ::missing))
                              nil))
                ;; [T7] with a declared boundary a subject is of its declared form (`pl:s{n}`), else W0's placement form
                *subject-form* (let [b (declared-boundary db)] (if b (:subject (compile-boundary b)) *subject-form*))]
        (doseq [r docs]
          (let [entity (str (:entity_id r)) m (re-matches document-entity entity)]
            (when-not (and m (= "notice/value" (:attribute r))) (unsealed! (str entity " (not a derived document's own form)")))
            (check-document! (nth m 2) (str (:value_string r))))))
      (doseq [c changes]
        (when (:bad c) (unsealed! "an unreadable journal change record"))
        (when (= "assert" (get c "op"))
          (let [row (get by-id (get c "tripleId"))]
            (when-not (and row (= (get c "entityId") (:entity_id row)) (= (get c "attribute") (:attribute row))
                           (= (get-in c ["value" "value"]) (:value_string row)))
              (unsealed! "a journal change record that differs from its row"))))))
    (if (some? value) [[:db/cas (scope/entity db) setting-attr value value]] nil)))
