import assert from "node:assert/strict";
export class Satellite {
  readonly containers = new Set<string>();
  network = "";
  constructor(
    readonly nonce: string,
    readonly prefix: string,
    readonly repo: string,
    readonly images: string[],
  ) {}
  async call(args: string[], invoke: (args: string[]) => Promise<string>) {
    const [verb, what] = args;
    const label = "ha1.attempt=" + this.nonce;
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
        ["target", "standby", "active", "write"].some(
          (r) => opt("--name") === this.prefix + "-" + r,
        ),
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
      }
      const id = await invoke(args);
      assert.match(id, /^[a-f0-9]{64}$/);
      this.containers.add(id);
      return id;
    } else if (["inspect", "start", "exec", "logs", "kill", "rm"].includes(verb!)) {
      const id = verb === "exec" || verb === "start" ? args[1] : args.at(-1);
      assert(id && this.containers.has(id));
    } else if (verb === "image") {
      assert(
        what === "inspect" && (args[2] === "postgres:17-alpine" || this.images.includes(args[2]!)),
      );
    } else if (verb === "ps") {
      assert(args.length === 5 && this.containers.has(args[4]!.slice(3)));
      assert.deepEqual(args.slice(0, 4), ["ps", "-aq", "--no-trunc", "--filter"]);
    } else if (verb === "volume") {
      assert(what === "ls" && args.length === 5 && /^name=\^[a-f0-9]{64}\$$/.test(args[4]!));
    } else throw Error("Unknown second-host operation");
    return invoke(args);
  }
}
