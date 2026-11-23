# What the driver ran to finish the 1B seal

On Server 2 at about 17:57 UTC on 2026-11-23, as root, with nothing else running, after `resume-host.mjs` at AGE1 `bb9ec7324` crashed after writing the seal and bundle:

```bash
B=/var/tmp/triplex-scale1; C=bb9ec7324b306ee69102bda96292b7ea41657cc9; BUILD=$B/build-28e5e59ee0194fd79e859eb40139630cb86cdb14
cd $BUILD/repository && DOCKER_HOST=unix:///var/run/docker.sock timeout 1200 $BUILD/tools/bin/node --no-warnings \
  --experimental-strip-types $B/held-1b/finish-handoff.mjs $B/age-v01-bulk-c $B/age-source-$C $BUILD/repository
```

`finish-handoff.mjs` is this folder's file, copied unchanged to `$B/held-1b/` on the server. It printed `resume-sealed` with the stopped inventory recorded in [V01-AGED.md](../V01-AGED.md#seal-finished-by-the-readback-repair-aged-bundle-written). It sets the two scorecard role passwords through `normalizeScorecardRoles`, which holds the fixed scorecard values; no password is written in this folder.
