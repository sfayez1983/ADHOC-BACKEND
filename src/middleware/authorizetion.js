import { messages } from "../common/message.js"

export const isAuthorized = (roles= []) => {
    return (req, res, next) => {
        
        if (!roles.includes(req.user.role)) 
            return next(new Error({ res, message: messages.token.unAuthorized, statusCode: 400 }))
        return next()
    }
}