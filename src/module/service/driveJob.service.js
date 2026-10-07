import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { queryFeaturesService } from "./map.service.js";
import { getAttachmentsService } from "./checkData.service.js";
import { uploadAttachmentsToDrive } from "./driveUpload.service.js";

/**
 * Background Google Drive uploads that survive a server stop.
 *
 * Progress is saved to data/drive-jobs/ every few seconds:
 *   <project>_<layer>.json         progress: uploaded attachment ids, status, options
 *   <project>_<layer>.groups.json  the attachments JSON (outlets + photo urls/names)
 *
 * When the server starts again, unfinished uploads continue automatically
 * from where they stopped. Photos already uploaded are skipped without
 * calling Google, so resuming is fast.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JOBS_DIR = path.resolve(__dirname, "../../../data/drive-jobs");
const SAVE_EVERY_MS = 2000;

const jobs = new Map(); // jobId -> job
const running = new Map(); // "project:layer" -> jobId
let shuttingDown = false;

const newJobId = () => randomUUID().slice(0, 8);
const runningKey = (project, layer) => `${project}:${layer}`;
const fileKey = (project, layer) => `${project}_${layer}`.replace(/[^a-z0-9_-]/gi, "-");
const progressFile = (project, layer) => path.join(JOBS_DIR, `${fileKey(project, layer)}.json`);
const groupsFile = (project, layer) => path.join(JOBS_DIR, `${fileKey(project, layer)}.groups.json`);

const UNFINISHED = new Set(["queued", "fetching", "uploading", "stopped"]);

/* ============================== Disk helpers ============================= */

const ensureDir = () => fs.mkdirSync(JOBS_DIR, { recursive: true });

// Write to a temp file, then rename, so a crash never leaves a half-written file
const writeJsonAtomic = (file, data) => {
  ensureDir();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Windows can refuse the rename if the file is briefly locked (antivirus, editor)
    fs.writeFileSync(file, JSON.stringify(data));
    fs.rmSync(tmp, { force: true });
  }
};

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
};

const saveProgress = (job) => {
  try {
    writeJsonAtomic(progressFile(job.project, job.layer), {
      jobId: job.id,
      project: job.project,
      layer: job.layer,
      status: job.status,
      startedAt: job.startedAt,
      updatedAt: new Date().toISOString(),
      finishedAt: job.finishedAt,
      error: job.error,
      options: job.options,
      total: job.summary.total,
      layerFolder: job.summary.layerFolder,
      doneIds: [...job.doneIds],
      failed: job.summary.failed,
      runs: job.runs,
    });
    job.dirty = false;
  } catch (err) {
    console.error(`[drive job ${job.id}] could not save progress:`, err.message);
  }
};

/* ============================== Public shape ============================= */

// Uploaded photos that belong to this run's photo list
const countDone = (job) => {
  if (!job.idsInRun) return job.doneIds.size;
  let n = 0;
  for (const id of job.idsInRun) if (job.doneIds.has(id)) n++;
  return n;
};

const publicJob = (job) => {
  const done = countDone(job);
  const failed = job.summary.failed.length;
  return {
    jobId: job.id,
    project: job.project,
    layer: job.layer,
    // queued | fetching | uploading | stopped | completed | completed_with_errors | failed
    status: job.status,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    runs: job.runs, // how many times it was started/resumed
    progress: {
      total: job.summary.total,
      done, // uploaded in any run (including before a restart)
      uploadedThisRun: job.summary.uploaded,
      failed,
      remaining: Math.max(job.summary.total - done - failed, 0),
      percent: job.summary.total ? Math.round(((done + failed) / job.summary.total) * 100) : 0,
    },
    layerFolder: job.summary.layerFolder,
    error: job.error,
    failedItems: job.summary.failed.slice(0, 200),
  };
};

/* ================================ Runner ================================= */

const runJob = async (job, { attachmentGroups, where }) => {
  const saver = setInterval(() => job.dirty && saveProgress(job), SAVE_EVERY_MS);

  try {
    let groups = attachmentGroups;

    // Only fetch here if no attachments were passed in (or saved)
    if (!Array.isArray(groups)) {
      job.status = "fetching";
      const data = await queryFeaturesService([job.layer], job.project, {
        where: where || "1=1",
        outFields: "*",
        returnGeometry: "false",
      });
      const outlets = data[job.layer]?.features || [];
      const objectIds = outlets
        .map((f) => f.attributes?.OBJECTID)
        .filter((id) => id !== undefined && id !== null);
      const attachments = await getAttachmentsService(objectIds, outlets, [job.layer], job.project);
      groups = attachments?.allAttachments || [];
    }

    // Save the attachments list once, so a resume doesn't depend on ArcGIS
    writeJsonAtomic(groupsFile(job.project, job.layer), groups);

    job.idsInRun = new Set(groups.flatMap((g) => (g.attachmentInfos || []).map((a) => String(a.id))));
    job.summary.total = job.idsInRun.size;
    job.status = "uploading";
    saveProgress(job);

    const summary = await uploadAttachmentsToDrive({
      attachmentGroups: groups,
      layer: job.layer,
      project: job.project,
      rootFolderId: job.options.rootFolderId,
      layerName: job.options.layerName,
      concurrency: job.options.concurrency,
      doneIds: job.doneIds,
      onUploaded: (id) => {
        job.doneIds.add(String(id));
        job.dirty = true;
      },
      onProgress: (s) => {
        job.summary = s;
        job.dirty = true;
      },
      shouldStop: () => shuttingDown,
    });
    job.summary = summary;

    if (summary.aborted) {
      job.status = "failed";
      job.error = summary.abortReason;
    } else if (summary.stopped) {
      job.status = "stopped"; // will continue on next server start
    } else {
      job.status = summary.failed.length ? "completed_with_errors" : "completed";
    }
  } catch (err) {
    console.error(`[drive job ${job.id}]`, err);
    job.status = "failed";
    job.error = err.message || String(err);
  } finally {
    clearInterval(saver);
    if (job.status !== "stopped") job.finishedAt = new Date().toISOString();
    saveProgress(job);
    running.delete(runningKey(job.project, job.layer));
    console.log(
      `[drive job ${job.id}] ${job.status}: ${countDone(job)}/${job.summary.total} done, ${job.summary.failed.length} failed`
    );
  }
};

