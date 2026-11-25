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
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.set]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.main :as main]
            [triplex.gateway.selftest :as rows]
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

(defn- typed-row [r {:keys [type value]}]
  (case type
    :ref (assoc r :value_type "ref" :value_string value)
    :number (assoc r :value_type "number" :value_number (double value))
    (assoc r :value_type "string" :value_string value)))

(defn- change-value [{:keys [type value]}]
  (case type :ref {"type" "ref" "value" value} :number {"type" "number" "value" (double value)} {"type" "string" "value" value}))

(defn frame
  "One save as the SDK frames it. facts: {:owner :field :value :type :pred}; retires: {:owner :field :pred} where
  :frame-owner (default :owner) is the entity the retired row is framed on. :pred is the current {:id :value :type}."
  [{:keys [command operation block facts retires source entities claim-tx scope-wide]}]
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
                    (conj (assoc (j ":_tx/command-id") :value_string command))
                    (into (map (fn [c] (assoc (j ":_tx/change") :value_type "json" :value_json (json/write-str c))) changes)))
        fresh (into business journal)]
    (rows/row-input
      {"sourceK" source "span" 1 "position" 1 "scopeWide" (boolean scope-wide) "entities" (vec (or entities written))
       "operationId" (or operation command) "rows" (mapv storage/wire-row (into fresh old)) "newIds" (mapv :id fresh)
       "claims" [{"commandId" command "txId" (or claim-tx tx) "timestamp" 1000.0}]})))

;; ---------------------------------------------------------------- generator

(def ^:private strings
  ["a" "é" "é" "🧭x" " line" "q\"uote\\" "</script>" "tab\tnl\n" "日本語" "  padded  " "0" "null"
   "-0" "{\"json\":1}" (apply str (repeat 700 "z")) "Ω≈ç√∫" "\u0000nul" "/slash/"])

(defn- pick [^Random rng xs] (nth xs (.nextInt rng (count xs))))
(defn- chance [^Random rng p] (< (.nextDouble rng) p))
(defn- between [^Random rng lo hi] (+ lo (.nextInt rng (inc (- hi lo)))))

(defn- value [^Random rng g owners-pool ref-rate]
  (let [r (.nextDouble rng)]
    (cond
      (< r ref-rate) {:type :ref :value (pick rng owners-pool)}
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
      (and (< r 0.3) (<= total 256)) (assoc (wide/identity-block :narrow n) :kind :narrow)
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
                      {:facts (vec (for [i (range (between rng 1 (if big? 70 8)))]
                                     (merge {:owner o :field (str ":fz/f" i) :pred nil} (value rng g pool ref-rate))))
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

(defn input-of [g spec]
  (let [command (or (:command spec) (str "fz" (:seed g) "-" (swap! (:counter g) inc)))]
    [command (frame {:command command :operation (:operation spec) :block (:block spec) :facts (:facts spec)
                     :retires (:retires spec) :source (:source spec) :entities (:entities spec)
                     :scope-wide (contains? (:faults spec) :scope-wide)})]))

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
                 :type (case vt "ref" :ref "number" :number :string)
                 :value (case vt "number" (get-in row ["value_number" "v"]) (get-in row ["value_string" "v"]))}]))))

;; ---------------------------------------------------------------- comparison

(def canon-attrs [:triplex.entity/id :triplex.entity/row :triplex.entity/retired :triplex.entity/rev
                  :triplex.claim/command-id :triplex.claim/tx-id :triplex.claim/tx
                  :triplex.tx/position :triplex.tx/id :triplex.tx/operation-id :triplex.tx/recorded-at
                  :triplex.tx/max-recorded-at :triplex.tx/journals :triplex.journal/position
                  :triplex.scope/feed-irregular :triplex.scope/irregular :triplex.scope/position-regular])

(defn canon
  "Every datom ever asserted or retracted of the attributes above, entities named by public ID (claims by command,
  transactions by position), as a sorted vector."
  [conn]
  (let [db (d/db conn) h (d/history db)
        scope-e (:e (first (d/datoms db :aevt :triplex.scope/key)))
        named (fn [e]
                (or (some-> (first (d/datoms db :eavt e :triplex.entity/id)) :v (->> (str "E:")))
                    (some-> (first (d/datoms db :eavt e :triplex.claim/command-id)) :v (->> (str "C:")))
                    (some-> (first (d/datoms db :eavt e :triplex.tx/position)) :v (->> (str "T@")))
                    (when (= e scope-e) "SCOPE")
                    (str "?" (d/ident db e) e)))
        ref? #{:triplex.claim/tx :triplex.tx/journals}]
    (vec (sort (for [a canon-attrs :when (d/entid db a) dt (d/datoms h :aevt a)
                     :let [tx (named (:tx dt))] :when (str/starts-with? tx "T@")]
                 (pr-str [(named (:e dt)) a (if (ref? a) (named (:v dt)) (:v dt)) (:added dt) tx]))))))

