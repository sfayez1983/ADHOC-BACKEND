import { USER_COMPANY } from "../../common/constant/user.constant.js";
import * as checkDataService from "./checkData.service.js";
import { formatComparisonExcel } from "./excel.service.js";
import { queryFeaturesService } from "./map.service.js";

// Same steps as GET /api/checkData, shared by the endpoint and the weekly schedule.
// Returns { layer, correct: true, message } or { layer, correct: false, count, checkedData, excelFile }.
export const runCheckData = async (layer = "september", query = {}) => {
    const layers = Array(layer)
    const data = await queryFeaturesService(layers, USER_COMPANY.REDBULL, query)
    const checkedData = await checkDataService.checkGlobalExpressionsService(data[layers].features, layer)

    // nothing wrong -> message only, no Excel is generated or uploaded
    if (!checkedData.wrongData?.length) {
        return { layer, correct: true, message: checkedData.message, checkedData }
    }
    checkedData.differences = checkedData.wrongData
    const excelFile = await formatComparisonExcel(checkedData, layer, "expected", "actual", "compareData")
    return { layer, correct: false, count: checkedData.wrongData.length, checkedData, excelFile }
}
