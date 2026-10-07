import axios from "axios";

/**
 * GET request to ArcGIS with:
 *  - a 60s timeout (instead of waiting forever)
 *  - up to 3 retries on network problems, 429 and 5xx (2s, 4s, 8s)
 *  - a short, clear error message instead of the full axios dump
 */
const NETWORK_CODES = new Set([
  "ETIMEDOUT", "ECONNRESET", "ECONNABORTED", "ECONNREFUSED",
  "ENETUNREACH", "EHOSTUNREACH", "EAI_AGAIN", "ENOTFOUND", "EPIPE",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (err) => {
  const status = err?.response?.status;
  return NETWORK_CODES.has(err?.code) || status === 429 || (status >= 500 && status < 600);
};

export const arcgisGet = async (url, params = {}, { retries = 3, timeout = 60_000 } = {}) => {
  const host = (() => {
    try { return new URL(url).host; } catch { return url; }
  })();

  for (let attempt = 0; ; attempt++) {
    try {
      return await axios.get(url, { params, timeout });
    } catch (err) {
      if (isRetryable(err) && attempt < retries) {
        const wait = 2000 * 2 ** attempt;
        console.warn(`[arcgis] ${host}: ${err.code || err.response?.status}, retry ${attempt + 1}/${retries} in ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }

      const status = err?.response?.status;
      let message;
      if (NETWORK_CODES.has(err?.code)) {
        message = `Cannot reach ArcGIS (${host}): ${err.code}. Check the internet connection, VPN or firewall, then try again.`;
      } else if (status) {
        message = `ArcGIS (${host}) returned HTTP ${status}.`;
      } else {
        message = `ArcGIS request failed (${host}): ${err.message}`;
      }
      const e = new Error(message);
      e.statusCode = NETWORK_CODES.has(err?.code) ? 503 : status && status >= 500 ? 502 : 500;
      e.code = err?.code;
      throw e;
    }
  }
};
