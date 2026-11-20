# The second 10,000-person reader attempt

At 00:39:48 UTC on November 20 the lossless read collector requested 68,719,764,785 bytes against its 68,719,476,736-byte allowance. The driver recorded an error 5,040 seconds into the 5,910-second offer schedule. Its most recent durable checkpoint contained 381,428,503 reads. Each numeric tuple contained 21 eight-byte fields. The allowance also includes per-chunk strings, split-read evidence and atomic-write scratch space.

The four 256-reader windows recorded 203,653,543 reads, with 256 gateway fallbacks. Sixteen of eighteen 1,024-reader windows recorded 59,397,895 reads, with 1,021 fallbacks. Both sets logged zero read errors. End-of-run all-read comparison and independent replay did not complete. These counts describe routing only.

The four engine containers, their network and their volume were released at 00:40:24 UTC. The source was `69220f279eba2e79a8eb3075959107f0bbe10cb5`, with nonce `253f25c7-2421-42d7-ab4d-692718edc8b0`. The diagnostic hashes identify the source-matched driver log, report and last durable checkpoint. The first attempt’s replica coverage failure and this independent collector failure ended item 1. [Diagnostic hashes](arm-d19-i1-reader-b-diagnostic.sha256)

The terminal archive completed at 00:42:11 UTC, and the queue stopped at 00:42:17 UTC on item 1. Its compressed raw archive is 11,090,251,343 bytes and remains on the server. The Mac received the compact summary and the diagnostic witnesses. [Transfer hashes](arm-d19-i1-reader-b.sha256)
