import fs from "fs";
import path from "path";
import XLSX from "xlsx";
import { randomUUID } from "crypto";
import { getDriveClient, getDriveRootFolderId } from "../../../config/driveAPI.config.js";

/**
 * Google Drive folder report
 *
 * Scans a Drive folder and ALL its subfolders, counts the images in every
 * folder, writes an Excel file (same columns as the Apps Script report) and
 * uploads that Excel to Google Drive.
 *
 * Why it is fast: instead of one request per folder, each Drive request asks
 * for the contents of up to 40 folders at once (1000 items per page), and a
 * few requests run in parallel. Folders and images are found in the same pass.
 */

const FOLDER_MIME = "application/vnd.google-apps.folder";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const FOLDERS_PER_QUERY = 40;
const PARALLEL_QUERIES = 4;
const REPORTS_FOLDER_NAME = "Folder Reports";
const SAVE_DIR = path.resolve("uploads/driveReports");

const jobs = new Map(); // jobId -> job
const runningByFolder = new Map(); // folderId -> jobId

/* ================================ Helpers ================================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Accepts a folder ID or any Drive folder link
export const extractFolderId = (value) => {
    const v = String(value || "").trim();
    const m = v.match(/\/folders\/([A-Za-z0-9_-]{10,})/) || v.match(/[?&]id=([A-Za-z0-9_-]{10,})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{10,}$/.test(v)) return v;
    return null;
};

const folderLink = (id) => `https://drive.google.com/drive/folders/${id}`;

const isRetryable = (err) => {
    const status = err?.response?.status ?? (typeof err?.code === "number" ? err.code : undefined);
    const reason = err?.response?.data?.error?.errors?.[0]?.reason;
    return (
        status === 429 || (status >= 500 && status < 600) ||
        reason === "rateLimitExceeded" || reason === "userRateLimitExceeded" ||
        ["ECONNRESET", "ETIMEDOUT", "ECONNABORTED", "EAI_AGAIN", "ENOTFOUND", "EPIPE"].includes(err?.code) ||
        /empty response|socket hang up/i.test(err?.message || "")
    );
};

const withRetry = async (fn, retries = 5) => {
    for (let attempt = 0; ; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (!isRetryable(err) || attempt >= retries) throw err;
            await sleep(1000 * 2 ** attempt + Math.random() * 500); // 1s, 2s, 4s, 8s, 16s
        }
    }
};

const explainDriveError = (err) => {
    const status = err?.response?.status;
    const reason = err?.response?.data?.error;
    if (reason === "invalid_grant") return "Google refresh token expired or revoked. Run: npm run drive:token";
    if (status === 404) return "Folder not found, or this Google account can't open it.";
    if (status === 403) return "This Google account has no access to the folder.";
    return err?.message || String(err);
};

/* ================================ Scanning =============================== */

/**
 * Lists everything inside a group of folders (one Drive query, all pages).
 * Returns { folders: [{id,name,parent}], images: [parentId,...] }
 */
const listChildren = async (drive, parentIds) => {
    const parentsQ = parentIds.map((id) => `'${id}' in parents`).join(" or ");
    const folders = [];
    const images = [];
    let pageToken;
    do {
        const { data } = await withRetry(() =>
            drive.files.list({
                q: `(${parentsQ}) and trashed = false and (mimeType = '${FOLDER_MIME}' or mimeType contains 'image/')`,
                fields: "nextPageToken, files(id, name, mimeType, parents)",
                pageSize: 1000,
                pageToken,
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            })
        );
        for (const f of data.files || []) {
            const parent = (f.parents || []).find((p) => parentIds.includes(p));
            if (!parent) continue;
            if (f.mimeType === FOLDER_MIME) folders.push({ id: f.id, name: f.name, parent });
            else images.push(parent);
        }
        pageToken = data.nextPageToken;
    } while (pageToken);
    return { folders, images };
};

/**
 * Scans the whole tree under rootId.
 * Returns the folder list with direct image counts and the first-level folder each belongs to.
 */
