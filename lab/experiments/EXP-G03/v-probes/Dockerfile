ARG BASE
FROM ${BASE} AS compiler
USER 0
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev && rm -rf /var/lib/apt/lists/*
COPY sync-hook.c /src/sync-hook.c
RUN gcc -shared -fPIC -O2 -Wall -Werror /src/sync-hook.c -ldl -o /sync-hook.so
FROM ${BASE}
USER 0
# [EXP-G03] Why: trusted probes need SQLite and inotify; rejected: adding Python to the candidate image (oracle boundary).
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY --from=compiler /sync-hook.so /opt/probes/sync-hook.so
COPY probe.py relay.mjs /opt/probes/
RUN mkdir -p /work /store && chown 10001:10001 /work /store
USER 10001:10001
WORKDIR /work
