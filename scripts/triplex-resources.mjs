#!/usr/bin/env node
// Shared read-only resource admission for both owned competing backends.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statfsSync, writeFileSync } from "node:fs";
import { totalmem, cpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profile = JSON.parse(
  readFileSync(path.join(root, "qualification/resource-profile.json"), "utf8"),
);
const args = process.argv.slice(2);
const option = (key, fallback) => (args.includes(key) ? args[args.indexOf(key) + 1] : fallback);
const backend = option("--backend", process.env.TRIPLEX_BACKEND ?? "xtdb");
if (!profile.backends[backend]) throw new TypeError("Backend must be xtdb or qlever");
const planned = Number(option("--planned-bytes", "0"));
if (!Number.isSafeInteger(planned) || planned < 0)
  throw new TypeError("Nonnegative worst-overlap bytes are required");
const selection = option("--profile", process.env.TRIPLEX_RESOURCE_PROFILE ?? "development");
const fair = selection === "fair";
const experiment = profile.experimentalProfiles?.[selection];
if (!["development", "fair"].includes(selection) && !experiment)
  throw new TypeError("Unknown explicitly declared resource profile");
if (experiment && experiment.backend !== backend)
  throw new TypeError("Experimental resource profile belongs to another backend");
const run = (command, values) =>
  execFileSync(command, values, {
    encoding: "utf8",
    timeout: 20000,
    maxBuffer: 1048576,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const observed = (operation) => {
  try {
    return { available: true, value: operation() };
  } catch (error) {
    return { available: false, error: error.message };
  }
};
const du = (relative) =>
  observed(() =>
    existsSync(path.join(root, relative))
      ? Number(run("du", ["-sk", path.join(root, relative)]).split(/\s+/)[0]) * 1024
      : 0,
  );
const projectAllocatedBytes = du(".");
const hostFreeBytes = observed(() => {
  const fs = statfsSync(root);
  return fs.bavail * fs.bsize;
});
const docker = observed(() => {
  const item = JSON.parse(run("docker", ["info", "--format", "{{json .}}"]));
  return { memoryBytes: item.MemTotal, cpus: item.NCPU, operatingSystem: item.OperatingSystem };
});
const reasons = [],
  owners = {},
  uniqueImages = new Map();
const configurations = {
  ...profile.backends,
  ...profile.experimentalOwners,
  ...profile.auxiliaryOwners,
};
for (const [name, configuration] of Object.entries(configurations)) {
  const image = observed(() => {
    const item = JSON.parse(run("docker", ["image", "inspect", configuration.image]))[0];
    return { id: item.Id, bytes: item.Size };
  });
  if (image.available) uniqueImages.set(image.value.id, image.value.bytes);
  const container = observed(() => {
    const item = JSON.parse(run("docker", ["inspect", "--size", configuration.container]))[0];
    if (item.Config.Labels?.["com.docker.compose.project"] !== configuration.composeProject)
      throw new Error("Ownership label differs");
    for (const [label, expected] of Object.entries(configuration.requiredLabels ?? {}))
      if (item.Config.Labels?.[label] !== expected)
        throw new Error(`Ownership label differs:${label}`);
    for (const publications of Object.values(item.HostConfig.PortBindings ?? {}))
      for (const publication of publications ?? [])
        if (!["127.0.0.1", "::1"].includes(publication.HostIp))
          throw new Error("Owned server publishes a non-loopback interface");
    if (
      !item.Mounts.some(
        (mount) =>
          mount.Type === "bind" &&
          mount.Source === path.resolve(root, configuration.dataPath) &&
          mount.Destination === configuration.containerDataPath,
      )
    )
      throw new Error("Owned data bind source differs from declared profile");
    return {
      id: item.Id,
      running: item.State.Running,
      startedAt: item.State.StartedAt,
      imageId: item.Image,
      writableBytes: item.SizeRw ?? 0,
      memoryLimitBytes: item.HostConfig.Memory,
      memorySwapLimitBytes: item.HostConfig.MemorySwap,
      cpuLimit: item.HostConfig.NanoCpus / 1e9,
      command: item.Config.Cmd,
      logDriver: item.HostConfig.LogConfig,
      daemonLogPath: item.LogPath,
      portBindings: item.HostConfig.PortBindings,
      bindMounts: item.Mounts.filter((mount) => mount.Type === "bind").map((mount) => ({
        source: mount.Source,
        destination: mount.Destination,
      })),
      jvmOptions: item.Config.Env?.find((value) => value.startsWith("JDK_JAVA_OPTIONS=")) ?? null,
    };
  });
  const data = du(configuration.dataPath);
  const readiness = configuration.readinessPath
    ? observed(() => JSON.parse(readFileSync(path.join(root, configuration.readinessPath), "utf8")))
    : null;
  let filesystems = { available: false, error: "Container is not running" };
  if (container.available && container.value.running)
    filesystems = observed(() => {
      const rows = run("docker", [
        "exec",
        configuration.container,
        "df",
        "-Pk",
        "/",
        configuration.containerDataPath,
      ])
        .split("\n")
        .slice(1)
        .map((row) => row.trim().split(/\s+/));
      if (rows.length < 2) throw new Error("Guest and data filesystem observations are required");
      return rows.map((row, index) => ({
        requestedPath: ["/", configuration.containerDataPath][index],
        reportedMount: row.at(-1),
        availableBytes: Number(row[3]) * 1024,
      }));
    });
  owners[name] = {
    image,
    container,
    databaseAllocatedBytes: data,
    filesystems,
    serverType: configuration.serverType,
    backend: configuration.backend ?? name,
    readiness,
  };
  if (container.available && image.available && container.value.imageId !== image.value.id)
    reasons.push(`${name}:running image differs from pinned profile`);
  if (
    (experiment ? experiment.activeOwners.includes(name) : name === backend) &&
    args.includes("--require-server") &&
    (!container.available || !container.value.running || !image.available)
  )
    reasons.push(`${name}:selected owned server/image unavailable`);
  if (container.available && container.value.running) {
    for (const [flag, expected] of Object.entries(configuration.requiredNativeArguments ?? {})) {
      const command = container.value.command ?? [];
      if (command[command.indexOf(flag) + 1] !== expected)
        reasons.push(`${name}:native argument differs from declared profile:${flag}`);
    }
    if (configuration.readinessPath && args.includes("--require-server")) {
      const ready = readiness?.available ? readiness.value : null;
      if (
        ready?.format !== "qlever-owned-readiness/1" ||
        ready.status !== "READY" ||
        ready.containerId !== container.value.id ||
        ready.startedAt !== container.value.startedAt ||
        ready.imageId !== container.value.imageId ||
        ready.queryPlanningBudget !== configuration.requiredPlannerBudget
      )
        reasons.push(
          `${name}:readiness/planner receipt is missing, stale or differs from current process`,
        );
    }
    const limit = fair
      ? profile.fairComparisonProfile.memoryBytesPerActiveBackend
      : configuration.developmentMemoryBytes;
    if (
      container.value.memoryLimitBytes <= 0 ||
      container.value.memoryLimitBytes > limit ||
      container.value.memorySwapLimitBytes !== container.value.memoryLimitBytes ||
      container.value.cpuLimit <= 0 ||
      container.value.cpuLimit > configuration.cpuMaximum
    )
      reasons.push(`${name}:resource limits differ from fixed profile`);
    if (
      fair &&
      name === backend &&
      (container.value.memoryLimitBytes !== limit ||
        container.value.cpuLimit !== profile.fairComparisonProfile.cpuPerActiveBackend)
    )
      reasons.push(`${name}:fair comparison requires exact8GiB/4CPU`);
    if (fair && name !== backend)
      reasons.push(`${name}:other backend must be stopped for fair comparison`);
    if (experiment?.stoppedOwners.includes(name))
      reasons.push(`${name}:baseline owner must be stopped for the candidate experiment`);
    if (
      experiment?.activeOwners.includes(name) &&
      (container.value.memoryLimitBytes !== experiment.exactMemoryBytesPerOwner ||
        container.value.cpuLimit !== experiment.exactCpuPerOwner)
    )
      reasons.push(
        `${name}:selected profile requires exact ${experiment.exactMemoryBytesPerOwner} bytes/${experiment.exactCpuPerOwner} CPU`,
      );
    if (
      !filesystems.available ||
      filesystems.value.some(
        (fs) => fs.availableBytes - planned < profile.dockerGuestFreeReserveBytes,
      )
    )
      reasons.push(`${name}:guest/data reserve unavailable or would be crossed`);
  }
  if (!data.available) reasons.push(`${name}:owned data allocation unavailable`);
}
if (!projectAllocatedBytes.available || !hostFreeBytes.available || !docker.available)
  reasons.push("Required host/project/Docker observation unavailable");
const imageBytes = [...uniqueImages.values()].reduce((sum, bytes) => sum + bytes, 0);
const writableBytes = Object.values(owners).reduce(
  (sum, owner) => sum + (owner.container.available ? owner.container.value.writableBytes : 0),
  0,
);
const sizeBytes = (value) => {
  const match = /^(\d+)([kmg])?b?$/i.exec(value ?? "");
  if (!match) return null;
  return Number(match[1]) * 1024 ** ({ k: 1, m: 2, g: 3 }[match[2]?.toLowerCase()] ?? 0);
};
const daemonLogReservations = {};
for (const [name, owner] of Object.entries(owners))
  if (owner.container.available) {
    const logging = owner.container.value.logDriver;
    const maximumFileBytes = sizeBytes(logging?.Config?.["max-size"]);
    const maximumFiles = Number(logging?.Config?.["max-file"]);
    if (
      logging?.Type !== "json-file" ||
      maximumFileBytes === null ||
      !Number.isSafeInteger(maximumFiles) ||
      maximumFiles < 1
    ) {
      reasons.push(`${name}:daemon log storage has no qualified bounded accounting policy`);
      daemonLogReservations[name] = { available: false, driver: logging };
    } else {
      // SizeRw excludes daemon logs. Reserve the complete configured rotation,
      // plus conservative per-file record overshoot, rather than calling it a
      // measurement of the inaccessible Docker VM files.
      daemonLogReservations[name] = {
        available: true,
        driver: logging,
        maximumFiles,
        maximumFileBytes,
        overshootBytesPerFile: 65536,
        reservedBytes: maximumFiles * (maximumFileBytes + 65536),
      };
    }
  }
const daemonLogReservationBytes = Object.values(daemonLogReservations).reduce(
  (sum, item) => sum + (item.available ? item.reservedBytes : 0),
  0,
);
const ownedBytes = projectAllocatedBytes.available
  ? projectAllocatedBytes.value + imageBytes + writableBytes + daemonLogReservationBytes
  : null;
if (ownedBytes !== null && ownedBytes + planned > profile.ownedDiskMaximumBytes)
  reasons.push("Combined owned-disk budget would be exceeded");
if (hostFreeBytes.available && hostFreeBytes.value - planned < profile.hostFreeReserveBytes)
  reasons.push("Host free-space reserve would be crossed");
const runningServerCaps = Object.values(owners).reduce(
  (sum, owner) =>
    sum +
    (owner.container.available && owner.container.value.running
      ? owner.container.value.memoryLimitBytes
      : 0),
  0,
);
if (docker.available && runningServerCaps + 512 * 1024 ** 2 > docker.value.memoryBytes)
  reasons.push("Declared server caps plus VM reserve exceed Docker memory");
const runningCapsByBackend = {};
const runningCpuByBackend = {};
for (const owner of Object.values(owners))
  if (owner.container.available && owner.container.value.running) {
    runningCapsByBackend[owner.backend] =
      (runningCapsByBackend[owner.backend] ?? 0) + owner.container.value.memoryLimitBytes;
    runningCpuByBackend[owner.backend] =
      (runningCpuByBackend[owner.backend] ?? 0) + owner.container.value.cpuLimit;
  }
for (const [name, bytes] of Object.entries(runningCapsByBackend)) {
  const fixed = profile.backends[name] ?? profile.auxiliaryBudgets[name];
  const maximum =
    fair && name === backend
      ? profile.fairComparisonProfile.memoryBytesPerActiveBackend
      : (fixed.developmentMemoryBytes ?? fixed.memoryMaximumBytes);
  if (bytes > maximum)
    reasons.push(`${name}:aggregate running owner caps exceed fixed backend allowance`);
  if (runningCpuByBackend[name] > fixed.cpuMaximum)
    reasons.push(`${name}:aggregate running owner CPU caps exceed fixed backend allowance`);
}
const selectedOwnerKeys = experiment ? experiment.activeOwners : [backend];
const selected = owners[selectedOwnerKeys[0]];
const report = {
  format: "triplex-backends-resource-admission/2",
  timestampUtc: new Date().toISOString(),
  backend,
  profile: experiment?.name ?? (fair ? profile.fairComparisonProfile.name : profile.name),
  experiment: experiment ?? null,
  selectedOwnerKeys,
  result: reasons.length ? "BLOCKED" : "ADMITTED",
  reasons,
  plannedWorstOverlapBytes: planned,
  ownedBytes,
  combinedOwnedDiskMaximumBytes: profile.ownedDiskMaximumBytes,
  projectAllocatedBytes,
  daemonLogReservationBytes,
  daemonLogReservations,
  databaseAllocatedBytes: selected.databaseAllocatedBytes,
  container: selected.container,
  dockerFilesystems: selected.filesystems,
  owners,
  runningCapsByBackend,
  runningCpuByBackend,
  docker,
  host: { memoryBytes: totalmem(), logicalCpus: cpus().length, freeBytes: hostFreeBytes },
  limitations: [
    "Point-in-time admission and conservative estimates do not establish physical allocation bounds.",
    "Both backend images/writable layers and all project data/dependencies/retained evidence count against one12GiB owned cap.",
    "Bind data is counted once within project allocation; image layers are deduplicated by image identity.",
    "Daemon stdout/stderr logs are charged at their full configured json-file rotation plus per-file overshoot; this is a conservative reservation, not measured log allocation. SizeRw alone excludes these logs.",
    "Caller must reserve future load/compaction and stopped backup/restore phase overlap.",
    "Native diagnostics are controls; competing results are only public Triplex-on-XTDB and public Triplex-on-QLever.",
  ],
};
const output = option("--output", null);
if (output) {
  const destination = path.resolve(output);
  if (!destination.startsWith(path.join(root, "qualification") + path.sep))
    throw new Error("Evidence must stay under qualification/");
  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
}
console.log(JSON.stringify(report, null, 2));
if (reasons.length) process.exitCode = 2;