(defn- first-difference [a b]
  (let [sa (set a) sb (set b)]
    {:only-control (take 5 (remove sb a)) :only-candidate (take 5 (remove sa b))
     :control (count a) :candidate (count b)}))

(defn deep-compare
  "Compare stored datoms (unless markers differ by design) and every read route; returns nil or a difference."
  [c-name c-conn k-name k-conn owners ^Random rng ids-sample]
  (let [head (storage/head-position (d/db c-conn))
        khead (storage/head-position (d/db k-conn))]
    (if (not= head khead)
      {:what "head" :control head :candidate khead}
      (let [datoms? (not subject/append-retirement?)
            cc (when datoms? (canon c-conn)) kc (when datoms? (canon k-conn))]
        (if (and datoms? (not= cc kc))
          {:what "datoms" :difference (first-difference cc kc)}
          (let [positions (vec (sort (distinct (concat (range (max 1 (- head 4)) (inc head))
                                                       (repeatedly 6 #(inc (.nextInt rng (max 1 head))))))))
                os (vec (sort owners))
                expected (wide/product-reads c-name c-conn os positions)
                actual (wide/product-reads k-name k-conn os positions)
                differing (vec (for [key (keys expected) :when (not= (get expected key) (get actual key))] key))]
            (cond
              (seq differing) {:what "routes" :routes differing
                               :sample (let [key (first differing)
                                             e (get expected key) a (get actual key)]
                                         (if (map? e)
                                           (first (for [[x v] e :when (not= v (get a x))] {:at x :control v :candidate (get a x)}))
                                           {:control (take 3 e) :candidate (take 3 a)}))}
              (not= (wide/by-id-reads c-name ids-sample) (wide/by-id-reads k-name ids-sample)) {:what "by-id"}
              :else nil)))))))

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

(defn- receipt [reply] (select-keys (:body reply) ["position" "recordedAt" "datoms" "operationId"]))
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
        spec (case mode
               :same-command (if-let [c (some-> @(:commands g) seq vec (->> (pick rng)))]
                               (assoc spec :command c :operation (str c "/again-" (swap! (:counter g) inc))) spec)
               :same-operation (if-let [o (some-> @(:operations g) seq vec (->> (pick rng)))] (assoc spec :operation o) spec)
               :reuse-block (if-let [b (some-> @(:blocks g) seq vec (->> (pick rng)))] (assoc spec :block b) spec)
               :reuse-refused-block (if-let [b @(:refused-block g)] (assoc spec :block b) spec)
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
                            (let [op (reference/operation k-name operation)]
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
  (let [g (gen-state seed (str "acct/fz" seed))
        rng (Random. seed)
        out (atom {:seed seed :serial 0 :modes {} :writers {} :outcomes {} :differences [] :deep 0 :deep-differences []
                   :races {} :declined {} :concurrent []})
        started (System/nanoTime)]
    (reference/in-scope
      (fn [c-name c-conn]
        (reference/in-scope
          (fn [k-name k-conn]
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
                  (let [r (try (serial-step! g rng ctx)
                               (catch Throwable e {:equal false :error (str e) :mode :error}))]
                    (swap! out (fn [o] (-> o (update :serial inc) (update-in [:modes (:mode r)] (fnil inc 0))
                                           (update-in [:writers (:writer r)] (fnil inc 0))
                                           (update-in [:outcomes (str (:k r))] (fnil inc 0))
                                           (cond-> (:declined r) (update-in [:declined (:declined r)] (fnil inc 0)))
                                           (cond-> (:kc r) (update-in [:races (str [(:kc-writer r) (:kc r) (:writer r) (:k r)])] (fnil inc 0))))))
                    (if-not (:equal r)
                      (do (swap! out update :differences conj (dissoc r :spec))
                          (println "DX-S5_DIFFER" (pr-str (update r :spec #(select-keys % [:owners :new :faults :source])))))
                      (when (and (pos? i) (zero? (mod i 250))) (deep! i)))
                    (when (:equal r) (recur (inc i))))))
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
