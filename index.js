import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import appServer from './src/server.js';
// import { startNgrokTunnel } from './src/utils/ngrok/startTunnel.js';
// import connectDb from './src/db/connection.js'
const app = express()
const PORT = process.env.PORT || 3001

//use config package to read .env file
dotenv.config({ path: './config/.env', quiet: true })

// //db connection
// connectDb()

// Parse JSON body
app.use(express.json());

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
  console.log(`║  Port: ${PORT}                                              ║`);
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

  // Public HTTPS address for ArcGIS Online webhooks (runs after .env is loaded)
  // startNgrokTunnel(PORT);
});



// Parse URL-encoded body (ArcGIS uses form-urlencoded)
app.use(express.urlencoded({ extended: true }));

appServer(express, app);


