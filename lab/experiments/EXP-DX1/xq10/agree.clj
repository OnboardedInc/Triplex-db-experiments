(ns xq10-agree
  "[DX-XQ10] The agreement gate between the two routes of questions across subjects, on the index gate's own toy world
  (xq4/gate.clj, loaded first): the commit-time index (`find`, TX2_CROSS_INDEX=1) against the exact sweep (`sweep`,
  TX2_SWEEP=1, TX2_SWEEP_SHAPES=all), two independent paths in one gateway JVM through the real route handler.
    edge   an account of edge values written in three commits (negative zero, ties, several values of one attribute,
           repeated values, no value, values of another family, json, long and odd texts, big integers, references to
           another account, valid intervals that open and close exactly at the gate's valid times)
    agree  every question both routes accept, at 3 positions x 3 valid times, on the edge account and the big world's
           acc-a: ids (in order), counts, counts per value (with the no-value group), projections; and the index's
           value order beside the sweep's top N (information: the SDK never sends a top N to the index)
    table  every shape and condition sent once to each route: accepted or refused, with code and fallback
  Counts and differences are the result; nothing here is timed."
  (:require [clojure.data.json :as json] [clojure.java.io :as io] [clojure.set :as set] [clojure.string :as str]
            [datomic.api :as d] [xq4-gate :as g])
  (:import [java.util Random]))

(def acct "acc-e")
(def va (+ g/v0 (* 50 g/day)))
(def vb (+ g/v0 (* 100 g/day)))
(def vc 1.79e12)
(def valid-times [va vb vc])

(def strings ["" "a" "a\u0000" "a\u0001b" "\u0002" "é" "é" "😀" "" "￿" "Z" "zz" g/long-a g/long-b
              (str g/long-a "!") "pending" "Pending"])
(def numbers [-0.0 0.0 1.5 -2.25 1.0E-300 -1.0E300 0.1 0.30000000000000004 3.0 Double/MAX_VALUE Double/MIN_VALUE 1.5])
(def integers ["0" "7" "7" "-1" "123456789012345678901234567890" "-123456789012345678901234567890"
               "9223372036854775807" "9223372036854775808" "-9223372036854775809"])
(def datetimes [g/v0 g/v0 (+ g/v0 1.0) -1.0 0.0 -0.0 vb (+ vb 1.0)])
(def statuses ["pending" "complete" "blocked" "" "Pending"])

(defn- pick [xs n k] (nth xs (mod (+ (* 7 n) k) (count xs))))
(defn- interval [n]
  ;; valid from v0 forever; from vb (not yet valid at va); [v0, vb) (no longer valid at vb, exactly)
  (case (int (mod n 3)) 0 {:from g/v0} 1 {:from vb} 2 {:from g/v0 :to vb}))

(defn- edge-facts [n]
  (let [s (g/subj acct n) t (g/task acct n 0) p (g/prof acct n) iv (interval n)
        id (fn [& xs] (str "e-" n "-" (str/join "-" xs)))
        many (fn [attr e family values k etype]
               ;; one value; a second, different one on n%5=0; the same one twice on n%7=0; none on n%11=0
               (when-not (zero? (mod n 11))
                 (concat [[(id attr "1") e attr [family (pick values n k)] (assoc iv :etype etype)]]
                         (when (zero? (mod n 5)) [[(id attr "2") e attr [family (pick values n (+ k 3))] (assoc iv :etype etype)]])
                         (when (zero? (mod n 7)) [[(id attr "3") e attr [family (pick values n k)] (assoc iv :etype etype)]]))))]
    (concat
      (cond (zero? (mod n 13)) [[(id "cs" "int") s ":person/custom-start" ["integer" "5"] (assoc iv :etype "Subject")]]
            (zero? (mod n 17)) [[(id "cs" "json") s ":person/custom-start" ["json" "{\"x\":1}"] (assoc iv :etype "Subject")]]
            :else (many ":person/custom-start" s "string" strings 0 "Subject"))
      [[(id "name") s ":person/name" ["string" (str "Edge " n)] {:from g/v0 :etype "Subject"}]
       [(id "link") s ":placement/task" ["ref" t] {:from g/v0 :etype "Subject"}]]
      (when-not (zero? (mod n 11))
        [[(id "prof") s ":person/profile" ["ref" (if (zero? (mod n 4)) (g/prof "acc-a" n) p)] (assoc iv :etype "Subject")]])
      (many ":person/custom-background" p "string" strings 5 "Profile")
      (many ":task/status" t "string" statuses 0 "Review")
      (many ":task/progress" t "integer" integers 1 "Review")
      (if (zero? (mod n 19))
        [[(id "score" "int") t ":task/score" ["integer" "3"] (assoc iv :etype "Review")]]
        (many ":task/score" t "number" numbers 2 "Review"))
      (many ":task/due" t "datetime" datetimes 3 "Review")
      (many ":task/flag" t "boolean" [true false] 0 "Review"))))

(defn phase-edge! [label]
  (g/load-ledger! label)
  (let [name (g/db-name label) conn (g/reopen name)]
    ;; edge-1: 40 subjects with their tasks and profiles, in batches of 10 (general writer)
    (doseq [ns (partition-all 10 (range 40))]
      (let [facts (mapcat edge-facts ns)]
        (g/commit! name (g/batch-input (str "edge-" (first ns)) facts))
        (g/remember! facts)))
    (g/mark! label name conn "edge-1")
    ;; edge-2: per-subject replacements of a status, retirements of a score, a value valid from va + 1 day
    (doseq [n (range 0 40 3)]
      (let [t (g/task acct n 0)]
        (when-let [sid (g/live-id t ":task/status")]
          (g/replace! name conn {:adds [[t ":task/status" ["string" (if (even? n) "complete" "")] {:from g/v0 :etype "Review"}]]
                                 :retires [[sid t ":task/status"]]}))))
    (doseq [n (range 1 40 4)]
      (let [t (g/task acct n 0)]
        (when-let [sid (g/live-id t ":task/score")]
          (g/replace! name conn {:adds [] :retires [[sid t ":task/score"]]}))))
    (doseq [n (range 2 40 5)]
      (g/replace! name conn {:adds [[(g/task acct n 0) ":task/progress" ["integer" "7"] {:from (+ va g/day) :etype "Review"}]] :retires []}))
    (g/mark! label name conn "edge-2")
    ;; edge-3: ten more subjects, and a "change from now" of due dates (closed at vb, new value from vb)
    (let [facts (mapcat edge-facts (range 40 50))]
      (g/commit! name (g/batch-input "edge-40" facts))
      (g/remember! facts))
    (doseq [n (range 0 50 6)]
      (let [t (g/task acct n 0)]
        (when-let [did (g/live-id t ":task/due")]
          (g/replace! name conn {:adds [[t ":task/due" ["datetime" vb] {:from vb :etype "Review"}]] :retires [[did t ":task/due"]]}))))
    (g/mark! label name conn "edge-3")
    (g/save-ledger! label)
    (g/say "XQ10_EDGE" {:head (g/head name conn)})))

;; ---------------------------------------------------------------------------------------------------------------
;; The two routes, every page.
(defn- find-all [name q page]
  (g/run-find name q page {"entries" (nth [300 5000 100000] (mod page 3)) "ms" 1000 "segments" 4096}))

(defn- sweep-all [name q page]
  (loop [cursor nil ids [] projected [] pages 0 matched 0]
    (let [r (g/route name "v2" "sweep" (cond-> (assoc q "limit" (if (= "top" (get q "result")) (get q "limit") page)
                                                       "bounds" {"subjects" (nth [13 500 10000] (mod page 3)) "ms" 2000})
                                         cursor (assoc "cursor" cursor)))]
      (when-not (= 200 (:status r)) (throw (ex-info "sweep refused" {:reply r})))
      (let [b (:body r)
            ids (into ids (get b "ids" []))
            projected (into projected (get b "projected" []))
            matched (+ matched (get b "matched" 0))]
        (if (and (get b "next") (< pages 100000))
          (recur (get b "next") (if (= "top" (get q "result")) [] ids) projected (inc pages) matched)
          {:ids ids :projected projected :last b :pages (inc pages) :matched matched})))))

(defn- nv
  "A value in one comparable form: integers as text, -0.0 as 0.0, a missing value as nil."
  [v]
  (when (map? v)
    (let [t (get v "type") x (get v "value")]
      [t (cond (nil? x) nil
               (= t "integer") (str (biginteger (BigInteger. (str x))))
               (#{"number" "datetime"} t) (+ 0.0 (double x))
               :else x)])))
(defn- groups [gs] (into {} (map (fn [g] [(nv (get g "value")) (get g "count")])) gs))

(defn- compare-question [name q]
  (let [result (get q "result" "ids")
        page (nth [7 50 1000] (mod (Math/abs (hash q)) 3))
        ;; ids: entity ID order on both routes when find takes it (the SDK asks find for it); else find's value order,
        ;; compared as a set, and the order recorded.
        id-order? (= result "ids")
        f (try (find-all name (cond-> q id-order? (assoc "order" {"by" "entity" "direction" "asc"})) page)
               (catch clojure.lang.ExceptionInfo e
                 (let [code (get-in (ex-data e) [:reply :body "code"])]
                   (if (and id-order? (= "UnsupportedOperation" code))
                     (assoc (find-all name q page) :valueOrder true)
                     (throw e)))))
        w (sweep-all name q page)
        fb (:last f) wb (:last w)
        same (case result
               "ids" (and (if (:valueOrder f) (= (set (:ids f)) (set (:ids w))) (= (:ids f) (:ids w)))
                          (= (count (:ids w)) (count (set (:ids w))))
                          (or (empty? (get q "project"))
                              (= (into {} (for [id (:ids f)] [id (into {} (for [a (get q "project")] [a (set (get-in (:projected f) [id a] []))]))]))
                                 (into {} (map (fn [id m] [id (into {} (for [a (get q "project")] [a (set (map #(get % "value") (get m a [])))]))])
                                               (:ids w) (:projected w))))))
               "count" (and (get fb "countExact") (get wb "countComplete") (= (get fb "count") (get wb "count")))
               "countByValue" (and (get fb "countExact") (get wb "countComplete")
                                   (= (get fb "count") (:matched w))
                                   (= (groups (get fb "counts")) (groups (get wb "groups")))))]
    {:same (boolean same) :result result :valueOrder (boolean (:valueOrder f))
     :n (case result "ids" (count (:ids w)) (get wb "count" (:matched w)))
     :pagesFind (:pages f) :pagesSweep (:pages w)
     :detail (when-not same
               {:q q :find (select-keys fb ["count" "counts" "countExact"]) :sweep (select-keys wb ["count" "groups" "countComplete"])
                :sweepMatched (:matched w)
                :findIds (take 12 (:ids f)) :sweepIds (take 12 (:ids w))
                :onlyFind (take 6 (remove (set (:ids w)) (:ids f))) :onlySweep (take 6 (remove (set (:ids f)) (:ids w)))})}))

;; ---------------------------------------------------------------------------------------------------------------
;; The question matrix: every op both routes take, on every family, with the edge values.
(def attrs
  ;; attribute, family, kind prefix, the values to ask
  [[":person/custom-start" "string" "pl:" strings]
   [":person/custom-background" "string" "pr:" strings]
   [":task/status" "string" "pl:" statuses]
   [":task/progress" "integer" "pl:" integers]
   [":task/score" "number" "pl:" numbers]
   [":task/due" "datetime" "pl:" datetimes]
   [":task/flag" "boolean" "pl:" [true false]]
   [":person/profile" "ref" "pl:" [(g/prof acct 1) (g/prof "acc-a" 4) (g/prof acct 3)]]])
(defn- tv [family v] {"type" family "value" v})
(defn- base [account prefix shape?] (cond-> {"account" account} prefix (assoc "from" (cond-> {"prefix" prefix} shape? (assoc "shape" "pl:{8 digits}")))))

(defn- questions-for [account light?]
  (let [rnd (Random. 20261124)
        out (transient [])
        add! (fn [q] (conj! out q))]
    (doseq [[a family prefix values] attrs]
      (let [vals (if light? (take 3 (distinct values)) (distinct values))]
        (doseq [from [nil prefix]]
          (let [b (base account from false)]
            (add! (assoc b "where" [{"attribute" a "op" "exists"}] "result" "count"))
            (add! (assoc b "where" [{"attribute" a "op" "exists"}] "result" "ids"))
            (add! (assoc b "where" [{"attribute" a "op" "exists"}] "result" "countByValue" "of" a))
            (when from
              (add! (assoc b "where" [{"attribute" a "op" "missing"}] "result" "ids"))
              (add! (assoc b "where" [] "result" "countByValue" "of" a)))
            (doseq [v vals]
              (add! (assoc b "where" [{"attribute" a "op" "eq" "value" (tv family v)}] "result" (if (.nextBoolean rnd) "ids" "count"))))
            (add! (assoc b "where" [{"attribute" a "op" "in" "values" (mapv #(tv family %) (take 3 (drop (.nextInt rnd (count vals)) (cycle vals))))}] "result" "ids"))
            (when (#{"string" "integer" "number" "datetime"} family)
              (doseq [[lo hi] (partition 2 1 (sort-by #(if (string? %) % (if (= family "integer") (BigInteger. ^String %) (double %))) (take 6 vals)))
                      [lk hk] [["from" "to"] ["fromExclusive" "toExclusive"] ["from" nil] [nil "toExclusive"]]]
                (add! (assoc b "where" [(cond-> {"attribute" a "op" "range"} lk (assoc lk (tv family lo)) hk (assoc hk (tv family hi)))]
                             "result" (if (.nextBoolean rnd) "ids" "count")))))
            (when (= family "string")
              (doseq [p ["" "a" "a\u0000" "\uD83D" (subs g/long-a 0 210) "pend" "P"]]
                (add! (assoc b "where" [{"attribute" a "op" "prefix" "value" {"type" "string" "value" p}}] "result" (if (.nextBoolean rnd) "ids" "count")))))))))
    ;; Unicode order: ranges around the surrogate pair and the private-use and last code units
    (doseq [[lo hi] [["\uD800" ""] ["" "￿"] ["a" "😀"] ["é" "￿"]]]
      (add! (assoc (base account "pl:" false) "where" [{"attribute" ":person/custom-start" "op" "range" "from" (tv "string" lo) "to" (tv "string" hi)}] "result" "ids")))
    ;; two conditions, a reference projection, a shape
    (doseq [[c1 c2] [[{"attribute" ":task/status" "op" "eq" "value" (tv "string" "pending")} {"attribute" ":task/score" "op" "range" "from" (tv "number" 0.0)}]
                     [{"attribute" ":task/flag" "op" "eq" "value" (tv "boolean" true)} {"attribute" ":task/progress" "op" "exists"}]
                     [{"attribute" ":person/custom-start" "op" "in" "values" [(tv "string" "a") (tv "string" "")]} {"attribute" ":person/profile" "op" "missing"}]]]
      (add! (assoc (base account "pl:" false) "where" [c1 c2] "result" "ids"))
      (add! (assoc (base account "pl:" false) "where" [c1 c2] "result" "count")))
    (add! (assoc (base account "pl:" true) "where" [{"attribute" ":person/profile" "op" "exists"}] "result" "ids" "project" [":person/profile" ":placement/task"]))
    (add! (assoc (base account "pl:" true) "where" [] "result" "ids" "project" [":placement/task"]))
    (persistent! out)))

;; acc-a: the index gate's own random questions (xq4 random-question), those the sweep takes, find's order removed.
(defn- world-questions [p v]
  (let [rnd (Random. (+ (long p) (long (/ v 1.0e6))))
        per (g/env-long "XQ10_WORLD_QUESTIONS" 12)]
    (->> (repeatedly #(g/random-question rnd true))
         (filter #(= "sweep" (g/xcall-find 'sweep-fallback %)))
         (map #(-> % (dissoc "order")
                   (update "where" (fn [w] (mapv (fn [c] (if (and (= "prefix" (get c "op")) (string? (get c "value")))
                                                           (assoc c "value" {"type" "string" "value" (get c "value")}) c))
                                                 (or w []))))))
         (take per) vec)))

(defn- top-pairs [account]
  ;; The index's value order (a range on the attribute, ordered by it) beside the sweep's top N with the same range.
  (for [[a family lo] [[":task/score" "number" -1.0E301] [":task/progress" "integer" "-200000000000000000000000000000"]
                       [":task/due" "datetime" -10.0] [":person/custom-start" "string" ""]]
        dir ["asc" "desc"]]
    [a family dir (assoc (base account "pl:" false) "where" [{"attribute" a "op" "range" "from" (tv family lo)}])]))

(defn phase-agree! [label]
  (let [name (g/db-name label) conn (g/reopen name)
        marks (map json/read-str (str/split-lines (slurp (io/file g/out (g/positions-file label)))))
        by-tag (into {} (map (juxt #(get % "tag") #(get % "position")) marks))
        positions [(get by-tag "edge-1") (get by-tag "edge-2") (get by-tag "edge-3")]
        results (atom []) tops (atom [])]
    (doseq [p positions v valid-times account [acct "acc-a"]]
      (let [qs (if (= account "acc-a") (world-questions p v) (questions-for account false))]
        (doseq [q qs]
          (let [q (assoc q "basis" {"recordedPosition" p "validAt" v})
                r (try (compare-question name q)
                       (catch Exception e
                         (let [reply (:reply (ex-data e))]
                           {:same false :refused true :detail {:q q :status (:status reply) :code (get-in reply [:body "code"])
                                                               :message (get-in reply [:body "message"]) :error (str e)}})))]
            (swap! results conj (assoc r :position p :validAt v :account account))
            (when-not (:same r) (g/say "XQ10_AGREE_DIFF" (:detail r)))))
        (when (= account acct)
          (doseq [[a family dir q] (top-pairs account) n [5 20]]
            (let [q (assoc q "basis" {"recordedPosition" p "validAt" v})
                  f (try (:ids (find-all name (assoc q "result" "ids" "order" {"by" a "direction" dir}) 1000))
                         (catch Exception e [:refused (get-in (ex-data e) [:reply :body "code"])]))
                  w (sweep-all name (assoc q "result" "top" "limit" n "order" {"by" a "type" family "direction" dir}) n)
                  fi (if (vector? f) (vec (take n f)) f)]
              (swap! tops conj {:attribute a :direction dir :n n :position p :validAt v :same (= fi (:ids w))
                                :find (take 8 fi) :sweep (take 8 (:ids w)) :sweepValues (take 8 (get (:last w) "values"))}))))))
    (let [rs @results ts @tops]
      (g/emit! "xq10-agree.json" {:results (mapv #(dissoc % :detail) rs) :differences (filterv (complement :same) rs) :tops ts})
      (g/say "XQ10_AGREE" {:questions (count rs) :differences (count (remove :same rs)) :refused (count (filter :refused rs))
                           :byResult (frequencies (map :result rs)) :byAccount (frequencies (map :account rs))
                           :nonEmpty (count (filter #(pos? (or (:n %) 0)) rs)) :findValueOrderSetCompared (count (filter :valueOrder rs))
                           :pagesFind (reduce + (keep :pagesFind rs)) :pagesSweep (reduce + (keep :pagesSweep rs))
                           :positions positions :validTimes valid-times
                           :distinctAnswers (count (distinct (map (juxt :account :result :n) rs)))
                           :pass (and (seq rs) (every? :same rs))})
      (g/say "XQ10_TOP_VS_VALUE_ORDER" {:pairs (count ts) :same (count (filter :same ts))
                                       :differing (mapv #(select-keys % [:attribute :direction :n :position :validAt :find :sweep :sweepValues])
                                                        (take 12 (remove :same ts)))}))))

;; ---------------------------------------------------------------------------------------------------------------
;; The difference table: each shape or condition once on each route, from the code by running it.
(defn- outcome [r] [(:status r) (get-in r [:body "code"]) (get-in r [:body "fallback"])])
(defn phase-table! [label]
  (let [name (g/db-name label) conn (g/reopen name)
        marks (map json/read-str (str/split-lines (slurp (io/file g/out (g/positions-file label)))))
        by-tag (into {} (map (juxt #(get % "tag") #(get % "position")) marks))
        head (g/head name conn)
        grouped (try (g/slurp-json (str "grouped-" label ".json")) (catch Exception _ []))
        interior (first (filter (fn [p] (= "InteriorPosition" (get-in (g/route name "v2" "sweep" {"account" acct "basis" {"recordedPosition" p}}) [:body "code"]))) (take 40 grouped)))
        b {"account" acct "from" {"prefix" "pl:"} "basis" {"recordedPosition" head "validAt" vc}}
        st (fn [v] {"type" "string" "value" v})
        eq-status {"attribute" ":task/status" "op" "eq" "value" (st "pending")}
        five (vec (repeat 5 {"attribute" ":task/status" "op" "exists"}))
        nine (vec (repeat 9 {"attribute" ":task/status" "op" "exists"}))
        find-cursor (get-in (g/route name "v2" "find" (assoc b "where" [eq-status] "limit" 1 "order" {"by" "entity" "direction" "asc"})) [:body "next"])
        sweep-cursor (get-in (g/route name "v2" "sweep" (assoc b "where" [eq-status] "limit" 1 "bounds" {"subjects" 1})) [:body "next"])
        cases
        [["eq on a declared attribute" (assoc b "where" [eq-status])]
         ["eq on an attribute not declared" (assoc b "where" [{"attribute" ":person/name" "op" "eq" "value" (st "Edge 1")}])]
         ["eq with a value of another family than declared" (assoc b "where" [{"attribute" ":person/custom-start" "op" "eq" "value" {"type" "integer" "value" "5"}}])]
         ["in, 3 values" (assoc b "where" [{"attribute" ":task/status" "op" "in" "values" [(st "pending") (st "") (st "x")]}])]
         ["range on a string" (assoc b "where" [{"attribute" ":task/status" "op" "range" "from" (st "a") "to" (st "p")}])]
         ["range on a boolean" (assoc b "where" [{"attribute" ":task/flag" "op" "range" "from" {"type" "boolean" "value" false}}])]
         ["prefix" (assoc b "where" [{"attribute" ":task/status" "op" "prefix" "value" (st "pen")}])]
         ["prefix longer than 200 characters" (assoc b "where" [{"attribute" ":person/custom-start" "op" "prefix" "value" (st (subs g/long-a 0 210))}])]
         ["prefix on an integer attribute" (assoc b "where" [{"attribute" ":task/progress" "op" "prefix" "value" (st "1")}])]
         ["exists" (assoc b "where" [{"attribute" ":task/status" "op" "exists"}])]
         ["missing with from" (assoc b "where" [{"attribute" ":task/status" "op" "missing"}])]
         ["missing alone, no from" (-> b (dissoc "from") (assoc "where" [{"attribute" ":task/status" "op" "missing"}]))]
         ["ne (is not)" (assoc b "where" [{"attribute" ":task/status" "op" "ne" "value" (st "pending")}])]
         ["contains" (assoc b "where" [{"attribute" ":task/status" "op" "contains" "value" (st "end")}])]
         ["contains, any case" (assoc b "where" [{"attribute" ":task/status" "op" "contains" "value" (st "END") "caseInsensitive" true}])]
         ["has related (one level, by key)" (assoc b "where" [{"op" "has" "related" {"prefix" "pl:" "link" "key"} "where" [{"attribute" ":task/flag" "op" "exists"}]}])]
         ["anyOf (OR groups)" (assoc b "where" [] "anyOf" [[eq-status] [{"attribute" ":task/flag" "op" "exists"}]])]
         ["5 conditions" (assoc b "where" five)]
         ["9 conditions" (assoc b "where" nine)]
         ["json value in eq" (assoc b "where" [{"attribute" ":person/custom-start" "op" "eq" "value" {"type" "json" "value" "{}"}}])]
         ["result count" (assoc b "where" [eq-status] "result" "count")]
         ["result countByValue" (assoc b "where" [] "result" "countByValue" "of" ":task/status")]
         ["result countDistinct" (assoc b "where" [{"attribute" ":person/profile" "op" "exists"}] "result" "countDistinct" "of" ":person/profile")]
         ["result top N" (assoc b "where" [] "result" "top" "limit" 5 "order" {"by" ":task/score" "type" "number" "direction" "desc"})]
         ["result sum" (assoc b "where" [] "result" "sum" "of" ":task/progress")]
         ["from {type}" (assoc b "from" {"type" "Review"} "where" [eq-status])]
         ["from prefix with shape" (assoc b "from" {"prefix" "pl:" "shape" "pl:{8 digits}"} "where" [{"attribute" ":person/profile" "op" "exists"}])]
         ["order by entity, descending" (assoc b "where" [eq-status] "order" {"by" "entity" "direction" "desc"})]
         ["order by entity, ascending, range only" (assoc b "where" [{"attribute" ":task/score" "op" "range" "from" {"type" "number" "value" 0.0}}] "order" {"by" "entity" "direction" "asc"})]
         ["order by the range attribute" (assoc b "where" [{"attribute" ":task/score" "op" "range" "from" {"type" "number" "value" 0.0}}] "order" {"by" ":task/score" "direction" "asc"})]
         ["project a reference" (assoc b "where" [eq-status] "project" [":placement/task"])]
         ["project a text attribute" (assoc b "where" [eq-status] "project" [":person/custom-start"])]
         ["project 5 references" (assoc b "where" [eq-status] "project" [":placement/task" ":person/profile" ":x/a" ":x/b" ":x/c"])]
         ["position before the index's epoch" (assoc b "basis" {"recordedPosition" (get by-tag "seeded-1") "validAt" vc} "where" [eq-status])]
         ["position inside a group commit" (assoc b "basis" {"recordedPosition" (or interior 1) "validAt" vc} "where" [eq-status])]
         ["record time basis" (assoc b "basis" {"recordedAt" (or (g/record-time-of conn (get by-tag "edge-2")) (g/record-time-of conn head) 1.0) "validAt" vc} "where" [eq-status])]
         ["at least a position" (-> b (dissoc "basis") (assoc "atLeastPosition" (dec head) "where" [eq-status]))]
         ["a position not reached yet (1 ms wait)" (assoc b "basis" {"recordedPosition" (+ head 1000) "validAt" vc} "basisWaitMs" 1 "where" [eq-status])]
         ["limit 1001" (assoc b "where" [eq-status] "limit" 1001)]
         ["no account" (-> b (dissoc "account") (assoc "where" [eq-status]))]
         ["the other route's cursor" :cursor]
         ["an edited cursor" :edited]]
        run (fn [route q]
              (case q
                ;; the same question, its basis dropped (a cursor keeps the first page's), with the cursor
                :cursor (outcome (g/route name "v2" route (cond-> (assoc (dissoc b "basis") "where" [eq-status] "cursor" (if (= route "find") sweep-cursor find-cursor))
                                                           (= route "find") (assoc "limit" 1 "order" {"by" "entity" "direction" "asc"})
                                                           (= route "sweep") (assoc "limit" 1 "bounds" {"subjects" 1}))))
                :edited (outcome (g/route name "v2" route (cond-> (assoc (dissoc b "basis") "where" [eq-status]
                                                                         "cursor" (let [c (if (= route "find") find-cursor sweep-cursor)] (str (subs c 0 (- (count c) 2)) (if (.endsWith ^String c "AA") "BB" "AA"))))
                                                           (= route "find") (assoc "limit" 1 "order" {"by" "entity" "direction" "asc"})
                                                           (= route "sweep") (assoc "limit" 1 "bounds" {"subjects" 1}))))
                (outcome (g/route name "v2" route q))))
        rows (vec (for [[what q] cases] {:case what :find (run "find" q) :sweep (run "sweep" q)}))
        ;; a protected attribute: its own tiny scope with protection declared (nothing else there)
        [pname _] (g/open! "x10-protected")
        _ (g/route pname "v2" "protection" {"attributes" [":person/ssn"] "sealed" false})
        pq {"account" acct "where" [{"attribute" ":person/ssn" "op" "eq" "value" (st "1234")}]}
        prows [{:case "a protected attribute in eq" :find (outcome (g/route pname "v2" "find" pq)) :sweep (outcome (g/route pname "v2" "sweep" pq))}
               {:case "a protected attribute in an OR group (sweep shape)" :find (outcome (g/route pname "v2" "find" (assoc pq "where" [] "anyOf" [(get pq "where")])))
                :sweep (outcome (g/route pname "v2" "sweep" (assoc pq "where" [] "anyOf" [(get pq "where")])))}
               {:case "a protected attribute as `of`" :find (outcome (g/route pname "v2" "find" (assoc pq "where" [] "from" {"prefix" "pl:"} "result" "countByValue" "of" ":person/ssn")))
                :sweep (outcome (g/route pname "v2" "sweep" (assoc pq "where" [] "from" {"prefix" "pl:"} "result" "countByValue" "of" ":person/ssn")))}]
        all (into rows prows)]
    (g/emit! "xq10-table.json" all)
    (doseq [r all] (g/say "XQ10_TABLE_ROW" r))
    (g/say "XQ10_TABLE" {:cases (count all)
                         ;; consistency: every refusal of find whose fallback is "sweep" is answered by the sweep
                         :fallbackSweepButSweepRefused (mapv :case (filter #(and (= "sweep" (nth (:find %) 2)) (not= 200 (first (:sweep %)))) all))
                         :findAnswersSweepRefuses (mapv :case (filter #(and (= 200 (first (:find %))) (not= 200 (first (:sweep %)))) all))
                         :sweepAnswersFindRefusesNone (mapv :case (filter #(and (= 200 (first (:sweep %))) (not= 200 (first (:find %))) (not= "sweep" (nth (:find %) 2))) all))})))
