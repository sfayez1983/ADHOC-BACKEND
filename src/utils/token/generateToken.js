import jwt from 'jsonwebtoken'

export const generateToken =  ({ payload, option, key = process.env.saltOrRounds }) => {
    
    return  jwt.sign(payload, key, option)

}