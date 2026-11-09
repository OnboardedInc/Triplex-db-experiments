import { __exportAll } from "../_virtual/_rolldown/runtime.js";
//#region src/content/Sha256.ts
var Sha256_exports = /* @__PURE__ */ __exportAll({ hex: () => hex });
/**
* SHA-256, with no dependency on Node.
*
* `ContentId` previously imported `node:crypto`, which makes this package
* unusable in a browser. That matters because the configuration kernel is meant
* to decode and validate the same declarations on the server, in the browser
* builder, in the CLI and in tests - a kernel that only runs on Node forces a
* second implementation for the authoring surface, and two implementations of a
* content hash is precisely the thing this whole design cannot survive.
*
* `crypto.subtle.digest` is the obvious browser answer and is rejected here for
* one reason: it is asynchronous. `TypeExpr.id`, `ConfigNode.diff` and the
* canonical encoders are synchronous by design, and making identity async would
* push a Promise into every comparison in the system to avoid one dependency.
*
* So the algorithm is written out. It is ~60 lines of well-specified arithmetic
* with a total test oracle available - `Sha256.test.ts` compares it against
* `node:crypto` over random and adversarial inputs, so a transcription error
* cannot survive a test run. That is a better trade than a supply-chain
* dependency in the one function every identity in the store rests on.
*/
const K = new Uint32Array([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
const rotr = (x, n) => x >>> n | x << 32 - n;
const HEX = "0123456789abcdef";
/** Lowercase hex SHA-256 of a string, encoded as UTF-8. */
const hex = (input) => {
	const bytes = new TextEncoder().encode(input);
	const bitLength = bytes.length * 8;
	const total = Math.ceil((bytes.length + 9) / 64) * 64;
	const buffer = new Uint8Array(total);
	buffer.set(bytes);
	buffer[bytes.length] = 128;
	const view = new DataView(buffer.buffer);
	view.setUint32(total - 8, Math.floor(bitLength / 4294967296));
	view.setUint32(total - 4, bitLength >>> 0);
	const h = new Uint32Array([
		1779033703,
		3144134277,
		1013904242,
		2773480762,
		1359893119,
		2600822924,
		528734635,
		1541459225
	]);
	const w = new Uint32Array(64);
	for (let offset = 0; offset < total; offset += 64) {
		for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
		for (let i = 16; i < 64; i++) {
			const x = w[i - 15];
			const y = w[i - 2];
			const s0 = rotr(x, 7) ^ rotr(x, 18) ^ x >>> 3;
			const s1 = rotr(y, 17) ^ rotr(y, 19) ^ y >>> 10;
			w[i] = w[i - 16] + s0 + w[i - 7] + s1 >>> 0;
		}
		let [a, b, c, d, e, f, g, hh] = [...h];
		for (let i = 0; i < 64; i++) {
			const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
			const ch = e & f ^ ~e & g;
			const t1 = hh + s1 + ch + K[i] + w[i] >>> 0;
			const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + (a & b ^ a & c ^ b & c) >>> 0;
			hh = g;
			g = f;
			f = e;
			e = d + t1 >>> 0;
			d = c;
			c = b;
			b = a;
			a = t1 + t2 >>> 0;
		}
		h[0] = h[0] + a >>> 0;
		h[1] = h[1] + b >>> 0;
		h[2] = h[2] + c >>> 0;
		h[3] = h[3] + d >>> 0;
		h[4] = h[4] + e >>> 0;
		h[5] = h[5] + f >>> 0;
		h[6] = h[6] + g >>> 0;
		h[7] = h[7] + hh >>> 0;
	}
	let out = "";
	for (let i = 0; i < 8; i++) {
		const word = h[i];
		for (let shift = 28; shift >= 0; shift -= 4) out += HEX[word >>> shift & 15];
	}
	return out;
};
//#endregion
export { Sha256_exports, hex };

//# sourceMappingURL=Sha256.js.map