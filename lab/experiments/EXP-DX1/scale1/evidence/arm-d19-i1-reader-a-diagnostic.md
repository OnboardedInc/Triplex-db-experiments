# The first 10,000-person reader attempt

The gateway returned HTTP 200 in **1.002 seconds** for the follower’s first live journal poll. The follower measured **218.977 seconds** for that same request during installation of the reader images (one matched request, trace `29efa357090cd21800000000000000a4`). The read gateway accounted for less than one percent of its elapsed time.

At L1, L4, L16 and L64, all **77,838** completed reads used the gateway. Across the following L256-A window, all **405,471** reads also used the gateway. A later source read returned the four consecutive journals after each of positions 844, 6,027 and 6,682.

The source was `f0a80d99a748fcd9ccbe66eadcee50e84f5307a3`, with slot `tx2-dxscale1-arm-d19-i1-reader-a` and nonce `a16caf92-17a3-48ca-b6a0-41ec237e6e78`. The join inspected 145,664 gateway records, including 5,349 transaction-route records. The transfer records the raw archive digest. The diagnostic manifest identifies both derived files in the durable evidence directory. [Diagnostic hashes](arm-d19-i1-reader-a-diagnostic.sha256) · [Transfer hashes](arm-d19-i1-reader-a.sha256)
