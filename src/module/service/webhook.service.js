import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import { arcgisGet, arcgisPost } from "../../utils/arcgis/arcgisGet.js";
import { queryFeaturesService } from "./map.service.js";
import { getAttachmentsService } from "./checkData.service.js";
import { uploadAttachmentsToDrive } from "./driveUpload.service.js";

/**
 * ArcGIS Online feature layer webhook -> upload the changed outlets' photos to Drive.
 *
 * The webhook payload does not contain the changed features. It contains a
 * `changesUrl` (Extract Changes) with the serverGens range of the edit. We call
 * Extract Changes ourselves (with our token) to get the changed OBJECTIDs, then
 * reuse the same services as the bulk upload: outlets -> attachments -> Drive.
 * Photos already in the outlet's Drive folder are skipped, so only new ones upload.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../../data/webhooks");
const MAX_IN_MEMORY_EVENTS = 100;

const RELEVANT_EVENTS = new Set([
  "FeaturesCreated",
  "FeaturesUpdated",
  "FeaturesEdited",
  "AttachmentsCreated",
  "AttachmentsUpdated",
]);
const ATTACHMENT_EVENTS = new Set(["AttachmentsCreated", "AttachmentsUpdated"]);

const recentEvents = []; // newest first
const queues = new Map(); // "project:layer" -> promise chain (one upload at a time per layer)

/* ================================ Helpers ================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ".../FeatureServer/1" -> { serviceUrl: ".../FeatureServer", layerId: 1 }
const splitLayerUrl = (layerUrl) => {
  const m = String(layerUrl || "").replace(/\/+$/, "").match(/^(.*\/FeatureServer)\/(\d+)$/i);
  if (!m) throw new Error(`Layer URL must end with /FeatureServer/<layerId>: ${layerUrl}`);
  return { serviceUrl: m[1], layerId: Number(m[2]) };
};

const serviceNameFromUrl = (url) => String(url || "").match(/\/services\/([^/]+)\/FeatureServer/i)?.[1];

const logEvent = (entry) => {
  const record = { at: new Date().toISOString(), ...entry };
  recentEvents.unshift(record);
  recentEvents.length = Math.min(recentEvents.length, MAX_IN_MEMORY_EVENTS);
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const file = path.join(LOG_DIR, `${entry.project || "unknown"}_${entry.layer || "unknown"}.log`);
    fs.appendFileSync(file, JSON.stringify(record) + "\n");
  } catch {
    /* logging must never break the webhook */
  }
  return record;
};

export const getRecentWebhookEvents = (project, layer) =>
  recentEvents.filter((e) => (!project || e.project === project) && (!layer || e.layer === layer));

/**
 * ArcGIS can send JSON (an array) or form-urlencoded. Normalize to an array of payload items.
 */
export const normalizeWebhookBody = (body) => {
  const tryParse = (v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };

  let data = tryParse(body);
  if (data && !Array.isArray(data) && typeof data === "object" && !data.changesUrl && !data.events) {
    // form-urlencoded: the JSON is inside one of the fields
    for (const value of Object.values(data)) {
      const parsed = tryParse(value);
      if (parsed && (Array.isArray(parsed) || parsed.changesUrl || parsed.events)) {
        data = parsed;
        break;
      }
    }
  }
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]).filter((x) => x && typeof x === "object");
};

/* ============================ Layer metadata ============================= */

const layerInfoCache = new Map();

const getLayerInfo = async (layerUrl, token) => {
  if (!layerInfoCache.has(layerUrl)) {
    const { data } = await arcgisGet(layerUrl, { f: "json", token });
    if (data?.error) throw new Error(`ArcGIS layer info: ${data.error.message || data.error.code}`);
    layerInfoCache.set(layerUrl, {
      objectIdField: data.objectIdField || "OBJECTID",
      globalIdField: data.globalIdField || "GlobalID",
    });
  }
  return layerInfoCache.get(layerUrl);
};

/* ============================ Extract Changes ============================ */

