/**
 * ============================================================
 * ArcGIS Backend - Main Server
 * ============================================================
 * 
 * Simulates ArcGIS Online REST API exactly.
 * 
 * ArcGIS Online Endpoints:
 *   GET /                          → Service Info (MapServer)
 *   GET /MapServer/0               → Layer Info (fields, renderer)
 *   GET /StaticData                → Query: Returns raw data
 * 
 * NO Dashboard API! The Frontend calculates Dashboard from
 * the raw data returned by /StaticData — just like ArcGIS Online.
 * ============================================================
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// ============================================================
// Middleware
// ============================================================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// Import Data
// ============================================================
const { serviceInfo, layerInfo, legendInfo, outletFeatures } = require('./data/mapData');

// ============================================================
// [API #1] Service Info
// Endpoint: GET /
// ArcGIS Online equivalent: GET /MapServer
// ============================================================

app.get('/', (req, res) => {
  console.log('[API #1] Service Info → GET /');
  res.json({
    currentVersion: serviceInfo.currentVersion,
    serviceDescription: serviceInfo.serviceDescription,
    mapName: serviceInfo.mapName,
    capabilities: serviceInfo.capabilities,
    supportedQueryFormats: serviceInfo.supportedQueryFormats,
    exportTilesAllowed: serviceInfo.exportTilesAllowed,
    maxExportTilesCount: serviceInfo.maxExportTilesCount,
    singleFusedMapCache: serviceInfo.singleFusedMapCache,
    initialExtent: serviceInfo.initialExtent,
    fullExtent: serviceInfo.fullExtent,
    spatialReference: serviceInfo.spatialReference,
    units: serviceInfo.units,
    minScale: serviceInfo.minScale,
    maxScale: serviceInfo.maxScale,
    layers: serviceInfo.layers,
    tables: serviceInfo.tables,
    documentInfo: serviceInfo.documentInfo,
    copyrightText: serviceInfo.copyrightText,
    editingInfo: serviceInfo.editingInfo
  });
});

// ============================================================
// [API #2] Layer Info
// Endpoint: GET /MapServer/0
// ArcGIS Online equivalent: GET /MapServer/0
// Purpose: Returns layer details (fields, renderer, metadata)
// ============================================================

app.get('/MapServer/0', (req, res) => {
  console.log('[API #2] Layer Info → GET /MapServer/0');
  res.json({
    currentVersion: layerInfo.currentVersion,
    id: layerInfo.id,
    name: layerInfo.name,
    type: layerInfo.type,
    description: layerInfo.description,
    copyrightText: layerInfo.copyrightText,
    defaultVisibility: layerInfo.defaultVisibility,
    editFieldsInfo: layerInfo.editFieldsInfo,
    editingInfo: layerInfo.editingInfo,
    ownershipBasedAccessControlForFeatures: layerInfo.ownershipBasedAccessControlForFeatures,
    syncCanReturnChanges: layerInfo.syncCanReturnChanges,
    relationships: layerInfo.relationships,
    isDataVersioned: layerInfo.isDataVersioned,
    supportsStatistics: layerInfo.supportsStatistics,
    supportsAdvancedQueries: layerInfo.supportsAdvancedQueries,
    supportsValidateSql: layerInfo.supportsValidateSql,
    supportsCoordinatesQuantization: layerInfo.supportsCoordinatesQuantization,
    supportsQueryTopFilter: layerInfo.supportsQueryTopFilter,
    supportsCalculate: layerInfo.supportsCalculate,
    hasAttachments: layerInfo.hasAttachments,
    htmlPopupType: layerInfo.htmlPopupType,
    hasMetadata: layerInfo.hasMetadata,
    hasM: layerInfo.hasM,
    hasZ: layerInfo.hasZ,
    objectIdField: layerInfo.objectIdField,
    globalIdField: layerInfo.globalIdField,
    typeIdField: layerInfo.typeIdField,
    fields: layerInfo.fields,
    geometryType: layerInfo.geometryType,
    minScale: layerInfo.minScale,
    maxScale: layerInfo.maxScale,
    extent: layerInfo.extent,
    drawingInfo: layerInfo.drawingInfo,
    defaultVisibility: layerInfo.defaultVisibility,
    maxRecordCount: layerInfo.maxRecordCount,
    hasStaticData: layerInfo.hasStaticData,
    timeInfo: layerInfo.timeInfo,
    uniqueIdField: layerInfo.uniqueIdField,
    typeIds: layerInfo.typeIds,
    types: layerInfo.types
  });
});

// ============================================================
// [API #3] Query Data
// Endpoint: GET /StaticData
// ArcGIS Online equivalent: GET /MapServer/0/query
// 
// This is the ONLY data API. It returns RAW data.
// The Frontend calculates Dashboard, Table, Charts from this.
//
// Supported query parameters:
//   ?where=status='ناجح'          → Filter by condition
//   ?outFields=brand,status       → Select specific fields
//   ?returnGeometry=true/false    → Include geometry or not
//   ?resultRecordCount=100        → Limit results
//   ?geometry=xmin,ymin,xmax,ymax → Bounding box filter
//   ?groupByFieldsForStatistics   → Group by field (statistics)
//   ?outStatistics                → Aggregation functions
// ============================================================

app.get('/StaticData', (req, res) => {
  console.log('[API #3] Query Data → GET /StaticData');
  console.log('  where:', req.query.where || 'none');
  console.log('  outFields:', req.query.outFields || '*');
  console.log('  returnGeometry:', req.query.returnGeometry !== 'false');
  console.log('  groupByFieldsForStatistics:', req.query.groupByFieldsForStatistics || 'none');

  // Start with ALL raw data
  let features = JSON.parse(JSON.stringify(outletFeatures));

  // === WHERE Filter ===
  const where = req.query.where;
  if (where) {
    features = filterFeatures(features, where);
  }

  // === Geometry Filter (Bounding Box) ===
  if (req.query.geometry) {
    const bounds = req.query.geometry.split(',').map(Number);
    if (bounds.length >= 4) {
      const [xmin, ymin, xmax, ymax] = bounds;
      features = features.filter(f =>
        f.attributes.lng >= xmin && f.attributes.lng <= xmax &&
        f.attributes.lat >= ymin && f.attributes.lat <= ymax
      );
    }
  }

  // === Result Record Count ===
  if (req.query.resultRecordCount) {
    const count = parseInt(req.query.resultRecordCount);
    features = features.slice(0, count);
  }

  // === Return Geometry Toggle ===
  const returnGeometry = req.query.returnGeometry !== 'false';
  if (!returnGeometry) {
    features = features.map(f => ({ attributes: f.attributes }));
  }

  // === Group By Statistics ===
  const groupBy = req.query.groupByFieldsForStatistics;
  if (groupBy) {
    console.log('  → Grouping by:', groupBy);
    const groupFields = groupBy.split(',').map(f => f.trim());
    const result = groupByStatistics(features, groupFields);
    
    res.json({
      objectIdFieldName: 'OBJECTID',
      globalIdFieldName: '',
      fields: layerInfo.fields,
      features: result,
      exceededTransferLimit: false
    });
    return;
  }

  // === Select Output Fields ===
  const outFields = req.query.outFields ? req.query.outFields.split(',').map(f => f.trim()) : null;
  if (outFields && !outFields.includes('*')) {
    features = features.map(f => {
      const newAttributes = {};
      outFields.forEach(field => {
        if (f.attributes[field] !== undefined) {
          newAttributes[field] = f.attributes[field];
        }
      });
      return { attributes: newAttributes };
    });
  }

  // === Response Format ===
  const response = {
    objectIdFieldName: 'OBJECTID',
    globalIdFieldName: '',
    geometryType: 'esriGeometryPoint',
    spatialReference: { wkid: 4326, latestWkid: 4326 },
    fields: layerInfo.fields,
    features: features,
    exceededTransferLimit: features.length >= 1000,
    // This tells the Frontend how many total records exist
    // (useful for pagination)
    totalRecordCount: features.length
  };

  console.log('  → Returned', features.length, 'features');
  res.json(response);
});

// ============================================================
// [API #4] Legend Info
// Endpoint: GET /MapServer/legend
// ArcGIS Online equivalent: GET /MapServer/legend
// ============================================================

app.get('/MapServer/legend', (req, res) => {
  console.log('[API #4] Legend Info → GET /MapServer/legend');
  res.json(legendInfo);
});

// ============================================================
// Helper: Filter features by WHERE clause
// ============================================================

function filterFeatures(features, where) {
  // Handle "1=1" → return all features (ArcGIS sends this when no filter)
  const trimmed = where.replace(/\s/g, '').toLowerCase();
  if (trimmed === '1=1') return features;

  // Remove "1=1 AND" prefix (common in ArcGIS queries)
  let condition = where.replace(/1\s*=\s*1\s+AND\s*/i, '').trim();

  // If nothing left after removal, return all
  if (!condition) return features;
  
  return features.filter(feature => {
    // Parse: field = 'value' or field = value
    const match = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*['"]?([^'"]+?)['"]?$/i);
    if (!match) return true;

    const [, field, operator, value] = match;
    const attrValue = feature.attributes[field];

    if (attrValue === undefined) return true; // don't filter out if field missing

    switch (operator) {
      case '=': return String(attrValue).toLowerCase() === String(value).toLowerCase();
      case '!=': return String(attrValue).toLowerCase() !== String(value).toLowerCase();
      case '>': return Number(attrValue) > Number(value);
      case '<': return Number(attrValue) < Number(value);
      case '>=': return Number(attrValue) >= Number(value);
      case '<=': return Number(attrValue) <= Number(value);
      default: return true;
    }
  });
}

