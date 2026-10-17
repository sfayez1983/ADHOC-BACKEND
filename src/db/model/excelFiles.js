import mongoose, { model, Schema } from "mongoose";


const excelSChema = new Schema({
    excelPath: {
        type: String,
        required: true
    },

    createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
})

export const ExcelFile = mongoose.model("ExcelFile", excelSChema)