export const scanDriveFolder = async ({ folderId, drive = getDriveClient(), onProgress = () => {} }) => {
    // Root folder info (also checks access)
    let root;
    try {
        ({ data: root } = await withRetry(() =>
            drive.files.get({ fileId: folderId, fields: "id, name, mimeType", supportsAllDrives: true })
        ));
    } catch (err) {
        const e = new Error(explainDriveError(err));
        e.statusCode = err?.response?.status === 404 ? 404 : 502;
        throw e;
    }
    if (root.mimeType !== FOLDER_MIME) {
        const e = new Error(`"${root.name}" is not a folder`);
        e.statusCode = 400;
        throw e;
    }

    // id -> { id, name, parent, top, images, error }
    const folders = new Map();
    folders.set(root.id, { id: root.id, name: root.name, parent: null, top: root.name, images: 0, error: null });

    const progress = { foldersFound: 1, foldersScanned: 0, images: 0, errors: 0 };
    let level = [root.id];

    while (level.length) {
        const chunks = [];
        for (let i = 0; i < level.length; i += FOLDERS_PER_QUERY) chunks.push(level.slice(i, i + FOLDERS_PER_QUERY));
        const nextLevel = [];

        // run a few chunks in parallel
        const addResults = ({ folders: subs, images }) => {
            for (const parentId of images) {
                folders.get(parentId).images++;
                progress.images++;
            }
            for (const sub of subs) {
                if (folders.has(sub.id)) continue; // same folder linked twice
                const parent = folders.get(sub.parent);
                folders.set(sub.id, {
                    id: sub.id,
                    name: sub.name,
                    parent: sub.parent,
                    // first-level folder under the main folder (the outlet folder)
                    top: sub.parent === root.id ? sub.name : parent.top,
                    images: 0,
                    error: null,
                });
                nextLevel.push(sub.id);
            }
            progress.foldersFound = folders.size;
        };

        // run a few chunks in parallel
        let next = 0;
        const worker = async () => {
            while (next < chunks.length) {
                const chunk = chunks[next++];
                try {
                    addResults(await listChildren(drive, chunk));
                } catch {
                    // the group failed: try each folder alone, so only the bad one is marked
                    for (const id of chunk) {
                        try {
                            addResults(await listChildren(drive, [id]));
                        } catch (err) {
                            folders.get(id).error = explainDriveError(err);
                            progress.errors++;
                        }
                    }
                }
                progress.foldersScanned += chunk.length;
                onProgress({ ...progress });
            }
        };
        await Promise.all(Array.from({ length: Math.min(PARALLEL_QUERIES, chunks.length) }, worker));
        level = nextLevel;
    }

    return { root, folders: [...folders.values()], progress };
};

/* ================================== Excel ================================ */

/**
 * Same columns as the Apps Script report:
 * Folder ID | Folder Name | Folder Link | Image Count | Folder Name (first-level folder) | Main folder
 */
