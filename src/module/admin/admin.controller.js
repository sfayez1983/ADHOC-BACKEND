import * as adminService from "../service/admin.service.js"


export const addUserCon = async (req, res, next) => {
    const data = await adminService.addUser(req.body)

    res.status(200).json(data)
}