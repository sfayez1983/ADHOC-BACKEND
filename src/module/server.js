import mapServerRouter from './map/mapData/mapServer.js'
/**
 * ============================================================
 * ArcGIS Backend - Main Server
 * ============================================================
 * 
 * This server simulates ArcGIS Online REST API structure.
 * It runs on port 3001 and provides ArcGIS-compatible endpoints
 * that the frontend (ArcGIS JavaScript API) can connect to.
 * 
 * Architecture:
 *   Frontend (ArcGIS JS API) 
 *     → Backend (This server) 
 *       → ArcGIS Online (later integration)
 * 
 * Current Status: Static data mode (simulating ArcGIS)
 * Future: Connect to real ArcGIS Online REST APIs
 * ============================================================
 */

export const appServer = (express, app) => {
// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ============================================================
// ArcGIS REST API Routes
// ============================================================

// Import the map server routes

// Mount the MapServer routes
// This creates the ArcGIS-compatible URL structure:
// /api/arcgis/rest/services/OutletsMap/MapServer
app.use('/api/arcgis/rest/services/OutletsMap/MapServer', mapServerRouter);

// ============================================================
// Root endpoint
// ============================================================
app.get('/', (req, res) => {
  res.json({
    message: "ArcGIS Backend API Simulator",
    version: "1.0.0",
    status: "running",
    endpoints: {
      serviceInfo: "/api/arcgis/rest/services/OutletsMap/MapServer",
      // More endpoints will be added here as we build them
    }
  });
});

// ============================================================
// Start Server
// ============================================================

}
export default appServer;