// Pull OBJECTIDs / parent GlobalIDs out of any Extract Changes result shape
const collectChangedIds = (result, layerId, objectIdField) => {
  const objectIds = new Set();
  const parentGlobalIds = new Set();
  const edits = (result?.edits || []).filter((e) => e.id === undefined || Number(e.id) === layerId);

  const oidOf = (attrs = {}) => {
    const key = Object.keys(attrs).find((k) => k.toLowerCase() === objectIdField.toLowerCase());
    return key ? attrs[key] : undefined;
  };

  for (const edit of edits) {
    // returnIdsOnly=true
    for (const id of [...(edit.objectIds?.adds || []), ...(edit.objectIds?.updates || [])]) {
      if (id !== undefined && id !== null) objectIds.add(Number(id));
    }
    // full features
    for (const f of [...(edit.features?.adds || []), ...(edit.features?.updates || [])]) {
      const id = typeof f === "object" ? oidOf(f.attributes) : f;
      if (id !== undefined && id !== null) objectIds.add(Number(id));
    }
    // attachments -> parent feature
    for (const a of [...(edit.attachments?.adds || []), ...(edit.attachments?.updates || [])]) {
      if (!a || typeof a !== "object") continue;
      const lower = Object.fromEntries(Object.entries(a).map(([k, v]) => [k.toLowerCase(), v]));
      if (lower.parentobjectid !== undefined) objectIds.add(Number(lower.parentobjectid));
      if (lower.parentglobalid) parentGlobalIds.add(String(lower.parentglobalid));
    }
  }
  return { objectIds, parentGlobalIds };
};

// Async Extract Changes: statusUrl -> wait for Completed -> resultUrl
const extractChangesAsync = async (serviceUrl, params, token) => {
  const { data: start } = await arcgisPost(`${serviceUrl}/extractChanges`, { ...params, f: "json", token });
  if (start?.error) throw new Error(`Extract Changes: ${start.error.message || start.error.code}`);
  if (start?.edits) return start; // answered synchronously anyway
  if (!start?.statusUrl) throw new Error("Extract Changes did not return a statusUrl");

  for (let i = 0; i < 60; i++) {
    await sleep(2000);
    const { data: status } = await arcgisGet(start.statusUrl, { f: "json", token });
    const s = String(status?.status || "").toLowerCase();
    if (s === "completed") {
      const { data: result } = await arcgisGet(status.resultUrl, { token });
      return typeof result === "string" ? JSON.parse(result) : result;
    }
    if (s === "failed" || status?.error) {
      throw new Error(`Extract Changes job failed: ${status?.error?.message || status?.status}`);
    }
  }
  throw new Error("Extract Changes job did not finish in 2 minutes");
};

/**
 * Returns the OBJECTIDs of features changed in this webhook event
 * (including features whose attachments changed).
 */
const getChangedObjectIds = async ({ item, layerUrl, token }) => {
  const { serviceUrl, layerId } = splitLayerUrl(layerUrl);
  const changes = new URL(item.changesUrl);
  const serverGens = changes.searchParams.get("serverGens");
  if (!serverGens) throw new Error("changesUrl has no serverGens");

  const { objectIdField, globalIdField } = await getLayerInfo(layerUrl, token);
  const base = {
    layers: JSON.stringify([layerId]),
    serverGens,
    returnInserts: true,
    returnUpdates: true,
    returnDeletes: false,
  };

  // 1) Fast: IDs only (synchronous)
  const { data: idsResult } = await arcgisPost(`${serviceUrl}/extractChanges`, {
    ...base,
    returnIdsOnly: true,
    returnAttachments: true,
    f: "json",
    token,
  });
  if (idsResult?.error) {
    throw new Error(`Extract Changes: ${idsResult.error.message || idsResult.error.code}`);
  }
  let { objectIds, parentGlobalIds } = collectChangedIds(idsResult, layerId, objectIdField);

  // 2) Attachment-only edits may not list the parent feature in "IDs only" mode:
  //    ask for the full change set, which includes the attachments' parent GlobalIDs.
  const attachmentEvent = (item.events || []).some((e) => ATTACHMENT_EVENTS.has(e));
  if (!objectIds.size && attachmentEvent) {
    const full = await extractChangesAsync(
      serviceUrl,
      { ...base, returnIdsOnly: false, returnAttachments: true, returnAttachmentsDataByUrl: true, dataFormat: "json" },
      token
    );
    ({ objectIds, parentGlobalIds } = collectChangedIds(full, layerId, objectIdField));
  }

  // 3) Parent GlobalIDs -> OBJECTIDs
  if (parentGlobalIds.size) {
    const list = [...parentGlobalIds].map((g) => `'${g.replace(/'/g, "''")}'`).join(",");
    const { data } = await arcgisPost(`${layerUrl}/query`, {
      where: `${globalIdField} IN (${list})`,
      returnIdsOnly: true,
      f: "json",
      token,
    });
    if (data?.error) throw new Error(`GlobalID lookup: ${data.error.message || data.error.code}`);
    (data?.objectIds || []).forEach((id) => objectIds.add(Number(id)));
  }

  return { objectIds: [...objectIds], objectIdField };
};

