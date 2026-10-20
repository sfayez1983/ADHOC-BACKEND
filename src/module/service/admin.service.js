import { User } from "../../db/model/user.js"


export const addUser = async (body) => {
    const { username, password, role, client, email } = body

    const emailExist = await User.findOne({ email })
    if (emailExist) throw new Error("Email already exist")

    const usernameExist = await User.findOne({ username })
    if (usernameExist) throw new Error("Username already exist")
        
    const user = await User.create({ username, password, role, client, email, createdBy: body.createdBy })
    return user

}