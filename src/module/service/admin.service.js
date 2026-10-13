import { User } from "../../db/model/user.js"


export const addUser = async (body) => {
    const { username, password, role, client, email } = body

    const userExist = await User.findOne({ $or: [{ email }, { username }] })
    if (userExist) throw new Error("userName or email already exist")
    
    const user = await User.create({ username, password, role, client, email })
    return user

}