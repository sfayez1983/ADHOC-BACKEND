import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as checkDataService from "../service/checkData.service.js";
import {  formatComparisonExcel, readExcel } from "../service/excel.service.js";
import { queryFeaturesService } from "../service/map.service.js";
import { syncCalculatedData } from "../service/syncCalculatedData.service.js";
import { runCheckData } from "../service/runCheckData.service.js";

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
// SYNC CALCULATED DATA TO THE FEATURE LAYER
// ==========================================
// POST /api/checkData/sync?layer=october[&full=true][&dryRun=false]
// Recalculates the outlets changed since the last run and writes the new values to ArcGIS.
// dryRun defaults to TRUE: it only reports what would change until you pass dryRun=false.
export const syncCalculatedDataCon = async (req, res) => {
    const layer = String(req.query.layer || "");
    if (!layer) return res.status(400).json({ success: false, message: "layer is required" });
    const full = String(req.query.full ?? "false").toLowerCase() === "true";
    const dryRun = String(req.query.dryRun ?? "true").toLowerCase() !== "false";

    const result = await syncCalculatedData({ layer, full, dryRun });
    if (result.skipped) return res.status(409).json({ success: false, ...result });
    res.status(result.failed?.length ? 207 : 200).json({ success: !result.failed?.length, ...result });
}
