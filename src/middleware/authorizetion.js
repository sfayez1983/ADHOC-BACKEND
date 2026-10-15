import { messages } from "../common/messages/message.js"
import { errorResponse } from "../utils/res/index.js"

export const isAuthorized = (roles= []) => {
    return (req, res, next) => {
        
        if (!roles.includes(req.user.role)) 
            errorResponse({ res, message: messages.token.unauthorized, statusCode: 400 })
        return next()
    }
}