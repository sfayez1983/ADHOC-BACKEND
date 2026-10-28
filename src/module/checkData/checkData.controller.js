import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as checkDataService from "../service/checkData.service.js";
import { formatAttachmentKeywordsExcel, formatComparisonExcel, readExcel, writeExcel } from "../service/excel.service.js";
import { queryFeaturesService } from "../service/map.service.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import { getDriveClient, getDriveRootFolderId } from "../../../config/driveAPI.config.js";
import { removeAlreadyUploaded } from "../service/driveUpload.service.js";
import { runCheckData } from "../service/runCheckData.service.js";
import { backfillFolderLinks } from "../service/webhook.service.js";
import { getDriveUploadJob, listDriveUploadJobs, startDriveUploadJob, } from "../service/driveJob.service.js";

// ==========================================
// CHECK CALCULATION DATA
// ==========================================
export const checkCalculationDataCon = async (req, res, next) => {
    const result = await runCheckData(req.query.layer || "september", req.query)
    // nothing wrong -> answer with the message only, no Excel is generated or uploaded
    if (result.correct) {
        return res.status(200).json(result.checkedData)
    }
    res.status(200).json({ checkedData: result.checkedData, excel: result.excelFile.link, excelFile: result.excelFile })
}

// ==========================================
//COMPARE DATA
// ==========================================
export const compareDataCon = async (req, res) => {
    //prepare data
    const layers = Array(
        req.query.layer || "september"
    )
    const project = USER_COMPANY.REDBULL

    //get layer data
    const portalData = await queryFeaturesService(layers, project, req.query);

    //check data not compared 
    const excelData = await readExcel(req.file.path)

    //check data not compared 
    const comparedData = checkDataService.compareDataService(portalData, excelData)
    if (comparedData.summary.missingInPortal === 0 && comparedData.summary.missingInExcel === 0 && comparedData.summary.differences === 0) {
        return res.status(200).json({ message: "all data are correct" })
    }

    const excelFile = await formatComparisonExcel(comparedData, req.query.layer, "excel", "portal", "compareData")
    res.status(200).json({ comparedData, excel: excelFile.link, excelFile })
}

// ==========================================
// READ EXCEL
// ==========================================
export const readCon = async (req, res) => {

    const readExcelData = await readExcel(req.file.path)

    res.status(200).json({
        success: true,
        message: "Excel file readed successfully",
        data: {
            excelLength: readExcelData.length,
            excelParsedData: readExcelData,
        }
    })
}

// ==========================================
// ATTACHMENT
// ==========================================
export const getAttachment = async (req, res) => {
    const MONTHS = [
        "october"
    ];
    const layer = String(
        req.query.layer || "october"
    ).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];
    const project = req.query.project
    const data =
        await queryFeaturesService(
            layers,
            project,
            req.query
        );
    const attachments = await checkDataService.getAttachmentsService(
        data[layer].features.map((feature) => feature.attributes?.OBJECTID),
        data[layer].features,
        layers, project
    )

    res.status(200).json({ attachments });
}

// ==========================================
// ATTACHMENT EXCEL (photos per keyword per outlet)
// ==========================================
// GET /api/checkData/attachment/excel?layer=october
export const getAttachmentExcel = async (req, res) => {
    const MONTHS = [
        "october"
    ];
    const layer = String(
        req.query.layer || "october"
    ).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];

    const project = req.query.project
    const data =
        await queryFeaturesService(
            layers,
            project,
            req.query
        );

    const results = [];
    for (const l of layers) {
        const features = data[l]?.features || [];

        const attachments = await checkDataService.getAttachmentsService(
            features.map((feature) => feature.attributes?.OBJECTID),
            features,
            [l], project
        )

        // count photos per keyword for every outlet, then write the Excel
        const keywordCounts = checkDataService.countAttachmentKeywordsService(
            attachments?.allAttachments || [],
            features
        )
        const excelFile = await formatAttachmentKeywordsExcel(keywordCounts, l)

        results.push({
            layer: l,
            summary: keywordCounts.summary,
            keywordTotals: keywordCounts.totals,
            excel: excelFile.link,
            excelFile,
        });
    }

    res.status(200).json(results.length === 1 ? results[0] : { results });
}

