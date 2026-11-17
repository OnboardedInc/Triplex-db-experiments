North star: measure P1–P5 on a native physical Linux host, separating the Mac/VM test-bed costs from store costs.

Use a dedicated Ubuntu 24.04 server with x86-64 or arm64, eight available CPUs, at least 24 GiB RAM (32 recommended) and 80 GiB free. VM/container detection refuses execution. The script installs Docker and build tools as root; `--plan` is inert on every platform.

Obtain `bare-metal.sh` from the intended public repository revision, then run:

```sh
bash bare-metal.sh --plan FULL_40_HEX_COMMIT
sudo bash bare-metal.sh --run FULL_40_HEX_COMMIT /opt/triplex-reading
```

The revision must already be available in `OnboardedInc/Triplex-db-experiments`. The clone is detached at that exact revision. No Mac files, image exports, seed volumes, private oracle installation or credentials are inputs. Docker images build for the host's native architecture. The Datomic distribution is checked against the repository's SHA256 and byte count; Node's pinned archive is checked against the matching official checksums. pnpm uses the fresh run's own store.

Sequence: native package/image build; 1k correctness smoke; self-seeded 10k v3 study with off bookends; fixed-gap diagnostic at 10/50/100/250/500/1,000 ms. Every arm builds its data locally. No keep-warm mechanism or extra startup transaction prefix is enabled. Durability stays `fsync=on`, `synchronous_commit=on`, `full_page_writes=on`; acknowledgements follow engine application.

`results/reports.tar.zst` and its SHA256 collect the run reports/viewers, including an incomplete pipeline's retained reports. Native image IDs, architecture, input hashes, CPU and disk inventory are retained beside it. Raw traces remain under `state/evidence/DX-T1/<tag>/`. The script changes neither the Mac endpoint nor its night/v3 profile.

Validation here covers shell syntax, inert planning and the guarded platform selection. Native x86-64/arm64 image builds, package installation and an end-to-end server run require the actual server and remain untested.
