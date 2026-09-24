import { User } from "../db/model/user.js"
import { verifyToken } from "../utils/token/verify.js"


export const isAuthenticate = () => {
    return async (req, res, next) => {
        const { authorization } = req.headers

        //check authorization start with Bearer
        if (!authorization || !authorization.startsWith("Bearer"))
            throw new Error("invalid authorization, please login again", { cause: 401 })
        const payload = authorization.split(" ")[1]

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