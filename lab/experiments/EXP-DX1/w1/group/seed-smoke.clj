(require '[triplex.gateway.main :as gateway] '[ring.adapter.jetty :as jetty])
;; [DX-W1] Why: exercise the server seed/readback code through the real peer and public SDK in a fresh local database.
;; Rejected: a mock response or a static comparison of two copies of the generator.
(let [address (.getHostAddress (java.net.InetAddress/getLoopbackAddress))
      server (jetty/run-jetty gateway/handler {:host address :port 0 :join? false})
      port (.getLocalPort (first (.getConnectors server)))
      nonce (str (java.util.UUID/randomUUID))
      child (ProcessBuilder. ["node" "--import" "tsx" "lab/experiments/EXP-DX1/w1/group/seed-smoke.ts" (str "http://" address ":" port) nonce])]
  (try (let [rc (.waitFor (.start (.inheritIO child)))] (when-not (zero? rc) (throw (ex-info "Seed smoke failed" {:exit rc}))))
    (finally (.stop server) (shutdown-agents))))
