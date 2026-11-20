(ns triplex.compact.store
  (:require [clojure.data.json :as json]
            [clojure.edn :as edn]
            [clojure.string :as str]
            [datomic.api :as d]
            [triplex.compact.journal-rows :as journal])
  (:import [java.nio.charset StandardCharsets]
           [java.security MessageDigest SecureRandom]
           [java.time Instant LocalDate]
           [java.util Arrays Base64 HexFormat LinkedHashMap UUID]
           [javax.crypto Cipher]
           [javax.crypto.spec GCMParameterSpec SecretKeySpec]))

(def max-position 9007199254740991)
(def first-valid "2000-01-01T00:00:00.000000Z")
(defn reject [code] (throw (ex-info (name code) {:code code})))
(defn require! [condition code] (when-not condition (reject code)))
(defn bytes-of [^String s] (.getBytes s StandardCharsets/UTF_8))
(defn utf8 [s] (alength (bytes-of s)))
(defn canonical [x] (json/write-str x :escape-slash false))
(defn sha [s] (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") (bytes-of s))))
(defn compound [account id] (str account "|" id))
(defn position-key [account p]
  (let [s (str p)] (compound account (str (subs "0000000000000000" (count s)) s))))
(defn position-of [^String s] (Long/parseLong (subs s (inc (.indexOf s "|")))))
(defn component [^String s] (subs s (inc (.indexOf s "|"))))
(defn value [db eid attr]
  (when eid (:v (first (d/datoms db :eavt eid attr)))))
(defn lookup [db attr v] (d/entid db [attr v]))
(defn head [db eid] (value db eid :compact/head))
(defn position [db eid] (if eid (position-of (value db eid :compact/position)) 0))

(defn attr [ident type & [unique]]
  (cond-> {:db/ident ident :db/valueType type :db/cardinality :db.cardinality/one}
    unique (assoc :db/unique unique)))
(def schema
  [(attr :compact/account :db.type/string :db.unique/identity)
   (attr :compact/epoch :db.type/long)
   (attr :compact/source :db.type/string)
   (attr :compact/subject :db.type/string :db.unique/identity)
   (attr :compact/head :db.type/ref)
   (attr :compact/erased :db.type/long)
   (attr :compact/command :db.type/string :db.unique/value)
   (attr :compact/position :db.type/string :db.unique/value)
   (attr :compact/subject-ref :db.type/ref)
   (attr :compact/previous :db.type/ref)
   (attr :compact/recorded :db.type/long)
   (attr :compact/body :db.type/string)
   {:db/ident :compact/append-v1
    :db/fn (d/function '{:lang "clojure" :params [db requests]
                        :requires [[triplex.compact.store :as compact]]
                        :code (compact/append-data db requests)})}])

(defn account-id [db account] (lookup db :compact/account account))
(defn subject-id [db account root] (lookup db :compact/subject (compound account root)))

(defn append-data [db requests]
  ;; [DX-COMPACT1] Why: a single function assigns each account's next position at the serial predecessor.
  ;; Rejected: composing one function invocation per member (each would see the same db-before).
  (let [wall (* 1000 (System/currentTimeMillis))
        accounts (volatile! {}) subjects (volatile! {})
        claims (volatile! #{}) ops (transient [])]
    (doseq [[idx {:keys [account root command expected body kind expected-account protected journal-rows]}] (map-indexed vector requests)]
      (let [command-key (compound account command)]
        (when-not (or (@claims command-key) (lookup db :compact/command command-key))
          (let [a (or (@accounts account)
                      (let [acct (account-id db account) prior-account (head db acct)]
                        {:eid acct :p (position db prior-account) :clock (or (value db prior-account :compact/recorded) 0)}))
                subject-key (compound account root)
                prior (or (@subjects subject-key)
                          (let [original (subject-id db account root) prior-subject (head db original)]
                            {:p (position db prior-subject) :eid original :previous prior-subject
                             :erased (value db original :compact/erased)}))]
            (when (and (:eid a) (= expected (:p prior))
                       (or (nil? expected-account) (= expected-account (:p a)))
                       (not (and (:erased prior) (or protected (= kind "erase"))))
                       (< (:p a) max-position))
              (let [p (inc (:p a)) clock (max wall (inc (:clock a)))
                    event (str "compact/event/" idx)
                    sid (or (:eid prior) (str "compact/subject/" idx))]
                (vswap! claims conj command-key)
                (vswap! accounts assoc account (assoc a :p p :clock clock :event event))
                (vswap! subjects assoc subject-key {:p p :eid sid :previous event
                                                    :erased (or (:erased prior) (when (= kind "erase") clock))})
                (when-not (:eid prior)
                  (conj! ops [:db/add sid :compact/subject subject-key]))
                (conj! ops {:db/id event :compact/command command-key :compact/position (position-key account p)
                            :compact/subject-ref sid :compact/recorded clock :compact/body body})
                (when journal-rows
                  (conj! ops (assoc (journal/transaction account command p clock journal-rows) :db/id event)))
                (when (:previous prior)
                  (conj! ops [:db/add event :compact/previous (:previous prior)]))
                (when (= kind "erase") (conj! ops [:db/add sid :compact/erased clock]))))))))
    (doseq [[_ {:keys [eid event]}] @accounts] (conj! ops [:db/add eid :compact/head event]))
    (doseq [[_ {:keys [eid previous]}] @subjects] (conj! ops [:db/add eid :compact/head previous]))
    (when (empty? @claims) (reject :NoNewMembers))
    (persistent! ops)))

(defn tx! [conn data]
  (let [report (deref (d/transact-async conn data :io-context :compact) 60000 ::timeout)]
    (when (= ::timeout report) (reject :OutcomeUnknown))
    report))

(defn function-spec [f]
  (when f
    (assoc (select-keys f [:lang :params :requires :imports]) :code (edn/read-string (:code f)))))

(defn provision! [conn accounts]
  (let [db (:db-after (tx! conn schema))
        installed (value db (d/entid db :compact/append-v1) :db/fn)]
    ;; [DX-COMPACT1] Why: compare the installed function's actual signature and executable form.
    ;; Rejected: equality of JVM object strings or presence of an ident alone.
    (require! (= (function-spec (:db/fn (peek schema))) (function-spec installed)) :UnexpectedAppendFunction)
    (require! (not-any? #(account-id db %) accounts) :AccountAlreadyProvisioned)
    (when (seq accounts)
      (let [source (str (UUID/randomUUID))]
        (tx! conn (mapv #(hash-map :compact/account % :compact/epoch 0 :compact/source source) accounts))))))

(defn with-journal! [store]
  (tx! (:conn store) journal/schema)
  (assoc store :journal? true))

(defn layout []
  (let [world (json/read-str (slurp (or (System/getenv "COMPACT_W0_SCHEMA") "/compact/schema.json")))
        kinds (get world "entityKinds")
        names (->> kinds vals (mapcat #(keys (get % "attributes"))) (into (sorted-set)) vec)]
    {:kinds kinds :attrs names :codes (zipmap names (range))}))
(def w0 (delay (layout)))

(defn open-store [conn vault limit]
  {:conn conn :vault vault :limit limit :cache (LinkedHashMap. 16 0.75 true)})

(defn sync-view [store]
  (let [view (deref (d/sync (:conn store)) 60000 ::timeout)]
    (when (= ::timeout view) (reject :BasisUnavailable))
    view))

(defn head-position [db account]
  (let [eid (account-id db account)]
    (require! eid :UnknownAccount)
    (position db (head db eid))))

(defn claim [db account command] (lookup db :compact/command (compound account command)))
(defn read-body [db eid] (json/read-str (value db eid :compact/body)))
(defn receipt* [db eid]
  (let [datom (first (d/datoms db :eavt eid :compact/command))
        key (:v datom)
        account (subs key 0 (.indexOf ^String key "|"))
        [version digest] (read-body db eid)]
    (require! (= 1 version) :UnknownLayoutVersion)
    {:account account :epoch (value db (account-id db account) :compact/epoch)
     :command (component key) :position (position db eid) :recorded (value db eid :compact/recorded)
     :subject (component (value db (value db eid :compact/subject-ref) :compact/subject))
     :nativeT (d/tx->t (:tx datom)) :fingerprint digest}))
(defn receipt [db account command]
  (when-let [eid (claim db account command)] (receipt* db eid)))

(defn event [db eid]
  (let [[version _ additions retirements meta] (read-body db eid)]
    (require! (= 1 version) :UnknownLayoutVersion)
    {:eid eid :p (position db eid) :recorded (value db eid :compact/recorded)
     :adds additions :retires retirements :meta meta}))

(defn event-at [db account p]
  (lookup db :compact/position (position-key account p)))

(defn history-cut [db account p]
  (require! (and (integer? p) (<= 0 p (head-position db account))) :BasisUnavailable)
  (if (zero? p) db
    (let [eid (event-at db account p)
          datom (when eid (first (d/datoms db :eavt eid :compact/position)))]
      (require! datom :FeedGap)
      (d/as-of db (:tx datom)))))

(defn position-at [db account recorded]
  (require! (and (integer? recorded) (<= 0 recorded max-position)) :InvalidRecordedTime)
  (loop [lo 0 hi (head-position db account)]
    (if (= lo hi) lo
      (let [p (quot (+ lo hi 1) 2)
            clock (value db (event-at db account p) :compact/recorded)]
        (require! clock :FeedGap)
        (if (<= clock recorded) (recur p hi) (recur lo (dec p)))))))

(defn instant? [v]
  (and (string? v) (re-matches #"20[0-9][0-9]-[0-9]{2}-[0-9]{2}T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.[0-9]{6}Z" v)
       (try (Instant/parse v) true (catch Exception _ false))))
(defn date? [v]
  (and (string? v) (re-matches #"20[0-9][0-9]-[0-9]{2}-[0-9]{2}" v)
       (try (LocalDate/parse v) true (catch Exception _ false))))
(defn grammar [kind]
  (re-pattern (get-in @w0 [:kinds kind "idPattern"])))
(defn kind-of [eid]
  (when (string? eid)
    (first (for [kind ["placement" "document" "decision" "answer" "location" "jurisdiction"]
                 :when (re-matches (grammar kind) eid)] kind))))
(defn owner [^String e] (first (str/split e #"/" 2)))
(defn config [entity attr] (get-in @w0 [:kinds (kind-of entity) "attributes" attr]))
(defn attribute [code] (nth (:attrs @w0) code))
(defn protected? [v] (and (vector? v) (= 2 (count v)) (= "pii-v1" (first v)) (string? (second v))))
(defn text? [x] (and (string? x) (re-matches #"[ -~]{1,64}" x)))
(defn valid-value? [rule entity val]
  (case (get rule "type")
    "date" (date? val)
    "instant" (instant? val)
    "cents" (and (integer? val) (<= 0 val max-position))
    "minutes" (and (integer? val) (<= 0 val 10080))
    "boolean" (boolean? val)
    "text" (text? val)
    "enum" (some #{val} (get rule "values"))
    "ref" (and (string? val) (re-matches (grammar (get rule "refKind")) val)
               (or (not (or (get rule "owned") (get rule "sameOwner"))) (= (owner val) (owner entity))))
    false))

;; [DX-COMPACT1] Why: keep protected scalars and their unkeyed fingerprints out of source records.
;; Rejected: putting the plaintext into a compact blob or adding a guessable equality hash.
(defn test-vault [] {:keys (atom {}) :random (SecureRandom.)})
(defn random-bytes [^SecureRandom random n] (let [b (byte-array n)] (.nextBytes random b) b))
(defn aad [account root e a from to] (bytes-of (canonical [account root e a from to])))
(defn crypt [mode key iv aad data]
  (let [cipher (Cipher/getInstance "AES/GCM/NoPadding")]
    (.init cipher mode (SecretKeySpec. key "AES") (GCMParameterSpec. 128 iv))
    (.updateAAD cipher ^bytes aad)
    (.doFinal cipher ^bytes data)))
(defn seal-value! [vault account root e a from to val]
  (require! (and vault (true? (get (config e a) "pii")) (text? val)) :InvalidProtectedValue)
  (let [keys (:keys vault) k [account root] rng (:random vault)]
    (locking keys
      (require! (not= ::destroyed (@keys k)) :KeyDestroyed)
      (let [key (or (@keys k) (let [key (random-bytes rng 32)] (swap! keys assoc k key) key))
            iv (random-bytes rng 12)
            cipher (crypt Cipher/ENCRYPT_MODE key iv (aad account root e a from to) (bytes-of val))]
        ["pii-v1" (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (byte-array (concat iv cipher)))]))))
(defn unseal [vault account root e a from to sealed]
  (let [keys (:keys vault)]
    (require! keys :KeyUnavailable)
    (locking keys
      (let [key (@keys [account root])
            data (.decode (Base64/getUrlDecoder) ^String (second sealed))]
        (require! (and key (not= ::destroyed key)) :KeyUnavailable)
        (require! (<= 29 (alength data) 92) :InvalidProtectedValue)
        (String. ^bytes (crypt Cipher/DECRYPT_MODE key (Arrays/copyOfRange data 0 12)
                               (aad account root e a from to) (Arrays/copyOfRange data 12 (alength data)))
                 StandardCharsets/UTF_8)))))
(defn shred! [vault account root]
  (let [keys (:keys vault)]
    (require! keys :KeyUnavailable)
    (locking keys
      (let [k [account root] key (@keys k)]
        (when (and key (not= ::destroyed key)) (Arrays/fill ^bytes key (byte 0)))
        (swap! keys assoc k ::destroyed)))))

(def empty-projection {:head nil :p 0 :facts {} :fields {}})
(defn change [projection {:keys [eid p recorded adds retires]}]
  (let [pruned (reduce (fn [out id]
                        (if-let [row (get-in out [:facts id])]
                          (let [f [(:suffix row) (:code row)]
                                ids (disj (get-in out [:fields f]) id)]
                            (-> out
                                (update :facts dissoc id)
                                (update :fields (if (empty? ids) #(dissoc % f) #(assoc % f ids)))))
                          (reject :MissingRetirementWitness))) projection retires)]
    (reduce (fn [out [i [suffix code val from to]]]
              (let [id [p i] row {:id id :suffix suffix :code code :value val :from from :to to :recorded recorded}]
                (-> out (assoc-in [:facts id] row) (update-in [:fields [suffix code]] (fnil conj #{}) id))))
            (assoc pruned :head eid :p p) (map-indexed vector adds))))

(defn chain [db eid stop]
  (loop [e eid out []]
    (if (or (nil? e) (= e stop))
      {:reached e :events (rseq out)}
      (recur (value db e :compact/previous) (conj out (event db e))))))

(defn current-projection [store db account root]
  (let [cache ^LinkedHashMap (:cache store) k [account root] eid (head db (subject-id db account root))
        prior (locking cache (.get cache k))]
    (if (= eid (:head prior))
      (or prior empty-projection)
      (let [{:keys [reached events]} (chain db eid (:head prior))
            result (reduce change (if reached prior empty-projection) events)]
        ;; [DX-COMPACT1] Why: keep only touched live intervals and bind each cached value to its source head.
        ;; Rejected: a fleet-wide in-memory image or using an old projection after a later append.
        (when eid
          (locking cache
            (when (>= (:p result) (:p (.get cache k) 0))
              (.put cache k result)
              (when (> (.size cache) (:limit store))
                (let [it (.iterator (.keySet cache))]
                  (.next it)
                  (.remove it))))))
        result))))

(defn pinned-projection [db account root p]
  (if (zero? p) empty-projection
    (let [eid (loop [e (head db (subject-id db account root))]
                (if (and e (> (position db e) p))
                  (recur (value db e :compact/previous))
                  e))]
      (reduce change empty-projection (:events (chain db eid nil))))))

(defn overlaps? [from to other-from other-to]
  (and (or (nil? to) (neg? (compare (or other-from first-valid) to)))
       (or (nil? other-to) (neg? (compare (or from first-valid) other-to)))))

(defn encode-add [store account root [entity a val from to :as row]]
  (require! (and (vector? row) (= 5 (count row)) (string? entity) (= root (owner entity))) :WrongOwner)
  (let [rule (config entity a)]
    (require! rule :UnknownAttribute)
    (require! (and (or (nil? from) (instant? from)) (or (nil? to) (instant? to))
                   (or (nil? to) (neg? (compare (or from first-valid) to)))) :InvalidValidity)
    (if (true? (get rule "pii"))
      (require! (and (protected? val) (text? (unseal (:vault store) account root entity a from to val))) :InvalidProtectedValue)
      (require! (valid-value? rule entity val) :InvalidValue))
    [(subs entity (count root)) (get-in @w0 [:codes a]) val from to]))

(defn validate-delta! [projection adds retires root]
  (require! (and (= (count retires) (count (set retires)))
                 (every? #(contains? (:facts projection) %) retires)) :Conflict)
  (let [removed (set retires)]
    (reduce (fn [written [suffix code v from to :as add]]
              (let [field [suffix code]
                    rule (config (str root suffix) (attribute code))
                    existing (for [id (get-in projection [:fields field]) :when (not (removed id))
                                   :let [{:keys [value from to]} (get-in projection [:facts id])]]
                               [value from to])
                    seen (concat existing (get written field))]
                (require! (not-any? (fn [[old a b]]
                                     (and (or (= "one" (get rule "cardinality")) (= v old))
                                          (overlaps? from to a b))) seen) :CardinalityConflict)
                (update written field (fnil conj []) [v from to]))) {} adds)))

(defn command-fingerprint [account root command expected additions retirements meta]
  (sha (canonical [1 account root command expected additions retirements meta])))

(defn revision [db account root]
  (position db (head db (subject-id db account root))))

(defn time-ms [s]
  (when s
    (let [t (Instant/parse s)]
      (+ (* 1000.0 (.getEpochSecond t)) (/ (.getNano t) 1000000.0)))))

(defn journal-fact [account root [suffix code value from to]]
  (let [entity (str root suffix)
        attr (attribute code)
        type (get (config entity attr) "type")
        typed (cond
                (protected? value) {:type "json" :value {:protected true}}
                (= type "ref") {:type "ref" :value (str "acct/" account "/" value)}
                (= type "instant") {:type "datetime" :value (time-ms value)}
                (integer? value) {:type "number" :value value}
                (boolean? value) {:type "boolean" :value value}
                :else {:type "string" :value value})]
    {:entity (str "acct/" account "/" entity) :entityType (kind-of entity) :attribute attr
     :value typed :from (time-ms from) :to (time-ms to)}))

(defn journal-plan [account root projection encoded retires]
  {:adds (mapv #(journal-fact account root %) encoded)
   :retires (mapv (fn [id]
                    (let [{:keys [suffix code value from to recorded]} (get-in projection [:facts id])]
                      (assoc (journal-fact account root [suffix code value from to]) :id id :recorded recorded)))
                  retires)})

(defn prepare [store db {:keys [account root command expected adds retires meta]}]
  (require! (and (string? account) (re-matches #"[a-z0-9-]{1,32}" account)
                 (string? command) (re-matches #"[a-zA-Z0-9_-]{1,64}" command)
                 (contains? #{"placement" "location" "jurisdiction"} (kind-of root))
                 (integer? expected) (<= 0 expected max-position)
                 (or (nil? meta) (vector? meta))
                 (vector? adds) (vector? retires) (<= (+ (count adds) (count retires)) 512)
                 (every? #(and (vector? %) (= 2 (count %)) (every? integer? %) (pos? (first %)) (<= 0 (second %))) retires))
            :InvalidCommand)
  ;; [DX-COMPACT1] Why: the client may have received a valid revision from a different peer.
  ;; Rejected: declining an ahead-of-peer revision before a synchronized read, or synchronizing every ordinary save.
  (let [observed (revision db account root)
        ahead? (< observed expected)
        db (if ahead? (sync-view store) db)
        current (if ahead? (revision db account root) observed)
        fingerprint (command-fingerprint account root command expected adds retires meta)
        existing (receipt db account command)
        kind (first meta)
        request {:account account :root root :command command :expected expected :fingerprint fingerprint :kind kind}]
    (require! (account-id db account) :UnknownAccount)
    (cond
      existing (assoc request :resolved (if (= fingerprint (:fingerprint existing)) existing {:error "IdempotencyConflict"}))
      (not= expected current)
      (assoc request :resolved {:error "Conflict"})
      :else
      (do
        (require! (or (nil? meta)
                       (and (vector? meta)
                            (case kind
                              "erase" (and (= 1 (count meta)) (= "placement" (kind-of root))
                                            (empty? adds) (empty? retires) (:vault store)
                                            (nil? (value db (subject-id db account root) :compact/erased)))
                              "publish" (and (= 7 (count meta)) (integer? (second meta))
                                             (<= 0 (second meta) max-position) (instant? (nth meta 2))
                                             (string? (nth meta 3)) (re-matches #"sha256:[a-f0-9]{64}" (nth meta 3))
                                             (every? string? (drop 4 meta)) (empty? adds) (empty? retires))
                              false))) :InvalidMetadata)
        (let [encoded (mapv #(encode-add store account root %) adds)
              projection (when (or (seq adds) (seq retires)) (current-projection store db account root))
              body (canonical [1 fingerprint encoded retires meta])]
          (when projection (validate-delta! projection encoded retires root))
          (require! (<= (utf8 body) 65536) :FrameTooLarge)
          (cond-> (assoc request :body body :expected-account (when (= kind "publish") (second meta))
                         :protected (boolean (some #(protected? (nth % 2)) encoded)))
            (:journal? store) (assoc :journal-rows (journal-plan account root projection encoded retires))))))))

(defn no-new-members? [error]
  (some (fn [cause]
          (or (= :NoNewMembers (:code (ex-data cause)))
              (and (instance? clojure.lang.ExceptionInfo cause) (= "NoNewMembers" (ex-message cause)))))
        (take-while some? (iterate ex-cause error))))

(defn commit-ready! [store prepared]
  (require! (and (<= 1 (count prepared) 128)
                 (<= (reduce + (map #(if-let [body (:body %)] (utf8 body) 0) prepared)) 65536)) :FrameTooLarge)
  (let [conn (:conn store)
        pending (vec (remove :resolved prepared))
        start (System/nanoTime)
        report (when (seq pending)
                 (try (tx! conn [[:compact/append-v1 pending]])
                      (catch Exception e
                        (when-not (no-new-members? e) (throw e)))))
        elapsed (- (System/nanoTime) start)
        ;; [DX-COMPACT1] Why: an all-duplicate or refused append supplies no db-after, and the peer may lag the native turn.
        ;; Rejected: resolving an ambiguous or stale local receipt as a conflict.
        db (or (:db-after report) (if (seq pending) (sync-view store) (d/db conn)))
        outcomes (mapv (fn [{:keys [account root command fingerprint resolved kind]}]
                         (let [r (or resolved (receipt db account command))]
                           (cond
                             (:error r) r
                             (nil? r) {:error "Conflict"}
                             (not= fingerprint (:fingerprint r)) {:error "IdempotencyConflict"}
                             :else
                             (do
                               (when (= kind "erase") (shred! (:vault store) account root))
                               r)))) prepared)]
    {:report report :nativeNanos elapsed :outcomes outcomes :view db}))

(defn save! [store command]
  (first (:outcomes (commit-ready! store [(prepare store (d/db (:conn store)) command)]))))

(defn instant-text [micros]
  (let [instant (Instant/ofEpochSecond (quot micros 1000000) (* 1000 (mod micros 1000000)))]
    (.format (.toFormatter (doto (java.time.format.DateTimeFormatterBuilder.) (.appendInstant 6))) instant)))

(defn visible? [valid {:keys [from to]}]
  (and (not (neg? (compare valid (or from first-valid)))) (or (nil? to) (neg? (compare valid to)))))
(defn decode-value [store latest account root e a {sealed-or-value :value :keys [from to]}]
  (if (protected? sealed-or-value)
    (if-let [erased (value latest (subject-id latest account root) :compact/erased)]
      {:erasedAt (instant-text erased)}
      (unseal (:vault store) account root e a from to sealed-or-value))
    sealed-or-value))
(defn rows-at [store latest account root projection valid]
  (vec (for [row (vals (:facts projection)) :when (visible? valid row)
             :let [e (str root (:suffix row)) a (attribute (:code row))]]
         {:e e :a a :v (decode-value store latest account root e a row) :tx (first (:id row))})))

(defn world [store latest account root mode p valid]
  (require! (instant? valid) :InvalidValidity)
  (require! (account-id latest account) :UnknownAccount)
  (let [at (if (= mode :current) latest (history-cut latest account p))
        pull (fn [r] (rows-at store latest account r
                      (if (= mode :current) (current-projection store at account r) (pinned-projection at account r p)) valid))
        base (pull root)
        loc (:v (first (filter #(and (= root (:e %)) (= "location" (:a %))) base)))
        local (when loc (pull loc))
        jur (:v (first (filter #(= "jurisdiction" (:a %)) local)))]
    {:subject root :facts (vec (concat base local (when jur (pull jur))))}))

(defn history [store latest account root]
  (let [eid (head latest (subject-id latest account root))
        {:keys [events]} (chain latest eid nil)
        rows (reduce (fn [out {:keys [p recorded adds retires]}]
                       (let [out (reduce #(update %1 %2 assoc :retiredPosition p :retiredAt recorded) out retires)]
                         (reduce (fn [r [i [suffix code v from to]]]
                                   (assoc r [p i] {:id [p i] :suffix suffix :code code :value v :from from :to to :recorded recorded}))
                                 out (map-indexed vector adds)))) {} events)]
    (mapv (fn [row]
            (let [e (str root (:suffix row)) a (attribute (:code row))]
              (assoc (dissoc row :suffix :code :value)
                     :e e :a a :v (decode-value store latest account root e a row))))
          (sort-by :id (vals rows)))))

(defn feed [store latest account after limit]
  (let [high (head-position latest account)]
    (require! (and (integer? after) (<= 0 after high) (integer? limit) (<= 1 limit 256)) :BasisUnavailable)
    (let [start (position-key account (inc after))
          end (str account "}")
          data (take limit (d/index-range latest :compact/position start end))]
      (require! (= (count data) (min limit (- high after))) :FeedGap)
      (mapv
        (fn [offset datom]
          (let [eid (:e datom) r (receipt* latest eid) root (:subject r)
                {:keys [adds retires meta]} (event latest eid)
                coordinates (fn [[p i] row op recorded]
                              (require! row :MissingRetirementWitness)
                              (let [[suffix code v from to] row
                                    e (str root suffix) a (attribute code)]
                                (cond-> {:op op :id [p i] :e e :a a :from from :to to :recordedAt recorded
                                         :v (decode-value store latest account root e a {:value v :from from :to to})}
                                  (= op "retire") (assoc :retiredAt (:recorded r)))))]
            (require! (and (= account (:account r)) (= (+ after offset 1) (:position r))) :FeedGap)
            (assoc r :metadata meta
              :changes (into (mapv #(coordinates [(:position r) %1] %2 "assert" (:recorded r)) (range) adds)
                         (for [[p i :as id] retires
                               :let [former (event-at latest account p)]]
                           (do (require! (= (value latest eid :compact/subject-ref) (value latest former :compact/subject-ref)) :WrongOwner)
                               (let [prior (event latest former)]
                                 (coordinates id (get (:adds prior) i) "retire" (:recorded prior)))))))))
        (range) data))))
