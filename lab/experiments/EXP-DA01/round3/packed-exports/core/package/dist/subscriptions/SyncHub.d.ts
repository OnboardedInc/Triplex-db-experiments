import { DatalogQuery } from "../datalog/schema.js";
import { ChangeEmitter, ChangeEmitterService, ChangeEvent } from "../store/ChangeEmitter.js";
import { SyncServerMessage } from "./types.js";
import { Layer } from "effect";

//#region src/subscriptions/SyncHub.d.ts
interface SyncAttachedQuery {
  readonly queryId: string;
  readonly query: DatalogQuery;
}
interface SyncConnection {
  readonly database: string;
  readonly connectionId: string;
}
interface SyncHubMessageHooks {
  readonly onSubscribe?: (subscription: SyncAttachedQuery) => void;
  readonly onUnsubscribe?: (queryId: string) => void;
}
declare class TopicFilteredSyncHub {
  private readonly debounceMs;
  private readonly databases;
  private nextConnectionIndex;
  constructor(debounceMs?: number);
  connect(database: string, send: (message: SyncServerMessage) => void, options?: {
    readonly connectionId?: string;
    readonly sendConnected?: boolean;
    readonly subscriptions?: Iterable<SyncAttachedQuery>;
  }): SyncConnection;
  hasConnection(connection: SyncConnection): boolean;
  disconnect(connection: SyncConnection): void;
  receive(connection: SyncConnection, data: unknown, hooks?: SyncHubMessageHooks): void;
  emitForDatabase(database: string, event: ChangeEvent): void;
  emitToAllDatabases(event: ChangeEvent): void;
  get service(): ChangeEmitterService;
  get layer(): Layer.Layer<ChangeEmitter>;
  dispose(): void;
  private getOrCreate;
  private nextConnectionId;
  private registerSubscription;
  private flush;
  private filterEventsToChanges;
  private changeKey;
  private send;
  private decodeMessage;
}
//#endregion
export { SyncAttachedQuery, SyncConnection, SyncHubMessageHooks, TopicFilteredSyncHub };
//# sourceMappingURL=SyncHub.d.ts.map