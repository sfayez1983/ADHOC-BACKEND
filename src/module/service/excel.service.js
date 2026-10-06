import XLSX from 'xlsx'
import { ExcelFile } from '../../db/model/excelFiles.js';
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

const buildMissingSheet = (items = []) => {
    // Pull the nested record, whichever key it uses
    const getRecord = (item) => item.portalData ?? item.excelData ?? item.data ?? {};

    // Customer Code + VIP Contract first, then every other field from the records
    const FIXED = ["customer_code", "VIP_Contract"];

    const otherFields = [
        ...new Set(
            items.flatMap(item =>
                Object.keys(getRecord(item)).filter(k => !FIXED.includes(k))
            )
        )
    ];

    const headers = ["Customer Code", "VIP Contract", ...otherFields];

    const rows = items.map(item => {
        const record = getRecord(item);
        return [
            item.customer_code ?? record.customer_code ?? "",
            item.VIP_Contract ?? record.VIP_Contract ?? "",
            ...otherFields.map(field => record[field] ?? "")
        ];
    });

    const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    sheet["!cols"] = headers.map(h => ({ wch: Math.max(12, h.length + 2) }));

    return sheet;
};


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
export const formatComparisonExcel = (comparedData, layer, expectedRow, portalRow, partFolder, mainFolder = 'uploads') => {

    const uploadPath = path.resolve(`${mainFolder}/${partFolder}`);
    fs.mkdirSync(uploadPath, { recursive: true });

    const workbook = XLSX.utils.book_new();
    // =========================
    // Differences
    // =========================
    const differences = comparedData.differences || [];
    
    // Every unique field that appears in any wrongFields
    const fields = [
        ...new Set(differences.flatMap(item => Object.keys(item.wrongFields || {})))
    ];

    const FIXED_COLS = ["Customer Code", "VIP Contract"];

    // Header row 1: fixed columns + field names (each spans 2 columns)
    const firstRow = [...FIXED_COLS];
    // Header row 2: blank under fixed columns + Excel / Portal under each field
    const secondRow = FIXED_COLS.map(() => "");

    fields.forEach(field => {
        firstRow.push(field, "");
        secondRow.push(expectedRow, portalRow);
    });

    // Data rows
    const rows = differences.map(item => {
        const row = [item.customer_code, item.VIP_Contract ?? ""];

        fields.forEach(field => {
            const values = item.wrongFields?.[field];
            row.push(
                values?.excel ?? values?.expected,
                values?.portal ?? values?.actual
            );
        });

        return row;
    });

    const differentSheet = XLSX.utils.aoa_to_sheet([firstRow, secondRow, ...rows]);

    // Merge cells so the header looks grouped
    const merges = [];

    // Fixed columns span both header rows
    FIXED_COLS.forEach((_, c) => {
        merges.push({ s: { r: 0, c }, e: { r: 1, c } });
    });

    // Each field name spans its Excel + Portal columns
    fields.forEach((_, i) => {
        const c = FIXED_COLS.length + i * 2;
        merges.push({ s: { r: 0, c }, e: { r: 0, c: c + 1 } });
    });

    differentSheet["!merges"] = merges;

    // Column widths
    differentSheet["!cols"] = [
        { wch: 15 }, // Customer Code
        { wch: 20 }, // VIP Contract
        ...fields.flatMap(field => {
            const w = Math.max(10, Math.ceil(field.length / 2) + 2);
            return [{ wch: w }, { wch: w }];
        })
    ];

    // Freeze the two header rows and the two fixed columns
    differentSheet["!freeze"] = { xSplit: 2, ySplit: 2 };

    XLSX.utils.book_append_sheet(workbook, differentSheet, "Differences");

    // =========================
    // Missing In Excel
    // =========================
    const missingInExcelSheet = buildMissingSheet(comparedData.missingInExcel);
    XLSX.utils.book_append_sheet(workbook, missingInExcelSheet, "Missing In Excel");

    // =========================
    // Missing In Portal
    // =========================
    const missingInPortalSheet = buildMissingSheet(comparedData.missingInPortal);
    XLSX.utils.book_append_sheet(workbook, missingInPortalSheet, "Missing In Portal");
    // =========================
    // Save file
    // =========================
    const fileName = `comparison-${layer}-${Date.now()}-${nanoid()}.xlsx`;
    const filePath = path.join(uploadPath, fileName);

    XLSX.writeFile(workbook, filePath);

    return filePath;
};