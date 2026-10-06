import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as checkDataService from "../service/checkData.service.js";
import { formatComparisonExcel, readExcel, writeExcel } from "../service/excel.service.js";
import { queryFeaturesService } from "../service/map.service.js";

// ==========================================
// CHECK CALCULATION DATA
// ==========================================
export const checkCalculationDataCon = async (req, res, next) => {
    //prepare data
    const layers = Array(
        req.query.layer || "september"
    )
    const project = USER_COMPANY.REDBULL

    //get layer data
    const data = await queryFeaturesService(layers, project, req.query);

    //check if data was wrong
    const checkedData = await checkDataService.checkGlobalExpressionsService(data.september.features, req.query.layer);
    // res.json(checkedData);
    checkedData.differences = checkedData.wrongData
    // res.json(checkedData.differences);
    const excel = formatComparisonExcel(checkedData, req.query.layer, "expected", "actual", "compareData")
    res.status(200).json({ checkedData, excel })
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
    
    const excel = formatComparisonExcel(comparedData, req.query.layer,  "excel", "portal", "compareData")
    res.status(200).json({ comparedData, excel })
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
        "september"
    ];
    const layer = String(
        req.query.layer || "september"
    ).toLowerCase();
    const layers = layer === "all" ? MONTHS : [layer];

    const project = USER_COMPANY.REDBULL
    const data =
        await queryFeaturesService(
            layers,
            project,
            req.query
        );
    const attachments = await checkDataService.getAttachmentsService(
        data.september.features.map((feature) => feature.attributes?.OBJECTID),
        data.september.features,
        layers, project
    )

    res.status(200).json({ data, attachments });
}