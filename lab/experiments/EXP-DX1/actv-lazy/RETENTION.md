# When a worker erases the number before submission

A worker starts on Monday. They have supplied a valid Social Security number. The employer has no E-Verify case or accepted submission on record. At Publish, the rule owes the employer’s case-submission system one instruction to open a case for that worker. Its payload carries the start date. The system needs the number separately to submit the case. Before it receives the instruction, the worker’s number is erased. Every screen opened after erasure shows the erased marker, including screens pinned to earlier records. A new evaluation produces the “number erased” task. [W0 submission rule and work-item fields](../../../world/W0/SPEC.md) · [Erasure rulings Q24 and Q36f](../../../acceptance/RULINGS.md)

| Rule the owner could choose | What the worker experiences | What the employer receives |
| --- | --- | --- |
| **Keep a minimal record and pause submission** | Erasure removes access to the number. The employer must use an authorized process to collect it again before submitting. | One ordered record that a submission was due, with an opaque work ID, sequence, routing reference, start date and blocked status. The system can show the outstanding case. It can resume only after authorized recollection and a fresh check that a case is still needed. |
| **Cancel the outstanding submission on erasure** | Erasure ends this attempt. A future submission requires a new qualifying event. | An ordered cancellation for the original work ID. The employer can distinguish an intentionally closed attempt from a lost message and may need to follow up with the worker. |

**Recommendation.** Keep the minimal record and pause. This preserves what the employer owed at Publish and lets the worker’s erasure take effect before any external submission. Exclude the number and recoverable copies from the notice, cache, delivery log and replay data. Give the customer a visible blocked status. The owner still sets the retention period and who may read the minimal record.

**Reply in one line.** “Keep a minimal ordered record that the case was due, erase the number and pause submission until authorized recollection,” or “Cancel the outstanding submission on erasure and record the cancellation.”

This decision concerns the product’s delivery semantics. The current joined experiment declines accounts with protected input and declines a new SSN save before it changes the account. No E-Verify submission was sent.
