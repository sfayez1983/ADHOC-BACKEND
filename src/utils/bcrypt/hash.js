import bcrypt from 'bcrypt'

export const hashPassword = (password) => {
    
    return bcrypt.hashSync(password, Number(process.env.saltOrRounds))
} 