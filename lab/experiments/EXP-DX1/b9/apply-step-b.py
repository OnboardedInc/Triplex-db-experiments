# [DX-B9-B] Why: keep the ordered-submission draft outside the frozen step-A source window.
# Rejected: changing SDK files while their independent step-A gates are still running.
import pathlib,shutil
root=pathlib.Path.cwd(); draft=root/'lab/experiments/EXP-DX1/b9/draft'
def edit(name, old, new, count=1):
 p=root/name;s=p.read_text();assert s.count(old)>=count,(name,old);p.write_text(s.replace(old,new,count))
shutil.copyfile(draft/'CommitOrder.ts',root/'packages/datomic/src/CommitOrder.ts')
shutil.copyfile(draft/'triplex/gateway/commit_order.clj',root/'packages/datomic/gateway/src/triplex/gateway/commit_order.clj')
shutil.copyfile(draft/'triplex/gateway/commit_order_test.clj',root/'packages/datomic/gateway/src/triplex/gateway/commit_order_test.clj')
p=root/'packages/datomic/gateway/src/triplex/gateway/storage.clj';s=p.read_text().replace('(:require [triplex.gateway.scope', '(:require [triplex.gateway.commit-order :as order] [triplex.gateway.scope',1)
a=s.index(';; [DX-B5-L0] Why: HTTP connections');b=s.index('(defn commit!',a)
s=s[:a]+''' ;; [DX-B9-B] Why: reserve a strict per-client submission lane; ACKs remain concurrent.
;; Rejected: waiting twenty milliseconds and then allowing a later sequence through.
(defn submit! [conn data input timeline]
  (let [submit (fn []
                 (swap! timeline assoc :predecessorReady (System/nanoTime))
                 (let [future (d/transact-async conn data)]
                   (swap! timeline assoc :submitted (System/nanoTime)) future))]
    (if-let [client (get input "clientId")]
      (order/enqueue! client (get input "sendSequence") (get input "operationId") submit)
      (submit))))
'''+s[b:]
s=s.replace('(when (= "OutcomeUnknown" (:code (ex-data e))) (throw e))', '(when (#{"OutcomeUnknown" "CommitOrderGap" "CommitOrderBufferFull" "CommitOrderSubmitFailed" "CommitOrderSequenceConflict" "CommitOrderClientsFull"} (:code (ex-data e))) (throw e))',1);p.write_text(s)
p=root/'packages/datomic/gateway/src/triplex/gateway/main.clj';s=p.read_text()
old='{:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e) :maximum (:maximum (ex-data e)) :route (:route (ex-data e))}'
new='(cond-> {:code (or (:code (ex-data e)) "GatewayError") :message (.getMessage e) :maximum (:maximum (ex-data e)) :route (:route (ex-data e))}\n                                  (:expectedSequence (ex-data e)) (assoc :expectedSequence (:expectedSequence (ex-data e))))'
assert old in s;s=s.replace(old,new,1);p.write_text(s)
p=root/'packages/datomic/src/DatomicStorageAdapter.ts';s=p.read_text().replace('  commitClientId,','  commitClientIdFor,',1)
s=s.replace('registerCommit(-Infinity)', 'registerCommit(-Infinity, client.orderingKey)').replace('registerCommit(timestamp)', 'registerCommit(timestamp, client.orderingKey)').replace('registerCommit(instant)', 'registerCommit(instant, client.orderingKey)')
s=s.replace('clientId: commitClientId,','clientId: commitClientIdFor(client.orderingKey),').replace('options.resolutionTimeoutMs ?? 30_000','options.resolutionTimeoutMs ?? 45_000');p.write_text(s)
p=root/'packages/datomic/src/DatomicClient.ts';s=p.read_text();s='import { resumeCommitOrder } from "./CommitOrder.js";\n'+s
s=s.replace('readonly route?: string,','readonly route?: string,\n    readonly expectedSequence?: number,',1)
anchor='  readonly rowObservers = new Set'
s=s.replace(anchor,'''  // [DX-B9-B] Why: sequence identity follows the submission endpoint; a peer cannot fill another peer's gaps.
  // Rejected: one global counter shared by two distinct gateways.
  get orderingKey(): string { return this.endpoint.origin; }
  resumeCommitOrder(expectedSequence: number): void { resumeCommitOrder(this.orderingKey, expectedSequence); }
'''+anchor,1)
s=s.replace('typeof data["route"] === "string" ? data["route"] : undefined,', 'typeof data["route"] === "string" ? data["route"] : undefined,\n                    typeof data["expectedSequence"] === "number" && Number.isSafeInteger(data["expectedSequence"]) && data["expectedSequence"] > 0 ? data["expectedSequence"] : undefined,',1)
s=s.replace('body, this.timeoutMs);','body, input.clientId === undefined ? this.timeoutMs : Math.max(this.timeoutMs, 35_000));',1)
p.write_text(s)
s=(root/'lab/experiments/EXP-DX1/b9/strict-order.test.ts.draft').read_text().replace('"../../../../packages/datomic/src/DatomicClient.js"','"../src/DatomicClient.js"')
(root/'packages/datomic/test/strict-order.test.ts').write_text(s)
