// Canonical origin rules. Release builds must name a public https origin
// (e.g. https://lifeinuk.info) explicitly; local builds may use local origins.

const PRIVATE_HOST = [
  /^localhost$/i, /\.localhost$/i, /\.local$/i, /\.internal$/i, /\.lan$/i,
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\.0\.0\.0$/,
  /^\[?::1\]?$/, /^\[?f[cd][0-9a-f]{2}:/i, /^\[?fe80:/i,
];

export function isPrivateHost(host) {
  return PRIVATE_HOST.some((pattern) => pattern.test(host));
}

/** The origin for a release build, or a clear error. */
export function resolveReleaseOrigin(value) {
  if (!value || !value.trim())
    throw new Error("PUBLIC_ORIGIN is required for a release build (for example PUBLIC_ORIGIN=https://lifeinuk.info)");
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`PUBLIC_ORIGIN is not a valid URL: ${value}`);
  }
  if (url.protocol !== "https:") throw new Error(`PUBLIC_ORIGIN must use https for a release build: ${value}`);
  if (isPrivateHost(url.hostname)) throw new Error(`PUBLIC_ORIGIN must be a public host, not ${url.hostname}`);
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password)
    throw new Error(`PUBLIC_ORIGIN must be a bare origin with no path, query or credentials: ${value}`);
  return url.origin;
}
