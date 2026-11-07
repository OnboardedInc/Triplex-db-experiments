"""Task-owned stopped-source/case-volume operations. Nothing runs on import."""
from __future__ import annotations
import hashlib
import os
from pathlib import Path
import plistlib
import stat

from bounded_io import LIMITS, canonical, file_digest, run_command, sync_directory, write_new
from policy import CASE_VOLUME_BYTES, INPUT_MAXIMUM_BYTES, require


def inventory(directory: Path, *, synchronize: bool = False) -> list[dict]:
    require(not any(path.is_symlink() for path in [directory, *directory.parents]), "Linked native directory")
    result, total = [], 0
    for path in sorted(directory.rglob("*")):
        value = path.lstat()
        require(not path.is_symlink(), "Linked member in native source")
        if stat.S_ISDIR(value.st_mode):
            continue
        require(stat.S_ISREG(value.st_mode), "Nonregular member in native source")
        total += value.st_size
        require(total <= INPUT_MAXIMUM_BYTES and len(result) < LIMITS.maximum_files, "Stopped source exceeds224MiB/128files")
        size, digest = file_digest(path, maximum=INPUT_MAXIMUM_BYTES)
        if synchronize:
            descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        result.append({"path": str(path.relative_to(directory)), "bytes": size, "sha256": digest, "mode": value.st_mode & 0o777})
    if synchronize:
        for path in sorted([directory, *[path for path in directory.rglob('*') if path.is_dir()]], reverse=True):
            sync_directory(path)
    require(result, "Empty stopped source is not the recorded foundation")
    return result


def copy_stopped(source: Path, destination: Path, expected: list[dict], authorize) -> dict:
    authorize("copy-stopped-source")
    require(not destination.exists(), "Never reset/overwrite a retained case copy")
    require(inventory(source) == expected, "Stopped authoritative source changed before copy")
    destination.mkdir(mode=0o700)
    for entry in expected:
        relative = Path(entry["path"])
        require(not relative.is_absolute() and '..' not in relative.parts, "Escaped stopped-source member")
        original, target = source / relative, destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        input_fd = os.open(original, os.O_RDONLY | os.O_NOFOLLOW)
        output_fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, entry['mode'])
        try:
            digest, count = hashlib.sha256(), 0
            while True:
                raw = os.read(input_fd, LIMITS.chunk)
                if not raw:
                    break
                count += len(raw); require(count <= entry["bytes"], "Source grew during copy")
                digest.update(raw); remaining = memoryview(raw)
                while remaining:
                    written = os.write(output_fd, remaining)
                    require(written > 0, "Incomplete source copy")
                    remaining = remaining[written:]
            require(count == entry["bytes"] and digest.hexdigest() == entry['sha256'], "Source changed during copy")
            require(os.fstat(input_fd).st_ino != os.fstat(output_fd).st_ino or os.fstat(input_fd).st_dev != os.fstat(output_fd).st_dev, "Copy did not create a fresh inode")
            os.fchmod(output_fd, entry["mode"]); os.fsync(output_fd)
        finally:
            os.close(input_fd); os.close(output_fd)
    require(inventory(source) == expected == inventory(destination, synchronize=True), "Complete stopped-source copy verification failed")
    return {"sourceUnchanged": True, "fullCopyBytesVerified": True, "freshInodes": True, "files": len(expected), "sourceManifestSha256": hashlib.sha256(canonical(expected)).hexdigest()}


def create_volume(root: Path, packet_directory: Path, authorize, command=run_command) -> dict:
    authorize("create-case-volume")
    require(packet_directory.is_relative_to(root / '.runtime/qlever-native-fault-v2'), "Unexpected fault volume parent")
    image, mount = packet_directory / 'cases.sparseimage', packet_directory / 'volume'
    require(not image.exists() and not mount.exists(), "Never reuse/reset an existing case image or mountpoint")
    mount.mkdir(mode=0o700)
    command(['hdiutil', 'create', '-sectors', '3145728', '-type', 'SPARSE', '-fs', 'APFS', '-volname', 'triplex-fault-' + packet_directory.name[:8], '-nospotlight', str(image)], timeout=60)
    image_info = plistlib.loads(command(['hdiutil', 'imageinfo', '-plist', str(image)], timeout=10))
    require(image_info['Size Information']['Total Bytes'] == CASE_VOLUME_BYTES, "Case image is not the exact1.5GiB address space")
    authorize("mount-case-volume")
    command(['hdiutil', 'attach', '-nobrowse', '-noautoopen', '-mountpoint', str(mount), '-plist', str(image)], timeout=30)
    value = plistlib.loads(command(['diskutil', 'info', '-plist', str(mount)], timeout=10))
    require(value.get('MountPoint') == str(mount) and value.get('FilesystemType') == 'apfs' and value.get('TotalSize', CASE_VOLUME_BYTES + 1) <= CASE_VOLUME_BYTES, "Mounted case-volume identity/cap differs")
    require(value.get('VolumeUUID') and mount.stat().st_dev != root.stat().st_dev, "Case volume is not a separate bounded filesystem")
    marker = mount / '.triplex-case-volume-owner.json'
    proof = {'format':'triplex-qlever-fault-case-volume/1', 'packet':packet_directory.name, 'mount':str(mount), 'image':str(image), 'virtualBytes':CASE_VOLUME_BYTES, 'volumeUuid':value['VolumeUUID'], 'device':value['DeviceIdentifier'], 'stDev':mount.stat().st_dev, 'preservation':'Retained; no automatic detach/erase/delete'}
    write_new(marker, proof)
    # A nested APFS mount is not assumed visible through the existing virtiofs
    # share. This bounded owned helper must see the exact marker BEFORE any Q
    # container starts. Failure preserves data and blocks commissioning.
    authorize('verify-nested-sharing')
    shared = command([str(root / 'tools/bootstrap/with-env.sh'), 'colima', '--profile', 'triplex', 'ssh', '--', 'cat', str(marker)], timeout=10, maximum_stdout=65536)
    require(__import__('json').loads(shared) == proof, 'Nested case volume is not visible with exact identity in the existing guest')
    write_new(packet_directory / 'case-volume.json', proof)
    return proof


def verify_volume(root: Path, packet_directory: Path, command=run_command) -> dict:
    import json
    proof = json.loads((packet_directory / 'case-volume.json').read_bytes())
    mount, image = Path(proof['mount']), Path(proof['image'])
    require(mount == packet_directory / 'volume' and image == packet_directory / 'cases.sparseimage', 'Case volume paths changed')
    require(not any(path.is_symlink() for path in [mount, image, *mount.parents]), 'Linked case volume')
    actual = plistlib.loads(command(['diskutil','info','-plist',str(mount)], timeout=10))
    backing = plistlib.loads(command(['hdiutil','imageinfo','-plist',str(image)], timeout=10))
    require(actual.get('MountPoint') == str(mount) and actual.get('VolumeUUID') == proof['volumeUuid'] and mount.stat().st_dev == proof['stDev'], 'Case-volume mount/UUID/device changed')
    require(backing['Size Information']['Total Bytes'] == proof['virtualBytes'] == CASE_VOLUME_BYTES and actual['TotalSize'] <= CASE_VOLUME_BYTES, 'Case-volume hard boundary changed')
    return proof
