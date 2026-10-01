import XLSX from 'xlsx'
import { ExcelFile } from '../../db/model/excelFiles.js';
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

//excel sheet design & generate
export const writeExcel = (differentData, missingInExcel, missingInPortal, filePath) => {

    const workbook = XLSX.utils.book_new();

    // Different In Excel
    const differentSheet = XLSX.utils.aoa_to_sheet(differentData);
    XLSX.utils.book_append_sheet(
        workbook,
        differentSheet,
        "Different"
    );

    // Missing In Excel
    const missingInExcelSheet = XLSX.utils.json_to_sheet(missingInExcel);
    XLSX.utils.book_append_sheet(
        workbook,
        missingInExcelSheet,
        "Missing In Excel"
    );

    // Missing In Portal
    const missingInPortalSheet = XLSX.utils.json_to_sheet(missingInPortal);
    XLSX.utils.book_append_sheet(
        workbook,
        missingInPortalSheet,
        "Missing In Portal"
    );

    XLSX.writeFile(workbook, filePath);

    return filePath;
};

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

// ===== FROMAT COMPARISON EXCEL =====
export const formatComparisonExcel = (comparedData, layer, partFolder, mainFolder = 'uploads') => {

    const uploadPath = path.resolve(
        `${mainFolder}/${partFolder}`
    );

    fs.mkdirSync(uploadPath, { recursive: true });

    const workbook = XLSX.utils.book_new();

    // =========================
    // Different
    // =========================
    const differences = comparedData.differences || [];

    // Get every unique field from wrongFields
    const fields = [
        ...new Set(differences.flatMap(item => Object.keys(item.wrongFields || {})))
    ];

    // First header row
    const firstRow = ["Customer Code"];

    // Second header row
    const secondRow = [""];
    fields.forEach(field => {
        firstRow.push(field, "");
        secondRow.push("Excel", "Portal");
    });

    // Create rows grouped by customer_code
    const rows = differences.map(item => {
        const row = [item.customer_code];
        fields.forEach(field => {
            const values = item.wrongFields?.[field];
            row.push(
                values?.excel ?? "",
                values?.portal ?? ""
            );
        });

        return row;
    });
    // Create Excel sheet
    const differentSheet = XLSX.utils.aoa_to_sheet([
        firstRow,
        secondRow,
        ...rows
    ]);


    // =========================
    // Missing In Excel
    // =========================

    const missingInExcelSheet = XLSX.utils.json_to_sheet(comparedData.missingInExcel);

    XLSX.utils.book_append_sheet(
        workbook,
        missingInExcelSheet,
        "Missing In Excel"
    );


    // =========================
    // Missing In Portal
    // =========================

    const missingInPortalSheet = XLSX.utils.json_to_sheet(comparedData.missingInPortal);

    XLSX.utils.book_append_sheet(
        workbook,
        missingInPortalSheet,
        "Missing In Portal"
    );


    // =========================
    // Save file
    // =========================

    const fileName = `comparison-${layer}-${Date.now()}-${nanoid()}.xlsx`;

    const filePath = path.join(
        uploadPath,
        fileName
    );

    XLSX.writeFile(workbook, filePath);

    return filePath;
};