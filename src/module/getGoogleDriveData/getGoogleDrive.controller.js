import * as getGoogleDriveService from "../service/getGoogleDrive.service.js";

// ==========================================
// FOLDER IMAGES REPORT
// ==========================================
// POST /api/getGoogleDrive/report
// Body: {
//   folder: "<Drive folder link or ID>",        (required)
//   includeEmpty: false,                         (optional) also list folders with 0 images
//   uploadFolder: "<Drive folder link or ID>",   (optional) where to upload the Excel
//                                                 default: <GOOGLE_DRIVE_ROOT_FOLDER_ID>/Folder Reports
//   asGoogleSheet: false                         (optional) upload as a Google Sheet instead of .xlsx
// }
// Scans the folder + all subfolders in the background and returns a jobId right away.
export const startFolderReportCon = async (req, res) => {
    const { folder, includeEmpty, uploadFolder, asGoogleSheet } = { ...req.query, ...(req.body || {}) };

    const { alreadyRunning, job } = getGoogleDriveService.startFolderReportJob({
        folder,
        includeEmpty: String(includeEmpty) === "true",
        uploadFolder,
        asGoogleSheet: String(asGoogleSheet) === "true",
    });

    res.status(alreadyRunning ? 409 : 202).json({
        success: !alreadyRunning,
        message: alreadyRunning ? "A report for this folder is already running" : "Report started",
        statusUrl: `${req.baseUrl}/report/${job.jobId}`,
        job,
    });
}

// GET /api/getGoogleDrive/report/:jobId
export const getFolderReportCon = async (req, res) => {
    const job = getGoogleDriveService.getFolderReportJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: "Report not found" });
    }
    res.status(200).json({ success: true, job });
}

// GET /api/getGoogleDrive/report
export const listFolderReportsCon = async (req, res) => {
    res.status(200).json({ success: true, jobs: getGoogleDriveService.listFolderReportJobs() });
}
