import crypto from "crypto";
import { USER_COMPANY } from "../../common/constant/user.constant.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import {
    getRecentWebhookEvents,
    handleArcgisWebhook,
    normalizeWebhookBody,
} from "../service/webhook.service.js";

// ==========================================
// SECURITY: secret key in the webhook URL
// ==========================================
// The webhook URL must contain ?key=<ARCGIS_WEBHOOK_KEY from config/.env>
const checkKey = (req) => {
    const expected = String(process.env.ARCGIS_WEBHOOK_KEY || "").trim();
    if (!expected) {
        const err = new Error("ARCGIS_WEBHOOK_KEY is not set in config/.env");
        err.statusCode = 503;
        throw err;
    }
    const given = String(req.query.key || req.get("x-webhook-key") || "");
    const a = Buffer.from(given);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        const err = new Error("Invalid webhook key");
        err.statusCode = 401;
        throw err;
    }
};

const checkProjectLayer = async (req) => {
    const project = String(req.params.project || "").toLowerCase();
    const layer = String(req.params.layer || "").toLowerCase();
    if (!Object.values(USER_COMPANY).includes(project)) {
        const err = new Error(`Unknown project "${project}"`);
        err.statusCode = 400;
        throw err;
    }
    try {
        await getLayersConfig(layer, project);
    } catch {
        const err = new Error(`Unknown layer "${layer}" for project "${project}"`);
        err.statusCode = 400;
        throw err;
    }
    return { project, layer };
};

// ==========================================
// ARCGIS ONLINE WEBHOOK
// ==========================================
// POST /api/webhooks/arcgis/:project/:layer?key=...
// Called by ArcGIS Online when features/attachments change.
// Answers right away; the photos are uploaded to Drive in the background.
export const arcgisWebhookCon = async (req, res) => {
    checkKey(req);
    const { project, layer } = await checkProjectLayer(req);

    const items = normalizeWebhookBody(req.body);
    if (!items.length) {
        return res.status(400).json({ success: false, message: "Empty or unreadable webhook payload" });
    }

    const result = handleArcgisWebhook({ project, layer, items });
    res.status(200).json({ success: true, received: items.length, ...result });
}

// GET /api/webhooks/arcgis/:project/:layer?key=...
// Quick check that the URL and key are correct (open it in the browser).
export const arcgisWebhookPingCon = async (req, res) => {
    checkKey(req);
    const { project, layer } = await checkProjectLayer(req);
    res.status(200).json({ success: true, message: `Webhook endpoint for ${project}/${layer} is ready` });
}

// GET /api/webhooks/arcgis/:project/:layer/log?key=...
// Last webhook calls and what was uploaded.
export const arcgisWebhookLogCon = async (req, res) => {
    checkKey(req);
    const { project, layer } = await checkProjectLayer(req);
    res.status(200).json({ success: true, events: getRecentWebhookEvents(project, layer) });
}
