import { expect, it } from "vitest";
import { parseDarwinDiskStats } from "../../../lab/trace/disk-stats.mjs";

it("retains counter values and boot-local driver IDs without hardware identity strings", () => {
  const rows =
    parseDarwinDiskStats(`+-o IOBlockStorageDriver <class IOBlockStorageDriver, id 0x123, registered>
  "Serial Number" = "private-device"
  "Statistics" = {"Operations (Write)"=17,"Total Time (Write)"=123456,"Latency Time (Write)"=0}
+-o IOBlockStorageDriver <class IOBlockStorageDriver, id 0x456, registered>
  "Statistics" = {"Operations (Read)"=21,"Bytes (Read)"=512}
`);
  expect(rows).toEqual([
    {
      driver: "0x123",
      statistics: {
        "Operations (Write)": 17,
        "Total Time (Write)": 123456,
        "Latency Time (Write)": 0,
      },
    },
    { driver: "0x456", statistics: { "Operations (Read)": 21, "Bytes (Read)": 512 } },
  ]);
  expect(JSON.stringify(rows)).not.toContain("private-device");
});

it("refuses missing or non-exact counters instead of manufacturing a disk observation", () => {
  expect(() => parseDarwinDiskStats("")).toThrow("unavailable");
  expect(() =>
    parseDarwinDiskStats(
      '+-o IOBlockStorageDriver <class IOBlockStorageDriver, id 0x123, registered>\n"Statistics" = {"Bytes"=9007199254740993}',
    ),
  ).toThrow("Invalid");
});
