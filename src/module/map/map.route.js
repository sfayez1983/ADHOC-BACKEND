import Router from 'express';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import * as mapController from './map.controller.js';
import axios from 'axios';

const mapServerRouter = Router()
// ============================================================
// ArcGIS Online Configuration
// ============================================================



// ============================================================
// API #1 - Service Info (MapServer root )
// ============================================================
mapServerRouter.get('/', asyncHandler(mapController.serviceInfo));

// ============================================================
// API #2 - Layer Info (/0)
// ============================================================
mapServerRouter.get('/0', asyncHandler(mapController.layerInfo));

// ============================================================
// API #3 - Query Features
// ============================================================
mapServerRouter.get('/Data', asyncHandler(mapController.queryFeatures));

// ============================================================
// API #4 - Legend Info
// ============================================================
// mapServerRouter.get('/legend', async (req, res) => {
//   try {
//     const legendUrl = process.env.GORILLA_SERVICE_FEATURE_SERVER.replace('/FeatureServer/0', '/FeatureServer/legend');
//     const url = `${legendUrl}?f=json&token=${process.env.GORILLA_SERVICE_TOKEN}`;
//     const response = await axios.get(url);
//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to fetch legend', message: error.message });
//   }
// });

export default mapServerRouter
