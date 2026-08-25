import mongoose from "mongoose";
import { USER_CLIENTS, USER_ROLES } from "../../common/constant/user.constant.js";
import { hashPassword } from "../../utils/bcrypt/hash.js";


const userSchema = new mongoose.Schema({

    username: { type: String, minlength: 3, maxlength: 30, required: true, },
    email: { type: String, required: true, unique: true, },
    password: { type: String, required: true, },

    client: { type: String, enum: Object.values(USER_CLIENTS), required: true, },
    role: { type: String, enum: Object.values(USER_ROLES), required: true, },

    isActive: { type: Boolean, default: false },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})


// --- hocks ---
userSchema.pre("save", function () {
    //isModified => check if password was changed
    if (this.isModified("password")) this.password = hashPassword(this.password)

})

export const User = mongoose.model("User", userSchema)