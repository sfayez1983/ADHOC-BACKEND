import axios from "axios";
import { arcgisGet } from "../../utils/arcgis/arcgisGet.js";
import { getLayersConfig } from "../../../config/projectLayers.config.js";
import globalExpressions from "../../common/calc/Global_Expressions_1.js";


// ============================================================
// normalize
// Makes equal-meaning values compare as equal:
//   null / undefined / ""  -> 0
//   "yes" -> 1, "no" -> 0   (any case, spaces trimmed)
//   numeric strings ("5", " 0.8 ") -> number
//   other text -> trimmed lower-case text
// ============================================================
const normalize = (value) => {
    if (value === null || value === undefined) return 0;

    if (typeof value === "boolean") return value ? 1 : 0;

    if (typeof value === "string") {
        const v = value.trim().toLowerCase();

        if (v === "") return 0;
        if (v === "yes") return 1;
        if (v === "no") return 0;

        const n = Number(v);
        return Number.isFinite(n) ? n : v;
    }

    return value;
};

// ============================================================
// isSameValue
// Numbers are compared with a tiny tolerance so float noise
// (e.g. 0.30000000000000004 vs 0.3) is not reported as wrong.
// ============================================================
const isSameValue = (actual, expected) => {
    const a = normalize(actual);
    const e = normalize(expected);

    if (typeof a === "number" && typeof e === "number") {
        return Math.abs(a - e) < 1e-6;
    }

    return a === e;
};

// ============================================================
// CHECK GLOBAL EXPRESSIONS SERVICE
// ============================================================
export const checkGlobalExpressionsService = async (features, layer) => {
    const wrongData = [];

    features.forEach((feature) => {
        const outlet = feature.attributes;

        const correctData = globalExpressions(outlet);

        const wrongFields = {};

        Object.keys(correctData).forEach((field) => {
            if (!isSameValue(outlet[field], correctData[field])) {
                wrongFields[field] = {
                    actual: outlet[field],
                    expected: correctData[field],
                };
            }
        });

        if (Object.keys(wrongFields).length > 0) {
            wrongData.push({
                customer_code: outlet.customer_code,
                customer_name: outlet.customer_name,
                VIP_Contract: outlet.VIP_Contract,
                wrongFields,
            });
        }
    });

    if (wrongData.length === 0)
        return { message: `all data in layer ${layer} are correct` };

    return {
        layer,
        count: wrongData.length,
        wrongData,
    };
};

// ==========================================
// COMPARE DATA SERVICE
// ==========================================
export const compareDataService = (features, excelData) => {
    const layer = features?.layers?.[0];
    const portalData = (features?.[layer]?.features ?? []).map(f => f.attributes);

    const getCustomerCode = (data) => String(data?.customer_code ?? "").trim();

    const portalMap = new Map(portalData.map(row => [getCustomerCode(row), row]));
    const excelMap = new Map(excelData.map(row => [getCustomerCode(row), row]));

    // Treat these as "empty / zero"
    const isBlankOrZero = (v) =>
        v === undefined || v === null || String(v).trim() === "" || Number(v) === 0 && String(v).trim() !== "";

    const toBool = (v) => {
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "yes" || s === "1" || s === "true") return true;
        if (s === "no" || s === "0" || s === "false") return false;
        return null; // not a boolean-like value
    };

    // Returns true if the two values mean the same thing
    const valuesAreEquivalent = (excelValue, portalValue) => {
        const e = String(excelValue ?? "").trim();
        const p = String(portalValue ?? "").trim();

        // Exact match after normalization
        if (e === p) return true;

        // Blank / 0 / undefined on both sides  ('' vs 0, 0 vs undefined)
        if (isBlankOrZero(excelValue) && isBlankOrZero(portalValue)) return true;

        // Yes/No <-> 1/0 (case-insensitive)
        const eb = toBool(excelValue);
        const pb = toBool(portalValue);
        if (eb !== null && pb !== null && eb === pb) return true;

        // Numeric match ("5" vs 5, floating strings)
        if (e !== "" && p !== "" && !isNaN(e) && !isNaN(p) && Number(e) === Number(p)) return true;

        return false;
    };

    const differences = [];
    const missingInExcel = [];
    const missingInPortal = [];

    // 1. Excel vs Portal
    excelMap.forEach((excelRow, customerCode) => {
        const portalRow = portalMap.get(customerCode);

        if (!portalRow) {
            missingInPortal.push({ customer_code: customerCode, excelData: excelRow });
            return;
        }

        const wrongFields = {};

        Object.keys(excelRow).forEach(field => {
            if (field === "customer_code") return;

            let excelValue = excelRow[field];
            let portalValue = portalRow[field];

            // if(field === "compliance"){ 
            //     excelValue = Number(Number(excelValue).toFixed(3));
            // }
            if(field === "VIP_Contract") {
                excelValue = String(excelValue).trim().toLowerCase();
                portalValue = String(portalValue).trim().toLowerCase();
            }
            if (!valuesAreEquivalent(excelValue, portalValue)) {
                wrongFields[field] = { excel: excelValue, portal: portalValue };
            }
        });

        // ==========================================
        // 1. only if real differences remain
        // ==========================================
        if (Object.keys(wrongFields).length > 0) {
            differences.push({ customer_code: customerCode, VIP_Contract: excelRow.VIP_Contract, wrongFields });
        }
    });

    // ==========================================
    // 2. Excel records not in Portal
    // ==========================================
    excelMap.forEach((excelRow, customerCode) => {
        if (!excelMap.has(customerCode)) {
            missingInPortal.push({ excelData: excelRow });
        }
    });


    // ==========================================
    // 3. Portal records not in Excel
    // ==========================================
    portalMap.forEach((portalRow, customerCode) => {
        if (!excelMap.has(customerCode)) {
            missingInExcel.push({portalData: portalRow});
        }
    });


    // ==========================================
    // 3. Return result
    // ==========================================


    return {
        summary: {
            excelRecords: excelMap.size,
            portalRecords: portalMap.size,
            differences: differences.length,
            missingInExcel: missingInExcel.length,
            missingInPortal: missingInPortal.length
        },

        differences,
        missingInExcel,
        missingInPortal
    };
};

