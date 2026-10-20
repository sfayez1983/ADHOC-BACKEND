import ngrok from "@ngrok/ngrok";

/**
 * Opens a public HTTPS address (ngrok) to this backend, so ArcGIS Online
 * webhooks can reach it.
 *
 * Must be called AFTER dotenv has loaded config/.env and the server is listening.
 *
 * config/.env:
 *   NGROK_AUTHTOKEN=...                                  (required)
 *   NGROK_DOMAIN=neatness-palatable-living.ngrok-free.dev (your reserved free domain)
 *   NGROK_ENABLED=false                                  (optional: turn the tunnel off)
 */
const DEFAULT_DOMAIN = "neatness-palatable-living.ngrok-free.dev";

let listener = null;

export const startNgrokTunnel = async (port) => {
  if (String(process.env.NGROK_ENABLED ?? "true").toLowerCase() === "false") {
    console.log("[ngrok] Disabled (NGROK_ENABLED=false)");
    return null;
  }

  const authtoken = String(process.env.NGROK_AUTHTOKEN || "").trim();
  if (!authtoken) {
    console.warn("[ngrok] NGROK_AUTHTOKEN is missing in config/.env, so no public URL was opened. Webhooks from ArcGIS Online can't reach this server.");
    return null;
  }

  const domain = String(process.env.NGROK_DOMAIN || DEFAULT_DOMAIN).trim();

  try {
    listener = await ngrok.forward({ addr: port, authtoken, domain });
    const url = listener.url();
    console.log(`[ngrok] Public URL: ${url}`);
    console.log(`[ngrok] ArcGIS webhook URL: ${url}/api/webhooks/arcgis/<project>/<layer>?key=<ARCGIS_WEBHOOK_KEY>`);
    if (!process.env.ARCGIS_WEBHOOK_KEY) {
      console.warn("[ngrok] ARCGIS_WEBHOOK_KEY is missing in config/.env, so the webhook endpoint will refuse every call.");
    }
    return url;
  } catch (err) {
    // Never crash the backend because of the tunnel
    const msg = String(err?.message || err);
    let hint = "";
    if (/ERR_NGROK_334|already online/i.test(msg)) {
      hint = " Another ngrok session is already using this domain. Close the other one (old terminal, ngrok app or another PC) and restart.";
    } else if (/ERR_NGROK_105|ERR_NGROK_107|authtoken|authentication/i.test(msg)) {
      hint = " The NGROK_AUTHTOKEN is wrong. Copy it again from dashboard.ngrok.com > Your Authtoken.";
    } else if (/ERR_NGROK_313|ERR_NGROK_320|domain/i.test(msg)) {
      hint = ` The domain "${domain}" doesn't belong to this ngrok account. Check NGROK_DOMAIN (dashboard.ngrok.com > Domains).`;
    }
    console.error(`[ngrok] Could not open the tunnel: ${msg}.${hint}`);
    return null;
  }
};

export const stopNgrokTunnel = async () => {
  try {
    await listener?.close();
  } catch {
    /* ignore */
  }
};
