import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DATA_DIR } from "../../utils/dataDir.js";
import { arcgisPost } from "../../utils/arcgis/arcgisGet.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import {
  getDriveClient,
  getDriveRootFolderId,
} from "../../../config/driveAPI.config.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";

/* ================================ Errors ================================ */

export class DriveUploadError extends Error {
  constructor(message, statusCode = 500, { fatal = false, cause } = {}) {
    super(message);
    this.name = "DriveUploadError";
    this.statusCode = statusCode;
    this.fatal = fatal; // fatal = stop the whole run (auth/config problems)
    if (cause) this.cause = cause;
  }
}

const NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNABORTED",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPIPE",
  "ECONNREFUSED",
]);

const getStatus = (err) =>
  err?.response?.status ?? (typeof err?.code === "number" ? err.code : undefined);

const getGoogleReason = (err) =>
  err?.response?.data?.error?.errors?.[0]?.reason ||
  err?.errors?.[0]?.reason ||
  err?.response?.data?.error; // e.g. "invalid_grant" from the token endpoint

/** Turn Google / ArcGIS / network errors into a clear message. */
const explainError = (err, context = "") => {
  if (err instanceof DriveUploadError || err?.name === "DriveConfigError") return err;

  const status = getStatus(err);
  const reason = getGoogleReason(err);
  const where = context ? `${context}: ` : "";

  if (reason === "invalid_grant") {
    return new DriveUploadError(
      `${where}Google refresh token is expired or revoked. Run "npm run drive:token" and update GOOGLE_DRIVE_REFRESH_TOKEN in config/.env.`,
      401,
      { fatal: true, cause: err }
    );
  }
  if (reason === "invalid_client" || reason === "unauthorized_client") {
    return new DriveUploadError(
      `${where}Google rejected the client ID/secret. Check GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in config/.env.`,
      401,
      { fatal: true, cause: err }
    );
  }
  if (status === 401) {
    return new DriveUploadError(`${where}Google Drive authentication failed (401).`, 401, {
      fatal: true,
      cause: err,
    });
  }
  if (reason === "storageQuotaExceeded") {
    return new DriveUploadError(`${where}Google Drive storage is full.`, 507, {
      fatal: true,
      cause: err,
    });
  }
  if (reason === "insufficientPermissions" || reason === "insufficientFilePermissions") {
    return new DriveUploadError(
      `${where}The Google account has no write access to this folder.`,
      403,
      { fatal: true, cause: err }
    );
  }
  if (status === 403 && /has not been used|disabled/i.test(err?.message || "")) {
    return new DriveUploadError(
      `${where}Google Drive API is not enabled for this Cloud project.`,
      403,
      { fatal: true, cause: err }
    );
  }
  if (NETWORK_CODES.has(err?.code)) {
    return new DriveUploadError(`${where}Network error (${err.code}).`, 503, { cause: err });
  }

  return new DriveUploadError(`${where}${err?.message || String(err)}`, status || 500, {
    cause: err,
  });
};

/* =============================== Helpers ================================ */

// Escape a value for use inside a Drive query string ('...')
const escapeQ = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

// Drive allows most characters, but slashes make names confusing
const sanitizeName = (s) => String(s ?? "").replace(/[\/\\]/g, "-").trim();

const clean = (v) => String(v ?? "").trim();

// Folder name for an outlet (set by assignOutletFolderNames before any upload):
//   1) customer_code
//   2) new_adhoc_code            (used by several outlets -> <new_adhoc_code>)
//   3) <Area_Name>_<Block_No>_<Shop_Code>
const outletFolderName = (group) =>
  sanitizeName(group.folderName || clean(group.customer_code) || `OBJECTID_${group.parentObjectId}`);

// Names that contain a random nanoid are saved here, so the same outlet gets the
// same folder on the next run, a resume or a webhook call (no second folder / re-upload).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAMES_DIR = path.join(DATA_DIR, "drive-folders");
const namesFile = (project, layer) =>
  path.join(NAMES_DIR, `${project}_${layer}`.replace(/[^a-z0-9_-]/gi, "-") + ".json");

const loadNames = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) || {};
  } catch {
    return {};
  }
};

