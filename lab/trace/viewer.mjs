import { gzipSync, gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const marker = "triplex-packed-html-v1";
// [DX-T1-4] Why: repeated 50-MB self-contained viewers exhausted the measurement disk; gzip keeps every byte in one offline file.
// Rejected: deleting raw traces or requiring a server/network to load a saved timeline.
/** @param {string} html */
export function packHtml(html) {
  if (html.includes(`id="${marker}"`)) throw Error("Already packed HTML");
  const bytes = Buffer.from(html),
    hash = createHash("sha256").update(bytes).digest("hex");
  const packed = gzipSync(bytes, { level: 6 }).toString("base64");
  return `<!doctype html><meta charset="utf-8"><title>Saved trace</title><p id="state">Opening saved trace…</p><script type="application/octet-stream" id="${marker}" data-sha256="${hash}">${packed}</script><script type="module">
try {
 const saved=document.getElementById('${marker}'),bytes=Uint8Array.from(atob(saved.textContent),c=>c.charCodeAt(0));
 const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',decoded)),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==saved.dataset.sha256)throw Error('Saved trace checksum mismatch');
 const html=new TextDecoder().decode(decoded);document.open();document.write(html);document.close();
} catch(error) { document.getElementById('state').textContent='Cannot open saved trace: '+error.message; }
</script>`;
}
/** @param {string} html */
export function unpackHtml(html) {
  const match = html.match(
    /id="triplex-packed-html-v1" data-sha256="([0-9a-f]{64})">([A-Za-z0-9+/=]+)<\/script>/,
  );
  if (!match) {
    if (html.includes(`id="${marker}"`)) throw Error("Invalid packed HTML");
    return html;
  }
  const bytes = gunzipSync(Buffer.from(match[2], "base64"));
  if (createHash("sha256").update(bytes).digest("hex") !== match[1])
    throw Error("Packed HTML checksum mismatch");
  return bytes.toString("utf8");
}
