import { User } from "../../db/model/user.js";
import { comparePassword } from "../../utils/bcrypt/compare.js";


export const signup = async (req, res, next) => {
    const { email, password } = req.body;

    const userExist = await User.findOne({ email });
    if (userExist) return res.status(400).json({ message: "User already exist" });

    const user = await User.create(req.body);
    if (!user) return res.status(400).json({ message: "User not created" });

    res.status(201).json({ message: "User created successfully", user });
}

export const login = async (req, res, next) => {
    const { email, password } = req.body;

    //check existince 
    const userExist = await User.findOne({ email });
    if (!userExist) return res.status(400).json({ message: "email or password is invalid" });

    const isPasswordValid = await comparePassword(password, userExist.password);
    if (!isPasswordValid) return res.status(400).json({ message: "email or password is invalid" });

    //prepare data 
    const access_token = generateToken({
        payload: { _id: userExist._id },
        option: { expiresIn: "1h" }

    })
    const refresh_token = generateToken({
        payload: { _id: userExist._id },
        option: { expiresIn: "7d" }
    })
    userExist.isActive = true
    await userExist.save()

    return res.status(200).json({ message: "User logged in successfully", token: { access_token, refresh_token } });
}