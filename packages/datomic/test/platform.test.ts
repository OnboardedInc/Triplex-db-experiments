import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const helper = path.resolve(
  import.meta.dirname,
  "../../../lab/experiments/EXP-DX1/stack/platform.sh",
);
function platform(kernel: string, selected: string, root = "/test-owned-root") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dxt1-platform-"));
  try {
    fs.writeFileSync(path.join(dir, "uname"), `#!/bin/sh\nprintf '%s\\n' '${kernel}'\n`, {
      mode: 0o755,
    });
    return spawnSync(
      "bash",
      [
        "-c",
        'set -eu; source "$1"; printf "%s\\n" "$DOCKER_HOST" "$DX_LAB_ROOT" "$DX_HOST_PLATFORM"',
        "platform-test",
        helper,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: dir + ":" + process.env.PATH,
          DX_BARE_METAL: selected,
          DX_BARE_METAL_ROOT: root,
          DOCKER_HOST: "unix:///unrelated.sock",
        },
      },
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
describe("explicit physical Linux environment", () => {
  it("keeps the Mac on the lab socket regardless of an inherited endpoint", () => {
    const r = platform("Darwin", "0");
    expect(r.status).toBe(0);
    expect(r.stdout.trim().split("\n")).toEqual([
      `unix://${os.homedir()}/.colima/triplex2/docker.sock`,
      `${os.homedir()}/Claude/Projects/triplex-db-2`,
      "darwin-colima",
    ]);
  });
  it("cannot redirect the Mac using the Linux switch", () => {
    expect(platform("Darwin", "1").status).toBe(2);
  });
  it("requires an explicit choice on Linux and keeps its evidence independent of the Mac", () => {
    expect(platform("Linux", "0").status).toBe(2);
    const r = platform("Linux", "1");
    expect(r.status).toBe(0);
    expect(r.stdout.trim().split("\n")).toEqual([
      "unix:///var/run/docker.sock",
      "/test-owned-root",
      "linux-bare-metal",
    ]);
  });
  it("refuses an unowned filesystem root", () => {
    expect(platform("Linux", "1", "/").status).toBe(2);
  });
  it("plans the bootstrap without accessing a daemon or installing anything", () => {
    const text = execFileSync(
      "bash",
      [helper.replace("stack/platform.sh", "t1/bare-metal.sh"), "--plan", "a".repeat(40)],
      { encoding: "utf8" },
    );
    expect(text).toContain("This plan performs no installation or network call");
  });
});
