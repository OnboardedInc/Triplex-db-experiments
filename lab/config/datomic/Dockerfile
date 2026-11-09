# [EXP-DA00] Why: verified distribution and existing JSON/Jetty jars, with no package install. Rejected: REST server (legacy API).
FROM eclipse-temurin:21.0.13_9-jre-noble@sha256:0eda5830ed7b669abc246a8dc520ea8a23cab06f9a8d4b6964109e2f2394e46f
RUN command -v taskset && command -v bash && java --list-modules | grep jdk.httpserver
ARG BUILD_INPUTS_SHA256
LABEL tx2.build-inputs-sha256=$BUILD_INPUTS_SHA256
COPY datomic/ /opt/datomic/
COPY gateway/ /opt/gateway/
COPY config/ /config/
ENV DATOMIC_EXT_CLASSPATH=/opt/gateway/src
WORKDIR /opt/datomic
ENTRYPOINT ["/bin/bash", "/config/entrypoint.sh"]
