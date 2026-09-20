import connectDb from './db/connection.js';
import authRouter from './module/auth/auth.route.js';
import mapServerRouter from './module/map/map.route.js'
import { globalErrorHandling } from './utils/error/globalErrorHandling.js';
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

connectDb()
// ============================================================
// ArcGIS REST API Routes
// ============================================================

// Import the map server routes

// Mount the MapServer routes
// This creates the ArcGIS-compatible URL structure:
// /api/arcgis/rest/services/OutletsMap/MapServer
app.use('/api/arcgis/rest/services/OutletsMap/MapServer', mapServerRouter);
app.use('/api/auth', authRouter)

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
app.use(globalErrorHandling)
}
export default appServer;
