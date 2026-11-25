(ns s6-r26
  "[DX-S6b] S5 R2-6: what the general writer's unmarked refusals are. Runs the differential fuzzer (s5/fuzz.clj) and
  tallies every refused candidate save by its message and the faults the generator put in it. The review counted 984
  'Missing live row datom' answered 503; this says which fault produced them and what they are answered now.
  Loaded after s5/fuzz.clj; run with the fuzzer's own environment (S5_SEEDS, S5_STEPS, S5_FAULTS, S5_ACCOUNTS)."
  (:require [clojure.data.json :as json] [s5-fuzz :as fz] [wfix1-regression :as reference]))

(def messages (java.util.concurrent.ConcurrentHashMap.))
(def tally (atom {}))

(alter-var-root #'reference/send
  (fn [send] (fn [name input & more]
               (let [reply (apply send name input more)]
                 (when-let [op (and (map? input) (get input "operationId"))]
                   (when-not (= 200 (:status reply))
                     (.put messages op [(:status reply) (get-in reply [:body "code"]) (get-in reply [:body "message"])])))
                 reply))))

(alter-var-root #'fz/serial-step!
  (fn [step] (fn [& args]
               (let [r (apply step args)]
                 (when-let [m (and (:operation r) (.get messages (:operation r)))]
                   (swap! tally update [m (vec (sort (get-in r [:spec :faults])))] (fnil inc 0)))
                 r))))

(defn main []
  (let [done (promise)]
    (.addShutdownHook (Runtime/getRuntime)
      (Thread. ^Runnable (fn []
                           (doseq [[[[status code message] faults] n] (sort-by (comp - val) @tally)]
                             (println "DX-S6_R26" (json/write-str {:status status :code code :message message :faults faults :saves n}))))))
    (fz/main)))
