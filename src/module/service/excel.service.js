import XLSX from 'xlsx'
import { ExcelFile } from '../../db/model/excelFiles.js';
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

// ===== READ EXCEL =====
export const readExcel = async (filePath) => {

   const workbook = XLSX.readFile(filePath);
   
   if (!workbook) {
      throw new Error("Failed to read the Excel file.")
   }
   
   const sheetName = workbook.SheetNames[0];
   const worksheet = workbook.Sheets[sheetName];
   
   const data = XLSX.utils.sheet_to_json(worksheet);

   if (!data) {
      throw new Error("Failed to convert Excel sheet to JSON.")
   }

   await ExcelFile.create({ excelPath: filePath })
   return data
}

// ===== WRITE EXCEL =====
export const writeExcel = (comparedData, mainFolder, partFolder) => {

    const uploadPath = path.resolve(
        `uploads/${mainFolder}/${partFolder}`
    );

    fs.mkdirSync(uploadPath, { recursive: true });

    const workbook = XLSX.utils.book_new();

    // DIFFERENT
    const differentData = comparedData.differences.flatMap(item =>
        Object.entries(item.wrongFields).map(
            ([field, values]) => ({
                customer_code: item.customer_code,
                field,
                excel: values.excel ?? "",
                portal: values.portal ?? ""
            })
        )
    );

    const differentSheet = XLSX.utils.json_to_sheet(differentData);

    XLSX.utils.book_append_sheet(
        workbook,
        differentSheet,
        "Different"
    );


    // MISSING IN EXCEL
    const missingInExcelSheet = XLSX.utils.json_to_sheet(
        comparedData.missingInExcel
    );

    XLSX.utils.book_append_sheet(
        workbook,
        missingInExcelSheet,
        "Missing In Excel"
    );


    // MISSING IN PORTAL
    const missingInPortalSheet = XLSX.utils.json_to_sheet(
        comparedData.missingInPortal
    );

    XLSX.utils.book_append_sheet(
        workbook,
        missingInPortalSheet,
        "Missing In Portal"
    );


    const fileName = `comparison-${nanoid()}.xlsx`;

    const filePath = path.join(
        uploadPath,
        fileName
    );

    XLSX.writeFile(workbook, filePath);

    return filePath;
};