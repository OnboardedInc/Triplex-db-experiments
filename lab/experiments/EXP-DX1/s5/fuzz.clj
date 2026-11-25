(ns s5-fuzz
  "[DX-S5] Differential fuzzer for the per-subject writers (one owner, several owners, creation) against the general
  writer. Every generated save is applied to two scopes from identical prior states: the candidate with the fast
  writers as configured, and the control with every fast plan declined (so the general writer takes every save; the
  gateway's validation, including the removed-family rule, stays as configured). Compared after every save: the
  outcome (status and code), and for a commit its position, record clock and datom count; every 250 saves and at the
  end: every stored datom of the row, identity, claim and journal attributes (canonical: entities by public ID,
  transactions by position), every read route for every owner at sampled positions, reads by assertion ID and the feed.
  Phases: serial (competing saves injected between the fast plan and its commit, lost replies, kills before and after
  submit, resends with the same or a different body), then concurrent rounds (2 or 4 writer threads on the candidate,
  each reading pinned at its source and saving; every committed save is then replayed on the control in commit order
  and must commit with the same receipt). Run by s5/clj-run.sh; reviewer's harness, not a gate of the code under review."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.set] [clojure.walk]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as rows] [triplex.gateway.reach :as reach]
            [triplex.gateway.subject-save :as subject] [triplex.gateway.subject-owners :as owners]
            [triplex.gateway.subject-create :as create]
            [wide-gate :as wide] [wfix1-regression :as reference])
  (:import [java.util Random]))

;; ---------------------------------------------------------------- the control

(defn general
  "Run f with every fast plan declined: the gateway's request handling is unchanged and the general writer commits."
  [f]
  (with-redefs [subject/plan (fn [& _] nil) owners/plan (fn [& _] nil) create/plan (fn [& _] nil)] (f)))

;; ---------------------------------------------------------------- frames (extends s3/owners_gate.clj frame)

(defn- row [id e entity-type attr tx]
  {:id id :entity_id e :entity_type entity-type :attribute attr :value_type "string" :value_string nil
   :valid_from 0.0 :recorded_at 1000.0 :recorded_position 1 :schema_version 1 :tx_id tx})

