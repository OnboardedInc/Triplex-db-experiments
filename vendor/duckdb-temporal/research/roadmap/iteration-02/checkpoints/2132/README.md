# Item 2 first integration evidence

This is a historical source-only checkpoint for verified draft source f9b61f11, not item2 acceptance. See [the integration record](INTEGRATION-CHECKPOINT.md).

The archive contains165 curated UTF-8 text/source/result entries: native implementation and first real binding tests, independent browser/review/negative outcomes, contract-aligned SQL/native harness/raw cases, source/ref/PR/Page audit receipts and the original unmasked Python struct-versus-pickle diagnostic. Active final integration, independent native review and storage source freeze are excluded for their later checkpoints. No ELF/runtime/database/full third-party download is included.

Three checked Base64 parts reconstruct529,462gzipbytes with SHA2564dcff75dc3693908b7044ec93c3f1fc50c55e402925c3fb19753382024e1d301. EVIDENCE-MANIFEST.json lists all member sizes/modes/SHA256; archive-manifest.json pins parts and gzip identity. Every member was independently re-read from the gzip and verified as a regular0644 file with valid UTF-8. The helper verifies/reconstructs only and never extracts or executes:

```sh
python3 restore_archive.py /tmp/item2-first-integration-evidence.tar.gz
```

Original failures and their corrected reruns are deliberately both retained. Raw counts overlap; they are not a combined certification score.