const saveNames = (file, names) => {
  fs.mkdirSync(NAMES_DIR, { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(names, null, 2));
  fs.renameSync(`${file}.tmp`, file);
};

// new_adhoc_code / Area_Name / Block_No / Shop_Code of the outlets, from ArcGIS (the attachment groups only carry customer_code).
// Only fields that exist on the layer are requested (a missing field makes ArcGIS reject the whole query).
const NAME_FIELDS = ["new_adhoc_code", "Area_Name", "Block_No", "Shop_Code"];

const fetchNameFields = async (url, token, objectIds) => {
  const byId = new Map();

  const { data: info } = await arcgisPost(url, { f: "json", token });
  if (info.error) throw new DriveUploadError(`Reading layer fields failed: ${info.error.message || info.error.code}`, 502);

  const idField = info.objectIdField || "OBJECTID";
  const layerFields = new Map((info.fields || []).map((f) => [f.name.toLowerCase(), f.name]));
  const wanted = NAME_FIELDS.map((n) => layerFields.get(n.toLowerCase())).filter(Boolean);
  const missing = NAME_FIELDS.filter((n) => !layerFields.has(n.toLowerCase()));
  if (missing.length) console.warn(`[drive] Layer has no field: ${missing.join(", ")} (treated as empty for folder names)`);
  if (!wanted.length) return byId;

  const BATCH = 200;
  for (let i = 0; i < objectIds.length; i += BATCH) {
    const ids = objectIds.slice(i, i + BATCH);
    const { data } = await arcgisPost(`${url}/query`, {
      f: "json",
      where: `${idField} IN (${ids.join(",")})`,
      outFields: [idField, ...wanted].join(","),
      returnGeometry: false,
      token,
    });
    if (data.error) throw new DriveUploadError(`Reading outlet names failed: ${data.error.message || data.error.code}`, 502);

    for (const f of data.features || []) {
      // normalise to our field names, whatever the layer's letter case is
      const attrs = {};
      for (const n of NAME_FIELDS) attrs[n] = f.attributes[layerFields.get(n.toLowerCase())];
      byId.set(f.attributes[idField], attrs);
    }
  }
  return byId;
};

/**
 * Sets group.folderName on every group (groups that already have one are left alone).
 *   customer_code -> new_adhoc_code (+ _nanoid if duplicated) -> Area_Name_Block_ID_nanoid
 */
export const assignOutletFolderNames = async ({ groups = [], layer, project, url, token, save = true }) => {
  const file = namesFile(project, layer);
  const saved = loadNames(file);
  let changed = false;

  const pending = [];
  for (const g of groups) {
    if (g.folderName) continue;
    const customerCode = clean(g.customer_code);
    if (customerCode) {
      g.folderName = customerCode;
    } else if (saved[g.parentObjectId]) {
      g.folderName = saved[g.parentObjectId];
    } else {
      pending.push(g);
    }
  }
  if (!pending.length) return groups;

  // only ask ArcGIS when the groups do not already carry the fields (see getAttachmentsService)
  const needFetch = pending.filter((g) => g.new_adhoc_code === undefined || g.Area_Name === undefined || g.Block_No === undefined || g.Shop_Code === undefined);
  const attrsById = needFetch.length
    ? await fetchNameFields(url, token, [...new Set(needFetch.map((g) => g.parentObjectId))])
    : new Map();
  for (const g of pending) {
    const a = attrsById.get(g.parentObjectId) || {};
    g.new_adhoc_code = clean(g.new_adhoc_code ?? a.new_adhoc_code);
    g.Area_Name = clean(g.Area_Name ?? a.Area_Name);
    g.Block_No = clean(g.Block_No ?? a.Block_No);
    g.Shop_Code = clean(g.Shop_Code ?? a.Shop_Code);
  }

  // a code is "duplicated" if another outlet in this run, or an outlet saved earlier, already uses it
  const uses = new Map();
  for (const g of pending) {
    if (g.new_adhoc_code) uses.set(g.new_adhoc_code, (uses.get(g.new_adhoc_code) || 0) + 1);
  }
  const taken = new Set([...Object.values(saved), ...groups.map((g) => g.folderName).filter(Boolean)]);

  for (const g of pending) {
    let name;
    if (g.new_adhoc_code) {
      name = uses.get(g.new_adhoc_code) > 1 || taken.has(g.new_adhoc_code)
        ? `${g.new_adhoc_code}`
        : g.new_adhoc_code;
    } else {
      const parts = [g.Area_Name, g.Block_No, g.Shop_Code].filter(Boolean);
      name = [...(parts.length ? parts : [`OBJECTID_${g.parentObjectId}`])].join("_");
    }
    g.folderName = sanitizeName(name);
    saved[g.parentObjectId] = g.folderName;
    changed = true;
  }

  if (changed && save) {
    try {
      saveNames(file, saved);
    } catch (err) {
      console.warn(`[drive] Could not save folder names (${err.code || err.message}); continuing`);
    }
  }
  return groups;
};

// File name in Drive: <customer_code>_<keywords>_<attachmentId>.jpg
const photoFileName = (outletName, att) => {
  const ext = path.extname(att.name || "") || ".jpg";
  const keyword = att.keywords ? `_${sanitizeName(att.keywords)}` : "";
  return `${outletName}${keyword}_${att.id}${ext}`;
};

// ".../services/RedBullEGAudit_SeptRound/FeatureServer/1" -> "RedBullEGAudit_SeptRound"
const layerNameFromUrl = (url) => {
  const match = String(url || "").match(/\/services\/([^/]+)\//);
  return match ? match[1] : "ArcGIS_Layer";
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (err) => {
  const status = getStatus(err);
  const reason = getGoogleReason(err);
  return (
    status === 429 ||
    (status >= 500 && status < 600) ||
    reason === "rateLimitExceeded" ||
    reason === "userRateLimitExceeded" ||
    NETWORK_CODES.has(err?.code) ||
    err?.retryable === true
  );
};

// Retry on rate limits, 5xx and network errors with exponential backoff
const withRetry = async (fn, retries = 4) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isRetryable(err) || attempt >= retries) throw err;
      await sleep(1000 * 2 ** attempt + Math.random() * 500); // ~1s, 2s, 4s, 8s
    }
  }
};

