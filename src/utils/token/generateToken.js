import jwt from 'jsonwebtoken'

export const generateToken =  ({ payload, option, key = process.env.JWT_KEY }) => {
    return  jwt.sign(payload, key, option)

}