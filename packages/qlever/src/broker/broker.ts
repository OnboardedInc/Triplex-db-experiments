import {
  HostBroker as Broker,
  type HostBrokerOptions as Options,
} from "@triplex-build/triplex-broker";
import type { QleverClient } from "../QleverClient.js";
import { buildFence, buildPublication, markerQuery } from "./sparql.js";
export * from "@triplex-build/triplex-broker/broker";
export type HostBroker = Broker;
export interface HostBrokerOptions extends Omit<Options, "replica"> {
  readonly replica?: QleverClient;
}
// [EXP-P2B] Why: preserve the QLever factory while sharing the decider and durable store.
// Rejected: a second broker per engine (would diverge claims, feed and recovery semantics).
export const HostBroker = {
  open: (options: HostBrokerOptions): Promise<Broker> => {
    const { replica, ...rest } = options;
    const timeoutMs = options.applyTimeoutMs ?? 120_000;
    return Broker.open({
      requireFullFsync: true,
      ...rest,
      ...(replica
        ? {
            replica: {
              marker: async () => {
                const rows = await replica.query(markerQuery(options.scopeKey), { timeoutMs });
                return {
                  position: Number(rows[0]?.["brokerPosition"]?.value ?? 0),
                  epoch: Number(rows[0]?.["brokerEpoch"]?.value ?? 0),
                  incarnation: rows[0]?.["brokerIncarnation"]?.value ?? "",
                };
              },
              fence: async (from, epoch, incarnation) => {
                await replica.update(buildFence(options.scopeKey, from, epoch, incarnation), {
                  timeoutMs,
                });
              },
              publish: (from, to, members) =>
                replica.update(buildPublication(options.scopeKey, from, to, members).sparql, {
                  timeoutMs,
                }),
              rebuild: () => replica.command("rebuild-index", { timeoutMs: 1_800_000 }),
            },
          }
        : {}),
    });
  },
};
