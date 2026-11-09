# R49 image recipe for the sync-witness container (OBS01 round 10). NOT BUILT: a build downloads about 90 MB from the Ubuntu archive and
# needs Sam's approval first (no image pull, apt or network use without it). When approved, build inside the triplex2 VM:
#   DOCKER_HOST=unix:///Users/sam/.colima/triplex2/docker.sock docker build --platform linux/arm64 \
#     --build-arg LIBBSD0_VERSION=<exact arm64 noble version from the signed index> \
#     -t tx2-sync-witness-bpftrace:r49 lab/observer/bpftrace-image
# then record the image ID (`docker image inspect --format '{{.Id}}'`) and pass `--bpftrace-image sha256:<id>` to witness-vm-probe.
#
# What this pins (R49 section 5): the arm64 base digest, bpftrace 0.20.2-1ubuntu4.3 (noble-updates; 4.2 was withdrawn, LP #2097317),
# LLVM 18 at exactly 1:18.1.3-1ubuntu1 (a newer LLVM breaks 4.3), libbpfcc 0.29.1+ds-1ubuntu7, every other package at an exact version,
# apt's own version pins (Pin-Priority 1001), the SHA256 of the five large .debs, and a closed package list: the build fails if apt wants
# anything that is not named here. Component main only, no recommends, no apt lists or cache left in the image.
# Rejected: the upstream AppImage (needs FUSE and a user namespace, which the witness profile forbids), quay.io/iovisor/bpftrace (stale),
# a mutable `ubuntu:24.04` tag, and an unpinned `apt-get install bpftrace`.
FROM --platform=linux/arm64 ubuntu:24.04@sha256:19cad59657037cffa0ac9a48107019b768900ff1071140965827513ac866bd5e

# R49 section 5 lists libbsd0 only as "0.12.1 series": set the exact version from the signed index at build time; an empty value fails.
ARG LIBBSD0_VERSION=""
ARG BPFTRACE_VERSION=0.20.2-1ubuntu4.3
ARG LLVM_VERSION=1:18.1.3-1ubuntu1
ARG LIBBPFCC_VERSION=0.29.1+ds-1ubuntu7
ARG LIBICU_VERSION=74.2-1ubuntu3.1
ARG LIBXML2_VERSION=2.9.14+dfsg-1.3ubuntu3.10
ARG ELFUTILS_VERSION=0.190-1.1ubuntu0.1
ARG LIBBPF_VERSION=1:1.3.0-2build2
ARG LIBEDIT_VERSION=3.1-20230828-1build1

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

# One layer: pin, download, verify, install, clean. The list below is the whole closure R49 found; anything else makes the build stop.
RUN test -n "${LIBBSD0_VERSION}" || { echo 'set --build-arg LIBBSD0_VERSION from the signed index (R49 section 5)'; exit 1; }; \
    sed -i 's/^Components:.*/Components: main/' /etc/apt/sources.list.d/ubuntu.sources; \
    { for spec in \
        "bpftrace ${BPFTRACE_VERSION}" "libllvm18 ${LLVM_VERSION}" "libclang-cpp18 ${LLVM_VERSION}" "libclang1-18 ${LLVM_VERSION}" \
        "libbpfcc ${LIBBPFCC_VERSION}" "libicu74 ${LIBICU_VERSION}" "libxml2 ${LIBXML2_VERSION}" "libdw1t64 ${ELFUTILS_VERSION}" \
        "libelf1t64 ${ELFUTILS_VERSION}" "libbpf1 ${LIBBPF_VERSION}" "libedit2 ${LIBEDIT_VERSION}" "libbsd0 ${LIBBSD0_VERSION}"; do \
        set -- ${spec}; printf 'Package: %s\nPin: version %s\nPin-Priority: 1001\n\n' "$1" "$2"; \
      done; } > /etc/apt/preferences.d/r49-bpftrace; \
    apt-get update; \
    apt-get install -y --no-install-recommends --download-only \
        "bpftrace=${BPFTRACE_VERSION}" "libllvm18=${LLVM_VERSION}" "libclang-cpp18=${LLVM_VERSION}" "libclang1-18=${LLVM_VERSION}" \
        "libbpfcc=${LIBBPFCC_VERSION}" "libicu74=${LIBICU_VERSION}" "libxml2=${LIBXML2_VERSION}" "libdw1t64=${ELFUTILS_VERSION}" \
        "libelf1t64=${ELFUTILS_VERSION}" "libbpf1=${LIBBPF_VERSION}" "libedit2=${LIBEDIT_VERSION}" "libbsd0=${LIBBSD0_VERSION}"; \
    cd /var/cache/apt/archives; \
    printf '%s\n' \
        '38525fa2d1d8764c7844d76bfaf807fef2d9242673f81532396b5d147115499a  bpftrace_0.20.2-1ubuntu4.3_arm64.deb' \
        '9fdecc60d0528466bfbbc141aefd2788ab3bc5459a9ff9c9261fe067a3af3b5c  libllvm18_1%3a18.1.3-1ubuntu1_arm64.deb' \
        'f04cf0e22e25fb4706b2175a7c262c20caae8259b442816207fc68a142e63627  libclang-cpp18_1%3a18.1.3-1ubuntu1_arm64.deb' \
        '11d80aca24ad71a7d659870941456b4884970d3326afe640c571299f8a7f4e8e  libclang1-18_1%3a18.1.3-1ubuntu1_arm64.deb' \
        '61ac559c20b968a1857b1544a64d2126052c0ac7432b2675cf535fa95de10aca  libbpfcc_0.29.1+ds-1ubuntu7_arm64.deb' > /tmp/r49.sha256; \
    sha256sum -c /tmp/r49.sha256; \
    wanted='bpftrace libllvm18 libclang-cpp18 libclang1-18 libbpfcc libicu74 libxml2 libdw1t64 libelf1t64 libbpf1 libedit2 libbsd0'; \
    for deb in *.deb; do \
        name="$(dpkg-deb --field "${deb}" Package)"; \
        case " ${wanted} " in *" ${name} "*) ;; *) echo "apt wants a package outside the R49 closure: ${name}"; exit 1;; esac; \
    done; \
    dpkg -i ./*.deb; \
    rm -f /tmp/r49.sha256 ./*.deb; rm -rf /var/lib/apt/lists/* /var/cache/apt/*; \
    bpftrace --version | grep -Fx 'bpftrace v0.20.2'

# The witness container overrides the entrypoint (--entrypoint bpftrace) and runs as root inside its own restricted profile
# (CAP_BPF + CAP_PERFMON only, read-only root, no network; see lab/bin/sync-witness.mjs verifyWitnessProfile).
ENTRYPOINT ["/usr/bin/bpftrace"]