// ============================================================
// Helper: Group By Statistics
// ============================================================

function groupByStatistics(features, groupFields) {
  // Group features by field values
  const groups = {};
  
  features.forEach(f => {
    const key = groupFields.map(g => f.attributes[g]).join('|');
    if (!groups[key]) {
      groups[key] = { attributes: {}, count: 0 };
      groupFields.forEach(g => {
        groups[key].attributes[g] = f.attributes[g];
      });
    }
    groups[key].count++;
  });

  // Convert to features array
  const result = Object.values(groups).map((group, index) => ({
    attributes: {
      ...group.attributes,
      OBJECTID: index + 1,
      count: group.count
    }
  }));

  return result;
}

// ============================================================
// Start Server
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        ArcGIS Backend API Simulator - Running              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║  Endpoints (matching ArcGIS Online):                         ║');
  console.log('║                                                              ║');
  console.log('║  [API #1] GET /              → Service Info                  ║');
  console.log('║  [API #2] GET /MapServer/0   → Layer Info (fields)           ║');
  console.log('║  [API #3] GET /StaticData    → Query (RAW DATA)              ║');
  console.log('║  [API #4] GET /MapServer/legend → Legend Info                ║');
  console.log('║                                                              ║');
  console.log('║  Query Examples for /StaticData:                             ║');
  console.log('║  ?where=1=1                   → All features                 ║');
  console.log('║  ?where=status=Active          → Active only                  ║');
  console.log('║  ?where=brand=Pepsi            → Pepsi only                   ║');
  console.log('║  ?groupByFieldsForStatistics=brand → Group by brand          ║');
  console.log('║  ?returnGeometry=false         → Attributes only             ║');
  console.log('║                                                              ║');
  console.log(`║  Port: ${PORT}                                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = app;
