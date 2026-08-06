import Router from 'express';
import axios from 'axios';

const mapServerRouter = Router()
// ============================================================
// ArcGIS Online Configuration
// ============================================================
const ARCGIS_FEATURE_SERVER = 'url';
const ARCGIS_TOKEN = 'token';

// ============================================================
// API #1 - Service Info (MapServer root )
// ============================================================
mapServerRouter.get('/', async (req, res) => {
  try {
    const url = `${ARCGIS_FEATURE_SERVER}?f=json&token=${ARCGIS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service info', message: error.message });
  }
});

// ============================================================
// API #2 - Layer Info (/0)
// ============================================================
mapServerRouter.get('/0', async (req, res) => {
  try {
    const url = `${ARCGIS_FEATURE_SERVER}?f=json&token=${ARCGIS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch layer info', message: error.message });
  }
});

// ============================================================
// API #3 - Query Features (Static Data)
// ============================================================
mapServerRouter.get('/Data', async (req, res) => {
  try {
    const where = req.query.where || '1=1';
    const outFields = req.query.outFields || '*';
    const returnGeometry = req.query.returnGeometry !== 'false';
    const resultRecordCount = req.query.resultRecordCount || 2000;

    const url = `${ARCGIS_FEATURE_SERVER}/query` +
      `?f=json` +
      `&where=${encodeURIComponent(where)}` +
      `&outFields=${outFields}` +
      `&returnGeometry=${returnGeometry}` +
      `&resultRecordCount=${resultRecordCount}` +
      `&token=${ARCGIS_TOKEN}`;

    const response = await axios.get(url);
    const data = response.data;

    // ArcGIS Online يرجع: { features: [...], fields: [...] }
    // تحويل من Esri JSON format إلى صيغة frontend
    if (data.features && data.features.length > 0) {
      const features = data.features.map(feature => ({
        attributes: {
          ...feature.attributes,
          // ArcGIS: geometry.x = longitude, geometry.y = latitude
          lat: feature.geometry?.y || feature.attributes.lat || 0,
          lng: feature.geometry?.x || feature.attributes.lng || 0,
        },
        geometry: feature.geometry
      }));
      res.json(features);
    } else if (data.features) {
      res.json([]);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to query features', message: error.message });
  }
});

// ============================================================
// API #4 - Legend Info
// ============================================================
mapServerRouter.get('/legend', async (req, res) => {
  try {
    const legendUrl = ARCGIS_FEATURE_SERVER.replace('/FeatureServer/0', '/FeatureServer/legend');
    const url = `${legendUrl}?f=json&token=${ARCGIS_TOKEN}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch legend', message: error.message });
  }
});

export default mapServerRouter