(defn- canonical-json [v] (json/write-str (clojure.walk/postwalk #(if (map? %) (into (sorted-map) %) %) v)))
;; [DX-S6] JSON, boolean, datetime and blob values (S5_VALUE_TYPES=1), as the SDK packs them (packages/datomic/src/rows.ts).
(defn- blob-meta [value] (canonical-json (cond-> {"mimeType" (:mime value) "size" (:size value)} (:filename value) (assoc "filename" (:filename value)))))
(defn- typed-row [r {:keys [type value]}]
  (case type
    :ref (assoc r :value_type "ref" :value_string value)
    :number (assoc r :value_type "number" :value_number (double value))
    :boolean (assoc r :value_type "boolean" :value_boolean (if value 1 0))
    :datetime (assoc r :value_type "datetime" :value_datetime (double value))
    :json (assoc r :value_type "json" :value_json (canonical-json value))
    :blob (assoc r :value_type "blob" :value_string (:hash value) :value_json (blob-meta value))
    (assoc r :value_type "string" :value_string value)))

(defn- change-value [{:keys [type value]}]
  (case type :ref {"type" "ref" "value" value} :number {"type" "number" "value" (double value)}
    :boolean {"type" "boolean" "value" (boolean value)} :datetime {"type" "datetime" "value" (double value)}
    :json {"type" "json" "value" value}
    :blob (cond-> {"type" "blob" "value" (:hash value) "mimeType" (:mime value) "size" (:size value)} (:filename value) (assoc "filename" (:filename value)))
    {"type" "string" "value" value}))

(defn frame
  "One save as the SDK frames it. facts: {:owner :field :value :type :pred}; retires: {:owner :field :pred} where
  :frame-owner (default :owner) is the entity the retired row is framed on. :pred is the current {:id :value :type}."
  [{:keys [command operation block facts retires source entities claim-tx scope-wide no-command]}]
  (let [{:keys [tx id]} block
        n (volatile! -1) next-id #(id (vswap! n inc))
        business (mapv (fn [f] (typed-row (row (next-id) (:owner f) nil (:field f) tx) f)) facts)
        retired (vec (concat (keep (fn [f] (when (:pred f) [(:owner f) (:field f) (:pred f)])) facts)
                             (map (fn [r] [(or (:frame-owner r) (:owner r)) (:field r) (:pred r)]) retires)))
        old (mapv (fn [[owner field pred]]
                    (assoc (typed-row (row (:id pred) owner nil field "_tx/earlier") pred)
                           :retracted_at 1000.0 :retracted_position 1 :retract_tx_id tx))
                  retired)
        written (vec (distinct (concat (map :owner facts) (map first retired))))
        j (fn [attr] (row (next-id) tx "_Transaction" attr tx))
        changes (concat (map (fn [r f] {"op" "assert" "tripleId" (:id r) "entityId" (:entity_id r) "attribute" (:attribute r)
                                        "value" (change-value f) "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" tx})
                             business facts)
                        (map (fn [[owner field pred]]
                               {"op" "retract" "tripleId" (:id pred) "entityId" owner "attribute" field
                                "value" (change-value pred) "validFrom" 0.0 "recordedAt" 1000.0 "assertionTxId" "_tx/earlier"
                                "retractedAt" 1000.0 "retractionTxId" tx})
                             retired))
        journal (-> [(assoc (j ":_tx/position") :value_type "number" :value_number 1.0)
                     (assoc (j ":_tx/instant") :value_type "datetime" :value_datetime 1000.0)]
                    (into (map #(assoc (j ":_tx/changed-entity") :value_string %) written))
                    ;; [S5 second review] :no-command frames a save without a command (no claim), as a TriplesLive save
                    ;; without meta.commandId is framed.
                    (cond-> (not no-command) (conj (assoc (j ":_tx/command-id") :value_string command)))
                    (into (map (fn [c] (assoc (j ":_tx/change") :value_type "json" :value_json (json/write-str c))) changes)))
        fresh (into business journal)]
    (rows/row-input
      {"sourceK" source "span" 1 "position" 1 "scopeWide" (boolean scope-wide) "entities" (vec (or entities written))
       "operationId" (or operation command) "rows" (mapv storage/wire-row (into fresh old)) "newIds" (mapv :id fresh)
       "claims" (if no-command [] [{"commandId" command "txId" (or claim-tx tx) "timestamp" 1000.0}])})))

;; ---------------------------------------------------------------- generator

(def ^:private strings
  ["a" "é" "é" "🧭x" " line" "q\"uote\\" "</script>" "tab\tnl\n" "日本語" "  padded  " "0" "null"
   "-0" "{\"json\":1}" (apply str (repeat 700 "z")) "Ω≈ç√∫" "\u0000nul" "/slash/"])

(defn- pick [^Random rng xs] (nth xs (.nextInt rng (count xs))))
(defn- chance [^Random rng p] (< (.nextDouble rng) p))
(defn- between [^Random rng lo hi] (+ lo (.nextInt rng (inc (- hi lo)))))

(def ^:private value-types? (= "1" (System/getenv "S5_VALUE_TYPES")))
(def protected-fields
  "[DX-S6] S5_PROTECTED=unsealed or sealed: both scopes declare these protected; one value in ten is written to one."
  (when (#{"unsealed" "sealed"} (System/getenv "S5_PROTECTED")) [":fz/p0" ":fz/p1"]))
(defn- typed-value [^Random rng g]
  (let [k (swap! (:counter g) inc)]
    (case (int (.nextInt rng 4))
      0 {:type :boolean :value (.nextBoolean rng)}
      1 {:type :datetime :value (double (+ 1.7E12 (* 1000 (.nextInt rng 1000000))))}
      2 {:type :json :value (pick rng [{"k" k "l" [1 "two" true nil]} [] {} "text" 0 {"nested" {"z" 1 "a" [k]}} (str "é" k)])}
      {:type :blob :value (cond-> {:hash (str "sha256:" (format "%064x" (biginteger k))) :mime (pick rng ["application/pdf" "image/png"])
                                   :size (.nextInt rng 100000)} (.nextBoolean rng) (assoc :filename (str "f" k ".pdf")))})))

(defn- value [^Random rng g owners-pool ref-rate]
  (let [r (.nextDouble rng)]
    (cond
      (< r ref-rate) {:type :ref :value (pick rng owners-pool)}
      (and value-types? (< r (+ ref-rate 0.25))) (typed-value rng g)
      (< r (+ ref-rate 0.12)) {:type :number :value (pick rng [0.0 1.0 -1.5 1.0E300 4.9E-324 123456.789 (double (.nextInt rng 1000))])}
      :else {:type :string :value (str (pick rng strings) "|" (swap! (:counter g) inc))})))

(defn- fresh-name [g ^Random rng]
  (let [k (swap! (:counter g) inc) acct (:acct g)]
    (case (int (.nextInt rng 40))
      0 (str acct "/N" k)                               ; differs by case from a sibling name scheme
      1 (str acct "/n" k " ")                           ; padding
      2 (str acct "/né" k)                              ; NFC
      3 (str acct "/né" k)                        ; NFD of the same text
      4 (str "_sys/fz" k)                               ; a system entity (declined)
      5 (str "acct/other" (:seed g) "/n" k)             ; another account
      6 (str "plain/n" k)                               ; no account
      (str acct "/n" k))))

(defn- block-of [g ^Random rng total]
  (let [n (swap! (:counter g) inc) r (.nextDouble rng)]
    (cond
      (and (< r 0.3) (<= total 248)) (assoc (wide/identity-block :narrow n) :kind :narrow)
      (< r 0.85) (assoc (wide/identity-block :wide n) :kind :wide)
      :else {:kind :plain :tx (str "_tx/plain-" (:seed g) "-" n) :id #(str "plain" (:seed g) "-" n "-" %)})))

(defn- journal-rows [facts retires owners] (+ 3 (count owners) (count facts) (count retires) (count (filter :pred facts))))

(defn- shuffle-with [^Random rng xs]
  (let [a (java.util.ArrayList. ^java.util.Collection (vec xs))] (java.util.Collections/shuffle a rng) (vec a)))

(defn choose-owners
  "One to five owners: existing ones, new ones (fresh names, or the round's shared race names when there are any)."
  [g ^Random rng exists]
  (let [existing (vec (sort exists))
        pending (vec (sort @(:pending g)))
        ;; In the concurrent rounds most existing owners come from a small hot set, so writers collide.
        hot (vec (filter exists @(:hot g)))
        k (let [r (.nextDouble rng)] (cond (< r 0.45) 1 (< r 0.65) 2 (< r 0.8) 3 (< r 0.93) 4 :else 5))
        creating (chance rng 0.35)
        owners (vec (distinct (repeatedly k #(if (or (empty? existing) (and creating (chance rng 0.5)))
                                                 (if (and (seq pending) (chance rng 0.7)) (pick rng pending) (fresh-name g rng))
                                                 (pick rng (if (and (seq hot) (chance rng 0.75)) hot existing))))))]
    [owners (into #{} (remove exists) owners)]))

(defn gen-save
  "A random save spec against `model` (owner -> field -> {:id :value :type}) and `exists` (owners that exist)."
  [g ^Random rng model exists head & [{:keys [owners news]}]]
  (let [existing (vec (sort exists))
        [owners news] (if owners [owners news] (choose-owners g rng exists))
        news (atom news)
        pool (vec (distinct (concat owners existing ["acct/elsewhere/target"])))
        big? (chance rng 0.04)
        ;; Two in five saves carry reference values (a quarter of their values); the rest only plain values.
        ref-rate (if (chance rng 0.4) 0.25 0.0)
        per-owner (fn [o]
                    (if (contains? @news o)
                      {:facts (vec (concat
                                     (for [i (range (between rng 1 (if big? 70 8)))]
                                       (merge {:owner o :field (str ":fz/f" i) :pred nil} (value rng g pool ref-rate)))
                                     (when (and protected-fields (chance rng 0.1))
                                       [{:owner o :field (pick rng protected-fields) :pred nil :type :string
                                         :value (str "protected|" (swap! (:counter g) inc))}])))
                       :retires []}
                      (let [live (vec (sort (keys (get model o))))
                            shuffled (vec (shuffle-with rng live))
                            rep (min (count shuffled) (between rng 0 (if big? 70 5)))
                            ret (min (- (count shuffled) rep) (between rng 0 (if (chance rng 0.3) 3 0)))
                            fst (between rng (if (and (zero? rep) (zero? ret)) 1 0) (if big? 40 4))]
                        {:facts (vec (concat (for [f (take rep shuffled)] (merge {:owner o :field f :pred (get-in model [o f])} (value rng g pool ref-rate)))
                                             (for [_ (range fst)] (merge {:owner o :field (str ":fz/x" (swap! (:counter g) inc)) :pred nil}
                                                                         (value rng g pool ref-rate)))))
                         :retires (vec (for [f (take ret (drop rep shuffled))] {:owner o :field f :pred (get-in model [o f])}))})))
        parts (map per-owner owners)
        ;; Facts of several owners interleaved in a random order (the block's order against the facts' order).
        facts (vec (shuffle-with rng (mapcat :facts parts)))
        retires (vec (mapcat :retires parts))
        total (+ (count facts) (journal-rows facts retires owners))
        stale (and (> head 4) (chance rng 0.08))
        faults (cond-> #{}
                 stale (conj :stale-source)
                 (chance rng 0.05) (conj :extra-read)
                 (chance rng 0.03) (conj :stale-predecessor)
                 (chance rng 0.02) (conj :wrong-owner-retire)
                 (chance rng 0.04) (conj :scope-wide))]
    {:owners owners :new @news :facts facts :retires retires :faults faults
     :source (if stale (- head (between rng 1 4)) head)
     :block (block-of g rng total)}))

(defn apply-faults
  "Turn fault tags into frame changes using the generator's history."
  [g ^Random rng spec model]
  (let [{:keys [faults]} spec
        spec (if (and (faults :extra-read) (seq (:exists-now g)))
               (assoc spec :entities (vec (distinct (concat (distinct (concat (map :owner (:facts spec)) (map :owner (:retires spec))))
                                                            [(pick rng (vec (:exists-now g)))]))))
               spec)
        spec (if-let [[o f id] (and (faults :stale-predecessor) (seq @(:retired g)) (pick rng @(:retired g)))]
               (update spec :retires conj {:owner o :field f :pred {:id id :value "old" :type :string}})
               spec)
        spec (if-let [{:keys [owner field pred]} (and (faults :wrong-owner-retire) (first (filter :pred (:facts spec))))]
               (let [other (first (remove #{owner} (keys model)))]
                 (if other
                   (-> spec (update :facts (fn [fs] (mapv #(if (= field (:field %)) (dissoc % :pred) %) fs)))
                       (update :retires conj {:owner owner :frame-owner other :field field :pred pred}))
                   spec))
               spec)]
    spec))

(def accounts?
  "[S5 second review] S5_ACCOUNTS=1: a save whose written owners are all of the generator's account names it
  (`account`, as the SDK's claimAccount does), and a second account's saves reuse the first's command and operation IDs."
  (= "1" (System/getenv "S5_ACCOUNTS")))
(defn account-of-spec [g spec]
  (when accounts?
    (let [prefix (str (:acct g) "/")
          written (distinct (concat (map :owner (:facts spec)) (map :owner (:retires spec)) (keep :frame-owner (:retires spec))))]
      (when (and (seq written) (every? #(str/starts-with? % prefix) written)) (subs (:acct g) 5)))))

(defn input-of [g spec]
  (let [command (or (:command spec) (str "fz" (:seed g) "-" (swap! (:counter g) inc)))
        account (or (:account spec) (account-of-spec g spec))]
    [command (cond-> (frame {:command command :operation (:operation spec) :block (:block spec) :facts (:facts spec)
                             :retires (:retires spec) :source (:source spec) :entities (:entities spec)
                             :scope-wide (contains? (:faults spec) :scope-wide) :no-command (:no-command spec)})
               account (assoc "account" account))]))

;; ---------------------------------------------------------------- model upkeep

(defn- record-commit [model spec input]
  (let [ids (vec (take (count (:facts spec)) (get input "newIds")))
        model (reduce (fn [m r] (if-let [o (:frame-owner r)] (update m o dissoc (:field r)) (update m (:owner r) dissoc (:field r))))
                      model (:retires spec))
        model (reduce (fn [m [{:keys [owner field value type]} id]] (assoc-in m [owner field] {:id id :value value :type type}))
                      model (map vector (:facts spec) ids))]
    model))

(declare read-owner)
(defn read-owner-ids "Every current assertion ID of an owner." [name o] (map :id (vals (read-owner name o {"validAt" 5.0}))))
(defn read-owner
  "An owner's current facts as {field {:id :value :type}} through the product's read route."
  [name o basis]
  (let [r (reference/route name "v1" "read" {"entityIds" [o] "basis" basis})]
    (when-not (= 200 (:status r)) (throw (ex-info "read failed" {:reply r})))
    (into {} (for [row (get-in r [:body "rows"])
                   :let [vt (get-in row ["value_type" "v"])]]
               [(get-in row ["attribute" "v"])
                {:id (get-in row ["id" "v"])
                 :type (case vt "ref" :ref "number" :number "boolean" :boolean "datetime" :datetime "json" :json "blob" :blob :string)
                 ;; [DX-S6] The added value types read back in the generator's own representation.
                 :value (case vt
                          "number" (get-in row ["value_number" "v"])
                          "boolean" (let [b (get-in row ["value_boolean" "v"])] (if (number? b) (not (zero? b)) (boolean b)))
                          "datetime" (get-in row ["value_datetime" "v"])
                          "json" (json/read-str (get-in row ["value_json" "v"]))
                          "blob" (let [m (json/read-str (get-in row ["value_json" "v"]))]
                                   (cond-> {:hash (get-in row ["value_string" "v"]) :mime (get m "mimeType") :size (get m "size")}
                                     (get m "filename") (assoc :filename (get m "filename"))))
                          (get-in row ["value_string" "v"]))}]))))

;; ---------------------------------------------------------------- comparison

(def canon-attrs [:triplex.entity/id :triplex.entity/row :triplex.entity/retired :triplex.entity/rev
                  :triplex.claim/command-id :triplex.claim/tx-id :triplex.claim/tx
                  :triplex.tx/position :triplex.tx/id :triplex.tx/operation-id :triplex.tx/recorded-at
                  :triplex.tx/max-recorded-at :triplex.tx/journals :triplex.journal/position
                  :triplex.scope/feed-irregular :triplex.scope/irregular :triplex.scope/position-regular])

;; [S5 third review] With removals on (S5_REMOVALS=1), each scope's removal takes its own random transaction ID
;; (_tx/erase-<uuid>) and its record time from the clock when that scope runs it, and every later server-assigned
;; record time follows from it; those values differ between the two scopes by design, so they are compared as
;; placeholders: removal IDs as erase-*, and every double of 1e12 or more (an epoch-millisecond record time) as MS.
(def ^:private removal-steps? (= "1" (System/getenv "S5_REMOVALS")))
(defn- norm-text [^String s]
  (if removal-steps? (-> s (str/replace #"erase-[0-9a-f-]{36}" "erase-*") (str/replace #"[0-9]\.[0-9]+E1[2-9]" "MS")) s))
(defn- norm-value [x]
  (if removal-steps?
    (clojure.walk/postwalk (fn [v] (cond (and (double? v) (>= (double v) 1e12)) "MS"
                                         (string? v) (norm-text v)
                                         :else v)) x)
    x))

(defn- canon-entries
  "The canonical datoms (as strings) of the attributes above whose transaction position passes keep?."
  [conn keep?]
  (let [db (d/db conn) h (d/history db)
        scope-e (:e (first (d/datoms db :aevt :triplex.scope/key)))
        named (fn [e]
                (or (some-> (first (d/datoms db :eavt e :triplex.entity/id)) :v (->> (str "E:")))
                    (some-> (first (d/datoms db :eavt e :triplex.claim/command-id)) :v (->> (str "C:")))
                    (some-> (first (d/datoms db :eavt e :triplex.tx/position)) :v (->> (str "T@")))
                    (when (= e scope-e) "SCOPE")
                    (str "?" (d/ident db e) e)))
        tx-pos (fn [tx] (:v (first (d/datoms db :eavt tx :triplex.tx/position))))
        ref? #{:triplex.claim/tx :triplex.tx/journals}]
    (for [a canon-attrs :when (d/entid db a) dt (d/datoms h :aevt a)
          :let [p (tx-pos (:tx dt))] :when (and p (keep? p))]
      (norm-text (pr-str [(named (:e dt)) a (if (ref? a) (named (:v dt)) (:v dt)) (:added dt) (str "T@" p)])))))

(defn canon-digest
  "Every datom ever asserted or retracted of the attributes above, entities named by public ID (claims by command,
  transactions by position): count and two order-independent 64-bit sums of SHA-256 halves (streamed, not held)."
  [conn]
  (let [md (java.security.MessageDigest/getInstance "SHA-256")]
    (reduce (fn [[n a b] ^String text]
              (let [bb (java.nio.ByteBuffer/wrap (.digest md (.getBytes text "UTF-8")))]
                [(inc n) (unchecked-add (long a) (.getLong bb 0)) (unchecked-add (long b) (.getLong bb 8))]))
            [0 0 0] (canon-entries conn (constantly true)))))

(defn canon
  "The canonical datoms of transactions after position `after`, sorted (to name a difference)."
  [conn after]
  (vec (sort (canon-entries conn #(> % after)))))

(defn- first-difference [a b]
  (let [sa (set a) sb (set b)]
    {:only-control (take 5 (remove sb a)) :only-candidate (take 5 (remove sa b))
     :control (count a) :candidate (count b)}))

(defn- read-rows [name input]
  (let [r (reference/route name "v1" "read" input)]
    (when-not (= 200 (:status r)) (throw (ex-info "read failed" {:input input :reply r})))
    (sort-by #(get-in % ["id" "v"]) (get-in r [:body "rows"]))))

(defn- reach-of [name conn s basis]
  (dissoc (json/read-str (reach/response name (d/db conn) {"roots" [s] "basis" basis "full" true})) "t" "basisT"))

(defn deep-compare
  "Compare stored datoms (unless markers differ by design) and every read route; returns nil or a difference.
  Each answer is compared as it is read, so memory stays bounded at any head."
  [c-name c-conn k-name k-conn owners ^Random rng ids-sample]
  (let [head (storage/head-position (d/db c-conn))
        khead (storage/head-position (d/db k-conn))]
    (if (not= head khead)
      {:what "head" :control head :candidate khead}
      ;; [DX-S6] Sealed values are encrypted under each scope's own keys, so stored datoms differ by design; the read
      ;; routes (which unseal) and the feed are still compared.
      (let [datoms? (and (not subject/append-retirement?) (not= "sealed" (System/getenv "S5_PROTECTED")))]
        (if (and datoms? (not= (canon-digest c-conn) (canon-digest k-conn)))
          {:what "datoms" :difference (first-difference (canon c-conn (- head 60)) (canon k-conn (- head 60)))}
          (let [positions (vec (sort (distinct (concat (range (max 1 (- head 4)) (inc head))
                                                       (repeatedly 6 #(inc (.nextInt rng (max 1 head))))))))
                checks (concat
                         (for [s owners] [[:current s] #(read-rows % {"entityIds" [s] "basis" {"validAt" 5.0}})])
                         (for [s owners] [[:history s] #(read-rows % {"entityIds" [s] "history" true})])
                         (for [s owners p positions] [[:pinned s p] #(read-rows % {"entityIds" [s] "basis" {"validAt" 5.0 "recordedPosition" p}})])
                         (for [s owners] [[:reach s] (fn [n] (reach-of n (if (= n c-name) c-conn k-conn) s {"validAt" 5.0}))])
                         (for [s owners p (take-last 3 positions)]
                           [[:reach-pinned s p] (fn [n] (reach-of n (if (= n c-name) c-conn k-conn) s {"validAt" 5.0 "recordedPosition" p}))])
                         (for [id ids-sample] [[:by-id id] (fn [n] [(get-in (reference/route n "v1" "read" {"id" id "basis" {"validAt" 5.0}}) [:body "rows"])
                                                                    (get-in (reference/route n "v1" "read" {"id" id "history" true}) [:body "rows"])])]))
                route-diff (some (fn [[label f]] (let [e (norm-value (f c-name)) a (norm-value (f k-name))] (when (not= e a) {:what "routes" :at label :control (take 2 e) :candidate (take 2 a)})))
                                 checks)
                feed-diff (when-not route-diff
                            (loop [after 0 pages 0]
                              (let [e (reference/feed c-name after 200) a (reference/feed k-name after 200)]
                                (cond
                                  (not= (norm-value (map #(vec (take 2 %)) e)) (norm-value (map #(vec (take 2 %)) a))) {:what "feed" :after after}
                                  (not= (norm-value (map wide/feed-changes e)) (norm-value (map wide/feed-changes a))) {:what "feed-changes" :after after}
                                  (empty? e) nil
                                  :else (recur (second (peek e)) (inc pages))))))]
            (or route-diff feed-diff)))))))

;; ---------------------------------------------------------------- one serial step

(defonce planned (java.util.concurrent.ConcurrentHashMap.))
;; Which writer each operation was submitted to (the per-subject function's ident, or "general"), whatever the outcome.
(defonce ^:private submit-wrapped
  (alter-var-root #'storage/submit!
    (fn [orig] (fn [conn data input timeline & more]
                 (let [p (first more)]
                   (.put ^java.util.concurrent.ConcurrentHashMap planned (str (System/identityHashCode conn) "/" (get input "operationId"))
                         (if p (str (first (:function p))) "general")))
                 (apply orig conn data input timeline more)))))

(defn writer-kind [conn operation reply]
  (let [s (.get ^java.util.concurrent.ConcurrentHashMap planned (str (System/identityHashCode conn) "/" operation))]
    (cond (get-in reply [:body "subjectReplan"]) :replan
          (nil? s) :not-submitted
          (= s "general") :general
          (str/includes? s "create-") :create (str/includes? s "owners-") :owners :else :one-owner)))

(defn- writer-of [reply]
  (let [b (:body reply)]
    (cond (string? (get b "subjectSave")) (let [s (get b "subjectSave")]
                                           (cond (str/includes? s "create-") :create (str/includes? s "owners-") :owners :else :one-owner))
          (get b "subjectReplan") :replan
          :else :general)))

;; [S5 third review] A removal takes its record time from the clock at the moment each scope runs it, so after one the
;; two scopes' next record times differ by design; with S5_REMOVALS=1 the receipt comparison leaves recordedAt out.
(defn- receipt [reply] (select-keys (:body reply) (if (= "1" (System/getenv "S5_REMOVALS")) ["position" "datoms" "operationId"] ["position" "recordedAt" "datoms" "operationId"])))
(defn position-of "The committed position of a receipt (tagged long)." [reply]
  (some-> (get-in reply [:body "position" "v"]) str Long/parseLong))

(defn- with-competing
  "On the candidate: run `competing` once, after the save `operation` was planned and before it is submitted."
  [operation competing f]
  (let [orig storage/submit! fired (atom false)]
    (with-redefs [storage/submit! (fn [conn data input timeline & more]
                                    (when (and (= operation (get input "operationId")) (compare-and-set! fired false true))
                                      (competing))
                                    (apply orig conn data input timeline more))]
      (f))))

(defn- killing
  "The first transact-async of f: :before throws without submitting; :after submits, waits for the commit, then throws
  (the gateway died after the transactor applied the save)."
  [mode f]
  (let [orig d/transact-async fired (atom false)]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (if (compare-and-set! fired false true)
                                       (case mode
                                         :before (throw (ex-info "S5 kill before submit" {}))
                                         :after (let [fut (apply orig conn tx opts)]
                                                  (try (deref fut 10000 nil) (catch Throwable _ nil))
                                                  (throw (ex-info "S5 kill after submit" {}))))
                                       (apply orig conn tx opts)))]
      (f))))

(defn- outcome [reply] (reference/outcome reply))

(declare op-lookup)
(defn serial-step!
  "One generated save (with an optional race, kill or resend) on both scopes. Returns a result map."
  [g ^Random rng {:keys [c-name c-conn k-name k-conn]}]
  (let [model @(:model g) exists @(:exists g)
        head (storage/head-position (d/db c-conn))
        spec0 (gen-save g rng model exists head)
        spec (apply-faults (assoc g :exists-now exists) rng spec0 model)
        mode (let [r (.nextDouble rng)]
               (cond (< r 0.10) :race (< r 0.13) :lost-reply (< r 0.155) :kill-after (< r 0.18) :kill-before
                     (< r 0.20) :same-command (< r 0.215) :same-operation (< r 0.23) :reuse-block
                     (< r 0.24) :reuse-refused-block :else :plain))
        ;; A reused one-byte block holds at most 256 identities; a larger save keeps its own block.
        fits? (fn [b] (or (not= :narrow (:kind b))
                          (<= (+ (count (:facts spec)) (journal-rows (:facts spec) (:retires spec)
                                                                     (distinct (concat (:owners spec) (map :owner (:retires spec))
                                                                                       (keep :frame-owner (:retires spec))))))
                              256)))
        spec (case mode
               :same-command (if-let [c (some-> @(:commands g) seq vec (->> (pick rng)))]
                               (assoc spec :command c :operation (str c "/again-" (swap! (:counter g) inc))) spec)
               :same-operation (if-let [o (some-> @(:operations g) seq vec (->> (pick rng)))] (assoc spec :operation o) spec)
               :reuse-block (if-let [b (some-> @(:blocks g) seq vec (->> (pick rng)))] (if (fits? b) (assoc spec :block b) spec) spec)
               :reuse-refused-block (if-let [b @(:refused-block g)] (if (fits? b) (assoc spec :block b) spec) spec)
               spec)
        [command input] (input-of g spec)
        operation (get input "operationId")
        ;; A competing save on one of this save's owners (or creating one of its new owners), framed on the same model.
        competing-spec (when (= mode :race)
                         (let [o (pick rng (:owners spec))
                               fields (vec (keys (get model o)))
                               f (when (and (seq fields) (chance rng 0.7)) (pick rng fields))]
                           {:owners [o] :new (if (contains? exists o) #{} #{o})
                            :facts [(merge {:owner o :field (or f (str ":fz/c" (swap! (:counter g) inc))) :pred (when f (get-in model [o f]))}
                                           {:type :string :value (str "competing|" (swap! (:counter g) inc))})]
                            :retires [] :faults #{} :source head :block (block-of g rng 8)}))
        [competing-command competing-input] (when competing-spec (input-of g competing-spec))
        result (atom {})
        send-c (fn [x] (general #(reference/send c-name x)))
        send-k (fn [x] (reference/send k-name x))]
    ;; The control gets the same request built at the same moment: the competing save is injected at its submit too,
    ;; with every fast plan declined, so both writers decide the same payload on the same serial state.
    (let [ccell (atom nil)
          c (case mode
              :race (general #(with-competing operation (fn [] (reset! ccell (reference/send c-name competing-input)))
                                (fn [] (reference/send c-name input))))
              (:lost-reply :kill-after :kill-before) (let [first-try (send-c input) again (send-c input)] (swap! result assoc :c-again (outcome again)) first-try)
              (send-c input))
          _ (when (and competing-input (nil? @ccell)) (reset! ccell (send-c competing-input)))
          cc @ccell
          kc (atom nil)
          k (case mode
              :race (with-competing operation #(reset! kc (send-k competing-input)) #(send-k input))
              :lost-reply (let [first-try (send-k input) again (send-k input)] (swap! result assoc :k-again (outcome again)) first-try)
              :kill-after (let [lost (killing :after #(send-k input)) again (send-k input)]
                            (swap! result assoc :k-lost (outcome lost) :k-again (outcome again))
                            ;; After a kill the client resolves by operation: the original receipt or nothing.
                            (let [op (op-lookup k-name operation (get input "account"))]
                              (if (= "committed" (get op "status")) {:status 200 :body (assoc op "datoms" (get-in c [:body "datoms"])) :resolved true} again)))
              :kill-before (let [lost (killing :before #(send-k input)) again (send-k input)]
                             (swap! result assoc :k-lost (outcome lost)) again)
              (send-k input))
          ;; A save refused before its submit (validation, a duplicate operation) never opened the race window.
          _ (when (and competing-input (nil? @kc))
              (reset! kc (send-k competing-input))
              (swap! result assoc :competing-late true))]
      (swap! result assoc :mode mode :command command :operation operation :spec (dissoc spec :block) :block (:kind (:block spec))
             :c (outcome c) :k (outcome k) :writer (writer-kind k-conn operation k) :declined (get-in k [:body "subjectDeclined"])
             :c-receipt (receipt c) :k-receipt (receipt k)
             :cc (some-> cc outcome) :kc (some-> @kc outcome) :kc-writer (when @kc (writer-kind k-conn (get competing-input "operationId") @kc)))
      (let [r @result
            same-outcome (and (= (:c r) (:k r)) (= (:cc r) (:kc r))
                              (= (:c-again r) (:k-again r (:c-again r))))
            same-receipt (or (not= 200 (:status c))
                             (if (:resolved k)
                               (= (get-in c [:body "position"]) (get-in k [:body "position"]))
                               (= (receipt c) (receipt k))))]
        ;; Model upkeep from the control's (authoritative) outcomes.
        (when (and cc (= 200 (:status cc)))
          (swap! (:model g) record-commit competing-spec competing-input)
          (swap! (:exists g) into (:owners competing-spec))
          (swap! (:commands g) conj competing-command) (swap! (:operations g) conj (get competing-input "operationId"))
          (swap! (:blocks g) conj (:block competing-spec)))
        (if (= 200 (:status c))
          (do (swap! (:retired g) into (for [x (concat (filter :pred (:facts spec)) (:retires spec)) :when (:pred x)]
                                         [(:owner x) (:field x) (get-in x [:pred :id])]))
              (swap! (:model g) record-commit spec input)
              (swap! (:exists g) into (concat (:owners spec) (keep :frame-owner (:retires spec))))
              (swap! (:commands g) conj command) (swap! (:operations g) conj operation)
              (swap! (:blocks g) conj (:block spec)))
          (when (#{:narrow :wide} (:kind (:block spec))) (reset! (:refused-block g) (:block spec))))
        (assoc r :equal (and same-outcome same-receipt))))))

;; ---------------------------------------------------------------- [S5 second review] unknown outcomes and a second account

(defonce last-unknown (atom nil))
(defonce ^:private unknown-hooked
  ;; Remembers the cause chain of the last failure the gateway classified unknown (the 503 body does not name it).
  (let [v (requiring-resolve 'triplex.gateway.outcome/unknown)]
    (alter-var-root v (fn [f] (fn [e] (reset! last-unknown (vec (for [x (take-while some? (iterate #(.getCause ^Throwable %) e))]
                                                                   (str (.getName (class x)) ": " (.getMessage ^Throwable x)))))
                                (f e))))))
(def faults? "S5_FAULTS=1: one serial save in seven has an unknown outcome, resolved as the SDK resolves it." (= "1" (System/getenv "S5_FAULTS")))
(def ^:private unknown-failures
  [#(ex-info "Transactor not available" {:cognitect.anomalies/category :cognitect.anomalies/unavailable :cognitect.anomalies/message "Transactor not available"})
   #(ex-info "Interrupted" {:cognitect.anomalies/category :cognitect.anomalies/interrupted})
   #(ex-info ":db.error/transactor-unavailable Transactor not available" {:db/error :db.error/transactor-unavailable})
   #(java.util.concurrent.ExecutionException. (java.net.SocketException. "Connection reset"))
   #(java.util.concurrent.ExecutionException. (java.util.concurrent.TimeoutException. "timed out"))
   #(RuntimeException. "a failure the gateway has never seen")
   (constantly nil)])                                    ; nil: the gateway's 5 s deref times out
(defn- failing [e]
  (reify clojure.lang.IDeref (deref [_] (throw e))
    clojure.lang.IBlockingDeref (deref [_ _ _] (throw e))
    clojure.lang.IPending (isRealized [_] true)))
(defn- hanging []
  (reify clojure.lang.IDeref (deref [_] (throw (IllegalStateException. "unbounded deref")))
    clojure.lang.IBlockingDeref (deref [_ _ timeout] (Thread/sleep 20) timeout)
    clojure.lang.IPending (isRealized [_] false)))
(defn- with-transact-fault
  "The first d/transact-async of f: :applied (the transactor applies it; the gateway then sees e, or its deref times
  out), :unapplied (never sent), :late (held, and sent by the caller after the fence). Returns [result held]."
  [kind e f]
  (let [orig d/transact-async fired (atom false) held (atom nil)]
    (with-redefs [d/transact-async (fn [conn tx & opts]
                                     (if (compare-and-set! fired false true)
                                       (case kind
                                         :late (do (reset! held #(apply orig conn tx opts)) (hanging))
                                         :applied (let [fut (apply orig conn tx opts)]
                                                    (try (deref fut 10000 nil) (catch Throwable _ nil))
                                                    (if e (failing e) (hanging)))
                                         :unapplied (if e (failing e) (hanging)))
                                       (apply orig conn tx opts)))]
      [(f) @held])))
(defn op-lookup [name id account]
  (let [{:keys [body]} (main/route-handler {:request-method :get :uri (str "/v1/db/" name "/operation/" (java.net.URLEncoder/encode ^String id "UTF-8"))
                                            :query-string (when account (str "account=" account))})]
    (json/read-str (if (string? body) body (String. ^bytes body "UTF-8")))))
(defn- fence-op [name id account] (:body (reference/route name "v1" "fence" (cond-> {"operationId" id} account (assoc "account" account)))))
(defn- resolve-op [name id account]
  (let [op (op-lookup name id account)]
    (if (or (= "committed" (get op "status")) (get op "fenced")) op (fence-op name id account))))

(defn fault-step!
  "One generated save with an unknown outcome on both scopes (the same fault on each), resolved as the SDK resolves it
  (lookup, then fence), then replayed under a new operation ID when fenced. Checks the truth on each side and that
  both sides agree."
  [g ^Random rng {:keys [c-name c-conn k-name k-conn]}]
  (let [model @(:model g) exists @(:exists g)
        head (storage/head-position (d/db c-conn))
        spec (apply-faults (assoc g :exists-now exists) rng (gen-save g rng model exists head) model)
        kind (pick rng [:applied :unapplied :late])
        make (nth unknown-failures (.nextInt rng (count unknown-failures)))
        [command input] (input-of g spec)
        ;; One fault step in three is an import or settlement frame (the same save under another write class): every
        ;; class goes through commit! and must resolve the same way.
        klass (when (chance rng 0.33) (pick rng ["import" "activation" "notice"]))
        input (cond-> input klass (assoc "writeClass" klass))
        op (get input "operationId") account (get input "account")
        replay-input (assoc input "operationId" (str op "/replay"))
        side (fn [name wrap]
               (let [[reply held] (wrap #(with-transact-fault kind (make) (fn [] (reference/send name input))))
                     unknown? (= 503 (:status reply))
                     resolved (when unknown? (resolve-op name op account))
                     late (when held (try @(held) "committed" (catch Exception _ "refused")))
                     after (when unknown? (op-lookup name op account))
                     replay (when (get resolved "fenced") (wrap #(reference/send name replay-input)))
                     _ (when (= 503 (:status replay))
                         (println "DX-S5R2_UNKNOWN" (json/write-str {:where "replay after a fence" :side name :faults (:faults spec)
                                                                     :owners (:owners spec) :chain @last-unknown})))]
                 {:answer (outcome reply) :resolved (get resolved "status") :fenced (boolean (get resolved "fenced"))
                  :late late :after (get after "status") :replay (some-> replay outcome)
                  :position (or (get resolved "position") (get-in replay [:body "position"]) (get-in reply [:body "position"]))}))
        c (side c-name general)
        k (side k-name (fn [f] (f)))
        truth (fn [s] (and (or (not= 503 (first (:answer s)))
                               (and (#{"committed" "absent"} (:resolved s)) (= (:resolved s) (:after s))))
                           (not= "committed" (:late s))
                           (or (not= kind :unapplied) (not= "committed" (:resolved s)))))
        r {:mode (keyword (str "fault-" (name kind) (when klass (str "-" klass)))) :command command :operation op :c (:answer c) :k (:answer k)
           :c-side c :k-side k :writer (writer-kind k-conn op nil)
           :equal (and (= (dissoc c :position) (dissoc k :position)) (= (:position c) (:position k)) (truth c) (truth k))}]
    (let [stored (cond (= "committed" (:resolved c)) input
                       (= [200 nil] (:replay c)) replay-input
                       (= [200 nil] (:answer c)) input)]
      (if stored
        (do (swap! (:retired g) into (for [x (concat (filter :pred (:facts spec)) (:retires spec)) :when (:pred x)]
                                       [(:owner x) (:field x) (get-in x [:pred :id])]))
            (swap! (:model g) record-commit spec stored)
            (swap! (:exists g) into (concat (:owners spec) (keep :frame-owner (:retires spec))))
            (swap! (:commands g) conj command) (swap! (:operations g) conj (get stored "operationId"))
            (swap! (:blocks g) conj (:block spec)))
        (when (#{:narrow :wide} (:kind (:block spec))) (reset! (:refused-block g) (:block spec)))))
    r))

(defonce shadowed (atom {}))
(defn- single-owner? [accounts] (and (= 1 (count accounts)) (some? (first accounts))))

(defn shadow-step!
  "A second account's save that reuses the first account's latest command and operation IDs (every client-chosen key
  shared), on both scopes. With TX2_ACCOUNT_CLAIMS=1 it must commit, and each account's lookups must find its own
  transaction only."
  [g ^Random rng {:keys [c-name k-name]}]
  ;; Each first-account command is shadowed once: a second shadow of the same command would reuse the second account's
  ;; own IDs (its refusal is then the contract, not a cross-account effect).
  ;; A first-account command can come back as the latest (a save of the same command that names the account after a
  ;; plain claim of it), so the set of shadowed commands is kept, not only the last.
  ;; The same holds for operation IDs (a save naming the account can reuse an operation ID stored plain), so both the
  ;; command and the operation must be new to the second account.
  (when-let [[command op] (let [c (peek @(:commands g)) o (peek @(:operations g)) seen (get @shadowed (:seed g) #{})]
                            (when (and c o (not (seen c)) (not (seen o))) [c o]))]
    (swap! shadowed update (:seed g) (fnil into #{}) [command op])
    (let [
          b-acct (str "fb" (:seed g)) b-owner (str "acct/" b-acct "/s" (swap! (:counter g) inc))
          ;; [DX-S6b] Operation IDs have one stored form, the client's own, database-wide (S6 12.1): the shadow shares
          ;; the first account's command ID only, under an operation ID of its own.
          b-op (str "fb-op-" (swap! (:counter g) inc))
          spec {:owners [b-owner] :new #{b-owner} :command command :operation b-op :account b-acct :retires [] :faults #{}
                :facts (vec (for [i (range (between rng 1 4))] {:owner b-owner :field (str ":fz/b" i) :type :string :value (str "b|" i) :pred nil}))
                :source (storage/head-position (d/db (main/connection (main/db-uri c-name)))) :block (block-of g rng 12)}
          [_ input] (input-of g spec)
          b-tx (get-in input ["claims" 0 "txId"])
          c (general #(reference/send c-name input))
          k (reference/send k-name input)
          on (= "1" (System/getenv "TX2_ACCOUNT_CLAIMS"))
          lookups (fn [name]
                    {:claim (get (:body (reference/route name "v1" "claim" {"commandId" command "account" b-acct})) "txId")
                     :op (get (op-lookup name b-op b-acct) "txId")
                     :a-op (get (op-lookup name op (subs (:acct g) 5)) "txId")})
          lc (lookups c-name) lk (lookups k-name)
          cross (if on (count (filter #(and (some? %) (not= b-tx %)) [(:claim lk) (:op lk)])) 0)
          fa (let [kc (main/connection (main/db-uri k-name)) db (d/db kc)
                                ac (fn [s] (deref (requiring-resolve (symbol "triplex.gateway.account-claims" s))))
                                plain (d/entid db [:triplex.claim/command-id command])]
                            {:plain (some? plain)
                             :plainAccounts (when plain (vec ((ac "claim-accounts") kc db plain)))
                             :scopedForFirst (some? (d/entid db [:triplex.claim/command-id ((ac "encode") (subs (:acct g) 5) command)]))
                             :message (get-in k [:body "message"])
                             :txAttrs (when plain
                                        (let [tx (or (:v (first (d/datoms db :eavt plain :triplex.claim/tx))) plain)
                                              t (d/tx->t tx) data (:data (first (d/tx-range (d/log kc) t (inc t))))]
                                          {:attrs (frequencies (map #(str (d/ident db (:a %)) (if (:added %) "+" "-")) data))
                                           :ids (vec (take 6 (distinct (keep #(:v (first (d/datoms db :eavt (:e %) :triplex.entity/id))) data))))}))})]
      {:mode (if (and on (:plain fa) (not (single-owner? (:plainAccounts fa)))) :shadow-of-a-no-one-account-claim :shadow)
       :c (outcome c) :k (outcome k) :cross cross :committedWithOption (when on (= 200 (:status k)))
       :firstAccountClaim fa
       ;; [DX-S6b] A plain claim of no one account (system entities only, an entity of no account, or several
       ;; accounts') refuses every account's save of that ID (the rule both lines share, S6 12.2): the second
       ;; account's refusal is then the contract.
       :equal (and (= (outcome c) (outcome k)) (= lc lk) (zero? cross)
                   (or (not on) (= 200 (:status k))
                       (and (:plain fa) (not (single-owner? (:plainAccounts fa))) (= [409 "CommandConflict"] (outcome k)))))})))

;; ---------------------------------------------------------------- [S5 third review] the setting's transition and removals

(def transition? "S5_TRANSITION=1: the account-ID setting turns on at one third of the serial steps." (= "1" (System/getenv "S5_TRANSITION")))
(def removals? "S5_REMOVALS=1 (with S5_PROTECTED): removals on request, alone and racing a save, as steps." (= "1" (System/getenv "S5_REMOVALS")))
(defonce transitioned (atom #{}))

(defn- account-var [s] (requiring-resolve (symbol "triplex.gateway.account-claims" s)))
(defn- turn-on-both! [c-conn k-conn]
  (with-redefs-fn {(account-var "permitted?") true}
    #(do ((account-var "turn-on!") c-conn) ((account-var "turn-on!") k-conn))))

(defn extra-step!
  "One step of the third review's dimensions, after the main step, on both scopes: the transition (once), a save
  planned by a process that has not read the setting (after it), a removal on request, a save racing a removal and the
  SDK's replay of it. Returns nil when no step is due."
  [g ^Random rng i steps {:keys [c-name c-conn k-name k-conn]}]
  (let [setting (fn [conn] ((account-var "setting") (d/db conn)))
        model @(:model g)
        protected-owner (fn [] (let [xs (vec (sort (for [[o fs] model :when (some #(contains? fs %) protected-fields)] o)))]
                                 (when (seq xs) (pick rng xs))))]
    (cond
      (and transition? (>= i (quot steps 3)) (not (@transitioned (:seed g))))
      (do (swap! transitioned conj (:seed g))
          (turn-on-both! c-conn k-conn)
          {:mode :transition :c (setting c-conn) :k (setting k-conn) :equal (= 1 (setting c-conn) (setting k-conn))})

      (and transition? (@transitioned (:seed g)) (chance rng 0.03))
      ;; A planner that has not read the setting (a stale view, or a build that does not know it): every save it
      ;; prepares must be refused once the setting is on, and store nothing.
      (let [exists @(:exists g) head (storage/head-position (d/db c-conn))
            spec (gen-save g rng model exists head)
            [_ input] (input-of g spec)
            op (get input "operationId")
            stale (fn [f] (with-redefs-fn {(account-var "on?") (constantly false) (account-var "permitted?") false} f))
            c (stale #(general (fn [] (reference/send c-name input))))
            k (stale #(reference/send k-name input))
            stored (fn [name] (= "committed" (get (op-lookup name op nil) "status")))]
        {:mode :stale-planner :c (outcome c) :k (outcome k) :committed [(stored c-name) (stored k-name)]
         :equal (and (= (outcome c) (outcome k)) (not= 200 (:status c)) (not= 200 (:status k)) (not (stored c-name)) (not (stored k-name)))})

      (and removals? protected-fields (chance rng 0.02))
      (when-let [o (protected-owner)]
        (let [f (first (filter #(contains? (get model o) %) protected-fields))
              cmd (str "rm-" (:seed g) "-" (swap! (:counter g) inc))
              sel [{"entityId" o "attribute" f}]
              c (reference/route c-name "v1" "erase" {"commandId" cmd "selectors" sel})
              k (reference/route k-name "v1" "erase" {"commandId" cmd "selectors" sel})]
          (swap! (:model g) assoc o (read-owner c-name o {"validAt" 5.0}))
          {:mode :removal :c [(:status c)] :k [(:status k)] :equal (= (:status c) (:status k))}))

      (and removals? protected-fields (chance rng 0.01))
      (when-let [o (protected-owner)]
        (let [f (first (filter #(contains? (get model o) %) protected-fields))
              head (storage/head-position (d/db c-conn))
              spec {:owners [o] :new #{} :retires [] :faults #{} :source head :block (block-of g rng 8)
                    :facts [{:owner o :field f :type :string :value (str "chosen-before|" (swap! (:counter g) inc)) :pred (get-in model [o f])}]}
              [command input] (input-of g spec)
              op (get input "operationId")
              cmd (str "rmr-" (:seed g) "-" (swap! (:counter g) inc))
              sel [{"entityId" o "attribute" f}]
              ce (atom nil) ke (atom nil)
              c (general #(with-competing op (fn [] (reset! ce (reference/route c-name "v1" "erase" {"commandId" cmd "selectors" sel}))) (fn [] (reference/send c-name input))))
              k (with-competing op (fn [] (reset! ke (reference/route k-name "v1" "erase" {"commandId" cmd "selectors" sel}))) #(reference/send k-name input))
              ;; The SDK's replay: a fresh read (the value is now removed), the same values, the first source.
              fresh-pred (get (read-owner c-name o {"validAt" 5.0}) f)
              replay (fn [name] (second (input-of g (assoc spec :command command :operation (str op "/replay") :source (storage/head-position (d/db c-conn))
                                                              :facts [(assoc (first (:facts spec)) :pred fresh-pred)]))))
              rc (general #(reference/send c-name (assoc (replay c-name) "frameSourceK" head)))
              rk (reference/send k-name (assoc (replay k-name) "frameSourceK" head))]
          (swap! (:model g) assoc o (read-owner c-name o {"validAt" 5.0}))
          {:mode :removal-race :c [(outcome c) (some-> @ce :status) (outcome rc)] :k [(outcome k) (some-> @ke :status) (outcome rk)]
           ;; With the per-subject writers off the save holds the scope's writer lock from plan to commit, so the removal
           ;; sent at its submit waits (503) and the save commits first: no race, nothing to decline (S6 12.3).
           :equal (and (= (outcome c) (outcome k)) (= (some-> @ce :status) (some-> @ke :status)) (= (outcome rc) (outcome rk))
                       (if (= 200 (some-> @ke :status))
                         (and (not= 200 (:status rc)) (not= 200 (:status rk)) (not= 200 (:status k)))
                         true))})))))

;; ---------------------------------------------------------------- the concurrent phase

(defn thread-input
  "One client's save: read its owners pinned at the head, then frame the save with that head as its source."
  [g ^Random rng k-name k-conn]
  (let [db (d/db k-conn)
        head (storage/head-position db)
        basis {"validAt" 5.0 "recordedPosition" head}
        exists (into #{} (filter #(d/entid db [:triplex.entity/id %])) (concat @(:exists g) @(:pending g)))
        [owners news] (choose-owners g rng exists)
        model (into {} (for [o owners :when (exists o)] [o (read-owner k-name o basis)]))
        spec (-> (gen-save g rng model exists head {:owners owners :news news})
                 (assoc :source head :faults #{}))
        [command input] (input-of g spec)]
    {:spec spec :input input :command command :source head :entities (set (get input "entities"))}))

(defn- thread-save!
  [g ^Random rng k-name k-conn]
  (let [r (thread-input g rng k-name k-conn)
        reply (reference/send k-name (:input r))]
    (assoc r :reply reply :outcome (outcome reply) :writer (writer-kind k-conn (get-in r [:input "operationId"]) reply))))

(defn concurrent-round!
  "threads clients saving at once on the candidate; then the committed saves replayed on the control in commit order."
  [g seed threads per-thread {:keys [c-name c-conn k-name k-conn]}]
  (reset! (:pending g) (set (repeatedly 6 #(str (:acct g) "/race" (swap! (:counter g) inc)))))
  (reset! (:hot g) (vec (take 6 (shuffle-with (Random. seed) (sort @(:exists g))))))
  (let [start (storage/head-position (d/db k-conn))
        results (->> (range threads)
                     (mapv (fn [t] (future (let [rng (Random. (+ (* 1000003 seed) (* 7919 t) start))]
                                             (vec (repeatedly per-thread #(thread-save! g rng k-name k-conn)))))))
                     (mapcat deref) vec)
        committed (sort-by #(position-of (:reply %)) (filter #(= 200 (get-in % [:reply :status])) results))
        replay (vec (for [r committed]
                      (let [c (general #(reference/send c-name (:input r)))]
                        {:command (:command r) :k (receipt (:reply r)) :c (receipt c) :c-outcome (outcome c)
                         :equal (and (= 200 (:status c)) (= (receipt c) (receipt (:reply r))))})))
        refused (remove #(= 200 (get-in % [:reply :status])) results)
        touched (fn [r] (into (set (:entities r)) (:owners (:spec r))))
        justified (fn [r]
                    (or (not= [409 "CasConflict"] (:outcome r))
                        (some (fn [w] (and (> (position-of (:reply w)) (:source r))
                                           (seq (clojure.set/intersection (touched r) (touched w)))))
                              committed)))]
    {:saves (count results) :committed (count committed) :refused (count refused)
     :writers (frequencies (map :writer results)) :outcomes (frequencies (map :outcome results))
     :replay-differences (vec (take 5 (remove :equal replay)))
     :unjustified-refusals (vec (take 5 (for [r refused :when (not (justified r))]
                                          {:command (:command r) :outcome (:outcome r) :source (:source r) :owners (:owners (:spec r))})))
     :unjustified-count (count (remove justified refused))}))

(defn- refresh-model!
  "After a concurrent round, rebuild the generator's model from the control (equal to the candidate if no difference)."
  [g c-name c-conn]
  (let [db (d/db c-conn)
        owners (filter #(d/entid db [:triplex.entity/id %]) (concat @(:exists g) @(:pending g)))
        basis {"validAt" 5.0}]
    (reset! (:exists g) (set owners))
    (reset! (:model g) (into {} (for [o owners] [o (read-owner c-name o basis)])))))

;; ---------------------------------------------------------------- the run

(defn gen-state [seed acct]
  {:seed seed :acct acct :counter (atom (* seed 100000)) :model (atom {}) :exists (atom #{})
   :retired (atom []) :commands (atom []) :operations (atom []) :blocks (atom []) :refused-block (atom nil)
   :pending (atom #{}) :hot (atom [])})

(defn- seed-owners! [g c-name k-name n]
  (doseq [i (range n)]
    (let [o (str (:acct g) "/o" i)
          spec {:owners [o] :facts (vec (for [j (range 6)] {:owner o :field (str ":fz/f" j) :type :string :value (str "seed" i "|" j) :pred nil}))
                :retires [] :source 0 :block (assoc (wide/identity-block :wide (swap! (:counter g) inc)) :kind :wide)}
          [command input] (input-of g spec)]
      (assert (= [200 nil] (outcome (general #(reference/send c-name input)))))
      (assert (= [200 nil] (outcome (general #(reference/send k-name input)))))
      (swap! (:model g) record-commit spec input)
      (swap! (:exists g) conj o)
      (swap! (:commands g) conj command) (swap! (:operations g) conj command))))

(defn fuzz-run!
  "One fuzz run: a fresh control and candidate scope, `steps` serial saves, then `rounds` concurrent rounds."
  [seed steps rounds threads per-thread]
  (let [g (gen-state seed (str (if accounts? "acct/fa" "acct/fz") seed))
        rng (Random. seed)
        out (atom {:seed seed :serial 0 :modes {} :writers {} :outcomes {} :differences [] :deep 0 :deep-differences []
                   :races {} :declined {} :concurrent [] :faults {} :shadows {}})
        started (System/nanoTime)]
    (reference/in-scope
      (fn [c-name c-conn]
        (reference/in-scope
          (fn [k-name k-conn]
            ;; [DX-S6] Protected (and sealed) values: both scopes declare the same fields before the first save.
            (when protected-fields
              (doseq [n [c-name k-name]]
                (let [r (reference/route n "v1" "protection" {"attributes" protected-fields "sealed" (= "sealed" (System/getenv "S5_PROTECTED"))})]
                  (when-not (= 200 (:status r)) (throw (ex-info "protection failed" {:reply r}))))))
            (let [ctx {:c-name c-name :c-conn c-conn :k-name k-name :k-conn k-conn}
                  deep! (fn [label]
                          (let [db (d/db k-conn)
                                ids (vec (take 150 (shuffle-with rng (for [[_ fs] @(:model g) [_ {:keys [id]}] fs] id))))
                                ;; Every owner's stored datoms are compared; the read routes for up to 60 owners each time.
                sample (take 60 (shuffle-with rng (sort @(:exists g))))
                diff (deep-compare c-name c-conn k-name k-conn sample rng ids)]
                            (swap! out update :deep inc)
                            (when diff (swap! out update :deep-differences conj (assoc diff :at label)))
                            (println "DX-S5_DEEP" (json/write-str {:seed seed :at label :equal (nil? diff) :owners (count @(:exists g))
                                                                   :head (storage/head-position db)}))
                            diff))]
              (seed-owners! g c-name k-name 8)
              (loop [i 0]
                (when (< i steps)
                  (let [record! (fn [r]
                                  (swap! out (fn [o] (-> o (update :serial inc) (update-in [:modes (:mode r)] (fnil inc 0))
                                                         (update-in [:writers (or (:writer r) :none)] (fnil inc 0))
                                                         (update-in [:outcomes (str (:k r))] (fnil inc 0))
                                                         (cond-> (:declined r) (update-in [:declined (:declined r)] (fnil inc 0)))
                                                         (cond-> (:c-side r) (update-in [:faults (str [(:mode r) (:k r) (get-in r [:k-side :resolved]) (get-in r [:k-side :late]) (get-in r [:k-side :replay])])] (fnil inc 0)))
                                                         (cond-> (= :shadow (:mode r)) (update-in [:shadows (str [(:k r) (:committedWithOption r)])] (fnil inc 0)))
                                                         (cond-> (:kc r) (update-in [:races (str [(:kc-writer r) (:kc r) (:writer r) (:k r)])] (fnil inc 0))))))
                                  (when-not (:equal r)
                                    (swap! out update :differences conj (dissoc r :spec))
                                    (println "DX-S5_DIFFER" (pr-str (update r :spec #(select-keys % [:owners :new :faults :source]))))))
                        r (try (if (and faults? (chance rng (/ 1.0 7))) (fault-step! g rng ctx) (serial-step! g rng ctx))
                               (catch Throwable e {:equal false :error (str e) :mode :error}))
                        _ (when (and (= 503 (first (:k r))) (not (:c-side r)))
                            (println "DX-S5R2_UNKNOWN" (json/write-str {:where "serial save" :mode (:mode r) :faults (get-in r [:spec :faults])
                                                                        :owners (get-in r [:spec :owners]) :chain @last-unknown})))
                        _ (record! r)
                        s (when (and (:equal r) accounts? (chance rng 0.25))
                            (try (shadow-step! g rng ctx) (catch Throwable e {:equal false :error (str e) :mode :shadow-error})))
                        _ (when s (record! s))
                        x (when (and (:equal r) (or (nil? s) (:equal s)) (or transition? removals?))
                            (try (extra-step! g rng i steps ctx) (catch Throwable e {:equal false :error (str e) :mode :extra-error})))
                        _ (when x (record! x))
                        ok (and (:equal r) (or (nil? s) (:equal s)) (or (nil? x) (:equal x)))]
                    (when (and ok (pos? i) (zero? (mod i 400))) (deep! i))
                    (when ok (recur (inc i))))))
              (when (empty? (:differences @out)) (deep! "serial-end"))
              (when (empty? (:differences @out))
                (doseq [round (range rounds)]
                  (let [t (if (even? round) threads (max 2 (quot threads 2)))
                        res (concurrent-round! g (+ seed round 1) t per-thread ctx)]
                    (swap! out update :concurrent conj (assoc res :threads t))
                    (println "DX-S5_ROUND" (json/write-str (assoc res :seed seed :round round :threads t)))
                    (refresh-model! g c-name c-conn)
                    (deep! (str "round-" round)))))
              (println "DX-S5_FUZZ" (json/write-str (-> @out (update :differences #(vec (take 3 %)))
                                                        (assoc :seconds (/ (- (System/nanoTime) started) 1e9)
                                                               :concurrentSaves (reduce + (map :saves (:concurrent @out)))))))
              @out)))))))

(defn main
  "Entry point for s5/clj-run.sh: S5_SEEDS (comma-separated), S5_STEPS, S5_ROUNDS, S5_THREADS, S5_PER_THREAD."
  []
  (let [env (fn [k default] (Long/parseLong (or (System/getenv k) default)))
        seeds (map #(Long/parseLong %) (str/split (or (System/getenv "S5_SEEDS") "1") #","))
        runs (doall (for [s seeds] (fuzz-run! s (env "S5_STEPS" "2000") (env "S5_ROUNDS" "2") (env "S5_THREADS" "4") (env "S5_PER_THREAD" "150"))))
        bad (filter #(or (seq (:differences %)) (seq (:deep-differences %))
                         (some (fn [r] (seq (:replay-differences r))) (:concurrent %))) runs)]
    (println "DX-S5_RESULT" (json/write-str {:runs (count runs) :differing (count bad)
                                             :serial (reduce + (map :serial runs))
                                             :concurrent (reduce + (map (fn [r] (reduce + (map :saves (:concurrent r)))) runs))
                                             :unjustifiedRefusals (reduce + (map (fn [r] (reduce + (map :unjustified-count (:concurrent r)))) runs))
                                             :faultSteps (reduce + (for [r runs [m n] (:modes r) :when (str/starts-with? (name m) "fault-")] n))
                                             :shadowSaves (reduce + (for [r runs] (get-in r [:modes :shadow] 0)))
                                             :shadowsOfANoOneAccountClaim (reduce + (for [r runs] (get-in r [:modes :shadow-of-a-no-one-account-claim] 0)))
                                             :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))}))
    (shutdown-agents)
    (System/exit (if (empty? bad) 0 1))))

;; ---------------------------------------------------------------- the PostgreSQL stack (s5/stack-run.sh)
;; One container: PostgreSQL, a real transactor and several peer JVMs (each one write gateway). Setup seeds a control and
;; a candidate scope; two writer JVMs save into the candidate at once, logging each request before it is sent and each
;; answer after; the script kills one writer JVM mid-run and restarts the transactor; a fresh JVM resends every save
;; without a definite answer (same operation ID); a last JVM checks every answer against the stored operations and
;; replays every committed save on the control, in commit order, with the general writer.

(defn- stack-scope [label]
  (:db (main/create-scope! nil (json/write-str ["triplex-scope-v1" "test" "s5-stack" label 0]) "lean" true true)))

(defn stack-setup! [dir seed]
  (let [g (gen-state seed (str "acct/st" seed))
        c (stack-scope (str "control-" seed)) k (stack-scope (str "candidate-" seed))]
    (seed-owners! g c k 8)
    (spit (str dir "/scopes.edn")
          (pr-str {:control c :candidate k :seed seed :acct (:acct g) :exists (vec (sort @(:exists g)))
                   :pending (vec (for [i (range 8)] (str (:acct g) "/race" i)))
                   :head (storage/head-position (d/db (main/connection (main/db-uri k))))}))
    (println "DX-S5_STACK_SETUP" (json/write-str {:control c :candidate k}))))

(defn- jsonl-writer [path]
  (let [w (java.io.FileWriter. ^String path true)]
    (fn [m] (locking w (.write w (str (json/write-str m) "\n")) (.flush w)))))

(defn stack-writer! [dir label seed threads per-thread]
  (let [{:keys [candidate exists pending acct]} (read-string (slurp (str dir "/scopes.edn")))
        conn (main/connection (main/db-uri candidate))
        g (gen-state seed acct)
        log (jsonl-writer (str dir "/" label ".jsonl"))]
    (reset! (:exists g) (set exists))
    (reset! (:pending g) (set pending))
    (reset! (:hot g) (vec (take 6 (sort exists))))
    (println "DX-S5_STACK_WRITER" label "ready")
    (->> (range threads)
         (mapv (fn [t] (future
                         (let [rng (Random. (+ (* 1000003 seed) (* 7919 t)))]
                           (dotimes [_ per-thread]
                             (try
                               (let [{:keys [input command source]} (thread-input g rng candidate conn)
                                     op (get input "operationId")]
                                 (log {"kind" "sent" "label" label "operation" op "command" command "source" source "input" input})
                                 (let [reply (reference/send candidate input)]
                                   (log {"kind" "reply" "label" label "operation" op "status" (:status reply)
                                         "code" (get-in reply [:body "code"]) "position" (position-of reply)
                                         "message" (when (not= 200 (:status reply)) (some-> (get-in reply [:body "message"]) str (subs 0 (min 300 (count (str (get-in reply [:body "message"])))))))
                                         "recordedAt" (get-in reply [:body "recordedAt"]) "datoms" (get-in reply [:body "datoms"])
                                         "writer" (name (writer-kind conn op reply))})))
                               (catch Throwable e (log {"kind" "error" "label" label "error" (str e)}))))))))
         (run! deref))
    (println "DX-S5_STACK_WRITER" label "done")))

(defn- read-jsonl [dir]
  (doall (for [^java.io.File f (.listFiles (java.io.File. ^String dir)) :when (str/ends-with? (.getName f) ".jsonl")
               line (str/split-lines (slurp f)) :when (seq line)
               :let [m (try (json/read-str line) (catch Exception _ nil))] :when m]
           m)))

(defn- definite? [r]
  (or (= 200 (get r "status"))
      (and (#{400 409 413} (get r "status")) (not= "OutcomeUnknown" (get r "code")))))

(defn stack-resend! [dir]
  (let [{:keys [candidate]} (read-string (slurp (str dir "/scopes.edn")))
        records (read-jsonl dir)
        sent (into {} (for [r records :when (= "sent" (get r "kind"))] [(get r "operation") r]))
        replies (group-by #(get % "operation") (filter #(= "reply" (get % "kind")) records))
        unknown (vec (for [[op _] sent :when (not-any? definite? (get replies op))] op))
        log (jsonl-writer (str dir "/resend.jsonl"))
        outcomes (atom {})]
    (doseq [op unknown]
      (let [reply (reference/send candidate (get-in sent [op "input"]))]
        (swap! outcomes update (str (outcome reply)) (fnil inc 0))
        (log {"kind" "resend" "operation" op "status" (:status reply) "code" (get-in reply [:body "code"])
              "position" (position-of reply) "recordedAt" (get-in reply [:body "recordedAt"])})))
    (println "DX-S5_STACK_RESEND" (json/write-str {:sent (count sent) :withoutDefiniteAnswer (count unknown) :resendOutcomes @outcomes}))))

(defn stack-verify! [dir]
  (let [{:keys [control candidate head]} (read-string (slurp (str dir "/scopes.edn")))
        c-conn (main/connection (main/db-uri control)) k-conn (main/connection (main/db-uri candidate))
        _ @(d/sync k-conn)
        records (read-jsonl dir)
        sent (into {} (for [r records :when (= "sent" (get r "kind"))] [(get r "operation") r]))
        status (into {} (for [op (keys sent)] [op (reference/operation candidate op)]))
        pos (fn [o] (some-> (get-in o ["position" "v"]) str Long/parseLong))
        committed (vec (sort-by second (for [[op o] status :when (= "committed" (get o "status"))] [op (pos o) o])))
        k-head (storage/head-position (d/db k-conn))
        contiguous (= (map second committed) (range (inc head) (inc k-head)))
        answers (filter #(#{"reply" "resend"} (get % "kind")) records)
        lies (vec (for [r answers
                        :let [op (get r "operation") o (status op) done (= "committed" (get o "status"))]
                        :when (or (and (= 200 (get r "status")) (or (not done) (not= (get r "position") (pos o))))
                                  (and (= 409 (get r "status")) (= "OperationDuplicate" (get r "code")) (not done))
                                  (and (definite? r) (not= 200 (get r "status")) (not= "OperationDuplicate" (get r "code")) done
                                       (not-any? #(and (= op (get % "operation")) (= 200 (get % "status"))) answers)))]
                    (select-keys r ["operation" "kind" "status" "code" "position"])))
        replay (vec (for [[op p o] committed]
                      (let [c (general #(reference/send control (get-in sent [op "input"])))]
                        {:operation op :position p :control (position-of c) :outcome (outcome c)
                         :equal (and (= 200 (:status c)) (= p (position-of c)) (= (get-in c [:body "recordedAt"]) (get o "recordedAt")))})))
        owners (into #{} (comp (mapcat #(get-in % ["input" "entities"])) (filter #(d/entid (d/db k-conn) [:triplex.entity/id %])))
                     (vals sent))
        rng (Random. 5)
        diff (when (every? :equal replay)
               (deep-compare control c-conn candidate k-conn (take 80 (shuffle-with rng (sort owners))) rng []))
        result {:sent (count sent) :committed (count committed) :contiguous contiguous :head head :candidateHead k-head
                :answers (frequencies (map #(str (get % "kind") " " (get % "status") " " (get % "code")) answers))
                :writers (frequencies (keep #(get % "writer") answers))
                :errors (count (filter #(= "error" (get % "kind")) records))
                :lies lies :replayDifferences (vec (take 5 (remove :equal replay))) :deep diff}]
    (println "DX-S5_STACK_VERIFY" (json/write-str result))
    (and contiguous (empty? lies) (every? :equal replay) (nil? diff))))
