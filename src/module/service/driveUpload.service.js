import axios from "axios";
import path from "path";
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

// Folder name for an outlet: customer_code (or OBJECTID_<id> if missing)
const outletFolderName = (group) =>
  sanitizeName(group.customer_code ?? `OBJECTID_${group.parentObjectId}`);

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
  await runPool(
    attachmentGroups,
    concurrency,
    async (group) => {
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
        }
        onProgress(summary);
      }
    },
    () => {
      if (!summary.aborted && shouldStop()) summary.stopped = true;
      return summary.aborted || summary.stopped;
    }
  );

  return summary;
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
  const { url } = await getLayersConfig(layer, project);
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
