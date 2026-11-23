// [DX-SCALE1] Why: recovery must resolve the exact operation ID through the gateway's path segment. Rejected: sending a slash-delimited tape key through an encoded path.
export const operationId = (nonce: string, version: string) =>
  nonce + "-" + version.replaceAll("/", "-");
