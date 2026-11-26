;; [DX-LR1] s3/idents.clj (every stored-function identity and code hash), taken after the namespaces the gateway resolves
;; lazily are loaded, as a served gateway now loads them: by main/load-answer-path! when this build has it, else by
;; requiring the same namespaces in the same order (what the first requests would load). LR1_ORDER=claims-first loads
;; account-claims first (what a scope's first open loads on a build without the hook), then the rest, so the account
;; IDs' own stored code can be compared across both orders. Prints DX-S3_IDENTS as s3/idents.clj does.
(require 'triplex.gateway.main)
(require '[clojure.data.json :as json])
(import '[java.security MessageDigest])
(def lr1-order '[triplex.gateway.reply triplex.gateway.outcome triplex.gateway.failures triplex.gateway.account-claims
                 triplex.gateway.key-pool triplex.gateway.import-bound])
(cond
  (= "claims-first" (System/getenv "LR1_ORDER"))
  (doseq [n (cons 'triplex.gateway.account-claims (remove #{'triplex.gateway.account-claims} lr1-order))] (require n))
  (resolve 'triplex.gateway.main/load-answer-path!) ((resolve 'triplex.gateway.main/load-answer-path!))
  :else (doseq [n lr1-order] (require n)))
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
