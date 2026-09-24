import jwt from 'jsonwebtoken'


export const verifyToken = ({ token, pageType, key = process.env.saltOrRounds }) => {
    try {
        const payload = jwt.verify(token, key); 
        if (pageType || payload?.type) {
            if (payload?.type !== pageType) {
                return { error: 'Invalid token type' };
            }
        }
        return payload;
    } catch (error) {
        return { error }
    }
}