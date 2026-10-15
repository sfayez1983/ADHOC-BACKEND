import fs from 'fs'
import path from 'path'
export const deleteFile = (fullpath) => {

    fs.unlinkSync(path.resolve(fullpath))
    
}