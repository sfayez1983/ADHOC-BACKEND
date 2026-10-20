import bcrypt from 'bcrypt'

export const comparePassword = (password, bufferPassword) => {
    
    return bcrypt.compare(password, bufferPassword)
} 