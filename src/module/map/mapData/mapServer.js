/**
 * ============================================================
 * ArcGIS REST API Simulator Routes
 * ============================================================
 * 
 * This file contains all routes that match ArcGIS Online
 * REST API structure exactly.
 * 
 * Current API implemented:
 *   1. GET /api/arcgis/rest/services/OutletsMap/MapServer
 *      → Service Info (API #1)
 * 
 * Future APIs to implement:
 *   2. GET /api/arcgis/rest/services/OutletsMap/MapServer/0
 *      → Layer Info
 *   3. GET /api/arcgis/rest/services/OutletsMap/MapServer/0/query
 *      → Query Features
 *   4. GET /api/arcgis/rest/services/OutletsMap/MapServer/legend
 *      → Legend Info
 *   5. POST /api/arcgis/rest/services/OutletsMap/MapServer/0/editFeatures
 *      → Edit Features
 * ============================================================
 */

import Router from 'express';
import {serviceInfo } from './mapData.js'

const mapServerRouter = Router()

/**
 * ============================================================
 * API #1: Service Info
 * ============================================================
 * 
 * ArcGIS Original URL:
 *   https://services.arcgis.com/xxx/arcgis/rest/services/OutletsMap/MapServer
 * 
 * Our URL:
 *   /api/arcgis/rest/services/OutletsMap/MapServer
 * 
 * Purpose:
 *   Returns general information about the map service including:
 *   - Service name and description
 *   - Capabilities (what operations are supported)
 *   - Extent (bounding box of all data)
 *   - Spatial reference (coordinate system)
 *   - List of layers and tables
 *   - Initial extent (where to zoom on first load)
 *   - Supported query formats
 * 
 * ArcGIS JavaScript API automatically calls this endpoint
 * when you create a MapImageLayer or FeatureLayer.
 * ============================================================
 */

mapServerRouter.get('/', (req, res) => {
  // ArcGIS supports ?f=json parameter
  // We always return JSON since this is our format
  const format = req.query.f || 'json';

  // Log the request for debugging
  console.log('[API #1 - Service Info] Request received');
  console.log('  Format:', format);

  // Return the service info
  // This matches ArcGIS REST API response format exactly
  res.json(serviceInfo);
});

export default mapServerRouter;
