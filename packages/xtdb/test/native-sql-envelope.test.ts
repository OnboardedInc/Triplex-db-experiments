import { describe, expect, it } from "vitest";
import { readOnlyNativeSql } from "../src/native/ReadOnlySql.js";

describe("native SQL line-comment boundaries (local validation only; no SQL is executed)", () => {
  it.each(["\n", "\r", "\r\n"])("rejects a second statement after line ending %j", (ending) => {
    expect(() => readOnlyNativeSql(`SELECT 1--comment${ending}; SELECT 2`)).toThrow();
    expect(() =>
      readOnlyNativeSql(`SELECT 1--comment${ending}; DELETE FROM tx_forensic_marker`),
    ).toThrow();
  });
  it("retains line-ending data inside literals and permits a final comment", () => {
    const data = "SELECT E'--comment\\r; DELETE FROM literal_only' AS message";
    expect(readOnlyNativeSql(data)).toBe(data);
    expect(readOnlyNativeSql("SELECT 1--final comment\r")).toBe("SELECT 1--final comment\r");
  });
});
