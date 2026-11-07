R5 probe harness (throwaway container tx2-probe-r5, image adfreiburg/qlever:0.6.0@sha256:37d5ede1...a78ec, removed after the run).
Run order inside the container, working dir /tmp/w with all files copied there: python3 gen.py; probe1.py; probe2.py; probe3.py; probe4.py.
Outputs: probeN.out. gen.py is seeded (20261107), so the datasets are reproducible.
Not part of the repo build. No repo source was modified.