/* =============================== Processing ============================== */

const processWebhookItem = async ({ project, layer, item }) => {
  const started = Date.now();
  const { url: layerUrl, token } = await getLayersConfig(layer, project);
  if (!layerUrl) throw new Error(`ArcGIS URL is missing for ${project}/${layer}`);

  // Make sure the webhook belongs to this layer (avoids uploading from the wrong service)
  const expectedService = serviceNameFromUrl(layerUrl);
  const payloadService = item.serviceName || serviceNameFromUrl(item.changesUrl);
  if (expectedService && payloadService && expectedService.toLowerCase() !== payloadService.toLowerCase()) {
    return logEvent({
      project, layer, status: "ignored",
      reason: `Webhook is for service "${payloadService}", but ${project}/${layer} is "${expectedService}"`,
      events: item.events,
    });
  }
  const { layerId } = splitLayerUrl(layerUrl);
  if (item.layerId !== undefined && Number(item.layerId) !== layerId) {
    return logEvent({ project, layer, status: "ignored", reason: `Change is on layer ${item.layerId}, not ${layerId}`, events: item.events });
  }

  // 1) Which outlets changed?
  const { objectIds, objectIdField } = await getChangedObjectIds({ item, layerUrl, token });
  if (!objectIds.length) {
    return logEvent({ project, layer, status: "no_changes", events: item.events, ms: Date.now() - started });
  }

  // 2) Outlet data (customer_code, VIP_Contract) - same service as the bulk upload
  const where = `${objectIdField} IN (${objectIds.join(",")})`;
  const data = await queryFeaturesService([layer], project, { where, outFields: "*", returnGeometry: "false" });
  const outlets = data[layer]?.features || [];

  // 3) Their attachments (photo url + name)
  const attachments = await getAttachmentsService(objectIds, outlets, [layer], project);
  const attachmentGroups = attachments?.allAttachments || [];

  // 4) Upload; photos already in the outlet's Drive folder are skipped
  const summary = await uploadAttachmentsToDrive({ attachmentGroups, layer, project });

  return logEvent({
    project,
    layer,
    status: summary.aborted ? "failed" : summary.failed.length ? "completed_with_errors" : "completed",
    events: item.events,
    objectIds,
    customerCodes: attachmentGroups.map((g) => g.customer_code),
    photos: summary.total,
    uploaded: summary.uploaded,
    alreadyInDrive: summary.skipped,
    failed: summary.failed,
    error: summary.abortReason || undefined,
    ms: Date.now() - started,
  });
};

/**
 * Queue the webhook payload. Runs in the background, one at a time per layer,
 * so the webhook gets a fast 200 and edits are uploaded in order.
 */
export const handleArcgisWebhook = ({ project, layer, items }) => {
  const relevant = items.filter(
    (item) => item.changesUrl && (item.events || []).some((e) => RELEVANT_EVENTS.has(e))
  );
  const skipped = items.length - relevant.length;
  if (skipped) {
    logEvent({
      project, layer, status: "ignored",
      reason: "No photo-related event (create/update/attachments) or no changesUrl",
      events: items.flatMap((i) => i.events || []),
    });
  }

  const key = `${project}:${layer}`;
  for (const item of relevant) {
    const previous = queues.get(key) || Promise.resolve();
    const next = previous
      .then(() => processWebhookItem({ project, layer, item }))
      .then((rec) => {
        if (rec?.status) {
          console.log(
            `[webhook] ${project}/${layer} ${rec.status}` +
              (rec.objectIds ? `: outlets ${rec.customerCodes?.join(", ") || rec.objectIds.join(", ")}, uploaded ${rec.uploaded}, already in Drive ${rec.alreadyInDrive}` : "")
          );
        }
      })
      .catch((err) => {
        console.error(`[webhook] ${project}/${layer} failed:`, err.message);
        logEvent({ project, layer, status: "failed", events: item.events, error: err.message });
      });
    queues.set(key, next);
    next.finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    });
  }

  return { accepted: relevant.length, ignored: skipped };
};
