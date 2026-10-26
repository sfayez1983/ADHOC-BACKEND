import { messages } from "../common/message.js"

export const isAuthorized = (roles= [], client=[]) => {
    return (req, res, next) => {
        
        if (!roles.includes(req.user.role)) 
            return next(new Error({ res, message: messages.token.unAuthorized, statusCode: 400 }))
        if(!client.includes(req.user.client))
            return next(new Error({ res, message: messages.token.unAuthorized, statusCode: 400 }))
        return next()
    }
}