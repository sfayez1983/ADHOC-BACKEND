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
const layerInfo = {
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
const outletFeatures = [
  {
    attributes: {
      OBJECTID: 1,
      outlet_name: "Outlet Cairo Downtown",
      outlet_type: "Store",
      status: "Active",
      manager_name: "Ahmed Hassan",
      phone: "01234567890",
      address: "Tahrir Square, Cairo",
      governorate: "Cairo",
      sales_target: 50000.0,
      created_date: 1700000000000,
      last_edited_date: 1700000000000
    },
    geometry: {
      x: 31.2357,
      y: 30.0444
    }
  },
  {
    attributes: {
      OBJECTID: 2,
      outlet_name: "Outlet Alexandria Stanley",
      outlet_type: "Store",
      status: "Active",
      manager_name: "Mohamed Ali",
      phone: "01098765432",
      address: "Stanley Bridge, Alexandria",
      governorate: "Alexandria",
      sales_target: 40000.0,
      created_date: 1700100000000,
      last_edited_date: 1700100000000
    },
    geometry: {
      x: 29.9187,
      y: 31.2001
    }
  },
  {
    attributes: {
      OBJECTID: 3,
      outlet_name: "Outlet Giza Pyramids",
      outlet_type: "Store",
      status: "Active",
      manager_name: "Hassan Ibrahim",
      phone: "01111111111",
      address: "Al Haram Street, Giza",
      governorate: "Giza",
      sales_target: 35000.0,
      created_date: 1700200000000,
      last_edited_date: 1700200000000
    },
    geometry: {
      x: 31.1342,
      y: 30.0131
    }
  },
  {
    attributes: {
      OBJECTID: 4,
      outlet_name: "Warehouse Mansoura",
      outlet_type: "Warehouse",
      status: "Active",
      manager_name: "Omar Khaled",
      phone: "01222222222",
      address: "El Gomhoria Street, Mansoura",
      governorate: "Dakahlia",
      sales_target: 60000.0,
      created_date: 1700300000000,
      last_edited_date: 1700300000000
    },
    geometry: {
      x: 31.3873,
      y: 31.0364
    }
  },
  {
    attributes: {
      OBJECTID: 5,
      outlet_name: "Outlet Luxor Temple",
      outlet_type: "Kiosk",
      status: "Inactive",
      manager_name: "Karim Samir",
      phone: "01033333333",
      address: "Luxor Temple Area",
      governorate: "Luxor",
      sales_target: 20000.0,
      created_date: 1700400000000,
      last_edited_date: 1700400000000
    },
    geometry: {
      x: 32.6396,
      y: 25.6872
    }
  },
  {
    attributes: {
      OBJECTID: 6,
      outlet_name: "Distributor Aswan",
      outlet_type: "Distributor",
      status: "Active",
      manager_name: "Youssef Tamer",
      phone: "01144444444",
      address: "Corniche El Nile, Aswan",
      governorate: "Aswan",
      sales_target: 45000.0,
      created_date: 1700500000000,
      last_edited_date: 1700500000000
    },
    geometry: {
      x: 32.8998,
      y: 24.0889
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
