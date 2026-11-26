(ns s5-attack5
  "[DX-S5 fifth review] Attacks on the save line's answer to the fourth review (head 1d9fdee6c): the hash bar in
  Datomic's own terms and a later build with another general writer, the requests that change stored state without
  passing guard!, R4-2's account check through the compact row modes, and a command saved in an older build's window
  and again through this build. Reviewer's tests; they do not change the code under review. Each case prints one
  DX-S5R5_ATTACK line. Run by s5/clj-run3.sh (mode attack5) after s5/fuzz.clj, s5/attack3_gate.clj and
  s5/attack4_gate.clj (whose helpers it uses)."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.storage :as storage] [triplex.gateway.commit :as commit]
            [triplex.gateway.schema :as schema] [triplex.gateway.account-claims :as ac]
            [triplex.gateway.main :as main]
            [s5-fuzz :as fz] [s5-attack3 :as a3] [s5-attack4 :as a4] [wfix1-regression :as reference])
  (:import [java.io ByteArrayInputStream] [java.nio.charset StandardCharsets]))

(def only (some-> (System/getenv "S5_ONLY") (str/split #",") set))
(defn- run? [k] (or (nil? only) (contains? only k)))
(def counter @#'a3/counter)
(def save @#'a3/save)
(def seed! @#'a3/seed!)
(def cur @#'a3/cur)
(def protected! @#'a3/protected!)
(def erase! @#'a3/erase!)
(def writer-of @#'fz/writer-of)
(def fn-of @#'a4/fn-of)
(def working? @#'a4/working?)
(defn- turn-on! [conn] (with-redefs [ac/permitted? true] (ac/turn-on! conn)))
(defn- line [m] (println "DX-S5R5_ATTACK" (json/write-str m)))
(defn- with-account [input account] (cond-> input account (assoc "account" account)))
(defn- op [] (str "op5-" (swap! counter inc)))
(defn- scope-of [conn] (:e (first (d/datoms (d/db conn) :aevt :triplex.scope/key))))
(defn- scope-key [conn] (:v (first (d/datoms (d/db conn) :aevt :triplex.scope/key))))
(defn- recorded-hash [conn] (:v (first (d/datoms (d/db conn) :eavt (scope-of conn) :triplex.scope/commit-fn-hash))))
(def pred-on? (not= "0" (System/getenv "TX2_PREDECESSOR_LOOKUP")))
(def per-subject? (= "1" (System/getenv "TX2_SUBJECT_SAVE")))
(defn- outcome-of [f] (try (let [r @(f)] [:stored (some? r)]) (catch Exception e [:refused (subs (str (.getMessage e)) 0 (min 160 (count (str (.getMessage e)))))])))

;; ---------------------------------------------------------------- 1. the hash bar: a later build with another general writer

(deftest a-later-build-with-another-general-writer
  ;; A later build whose general writer differs (here: this build with its general writer's hash changed, the way any
  ;; later change to commit.clj changes it) opens the database and saves. With the setting absent it records its hash
  ;; and the per-subject writers keep taking saves. Under the setting this build never writes the hash and the bar
  ;; forbids it, while the one-owner, several-owners and creation writers and group application take a save only
  ;; when the recorded hash is the process's own (subject_save.clj 310, subject_owners.clj 156, subject_create.clj
  ;; 174, group_prepare.clj 149).
  (when (and (run? "later") per-subject?)
    (doseq [setting-on [false true]]
      (reference/in-scope
        (fn [name conn]
          (let [a (str "l" (swap! counter inc)) _ (seed! name conn a) S (str "acct/" a "/subject/s")
                kept (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
                _ (when setting-on (turn-on! conn))
                one (fn [v] (let [reply (kept #(reference/send name (with-account (save conn {:operation (op) :facts [{:owner S :field ":a/f0" :type :string :value v :pred (cur name S ":a/f0")}]}) a)))]
                              [(reference/outcome reply) (clojure.core/name (writer-of reply))]))
                before (one "before the later build")
                hash-before (recorded-hash conn)
                later "a-later-build-with-another-general-writer"
                opened (try (with-redefs [commit/source-hash later] (commit/install! conn (scope-key conn))) "opened"
                            (catch Exception e (str "refused: " (.getMessage e))))
                after (with-redefs [commit/source-hash later] (one "after the later build's open"))
                ;; The later build's own attempt to record its hash, as an install that wanted to.
                record (outcome-of #(d/transact conn [[:db/add (scope-of conn) :triplex.scope/commit-fn-hash later]]))
                r {:case "a later build whose general writer differs opens the database and saves" :settingOn setting-on
                   :before before :hashBefore hash-before :open opened :hashAfter (recorded-hash conn)
                   :barred (ac/hash-barred? (d/db conn)) :after after :recordItsHash record}]
            (line r)
            (is (= [[200 nil] "one-owner"] before))
            (is (= "one-owner" (second after)) [setting-on "a later build keeps the per-subject writer"])))))))

(deftest the-hash-bar-in-datomic-terms
  ;; What the predicate does and does not do: a new hash, the same hash again, this build's schema transaction, a
  ;; retraction of the hash datom, and a retraction of the predicate itself (any process with a peer connection);
  ;; then what restores it (a save of this build, an open of this build).
  (when (run? "bar")
    (reference/in-scope
      (fn [name conn]
        (let [a (str "b" (swap! counter inc)) _ (seed! name conn a) _ (turn-on! conn)
              scope (scope-of conn) recorded (recorded-hash conn)
              new-hash (outcome-of #(d/transact conn [[:db/add scope :triplex.scope/commit-fn-hash "another"]]))
              same-hash (outcome-of #(d/transact conn [[:db/add scope :triplex.scope/commit-fn-hash recorded]]))
              schema-tx (outcome-of #(d/transact conn schema/schema))
              barred-after-schema (ac/hash-barred? (d/db conn))
              unbar (outcome-of #(d/transact conn [[:db/retract :triplex.scope/commit-fn-hash :db.attr/preds ac/hash-bar]]))
              barred-after-unbar (ac/hash-barred? (d/db conn))
              ;; With the bar gone, an older build's open (body and hash in one transaction) goes through.
              old (@#'a4/other-bodies :load-profile)
              old-open (outcome-of #(d/transact conn [{:db/ident :triplex/commit :db/fn (fn-of (:code old))}
                                                      [:db/add scope :triplex.scope/commit-fn-hash (:hash old)]]))
              old-ident-working (boolean (working? (d/db conn) :triplex/commit))
              head-save (reference/outcome (reference/send name (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/h") :field ":a/f0" :type :string :value "h" :pred nil}]}) a)))
              after-save {:barred (ac/hash-barred? (d/db conn)) :oldIdentWorking (boolean (working? (d/db conn) :triplex/commit))}
              _ (main/create-scope! nil (scope-key conn) "lean" true true)
              after-open {:barred (ac/hash-barred? (d/db conn)) :oldIdentWorking (boolean (working? (d/db conn) :triplex/commit))}
              r {:case "the hash bar, in Datomic's terms" :newHash new-hash :sameHashAgain same-hash :schemaTransaction schema-tx
                 :barredAfterSchema barred-after-schema :retractThePredicate unbar :barredAfterRetraction barred-after-unbar
                 :olderOpenAfterRetraction old-open :oldIdentWorking old-ident-working :thisBuildsSave head-save
                 :afterThisBuildsSave after-save :afterThisBuildsOpen after-open}]
          (line r)
          (is (= :refused (first new-hash)))
          (is barred-after-schema)
          (is (:barred after-open) "an open of this build restores the bar"))))))

;; A database turned on before this pass (9f210018f: no bar) where, as that pass allowed, an older build under the load
;; profile opened after the transition and wrote its hash; then this build opens it: the bar goes on with the older
;; build's hash recorded, and this build's per-subject writers compare their own hash with it.
(deftest a-database-turned-on-before-the-bar
  (when (and (run? "frozen") per-subject?)
    (reference/in-scope
      (fn [name conn]
        (let [a (str "f" (swap! counter inc)) _ (seed! name conn a) S (str "acct/" a "/subject/s")
              _ (turn-on! conn)
              ;; 9f210018f's state: the setting and its guard, no bar.
              _ @(d/transact conn [[:db/retract :triplex.scope/commit-fn-hash :db.attr/preds ac/hash-bar]])
              old (@#'a4/other-bodies :load-profile)
              older-open (outcome-of #(d/transact conn [{:db/ident :triplex/commit :db/fn (fn-of (:code old))}
                                                        [:db/add (scope-of conn) :triplex.scope/commit-fn-hash (:hash old)]]))
              _ (main/create-scope! nil (scope-key conn) "lean" true true)
              reply (reference/send name (with-account (save conn {:operation (op) :facts [{:owner S :field ":a/f0" :type :string :value "after" :pred (cur name S ":a/f0")}]}) a))
              r {:case "a database turned on before the bar, an older build's open, then this build's open and save"
                 :olderOpen older-open :recordedIsTheOlderBuilds (= (:hash old) (recorded-hash conn)) :barred (ac/hash-barred? (d/db conn))
                 :oldIdentWorking (boolean (working? (d/db conn) :triplex/commit))
                 :thisBuildsSave [(reference/outcome reply) (clojure.core/name (writer-of reply))]}]
          (line r)
          (is (= "one-owner" (second (:thisBuildsSave r))) "this build keeps its per-subject writer"))))))

;; ---------------------------------------------------------------- 2. what passes guard!, and what does not

(defn- old-new-ident!
  "What an older build that has an ident the database did not hold writes on its open: a working writer under a new
  ident (here this build's own general body under a new variant name), without any hash."
  [conn ident]
  @(d/transact conn [{:db/ident ident :db/fn (fn-of commit/code)}]))

(defn- raw-route [name action ^String body]
  (let [{:keys [status]} (main/route-handler {:request-method :post :uri (str "/v1/db/" name "/" action)
                                              :body (ByteArrayInputStream. (.getBytes body StandardCharsets/UTF_8))})]
    status))

(deftest what-passes-guard
  ;; After an older build's working writer appears under a new ident, one request of each kind is sent to this build,
  ;; and the ident is read after it: guard! (storage.clj commit!) replaces it only on a save that reaches commit!.
  (when (run? "guard")
    (reference/in-scope
      (fn [name conn]
        (let [a (str "g" (swap! counter inc)) _ (protected! name) _ (seed! name conn a)
              S (str "acct/" a "/subject/s")
              ;; A protected value the removal below removes.
              _ (reference/send name (save conn {:operation (op) :facts [{:owner S :field ":p/secret" :type :string :value "secret" :pred nil}]}))
              _ (turn-on! conn)
              n (atom 0)
              step (fn [label send!]
                     (let [ident (keyword "triplex.write" (str "v-older" (swap! n inc)))
                           _ (old-new-ident! conn ident)
                           before (boolean (working? (d/db conn) ident))
                           answer (try (send!) (catch Exception e (str "threw " (.getMessage e))))]
                       {:request label :answer answer :workingBefore before :workingAfter (boolean (working? (d/db conn) ident))}))
              rows [(step "a claim lookup" #(:status (reference/route name "v1" "claim" {"commandId" "nothing" "account" a})))
                    (step "a row read" #(:status (reference/route name "v1" "read" {"entityIds" [S]})))
                    (step "a snapshot" #(:status (reference/route name "v1" "snapshot" {})))
                    (step "a fence" #(:status (reference/route name "v1" "fence" {"operationId" (op)})))
                    (step "a protection declaration" #(let [r (reference/route name "v1" "protection" {"attributes" [":p/secret" ":p/other"] "sealed" false})] [(:status r) (get-in r [:body "code"]) (get-in r [:body "message"])]))
                    (step "a removal on request" #(let [r (erase! name (str "rm5-" (swap! counter inc)) [{"entityId" S "attribute" ":p/secret"}])] [(:status r) (get-in r [:body "code"]) (get-in r [:body "message"])]))
                    (step "the settings route" #(with-redefs [ac/permitted? true] (:status (reference/route name "v1" "settings" {"accountIds" true}))))
                    (step "a transact request that is not JSON" #(raw-route name "transact" "this is not json"))
                    (step "a save refused by the account check" #(reference/outcome (reference/send name (with-account (save conn {:operation (op) :facts [{:owner "acct/zz/subject/x" :field ":a/f0" :type :string :value "x" :pred nil}]}) a))))
                    (step "a save" #(reference/outcome (reference/send name (with-account (save conn {:operation (op) :facts [{:owner (str "acct/" a "/subject/n") :field ":a/f0" :type :string :value "n" :pred nil}]}) a))))
                    (step "an open" #(do (main/create-scope! nil (scope-key conn) "lean" true true) "opened"))]]
          (doseq [r rows] (line (assoc r :case "an older build's writer under a new ident, then one request of this build")))
          (is (every? :workingBefore rows))
          (is (not (:workingAfter (last rows))))
          (is (not (:workingAfter (nth rows 9)))))))))

;; ---------------------------------------------------------------- 3. R4-2 through the compact row modes

(defn- json-start ^long [^String text]
  (let [id-len (Integer/parseInt text 1 5 16) p (+ 5 id-len 32) ref-len (Integer/parseInt text (int p) (int (+ p 4)) 16)]
    (+ p 4 ref-len 1)))
(defn- retext
  "The row text with its JSON body written again by `f` (the vector of columns -> the body's text)."
  [^String text f]
  (let [s (json-start text)] (str (subs text 0 s) (f (json/read-str (subs text s))))))
(defn- z1
  "The body compressed as slim.clj writes it (Z1, the UTF-16 code units deflated, base64), whatever its length."
  [^String body]
  (let [n (.length body) buffer (java.nio.ByteBuffer/allocate (* 2 n))
        _ (dotimes [i n] (.putChar buffer (.charAt body i)))
        out (java.io.ByteArrayOutputStream.)]
    (with-open [z (java.util.zip.DeflaterOutputStream. out (java.util.zip.Deflater. 1))] (.write z (.array buffer)))
    (str "Z1" (format "%08x" n) (.encodeToString (java.util.Base64/getEncoder) (.toByteArray out)))))

(def ^:private text-forms
  {"escaped slash (clojure.data.json's default)" #(json/write-str % :escape-slash true)
   "no escape" #(json/write-str % :escape-slash false)
   "the colon as \\u003a" #(str/replace (json/write-str % :escape-slash false) "\":subject/account\"" "\"\\u003asubject/account\"")
   "compressed body (Z1)" #(z1 (json/write-str % :escape-slash false))})

(defn- as-mode
  "The same save in another wire mode: fresh texts, the compact map (rowOrder and rowTexts), or the ordered frame."
  [input mode form]
  (let [ids (get input "newIds") texts (mapv #(retext (get-in input ["rowTexts" %]) form) ids)]
    (case mode
      "rows" input
      "freshTexts" (-> input (dissoc "rows" "newIds" "rowTexts" "rowOrder") (assoc "rowMode" "texts" "freshTexts" texts))
      "compact" (-> input (assoc "rowMode" "texts" "rowOrder" ids "rowTexts" (zipmap ids texts) "rows" []))
      "ordered" (-> input (dissoc "newIds") (assoc "rowMode" "texts" "rowOrder" "assertions-first-v1" "rowTexts" texts "rows" [])))))

(deftest r4-2-through-the-compact-row-modes
  ;; A request naming A gives a new entity whose ID names no account the value B for :subject/account, in each wire
  ;; mode the gateway accepts, with the row's text written in each form JSON allows.
  (when (run? "r42")
    (doseq [setting-on [true false]
            mode ["rows" "freshTexts" "compact" "ordered"]
            [form-label form] (sort text-forms)
            :when (or (not= mode "rows") (= form-label "no escape"))]
      (reference/in-scope
        (fn [name conn]
          (when setting-on (turn-on! conn))
          (let [A "a50" B "b50" kept (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
                planted (str "x/planted5-" (swap! counter inc))
                input (as-mode (with-account (save conn {:operation (op) :facts [{:owner planted :field ":subject/account" :type :string :value B :pred nil}]}) A) mode form)
                reply (kept #(reference/send name input))
                pa (requiring-resolve 'triplex.gateway.group/persisted-account)
                account (pa (d/db conn) planted)
                b-writes (kept #(reference/send name (with-account (save conn {:operation (op) :facts [{:owner planted :field ":a/f" :type :string :value "by b" :pred nil}]}) B)))
                r {:case "a request naming A gives an entity B's account" :settingOn setting-on :mode mode :textForm form-label
                   :save (reference/outcome reply) :storedAccount account :thenBWritesIt (reference/outcome b-writes)}]
            (line r)
            (is (not= B account) [setting-on mode form-label "a request naming A must not make an entity B's"])))))))

;; R4-2 through the compact row modes in the frames the general writer takes: an import frame and a settlement frame.
(deftest r4-2-in-import-and-settlement-frames
  (when (run? "r42frames")
    (doseq [klass ["import" "activation"] setting-on [true false]]
      (reference/in-scope
        (fn [name conn]
          (when setting-on (turn-on! conn))
          (let [A "a51" B "b51" kept (fn [f] (if setting-on (f) (with-redefs [ac/permitted? false] (f))))
                planted (str "x/planted51-" (swap! counter inc))
                input (-> (with-account (save conn {:operation (op) :facts [{:owner planted :field ":subject/account" :type :string :value B :pred nil}]}) A)
                          (as-mode "freshTexts" #(json/write-str % :escape-slash true))
                          (assoc "writeClass" klass))
                reply (kept #(fz/general (fn [] (reference/send name input))))
                account ((requiring-resolve 'triplex.gateway.group/persisted-account) (d/db conn) planted)
                r {:case "a frame naming A gives an entity B's account (fresh texts, escaped slash)" :writeClass klass :settingOn setting-on
                   :save (reference/outcome reply) :storedAccount account}]
            (line r)
            (is (not= B account) [klass setting-on "a frame naming A must not make an entity B's"])))))))

;; ---------------------------------------------------------------- 4. a command saved in the window, then through this build

(deftest a-command-saved-in-the-window-and-again
  ;; An older build's writer under a new ident commits a save of account A's entities under command C (a plain claim,
  ;; after the setting). The account's own client then sends command C through this build (a new attempt, a new
  ;; operation ID, as an application resends a command). A command is committed once; R4-5's fix makes a plain claim
  ;; after the setting no account's, so this asks whether C is now committed twice.
  (when (and (run? "twice") pred-on?)
    (reference/in-scope
      (fn [name conn]
        (let [a (str "w" (swap! counter inc)) _ (seed! name conn a) _ (turn-on! conn)
              ident :triplex.write/v-older-window
              _ (old-new-ident! conn ident)
              C (str "cmd5-" (swap! counter inc))
              old-input (save conn {:command C :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f0" :type :string :value "through the older build" :pred nil}]})
              old (with-redefs [ac/on? (constantly false) ac/permitted? false commit/variants (assoc commit/variants [true false] [ident nil])]
                    (fz/general #(reference/send name old-input)))
              plain (d/entid (d/db conn) [:triplex.claim/command-id C])
              again (reference/send name (with-account (save conn {:command C :operation (op) :facts [{:owner (str "acct/" a "/subject/c") :field ":a/f1" :type :string :value "through this build" :pred nil}]}) a))
              scoped (d/entid (d/db conn) [:triplex.claim/command-id (ac/encode a C)])
              lookup (:body (reference/route name "v1" "claim" {"commandId" C "account" a}))
              r {:case "a command committed through an older build's window, then sent again through this build"
                 :olderBuild (reference/outcome old) :plainClaim (some? plain) :thisBuild (reference/outcome again)
                 :scopedClaim (some? scoped) :committedTwice (and (some? plain) (some? scoped)) :accountsLookup (get lookup "txId")
                 :olderIdentWorkingAfter (boolean (working? (d/db conn) ident))}]
          (line r)
          (is (= [200 nil] (:olderBuild r)) "the window's save is stored (the setup)")
          (is (not (:committedTwice r)) "a command must not be committed twice"))))))

(defn main []
  (let [res (clojure.test/run-tests 's5-attack5)]
    (println "DX-S5R5_RESULT" (json/write-str {:test (:test res) :pass (:pass res) :fail (:fail res) :error (:error res)
                                              :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv)))}))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail res) (:error res))) 0 1))))
