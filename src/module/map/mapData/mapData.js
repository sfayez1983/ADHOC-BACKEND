/**
 * ============================================================
 * STATIC DATA - ArcGIS Map Server Configuration
 * ============================================================
 * 
 * This file contains all static data that simulates ArcGIS Online
 * REST API responses. When connecting to real ArcGIS Online later,
 * this data will be replaced with actual API responses.
 * 
 * Structure matches ArcGIS REST API format exactly.
 * ============================================================
 */

// ============================================================
// 1. SERVICE INFO (MapServer root)
// ============================================================
export const serviceInfo = {
  currentVersion: 11.1,
  serviceDescription: "Outlets Management Map Service",
  mapName: "OutletsMap",
  capabilities: "Map,Query,Data,Editing",
  supportedQueryFormats: "JSON, geoJSON",
  exportTilesAllowed: false,
  maxExportTilesCount: 100000,
  singleFusedMapCache: false,
  initialExtent: {
    xmin: 30.0,
    ymin: 29.0,
    xmax: 33.0,
    ymax: 32.0,
    spatialReference: {
      wkid: 4326,
      latestWkid: 4326
    }
  },
  fullExtent: {
    xmin: 25.0,
    ymin: 22.0,
    xmax: 37.0,
    ymax: 32.0,
    spatialReference: {
      wkid: 4326,
      latestWkid: 4326
    }
  },
  spatialReference: {
    wkid: 4326,
    latestWkid: 4326
  },
  units: "esriDecimalDegrees",
  minScale: 0,
  maxScale: 0,
  layers: [
    {
      id: 0,
      name: "Outlets",
      parentLayerId: -1,
      defaultVisibility: true,
      subLayerIds: null,
      minScale: 0,
      maxScale: 0
    }
  ],
  tables: [],
  documentInfo: {
    Title: "Outlets Map Service",
    Author: "Backend API",
    Comments: "",
    Subject: "Outlets Management",
    Category: "Map Service",
    Keywords: "outlets, stores, management"
  },
  copyrightText: "",
  editingInfo: {
    lastEditDate: 1700000000000
  }
};