// ==========================================
// UPLOAD ATTACHMENTS TO GOOGLE DRIVE
// ==========================================
// POST /api/checkData/attachment/drive?layer=september[&skipExisting=true][&restart=true]
// Body (all optional): { rootFolderId, layerName, concurrency, restart, skipExisting }
// Starts (or continues from saved progress) a background upload and returns a jobId right away.
export const uploadAttachmentsToDriveCon = async (req, res) => {
    const MONTHS = ["september"];
    const layer = String(req.query.layer || req.body?.layer).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];
    const project = req.query.project

    const { rootFolderId, layerName } = req.body || {};
    // ?restart=true -> ignore saved progress and check every photo again
    const restart = String(req.query.restart ?? req.body?.restart ?? "false").toLowerCase() === "true";
    // ?skipExisting=true -> skip outlets whose Drive folder already has all photos
    const skipExisting = String(req.query.skipExisting ?? req.body?.skipExisting ?? "false").toLowerCase() === "true";
    const concurrency = Math.min(Math.max(Number(req.body?.concurrency) || 3, 1), 6);

    // 1) Fail fast on config problems, before calling ArcGIS
    for (const l of layers) await getLayersConfig(l, project);   // throws on unknown layer
    getDriveClient();                                            // throws if Drive keys are missing
    getDriveRootFolderId(rootFolderId);                          // throws if no root folder

    // 2) Outlets
    const data = await queryFeaturesService(layers, project, req.query);

    // 3) One upload job per layer, using the attachments JSON
    //    (outlet data: customer_code, VIP_Contract + photo url and name)
    const results = [];
    for (const l of layers) {
        const outlets = data[l]?.features || [];

        const attachments = await checkDataService.getAttachmentsService(
            outlets.map((feature) => feature.attributes?.OBJECTID),
            outlets,
            [l], project
        )
        let attachmentGroups = attachments?.allAttachments || [];

        if (!attachments?.imagesCount) {
            results.push({ layer: l, outlets: outlets.length, photos: 0, message: "No photos to upload" });
            continue;
        }

        // ?skipExisting=true -> read Drive once and remove outlets/photos already uploaded
        let alreadyInDrive = null;
        if (skipExisting) {
            const check = await removeAlreadyUploaded({
                attachmentGroups, layer: l, project, rootFolderId, layerName,
            });
            attachmentGroups = check.groups;
            alreadyInDrive = {
                foldersInDrive: check.existingFolders,
                completeOutletsRemoved: check.skippedOutlets,
                partlyUploadedOutlets: check.partialOutlets,
                photosRemoved: check.skippedPhotos,
            };
            console.log(`[drive] ${l}: ${check.skippedOutlets} outlets already complete in Drive, ${check.skippedPhotos} photos removed from the list`);

            if (!attachmentGroups.length) {
                results.push({ layer: l, outlets: outlets.length, photos: attachments.count, alreadyInDrive, message: "Everything is already in Drive" });
                continue;
            }
        }
        const photosToUpload = attachmentGroups.reduce((n, g) => n + (g.attachmentInfos?.length || 0), 0);

        const { alreadyRunning, resumed, job } = startDriveUploadJob({
            project, layer: l, attachmentGroups, rootFolderId, layerName, concurrency, restart,
        });

        results.push({
            layer: l,
            outlets: outlets.length,
            outletsWithPhotos: attachmentGroups.length,
            photos: attachments.count,
            alreadyInDrive,
            outletsToUpload: attachmentGroups.length,
            photosToUpload,
            alreadyRunning,
            resumed,
            message: alreadyRunning
                ? `An upload for ${project}/${l} is already running`
                : resumed
                    ? `Continuing: ${job.progress.done} photos were already uploaded`
                    : "Upload started",
            statusUrl: `${req.baseUrl}/attachment/drive/${job.jobId}`,
            job,
        });
    }

    const started = results.some((r) => r.job && !r.alreadyRunning);
    const allRunning = results.length > 0 && results.every((r) => r.alreadyRunning);

    res.status(started ? 202 : allRunning ? 409 : 200).json({
        success: started,
        results,
    });
}

// POST /api/checkData/attachment/drive/links?project=redbull&layer=september[&dryRun=false]
// Fills LinkGoogleDrive for outlets whose Drive folder already exists.
// dryRun defaults to TRUE: it only reports what would change until you pass dryRun=false.
export const backfillDriveLinksCon = async (req, res) => {
    const project = req.query.project;
    const layer = String(req.query.layer || "");
    if (!project || !layer) {
        return res.status(400).json({ success: false, message: "project and layer are required" });
    }
    const dryRun = String(req.query.dryRun ?? "true").toLowerCase() !== "false";
    const { rootFolderId, layerName } = req.body || {};

    const result = await backfillFolderLinks({ project, layer, rootFolderId, layerName, dryRun });
    res.status(200).json({ success: true, ...result });
};

// GET /api/checkData/attachment/drive/:jobId
export const getDriveUploadJobCon = async (req, res) => {
    const job = getDriveUploadJob(req.params.jobId);
    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Job not found",
        });
    }
    res.status(200).json({ success: true, job });
}

// GET /api/checkData/attachment/drive
export const listDriveUploadJobsCon = async (req, res) => {
    res.status(200).json({ success: true, jobs: listDriveUploadJobs() });
}
