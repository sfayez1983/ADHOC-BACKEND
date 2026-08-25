import { User } from "../../db/model/user.js";


export const signup = async(req, res, next) => {
    const { email, password } = req.body;

    const userExist = await User.findOne({ email });
    if(userExist) return res.status(400).json({ message: "User already exist" });

    const user = await User.create(req.body);
    if(!user) return res.status(400).json({ message: "User not created" });

    res.status(201).json({ message: "User created successfully", user });
}