import assert from "node:assert/strict";
export class Satellite {
  readonly containers = new Set<string>();
  network = "";
  constructor(
    readonly nonce: string,
    readonly prefix: string,
    readonly repo: string,
    readonly images: string[],
    readonly seedDir?: string,
    readonly fleet = false,
  ) {}
  async call(args: string[], invoke: (args: string[]) => Promise<string>) {
    const [verb, what] = args;
    const label = "ha1.attempt=" + this.nonce;
    const ownedVolumes = [this.prefix + "-fence", this.prefix + "-pgdata"];
    // [DX-HA1] Why: cross-site controls may address only objects created for this attempt. Rejected: forwarding an unrestricted daemon socket to the other server.
    if (verb === "network") {
      if (what === "create") {
        assert(!this.network);
        assert.deepEqual(args, ["network", "create", "--label", label, this.prefix]);
        const id = await invoke(args);
        assert.match(id, /^[0-9a-f]{64}$/);
        this.network = id;
        return id;
      }
      if (what === "ls")
        assert.deepEqual(args, ["network", "ls", "-q", "--filter", "id=" + this.network]);
      else {
        assert(["inspect", "rm"].includes(what!));
        assert.deepEqual(args, ["network", what, this.network]);
      }
    } else if (verb === "create") {
      const opt = (k: string) => args[args.indexOf(k) + 1];
      assert(args.includes("--name") && args.includes("--network") && args.includes(label));
      assert(
        [
          "target",
          "standby",
          "active",
          "write",
          "read",
          "tool",
          ...(this.seedDir ? ["pg"] : []),
        ].some((r) => opt("--name") === this.prefix + "-" + r) ||
          (this.fleet &&
            /^fleet-[ab]-(?:pg|tx)[0-9]$/.test(
              opt("--name")?.slice(this.prefix.length + 1) ?? "",
            ) &&
            opt("--name")!.startsWith(this.prefix + "-")),
      );
      assert(this.network && opt("--network") === this.network && opt("--pull") === "never");
      assert(this.images.some((id) => args.includes(id)));
      const at = args.indexOf("--entrypoint");
      assert(at > 0);
      const flags = new Set([
        "--pull",
        "--name",
        "--label",
        "--memory",
        "--memory-swap",
        "--cpus",
        "--network",
        "-p",
        "-v",
        "-e",
        ...(this.seedDir ? ["--mount", "--restart"] : []),
        ...(this.fleet ? ["--network-alias"] : []),
      ]);
      for (let i = 1; i < at; i += 2) {
        assert(flags.has(args[i]!));
        if (args[i] === "-v")
          assert(
            [
              this.repo + "/packages/datomic/gateway/src:/opt/gateway/src:ro",
              this.repo + "/packages/datomic/src/codec-spec.json:/opt/gateway/codec-spec.json:ro",
            ].includes(args[i + 1]!),
          );
        if (args[i] === "--restart") assert.equal(args[i + 1], "no");
        if (args[i] === "--network-alias")
          assert.match(args[i + 1]!, /^db-[ab]-s2-[A-Za-z0-9_-]{1,54}$/);
        if (args[i] === "--mount") {
          const bind = "type=bind,source=" + this.seedDir + ",target=/base";
          assert(
            [
              bind,
              bind + ",readonly",
              "type=volume,source=" + ownedVolumes[0] + ",target=/ha-fence",
              "type=volume,source=" + ownedVolumes[0] + ",target=/ha-fence,readonly",
              "type=volume,source=" + ownedVolumes[1] + ",target=/var/lib/postgresql/data",
            ].includes(args[i + 1]!),
          );
        }
      }
      const id = await invoke(args);
      assert.match(id, /^[a-f0-9]{64}$/);
      this.containers.add(id);
      return id;
    } else if (
      [
        "inspect",
        "start",
        "exec",
        "logs",
        "kill",
        "rm",
        ...(this.seedDir ? ["stop"] : []),
      ].includes(verb!)
    ) {
      // [DX-HASYNC1] Why: simulate losing one host in one local engine request. Rejected: a wave of independent SSH connections whose handshake delays stagger the fault.
      if (this.fleet && ["inspect", "kill"].includes(verb!) && args.length > 4) {
        assert.deepEqual(
          args.slice(1, 3),
          verb === "inspect" ? ["--type", "container"] : ["--signal", "KILL"],
        );
        const batch = args.slice(3);
        assert(
          batch.length <= 21 &&
            new Set(batch).size === batch.length &&
            batch.every((id) => this.containers.has(id)),
        );
        return invoke(args);
      }
      const at =
        this.seedDir && verb === "exec" && args[1] === "-e"
          ? 3
          : this.seedDir && args[1] && this.containers.has(args[1])
            ? 1
            : verb === "exec" || verb === "start"
              ? 1
              : args.length - 1;
      const id = args[at];
      assert(id && this.containers.has(id));
      if (verb === "exec")
        assert(
          args.length > at + 1 &&
            (at !== 3 || /^PGOPTIONS=-c statement_timeout=\d+$/.test(args[2]!)),
        );
      else {
        const spec: Record<string, string[]> = {
          inspect: ["inspect", "--type", "container", id],
          start: ["start", id],
          logs: ["logs", "--tail", "180", id],
          kill: ["kill", "--signal", "KILL", id],
          rm: ["rm", "-fv", id],
        };
        const extra: Partial<Record<string, string[][]>> = {
          inspect: [["inspect", id, "--format", "{{.State.Running}}"]],
          logs: ["2", "35"].map((n) => ["logs", "--tail", n, id]),
          kill: [["kill", id, "--signal=KILL"]],
          stop: [["stop", id, "--time=2"]],
          rm: [["rm", id]],
        };
        assert(
          [spec[verb!], ...(this.seedDir ? (extra[verb!] ?? []) : [])].some(
            (v) => v && JSON.stringify(v) === JSON.stringify(args),
          ),
        );
      }
    } else if (verb === "image") {
      assert(
        what === "inspect" && (args[2] === "postgres:17-alpine" || this.images.includes(args[2]!)),
      );
    } else if (verb === "ps") {
      assert(args.length === 5 && this.containers.has(args[4]!.slice(3)));
      assert.deepEqual(args.slice(0, 4), ["ps", "-aq", "--no-trunc", "--filter"]);
    } else if (verb === "volume") {
      const own = ownedVolumes.includes(args.at(-1)!);
      if (this.seedDir && own && what === "create")
        assert.deepEqual(args, ["volume", "create", "--label", label, args.at(-1)]);
      else if (this.seedDir && own && what === "inspect")
        assert.deepEqual(args, [
          "volume",
          "inspect",
          "--format",
          '{{index .Labels "ha1.attempt"}}',
          args.at(-1),
        ]);
      else if (this.seedDir && own && what === "rm")
        assert.deepEqual(args, ["volume", "rm", args.at(-1)]);
      else
        assert(
          what === "ls" &&
            args.length === 5 &&
            (/^name=\^[a-f0-9]{64}\$$/.test(args[4]!) ||
              (this.seedDir && ownedVolumes.some((v) => args[4] === "name=^" + v + "$"))),
        );
    } else throw Error("Unknown second-host operation");
    return invoke(args);
  }
}
