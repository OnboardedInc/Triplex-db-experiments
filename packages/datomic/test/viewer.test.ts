import { describe, it, expect } from "vitest";
import { packHtml, unpackHtml } from "../../../lab/trace/viewer.mjs";
describe("offline packed trace viewer", () => {
  it("keeps exact Unicode HTML and executable timeline bytes in one file", () => {
    const html =
      '<!doctype html><h1>Trace λ</h1><script>document.body.dataset.ready="yes";</script>';
    const packed = packHtml(html);
    expect(unpackHtml(packed)).toBe(html);
    expect(() => packHtml(packed)).toThrow("Already packed");
    expect(unpackHtml(html)).toBe(html);
  });
  it("rejects a corrupted embedded checksum", () => {
    const packed = packHtml("<h1>trace</h1>");
    expect(() => unpackHtml(packed.replace(/data-sha256="[a-f0-9]/, 'data-sha256="z'))).toThrow();
  });
});
