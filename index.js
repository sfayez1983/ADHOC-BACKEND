import express from 'express'
import cors from 'cors'
import appServer from './src/module/server.js';

const app = express()

// Parse JSON body
app.use(express.json());

const PORT = 3001

// Enable CORS (required for ArcGIS JS API to call this server)
app.use(cors({
  origin: '*',  // Allow all origins (change in production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║        ArcGIS Backend API Simulator - Running            ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Port: ${PORT}                                           ║`);
  console.log('║                                                          ║');
  console.log('║  Endpoints:                                              ║');
  console.log('║  [API #1] Service Info:                                  ║');
  console.log('║    GET http://localhost:3001/api/arcgis/rest/services/   ║');
  console.log('║        OutletsMap/MapServer                              ║');
  console.log('║                                                          ║');
  console.log('║  Test with:                                              ║');
  console.log('║    curl http://localhost:3001/api/arcgis/rest/services/  ║');
  console.log('║        OutletsMap/MapServer                              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});



// Parse URL-encoded body (ArcGIS uses form-urlencoded)
app.use(express.urlencoded({ extended: true }));

appServer(express, app);


