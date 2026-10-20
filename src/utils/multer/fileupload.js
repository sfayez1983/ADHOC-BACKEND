import multer, { diskStorage } from "multer"
import { nanoid } from "nanoid"
import fs from 'fs'
import path from "path"


export const fileValidationType = {
    file: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
}

export const fileupload = ({ mainFolder, partFolder, allowTypes = fileValidationType.file }) => {
    const storage = diskStorage({

        destination: (req, file, cb) => {

            const fullPath = path.resolve(`uploads/${mainFolder}/${partFolder}`)
            
            fs.mkdirSync(fullPath, { recursive: true })
            
            cb(null, `uploads/${mainFolder}/${partFolder}`)
        },

        filename: (req, file, cb) => {
            cb(null, nanoid() + file.originalname)
        }
    })

    const fileFilter = (req, file, cb) => {
        if (!allowTypes.includes(file.mimetype)) {
            return cb(new Error('invalid file format', 400), false)
        }
        req.allowTypes = allowTypes

        return cb(null, true)
    }

    return multer({ storage, fileFilter })
}