ARG BASE
FROM ${BASE}
ENV COREPACK_HOME=/opt/corepack
# [EXP-G03] Why: oracle laundering requires both absent oracle files and no Python runtime.
# Rejected: the observer image (intentionally includes python3).
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate \
    && ! command -v python3 && ! command -v gcc \
    && mkdir -p /work /store && chown 10001:10001 /work /store
ENV COREPACK_ENABLE_NETWORK=0
USER 10001:10001
ENV HOME=/tmp/home TMPDIR=/tmp LANG=C.UTF-8 TZ=UTC CI=1 SOURCE_DATE_EPOCH=0 NODE_OPTIONS=""
WORKDIR /work
