import mongoose, { model, Schema } from "mongoose";


const excelSChema  = new Schema({
    excelPath: {
        type: String,
        required: true
    },
    // createdBy: {
    //     type: ObjectId,
    //     ref: 
    // }
})

export const ExcelFile = mongoose.model("ExcelFile", excelSChema)