// ==========================================
//GET ATTACHMENTS SERVICE
// ==========================================
export const getAttachmentsService = async (objectIds, outlet, layers, project) => {
  if (!objectIds?.length) return [];

  const { url, token } = await getLayersConfig(layers[0], project);

  // OBJECTID -> outlet attributes, built once (O(1) lookups instead of .find per group)
  const outletById = new Map(
    (outlet || []).map((o) => [o.attributes?.OBJECTID, o.attributes])
  );

  const BATCH_SIZE = 200;
  const allAttachments = [];

  for (let i = 0; i < objectIds.length; i += BATCH_SIZE) {
    const batchIds = objectIds.slice(i, i + BATCH_SIZE);

    const response = await arcgisGet(`${url}/queryAttachments`, {
      f: "json",
      objectIds: batchIds.join(","),
      returnUrl: true,
      token,
    });

    // ArcGIS returns HTTP 200 with an "error" object (e.g. expired token)
    if (response.data.error) {
      const err = new Error(
        `ArcGIS queryAttachments failed: ${response.data.error.message || response.data.error.code}`
      );
      err.statusCode = 502;
      throw err;
    }

    const attachmentGroups = response.data.attachmentGroups || [];

    // Enrich only this batch's groups
    const enriched = attachmentGroups.map((group) => {
      const attrs = outletById.get(group.parentObjectId);
      return {
        ...group,
        customer_code: attrs?.customer_code ?? null,
        // used for the Drive folder name when customer_code is missing
        // (undefined = field was not requested, so the Drive upload reads it from ArcGIS itself)
        new_adhoc_code: attrs?.new_adhoc_code,
        Area_Name: attrs?.Area_Name,
        Block: attrs?.Block,
        ID: attrs?.ID,
        VIP_Contract: attrs?.VIP_Contract ?? null,
      };
    });

    allAttachments.push(...enriched);
  }

  return {
    outletsCount: allAttachments.length,
    imagesCount: allAttachments.reduce((total, attachment) => total + attachment.attachmentInfos.length, 0),
    allAttachments
  };
};

// ==========================================
// COUNT PHOTOS PER KEYWORD FOR EVERY OUTLET
// ==========================================
// allAttachments: output of getAttachmentsService
// outlets (optional): features of the layer, so outlets with 0 photos are listed too
export const NO_KEYWORD = "(no keyword)";

// Read an attribute whatever its case (field_code / Field_Code / FIELD_CODE)
const getAttr = (attrs = {}, name) => {
  const key = Object.keys(attrs).find((k) => k.toLowerCase() === name.toLowerCase());
  return key !== undefined ? attrs[key] : undefined;
};

export const countAttachmentKeywordsService = (allAttachments = [], outlets = []) => {
  const keywordTotals = new Map();
  const rowsById = new Map();

  // every outlet first (0 photos), in the layer's order
  for (const o of outlets) {
    const a = o.attributes || {};
    if (a.OBJECTID === undefined) continue;
    rowsById.set(a.OBJECTID, {
      customer_code: a.customer_code ?? "",
      VIP_Contract: a.VIP_Contract ?? "",
      field_code: getAttr(a, "field_code") ?? "",
      counts: {},
      total: 0,
    });
  }

  for (const group of allAttachments) {
    let row = rowsById.get(group.parentObjectId);
    if (!row) {
      row = { customer_code: group.customer_code ?? "", VIP_Contract: group.VIP_Contract ?? "", field_code: group.field_code ?? "", counts: {}, total: 0 };
      rowsById.set(group.parentObjectId, row);
    }
    for (const att of group.attachmentInfos || []) {
      const keyword = String(att.keywords ?? "").trim() || NO_KEYWORD;
      row.counts[keyword] = (row.counts[keyword] || 0) + 1;
      row.total++;
      keywordTotals.set(keyword, (keywordTotals.get(keyword) || 0) + 1);
    }
  }

  // columns: most used keyword first, "(no keyword)" last
  const keywords = [...keywordTotals.entries()]
    .sort((a, b) => (a[0] === NO_KEYWORD) - (b[0] === NO_KEYWORD) || b[1] - a[1])
    .map(([k]) => k);

  const rows = [...rowsById.values()];
  return {
    keywords,
    rows,
    totals: Object.fromEntries(keywords.map((k) => [k, keywordTotals.get(k)])),
    summary: {
      outlets: rows.length,
      outletsWithPhotos: rows.filter((r) => r.total > 0).length,
      outletsWithoutPhotos: rows.filter((r) => r.total === 0).length,
      photos: rows.reduce((n, r) => n + r.total, 0),
      keywords: keywords.length,
    },
  };
};
