(ns triplex.age.adopt
  (:require [clojure.data.json :as json]
            [clojure.edn :as edn]
            [datomic.api :as d]
            [triplex.age.native :as native]
            [triplex.age.tape :as tape]
            [triplex.gateway.lean :as lean]
            [triplex.gateway.main :as gateway]
            [triplex.gateway.scope :as scope]
            [triplex.gateway.storage :as storage])
  (:import [java.nio.charset StandardCharsets]
           [java.nio.channels FileChannel]
           [java.nio.file Files Path StandardCopyOption StandardOpenOption]
           [java.security MessageDigest]
           [java.util HexFormat]))

(def full-facts 162456470)
(def full-population "346b8a8f77c1d6374deb7ad140a447d084cfff223a5982f6918f3b4608a97e7e")
(def manifest-command
  "load1/manifest/77084fa4c135d00bfa53b8508425491193285882ceb2f875e16fa46bbecf22fd")

(defn sha [^bytes data]
  (.formatHex (HexFormat/of) (.digest (MessageDigest/getInstance "SHA-256") data)))

(defn sha-text [^String value] (sha (.getBytes value StandardCharsets/UTF_8)))

(defn read-seal! [file pin fixture?]
  (let [bytes (Files/readAllBytes (Path/of file (make-array String 0)))
        _ (native/check! (= pin (sha bytes)) "Sealed seed manifest digest differs" {})
        {:keys [source slot nonce people facts population layout scopes proofs verification]
         :as manifest} (json/read-str (String. bytes StandardCharsets/UTF_8) :key-fn keyword)
        [{:keys [name db cut seedCut accounts]}] scopes
        [proof] proofs
        canonical (json/write-str ["triplex-scope-v1" "test" "test" name 0])
        source-seal (sha-text (json/write-str ["deep-field-decision/1" population people accounts 2000]
                                             :escape-slash false))]
    ;; [DX-AGE1] Why: use the actual pooled decision loader's image receipt and native marker.
    ;; Rejected: accepting the older SCALE1 seed-image shape or a planned population count.
    (native/check!
      (and (= "pooled" layout) (= (vec (range 10)) accounts) (= 1 (count scopes) (count proofs))
           (= "full-command-and-feed-with-pinned-member-probes" verification)
           (string? source) (re-matches #"[a-f0-9]{40}" source)
           (string? population) (re-matches #"[a-f0-9]{64}" population)
           (string? nonce) (re-matches #"[a-f0-9-]{36}" nonce)
           (string? slot) (not-empty slot)
           (= name (str "dx-scale-decision-" nonce "-0"))
           (= db (scope/name-for canonical))
           (integer? cut) (> cut 1) (= cut seedCut (:cut proof) (inc (:observed proof)))
           (= source-seal (:sourceSeal proof))
           (= facts (:facts proof)) (= (* 10 people) (:cursor proof))
           (if fixture?
             (and (integer? people) (<= 2 people 32) (pos-int? facts))
             (and (= 100000 people) (= full-facts facts) (= full-population population)
                  (pos-int? (:bytes manifest)) (string? (:sha256 manifest))
                  (re-matches #"[a-f0-9]{64}" (:sha256 manifest)))))
      "Input is not a sealed one-database SCALE1 decision seed" {})
    {:scope canonical :name db :position cut :people-per-account people :facts facts
     :source source :source-seal source-seal :manifest-sha pin :origin-slot slot}))

(defn scope-db [name physical]
  {:name name :physical physical :conn (gateway/connection (gateway/db-uri physical))})

(defn exact-position-t [db position]
  (let [row (first (d/index-range db :triplex.tx/position position (inc position)))]
    (native/check! (= position (:v row)) "No exactly matching physical cut" {:position position})
    (d/tx->t (:e row))))

(defn selected-rows [db eid attributes]
  (let [selected (group-by (comp :attribute second)
                   (keep (fn [datom]
                           (let [text (:v datom) row (lean/decode text)]
                             (when (attributes (:attribute row)) [text row])))
                         (lean/live-texts db eid)))]
    (mapv (fn [attr]
            (let [items (selected attr)]
              (native/check! (= 1 (count items)) "Expected exactly one live field row"
                             {:attribute attr :entity eid :found (count items)})
              (first items))) (sort attributes))))

(def fields #{":task/field-0" ":task/field-1" ":task/field-2"})
(def member-fields #{":subject/account" ":subject/member"})

(defn subject! [db cut clock account local]
  (let [key (format "account-%03d" (inc account))
        prefix (str "acct/" key "/")
        local-key (format "%08d" local)
        root (str prefix "pl:" local-key)
        owner (str prefix "i9:" local-key)
        root-id (d/entid db [:triplex.entity/id root])
        owner-id (d/entid db [:triplex.entity/id owner])]
    (native/check! (and root-id owner-id) "Seed root or first task is missing" {:account account :local local})
    (let [member (mapv (comp :value_string second) (selected-rows db root-id member-fields))
          revision (storage/value db owner-id :triplex.entity/rev)
          pairs (selected-rows db owner-id fields)
          rows (mapv second pairs)]
      (native/check! (and (= [key (str local)] member)
                          (integer? revision) (<= 1 revision cut)
                          (every? true?
                            (map-indexed (fn [j row]
                                           (and (= owner (:entity_id row)) (= "string" (:value_type row))
                                                (= (subs (sha-text (str "deep-field/" local "/0/" j "/0")) 0 57)
                                                   (:value_string row))
                                                (string? (:tx_id row)) (number? (:valid_from row))
                                                (nil? (:valid_to row)) (number? (:recorded_at row))
                                                (<= 1 (:recorded_position row) revision)
                                                (<= (:recorded_at row) clock))) rows)))
                     "Seed subject fields or stored revision differ" {:account account :local local})
      {:account account :local local :root root :owner owner :revision revision
       :texts (mapv first pairs) :rows rows})))

(defn read-population! [{:keys [conn]} {:keys [position scope people-per-account source-seal] :as seal}
                        per-account initial?]
  (native/check! (<= 1 per-account (- people-per-account 2))
                 "Active sample needs separate probe and idle subjects in every account" {})
  (let [live (deref (d/sync conn) 60000 nil)
        _ (native/check! live "Seed peer did not synchronize" {})
        seed-t (exact-position-t live position)
        db (if initial? live (d/as-of live seed-t))
        e (scope/entity db)
        clock (scope/max-recorded-at db e)
        loader-prefix (str "load1/" (sha-text (json/write-str [(nth (json/read-str scope) 3) source-seal 2000])) "/")
        last-tx (scope/newest-commit db)]
    (native/check! (and (= scope (gateway/stored-scope db))
                        (= position (storage/head-position db))
                        (= 3 (storage/value db e :triplex.scope/rows-version))
                        (scope/head-v2? db e)
                        (true? (storage/value db e :triplex.scope/strict-record-clocks))
                        (true? (storage/value db e :triplex.scope/position-regular))
                        (number? clock)
                        (and last-tx (= seed-t (d/tx->t last-tx)))
                        (d/entid db [:triplex.claim/command-id manifest-command])
                        (some (fn [x]
                                (let [cmd (storage/value db (:v x) :triplex.claim/command-id)]
                                  (and (string? cmd) (.startsWith ^String cmd loader-prefix))))
                              (d/datoms db :vaet last-tx :triplex.claim/tx)))
                   "Native seed identity, terminal loader receipt or clock/layout differs"
                   {:position position :seed-t seed-t})
    ;; [DX-AGE1] Why: interleave fixed samples across accounts and locate them by the source's exact IDs.
    ;; Rejected: walking all 162M facts or creating a new active population alongside the seed.
    (let [actives (for [j (range per-account), account (range 10)
                        :let [local (quot (* j (- people-per-account 2)) per-account)]]
                    (subject! db position clock account local))
          probes (map #(subject! db position clock % (- people-per-account 2)) (range 10))
          idle (map #(subject! db position clock % (dec people-per-account)) (range 10))
          ledger (into (vec actives) (concat probes idle))]
      {:seed-head position :seed-t seed-t :origin-clock clock :active (* 10 per-account)
       :people (count ledger) :adopted ledger :round-ms (quot tape/day-ms 3) :seal seal
       :seed-records (when initial? (:datoms (d/db-stats db)))})))

(defn persist! [file population replace?]
  (let [target (Path/of file (make-array String 0))
        parent (.getParent (.toAbsolutePath target))
        partial (Files/createTempFile parent "age-ledger-" ".partial"
                                      (make-array java.nio.file.attribute.FileAttribute 0))]
    (native/check! (or replace? (not (Files/exists target (make-array java.nio.file.LinkOption 0))))
                   "Ledger already exists" {})
    (try
      (Files/writeString partial (str (pr-str population) "\n")
                         (into-array java.nio.file.OpenOption
                                     [StandardOpenOption/WRITE StandardOpenOption/SYNC]))
      (Files/move partial target (into-array java.nio.file.CopyOption
                                           (cond-> [StandardCopyOption/ATOMIC_MOVE]
                                             replace? (conj StandardCopyOption/REPLACE_EXISTING))))
      (with-open [parent-handle (FileChannel/open parent (into-array StandardOpenOption [StandardOpenOption/READ]))]
        (.force parent-handle true))
      (finally (Files/deleteIfExists partial)))))

(defn read-ledger [file] (edn/read-string (slurp file)))
