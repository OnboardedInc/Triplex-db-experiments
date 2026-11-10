;; [XN-S2-PG] Why: the shipped JVM can report API ownership and serialized keys without javap or downloads. Rejected: assuming a remote is a log because both refer to Postgres.
(import '(xtdb.postgres PostgresRemote$Factory PostgresSource$Factory))
(doseq [name ["xtdb.postgres.PostgresRemote$Factory" "xtdb.postgres.PostgresRemote" "xtdb.postgres.PostgresSource$Factory" "xtdb.postgres.PostgresSource" "xtdb.api.log.Log$Factory" "xtdb.api.log.InMemoryLog$Factory" "xtdb.api.log.LocalLog$Factory"]]
  (let [c (Class/forName name)]
    (prn {:class name :interfaces (mapv str (.getGenericInterfaces c))
          :methods (mapv str (.getDeclaredMethods c))})))
(doseq [[name ser] [["PostgresRemote.Factory" (.serializer PostgresRemote$Factory/Companion)]
                   ["PostgresSource.Factory" (.serializer PostgresSource$Factory/Companion)]]]
  (let [d (.getDescriptor ser)]
    (prn {:serializer name :serial-name (.getSerialName d)
          :fields (mapv (fn [i] {:name (.getElementName d i) :optional (.isElementOptional d i)}) (range (.getElementsCount d)))})))
(let [f (PostgresRemote$Factory. "tx2-xns2-pg" "xtdb" "client" "lab-only")]
  (prn {:remote-default-port (.getPort f) :opened-class (str (class (.open f)))}))
