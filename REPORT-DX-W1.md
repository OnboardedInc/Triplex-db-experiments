# DX-W1 part 9

Take the tip of `exp/DX-W1-commit-tail-reads` for the experiment. The product change is `cea3f1db9`, based on integration commit `057cc1eb4`.
The new option retires the old value by recording its end, avoiding part of the search needed to retract its full text. It starts off and needs no seed rewrite.
On the Mac toy seed it saved 0.29–0.40 storage fetches per save. There was still about one fetch per save for the person's identity.
For a 16 GiB cache, the forecast at 430 million, 1 billion and 8 billion records is 0.85, 1.32 and 1.63 fetches per save with the option, versus 1.20, 1.86 and 2.31 today.
The native gate checked exact history and conflicts. Barrier6 and rolling6 each recovered the original lost reply and kept six refused appends out of the journal.
The next design puts each person's current version in a small record. It is a candidate for keeping write reads flat as history grows.
The toy could not reproduce the full-size cache ratios. The two server comparisons are prepared and unrun.

[Model, design costs, Mac counts, audit and server commands](lab/experiments/EXP-DX1/w1/RETIREMENT-READS.md) · [Evidence hashes](lab/experiments/EXP-DX1/w1/WRITE9-SHA256SUMS). The part 8 report is retained at `ff4346209`.
