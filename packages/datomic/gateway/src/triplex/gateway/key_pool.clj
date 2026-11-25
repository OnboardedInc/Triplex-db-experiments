(ns triplex.gateway.key-pool
  "[DX-N1] The PostgreSQL authority's key pool when a save finds it empty. Loaded lazily (requiring-resolve) from
  envelope/take-key!, so no early-loaded file gains a definition.

  A gateway fills a database's pool (256 keys) when it serves that database's protection declaration, and its worker
  refills, every 500 ms, only the pools it already holds. So a gateway that restarted, or that never served the
  declaration (any other gateway of a fleet), found no key for that database's first sealed saves; a save with more
  protected values than the pool holds (300, say) found the pool empty part way, every time; a burst emptied it between
  two refills. Each such save was refused, and storage/commit! rewrapped the refusal as 400 TransactionRejected (a
  client takes a 400 as final). Now the save fills the pool once and takes its key; only if that fails is it refused,
  as the typed 503 EnvelopeKeyPoolEmpty (retry), which storage/commit! keeps."
  (:require [triplex.gateway.envelope :as envelope] [triplex.gateway.privacy :as privacy])
  (:import [java.util.concurrent ConcurrentLinkedQueue]))

(defn take-key-refilled!
  "A key from `name`'s pool after filling it once (one batch of keys written to the authority). A failed fill is
  counted and logged as the worker's refill failures are (`key-pool-refill`, through failures/note!, so no driver
  message reaches a log or a reply) and the save is refused with the typed 503."
  [name]
  (try (@#'envelope/refill! name)
       (catch Exception e ((requiring-resolve 'triplex.gateway.failures/note!) "key-pool-refill" name e)))
  (or (.poll ^ConcurrentLinkedQueue (@#'envelope/pool name))
      (privacy/failure! 503 "EnvelopeKeyPoolEmpty" "Retry the protected save after replenishment")))
