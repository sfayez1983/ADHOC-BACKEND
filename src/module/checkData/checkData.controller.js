import { USER_COMPANY } from "../../common/constant/user.constant.js";
import { readExcel } from "../service/excel.service.js";
import { queryFeaturesService } from "../service/map.service.js";
import * as checkDataService from "./checkData.service.js";

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
    const checkedData = await checkGlobalExpressionsService(data.september.features, req.query.layer);
    res.json(checkedData);
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
    const excelData = readExcel(req.file.path)

    //check data not compared 
    const comparedData = checkDataService.compareDataService(portalData, excelData)

    res.status(200).json(comparedData)
}

//read 
export const readCon = async(req, res) => {
    
    const readExcelData = await readExcel(req.file.path)
    
    console.log(readExcelData);

    res.status(200).json({
        success: true,
        message: "Excel file readed successfully",
        data: {
            excelLength: readExcelData.length,
            excelParsedData: readExcelData,
        }
    })
}