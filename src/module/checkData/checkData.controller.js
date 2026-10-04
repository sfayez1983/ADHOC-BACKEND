import { USER_COMPANY } from "../../common/constant/user.constant.js";
import  * as checkDataService  from "../service/checkData.service.js";
import { formatComparisonExcel, readExcel, writeExcel } from "../service/excel.service.js";
import { queryFeaturesService } from "../service/map.service.js";


//check calculation data
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
    const excel = formatComparisonExcel(checkedData, req.query.layer, "compareData")
    res.status(200).json({checkedData, excel})
}

// compare data
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
    if(comparedData.summary.missingInPortal === 0 && comparedData.summary.missingInExcel === 0 && comparedData.summary.differences === 0){
        return res.status(200).json({message: "all data are correct"})
    }
    const excel = formatComparisonExcel(comparedData, req.query.layer, "compareData")
    res.status(200).json({comparedData, excel})
}

//read 
export const readCon = async(req, res) => {
    
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