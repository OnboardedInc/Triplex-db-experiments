import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MiB = 2 ** 20;
/** @param {string} text @param {string} name */
const field = (text, name) => text.match(new RegExp("^" + name + "[=:]\\s*(.+)$", "m"))?.[1];

// [DX-JVM1] Why: Linux compresses adjacent CPUs into ranges when it renders process affinity.
// Rejected: comparing only the count or comparing `4,5,8` literally to `4-5,8`.
/** @param {string | undefined} list */
const cpus = (list) => {
  assert(list);
  return list.split(",").flatMap((part) => {
    const [from, to = from] = part.split("-").map(Number);
    assert(Number.isInteger(from) && Number.isInteger(to) && to >= from);
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  });
};

/**
 * @param {string} directory
 * @param {ReturnType<typeof import('./policy.mjs').jvmPolicy> | ReturnType<typeof import('./launch.mjs').part2Policy>} policy
 * @param {Record<string, string>} ids
 */
export function verifyJvmFlags(directory, policy, ids) {
  for (const role of /** @type {const} */ (["tx", "gw-w", "gw-r"])) {
    /** @param {string} suffix */
    const read = (suffix) => fs.readFileSync(path.join(directory, role + suffix + ".txt"), "utf8");
    const proc = read(".process");
    assert.equal(field(proc, "containerId"), ids[role]);
    assert.deepEqual(cpus(field(proc, "Cpus_allowed_list")), cpus(policy.cpus[role]));
    assert.equal(Number(field(proc, "memory.max")), policy.memory[role] * MiB);
    const init = read(".gc-init");
    const cpuCount = policy.cpus[role].split(",").length;
    assert.equal(Number(/CPUs: \d+ total, (\d+) available/.exec(init)?.[1]), cpuCount);
    const flags = new Map(read(".flags").split("\n").flatMap((line) => {
      const m = /^\s*\w+\s+(\w+)\s+=\s*(.*?)\s+\{/.exec(line);
      return m ? [[m[1], m[2]]] : [];
    }));
    assert.equal(Number(flags.get("MaxHeapSize")), policy.maxHeap[role] * MiB);
    assert.equal(Number(flags.get("InitialHeapSize")), policy.initialHeap[role] * MiB);
    for (const option of policy.opts[role]) {
      const toggle = /^-XX:([+-])(\w+)$/.exec(option);
      if (toggle) {
        assert.equal(flags.get(toggle[2]), String(toggle[1] === "+"), role + " " + option);
        continue;
      }
      const value = /^-XX:(\w+)=(\d+(?:\.\d+)?)(m?)$/.exec(option);
      if (value)
        assert.equal(Number(flags.get(value[1])), Number(value[2]) * (value[3] ? MiB : 1), role + " " + option);
    }
  }
}
