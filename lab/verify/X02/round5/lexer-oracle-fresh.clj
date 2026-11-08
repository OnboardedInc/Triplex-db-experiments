(do
;; [CX-VX02-5] Why: use the resident's actual pinned generated lexer, including its longest-match and modes.
;; Rejected: deriving an expected lexer from the builder's regex generator or submitting unsafe SQL to XTDB.
(require '[clojure.edn :as edn] '[clojure.string :as str])
(import '[org.antlr.v4.runtime CharStreams BaseErrorListener] '[org.antlr.v4.runtime.atn LexerATNSimulator PredictionContextCache] '[org.antlr.v4.runtime.dfa DFA])
(defn j [x] (cond (string? x) (str (char 34) (.encodeToString (java.util.Base64/getEncoder) (.getBytes x java.nio.charset.StandardCharsets/UTF_8)) (char 34)) (sequential? x) (str "[" (str/join "," (map j x)) "]") (nil? x) "null" :else (str x)))
(println (j ["_metadata" [(.getName xtdb.antlr.SqlLexer) org.antlr.v4.runtime.RuntimeMetaData/VERSION (.maxMemory (Runtime/getRuntime))] [] 0]))
(doseq [[id sql] (edn/read (java.io.PushbackReader. *in*))]
  (try
    (let [errors (atom [])
          lexer (proxy [xtdb.antlr.SqlLexer] [(CharStreams/fromString sql)]
                  (skip [] (.setChannel this 1)))
          listener (proxy [BaseErrorListener] []
                     (syntaxError [recognizer offending line column message exception]
                       (swap! errors conj [line column message]))) ]
      (let [atn (.getATN lexer)
            dfa (into-array DFA (map-indexed (fn [i state] (DFA. state i)) (.-decisionToState atn)))]
        (.setInterpreter lexer (LexerATNSimulator. lexer atn dfa (PredictionContextCache.))))
      (.removeErrorListeners lexer)
      (.addErrorListener lexer listener)
      (let [tokens (.getAllTokens lexer)
            vocab (.getVocabulary lexer)]
        (println (j [id (mapv (fn [t] [(.getSymbolicName vocab (.getType t)) (.getStartIndex t) (inc (.getStopIndex t)) (.getText t)]) tokens) @errors (.-_mode lexer)]))))
    (catch Throwable e (println (j [id [] [[0 0 (str (class e) ": " (.getMessage e))]] -1])))))

)
