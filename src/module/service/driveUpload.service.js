import axios from "axios";
import path from "path";
import { google } from "googleapis";
// Adjust this import to wherever getLayersConfig lives in your project
import { getLayersConfig } from "./layers.config.js";

const FOLDER_MIME = "application/vnd.google-apps.folder";

/* ----------------------------- Drive client ----------------------------- */

const getDriveClient = () => {
  const auth = new google.auth.GoogleAuth({
    // Path to your service-account JSON key (or set GOOGLE_APPLICATION_CREDENTIALS)
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
};

/* ------------------------------- Helpers -------------------------------- */

// Escape a value for use inside a Drive query string ('...')
const escapeQ = (s) => String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

// Drive allows most characters, but slashes make names confusing
const sanitizeName = (s) => String(s ?? "").replace(/[\/\\]/g, "-").trim();

// ".../services/RedBullEGAudit_SeptRound/FeatureServer/1" -> "RedBullEGAudit_SeptRound"
const layerNameFromUrl = (url) => {
  const match = url.match(/\/services\/([^/]+)\//);
  return match ? match[1] : "ArcGIS_Layer";
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry on rate limits (429) and server errors (5xx)
const withRetry = async (fn, retries = 3) => {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status ?? err?.code;
      const retryable = status === 429 || (status >= 500 && status < 600);
      if (!retryable || attempt >= retries) throw err;
      await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s
    }
  }
};

// Run `worker` over `items` with at most `limit` running at once
const runPool = async (items, limit, worker) => {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
};

/* --------------------------- Folder operations -------------------------- */

const findOrCreateFolder = async (drive, name, parentId) => {
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
    data.files.forEach((f) => names.add(f.name));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return names;
};

/* ------------------------------ Main function ----------------------------- */

/**
 * Uploads every ArcGIS attachment to Google Drive:
 *
 *   rootFolder/
 *     <layer name>/
 *       <customer_code>/
 *         <customer_code>_<keywords>_<attachmentId>.jpg
 *
 * @param {Object}   options
 * @param {Array}    options.attachmentGroups  Output of getAttachmentsService
 * @param {Array}    options.layers            Same `layers` you pass to getAttachmentsService
 * @param {*}        options.project           Same `project` you pass to getAttachmentsService
 * @param {string}   options.rootFolderId      Drive folder (ideally inside a Shared Drive) to put everything in
 * @param {string}  [options.layerName]        Override folder name; defaults to the service name from the URL
 * @param {number}  [options.concurrency=3]    How many outlets to process in parallel
 * @returns {Promise<{uploaded:number, skipped:number, failed:Array}>}
 */
export const uploadAttachmentsToDrive = async ({
  attachmentGroups,
  layers,
  project,
  rootFolderId,
  layerName,
  concurrency = 3,
}) => {
  if (!attachmentGroups?.length) return { uploaded: 0, skipped: 0, failed: [] };
  if (!rootFolderId) throw new Error("rootFolderId is required");

  const { url, token } = await getLayersConfig(layers[0], project);
  const drive = getDriveClient();

  // 1) Layer folder
  const layerFolderName = sanitizeName(layerName || layerNameFromUrl(url));
  const layerFolderId = await findOrCreateFolder(drive, layerFolderName, rootFolderId);

  const summary = { uploaded: 0, skipped: 0, failed: [] };

  // 2) One folder per outlet, processed a few at a time
  await runPool(attachmentGroups, concurrency, async (group) => {
    const outletName = sanitizeName(
      group.customer_code ?? `OBJECTID_${group.parentObjectId}`
    );

    let outletFolderId;
    let existing;
    try {
      outletFolderId = await findOrCreateFolder(drive, outletName, layerFolderId);
      existing = await listFileNames(drive, outletFolderId);
    } catch (err) {
      summary.failed.push({ outlet: outletName, error: err.message });
      return;
    }

    // 3) Each photo: stream from ArcGIS straight into Drive (no temp files)
    for (const att of group.attachmentInfos || []) {
      const ext = path.extname(att.name) || ".jpg";
      const keyword = att.keywords ? `_${sanitizeName(att.keywords)}` : "";
      const fileName = `${outletName}${keyword}_${att.id}${ext}`;

      if (existing.has(fileName)) {
        summary.skipped++;
        continue;
      }

      try {
        await withRetry(async () => {
          const download = await axios.get(att.url, {
            params: token ? { token } : {},
            responseType: "stream",
          });

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
            media: { mimeType: att.contentType || "image/jpeg", body: download.data },
            fields: "id",
            supportsAllDrives: true,
          });
        });
        summary.uploaded++;
      } catch (err) {
        summary.failed.push({
          outlet: outletName,
          attachmentId: att.id,
          error: err.message,
        });
      }
    }
  });

  return summary;
};