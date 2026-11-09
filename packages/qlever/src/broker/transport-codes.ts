// [EXP-P2Q] Why: one source-audited decision table closes socket/DNS/client coverage without prose matching.
// Rejected: a growing inline regex (missing platform errors and silently admitting parser/resource codes).
// node-socket: Node v22.23.2 net socket error propagation + pinned libuv errno/error constants:
// https://nodejs.org/download/release/v22.23.2/docs/api/net.html#event-error_1
// https://github.com/nodejs/node/blob/v22.23.2/deps/uv/include/uv.h (UV_ERRNO_MAP)
// https://github.com/nodejs/node/blob/v22.23.2/deps/uv/include/uv/errno.h (EHOSTDOWN)
// ENETRESET is the explicitly requested OS socket identity; Node net preserves the supplied errno.
// node-lookup: https://github.com/nodejs/node/blob/v22.23.2/deps/uv/docs/src/errors.rst (UV_EAI_*).
// node-dns: https://nodejs.org/download/release/v22.23.2/docs/api/dns.html#error-codes
// node-errors: https://nodejs.org/download/release/v22.23.2/docs/api/errors.html (system/socket/abort errors).
// undici-errors: read installed node_modules/.pnpm/undici@{7.29.0,7.29.1,8.11.2}/node_modules/undici/lib/core/errors.js
// and docs/docs/api/Errors.md; also Node v22.23.2's bundled Undici 6.28.0 lib/core/errors.js.
// ClientClosed/Destroyed/Abort/Socket/Timeout/Proxy classes are transport; response length mismatch is
// an incomplete transfer (client-h1.js:onMessageComplete). Parser/header/body size limits, request length,
// invalid arguments, HTTP status/retry and informational events are explicitly NOT outage identities.
// Installed-source snapshots, license notices, URLs and hashes: lab/experiments/EXP-P2Q-qlever-log-broker/sources-round6/.
export const QLEVER_ERROR_CODE_TABLE = [
  {
    code: "ECONNREFUSED",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ECONNRESET",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ECONNABORTED",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EPIPE",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENOTCONN",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ETIMEDOUT",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EHOSTUNREACH",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EHOSTDOWN",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENETUNREACH",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENETDOWN",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENETRESET",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EADDRNOTAVAIL",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EADDRINUSE",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EAFNOSUPPORT",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EPROTONOSUPPORT",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ESOCKTNOSUPPORT",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENONET",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ESHUTDOWN",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EACCES",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EPERM",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EMFILE",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENFILE",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENOBUFS",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ENOMEM",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EAGAIN",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EINTR",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EIO",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "ECANCELED",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EOF",
    transport: true,
    source: "node-socket",
    reason:
      "Socket connection, address, I/O or allocation failed; the request cannot reach the replica.",
  },
  {
    code: "EAI_ADDRFAMILY",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_AGAIN",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_BADFLAGS",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_BADHINTS",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_CANCELED",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_FAIL",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_FAMILY",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_MEMORY",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_NODATA",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_NONAME",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_OVERFLOW",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_PROTOCOL",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_SERVICE",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "EAI_SOCKTYPE",
    transport: true,
    source: "node-lookup",
    reason: "getaddrinfo could not provide an endpoint for the connection.",
  },
  {
    code: "ENODATA",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EFORMERR",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ESERVFAIL",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ENOTFOUND",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ENOTIMP",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EREFUSED",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADQUERY",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADNAME",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADFAMILY",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADRESP",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ETIMEOUT",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EFILE",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EDESTRUCTION",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADSTR",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADFLAGS",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ENONAME",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EBADHINTS",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ENOTINITIALIZED",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ELOADIPHLPAPI",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "EADDRGETNETWORKPARAMS",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ECANCELLED",
    transport: true,
    source: "node-dns",
    reason: "DNS lookup/query did not provide a usable endpoint; not a QLever result decode.",
  },
  {
    code: "ABORT_ERR",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_SOCKET_CLOSED",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_SOCKET_CLOSED_BEFORE_CONNECTION",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_SOCKET_CONNECTION_TIMEOUT",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_STREAM_DESTROYED",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_STREAM_PREMATURE_CLOSE",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "ERR_HTTP_REQUEST_TIMEOUT",
    transport: true,
    source: "node-errors",
    reason: "Request/socket closed, aborted or timed out before an answer.",
  },
  {
    code: "EBADF",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "EINVAL",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ENOTSOCK",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "EISCONN",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "EALREADY",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ENOPROTOOPT",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "EPROTOTYPE",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_ARG_TYPE",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_CALLBACK",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_HANDLE_TYPE",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_ADDRESS",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_ADDRESS_FAMILY",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_INVALID_IP_ADDRESS",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_SOCKET_BAD_PORT",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_SOCKET_BAD_TYPE",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_SERVER_ALREADY_LISTEN",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_HTTP_INVALID_CHAR",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_HTTP_INVALID_HEADER_VALUE",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_HTTP_CONTENT_LENGTH_MISMATCH",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "ERR_STREAM_WRITE_AFTER_END",
    transport: false,
    source: "node-errors",
    reason: "Invalid argument, handle, local operation or HTTP framing; not outage evidence.",
  },
  {
    code: "UND_ERR_CONNECT_TIMEOUT",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_HEADERS_TIMEOUT",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_BODY_TIMEOUT",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_ABORT",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_ABORTED",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_DESTROYED",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_CLOSED",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_SOCKET",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_PRX_TLS",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_PRX_CONN",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_SOCKS5",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR_RES_CONTENT_LENGTH_MISMATCH",
    transport: true,
    source: "undici-errors",
    reason: "Connection lifecycle/proxy/transfer failed or was aborted before a complete response.",
  },
  {
    code: "UND_ERR",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_BPL_MISSING_UPSTREAM",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_HEADERS_OVERFLOW",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_HTTP_PARSER",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_INFO",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_INVALID_ARG",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_INVALID_RETURN_VALUE",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_MAX_ORIGINS_REACHED",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_NOT_SUPPORTED",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_REQ_CONTENT_LENGTH_MISMATCH",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_REQ_RETRY",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_RESPONSE",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_RESPONSE_STATUS_CODE",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_RES_EXCEEDED_MAX_SIZE",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
  {
    code: "UND_ERR_WS_MESSAGE_SIZE_EXCEEDED",
    transport: false,
    source: "undici-errors",
    reason:
      "Base, validation, parser, HTTP status, informational, retry policy or resource-budget error; not transport identity.",
  },
] as const;

export const qleverTransportCodes: ReadonlyMap<string, boolean> = new Map(
  QLEVER_ERROR_CODE_TABLE.map(({ code, transport }) => [code, transport]),
);