/* ================================== API ================================== */

/**
 * Starts (or continues) the upload for one project/layer.
 * Continues from saved progress unless `restart` is true.
 */
export const startDriveUploadJob = ({
  project,
  layer,
  attachmentGroups,
  where,
  rootFolderId,
  layerName,
  concurrency = 3,
  restart = false,
}) => {
  const key = runningKey(project, layer);
  if (running.has(key)) {
    return { alreadyRunning: true, resumed: false, job: publicJob(jobs.get(running.get(key))) };
  }

  const saved = restart ? null : readJson(progressFile(project, layer));
  const doneIds = new Set((saved?.doneIds || []).map(String));

  const job = {
    id: saved?.jobId || newJobId(), // same jobId after a restart, so the status URL keeps working
    project,
    layer,
    status: "queued",
    startedAt: saved?.startedAt || new Date().toISOString(),
    finishedAt: null,
    error: null,
    runs: (saved?.runs || 0) + 1,
    options: {
      rootFolderId: rootFolderId ?? saved?.options?.rootFolderId,
      layerName: layerName ?? saved?.options?.layerName,
      concurrency,
    },
    doneIds,
    dirty: false,
    summary: {
      total: saved?.total || 0,
      uploaded: 0,
      skipped: 0,
      failed: [],
      layerFolder: saved?.layerFolder || null,
    },
  };
  jobs.set(job.id, job);
  running.set(key, job.id);

  runJob(job, { attachmentGroups, where }); // runs in the background; never throws

  return { alreadyRunning: false, resumed: doneIds.size > 0, job: publicJob(job) };
};

export const getDriveUploadJob = (jobId) => {
  const job = jobs.get(jobId);
  return job ? publicJob(job) : null;
};

export const listDriveUploadJobs = () =>
  [...jobs.values()].map(publicJob).sort((a, b) => b.startedAt.localeCompare(a.startedAt));

/**
 * Call once when the server starts: loads saved jobs and continues
 * the ones that did not finish. Set GOOGLE_DRIVE_AUTO_RESUME=false to disable.
 */
export const resumeDriveUploadJobs = () => {
  if (!fs.existsSync(JOBS_DIR)) return;

  const autoResume = String(process.env.GOOGLE_DRIVE_AUTO_RESUME ?? "true").toLowerCase() !== "false";
  const files = fs
    .readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith(".groups.json"));

  for (const f of files) {
    const saved = readJson(path.join(JOBS_DIR, f));
    if (!saved?.project || !saved?.layer) continue;

    if (autoResume && UNFINISHED.has(saved.status)) {
      const groups = readJson(groupsFile(saved.project, saved.layer));
      console.log(
        `[drive] Resuming ${saved.project}/${saved.layer}: ${saved.doneIds?.length || 0}/${saved.total} already uploaded`
      );
      startDriveUploadJob({
        project: saved.project,
        layer: saved.layer,
        attachmentGroups: Array.isArray(groups) ? groups : undefined, // refetch if missing
        concurrency: saved.options?.concurrency,
      });
      continue;
    }

    // Finished (or auto-resume off): keep it visible in the status endpoints
    jobs.set(saved.jobId, {
      id: saved.jobId,
      project: saved.project,
      layer: saved.layer,
      status: saved.status,
      startedAt: saved.startedAt,
      finishedAt: saved.finishedAt,
      error: saved.error,
      runs: saved.runs || 1,
      options: saved.options || {},
      doneIds: new Set((saved.doneIds || []).map(String)),
      summary: {
        total: saved.total || 0,
        uploaded: 0,
        skipped: 0,
        failed: saved.failed || [],
        layerFolder: saved.layerFolder || null,
      },
    });
  }
};

/* ========================= Save on server stop ========================== */

const saveAllRunning = () => {
  for (const jobId of running.values()) {
    const job = jobs.get(jobId);
    if (job) {
      job.status = "stopped";
      saveProgress(job);
    }
  }
};

// Ctrl+C / kill: save progress, then exit. Uploads in flight are re-checked on resume.
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.once(signal, () => {
    shuttingDown = true;
    if (running.size) {
      saveAllRunning();
      console.log(`\n[drive] Upload progress saved. It will continue when the server starts again.`);
    }
    process.exit(0);
  });
}

// nodemon restart signal
process.once("SIGUSR2", () => {
  shuttingDown = true;
  saveAllRunning();
  process.kill(process.pid, "SIGUSR2");
});