// Run `worker` over `items` with at most `limit` running at once.
// Stops picking up new items once `shouldStop()` returns true.
const runPool = async (items, limit, worker, shouldStop = () => false) => {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length && !shouldStop()) {
      const idx = next++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
};

/* =========================== Drive operations =========================== */

// Fail fast if the root folder is wrong or not reachable
const verifyRootFolder = async (drive, folderId) => {
  try {
    const { data } = await withRetry(() =>
      drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, trashed, capabilities(canAddChildren)",
        supportsAllDrives: true,
      })
    );
    if (data.mimeType !== FOLDER_MIME) {
      throw new DriveUploadError(`GOOGLE_DRIVE_ROOT_FOLDER_ID "${folderId}" is not a folder.`, 400, {
        fatal: true,
      });
    }
    if (data.trashed) {
      throw new DriveUploadError(`Root Drive folder "${data.name}" is in the trash.`, 400, {
        fatal: true,
      });
    }
    if (data.capabilities && data.capabilities.canAddChildren === false) {
      throw new DriveUploadError(`No permission to add files to Drive folder "${data.name}".`, 403, {
        fatal: true,
      });
    }
    return data;
  } catch (err) {
    if (getStatus(err) === 404) {
      throw new DriveUploadError(
        `Drive root folder "${folderId}" was not found. Check GOOGLE_DRIVE_ROOT_FOLDER_ID and that the signed-in Google account can open it.`,
        404,
        { fatal: true, cause: err }
      );
    }
    throw explainError(err, "Checking root folder");
  }
};

export const driveFolderLink = (folderId) => `https://drive.google.com/drive/folders/${folderId}`;

// Folders already known to be "anyone with the link can view" (saves Drive calls)
const sharedFolders = new Set();

/**
 * Makes a folder viewable by anyone who has its link (view only, not listed or searchable).
 * Photos inside inherit this. Does nothing if the folder is already shared that way.
 * @returns {Promise<boolean>} true if it changed the sharing, false if it was already shared
 */
export const shareFolderByLink = async (drive, folderId) => {
  if (sharedFolders.has(folderId)) return false;

  const { data } = await withRetry(() =>
    drive.permissions.list({ fileId: folderId, fields: "permissions(type, role)", supportsAllDrives: true })
  );
  const already = (data.permissions || []).some((p) => p.type === "anyone");
  if (!already) {
    await withRetry(() =>
      drive.permissions.create({
        fileId: folderId,
        requestBody: { type: "anyone", role: "reader", allowFileDiscovery: false },
        supportsAllDrives: true,
      })
    );
  }
  sharedFolders.add(folderId);
  return !already;
};