// ============================================================
// 2. LAYER INFO (MapServer/0)
// ============================================================
export const layerInfo = {
  currentVersion: 11.1,
  id: 0,
  name: "Outlets",
  type: "Feature Layer",
  description: "Outlets locations and information",
  copyrightText: "",
  defaultVisibility: true,
  editFieldsInfo: {
    creationDateField: "created_date",
    creatorField: "creator",
    editDateField: "last_edited_date",
    editorField: "editor"
  },
  editingInfo: {
    lastEditDate: 1700000000000
  },
  ownershipBasedAccessControlForFeatures: null,
  syncCanReturnChanges: true,
  relationships: [],
  isDataVersioned: false,
  supportsStatistics: true,
  supportsAdvancedQueries: true,
  supportsValidateSql: true,
  supportsCoordinatesQuantization: true,
  supportsQueryTopFilter: true,
  supportsCalculate: true,
  hasAttachments: false,
  htmlPopupType: "esriServerHTMLPopupTypeAsHTMLText",
  hasMetadata: true,
  hasM: false,
  hasZ: false,
  objectIdField: "OBJECTID",
  globalIdField: "",
  typeIdField: "",
  fields: [
    {
      name: "OBJECTID",
      type: "esriFieldTypeOID",
      alias: "OBJECTID",
      sqlType: "sqlTypeOther",
      length: 0,
      nullable: false,
      editable: false,
      domain: null,
      defaultValue: null
    },
    {
      name: "outlet_name",
      type: "esriFieldTypeString",
      alias: "اسم الـ Outlet",
      sqlType: "sqlTypeOther",
      length: 100,
      nullable: false,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "outlet_type",
      type: "esriFieldTypeString",
      alias: "نوع الـ Outlet",
      sqlType: "sqlTypeOther",
      length: 50,
      nullable: false,
      editable: true,
      domain: {
        type: "codedValue",
        name: "outlet_type",
        codedValues: [
          { name: "Store", code: "Store" },
          { name: "Warehouse", code: "Warehouse" },
          { name: "Distributor", code: "Distributor" },
          { name: "Kiosk", code: "Kiosk" }
        ]
      },
      defaultValue: null
    },
    {
      name: "status",
      type: "esriFieldTypeString",
      alias: "الحالة",
      sqlType: "sqlTypeOther",
      length: 20,
      nullable: false,
      editable: true,
      domain: {
        type: "codedValue",
        name: "status",
        codedValues: [
          { name: "Active", code: "Active" },
          { name: "Inactive", code: "Inactive" },
          { name: "Closed", code: "Closed" },
          { name: "Under Construction", code: "Under Construction" }
        ]
      },
      defaultValue: null
    },
    {
      name: "manager_name",
      type: "esriFieldTypeString",
      alias: "اسم المدير",
      sqlType: "sqlTypeOther",
      length: 100,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "phone",
      type: "esriFieldTypeString",
      alias: "رقم الهاتف",
      sqlType: "sqlTypeOther",
      length: 20,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "address",
      type: "esriFieldTypeString",
      alias: "العنوان",
      sqlType: "sqlTypeOther",
      length: 200,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "governorate",
      type: "esriFieldTypeString",
      alias: "المحافظة",
      sqlType: "sqlTypeOther",
      length: 50,
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "sales_target",
      type: "esriFieldTypeDouble",
      alias: "هدف المبيعات",
      sqlType: "sqlTypeOther",
      nullable: true,
      editable: true,
      domain: null,
      defaultValue: null
    },
    {
      name: "created_date",
      type: "esriFieldTypeDate",
      alias: "تاريخ الإنشاء",
      sqlType: "sqlTypeOther",
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null
    },
    {
      name: "last_edited_date",
      type: "esriFieldTypeDate",
      alias: "آخر تعديل",
      sqlType: "sqlTypeOther",
      nullable: true,
      editable: false,
      domain: null,
      defaultValue: null
    }
  ],
  geometryType: "esriGeometryPoint",
  minScale: 0,
  maxScale: 0,
  extent: {
    xmin: 25.0,
    ymin: 22.0,
    xmax: 37.0,
    ymax: 32.0,
    spatialReference: {
      wkid: 4326,
      latestWkid: 4326
    }
  },
  drawingInfo: {
    renderer: {
      type: "simple",
      symbol: {
        type: "esriSMS",
        style: "esriSMSCircle",
        color: [41, 128, 185, 255],
        size: 12,
        angle: 0,
        xoffset: 0,
        yoffset: 0,
        outline: {
          color: [255, 255, 255, 255],
          width: 2,
          type: "esriSLS",
          style: "esriSLSSolid"
        }
      },
      label: "",
      description: ""
    },
    labelingInfo: null,
    transparency: 0
  },
  defaultVisibility: true,
  maxRecordCount: 1000,
  hasStaticData: false,
  timeInfo: null,
  uniqueIdField: {
    name: "OBJECTID",
    isSystemMaintained: true
  },
  typeIds: [],
  types: []
};

