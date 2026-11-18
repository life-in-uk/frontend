// Bounded retry for HTTP 429 from the production API. nginx limits the API to
// 10 requests/s per viewer (burst 100), and a release build or site
// verification makes several hundred requests, so builds and checks against
// https://lifeinuk.info must slow down instead of failing. Any other status is
// returned unchanged; after the last attempt the 429 itself is returned.

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Seconds from a Retry-After header (delta-seconds only), or undefined. */
function retryAfterMs(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || String(raw).trim() === "") return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds, 30) * 1000 : undefined;
}

/**
 * Calls send() until its result is not a 429, at most `attempts` times, waiting
 * Retry-After or an exponential backoff (1 s, 2 s, 4 s … capped at 15 s).
 * Works with fetch Responses and with node:http results ({ status, headers }).
 */
export async function withRetryOn429(send, { attempts = 8, wait = sleep } = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await send();
    const status = response.status;
    if (status !== 429 || attempt >= attempts) return response;
    const header = typeof response.headers?.get === "function" ? response.headers.get("retry-after") : response.headers?.["retry-after"];
    await wait(retryAfterMs(header) ?? Math.min(1000 * 2 ** (attempt - 1), 15000));
  }
}
