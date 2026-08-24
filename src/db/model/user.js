import mongoose from "mongoose";


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
        required: true,
    },
    
},{
    timestamps: true,
})

export const User = mongoose.model("User", userSchema)