/** Shares many folders (a few at a time). @returns {{ shared: number, alreadyShared: number, failed: Array }} */
export const shareFoldersByLink = async (folderIds, { drive: driveClient, concurrency = 5 } = {}) => {
  const drive = driveClient || getDriveClient();
  const result = { shared: 0, alreadyShared: 0, failed: [] };
  const queue = [...new Set(folderIds)];
  const worker = async () => {
    while (queue.length) {
      const id = queue.shift();
      try {
        if (await shareFolderByLink(drive, id)) result.shared++;
        else result.alreadyShared++;
      } catch (err) {
        result.failed.push({ folderId: id, error: explainError(err, "Sharing folder").message });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return result;
};

// `cache` (one per run) stops two parallel workers creating the same folder twice
const findOrCreateFolder = (drive, name, parentId, folderCache = new Map()) => {
  const key = `${parentId}/${name}`;
  if (!folderCache.has(key)) {
    const promise = (async () => {
      const { data } = await withRetry(() =>
        drive.files.list({
          q: `name = '${escapeQ(name)}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`,
          fields: "files(id)",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })
      );
      if (data.files?.length) return data.files[0].id;

      const res = await withRetry(() =>
        drive.files.create({
          requestBody: { name, mimeType: FOLDER_MIME, parents: [parentId] },
          fields: "id",
          supportsAllDrives: true,
        })
      );
      return res.data.id;
    })();
    // Don't cache failures
    promise.catch(() => folderCache.delete(key));
    folderCache.set(key, promise);
  }
  return folderCache.get(key);
};

// Names of files already in a folder, so re-runs skip what's uploaded
const listFileNames = async (drive, folderId) => {
  const names = new Set();
  let pageToken;
  do {
    const { data } = await withRetry(() =>
      drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken, files(name)",
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })
    );
    (data.files || []).forEach((f) => names.add(f.name));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return names;
};

/* ========================== ArcGIS download ============================= */

// Downloads one attachment as a stream and checks it is really an image,
// not an ArcGIS JSON error (expired token returns 200 + JSON).
const downloadAttachment = async (att, token) => {
  let response;
  try {
    response = await axios.get(att.url, {
      params: token ? { token } : {},
      responseType: "stream",
      timeout: 60_000,
    });
  } catch (err) {
    const status = getStatus(err);
    if (status === 404) {
      throw new DriveUploadError(`Attachment ${att.id} no longer exists in ArcGIS.`, 404);
    }
    if (status === 401 || status === 403 || status === 498 || status === 499) {
      throw new DriveUploadError(
        "ArcGIS token is invalid or expired. Update the service token in config/.env.",
        401,
        { fatal: true, cause: err }
      );
    }
    throw err; // network / 5xx -> retried by withRetry
  }

  const contentType = String(response.headers["content-type"] || "");
  if (contentType.includes("json") || contentType.includes("text/html")) {
    // Read the small error body to explain what happened
    let body = "";
    for await (const chunk of response.data) {
      body += chunk;
      if (body.length > 5000) break;
    }
    response.data.destroy?.();

    let arcgisError;
    try {
      arcgisError = JSON.parse(body)?.error;
    } catch {
      /* not JSON */
    }
    const code = arcgisError?.code;
    if (code === 498 || code === 499 || code === 401 || code === 403) {
      throw new DriveUploadError(
        "ArcGIS token is invalid or expired. Update the service token in config/.env.",
        401,
        { fatal: true }
      );
    }
    const err = new DriveUploadError(
      `ArcGIS returned an error instead of the image for attachment ${att.id}: ${
        arcgisError?.message || body.slice(0, 200)
      }`,
      502
    );
    err.retryable = code >= 500;
    throw err;
  }

  return { stream: response.data, contentType: contentType || att.contentType || "image/jpeg" };
};

/* ============================ Main function ============================= */

/**
 * Uploads every ArcGIS attachment to Google Drive:
 *
 *   rootFolder/
 *     <layer name>/
 *       <customer_code>/
 *         <customer_code>_<keywords>_<attachmentId>.jpg
 *
 * @param {Object}    options
 * @param {Array}     options.attachmentGroups  allAttachments from getAttachmentsService
 * @param {string}    options.layer             e.g. "september"
 * @param {string}    options.project           e.g. "redbull"
 * @param {string}   [options.rootFolderId]     Overrides GOOGLE_DRIVE_ROOT_FOLDER_ID
 * @param {string}   [options.layerName]        Folder name; defaults to the service name from the URL
 * @param {number}   [options.concurrency=3]    Outlets processed in parallel
 * @param {Function} [options.onProgress]       Called with the summary after each photo
 * @param {Set}      [options.doneIds]          Attachment ids already uploaded (resume): skipped with no Drive calls
 * @param {Function} [options.onUploaded]       Called with the attachment id after each successful upload
 * @param {Function} [options.shouldStop]       Return true to stop cleanly (server shutting down)
 * @param {Object}   [options.drive]            Drive client override (tests)
 * @returns {Promise<{layerFolder, uploaded, skipped, failed, total, aborted, abortReason}>}
 */
export const uploadAttachmentsToDrive = async ({
  attachmentGroups,
  layer,
  project,
  rootFolderId,
  layerName,
  concurrency = 3,
  onProgress = () => {},
  doneIds = new Set(),
  onUploaded = () => {},
  shouldStop = () => false,
  retryRounds = 5, // extra passes over outlets that still have failed photos
  drive: driveClient, // optional, for tests
}) => {
  const isDone = (att) => doneIds.has(String(att.id));
  const total = (attachmentGroups || []).reduce(
    (n, g) => n + (g.attachmentInfos?.length || 0),
    0
  );
  const summary = {
    layerFolder: null,
    total,
    uploaded: 0,
    skipped: 0,
    failed: [],
    outletFolders: [], // one entry per outlet whose photos were all handled: { parentObjectId, name, id, link, complete }
    retriedRounds: 0,
    allUploaded: false, // true only when every photo is in Drive (after the retries)
    aborted: false,
    abortReason: null,
    stopped: false,
  };
  if (!total) return summary;

  // Config problems throw here, before anything is uploaded
  const drive = driveClient || getDriveClient();
  const rootId = getDriveRootFolderId(rootFolderId);
  const { url, token } = await getLayersConfig(layer, project);
  if (!url) {
    throw new DriveUploadError(`ArcGIS URL is missing for ${project}/${layer} in config/.env.`, 500);
  }
  await assignOutletFolderNames({ groups: attachmentGroups, layer, project, url, token });

  await verifyRootFolder(drive, rootId);
  const folderCache = new Map();

  // 1) Layer folder
  const layerFolderName = sanitizeName(layerName || layerNameFromUrl(url));
  let layerFolderId;
  try {
    layerFolderId = await findOrCreateFolder(drive, layerFolderName, rootId, folderCache);
  } catch (err) {
    throw explainError(err, `Creating folder "${layerFolderName}"`);
  }
  summary.layerFolder = { name: layerFolderName, id: layerFolderId };

  const abort = (err) => {
    if (!summary.aborted) {
      summary.aborted = true;
      summary.abortReason = err.message;
    }
  };

  // 2) One folder per outlet, processed a few at a time
  const processGroup = async (group) => {
      const outletName = outletFolderName(group);
      const infos = group.attachmentInfos || [];

      // Resume: outlet fully uploaded in an earlier run -> no Drive calls at all
      if (infos.every(isDone)) {
        summary.skipped += infos.length;
        onProgress(summary);
        return;
      }

      let outletFolderId;
      let existing;
      let outletFailed = 0;
      try {
        outletFolderId = await findOrCreateFolder(drive, outletName, layerFolderId, folderCache);
        existing = await listFileNames(drive, outletFolderId);
      } catch (err) {
        const e = explainError(err, `Outlet ${outletName}`);
        if (e.fatal) return abort(e);
        for (const att of group.attachmentInfos || []) {
          summary.failed.push({ outlet: outletName, attachmentId: att.id, error: e.message });
        }
        onProgress(summary);
        return;
      }

      // 3) Each photo: stream from ArcGIS straight into Drive (no temp files)
      for (const att of infos) {
        if (summary.aborted) return;
        if (shouldStop()) {
          summary.stopped = true;
          return;
        }

        const fileName = photoFileName(outletName, att);

        if (isDone(att) || existing.has(fileName)) {
          if (!isDone(att)) onUploaded(att.id); // found in Drive: remember it
          summary.skipped++;
          onProgress(summary);
          continue;
        }

        try {
          // Download + upload inside the retry, because a stream can only be used once
          await withRetry(async () => {
            const { stream, contentType } = await downloadAttachment(att, token);
            await drive.files.create({
              requestBody: {
                name: fileName,
                parents: [outletFolderId],
                description: [
                  `customer_code: ${group.customer_code ?? ""}`,
                  `folder: ${outletName}`,
                  `VIP_Contract: ${group.VIP_Contract ?? ""}`,
                  `OBJECTID: ${group.parentObjectId}`,
                  `attachment_id: ${att.id}`,
                  `keywords: ${att.keywords ?? ""}`,
                ].join("\n"),
              },
              media: { mimeType: contentType, body: stream },
              fields: "id",
              supportsAllDrives: true,
            });
          });
          summary.uploaded++;
          onUploaded(att.id);
        } catch (err) {
          const e = explainError(err, `Attachment ${att.id}`);
          if (e.fatal) return abort(e);
          summary.failed.push({ outlet: outletName, attachmentId: att.id, error: e.message });
          outletFailed++;
        }
        onProgress(summary);
      }

      // anyone with the link can open the folder (view only). A sharing problem is reported, it does not stop the upload.
      let shared = true;
      try {
        await shareFolderByLink(drive, outletFolderId);
      } catch (err) {
        shared = false;
        const e = explainError(err, `Sharing folder ${outletName}`);
        if (!summary.shareError) summary.shareError = e.message;
      }

      // a retry round replaces the outlet's earlier entry
      summary.outletFolders = summary.outletFolders.filter((f) => f.parentObjectId !== group.parentObjectId);
      summary.outletFolders.push({
        parentObjectId: group.parentObjectId,
        name: outletName,
        id: outletFolderId,
        link: driveFolderLink(outletFolderId),
        complete: outletFailed === 0,
        shared,
      });
  };

  const stopCheck = () => {
    if (!summary.aborted && shouldStop()) summary.stopped = true;
    return summary.aborted || summary.stopped;
  };

  // Wait between rounds, but react quickly when the server is shutting down
  const waitBeforeRetry = async (ms) => {
    for (let waited = 0; waited < ms && !stopCheck(); waited += 1000) await sleep(1000);
  };

  // Pass 1 = every outlet. Then, while some photos failed, retry ONLY those photos
  // (5s, 15s, 45s, 2min, 2min between rounds). Photos already in Drive are never uploaded twice.
  let toRun = attachmentGroups;
  for (let round = 0; ; round++) {
    await runPool(toRun, concurrency, processGroup, stopCheck);

    if (stopCheck() || !summary.failed.length || round >= retryRounds) break;

    const failedIds = new Set(summary.failed.map((f) => String(f.attachmentId)));
    toRun = attachmentGroups
      .filter((g) => (g.attachmentInfos || []).some((a) => failedIds.has(String(a.id))))
      .map((g) => ({ ...g, attachmentInfos: g.attachmentInfos.filter((a) => failedIds.has(String(a.id))) }));

    const delay = Math.min(5000 * 3 ** round, 120_000);
    console.warn(
      `[drive] ${project}/${layer}: ${failedIds.size} photos in ${toRun.length} outlets failed - retry ${round + 1}/${retryRounds} in ${delay / 1000}s`
    );
    summary.failed = []; // rebuilt by the next round with whatever still fails
    summary.retriedRounds = round + 1;
    await waitBeforeRetry(delay);
    if (stopCheck()) {
      // stopped while waiting: keep the failures that were still open
      summary.failed = [...failedIds].map((id) => ({ attachmentId: id, error: "Stopped before the retry" }));
      break;
    }
  }

  summary.allUploaded = !summary.failed.length && !summary.aborted && !summary.stopped;
  if (summary.allUploaded) console.log(`[drive] ${project}/${layer}: all ${total} photos are in Drive`);

  return summary;
};

/* ================= Existing outlet folders (name -> folder id) ================ */

/**
 * Outlet folders that already exist in Drive for a layer.
 * @returns {Promise<Map<string, string>>} folder name -> folder id (empty if the layer folder does not exist)
 */
export const listOutletFolders = async ({ layer, project, rootFolderId, layerName, drive: driveClient }) => {
  const drive = driveClient || getDriveClient();
  const rootId = getDriveRootFolderId(rootFolderId);
  const { url } = await getLayersConfig(layer, project);
  const layerFolderName = sanitizeName(layerName || layerNameFromUrl(url));
  const folders = new Map();

  try {
    const { data: layerRes } = await withRetry(() =>
      drive.files.list({
        q: `name = '${escapeQ(layerFolderName)}' and mimeType = '${FOLDER_MIME}' and '${rootId}' in parents and trashed = false`,
        fields: "files(id)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })
    );
    const layerFolderId = layerRes.files?.[0]?.id;
    if (!layerFolderId) return folders;

    let pageToken;
    do {
      const { data } = await withRetry(() =>
        drive.files.list({
          q: `'${layerFolderId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
          fields: "nextPageToken, files(id, name)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })
      );
      for (const f of data.files || []) if (!folders.has(f.name)) folders.set(f.name, f.id);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return folders;
  } catch (err) {
    throw explainError(err, "Reading existing Drive folders");
  }
};

/* ================= One-time: skip what is already in Drive ================ */

/**
 * Reads the outlet folders that already exist in Drive (folder name = customer_code)
 * and removes from `attachmentGroups`:
 *   - outlets whose folder already has ALL their photos
 *   - single photos that are already in a partly uploaded outlet folder
 * Uses a few batched Drive queries instead of one query per outlet.
 */
export const removeAlreadyUploaded = async ({
  attachmentGroups,
  layer,
  project,
  rootFolderId,
  layerName,
  drive: driveClient, // optional, for tests
}) => {
  const groups = attachmentGroups || [];
  const result = {
    groups,
    existingFolders: 0,
    skippedOutlets: 0,
    skippedPhotos: 0,
    partialOutlets: 0,
  };
  if (!groups.length) return result;

  const drive = driveClient || getDriveClient();
  const rootId = getDriveRootFolderId(rootFolderId);
  const { url, token } = await getLayersConfig(layer, project);
  await assignOutletFolderNames({ groups, layer, project, url, token });
  const layerFolderName = sanitizeName(layerName || layerNameFromUrl(url));

  try {
    // 1) Layer folder (don't create it here)
    const { data: layerRes } = await withRetry(() =>
      drive.files.list({
        q: `name = '${escapeQ(layerFolderName)}' and mimeType = '${FOLDER_MIME}' and '${rootId}' in parents and trashed = false`,
        fields: "files(id)",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })
    );
    const layerFolderId = layerRes.files?.[0]?.id;
    if (!layerFolderId) return result; // nothing uploaded yet

    // 2) All outlet folders in the layer folder
    const folderNameById = new Map();
    let pageToken;
    do {
      const { data } = await withRetry(() =>
        drive.files.list({
          q: `'${layerFolderId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
          fields: "nextPageToken, files(id, name)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        })
      );
      (data.files || []).forEach((f) => folderNameById.set(f.id, f.name));
      pageToken = data.nextPageToken;
    } while (pageToken);
    result.existingFolders = folderNameById.size;
    if (!folderNameById.size) return result;

    // 3) File names inside those folders, 40 folders per query
    const filesByFolderName = new Map(); // "101783" -> Set(file names)
    const folderIds = [...folderNameById.keys()];
    for (let i = 0; i < folderIds.length; i += 40) {
      const chunk = folderIds.slice(i, i + 40);
      const parentsQ = chunk.map((id) => `'${id}' in parents`).join(" or ");
      let token;
      do {
        const { data } = await withRetry(() =>
          drive.files.list({
            q: `(${parentsQ}) and mimeType != '${FOLDER_MIME}' and trashed = false`,
            fields: "nextPageToken, files(name, parents)",
            pageSize: 1000,
            pageToken: token,
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
          })
        );
        for (const f of data.files || []) {
          for (const parentId of f.parents || []) {
            const folderName = folderNameById.get(parentId);
            if (!folderName) continue;
            if (!filesByFolderName.has(folderName)) filesByFolderName.set(folderName, new Set());
            filesByFolderName.get(folderName).add(f.name);
          }
        }
        token = data.nextPageToken;
      } while (token);
    }

    // 4) Keep only what is missing
    const remaining = [];
    for (const group of groups) {
      const outletName = outletFolderName(group);
      const inDrive = filesByFolderName.get(outletName);
      const infos = group.attachmentInfos || [];
      if (!inDrive) {
        remaining.push(group);
        continue;
      }
      const missing = infos.filter((att) => !inDrive.has(photoFileName(outletName, att)));
      if (!missing.length) {
        result.skippedOutlets++;
        result.skippedPhotos += infos.length;
      } else {
        if (missing.length < infos.length) result.partialOutlets++;
        result.skippedPhotos += infos.length - missing.length;
        remaining.push({ ...group, attachmentInfos: missing });
      }
    }
    result.groups = remaining;
    return result;
  } catch (err) {
    throw explainError(err, "Reading existing Drive folders");
  }
};
