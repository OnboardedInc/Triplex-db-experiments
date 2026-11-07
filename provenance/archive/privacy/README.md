# Privacy and provenance review

The export is a sanitized copy. Original source projects were not moved, deleted, reconfigured or rewritten. Services belonging to this project were stopped with their original data retained. Unrelated services were not stopped.

## Removed from the delivery

- Local account/author identity, personal/private repository URLs, local workstation absolute paths and unrelated personal project context in project-authored material.
- Git directories, histories, remotes and local author configuration; dependency caches, local configuration/credentials, external symlinks, server tokens and raw encoded duplicate containers.
- Mutable application database volumes and compiled local native outputs. Their available source, generators, expected results, manifests, measurements and research remain. Additional text-only build snapshots retain useful code/logs without copying databases or binaries.
- Account-scoped application/conversation/document links that were not verified public technical sources. Captured private-application responses and their page/space identifiers are excluded. Known private publication block handles use consistent UUID pseudonyms, preserving equality and order without exporting their original-ID map. Source/CAS manifests and provenance are updated.
- Original tar ownership/path metadata from decoded first-party research. Final ZIP metadata is normalized, with no extended attributes, AppleDouble records, archive comments or symlinks.
- Executable HTML and response-specific visitor/request metadata from downloaded HTML citations. These captures are inert public text. Original response hashes and exported hashes are distinguished.

`source-to-export-hashes.json`, `variant-source-to-export-hashes.json` and `build-text-provenance.json` document changed bytes. Historical artifact/receipt hashes identify their original artifacts and cannot be reinterpreted as fresh qualification of this sanitized export. `MANIFEST.json` at the root covers delivered bytes; the ZIP checksum sidecar covers the actual delivery container.

## Public material retained deliberately

Public source URLs, commit pins, required copyrights/licenses, upstream contributors and public technical fixtures are retained. Public registry tarballs, official runtime/source archives and pinned container image layers are downloaded from public provenance, not copied from a private cache or a running container. Their integrity and public-source Git/LFS proofs are recorded under `offline/`.

Some public upstream projects intentionally ship cryptographic private keys, certificates, test credentials and binary/SQLite fixtures. These are provenance-verified public test data, not user credentials or local database content. Public research papers may carry publisher/author/download-watermark metadata that existed in the publicly served document; such upstream provenance is distinguished from the exporting computer's account or history. Public attribution is not silently redacted to make a scanner count zero.

## Independent review scope

Independent privacy review checks project-authored text, JSON/encoded layers, identities, local paths/private references, credential classes, names/metadata, nested public archives and public provenance. Independent completeness review checks source/workload/variant/bootstrap coverage, pause-state truth, portable instructions and export-tool refusal cases. Reports include their precise scope and limitations. Public provenance classifications are documented instead of treating every checksum as a secret.

This is a source/research handoff, not a bit-for-bit machine backup, a completed implementation, a disconnected-build qualification, a native startup qualification or a formal proof that no conceivable inference can identify an origin. Do not add the private preparation workspace, raw identity maps, raw scanner reports, original Git metadata or local database volumes to the delivery.
