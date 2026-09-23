import { USER_COMPANY } from "../../common/constant/user.constant.js";
import { queryFeaturesService } from "../map/map.service.js";
import { checkDataService } from "./checkData.service.js";


export const checkDataController = async (req, res, next) => {

        //prepare data
        const layers = Array(
            req.query.layer || "september"
        )
        const project = USER_COMPANY.REDBULL
        
        //get layer data
        const data = await queryFeaturesService(layers, project, req.query);

        //check if data was wrong
        const checkedData = await checkDataService(data.september.features, req.query.layer);
        res.json(checkedData);
}