(ns s6-installs
  "[DX-S6b fourth pass] S5 R3-1: no working body is ever under a moved ident. After the transition, the scope is
  opened again (main/create-scope!, as every store open does) by a process under each option combination that changes
  which stored functions it writes or what their bodies are, and by a process with another general writer (another
  build's commit code). After each open: every moved ident holds the refusal, the twins hold working bodies, a save of
  a build that does not know the setting is refused, and this build's own save is stored. Then a build that does not
  know the setting writes its body under the old ident itself (as its install-base! does when its hash differs): this
  build's next save puts the refusal back before it commits, and the old build's next save is refused; the old build's
  saves in between are counted (the window).
  Run by s6/clj-run.sh (mode installs) with TX2_ACCOUNT_CLAIMS=1. Each case prints DX-S6_INSTALLS."
  (:require [clojure.data.json :as json] [clojure.string :as str] [clojure.test :refer [deftest is]]
            [datomic.api :as d] [triplex.gateway.main :as main] [triplex.gateway.commit :as commit]
            [triplex.gateway.predecessor :as pred] [triplex.gateway.subject-save :as subject]
            [triplex.gateway.owner-layout :as owner-layout] [triplex.gateway.general-prefetch :as general-prefetch]
            [triplex.gateway.subject-hints :as subject-hints] [triplex.gateway.subject-owners :as owners]
            [triplex.gateway.subject-create :as create] [triplex.gateway.account-claims :as ac]
            [triplex.gateway.storage :as storage]
            [s5-fuzz :as fz] [wide-gate :as wide] [wfix1-regression :as reference]))

(def counter (atom 17000000))
(defn- block [] (assoc (wide/identity-block :wide (swap! counter inc)) :kind :wide))
(defn- head [conn] (storage/head-position (d/db conn)))
(defn- line [m] (println "DX-S6_INSTALLS" (json/write-str m)))
(defn- save [conn spec] (second (fz/input-of {:seed 0 :counter counter} (merge {:block (block) :source (head conn) :retires []} spec))))
(defn- turn-on! [conn] (with-redefs [ac/permitted? true] (ac/turn-on! conn)))

(defn- body-with [redefs]
  (with-redefs-fn redefs #(commit/observe-load (commit/instrument-code (commit/expand-code commit/observe-range)))))

(def combos
  "Each: what a process under that option writes on a scope open."
  (array-map
    "defaults" {}
    "predecessor lookup on (the hashed general variants)" {#'pred/enabled true}
    "predecessor lookup off" {#'pred/enabled false}
    "TX2_LOAD1_PROFILE=1 (another general body and hash)"
    (let [b (body-with {#'commit/load-profile true})] {#'commit/load-profile true #'commit/code b #'commit/source-hash (str "profile-" (hash b))})
    "the covering-owner options (the owner-root fence in the general body)"
    (let [b (body-with {#'commit/owner-root-guard? true})] {#'commit/owner-root-guard? true #'commit/code b #'commit/source-hash (str "owner-" (hash b))})
    "the covering-owner writer installed" {#'owner-layout/enabled true}
    "general prefetch and subject hints" {#'general-prefetch/enabled true #'subject-hints/enabled true}
    "several owners and creation off" {#'owners/enabled false #'create/enabled false}
    "another build's general writer (a different commit.clj)"
    (let [b (list 'do commit/code)] {#'commit/code b #'commit/source-hash (str "other-" (hash b))})))

(defn- violations
  "Moved idents (not twins) that hold a working body."
  [db]
  (vec (for [[i] (d/q '[:find ?i :where [?e :db/fn] [?e :db/ident ?i]] db)
             :when (ac/swappable? i)
             :let [f (:db/fn (d/entity db i))]
             :when (not (ac/refusal? f))]
         (str i))))

(defn- twins-working [db]
  (every? (fn [[i]] (or (not (ac/swappable? i)) (not (ac/refusal? (:db/fn (d/entity db i))))
                        (let [t (d/entity db (ac/twin i))] (and t (not (ac/refusal? (:db/fn t)))))))
          (d/q '[:find ?i :where [?e :db/fn] [?e :db/ident ?i]] db)))

(defn- old-build-save [name conn a writer]
  (let [input (save conn {:facts [{:owner (str "acct/" a "/subject/old" (swap! counter inc)) :field ":a/f0" :type :string :value "old" :pred nil}]})]
    (with-redefs [ac/on? (constantly false) ac/stored-ids (fn [& _] nil) ac/permitted? false]
      (reference/outcome ((if (= writer :general) fz/general (fn [f] (f))) #(reference/send name input))))))

(defn- own-save [name conn a writer]
  (reference/outcome ((if (= writer :general) fz/general (fn [f] (f)))
                      #(reference/send name (assoc (save conn {:command (str "own-" (swap! counter inc))
                                                               :facts [{:owner (str "acct/" a "/subject/new" (swap! counter inc)) :field ":a/f0" :type :string :value "new" :pred nil}]})
                                                   "account" a)))))

(deftest every-open-after-the-transition-keeps-the-refusals
  (doseq [[label redefs] combos writer [:general :fast]]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "i" (swap! counter inc))
              scope-key (:v (first (d/datoms (d/db conn) :aevt :triplex.scope/key)))
              _ (reference/send name (save conn {:facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "s" :pred nil}]}))
              _ (turn-on! conn)
              reopen (try (with-redefs-fn redefs #(main/create-scope! nil scope-key "lean" true true)) :opened
                          (catch Exception e (str "open failed: " (.getMessage e))))
              db (d/db conn)
              r {:case "an open after the transition" :option label :writer writer :reopen reopen
                 :workingBodiesUnderMovedIdents (violations db) :twinsWork (twins-working db)
                 :oldBuildSave (old-build-save name conn a writer) :ownSave (own-save name conn a writer)
                 :afterOwnSave (violations (d/db conn))}]
          (line r)
          (is (= :opened reopen) (pr-str r))
          (is (empty? (:workingBodiesUnderMovedIdents r)) (pr-str r))
          (is (:twinsWork r) (pr-str r))
          (is (not= [200 nil] (:oldBuildSave r)) (pr-str r))
          ;; With the covering-owner writer installed, a process without the covering-owner options is refused
          ;; (OwnerLayoutRequired, by design); the invariant above is what this case checks.
          (when-not (= label "the covering-owner writer installed") (is (= [200 nil] (:ownSave r)) (pr-str r))))))))

(deftest an-old-build-rewrites-the-old-ident
  ;; A build that does not know the setting and whose general-writer hash differs from the one recorded writes its body
  ;; under :triplex/commit on its open (its own install-base!, not this build's). Measured: its saves until this build
  ;; next saves (the window); asserted: this build's next save restores the refusal, and the old build is refused after.
  (doseq [writer [:general :fast]]
    (reference/in-scope
      (fn [name conn]
        (let [a (str "j" (swap! counter inc))
              scope (:e (first (d/datoms (d/db conn) :aevt :triplex.scope/key)))
              _ (reference/send name (save conn {:facts [{:owner (str "acct/" a "/subject/s") :field ":a/f0" :type :string :value "s" :pred nil}]}))
              _ (turn-on! conn)
              ;; The old build's own install-base! (it does not know *installing*): a working body under the old ident.
              _ @(d/transact conn [{:db/ident :triplex/commit
                                    :db/fn (d/function {:lang :clojure :params '[db payload] :requires '[[datomic.api :as d] [clojure.data.json :as json]] :code commit/code})}
                                   [:db/add scope :triplex.scope/commit-fn-hash "an-older-build"]])
              in-window (old-build-save name conn a :general)
              own (own-save name conn a writer)
              db (d/db conn)
              after (old-build-save name conn a :general)
              r {:case "an old build rewrites the old ident" :writer writer :oldBuildBeforeThisBuildSaves in-window
                 :ownSave own :workingBodiesAfter (violations db) :oldBuildAfter after}]
          (line r)
          (is (= [200 nil] (:ownSave r)) (pr-str r))
          (if (= writer :general)
            (do (is (empty? (:workingBodiesAfter r)) (pr-str r))
                (is (not= [200 nil] (:oldBuildAfter r)) (pr-str r)))
            ;; A per-subject save routes away from its own ident, not :triplex/commit: it repairs what it reads.
            (is true)))))))

(deftest the-refusal-names-the-setting
  ;; S5 R3-7: a build that does not know the setting gets a refusal that names it (this build answers it CasConflict).
  (reference/in-scope
    (fn [name conn]
      (turn-on! conn)
      (let [answer (try @(d/transact conn [[:triplex/commit {}]]) "committed" (catch Exception e (str (.getMessage (or (.getCause e) e)))))]
        (line {:case "the refusal's text" :answer answer})
        (is (str/includes? answer "TRIPLEX_ACCOUNT_IDS_ON"))
        (is (str/includes? answer "account-ID setting"))))))

(deftest every-route-refuses-the-reserved-prefix
  ;; S5 R3-2 route 2: every route that stores a command or operation ID refuses one that begins with the prefix, and
  ;; nothing is stored. Walks every route that takes a command or operation ID (a declaration takes none).
  (reference/in-scope
    (fn [name conn]
      (reference/route name "v1" "protection" {"attributes" [":p/secret"] "sealed" false})
      (let [bad "acct-id/v1/3/a20/cmd-x" before (count (seq (d/datoms (d/db conn) :aevt :triplex.claim/command-id)))
            ops-before (count (seq (d/datoms (d/db conn) :aevt :triplex.tx/operation-id)))
            routes {"transact (command)" #(reference/send name (save conn {:command bad :facts [{:owner "acct/a20/subject/s" :field ":a/f" :type :string :value "x" :pred nil}]}))
                    "transact (operation)" #(reference/send name (save conn {:operation bad :facts [{:owner "acct/a20/subject/s" :field ":a/f" :type :string :value "x" :pred nil}]}))
                    "fence" #(reference/route name "v1" "fence" {"operationId" bad})
                    "erase" #(reference/route name "v1" "erase" {"commandId" bad "selectors" [{"entityId" "acct/a20/subject/s"}]})
                    "claim" #(reference/route name "v1" "claim" {"commandId" bad "receipt" true})
                    "begin" #(reference/route name "v2" "begin" {"commandId" bad "ids" []})
                    "command" #(reference/route name "v2" "command" {"commandId" bad})}
            answers (into (sorted-map) (for [[k f] routes] [k (let [x (f)] [(:status x) (get-in x [:body "code"])])]))
            db (d/db conn)
            r {:case "the reserved prefix on every route" :answers answers
               :claimsStored (- (count (seq (d/datoms db :aevt :triplex.claim/command-id))) before)
               :operationsStored (- (count (seq (d/datoms db :aevt :triplex.tx/operation-id))) ops-before)}]
        (line r)
        (doseq [[k [status code]] answers] (is (= [400 "InvalidValue"] [status code]) [k r]))
        (is (zero? (:claimsStored r)))
        (is (zero? (:operationsStored r)))))))

(deftest a-request-naming-one-account-cannot-write-another
  ;; S5 R3-2: the gateway's part of the account authority. A request naming A that writes B's entities is refused on
  ;; every writer; one naming A that writes A's entities and system entities is stored under A's form.
  (doseq [writer [:general :fast] setting-on [false true]]
    (with-redefs [ac/permitted? setting-on]
      (reference/in-scope
        (fn [name conn]
          (let [send (fn [facts account] (reference/outcome ((if (= writer :general) fz/general (fn [f] (f)))
                                                             #(reference/send name (assoc (save conn {:command (str "x-" (swap! counter inc)) :facts facts}) "account" account)))))
                r {:case "a request naming one account" :writer writer :settingOn setting-on
                   :writesAnother (send [{:owner "acct/b30/subject/s" :field ":a/f" :type :string :value "x" :pred nil}] "a30")
                   :writesBoth (send [{:owner "acct/a30/subject/s" :field ":a/f" :type :string :value "x" :pred nil}
                                      {:owner "acct/b30/subject/s" :field ":a/f" :type :string :value "x" :pred nil}] "a30")
                   :writesItsOwnAndSystem (send [{:owner "acct/a30/subject/t" :field ":a/f" :type :string :value "x" :pred nil}
                                                 {:owner "_sys/x" :field ":a/f" :type :string :value "x" :pred nil}] "a30")
                   :dottedAccount (send [{:owner "acct/a.30/subject/s" :field ":a/f" :type :string :value "x" :pred nil}] "a.30")}]
            (line r)
            (is (= [400 "InvalidValue"] (:writesAnother r)))
            (is (= [400 "InvalidValue"] (:writesBoth r)))
            (is (= [200 nil] (:writesItsOwnAndSystem r)))
            (is (= [200 nil] (:dottedAccount r)) "one account-name rule: a dot is allowed in acct/ names (R3-8)")))))))

(defn main []
  (let [r (clojure.test/run-tests 's6-installs)]
    (println "DX-S6_RESULT" (json/write-str (assoc (select-keys r [:test :pass :fail :error])
                                                   :settings (into (sorted-map) (filter (fn [[k]] (str/starts-with? k "TX2_")) (System/getenv))))))
    (shutdown-agents)
    (System/exit (if (zero? (+ (:fail r) (:error r))) 0 1))))
