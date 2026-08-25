import mongoose from "mongoose";
import { USER_ROLES } from "../../common/constant/user.constant.js";


const userSchema = mongoose.Schema({

    username: {
        type: String,
        minlength: 3,
        maxlength: 30,
        required: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    clint:{
        type: String,
        enum: Object.values(USER_CLIENTS),
        required: true,
    },
    role:{
        type: String,
        enum: Object.values(USER_ROLES),
        required: true,
    }
    
},{
    timestamps: true,
})

export const User = mongoose.model("User", userSchema)