// ============================================================
// 3. OUTLET FEATURES (Static Data)
// ============================================================
export const outletFeatures = [
  // === Alexandria (12 outlets) ===
  {
    attributes: {
      OBJECTID: 1, outlet_name: "أبو أحمد", outlet_name_en: "Abu Ahmed",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Shared", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.2156, lng: 29.9553,
      created_date: 1700000000000, last_edited_date: 1700000000000
    }
  },
  {
    attributes: {
      OBJECTID: 2, outlet_name: "ام علي", outlet_name_en: "Om Ali",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة منزلي / صغيرة",
      channel: "Retail", brand: "Unclassified", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.2200, lng: 29.9480,
      created_date: 1700001000000, last_edited_date: 1700001000000
    }
  },
  {
    attributes: {
      OBJECTID: 3, outlet_name: "الحاج خميس", outlet_name_en: "El Haj Khamis",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Unclassified", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.2180, lng: 29.9600,
      created_date: 1700002000000, last_edited_date: 1700002000000
    }
  },
  {
    attributes: {
      OBJECTID: 4, outlet_name: "فوزي بكر", outlet_name_en: "Fawzi Bakr",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Unclassified", pepsi_cooler: 1, coke_cooler: 0,
      status: "ناجح", lat: 31.2220, lng: 29.9520,
      created_date: 1700003000000, last_edited_date: 1700003000000
    }
  },
  {
    attributes: {
      OBJECTID: 5, outlet_name: "صبحي محمد", outlet_name_en: "Sobhy Mohamed",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.2100, lng: 29.9700,
      created_date: 1700004000000, last_edited_date: 1700004000000
    }
  },
  {
    attributes: {
      OBJECTID: 6, outlet_name: "رضا", outlet_name_en: "Reda",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 1,
      status: "ناجح", lat: 31.2050, lng: 29.9650,
      created_date: 1700005000000, last_edited_date: 1700005000000
    }
  },
  {
    attributes: {
      OBJECTID: 7, outlet_name: "التقوي", outlet_name_en: "El Taqwa",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Shared", pepsi_cooler: 1, coke_cooler: 0,
      status: "ناجح", lat: 31.2280, lng: 29.9580,
      created_date: 1700006000000, last_edited_date: 1700006000000
    }
  },
  {
    attributes: {
      OBJECTID: 8, outlet_name: "ابو ابراهيم", outlet_name_en: "Abu Ibrahim",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 0, coke_cooler: 1,
      status: "ناجح", lat: 31.2130, lng: 29.9430,
      created_date: 1700007000000, last_edited_date: 1700007000000
    }
  },
  {
    attributes: {
      OBJECTID: 9, outlet_name: "ابو حسام", outlet_name_en: "Abu Hossam",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Shared", pepsi_cooler: 0, coke_cooler: 1,
      status: "ناجح", lat: 31.2170, lng: 29.9750,
      created_date: 1700008000000, last_edited_date: 1700008000000
    }
  },
  {
    attributes: {
      OBJECTID: 10, outlet_name: "ايمن", outlet_name_en: "Ayman",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "ناجح", lat: 31.2090, lng: 29.9620,
      created_date: 1700009000000, last_edited_date: 1700009000000
    }
  },
  {
    attributes: {
      OBJECTID: 11, outlet_name: "اولاد شاهين", outlet_name_en: "Awlad Shaheen",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "ناجح", lat: 31.2250, lng: 29.9500,
      created_date: 1700010000000, last_edited_date: 1700010000000
    }
  },
  {
    attributes: {
      OBJECTID: 12, outlet_name: "كمال جاد", outlet_name_en: "Kamal Gad",
      governorate: "Alexandria", sector: "Qesm Mina Albasal", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.2110, lng: 29.9590,
      created_date: 1700011000000, last_edited_date: 1700011000000
    }
  },
  // === Cairo (4 outlets) ===
  {
    attributes: {
      OBJECTID: 13, outlet_name: "محمود السعيد", outlet_name_en: "Mahmoud El-Sayed",
      governorate: "Cairo", sector: "Nasr City", type: "سوبر ماركت",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 2, coke_cooler: 1,
      status: "ناجح", lat: 30.0626, lng: 31.3448,
      created_date: 1700012000000, last_edited_date: 1700012000000
    }
  },
  {
    attributes: {
      OBJECTID: 14, outlet_name: "السلام", outlet_name_en: "El Salam",
      governorate: "Cairo", sector: "Heliopolis", type: "بقالة",
      channel: "Retail", brand: "Shared", pepsi_cooler: 1, coke_cooler: 1,
      status: "ناجح", lat: 30.0915, lng: 31.3372,
      created_date: 1700013000000, last_edited_date: 1700013000000
    }
  },
  {
    attributes: {
      OBJECTID: 15, outlet_name: "الملك", outlet_name_en: "El Malik",
      governorate: "Cairo", sector: "Maadi", type: "بقالة منزلي / صغيرة",
      channel: "Retail", brand: "Unclassified", pepsi_cooler: 0, coke_cooler: 0,
      status: "لم يزر", lat: 29.9602, lng: 31.2569,
      created_date: 1700014000000, last_edited_date: 1700014000000
    }
  },
  {
    attributes: {
      OBJECTID: 16, outlet_name: "الرحمة", outlet_name_en: "El Rahma",
      governorate: "Cairo", sector: "Maadi", type: "بقالة",
      channel: "Retail", brand: "Coca-Cola", pepsi_cooler: 0, coke_cooler: 2,
      status: "ناجح", lat: 29.9700, lng: 31.2600,
      created_date: 1700015000000, last_edited_date: 1700015000000
    }
  },
  // === Giza (3 outlets) ===
  {
    attributes: {
      OBJECTID: 17, outlet_name: "النور", outlet_name_en: "El Noor",
      governorate: "Giza", sector: "6th October", type: "سوبر ماركت",
      channel: "Retail", brand: "Coca-Cola", pepsi_cooler: 0, coke_cooler: 2,
      status: "ناجح", lat: 29.9577, lng: 30.9375,
      created_date: 1700016000000, last_edited_date: 1700016000000
    }
  },
  {
    attributes: {
      OBJECTID: 18, outlet_name: "الفرقان", outlet_name_en: "El Furqan",
      governorate: "Giza", sector: "Mohandessin", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "فشل", lat: 30.0590, lng: 31.2010,
      created_date: 1700017000000, last_edited_date: 1700017000000
    }
  },
  {
    attributes: {
      OBJECTID: 19, outlet_name: "الأمل", outlet_name_en: "El Amal",
      governorate: "Giza", sector: "6th October", type: "بقالة",
      channel: "Retail", brand: "Shared", pepsi_cooler: 1, coke_cooler: 1,
      status: "ناجح", lat: 29.9800, lng: 30.9200,
      created_date: 1700018000000, last_edited_date: 1700018000000
    }
  },
  // === Dakahlia (2 outlets) ===
  {
    attributes: {
      OBJECTID: 20, outlet_name: "المستقبل", outlet_name_en: "El Mostaqbal",
      governorate: "Dakahlia", sector: "Mansoura Center", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "ناجح", lat: 31.0409, lng: 31.3785,
      created_date: 1700019000000, last_edited_date: 1700019000000
    }
  },
  {
    attributes: {
      OBJECTID: 21, outlet_name: "الوفاء", outlet_name_en: "El Wafa",
      governorate: "Dakahlia", sector: "Talkha", type: "بقالة منزلي / صغيرة",
      channel: "Retail", brand: "Unclassified", pepsi_cooler: 0, coke_cooler: 0,
      status: "ناجح", lat: 31.0500, lng: 31.3700,
      created_date: 1700020000000, last_edited_date: 1700020000000
    }
  },
  // === Sharkia (2 outlets) ===
  {
    attributes: {
      OBJECTID: 22, outlet_name: "الأمان", outlet_name_en: "El Aman",
      governorate: "Sharkia", sector: "Zagazig Center", type: "سوبر ماركت",
      channel: "Retail", brand: "Shared", pepsi_cooler: 1, coke_cooler: 1,
      status: "ناجح", lat: 30.5876, lng: 31.4942,
      created_date: 1700021000000, last_edited_date: 1700021000000
    }
  },
  {
    attributes: {
      OBJECTID: 23, outlet_name: "السعادة", outlet_name_en: "El Saada",
      governorate: "Sharkia", sector: "Belbeis", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "لم يزر", lat: 30.4200, lng: 31.5500,
      created_date: 1700022000000, last_edited_date: 1700022000000
    }
  },
  // === Beheira (2 outlets) ===
  {
    attributes: {
      OBJECTID: 24, outlet_name: "التوفيق", outlet_name_en: "El Tawfiq",
      governorate: "Beheira", sector: "Damanhour Center", type: "بقالة",
      channel: "Retail", brand: "Coca-Cola", pepsi_cooler: 0, coke_cooler: 2,
      status: "ناجح", lat: 31.0341, lng: 30.4682,
      created_date: 1700023000000, last_edited_date: 1700023000000
    }
  },
  {
    attributes: {
      OBJECTID: 25, outlet_name: "البركة", outlet_name_en: "El Baraka",
      governorate: "Beheira", sector: "Kafr El Dawwar", type: "بقالة",
      channel: "Retail", brand: "Pepsi", pepsi_cooler: 1, coke_cooler: 0,
      status: "فشل", lat: 31.1350, lng: 30.1300,
      created_date: 1700024000000, last_edited_date: 1700024000000
    }
  }
];
// ============================================================
// 4. LEGEND INFO
// ============================================================
const legendInfo = {
  layers: [
    {
      layerId: 0,
      layerName: "Outlets",
      legend: [
        {
          label: "Active Outlets",
          url: "",
          imageData: null,
          width: 0,
          height: 0,
          symbol: {
            type: "esriSMS",
            style: "esriSMSCircle",
            color: [41, 128, 185, 255],
            size: 12,
            outline: {
              color: [255, 255, 255, 255],
              width: 2
            }
          }
        },
        {
          label: "Inactive Outlets",
          url: "",
          imageData: null,
          width: 0,
          height: 0,
          symbol: {
            type: "esriSMS",
            style: "esriSMSCircle",
            color: [231, 76, 60, 255],
            size: 12,
            outline: {
              color: [255, 255, 255, 255],
              width: 2
            }
          }
        }
      ]
    }
  ]
};

// ============================================================
// Export all data
// ============================================================
// module.exports = {

//   layerInfo,
//   outletFeatures,
//   legendInfo
// };
