import { messages } from "../common/messages/message.js"
import { User } from "../db/model/user.js"
import { errorResponse } from "../utils/res/res.error.js"
import { verifyToken } from "../utils/token/index.js"


export const isAuthenticate = () => {
    return async (req, res, next) => {
        const { token } = req.headers
        //check token start with Bearer
        if (!token || !token.startsWith("Bearer"))
            errorResponse({ res, message: messages.token.invalid, statusCode: 401 })

        const payload = token.split(" ")[1]

        //verify token
        const result = verifyToken({ token: payload })
        if (result?.error)
            return next(result.error)

        //check user existence

        const userExist = await User.findOne(
            { _id: result._id, isActive: true }
        ).populate('university', 'name')
            .populate('faculty', 'name')
            .populate('Specializations', 'name')
        if (!userExist)
            return next(new Error(messages.token.unauthenticate, { cause: 401 }))

        //prepare data
        req.user = userExist
        next()
    }
} 