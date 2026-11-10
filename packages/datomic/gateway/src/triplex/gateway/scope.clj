(ns triplex.gateway.scope
  (:require [datomic.api] [clojure.data.json :as json] [clojure.string :as str] [triplex.gateway.codec :as codec])
  (:import [java.util Base64]))

;; [EXP-DA01] Why: match JSON.stringify including lone UTF-16 surrogates and its whitespace contract. Rejected: hashing (irreversible) and JVM JSON defaults (different escaping).
(def whitespace #"[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]")
(defn json-string [s]
  (str "\"" (apply str
    (map-indexed (fn [i c]
      (let [n (int c)]
        (cond
          (= c \u0022) "\\\"" (= c \u005c) "\\\\"
          (= n 8) "\\b" (= n 9) "\\t" (= n 10) "\\n" (= n 12) "\\f" (= n 13) "\\r"
          (or (< n 32)
              (and (<= 55296 n 56319) (not (and (< (inc i) (count s)) (<= 56320 (int (.charAt ^String s (inc i))) 57343))))
              (and (<= 56320 n 57343) (not (and (pos? i) (<= 55296 (int (.charAt ^String s (dec i))) 56319)))))
          (format "\\u%04x" n)
          :else (str c)))) s)) "\""))
(defn validate! [scope]
  (when-not (string? scope) (codec/invalid "Expected canonical DatabaseScope text"))
  (let [tuple (json/read-str scope)]
    (when-not (and (vector? tuple) (= 5 (count tuple)) (= "triplex-scope-v1" (first tuple))
                  (every? #(and (string? %) (seq (str/replace % whitespace ""))) (take 3 (rest tuple)))
                  (integer? (nth tuple 4)) (<= 0 (nth tuple 4) 9007199254740991)
                  (= scope (str "[" (str/join "," (concat (map json-string (take 4 tuple)) [(str (nth tuple 4))])) "]")))
      (codec/invalid "Expected a scope produced by DatabaseScope.make")))
  scope)
(defn name-for [scope]
  (str "s2-" (.encodeToString (.withoutPadding (Base64/getUrlEncoder)) (.getBytes ^String (validate! scope) "UTF-8"))))
(defn scope-for [name]
  (when-not (re-matches #"s2-[A-Za-z0-9_-]+" name) (codec/invalid "Invalid encoded scope name"))
  (let [scope (String. (.decode (Base64/getUrlDecoder) (subs name 3)) "UTF-8")]
    (when-not (= name (name-for scope)) (codec/invalid "Noncanonical encoded scope name")) scope))

;; [DX-B8] Why: commit transactions are immutable, so a head seek never cancels scope-position retractions.
;; Rejected: reverse EAVT on a cardinality-one scope value (still merges its retired datoms).
(defn value [db e a] (:v (first (datomic.api/datoms db :eavt e a))))
(defn head-v2? [db e] (and (datomic.api/entid db :triplex.scope/head-version)
       (= 2 (value db e :triplex.scope/head-version))))
(defn newest-commit [db]
  (let [tx (datomic.api/t->tx (datomic.api/basis-t db))]
    (if (some? (value db tx :triplex.tx/position)) tx
      ;; [DX-B8] Why: schema/marker transactions can follow a commit; reverse AVET skips them in one seek.
      ;; Rejected: scanning transaction history backwards (unbounded marker suffix).
      (:db/id (first (datomic.api/index-pull db {:index :avet :selector [:db/id]
                                                :start [:triplex.tx/position Long/MAX_VALUE] :reverse true}))))))
(defn head-position [db e]
  (if (head-v2? db e)
    (or (when-let [tx (newest-commit db)] (value db tx :triplex.tx/position)) 0)
    (value db e :triplex.scope/position)))
(defn max-recorded-at [db e]
  (if (head-v2? db e)
    (when-let [tx (newest-commit db)] (value db tx :triplex.tx/max-recorded-at))
    (value db e :triplex.scope/max-recorded-at)))
