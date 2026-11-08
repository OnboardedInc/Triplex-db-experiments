// [CX-VDA00] Why: lifecycle fixture health must never contact a live endpoint. Rejected: binding a test server on a shared engine port.
globalThis.fetch = async url => {
  if (String(url) !== 'http://127.0.0.1:8470/health') throw new Error('Unexpected fixture fetch');
  return { ok: true, status: 200, json: async () => ({ datomicVersion: '1.0.7745', gatewaySourceHash: process.env.CX_VDA00_GATEWAY_HASH }) };
};
