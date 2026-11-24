;; [DX-ACT9, from DX-S3] Every stored-function identity and code hash the gateway would install, printed as one sorted JSON map.
;; Loads triplex.gateway.main (which loads every gateway namespace in its production order) and, for every var of a
;; triplex.gateway namespace, records: keywords in a triplex.* namespace (function idents), 64-hex strings (source and
;; schema hashes), and the SHA-256 of every quoted code form (lists), so any change to any stored function shows.
;; Why: the option-off proof that no stored function changed. Rejected: comparing only subject-save/ident (another
;; namespace's stored code could move with a load-order or gensym change).
(require 'triplex.gateway.main)
(require '[clojure.data.json :as json])
(import '[java.security MessageDigest])
(defn- sha [^String s]
  (apply str (map #(format "%02x" %) (.digest (MessageDigest/getInstance "SHA-256") (.getBytes s "UTF-8")))))
(let [out (into (sorted-map)
                (for [n (all-ns)
                      :let [ns-name (str (ns-name n))]
                      :when (.startsWith ns-name "triplex.gateway")
                      [sym v] (ns-interns n)
                      :let [x (try @v (catch Throwable _ ::unbound))
                            k (str ns-name "/" sym)]
                      :when (or (and (keyword? x) (namespace x) (.startsWith ^String (namespace x) "triplex"))
                                (and (string? x) (re-matches #"[0-9a-f]{64}" x))
                                (and (seq? x) (not (instance? clojure.lang.LazySeq x))))]
                  [k (cond (keyword? x) (str x) (string? x) x :else (str "code:" (sha (pr-str x))))]))]
  (println "DX-S3_IDENTS" (json/write-str out))
  (shutdown-agents)
  (System/exit 0))
