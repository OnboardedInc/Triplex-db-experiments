;; [CX-VDA00] Why: delete only the scratch database our interrupted create left before scope initialization. Rejected: restarting the resident or deleting unknown state.
(require '[datomic.api :as d])
(println {:database "s-d54db369de9cd51c023368f354e8e06e" :deleted (d/delete-database "datomic:dev://127.0.0.1:4334/s-d54db369de9cd51c023368f354e8e06e")})
(shutdown-agents)
