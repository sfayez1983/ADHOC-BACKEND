import XLSX from 'xlsx'
import { ExcelFile } from '../../db/model/excelFiles.js';


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
export const writeExcel = (data, fileName) => {
   //Convert JSON → Sheet
   const worksheet = XLSX.utils.json_to_sheet(data);

   //Create workbook
   const workbook = XLSX.utils.book_new();

   //Add sheet to workbook
   XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

   //Write file
   XLSX.writeFile(workbook, fileName);
   return fileName
}