export const writeFolderReportExcel = ({ root, folders, includeEmpty = false, startedAt, finishedAt }) => {
    fs.mkdirSync(SAVE_DIR, { recursive: true });

    const rows = folders
        .filter((f) => f.error || includeEmpty || f.images > 0)
        .sort((a, b) =>
            String(a.top).localeCompare(String(b.top), undefined, { numeric: true }) ||
            (a.id === b.id ? 0 : a.name === a.top ? -1 : b.name === b.top ? 1 : 0) ||
            String(a.name).localeCompare(String(b.name), undefined, { numeric: true })
        );

    const header = ["Folder ID", "Folder Name", "Folder Link", "Image Count", "Folder Name", "Main folder"];
    const aoa = [header];
    for (const f of rows) {
        aoa.push([
            f.id,
            f.error ? `${f.name} (خطأ)` : f.name,
            folderLink(f.id),
            f.error ? f.error : f.images,
            f.top,
            root.name,
        ]);
    }

    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    // clickable links in column C
    for (let r = 1; r < aoa.length; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: 2 })];
        if (cell) cell.l = { Target: cell.v };
    }
    sheet["!cols"] = [{ wch: 36 }, { wch: 22 }, { wch: 75 }, { wch: 12 }, { wch: 22 }, { wch: 24 }];
    sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: 5 } }) };

    // Summary
    const withImages = folders.filter((f) => f.images > 0);
    const summary = XLSX.utils.aoa_to_sheet([
        ["Main folder", root.name],
        ["Main folder link", folderLink(root.id)],
        ["Folders scanned", folders.length],
        ["Folders with images", withImages.length],
        ["Empty folders", folders.filter((f) => !f.images && !f.error).length],
        ["Total images", folders.reduce((n, f) => n + f.images, 0)],
        ["Folders with errors", folders.filter((f) => f.error).length],
        ["Started", startedAt],
        ["Finished", finishedAt],
    ]);
    summary["!cols"] = [{ wch: 22 }, { wch: 70 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Results");
    XLSX.utils.book_append_sheet(workbook, summary, "Summary");

    const safeName = String(root.name).replace(/[\\/:*?"<>|]/g, "-").slice(0, 60);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    const fileName = `${safeName}_images_${stamp}.xlsx`;
    const filePath = path.join(SAVE_DIR, fileName);
    XLSX.writeFile(workbook, filePath);

    return { filePath, fileName, rows: rows.length };
};

/* ============================ Upload to Drive ============================ */

// Default destination: "<GOOGLE_DRIVE_ROOT_FOLDER_ID>/Folder Reports"
const getReportsFolderId = async (drive, override) => {
    if (override) {
        const id = extractFolderId(override);
        if (!id) throw Object.assign(new Error("uploadFolder is not a valid Drive folder link or ID"), { statusCode: 400 });
        return id;
    }
    const rootId = getDriveRootFolderId();
    const { data } = await withRetry(() =>
        drive.files.list({
            q: `name = '${REPORTS_FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and '${rootId}' in parents and trashed = false`,
            fields: "files(id)",
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
        })
    );
    if (data.files?.length) return data.files[0].id;
    const res = await withRetry(() =>
        drive.files.create({
            requestBody: { name: REPORTS_FOLDER_NAME, mimeType: FOLDER_MIME, parents: [rootId] },
            fields: "id",
            supportsAllDrives: true,
        })
    );
    return res.data.id;
};

export const uploadReportToDrive = async ({ drive = getDriveClient(), filePath, fileName, uploadFolder, asGoogleSheet = false }) => {
    const parentId = await getReportsFolderId(drive, uploadFolder);
    const { data } = await withRetry(() =>
        drive.files.create({
            requestBody: {
                name: asGoogleSheet ? fileName.replace(/\.xlsx$/i, "") : fileName,
                parents: [parentId],
                // convert to a Google Sheet if asked
                ...(asGoogleSheet ? { mimeType: "application/vnd.google-apps.spreadsheet" } : {}),
            },
            media: { mimeType: XLSX_MIME, body: fs.createReadStream(filePath) },
            fields: "id, name, webViewLink",
            supportsAllDrives: true,
        })
    );
    return { id: data.id, name: data.name, link: data.webViewLink, folderId: parentId, folderLink: folderLink(parentId) };
};

/* ============================== Background job ============================ */

const publicJob = (job) => ({
    jobId: job.id,
    folderId: job.folderId,
    mainFolder: job.mainFolder,
    status: job.status, // scanning | writing_excel | uploading | completed | failed
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    progress: job.progress,
    result: job.result,
    error: job.error,
});

const runJob = async (job, options) => {
    const drive = options.drive || getDriveClient();
    try {
        const { root, folders, progress } = await scanDriveFolder({
            folderId: job.folderId,
            drive,
            onProgress: (p) => { job.progress = p; },
        });
        job.mainFolder = root.name;
        job.progress = progress;

        job.status = "writing_excel";
        const finishedScan = new Date().toISOString();
        const excel = writeFolderReportExcel({
            root, folders,
            includeEmpty: options.includeEmpty,
            startedAt: job.startedAt,
            finishedAt: finishedScan,
        });

        job.status = "uploading";
        let drive_ = null;
        let uploadError = null;
        try {
            drive_ = await uploadReportToDrive({
                drive,
                filePath: excel.filePath,
                fileName: excel.fileName,
                uploadFolder: options.uploadFolder,
                asGoogleSheet: options.asGoogleSheet,
            });
        } catch (err) {
            uploadError = explainDriveError(err); // the Excel is still saved locally
        }

        job.result = {
            folders: folders.length,
            foldersWithImages: folders.filter((f) => f.images > 0).length,
            images: folders.reduce((n, f) => n + f.images, 0),
            foldersWithErrors: folders.filter((f) => f.error).length,
            excelRows: excel.rows,
            excelPath: excel.filePath,
            drive: drive_,
            uploadError,
        };
        job.status = uploadError ? "completed_upload_failed" : "completed";
    } catch (err) {
        console.error(`[drive report ${job.id}]`, err.message);
        job.status = "failed";
        job.error = err.message;
    } finally {
        job.finishedAt = new Date().toISOString();
        runningByFolder.delete(job.folderId);
        console.log(`[drive report ${job.id}] ${job.status}` + (job.result ? `: ${job.result.folders} folders, ${job.result.images} images` : ""));
    }
};

export const startFolderReportJob = ({ folder, includeEmpty = false, uploadFolder, asGoogleSheet = false, drive }) => {
    const folderId = extractFolderId(folder);
    if (!folderId) {
        throw Object.assign(new Error("Send a Drive folder link or ID in \"folder\""), { statusCode: 400 });
    }
    if (runningByFolder.has(folderId)) {
        return { alreadyRunning: true, job: publicJob(jobs.get(runningByFolder.get(folderId))) };
    }
    if (!drive) getDriveClient(); // throws now if Drive keys are missing

    const job = {
        id: randomUUID().slice(0, 8),
        folderId,
        mainFolder: null,
        status: "scanning",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        progress: { foldersFound: 1, foldersScanned: 0, images: 0, errors: 0 },
        result: null,
        error: null,
    };
    jobs.set(job.id, job);
    runningByFolder.set(folderId, job.id);
    runJob(job, { includeEmpty, uploadFolder, asGoogleSheet, drive }); // background
    return { alreadyRunning: false, job: publicJob(job) };
};

export const getFolderReportJob = (jobId) => {
    const job = jobs.get(jobId);
    return job ? publicJob(job) : null;
};

export const listFolderReportJobs = () => [...jobs.values()].map(publicJob).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
