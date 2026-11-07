# Owned workspace mount

The project lives on a fixed-address-space45,000,000,000-byte APFS sparse image.
Its backing file is `/Users/sam/projects/.triplex-db-storage/triplex-db.sparseimage`.
The original `/Users/sam/Downloads/download.zip` remains immutable and is counted.
Image metadata and the small outer owner directory have a separate1,000,000,000-byte
allowance. The conservative maximum is49,305,971,712 bytes, below the50GB cap.

This is a new portable-export baseline. Historical Git-origin audits and PASS
receipts remain historical; importing source does not qualify a runtime.

After a reboot, attach the existing image at the existing empty homebase:

```sh
hdiutil attach -nobrowse -noautoopen -mountpoint /Users/sam/projects/triplex-db /Users/sam/projects/.triplex-db-storage/triplex-db.sparseimage
```

Do not recreate or resize the image. Never attach over a nonempty underlying
directory. The outer `storage-owner.json` records volume identity and backing
path even while unmounted. Mounting is explicit; no login item or unrelated
system configuration was changed.

Before writes, run `python3 tools/bootstrap/check-storage.py`. It verifies the
volume UUID, capacity, ZIP metadata, outside ownership and current allocation.
If the mount is missing, the guard itself is absent: stop rather than create
replacement project files on the underlying host directory.

All new caches, temporary files, VM files and engine state belong under this
mount. Use task-specific supported cache options; do not redirect the user's
HOME or alter the default Colima profile. Never count nested VM/database files
again when calculating physical owned storage.

The initial image-size suffix was interpreted as sectors by hdiutil. It received
no source import and was detached. Its failure receipts and an empty-image removal
receipt remain under the bounded outside allowance. The active image was created
with exactly87,890,625 sectors and independently read back as45GB.
