import { User } from "../db/model/user.js"
import { verifyToken } from "../utils/token/verify.js"


export const isAuthenticate = () => {
    return async (req, res, next) => {
        const { token } = req.headers
        //check token start with Bearer
        if (!token || !token.startsWith("Bearer"))
            throw new Error("invalid token, please login again", { cause: 401 })
        const payload = token.split(" ")[1]

        //verify token
        const result = verifyToken({ token: payload })
        if (result?.error)
            return next(new Error(`${result.error}`, { cause: 401 }))

        //check user existence
        const userExist = await User.findById(result._id)
        if (!userExist)
            return next(new Error("user not found", { cause: 401 }))

        //prepare data
        req.user = userExist
        next()
    }
} 